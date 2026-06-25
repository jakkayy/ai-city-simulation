"""
System agents — City Manager and Policy Advisor.

City Manager   : analyses city every N days → proposes/auto-enacts a policy.
Policy Advisor : activated on crisis → provides strategic narrative advice.

Both use priority-1 LLM calls so citizen batches never block them.
Rule-based fallback is used when LLM is unavailable or in replay mode.
"""

import json
import logging
import re
from dataclasses import dataclass, field

from app.simulation.gateway import LLMGateway
from app.simulation.state import city_state
from app.simulation.policy_engine import VALID_POLICY_TYPES

logger = logging.getLogger(__name__)

_CM_INTERVAL_DAYS = 7          # City Manager runs every 7 simulation days
_MODEL = "llama-3.3-70b-versatile"


# ── shared state exposed via /api/agents/status ───────────────────────────

@dataclass
class AgentStatus:
    city_manager_last_run_day: int = -1
    city_manager_last_proposal: dict = field(default_factory=dict)
    advisor_last_advice: str = ""
    advisor_last_crisis: str = ""


agent_status = AgentStatus()


# ── City Manager ──────────────────────────────────────────────────────────

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
                proposal = _parse_json_proposal(raw)
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


# ── Policy Advisor ────────────────────────────────────────────────────────

class PolicyAdvisorAgent:
    """Provides strategic narrative advice when a crisis is detected."""

    async def advise(
        self,
        crisis_level: str,
        city_context: dict,
        gateway: LLMGateway,
    ) -> str:
        if city_state.replay_mode or not gateway._keys:
            advice = self._rule_based(crisis_level, city_context)
        else:
            try:
                raw = await gateway.call(
                    self._build_prompt(crisis_level, city_context),
                    model=_MODEL,
                    priority=1,
                )
                advice = raw.strip()
            except Exception as exc:
                logger.warning("PolicyAdvisor LLM failed: %s — using rule-based", exc)
                advice = self._rule_based(crisis_level, city_context)

        agent_status.advisor_last_advice = advice
        agent_status.advisor_last_crisis = crisis_level
        logger.info("PolicyAdvisor [%s]: %s", crisis_level, advice[:80])
        return advice

    def _build_prompt(self, crisis_level: str, ctx: dict) -> list[dict]:
        system = (
            "You are the Policy Advisor for a simulated city. "
            "Provide concise, actionable strategic advice in 2–3 sentences."
        )
        user = (
            f"Crisis Level: {crisis_level.upper()}\n"
            f"Avg happiness   : {ctx['avg_happiness']:.1f}/100\n"
            f"City fund       : ${ctx['city_fund']:.0f}\n"
            f"Service quality : {ctx['service_quality']:.1f}/100\n"
            f"Tax rate        : {ctx['tax_rate']*100:.0f}%\n\n"
            "What should the City Manager do immediately?"
        )
        return [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

    def _rule_based(self, crisis_level: str, ctx: dict) -> str:
        if crisis_level == "collapse":
            return (
                "The city is on the verge of collapse — immediate action required. "
                "Cut taxes to the minimum, launch a job program, and boost services "
                "to prevent total breakdown of social order."
            )
        if crisis_level == "critical":
            return (
                "Citizen satisfaction is critically low. "
                "Reduce the tax burden and improve service quality to restore stability. "
                "Consider a housing subsidy for Zone C residents."
            )
        return (
            "Happiness levels are concerning. "
            "Monitor closely and consider moderate tax relief or service improvements "
            "before the situation deteriorates further."
        )


# ── singletons ────────────────────────────────────────────────────────────

city_manager = CityManagerAgent()
policy_advisor = PolicyAdvisorAgent()


# ── helpers ───────────────────────────────────────────────────────────────

def _parse_json_proposal(raw: str) -> dict | None:
    cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            return None
        try:
            data = json.loads(match.group())
        except json.JSONDecodeError:
            return None

    if not isinstance(data, dict):
        return None
    policy_type = data.get("policy_type", "")
    if policy_type not in VALID_POLICY_TYPES:
        return None
    return {
        "policy_type": policy_type,
        "parameters": data.get("parameters", {}),
        "reasoning": str(data.get("reasoning", ""))[:200],
    }
