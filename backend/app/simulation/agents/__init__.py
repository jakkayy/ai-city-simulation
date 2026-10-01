"""
System agents — City Manager and Policy Advisor.

City Manager   : analyses city every N days → proposes a policy.
Policy Advisor : activated on crisis → provides strategic narrative advice.

Both use priority-1 LLM calls so citizen batches never block them.
Rule-based fallback is used when LLM is unavailable or in replay mode.
"""

from app.simulation.agents.city_manager import CityManagerAgent
from app.simulation.agents.parsing import parse_json_proposal
from app.simulation.agents.policy_advisor import PolicyAdvisorAgent
from app.simulation.agents.status import AgentStatus, agent_status

# singletons used by the tick loop
city_manager = CityManagerAgent()
policy_advisor = PolicyAdvisorAgent()

__all__ = [
    "AgentStatus",
    "CityManagerAgent",
    "PolicyAdvisorAgent",
    "agent_status",
    "city_manager",
    "parse_json_proposal",
    "policy_advisor",
]
