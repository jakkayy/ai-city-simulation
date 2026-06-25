import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.simulation.gateway import KeyState, LLMGateway, LLMQueue, QueueTask, _RPD_LIMIT, _MIN_INTERVAL


# ── KeyState ──────────────────────────────────────────────────────────────

class TestKeyState:
    def test_available_initially(self):
        k = KeyState("a1", "key")
        assert k.is_available()

    def test_unavailable_immediately_after_request(self):
        k = KeyState("a1", "key")
        k.record_request()
        assert not k.is_available()

    def test_available_after_interval(self):
        k = KeyState("a1", "key")
        k.last_request_at = time.monotonic() - _MIN_INTERVAL - 0.01
        assert k.is_available()

    def test_budget_exhausted(self):
        k = KeyState("a1", "key")
        k._date = str(__import__("datetime").date.today())
        k.requests_today = _RPD_LIMIT
        assert not k.is_available()

    def test_record_increments_count(self):
        k = KeyState("a1", "key")
        k.record_request(tokens=500)
        assert k.requests_today == 1
        assert k.tokens_today == 500

    def test_daily_reset(self):
        k = KeyState("a1", "key")
        k._date = "2000-01-01"  # old date
        k.requests_today = 999
        k.is_available()  # triggers reset check
        assert k.requests_today == 0


# ── LLMQueue ──────────────────────────────────────────────────────────────

class TestLLMQueue:
    def _task(self, priority: int, enqueued_at: float = 0.0) -> QueueTask:
        loop = asyncio.get_event_loop()
        return QueueTask(priority=priority, enqueued_at=enqueued_at, future=loop.create_future())

    @pytest.mark.asyncio
    async def test_fifo_within_same_priority(self):
        q = LLMQueue()
        t1 = self._task(3, enqueued_at=1.0)
        t2 = self._task(3, enqueued_at=2.0)
        await q.put(t1)
        await q.put(t2)
        assert (await q.get()).uid == t1.uid
        assert (await q.get()).uid == t2.uid

    @pytest.mark.asyncio
    async def test_high_priority_before_normal(self):
        q = LLMQueue()
        normal = self._task(3, enqueued_at=1.0)
        high = self._task(1, enqueued_at=2.0)
        await q.put(normal)
        await q.put(high)
        assert (await q.get()).uid == high.uid

    @pytest.mark.asyncio
    async def test_promote_stale(self):
        q = LLMQueue()
        stale = self._task(3, enqueued_at=time.monotonic() - 400)  # 400s ago
        fresh = self._task(3, enqueued_at=time.monotonic())
        await q.put(stale)
        await q.put(fresh)
        promoted = await q.promote_stale()
        assert promoted == 1
        got = await q.get()
        assert got.uid == stale.uid
        assert got.priority == 2

    @pytest.mark.asyncio
    async def test_depth(self):
        q = LLMQueue()
        await q.put(self._task(3))
        await q.put(self._task(3))
        assert q.depth() == 2


# ── LLMGateway ───────────────────────────────────────────────────────────

class TestLLMGateway:
    def _make_key(self, available: bool = True) -> KeyState:
        k = MagicMock(spec=KeyState)
        k.is_available.return_value = available
        k.alias = "test_key"
        k.record_request = MagicMock()
        return k

    def _make_response(self, text: str = "ok", tokens: int = 10):
        usage = MagicMock()
        usage.total_tokens = tokens
        choice = MagicMock()
        choice.message.content = text
        resp = MagicMock()
        resp.choices = [choice]
        resp.usage = usage
        return resp

    @pytest.mark.asyncio
    async def test_call_returns_response(self):
        key = self._make_key(available=True)
        key.client = AsyncMock()
        key.client.chat.completions.create = AsyncMock(
            return_value=self._make_response("hello world")
        )
        gw = LLMGateway([key])
        gw.start()
        await asyncio.sleep(0.05)  # let worker start
        result = await asyncio.wait_for(gw.call([{"role": "user", "content": "hi"}]), timeout=3)
        assert result == "hello world"
        gw.stop()

    @pytest.mark.asyncio
    async def test_no_keys_raises(self):
        gw = LLMGateway([])
        with pytest.raises(RuntimeError, match="No LLM API keys"):
            await gw.call([{"role": "user", "content": "hi"}])

    @pytest.mark.asyncio
    async def test_status_includes_queue_depth(self):
        gw = LLMGateway([self._make_key(available=False)])
        s = gw.status()
        assert "queue_depth" in s
        assert "keys" in s
        assert s["queue_depth"] == 0
