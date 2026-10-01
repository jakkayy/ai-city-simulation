"""City Manager — analyses the city every few days and proposes one policy."""

import logging

from app.simulation.agents.parsing import parse_json_proposal
from app.simulation.agents.status import agent_status
from app.simulation.gateway import LLMGateway
from app.simulation.state import city_state

logger = logging.getLogger(__name__)

_CM_INTERVAL_DAYS = 7          # City Manager runs every 7 simulation days
_MODEL = "llama-3.3-70b-versatile"


class CityManagerAgent:
    """Proposes one policy every _CM_INTERVAL_DAYS simulation days."""

    def should_run(self, simulation_day: int) -> bool:
        if agent_status.city_manager_last_run_day < 0:
            return True
        return (simulation_day - agent_status.city_manager_last_run_day) >= _CM_INTERVAL_DAYS

    async def run(self, city_context: dict, gateway: LLMGateway) -> dict | None:
        """
        Analyse city state and return a policy proposal dict, or None.
        Dict shape: {"policy_type": str, "parameters": dict, "reasoning": str}
        """
        agent_status.city_manager_last_run_day = city_context["day"]

        if city_state.replay_mode or not gateway._keys:
            proposal = self._rule_based(city_context)
        else:
            try:
                raw = await gateway.call(
                    self._build_prompt(city_context),
                    model=_MODEL,
                    priority=1,
                )
                proposal = parse_json_proposal(raw)
            except Exception as exc:
                logger.warning("CityManager LLM failed: %s — using rule-based", exc)
                proposal = self._rule_based(city_context)

        if proposal:
            agent_status.city_manager_last_proposal = proposal
            logger.info(
                "CityManager proposal day %d: %s → %s",
                city_context["day"],
                proposal.get("policy_type"),
                proposal.get("reasoning", ""),
            )

        return proposal

    def _build_prompt(self, ctx: dict) -> list[dict]:
        system = (
            "You are the City Manager of a simulated city. "
            "Analyse the situation and recommend exactly one policy. "
            "Respond ONLY with a valid JSON object — no markdown, no prose."
        )
        user = (
            f"City Status — Day {ctx['day']}:\n"
            f"  Avg happiness   : {ctx['avg_happiness']:.1f}/100\n"
            f"  City fund       : ${ctx['city_fund']:.0f}\n"
            f"  Service quality : {ctx['service_quality']:.1f}/100\n"
            f"  Tax rate        : {ctx['tax_rate']*100:.0f}%\n"
            f"  Zone populations: A={ctx['zone_a']}, B={ctx['zone_b']}, C={ctx['zone_c']}\n"
            f"  Recent policy   : {ctx.get('recent_policy') or 'none'}\n\n"
            "Available policy types and parameters:\n"
            "  tax_increase / tax_decrease : {\"tax_rate\": 0.05–0.60}\n"
            "  service_boost / service_cut : {\"service_quality_delta\": 1–50}\n"
            "  housing                     : {\"fund_cost\": amount}\n"
            "  job_program                 : {\"fund_cost\": amount, \"unemployment_reduction\": 0.0–1.0}\n\n"
            "Return JSON:\n"
            "{\"policy_type\": \"...\", \"parameters\": {...}, \"reasoning\": \"one sentence\"}"
        )
        return [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

    def _rule_based(self, ctx: dict) -> dict | None:
        fund = ctx["city_fund"]
        happiness = ctx["avg_happiness"]
        sq = ctx["service_quality"]

        if fund < 0:
            return {
                "policy_type": "tax_increase",
                "parameters": {"tax_rate": 0.20},
                "reasoning": "City fund is depleted — increase taxes to recover.",
            }
        if happiness < 35:
            if sq < 50 and fund > 2_000:
                return {
                    "policy_type": "service_boost",
                    "parameters": {"service_quality_delta": 15},
                    "reasoning": "Happiness critical — improve services to stabilise.",
                }
            return {
                "policy_type": "tax_decrease",
                "parameters": {"tax_rate": max(0.05, city_state.tax_rate - 0.05)},
                "reasoning": "Happiness critical — reduce tax burden on citizens.",
            }
        if sq < 40 and fund > 1_500:
            return {
                "policy_type": "service_boost",
                "parameters": {"service_quality_delta": 10},
                "reasoning": "Service quality too low — invest in city services.",
            }
        return None
