import uuid
from datetime import date
from sqlalchemy import String, Float, Integer, Boolean, Date, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.database import Base


class JobType(str, enum.Enum):
    business_owner = "business_owner"
    professional = "professional"
    teacher = "teacher"
    service_worker = "service_worker"
    laborer = "laborer"
    farmer = "farmer"
    unemployed = "unemployed"


class Zone(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"


class Personality(str, enum.Enum):
    optimistic = "optimistic"
    pessimistic = "pessimistic"
    rational = "rational"
    impulsive = "impulsive"


class Citizen(Base):
    __tablename__ = "citizens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100))
    age: Mapped[int] = mapped_column(Integer)
    job_type: Mapped[JobType] = mapped_column(SAEnum(JobType))
    zone: Mapped[Zone] = mapped_column(SAEnum(Zone))
    happiness: Mapped[float] = mapped_column(Float, default=60.0)
    savings: Mapped[float] = mapped_column(Float, default=5000.0)
    personality: Mapped[Personality] = mapped_column(SAEnum(Personality))
    memory_summary: Mapped[str] = mapped_column(Text, default="")
    days_unhappy: Mapped[int] = mapped_column(Integer, default=0)
    zone_locked_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_action: Mapped[str] = mapped_column(String(50), default="stayed")
    pending_reaction: Mapped[bool] = mapped_column(Boolean, default=False)
    friend_ids: Mapped[str] = mapped_column(Text, default="")
