import uuid
from sqlalchemy import String, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.database import Base


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    policy_type: Mapped[str] = mapped_column(String(50))
    enacted_day: Mapped[int] = mapped_column(Integer)
    parameters: Mapped[dict] = mapped_column(JSONB, default=dict)
    predicted_effects: Mapped[dict] = mapped_column(JSONB, default=dict)
    actual_effects: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    narrative: Mapped[str] = mapped_column(Text, default="")
