import pytest
from app.simulation.policy_engine import sanitize_policy, predict_effects, PolicyValidationError
from app.simulation.constants import TAX_CAP


class TestSanitizePolicy:
    def test_valid_tax_increase(self):
        result = sanitize_policy("tax_increase", {"tax_rate": 0.20})
        assert result["tax_rate"] == pytest.approx(0.20)

    def test_tax_rate_capped_at_max(self):
        result = sanitize_policy("tax_increase", {"tax_rate": 0.99})
        assert result["tax_rate"] == pytest.approx(TAX_CAP)

    def test_negative_tax_rate_raises(self):
        with pytest.raises(PolicyValidationError, match="negative"):
            sanitize_policy("tax_decrease", {"tax_rate": -0.1})

    def test_invalid_policy_type_raises(self):
        with pytest.raises(PolicyValidationError, match="Unknown policy type"):
            sanitize_policy("nuke_city", {})

    def test_unknown_parameter_raises(self):
        with pytest.raises(PolicyValidationError, match="not allowed"):
            sanitize_policy("tax_increase", {"tax_rate": 0.2, "bribe": 9999})

    def test_non_numeric_parameter_raises(self):
        with pytest.raises(PolicyValidationError, match="numeric"):
            sanitize_policy("tax_increase", {"tax_rate": "high"})

    def test_service_delta_clamped_positive(self):
        result = sanitize_policy("service_boost", {"service_quality_delta": 999})
        assert result["service_quality_delta"] == 50.0

    def test_service_delta_clamped_negative(self):
        result = sanitize_policy("service_cut", {"service_quality_delta": -999})
        assert result["service_quality_delta"] == -50.0

    def test_negative_fund_cost_raises(self):
        with pytest.raises(PolicyValidationError, match="negative"):
            sanitize_policy("housing", {"fund_cost": -100})

    def test_empty_parameters_valid(self):
        result = sanitize_policy("housing", {})
        assert result == {}


class TestPredictEffects:
    def test_tax_increase_negative_happiness(self):
        effects = predict_effects("tax_increase", {"tax_rate": 0.30})
        assert effects["happiness_impact"] == "negative"

    def test_tax_decrease_positive_happiness(self):
        effects = predict_effects("tax_decrease", {"tax_rate": 0.05})
        assert effects["happiness_impact"] == "positive"

    def test_service_boost_positive(self):
        effects = predict_effects("service_boost", {"service_quality_delta": 10})
        assert effects["service_quality_change"] == 10
        assert effects["happiness_impact"] == "positive"

    def test_housing_has_fund_cost(self):
        effects = predict_effects("housing", {"fund_cost": 500})
        assert effects["city_fund_cost"] == -500

    def test_job_program_has_reduction(self):
        effects = predict_effects("job_program", {"fund_cost": 300, "unemployment_reduction": 0.2})
        assert effects["unemployment_reduction"] == 0.2
