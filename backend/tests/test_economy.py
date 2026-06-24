import uuid
from unittest.mock import MagicMock

import pytest

from app.models.citizen import JobType, Zone
from app.simulation.constants import (
    DAILY_INCOME,
    DAILY_RENT,
    DAILY_LIVING_EXPENSES,
    TAX_CAP,
    CITY_DAILY_OVERHEAD,
    SERVICE_QUALITY_RECOVERY,
    SERVICE_QUALITY_DECAY,
    SAVINGS_FLOOR_MONTHS,
)
from app.simulation.economy import apply_economy_tick, compute_citizen_daily
from app.simulation.state import CityState


def _citizen(job_type=JobType.laborer, zone=Zone.B, savings=1000.0):
    c = MagicMock()
    c.id = uuid.uuid4()
    c.name = "Test Citizen"
    c.job_type = job_type
    c.zone = zone
    c.savings = savings
    c.last_action = "stayed"
    return c


# ── compute_citizen_daily ──────────────────────────────────────────────────

class TestComputeCitizenDaily:
    def test_net_positive_high_earner(self):
        c = _citizen(job_type=JobType.business_owner, zone=Zone.A)
        d = compute_citizen_daily(c, tax_rate=0.15)
        # income 500 - tax 75 - rent 200 - living 100 = 125
        assert d["net"] == pytest.approx(125.0)

    def test_net_negative_unemployed(self):
        c = _citizen(job_type=JobType.unemployed, zone=Zone.C)
        d = compute_citizen_daily(c, tax_rate=0.15)
        # income 0 - tax 0 - rent 60 - living 40 = -100
        assert d["net"] == pytest.approx(-100.0)

    def test_tax_is_capped(self):
        c = _citizen(job_type=JobType.business_owner, zone=Zone.A)
        d = compute_citizen_daily(c, tax_rate=0.90)  # above cap
        assert d["tax"] == pytest.approx(500 * TAX_CAP)

    def test_tax_below_cap_applied_directly(self):
        c = _citizen(job_type=JobType.teacher, zone=Zone.B)
        d = compute_citizen_daily(c, tax_rate=0.20)
        assert d["tax"] == pytest.approx(200 * 0.20)

    def test_laborer_zone_c_slight_loss(self):
        c = _citizen(job_type=JobType.laborer, zone=Zone.C)
        d = compute_citizen_daily(c, tax_rate=0.15)
        # income 100 - tax 15 - rent 60 - living 40 = -15
        assert d["net"] == pytest.approx(-15.0)


# ── apply_economy_tick ────────────────────────────────────────────────────

class TestApplyEconomyTick:
    def test_savings_updated(self):
        state = CityState(city_fund=10_000, service_quality=70, tax_rate=0.15)
        c = _citizen(job_type=JobType.teacher, zone=Zone.B, savings=500.0)
        apply_economy_tick([c], state)
        # net = 200 - 30 - 120 - 60 = -10
        assert c.savings == pytest.approx(490.0)

    def test_city_fund_updated(self):
        state = CityState(city_fund=10_000, service_quality=70, tax_rate=0.15)
        c = _citizen(job_type=JobType.teacher, zone=Zone.B)
        result = apply_economy_tick([c], state)
        # tax = 200 * 0.15 = 30; fund = 10000 + 30 - 500 = 9530
        assert result["city_fund"] == pytest.approx(9530.0)

    def test_service_quality_recovers_when_solvent(self):
        state = CityState(city_fund=5000, service_quality=50.0, tax_rate=0.15)
        c = _citizen(job_type=JobType.business_owner, zone=Zone.A)
        apply_economy_tick([c], state)
        assert state.service_quality == pytest.approx(50.0 + SERVICE_QUALITY_RECOVERY)

    def test_service_quality_decays_when_insolvent(self):
        state = CityState(city_fund=-1, service_quality=50.0, tax_rate=0.15)
        c = _citizen(job_type=JobType.unemployed, zone=Zone.C)
        apply_economy_tick([c], state)
        assert state.service_quality == pytest.approx(50.0 - SERVICE_QUALITY_DECAY)

    def test_service_quality_capped_at_100(self):
        state = CityState(city_fund=99999, service_quality=100.0, tax_rate=0.15)
        c = _citizen(job_type=JobType.business_owner, zone=Zone.A)
        apply_economy_tick([c], state)
        assert state.service_quality == 100.0

    def test_service_quality_floored_at_0(self):
        state = CityState(city_fund=-1, service_quality=0.0, tax_rate=0.15)
        c = _citizen(job_type=JobType.unemployed, zone=Zone.C)
        apply_economy_tick([c], state)
        assert state.service_quality == 0.0

    def test_savings_floor_flags_citizen(self):
        state = CityState(city_fund=1000, service_quality=70, tax_rate=0.15)
        # Zone C floor = -(3 * 60 * 30) = -5400
        c = _citizen(zone=Zone.C, savings=-5500.0)
        c.job_type = JobType.unemployed
        apply_economy_tick([c], state)
        assert c.last_action == "savings_critical"

    def test_savings_above_floor_not_flagged(self):
        state = CityState(city_fund=1000, service_quality=70, tax_rate=0.15)
        c = _citizen(zone=Zone.C, savings=-100.0)
        c.job_type = JobType.laborer
        apply_economy_tick([c], state)
        assert c.last_action != "savings_critical"

    def test_multiple_citizens_tax_summed(self):
        state = CityState(city_fund=0, service_quality=70, tax_rate=0.10)
        citizens = [
            _citizen(job_type=JobType.laborer, zone=Zone.C),   # tax = 10
            _citizen(job_type=JobType.teacher, zone=Zone.B),   # tax = 20
        ]
        result = apply_economy_tick(citizens, state)
        assert result["total_tax_collected"] == pytest.approx(30.0)
