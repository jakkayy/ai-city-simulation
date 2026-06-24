import pytest
from app.simulation.citizen_ai import escape_xml, safe_parse_batch
from app.simulation.fallback import get_reaction, REACTION_MATRIX
from app.models.citizen import Personality


class TestEscapeXml:
    def test_escapes_lt_gt(self):
        assert escape_xml("<script>") == "&lt;script&gt;"

    def test_escapes_ampersand(self):
        assert escape_xml("A & B") == "A &amp; B"

    def test_escapes_quote(self):
        assert escape_xml('"hi"') == "&quot;hi&quot;"

    def test_safe_string_unchanged(self):
        assert escape_xml("Hello world") == "Hello world"


class TestSafeParseBatch:
    def test_valid_json(self):
        raw = '[{"index":0,"reaction":"fine","happiness_delta":2,"memory_update":"ok"}]'
        result = safe_parse_batch(raw, 1)
        assert len(result) == 1
        assert result[0]["happiness_delta"] == 2

    def test_clamps_delta(self):
        raw = '[{"index":0,"reaction":"x","happiness_delta":99,"memory_update":""}]'
        result = safe_parse_batch(raw, 1)
        assert result[0]["happiness_delta"] == 10

    def test_clamps_negative_delta(self):
        raw = '[{"index":0,"reaction":"x","happiness_delta":-99,"memory_update":""}]'
        result = safe_parse_batch(raw, 1)
        assert result[0]["happiness_delta"] == -10

    def test_strips_markdown_fences(self):
        raw = '```json\n[{"index":0,"reaction":"ok","happiness_delta":1,"memory_update":""}]\n```'
        result = safe_parse_batch(raw, 1)
        assert result[0]["happiness_delta"] == 1

    def test_falls_back_on_invalid_json(self):
        result = safe_parse_batch("not json at all !!!", 3)
        assert len(result) == 3
        assert all(r["happiness_delta"] == 0 for r in result)

    def test_extracts_embedded_array(self):
        raw = 'Sure! Here is the result: [{"index":0,"reaction":"ok","happiness_delta":3,"memory_update":""}]'
        result = safe_parse_batch(raw, 1)
        assert result[0]["happiness_delta"] == 3

    def test_pads_short_response(self):
        raw = '[{"index":0,"reaction":"ok","happiness_delta":1,"memory_update":""}]'
        result = safe_parse_batch(raw, 3)
        assert len(result) == 3
        assert result[1]["happiness_delta"] == 0


class TestFallback:
    def _citizen(self, personality):
        from unittest.mock import MagicMock
        c = MagicMock()
        c.personality = personality
        c.happiness = 50.0
        c.last_action = "stayed"
        return c

    def test_tax_increase_pessimist(self):
        c = self._citizen(Personality.pessimistic)
        result = get_reaction(c, "tax_increase")
        assert result["happiness_delta"] == REACTION_MATRIX[(Personality.pessimistic, "tax_increase")]

    def test_unknown_policy_returns_zero(self):
        c = self._citizen(Personality.rational)
        result = get_reaction(c, "unknown_policy_xyz")
        assert result["happiness_delta"] == 0

    def test_positive_policy_optimist(self):
        c = self._citizen(Personality.optimistic)
        result = get_reaction(c, "job_program")
        assert result["happiness_delta"] > 0
