import asyncio
import uuid
from app.db.database import AsyncSessionLocal
from app.models.citizen import Citizen, JobType, Zone, Personality

CITIZENS = [
    # Zone A — นักธุรกิจ / มืออาชีพ
    {"name": "ธนกร วิริยะ",    "age": 45, "job_type": JobType.business_owner, "zone": Zone.A, "happiness": 72.0, "savings": 50000.0, "personality": Personality.rational},
    {"name": "นภา สิริมงคล",   "age": 38, "job_type": JobType.professional,   "zone": Zone.A, "happiness": 68.0, "savings": 30000.0, "personality": Personality.optimistic},
    # Zone B — ครู / พนักงานบริการ / แรงงาน
    {"name": "มาลี รักดี",     "age": 34, "job_type": JobType.teacher,        "zone": Zone.B, "happiness": 60.0, "savings": 10000.0, "personality": Personality.optimistic},
    {"name": "วิชัย แก้วใส",   "age": 29, "job_type": JobType.service_worker, "zone": Zone.B, "happiness": 52.0, "savings": 5000.0,  "personality": Personality.impulsive},
    {"name": "สุภา เจริญสุข",  "age": 41, "job_type": JobType.teacher,        "zone": Zone.B, "happiness": 65.0, "savings": 12000.0, "personality": Personality.rational},
    {"name": "อรุณ ตั้งมั่น",  "age": 36, "job_type": JobType.laborer,        "zone": Zone.B, "happiness": 48.0, "savings": 3000.0,  "personality": Personality.pessimistic},
    # Zone C — ชาวนา / แรงงาน / ว่างงาน
    {"name": "สมชาย นาดี",     "age": 52, "job_type": JobType.farmer,         "zone": Zone.C, "happiness": 42.0, "savings": 2000.0,  "personality": Personality.pessimistic},
    {"name": "แก้ว พลอยงาม",   "age": 27, "job_type": JobType.laborer,        "zone": Zone.C, "happiness": 38.0, "savings": 1500.0,  "personality": Personality.impulsive},
    {"name": "ประสงค์ ใจดี",   "age": 60, "job_type": JobType.farmer,         "zone": Zone.C, "happiness": 45.0, "savings": 800.0,   "personality": Personality.rational},
    {"name": "ปิยะ ว่างแสน",   "age": 23, "job_type": JobType.unemployed,     "zone": Zone.C, "happiness": 25.0, "savings": 500.0,   "personality": Personality.pessimistic},
]

friend_map = {
    0: [1], 1: [0],
    2: [3, 5], 3: [2, 6], 4: [5], 5: [2, 4],
    6: [3, 8], 7: [9], 8: [6], 9: [7],
}


async def seed():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import delete
        await db.execute(delete(Citizen))
        await db.commit()

        citizen_ids = [uuid.uuid4() for _ in CITIZENS]
        citizens = []
        for i, data in enumerate(CITIZENS):
            friends = ",".join(str(citizen_ids[j]) for j in friend_map.get(i, []))
            c = Citizen(id=citizen_ids[i], friend_ids=friends, **data)
            citizens.append(c)

        db.add_all(citizens)
        await db.commit()
        print(f"✅ Seeded {len(citizens)} citizens")


if __name__ == "__main__":
    asyncio.run(seed())
