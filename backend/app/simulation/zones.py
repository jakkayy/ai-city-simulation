from datetime import date, timedelta

from app.models.citizen import Citizen, Zone
from app.simulation.constants import (
    ZONE_CAPACITY,
    ZONE_HAPPINESS_MODIFIER,
    ZONE_LOCK_DAYS,
)

# one-step upgrade / downgrade paths
_UPGRADE: dict[Zone, Zone] = {Zone.C: Zone.B, Zone.B: Zone.A}
_DOWNGRADE: dict[Zone, Zone] = {Zone.A: Zone.B, Zone.B: Zone.C}

# minimum savings required to voluntarily upgrade
_UPGRADE_SAVINGS_THRESHOLD: dict[Zone, float] = {
    Zone.B: 1_000.0,   # C → B
    Zone.A: 3_000.0,   # B → A
}

# how often a waitlisted citizen is reported / penalised
_WAITLIST_NOTICE_DAYS = 30

# savings at which a citizen upgrades on their own, as a multiple of the upgrade threshold
_ASPIRATION_FACTOR = 2.0

# voluntary move triggers when happiness drops below this for N days
_VOLUNTARY_HAPPINESS_THRESHOLD = 40.0
_VOLUNTARY_UNHAPPY_DAYS = 3


def get_zone_populations(citizens: list[Citizen]) -> dict[Zone, int]:
    counts: dict[Zone, int] = {Zone.A: 0, Zone.B: 0, Zone.C: 0}
    for c in citizens:
        counts[c.zone] += 1
    return counts


def apply_migration_tick(
    citizens: list[Citizen],
    current_date: date,
) -> list[dict]:
    """
    Evaluate and execute zone migrations for one simulation day.
    Mutates citizen.zone, .zone_locked_until, .last_action in place.
    Returns migration events for the caller to persist.
    """
    populations = get_zone_populations(citizens)
    events: list[dict] = []

    for citizen in citizens:
        target = _decide_migration(citizen, current_date)
        if target is None:
            continue

        if populations[target] >= ZONE_CAPACITY[target]:
            # zone is full — the citizen keeps waiting, but the penalty and the
            # event are only applied every _WAITLIST_NOTICE_DAYS days, not daily
            if (current_date.toordinal() + citizen.id.int) % _WAITLIST_NOTICE_DAYS != 0:
                continue
            citizen.happiness = max(0.0, citizen.happiness - 2.0)
            events.append({
                "citizen_id": str(citizen.id),
                "event_type": "migration_waitlisted",
                "narrative": (
                    f"{citizen.name} wants to move to Zone {target.value} "
                    "but it is at capacity."
                ),
                "happiness_delta": -2,
            })
            continue

        from_zone = citizen.zone
        populations[from_zone] -= 1
        populations[target] += 1

        citizen.zone = target
        citizen.zone_locked_until = current_date + timedelta(days=ZONE_LOCK_DAYS)
        citizen.last_action = "migrated"

        delta = ZONE_HAPPINESS_MODIFIER[target] - ZONE_HAPPINESS_MODIFIER[from_zone]
        events.append({
            "citizen_id": str(citizen.id),
            "event_type": "migration",
            "narrative": (
                f"{citizen.name} moved from Zone {from_zone.value} "
                f"to Zone {target.value}."
            ),
            "happiness_delta": delta,
        })

    return events


def _decide_migration(citizen: Citizen, current_date: date) -> Zone | None:
    """Return the target zone if the citizen should move, else None."""

    # forced downgrade — economy engine flagged savings as critically low
    # bypasses zone lock; one step at a time (A→B, B→C)
    if citizen.last_action == "savings_critical":
        return _DOWNGRADE.get(citizen.zone)  # None when already in C

    # aspiration — comfortably wealthy citizens move up even when happy
    upgrade_target = _UPGRADE.get(citizen.zone)
    if upgrade_target is not None:
        threshold = _UPGRADE_SAVINGS_THRESHOLD.get(upgrade_target, float("inf"))
        unlocked = (
            citizen.zone_locked_until is None
            or current_date > citizen.zone_locked_until
        )
        if unlocked and citizen.savings >= _ASPIRATION_FACTOR * threshold:
            return upgrade_target

    # voluntary migration — need sustained unhappiness
    if (
        citizen.happiness >= _VOLUNTARY_HAPPINESS_THRESHOLD
        or citizen.days_unhappy < _VOLUNTARY_UNHAPPY_DAYS
    ):
        return None

    # respect zone lock for voluntary moves
    if (
        citizen.zone_locked_until is not None
        and current_date <= citizen.zone_locked_until
    ):
        return None

    # in debt → try to reduce cost by downgrading
    if citizen.savings < 0:
        return _DOWNGRADE.get(citizen.zone)  # None when already in C

    # try to upgrade if savings allow
    if upgrade_target is not None:
        threshold = _UPGRADE_SAVINGS_THRESHOLD.get(upgrade_target, float("inf"))
        if citizen.savings >= threshold:
            return upgrade_target

    return None
