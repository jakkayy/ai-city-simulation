"""Seed 50 citizens with balanced zone distribution and a sparse friend graph."""

import asyncio
import random
import uuid

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal
from app.models.citizen import Citizen, JobType, Zone, Personality

random.seed(42)

_NAMES = [
    "Alice","Bob","Carol","David","Eva","Frank","Grace","Henry","Iris","Jack",
    "Karen","Leo","Maya","Nick","Olivia","Paul","Quinn","Rosa","Sam","Tara",
    "Uma","Victor","Wendy","Xavier","Yara","Zach","Anya","Ben","Cleo","Dan",
    "Ella","Felix","Gina","Hugo","Isla","Joel","Kira","Liam","Mia","Noah",
    "Ora","Pete","Rita","Sean","Tina","Uri","Vera","Will","Xena","Yuki",
]

_ZONE_DIST = [Zone.A]*12 + [Zone.B]*20 + [Zone.C]*18  # 50 total

_JOB_DIST = (
    [JobType.business_owner]*5 + [JobType.professional]*8 +
    [JobType.teacher]*7 + [JobType.service_worker]*10 +
    [JobType.laborer]*10 + [JobType.farmer]*5 + [JobType.unemployed]*5
)

_SAVINGS_RANGE = {
    JobType.business_owner: (10_000, 50_000),
    JobType.professional:   (3_000,  15_000),
    JobType.teacher:        (1_000,   5_000),
    JobType.service_worker: (500,     3_000),
    JobType.laborer:        (200,     2_000),
    JobType.farmer:         (300,     2_500),
    JobType.unemployed:     (-500,      500),
}

_PERSONALITIES = list(Personality)


def _friend_ids(ids: list[uuid.UUID], index: int, n: int = 3) -> str:
    candidates = [i for i in range(len(ids)) if i != index]
    return ",".join(str(ids[i]) for i in random.sample(candidates, min(n, len(candidates))))


async def seed_citizens(db: AsyncSession) -> None:
    """Idempotent: clears and re-seeds citizens."""
    await db.execute(delete(Citizen))
    await db.flush()

    zones = _ZONE_DIST.copy()
    jobs = _JOB_DIST.copy()
    random.shuffle(zones)
    random.shuffle(jobs)

    ids = [uuid.uuid4() for _ in range(50)]
    citizens = []

    for i, name in enumerate(_NAMES):
        zone = zones[i]
        job = jobs[i]
        lo, hi = _SAVINGS_RANGE[job]
        citizens.append(Citizen(
            id=ids[i],
            name=name,
            age=random.randint(18, 65),
            job_type=job,
            zone=zone,
            happiness=round(random.uniform(45, 75), 1),
            savings=round(random.uniform(lo, hi), 2),
            personality=random.choice(_PERSONALITIES),
            memory_summary="",
            days_unhappy=0,
            zone_locked_until=None,
            last_action="arrived",
            pending_reaction=False,
            friend_ids=_friend_ids(ids, i),
        ))

    db.add_all(citizens)
    await db.commit()
    print(f"Seeded {len(citizens)} citizens")


async def _main() -> None:
    async with AsyncSessionLocal() as db:
        await seed_citizens(db)


if __name__ == "__main__":
    asyncio.run(_main())
