import uuid
from unittest.mock import MagicMock

import pytest

from app.models.citizen import JobType, Zone
from app.simulation.constants import (
    DAILY_INCOME,
    DAILY_RENT,
    DAILY_LIVING_EXPENSES,
    TAX_CAP,
    SERVICE_QUALITY_RECOVERY,
    SERVICE_QUALITY_DECAY,
    SAVINGS_FLOOR_MONTHS,
)
from app.simulation.economy import apply_economy_tick, city_overhead, compute_citizen_daily
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
        # income 500 - tax 75 - rent 120 - living 75 = 230
        assert d["net"] == pytest.approx(230.0)

    def test_net_negative_unemployed(self):
        c = _citizen(job_type=JobType.unemployed, zone=Zone.C)
        d = compute_citizen_daily(c, tax_rate=0.15)
        # income 0 - tax 0 - rent 45 - living 30 = -75
        assert d["net"] == pytest.approx(-75.0)

    def test_tax_is_capped(self):
        c = _citizen(job_type=JobType.business_owner, zone=Zone.A)
        d = compute_citizen_daily(c, tax_rate=0.90)  # above cap
        assert d["tax"] == pytest.approx(500 * TAX_CAP)

    def test_tax_below_cap_applied_directly(self):
        c = _citizen(job_type=JobType.teacher, zone=Zone.B)
        d = compute_citizen_daily(c, tax_rate=0.20)
        assert d["tax"] == pytest.approx(200 * 0.20)

    def test_laborer_zone_c_small_surplus(self):
        c = _citizen(job_type=JobType.laborer, zone=Zone.C)
        d = compute_citizen_daily(c, tax_rate=0.15)
        # income 100 - tax 15 - rent 45 - living 30 = +10
        assert d["net"] == pytest.approx(10.0)

    def test_laborer_slides_when_taxes_rise(self):
        c = _citizen(job_type=JobType.laborer, zone=Zone.C)
        assert compute_citizen_daily(c, tax_rate=0.30)["net"] < 0

    def test_recession_lowers_income(self):
        c = _citizen(job_type=JobType.teacher, zone=Zone.B)
        normal = compute_citizen_daily(c, tax_rate=0.15)
        slump = compute_citizen_daily(c, tax_rate=0.15, income_modifier=0.8)
        assert slump["income"] == pytest.approx(normal["income"] * 0.8)


# ── apply_economy_tick ────────────────────────────────────────────────────

class TestApplyEconomyTick:
    def test_savings_updated(self):
        state = CityState(city_fund=10_000, service_quality=70, tax_rate=0.15)
        c = _citizen(job_type=JobType.teacher, zone=Zone.B, savings=500.0)
        apply_economy_tick([c], state)
        # net = 200 - 30 - 70 - 40 = +60
        assert c.savings == pytest.approx(560.0)

    def test_city_fund_updated(self):
        state = CityState(city_fund=10_000, service_quality=70, tax_rate=0.15)
        c = _citizen(job_type=JobType.teacher, zone=Zone.B)
        result = apply_economy_tick([c], state)
        # tax = 200 * 0.15 = 30; fund = 10000 + 30 - overhead(70)
        assert result["city_fund"] == pytest.approx(10_000 + 30 - city_overhead(70))

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
