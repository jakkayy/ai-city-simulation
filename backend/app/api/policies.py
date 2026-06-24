from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.policy import Policy
from app.schemas.policy import EnactPolicyRequest, PolicyResponse
from app.simulation.loop import _policy_lock
from app.simulation.policy_engine import (
    sanitize_policy,
    predict_effects,
    apply_policy_to_city,
    PolicyValidationError,
)
from app.simulation.state import city_state

router = APIRouter(prefix="/policies", tags=["policies"])


@router.get("", response_model=list[PolicyResponse])
async def list_policies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Policy).order_by(Policy.enacted_day.desc()))
    return [PolicyResponse.from_orm(p) for p in result.scalars().all()]


@router.get("/{policy_id}", response_model=PolicyResponse)
async def get_policy(policy_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return PolicyResponse.from_orm(policy)


@router.post("", response_model=PolicyResponse, status_code=201)
async def enact_policy(
    body: EnactPolicyRequest,
    db: AsyncSession = Depends(get_db),
):
    # _policy_lock prevents concurrent enactments from multiple clients
    if _policy_lock.locked():
        raise HTTPException(
            status_code=409,
            detail="Another policy is being enacted. Try again shortly.",
        )

    async with _policy_lock:
        try:
            clean_params = sanitize_policy(body.policy_type, body.parameters)
        except PolicyValidationError as exc:
            raise HTTPException(status_code=422, detail=str(exc))

        predicted = predict_effects(body.policy_type, clean_params)
        actual = apply_policy_to_city(body.policy_type, clean_params)

        policy = Policy(
            name=body.name,
            policy_type=body.policy_type,
            enacted_day=city_state.simulation_day,
            parameters=clean_params,
            predicted_effects=predicted,
            actual_effects=actual,
            narrative=body.narrative,
        )
        db.add(policy)
        await db.commit()
        await db.refresh(policy)

    return PolicyResponse.from_orm(policy)
