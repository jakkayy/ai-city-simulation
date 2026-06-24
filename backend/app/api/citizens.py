from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.citizen import Citizen

router = APIRouter(tags=["citizens"])


@router.get("/citizens")
async def get_citizens(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Citizen))
    citizens = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "age": c.age,
            "job_type": c.job_type,
            "zone": c.zone,
            "happiness": c.happiness,
            "savings": c.savings,
            "personality": c.personality,
            "last_action": c.last_action,
            "pending_reaction": c.pending_reaction,
        }
        for c in citizens
    ]
