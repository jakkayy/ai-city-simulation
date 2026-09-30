"""
Long-run balance checks. The city used to settle into a fixed point (everyone at
happiness 100, fund in the millions, debts of -100k); these tests run hundreds of
simulated days with no database and no LLM and assert that it stays interesting.
"""
import functools
import random
import uuid
from datetime import date, timedelta

import pytest

from app.db.seed import _JOB_DIST, _NAMES, _SAVINGS_RANGE, _ZONE_DIST
from app.models.citizen import Citizen, JobType, Personality, Zone
from app.simulation.constants import DEFAULT_SERVICE_QUALITY, DEFAULT_TAX_RATE
from app.simulation.economy import savings_floor
from app.simulation.loop import run_day
from app.simulation.state import CityState

START = date(2026, 1, 1)


def make_city(seed: int) -> list[Citizen]:
    rng = random.Random(seed)
    zones, jobs = _ZONE_DIST.copy(), _JOB_DIST.copy()
    rng.shuffle(zones)
    rng.shuffle(jobs)
    citizens = []
    for i, name in enumerate(_NAMES):
        lo, hi = _SAVINGS_RANGE[jobs[i]]
        citizens.append(Citizen(
            id=uuid.UUID(int=rng.getrandbits(128)), name=name, age=30, job_type=jobs[i], zone=zones[i],
            happiness=rng.uniform(45, 75), savings=rng.uniform(lo, hi),
            personality=rng.choice(list(Personality)), memory_summary="",
            days_unhappy=0, zone_locked_until=None, last_action="arrived",
            pending_reaction=False, friend_ids="",
        ))
    return citizens


@functools.lru_cache(maxsize=None)
def _cached(days: int, seed: int):
    return simulate(days, seed)


def simulate(days: int, seed: int = 1, **state_kwargs):
    random.seed(seed)
    citizens = make_city(seed)
    state = CityState(
        city_fund=10_000.0, service_quality=DEFAULT_SERVICE_QUALITY,
        tax_rate=DEFAULT_TAX_RATE, **state_kwargs,
    )
    history = []
    for d in range(days):
        _, events = run_day(citizens, state, START + timedelta(days=d))
        history.append({
            "happiness": sum(c.happiness for c in citizens) / len(citizens),
            "fund": state.city_fund,
            "service": state.service_quality,
            "events": events,
        })
    return citizens, state, history


@pytest.mark.parametrize("seed", [1, 2, 3])
class TestDefaultPolicyStaysBalanced:
    def test_happiness_is_not_pinned_at_the_ceiling(self, seed):
        _, _, h = _cached(600, seed)
        tail = [p["happiness"] for p in h[-200:]]
        assert max(tail) < 95

    def test_happiness_is_not_collapsed(self, seed):
        _, _, h = _cached(600, seed)
        tail = [p["happiness"] for p in h[-200:]]
        assert min(tail) > 30

    def test_fund_does_not_explode(self, seed):
        _, _, h = _cached(600, seed)
        assert max(p["fund"] for p in h) < 150_000

    def test_debt_is_bounded(self, seed):
        citizens, _, h = _cached(600, seed)
        for c in citizens:
            assert c.savings >= savings_floor(c) * 1.5 - 500

    def test_wealth_is_bounded(self, seed):
        citizens, _, _ = _cached(600, seed)
        assert max(c.savings for c in citizens) < 80_000

    def test_citizens_are_not_all_the_same(self, seed):
        citizens, _, _ = _cached(600, seed)
        values = [c.happiness for c in citizens]
        assert max(values) - min(values) > 10

    def test_city_keeps_producing_events(self, seed):
        _, _, h = _cached(600, seed)
        late_events = sum(len(p["events"]) for p in h[-300:])
        assert late_events > 50

    def test_unemployment_exists_but_is_not_universal(self, seed):
        citizens, _, _ = _cached(600, seed)
        jobless = sum(c.job_type == JobType.unemployed for c in citizens)
        assert jobless < 25

    def test_zone_capacities_never_exceeded(self, seed):
        from app.simulation.constants import ZONE_CAPACITY
        citizens, _, _ = _cached(600, seed)
        for zone in Zone:
            assert sum(c.zone == zone for c in citizens) <= max(ZONE_CAPACITY[zone], 30)


class TestPoliciesMatter:
    def test_high_taxes_make_citizens_unhappier(self):
        _, _, base = simulate(300, 7)
        random.seed(7)
        citizens = make_city(7)
        state = CityState(city_fund=10_000.0, service_quality=70.0, tax_rate=0.45)
        for d in range(300):
            run_day(citizens, state, START + timedelta(days=d))
        taxed = sum(c.happiness for c in citizens) / len(citizens)
        assert taxed < base[-1]["happiness"] - 5

    def test_same_seed_is_reproducible(self):
        _, _, a = simulate(120, 5)
        _, _, b = simulate(120, 5)
        assert [round(p["happiness"], 6) for p in a] == [round(p["happiness"], 6) for p in b]
        assert [round(p["fund"], 4) for p in a] == [round(p["fund"], 4) for p in b]


class TestEventsCarryStructuredData:
    """The UI translates events from `data`, so every known event type must provide it."""

    REQUIRED = {
        "job_recovery": {"name", "job"},
        "job_loss": {"name"},
        "bankruptcy": {"name"},
        "migration": {"name", "from", "to"},
        "migration_waitlisted": {"name", "to"},
        "city_event": {"kind"},
    }

    def test_every_event_has_the_data_the_ui_needs(self):
        import json

        seen = set()
        for seed in (1, 2):
            _, _, history = _cached(500, seed)
            for point in history:
                for ev in point["events"]:
                    kind = ev["event_type"]
                    if kind not in self.REQUIRED:
                        continue
                    seen.add(kind)
                    assert self.REQUIRED[kind] <= set(ev["data"]), (kind, ev)
                    json.dumps(ev["data"])        # must survive the socket
        assert {"job_loss", "job_recovery", "city_event", "migration_waitlisted"} <= seen

    def test_city_event_kinds_carry_their_numbers(self):
        needed = {"recession": "days", "boom": "days", "disaster": "cost", "grant": "amount"}
        found = set()
        for seed in range(1, 5):
            _, _, history = _cached(500, seed)
            for point in history:
                for ev in point["events"]:
                    if ev["event_type"] == "city_event":
                        k = ev["data"]["kind"]
                        assert needed[k] in ev["data"]
                        found.add(k)
        assert found == set(needed)
