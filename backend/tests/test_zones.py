import uuid
from datetime import date, timedelta
from unittest.mock import MagicMock

import pytest

from app.models.citizen import Zone
from app.simulation.constants import ZONE_CAPACITY, ZONE_LOCK_DAYS
from app.simulation.zones import (
    apply_migration_tick,
    get_zone_populations,
    _decide_migration,
)

TODAY = date(2026, 1, 1)


def _citizen(
    zone=Zone.B,
    happiness=30.0,
    days_unhappy=5,
    savings=0.0,
    last_action="stayed",
    zone_locked_until=None,
):
    c = MagicMock()
    c.id = uuid.uuid4()
    c.name = "Test"
    c.zone = zone
    c.happiness = happiness
    c.days_unhappy = days_unhappy
    c.savings = savings
    c.last_action = last_action
    c.zone_locked_until = zone_locked_until
    return c


# ── get_zone_populations ──────────────────────────────────────────────────

class TestGetZonePopulations:
    def test_counts_correctly(self):
        citizens = [
            _citizen(zone=Zone.A),
            _citizen(zone=Zone.A),
            _citizen(zone=Zone.B),
            _citizen(zone=Zone.C),
        ]
        pops = get_zone_populations(citizens)
        assert pops == {Zone.A: 2, Zone.B: 1, Zone.C: 1}

    def test_empty_list(self):
        pops = get_zone_populations([])
        assert pops == {Zone.A: 0, Zone.B: 0, Zone.C: 0}


# ── _decide_migration ─────────────────────────────────────────────────────

class TestDecideMigration:
    # -- forced downgrade (savings_critical) --
    def test_savings_critical_a_goes_to_b(self):
        c = _citizen(zone=Zone.A, last_action="savings_critical")
        assert _decide_migration(c, TODAY) == Zone.B

    def test_savings_critical_b_goes_to_c(self):
        c = _citizen(zone=Zone.B, last_action="savings_critical")
        assert _decide_migration(c, TODAY) == Zone.C

    def test_savings_critical_c_stays(self):
        c = _citizen(zone=Zone.C, last_action="savings_critical")
        assert _decide_migration(c, TODAY) is None

    def test_savings_critical_bypasses_lock(self):
        locked = TODAY + timedelta(days=15)
        c = _citizen(zone=Zone.B, last_action="savings_critical", zone_locked_until=locked)
        assert _decide_migration(c, TODAY) == Zone.C

    # -- voluntary: no trigger --
    def test_happy_citizen_stays(self):
        c = _citizen(happiness=60.0, days_unhappy=0)
        assert _decide_migration(c, TODAY) is None

    def test_unhappy_but_too_few_days_stays(self):
        c = _citizen(happiness=30.0, days_unhappy=2)
        assert _decide_migration(c, TODAY) is None

    def test_locked_voluntary_stays(self):
        locked = TODAY + timedelta(days=10)
        c = _citizen(happiness=30.0, days_unhappy=5, zone_locked_until=locked)
        assert _decide_migration(c, TODAY) is None

    def test_lock_expired_can_migrate(self):
        expired = TODAY - timedelta(days=1)
        c = _citizen(zone=Zone.B, happiness=30.0, days_unhappy=5, savings=-1.0, zone_locked_until=expired)
        assert _decide_migration(c, TODAY) == Zone.C

    # -- voluntary: direction --
    def test_in_debt_zone_b_downgrades_to_c(self):
        c = _citizen(zone=Zone.B, happiness=30.0, days_unhappy=5, savings=-50.0)
        assert _decide_migration(c, TODAY) == Zone.C

    def test_in_debt_zone_a_downgrades_to_b(self):
        c = _citizen(zone=Zone.A, happiness=30.0, days_unhappy=5, savings=-1.0)
        assert _decide_migration(c, TODAY) == Zone.B

    def test_in_debt_zone_c_stays(self):
        c = _citizen(zone=Zone.C, happiness=30.0, days_unhappy=5, savings=-1.0)
        assert _decide_migration(c, TODAY) is None

    def test_enough_savings_zone_c_upgrades_to_b(self):
        c = _citizen(zone=Zone.C, happiness=30.0, days_unhappy=5, savings=1_000.0)
        assert _decide_migration(c, TODAY) == Zone.B

    def test_not_enough_savings_zone_c_stays(self):
        c = _citizen(zone=Zone.C, happiness=30.0, days_unhappy=5, savings=500.0)
        assert _decide_migration(c, TODAY) is None

    def test_enough_savings_zone_b_upgrades_to_a(self):
        c = _citizen(zone=Zone.B, happiness=30.0, days_unhappy=5, savings=3_000.0)
        assert _decide_migration(c, TODAY) == Zone.A

    def test_already_zone_a_no_upgrade(self):
        c = _citizen(zone=Zone.A, happiness=30.0, days_unhappy=5, savings=99_999.0)
        assert _decide_migration(c, TODAY) is None


