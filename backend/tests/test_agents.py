import pytest
from unittest.mock import AsyncMock, MagicMock

from app.simulation.agents import (
    CityManagerAgent,
    PolicyAdvisorAgent,
    parse_json_proposal,
    agent_status,
)
from app.simulation.state import city_state


def _ctx(happiness=60.0, fund=10_000.0, sq=70.0, tax=0.15, day=10):
    return {
        "day": day,
        "avg_happiness": happiness,
        "city_fund": fund,
        "service_quality": sq,
        "tax_rate": tax,
        "zone_a": 12, "zone_b": 20, "zone_c": 18,
        "recent_policy": "",
    }


def _no_key_gateway():
    gw = MagicMock()
    gw._keys = []
    return gw


# ── _parse_json_proposal ──────────────────────────────────────────────────

class TestParseJsonProposal:
    def test_valid_proposal(self):
        raw = '{"policy_type":"tax_decrease","parameters":{"tax_rate":0.10},"reasoning":"lower tax"}'
        result = parse_json_proposal(raw)
        assert result["policy_type"] == "tax_decrease"
        assert result["parameters"]["tax_rate"] == 0.10

    def test_strips_markdown(self):
        raw = '```json\n{"policy_type":"housing","parameters":{"fund_cost":500},"reasoning":"help"}\n```'
        result = parse_json_proposal(raw)
        assert result["policy_type"] == "housing"

    def test_invalid_policy_type_returns_none(self):
        raw = '{"policy_type":"nuke_city","parameters":{},"reasoning":"boom"}'
        assert parse_json_proposal(raw) is None

    def test_not_json_returns_none(self):
        assert parse_json_proposal("sorry I cannot help") is None

    def test_embedded_json_extracted(self):
        raw = 'Sure! Here: {"policy_type":"job_program","parameters":{"fund_cost":300},"reasoning":"jobs"}'
        result = parse_json_proposal(raw)
        assert result is not None
        assert result["policy_type"] == "job_program"


# ── CityManagerAgent ──────────────────────────────────────────────────────

class TestCityManagerAgent:
    def setup_method(self):
        agent_status.city_manager_last_run_day = -1
        city_state.replay_mode = False

    def test_should_run_initially(self):
        cm = CityManagerAgent()
        assert cm.should_run(0)

    def test_should_not_run_before_interval(self):
        cm = CityManagerAgent()
        agent_status.city_manager_last_run_day = 5
        assert not cm.should_run(10)

    def test_should_run_after_interval(self):
        cm = CityManagerAgent()
        agent_status.city_manager_last_run_day = 0
        assert cm.should_run(7)

    @pytest.mark.asyncio
    async def test_rule_based_low_fund(self):
        cm = CityManagerAgent()
        ctx = _ctx(fund=-500.0)
        proposal = await cm.run(ctx, _no_key_gateway())
        assert proposal["policy_type"] == "tax_increase"

    @pytest.mark.asyncio
    async def test_rule_based_low_happiness(self):
        cm = CityManagerAgent()
        ctx = _ctx(happiness=25.0, sq=45.0, fund=500.0)
        proposal = await cm.run(ctx, _no_key_gateway())
        assert proposal is not None
        assert "tax" in proposal["policy_type"] or "service" in proposal["policy_type"]

    @pytest.mark.asyncio
    async def test_rule_based_healthy_city_returns_none(self):
        cm = CityManagerAgent()
        ctx = _ctx(happiness=75.0, fund=20_000.0, sq=80.0)
        proposal = await cm.run(ctx, _no_key_gateway())
        assert proposal is None

    @pytest.mark.asyncio
    async def test_llm_failure_falls_back(self):
        cm = CityManagerAgent()
        gw = MagicMock()
        gw._keys = ["key"]
        gw.call = AsyncMock(side_effect=RuntimeError("timeout"))
        ctx = _ctx(fund=-100.0)
        proposal = await cm.run(ctx, gw)
        assert proposal is not None  # rule-based fallback


# ── PolicyAdvisorAgent ────────────────────────────────────────────────────

class TestPolicyAdvisorAgent:
    def setup_method(self):
        city_state.replay_mode = False

    @pytest.mark.asyncio
    async def test_collapse_advice_not_empty(self):
        pa = PolicyAdvisorAgent()
        advice = await pa.advise("collapse", _ctx(happiness=8.0), _no_key_gateway())
        assert len(advice) > 20
        assert agent_status.advisor_last_crisis == "collapse"

    @pytest.mark.asyncio
    async def test_critical_advice_not_empty(self):
        pa = PolicyAdvisorAgent()
        advice = await pa.advise("critical", _ctx(happiness=18.0), _no_key_gateway())
        assert len(advice) > 20

    @pytest.mark.asyncio
    async def test_warning_advice_not_empty(self):
        pa = PolicyAdvisorAgent()
        advice = await pa.advise("warning", _ctx(happiness=32.0), _no_key_gateway())
        assert len(advice) > 20

    @pytest.mark.asyncio
    async def test_llm_failure_falls_back(self):
        pa = PolicyAdvisorAgent()
        gw = MagicMock()
        gw._keys = ["key"]
        gw.call = AsyncMock(side_effect=RuntimeError("timeout"))
        advice = await pa.advise("critical", _ctx(), gw)
        assert len(advice) > 0
