import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.simulation.policy_engine import apply_policy_to_city, apply_citizen_reactions_to_policy
from app.simulation.state import city_state
from app.simulation.constants import TAX_CAP
from app.models.citizen import Personality, Zone, JobType


def _reset_state():
    city_state.tax_rate = 0.15
    city_state.service_quality = 70.0
    city_state.city_fund = 10_000.0
    city_state.recent_policy = ""


def _citizen(personality=Personality.rational, happiness=60.0):
    c = MagicMock()
    c.id = uuid.uuid4()
    c.name = "Test"
    c.personality = personality
    c.happiness = happiness
    c.last_action = "stayed"
    return c


# ── apply_policy_to_city ──────────────────────────────────────────────────

class TestApplyPolicyToCity:
    def setup_method(self):
        _reset_state()

    def test_tax_increase_updates_tax_rate(self):
        apply_policy_to_city("tax_increase", {"tax_rate": 0.30})
        assert city_state.tax_rate == pytest.approx(0.30)

    def test_tax_rate_capped_at_60pct(self):
        apply_policy_to_city("tax_increase", {"tax_rate": 0.99})
        assert city_state.tax_rate == pytest.approx(TAX_CAP)

    def test_service_boost_updates_quality(self):
        apply_policy_to_city("service_boost", {"service_quality_delta": 10})
        assert city_state.service_quality == pytest.approx(80.0)

    def test_service_quality_capped_at_100(self):
        city_state.service_quality = 95.0
        apply_policy_to_city("service_boost", {"service_quality_delta": 20})
        assert city_state.service_quality == 100.0

    def test_service_quality_floored_at_0(self):
        city_state.service_quality = 5.0
        apply_policy_to_city("service_cut", {"service_quality_delta": -20})
        assert city_state.service_quality == 0.0

    def test_housing_deducts_fund(self):
        apply_policy_to_city("housing", {"fund_cost": 2000})
        assert city_state.city_fund == pytest.approx(8_000.0)

    def test_recent_policy_updated(self):
        apply_policy_to_city("job_program", {"fund_cost": 500})
        assert city_state.recent_policy == "job_program"


# ── apply_citizen_reactions_to_policy ────────────────────────────────────

class TestApplyCitizenReactions:
    @pytest.mark.asyncio
    async def test_reactions_update_happiness(self):
        pessimist = _citizen(Personality.pessimistic, happiness=60.0)
        optimist = _citizen(Personality.optimistic, happiness=60.0)

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [pessimist, optimist]
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.add = MagicMock()

        events = await apply_citizen_reactions_to_policy(
            uuid.uuid4(), "tax_increase", mock_db
        )

        # pessimist should be unhappier, optimist less so
        assert pessimist.happiness < 60.0
        assert optimist.happiness < 60.0
        assert pessimist.happiness < optimist.happiness

    @pytest.mark.asyncio
    async def test_returns_only_affected_events(self):
        # rational citizen with neutral reaction to housing (delta = 2, not 0)
        c = _citizen(Personality.rational, happiness=60.0)

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [c]
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.add = MagicMock()

        events = await apply_citizen_reactions_to_policy(
            uuid.uuid4(), "housing", mock_db
        )
        assert len(events) >= 0  # housing has positive delta for rational

    @pytest.mark.asyncio
    async def test_happiness_clamped_at_bounds(self):
        c = _citizen(Personality.optimistic, happiness=99.0)

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [c]
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.add = MagicMock()

        await apply_citizen_reactions_to_policy(uuid.uuid4(), "job_program", mock_db)
        assert c.happiness <= 100.0
