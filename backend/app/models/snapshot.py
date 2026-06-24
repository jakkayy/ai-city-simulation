import uuid
from sqlalchemy import Integer, Float, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.database import Base


class DailySnapshot(Base):
    __tablename__ = "daily_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    simulation_day: Mapped[int] = mapped_column(Integer, unique=True)
    avg_happiness: Mapped[float] = mapped_column(Float)
    city_fund: Mapped[float] = mapped_column(Float)
    service_quality: Mapped[float] = mapped_column(Float)
    zone_a_pop: Mapped[int] = mapped_column(Integer)
    zone_b_pop: Mapped[int] = mapped_column(Integer)
    zone_c_pop: Mapped[int] = mapped_column(Integer)
    total_tax_collected: Mapped[float] = mapped_column(Float)
    llm_calls_used: Mapped[int] = mapped_column(Integer, default=0)
    snapshot_data: Mapped[dict] = mapped_column(JSONB, default=dict)


class LLMUsage(Base):
    __tablename__ = "llm_usage"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date: Mapped[str] = mapped_column(String(10))
    account_alias: Mapped[str] = mapped_column(String(20))
    model: Mapped[str] = mapped_column(String(100))
    calls_used: Mapped[int] = mapped_column(Integer, default=0)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    fallback_calls: Mapped[int] = mapped_column(Integer, default=0)