# ── apply_migration_tick ──────────────────────────────────────────────────

class TestApplyMigrationTick:
    def test_successful_migration_updates_zone(self):
        c = _citizen(zone=Zone.C, happiness=30.0, days_unhappy=5, savings=1_000.0)
        apply_migration_tick([c], TODAY)
        assert c.zone == Zone.B

    def test_successful_migration_sets_lock(self):
        c = _citizen(zone=Zone.C, happiness=30.0, days_unhappy=5, savings=1_000.0)
        apply_migration_tick([c], TODAY)
        assert c.zone_locked_until == TODAY + timedelta(days=ZONE_LOCK_DAYS)

    def test_successful_migration_sets_last_action(self):
        c = _citizen(zone=Zone.C, happiness=30.0, days_unhappy=5, savings=1_000.0)
        apply_migration_tick([c], TODAY)
        assert c.last_action == "migrated"

    def test_migration_event_returned(self):
        c = _citizen(zone=Zone.C, happiness=30.0, days_unhappy=5, savings=1_000.0)
        events = apply_migration_tick([c], TODAY)
        assert len(events) == 1
        assert events[0]["event_type"] == "migration"

    def test_waitlisted_when_zone_full(self):
        # fill Zone B to capacity
        residents = [_citizen(zone=Zone.B) for _ in range(ZONE_CAPACITY[Zone.B])]
        mover = _citizen(zone=Zone.C, happiness=30.0, days_unhappy=5, savings=1_000.0)
        events = apply_migration_tick(residents + [mover], TODAY)
        assert mover.zone == Zone.C  # didn't move
        waitlisted = [e for e in events if e["event_type"] == "migration_waitlisted"]
        assert len(waitlisted) == 1

    def test_waitlisted_applies_happiness_penalty(self):
        residents = [_citizen(zone=Zone.B) for _ in range(ZONE_CAPACITY[Zone.B])]
        mover = _citizen(zone=Zone.C, happiness=30.0, days_unhappy=5, savings=1_000.0)
        apply_migration_tick(residents + [mover], TODAY)
        assert mover.happiness == pytest.approx(28.0)

    def test_populations_updated_prevents_overcrowding(self):
        # two citizens both trying to upgrade to Zone B which has 1 slot left
        residents = [_citizen(zone=Zone.B) for _ in range(ZONE_CAPACITY[Zone.B] - 1)]
        mover1 = _citizen(zone=Zone.C, happiness=30.0, days_unhappy=5, savings=1_000.0)
        mover2 = _citizen(zone=Zone.C, happiness=30.0, days_unhappy=5, savings=1_000.0)
        apply_migration_tick(residents + [mover1, mover2], TODAY)
        # exactly one should have moved, one should be waitlisted
        moved = sum(1 for c in [mover1, mover2] if c.zone == Zone.B)
        assert moved == 1

    def test_no_migration_no_events(self):
        c = _citizen(happiness=80.0, days_unhappy=0)
        events = apply_migration_tick([c], TODAY)
        assert events == []
