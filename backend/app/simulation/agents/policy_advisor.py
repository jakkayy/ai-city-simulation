"""Policy Advisor — gives strategic advice when the city is in crisis."""

import logging

from app.simulation.agents.status import agent_status
from app.simulation.gateway import LLMGateway
from app.simulation.state import city_state

logger = logging.getLogger(__name__)

_MODEL = "llama-3.3-70b-versatile"


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
