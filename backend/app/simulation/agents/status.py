"""State of the system agents, exposed through /api/agents/status."""

from dataclasses import dataclass, field


@dataclass
class AgentStatus:
    city_manager_last_run_day: int = -1
    city_manager_last_proposal: dict = field(default_factory=dict)
    advisor_last_advice: str = ""
    advisor_last_crisis: str = ""

    def reset(self) -> None:
        """Forget everything (used when the city is reset)."""
        self.city_manager_last_run_day = -1
        self.city_manager_last_proposal = {}
        self.advisor_last_advice = ""
        self.advisor_last_crisis = ""


agent_status = AgentStatus()


agent_status = AgentStatus()
