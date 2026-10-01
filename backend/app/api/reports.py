from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.snapshot import DailySnapshot

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
async def list_reports(limit: int = 30, db: AsyncSession = Depends(get_db)):
    """The most recent end-of-day reports, newest first."""
    result = await db.execute(
        select(DailySnapshot.snapshot_data["report"])
        .where(DailySnapshot.snapshot_data.has_key("report"))
        .order_by(DailySnapshot.simulation_day.desc())
        .limit(max(1, min(limit, 200)))
    )
    return [row[0] for row in result.all()]
