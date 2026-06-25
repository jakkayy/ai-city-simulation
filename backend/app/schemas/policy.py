from pydantic import BaseModel, Field
from typing import Any
import uuid


class EnactPolicyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    policy_type: str = Field(..., min_length=1, max_length=50)
    parameters: dict[str, Any] = Field(default_factory=dict)
    narrative: str = Field(default="")


class PolicyResponse(BaseModel):
    id: str
    name: str
    policy_type: str
    enacted_day: int
    parameters: dict[str, Any]
    predicted_effects: dict[str, Any]
    actual_effects: dict[str, Any] | None
    narrative: str

    @classmethod
    def from_orm(cls, p) -> "PolicyResponse":
        return cls(
            id=str(p.id),
            name=p.name,
            policy_type=p.policy_type,
            enacted_day=p.enacted_day,
            parameters=p.parameters or {},
            predicted_effects=p.predicted_effects or {},
            actual_effects=p.actual_effects,
            narrative=p.narrative,
        )
