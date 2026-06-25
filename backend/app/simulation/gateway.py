"""
LLM Gateway — Groq round-robin across 3 API keys.

Rate limits per key:  90 RPM  (= 1 req / 0.667 s)
Daily budget per key: 3 000 RPD
Priority levels:      1 = high (system agents)
                      2 = promoted (stale normal tasks)
                      3 = normal  (citizen batches)
Starvation fix:       tasks at priority 3 waiting > 5 min → bumped to 2
"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import date

from groq import AsyncGroq

logger = logging.getLogger(__name__)

_RPM_LIMIT = 90
_RPD_LIMIT = 3_000
_MIN_INTERVAL = 60.0 / _RPM_LIMIT          # seconds between requests per key
_STARVATION_SECONDS = 300.0                 # 5 minutes
_STARVATION_CHECK_INTERVAL = 60.0          # check every 60 s


# ── per-key state ─────────────────────────────────────────────────────────

class KeyState:
    def __init__(self, alias: str, api_key: str) -> None:
        self.alias = alias
        self.client = AsyncGroq(api_key=api_key)
        self.last_request_at: float = 0.0
        self._date: str = ""
        self.requests_today: int = 0
        self.tokens_today: int = 0
        self.fallback_calls: int = 0

    def _reset_if_new_day(self) -> None:
        today = str(date.today())
        if today != self._date:
            self._date = today
            self.requests_today = 0
            self.tokens_today = 0
            self.fallback_calls = 0

    def is_available(self) -> bool:
        self._reset_if_new_day()
        if self.requests_today >= _RPD_LIMIT:
            return False
        return (time.monotonic() - self.last_request_at) >= _MIN_INTERVAL

    def record_request(self, tokens: int = 0) -> None:
        self._reset_if_new_day()
        self.last_request_at = time.monotonic()
        self.requests_today += 1
        self.tokens_today += tokens

    def to_dict(self) -> dict:
        self._reset_if_new_day()
        return {
            "alias": self.alias,
            "requests_today": self.requests_today,
            "tokens_today": self.tokens_today,
            "fallback_calls": self.fallback_calls,
            "budget_remaining": _RPD_LIMIT - self.requests_today,
            "available": self.is_available(),
        }


# ── queue task ────────────────────────────────────────────────────────────

@dataclass
class QueueTask:
    priority: int
    enqueued_at: float
    uid: str = field(default_factory=lambda: str(uuid.uuid4()))
    messages: list[dict] = field(default_factory=list)
    model: str = "llama-3.3-70b-versatile"
    future: asyncio.Future = field(default_factory=lambda: asyncio.get_event_loop().create_future())


# ── priority queue with starvation promotion ──────────────────────────────

class LLMQueue:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._tasks: list[QueueTask] = []
        self._event = asyncio.Event()

    async def put(self, task: QueueTask) -> None:
        async with self._lock:
            self._tasks.append(task)
            self._tasks.sort(key=lambda t: (t.priority, t.enqueued_at))
        self._event.set()

    async def get(self) -> QueueTask:
        while True:
            async with self._lock:
                if self._tasks:
                    return self._tasks.pop(0)
            self._event.clear()
            await self._event.wait()

    async def promote_stale(self) -> int:
        """Bump tasks at priority 3 waiting > 5 min to priority 2. Returns count promoted."""
        now = time.monotonic()
        promoted = 0
        async with self._lock:
            for task in self._tasks:
                if task.priority >= 3 and (now - task.enqueued_at) >= _STARVATION_SECONDS:
                    task.priority = 2
                    promoted += 1
            if promoted:
                self._tasks.sort(key=lambda t: (t.priority, t.enqueued_at))
        return promoted

    def depth(self) -> int:
        return len(self._tasks)


# ── gateway ───────────────────────────────────────────────────────────────

class LLMGateway:
    def __init__(self, keys: list[KeyState]) -> None:
        self._keys = keys
        self._rr_index = 0
        self._queue = LLMQueue()
        self._total_calls = 0
        self._total_fallbacks = 0
        self._worker_task: asyncio.Task | None = None
        self._promoter_task: asyncio.Task | None = None

    def start(self) -> None:
        if not self._keys:
            logger.warning("LLMGateway: no API keys configured — all calls will raise")
            return
        self._worker_task = asyncio.create_task(self._worker(), name="llm-worker")
        self._promoter_task = asyncio.create_task(self._promoter(), name="llm-promoter")
        logger.info("LLMGateway started with %d key(s)", len(self._keys))

    def stop(self) -> None:
        for t in (self._worker_task, self._promoter_task):
            if t:
                t.cancel()

    async def call(
        self,
        messages: list[dict],
        model: str = "llama-3.3-70b-versatile",
        priority: int = 3,
    ) -> str:
        """Submit a request to the queue. Returns the LLM response text."""
        if not self._keys:
            raise RuntimeError("No LLM API keys configured")
        loop = asyncio.get_event_loop()
        task = QueueTask(
            priority=priority,
            enqueued_at=time.monotonic(),
            messages=messages,
            model=model,
            future=loop.create_future(),
        )
        await self._queue.put(task)
        return await task.future

    def status(self) -> dict:
        return {
            "queue_depth": self._queue.depth(),
            "total_calls": self._total_calls,
            "total_fallbacks": self._total_fallbacks,
            "keys": [k.to_dict() for k in self._keys],
        }

    # ── internal ─────────────────────────────────────────────────────────

    async def _worker(self) -> None:
        while True:
            task = await self._queue.get()
            key = await self._pick_key()
            try:
                response = await key.client.chat.completions.create(
                    model=task.model,
                    messages=task.messages,
                    temperature=0.7,
                    max_tokens=1024,
                )
                content = response.choices[0].message.content or ""
                tokens = response.usage.total_tokens if response.usage else 0
                key.record_request(tokens)
                self._total_calls += 1
                task.future.set_result(content)
                logger.debug("LLM ok via %s (queue depth=%d)", key.alias, self._queue.depth())
            except Exception as exc:
                logger.error("LLM call failed via %s: %s", key.alias, exc)
                task.future.set_exception(exc)

    async def _pick_key(self) -> KeyState:
        """Round-robin over keys; wait until one is available."""
        n = len(self._keys)
        while True:
            for _ in range(n):
                key = self._keys[self._rr_index % n]
                self._rr_index += 1
                if key.is_available():
                    return key
            await asyncio.sleep(0.1)

    async def _promoter(self) -> None:
        """Periodically promote stale low-priority tasks."""
        while True:
            await asyncio.sleep(_STARVATION_CHECK_INTERVAL)
            count = await self._queue.promote_stale()
            if count:
                logger.info("Promoted %d stale task(s) to priority 2", count)


# ── singleton ─────────────────────────────────────────────────────────────

def build_gateway(api_keys: list[str]) -> LLMGateway:
    keys = [
        KeyState(alias=f"account_{i+1}", api_key=k)
        for i, k in enumerate(api_keys)
    ]
    return LLMGateway(keys)


llm_gateway: LLMGateway = LLMGateway([])  # replaced on startup
