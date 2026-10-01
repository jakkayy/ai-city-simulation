import json

from app.simulation.reports import (
    BANKRUPTCIES,
    HAPPINESS_SWING,
    NARRATIVE_MAX_CHARS,
    build_report,
    narrative_prompt,
    parse_narrative,
)


def _ev(event_type, **data):
    return {"event_type": event_type, "narrative": "x", "happiness_delta": 0, "data": data}


def _report(**over):
    args = dict(
        day=12, avg_happiness=60.0, fund=10_000.0, service_quality=70.0, tax_rate=0.15,
        prev={"avg_happiness": 59.0, "city_fund": 9_500.0}, events=[], crisis=None, policies=[],
    )
    args.update(over)
    return build_report(**args)


class TestBuildReport:
    def test_headline_numbers_and_deltas(self):
        r = _report(avg_happiness=61.46, fund=10_250.4, prev={"avg_happiness": 60.0, "city_fund": 10_000.0})
        assert r["day"] == 12
        assert r["happiness"] == 61.5
        assert r["happiness_delta"] == 1.5
        assert r["fund"] == 10_250
        assert r["fund_delta"] == 250
        assert r["service"] == 70.0

    def test_first_day_has_no_deltas(self):
        r = _report(prev=None)
        assert r["happiness_delta"] is None
        assert r["fund_delta"] is None

    def test_counts_events_by_kind(self):
        events = [_ev("migration")] * 3 + [_ev("job_loss")] * 2 + [_ev("job_recovery"), _ev("migration_waitlisted"), _ev("bankruptcy")]
        c = _report(events=events)["counts"]
        assert c == {"moves": 3, "waitlist": 1, "job_loss": 2, "job_recovery": 1, "bankruptcy": 1}

    def test_keeps_city_events_with_their_numbers(self):
        r = _report(events=[_ev("city_event", kind="disaster", cost=2000)])
        assert r["city_events"] == [{"kind": "disaster", "cost": 2000}]

    def test_ignores_events_that_carry_no_data(self):
        old = {"event_type": "city_event", "narrative": "from an older backend", "happiness_delta": 0}
        assert _report(events=[old])["city_events"] == []

    def test_lists_policies_enacted_that_day(self):
        policies = [{"name": "Tax cut", "type": "tax_decrease"}]
        assert _report(policies=policies)["policies"] == policies

    def test_is_json_serialisable(self):
        r = _report(events=[_ev("city_event", kind="grant", amount=3000)], policies=[{"name": "n", "type": "housing"}], crisis="warning")
        assert json.loads(json.dumps(r)) == r


class TestHighlight:
    def test_a_quiet_day_is_not_highlighted(self):
        assert _report(events=[_ev("migration"), _ev("job_loss")])["highlight"] is False

    def test_crisis_is_highlighted(self):
        assert _report(crisis="critical")["highlight"] is True

    def test_city_event_is_highlighted(self):
        assert _report(events=[_ev("city_event", kind="boom", days=8)])["highlight"] is True

    def test_several_bankruptcies_are_highlighted(self):
        assert _report(events=[_ev("bankruptcy")] * BANKRUPTCIES)["highlight"] is True
        assert _report(events=[_ev("bankruptcy")] * (BANKRUPTCIES - 1))["highlight"] is False

    def test_big_happiness_swing_either_way_is_highlighted(self):
        assert _report(avg_happiness=60 + HAPPINESS_SWING + 0.1, prev={"avg_happiness": 60, "city_fund": 0})["highlight"] is True
        assert _report(avg_happiness=60 - HAPPINESS_SWING - 0.1, prev={"avg_happiness": 60, "city_fund": 0})["highlight"] is True
        assert _report(avg_happiness=60 + HAPPINESS_SWING - 0.5, prev={"avg_happiness": 60, "city_fund": 0})["highlight"] is False


class TestNarrative:
    def test_parses_plain_json(self):
        out = parse_narrative('{"th": "วันนี้สงบ", "en": "A calm day."}')
        assert out == {"th": "วันนี้สงบ", "en": "A calm day."}

    def test_parses_json_wrapped_in_markdown_and_chatter(self):
        raw = 'Sure!\n```json\n{"th": "ก", "en": "a"}\n```\nHope that helps'
        assert parse_narrative(raw) == {"th": "ก", "en": "a"}

    def test_rejects_unusable_replies(self):
        for raw in ["", "no json here", '{"th": "only thai"}', '{"th": "", "en": "x"}', '{"th": 1, "en": "x"}', "[1, 2]", '{"th": "a", "en": "b"']:
            assert parse_narrative(raw) is None, raw

    def test_trims_long_text(self):
        out = parse_narrative(json.dumps({"th": "ก" * 1000, "en": "a" * 1000}))
        assert len(out["th"]) == NARRATIVE_MAX_CHARS and len(out["en"]) == NARRATIVE_MAX_CHARS

    def test_prompt_contains_the_facts_and_asks_for_both_languages(self):
        msgs = narrative_prompt(_report(crisis="warning"))
        assert msgs[0]["role"] == "system" and "JSON" in msgs[0]["content"]
        facts = json.loads(msgs[1]["content"])
        assert facts["day"] == 12 and facts["crisis"] == "warning"
        assert "highlight" not in facts and "tax_rate" not in facts


class TestAttachNarrative:
    import pytest

    @pytest.mark.asyncio
    async def test_saves_and_announces_a_good_reply(self):
        from unittest.mock import AsyncMock, patch
        from app.simulation.reports import attach_narrative

        gateway = AsyncMock()
        gateway.call.return_value = '{"th": "ก", "en": "a"}'
        emit = AsyncMock()
        with patch("app.simulation.reports.save_narrative", new_callable=AsyncMock, return_value=True) as save:
            await attach_narrative(_report(), gateway, emit)
        save.assert_awaited_once_with(12, {"th": "ก", "en": "a"})
        emit.assert_awaited_once_with("report_narrative", {"day": 12, "narrative": {"th": "ก", "en": "a"}})
        assert gateway.call.call_args.kwargs["priority"] == 2

    @pytest.mark.asyncio
    async def test_stays_silent_on_an_unusable_reply(self):
        from unittest.mock import AsyncMock, patch
        from app.simulation.reports import attach_narrative

        gateway = AsyncMock()
        gateway.call.return_value = "sorry, I cannot"
        emit = AsyncMock()
        with patch("app.simulation.reports.save_narrative", new_callable=AsyncMock) as save:
            await attach_narrative(_report(), gateway, emit)
        save.assert_not_awaited()
        emit.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_never_raises_when_the_llm_fails(self):
        from unittest.mock import AsyncMock
        from app.simulation.reports import attach_narrative

        gateway = AsyncMock()
        gateway.call.side_effect = RuntimeError("rate limited")
        await attach_narrative(_report(), gateway, AsyncMock())   # must not propagate
