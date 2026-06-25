"""Tests for Part 4.3 — Replay Mode."""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.simulation.state import city_state
from app.simulation.fallback import apply_fallback_tick
from app.models.citizen import Personality, Zone, JobType


def _reset_state():
    city_state.is_running = False
    city_state.replay_mode = False
    city_state.simulation_day = 0
    city_state.city_fund = 10_000.0
    city_state.service_quality = 70.0
    city_state.tax_rate = 0.15
    city_state.recent_policy = ""


def _citizen(personality=Personality.rational, happiness=60.0, zone=Zone.B):
    c = MagicMock()
    c.id = uuid.uuid4()
    c.name = "Test"
    c.personality = personality
    c.happiness = happiness
    c.zone = zone
    c.job_type = JobType.teacher
    c.last_action = "stayed"
    c.savings = 5000.0
    c.days_unhappy = 0
    return c


# ── city_state replay flags ───────────────────────────────────────────────

class TestReplayStateFlags:
    def setup_method(self):
        _reset_state()

    def test_replay_mode_off_by_default(self):
        assert city_state.replay_mode is False

    def test_set_replay_mode_true(self):
        city_state.replay_mode = True
        assert city_state.replay_mode is True

    def test_clear_replay_mode(self):
        city_state.replay_mode = True
        city_state.replay_mode = False
        assert city_state.replay_mode is False

    def test_replay_mode_with_is_running(self):
        city_state.replay_mode = True
        city_state.is_running = True
        assert city_state.replay_mode is True
        assert city_state.is_running is True


# ── apply_fallback_tick determinism ──────────────────────────────────────

class TestFallbackTickDeterminism:
    def setup_method(self):
        _reset_state()

    def test_returns_list(self):
        citizens = [_citizen()]
        result = apply_fallback_tick(citizens, "")
        assert isinstance(result, list)

    def test_deterministic_same_policy(self):
        citizens = [_citizen(personality=Personality.optimistic)]
        result_a = apply_fallback_tick(citizens, "tax_increase")
        result_b = apply_fallback_tick(citizens, "tax_increase")
        # Both calls produce same happiness_delta for same citizen/policy
        assert result_a[0]["happiness_delta"] == result_b[0]["happiness_delta"]

    def test_optimistic_less_hurt_by_tax(self):
        opt = _citizen(personality=Personality.optimistic)
        pes = _citizen(personality=Personality.pessimistic)
        opt_result = apply_fallback_tick([opt], "tax_increase")
        pes_result = apply_fallback_tick([pes], "tax_increase")
        # optimistic citizen takes a smaller happiness hit than pessimistic
        assert opt_result[0]["happiness_delta"] > pes_result[0]["happiness_delta"]

    def test_service_boost_positive_delta(self):
        citizens = [_citizen()]
        result = apply_fallback_tick(citizens, "service_boost")
        assert result[0]["happiness_delta"] >= 0

    def test_tax_increase_negative_delta(self):
        citizens = [_citizen(personality=Personality.pessimistic)]
        result = apply_fallback_tick(citizens, "tax_increase")
        assert result[0]["happiness_delta"] < 0

    def test_empty_policy_returns_no_events(self):
        # delta == 0 → no event emitted (only non-zero deltas create events)
        citizens = [_citizen()]
        result = apply_fallback_tick(citizens, "")
        assert result == []

    def test_each_citizen_gets_event(self):
        citizens = [_citizen(), _citizen(), _citizen()]
        result = apply_fallback_tick(citizens, "service_boost")
        assert len(result) == 3

    def test_event_has_required_keys(self):
        citizens = [_citizen()]
        result = apply_fallback_tick(citizens, "tax_increase")
        ev = result[0]
        assert "event_type" in ev
        assert "narrative" in ev
        assert "happiness_delta" in ev
        assert "citizen_id" in ev

    def test_narrative_is_string(self):
        citizens = [_citizen()]
        result = apply_fallback_tick(citizens, "housing")
        assert isinstance(result[0]["narrative"], str)
        assert len(result[0]["narrative"]) > 0


# ── replay vs live mode routing ───────────────────────────────────────────

class TestReplayRoutingInLoop:
    """Verify that _do_tick uses apply_fallback_tick in replay mode
    and run_citizen_ai_tick in normal mode."""

    def setup_method(self):
        _reset_state()

    @pytest.mark.asyncio
    async def test_replay_mode_calls_fallback_not_llm(self):
        city_state.replay_mode = True
        city_state.is_running = True

        mock_gateway = MagicMock()
        mock_gateway._keys = ["key1"]

        with patch("app.simulation.loop.apply_fallback_tick", return_value=[]) as mock_fb, \
             patch("app.simulation.loop.run_citizen_ai_tick", new_callable=AsyncMock) as mock_llm, \
             patch("app.simulation.loop._gateway_module") as mock_gw_mod, \
             patch("app.simulation.loop.apply_economy_tick", return_value={"events": [], "total_tax_collected": 0}), \
             patch("app.simulation.loop.apply_migration_tick", return_value=[]), \
             patch("app.simulation.loop.get_zone_populations", return_value={Zone.A: 12, Zone.B: 20, Zone.C: 18}), \
             patch("app.simulation.loop._emit", new_callable=AsyncMock), \
             patch("app.simulation.loop.city_manager") as mock_cm, \
             patch("app.simulation.loop.policy_advisor"), \
             patch("app.simulation.state._pending_updates", {}):

            mock_gw_mod.llm_gateway = mock_gateway
            mock_cm.should_run.return_value = False

            mock_db = AsyncMock()
            mock_db.__aenter__ = AsyncMock(return_value=mock_db)
            mock_db.__aexit__ = AsyncMock(return_value=False)

            c = _citizen()
            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = [c]
            mock_result.scalar_one_or_none.return_value = None
            mock_db.execute.return_value = mock_result

            from app.simulation.loop import _do_tick
            await _do_tick(mock_db)

            mock_fb.assert_called_once()
            mock_llm.assert_not_called()

    @pytest.mark.asyncio
    async def test_normal_mode_calls_llm_not_fallback(self):
        city_state.replay_mode = False
        city_state.is_running = True

        mock_gateway = MagicMock()
        mock_gateway._keys = ["key1"]

        with patch("app.simulation.loop.apply_fallback_tick", return_value=[]) as mock_fb, \
             patch("app.simulation.loop.run_citizen_ai_tick", new_callable=AsyncMock) as mock_llm, \
             patch("app.simulation.loop._gateway_module") as mock_gw_mod, \
             patch("app.simulation.loop.apply_economy_tick", return_value={"events": [], "total_tax_collected": 0}), \
             patch("app.simulation.loop.apply_migration_tick", return_value=[]), \
             patch("app.simulation.loop.get_zone_populations", return_value={Zone.A: 12, Zone.B: 20, Zone.C: 18}), \
             patch("app.simulation.loop._emit", new_callable=AsyncMock), \
             patch("app.simulation.loop.city_manager") as mock_cm, \
             patch("app.simulation.loop.policy_advisor"), \
             patch("app.simulation.state._pending_updates", {}):

            mock_gw_mod.llm_gateway = mock_gateway
            mock_cm.should_run.return_value = False

            mock_db = AsyncMock()
            mock_db.__aenter__ = AsyncMock(return_value=mock_db)
            mock_db.__aexit__ = AsyncMock(return_value=False)

            c = _citizen()
            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = [c]
            mock_result.scalar_one_or_none.return_value = None
            mock_db.execute.return_value = mock_result

            from app.simulation.loop import _do_tick
            await _do_tick(mock_db)

            mock_fb.assert_not_called()
            mock_llm.assert_called_once()
