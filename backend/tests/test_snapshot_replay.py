"""Snapshots carry the full citizen state, so a replay from a saved day is exact."""
import random
from datetime import date, timedelta

from app.simulation.loop import _apply_citizen_state, _citizen_state, build_snapshot_data, restore_city_from_data, run_day
from app.simulation.state import CityState, city_state, reset_city_state
from tests.test_long_run import START, make_city


def _state():
    return CityState(city_fund=10_000.0, service_quality=70.0, tax_rate=0.2)


def test_citizen_state_roundtrip():
    citizens = make_city(3)
    src = citizens[0]
    src.zone_locked_until = date(2026, 3, 1)
    data = _citizen_state(src)

    other = make_city(99)[0]
    _apply_citizen_state(other, data)
    assert _citizen_state(other) == data


def test_replay_from_snapshot_is_exact():
    random.seed(1)
    citizens, state = make_city(4), _state()
    for d in range(40):
        run_day(citizens, state, START + timedelta(days=d))

    # "snapshot" after day 39
    saved = build_snapshot_data(citizens)["citizens"]
    fund, service = state.city_fund, state.service_quality

    def run_from_snapshot():
        cs = make_city(4)
        for c in cs:
            _apply_citizen_state(c, saved[str(c.id)])
        st = _state()
        st.city_fund, st.service_quality = fund, service
        out = []
        for d in range(40, 70):
            random.seed(d)          # the loop seeds replay days the same way
            run_day(cs, st, START + timedelta(days=d))
            out.append((round(st.city_fund, 4), [round(c.happiness, 6) for c in cs]))
        return out

    assert run_from_snapshot() == run_from_snapshot()


def test_snapshot_data_holds_city_settings():
    citizens = make_city(2)
    city_state.tax_rate, city_state.recent_policy = 0.33, "tax_increase"
    city_state.income_modifier, city_state.modifier_days = 0.8, 4
    data = build_snapshot_data(citizens)
    assert len(data["citizens"]) == 50

    reset_city_state()
    assert city_state.tax_rate == 0.15
    restore_city_from_data(data)
    assert (city_state.tax_rate, city_state.recent_policy) == (0.33, "tax_increase")
    assert (city_state.income_modifier, city_state.modifier_days) == (0.8, 4)
    reset_city_state()


def test_restore_ignores_old_snapshots_without_data():
    reset_city_state()
    restore_city_from_data({})
    assert city_state.tax_rate == 0.15


def test_reset_keeps_tick_interval():
    city_state.tick_interval_seconds = 3
    city_state.is_running = True
    reset_city_state()
    assert city_state.tick_interval_seconds == 3
    assert city_state.is_running is False
    city_state.tick_interval_seconds = 10
