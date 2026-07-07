# monitor_agent.py
import logging
from typing import List, Dict, Any

logger = logging.getLogger("app.agents.monitor_agent")

class MonitorAgent:
    """Agent that monitors code commits/updates for compliance regression (stretch feature)."""

    async def check_regression(self, project_id: int, previous_analysis: Dict[str, Any], new_files: List[str]) -> List[Dict[str, Any]]:
        """Compares previous scan data to new changes to detect new regression issues."""
        logger.info(f"Checking for compliance regressions on project {project_id} (scanned {len(new_files)} new files).")
        
        # Stub implementation. Return empty diff.
        return []

    def compare_analysis_gaps(self, previous_gaps: List[Any], current_gaps: List[Any]) -> Dict[str, List[Dict[str, Any]]]:
        """Compares two sets of gap rows and classifies regressions, fixes, and persistent gaps."""
        previous_by_req = {gap.requirement_id: gap for gap in previous_gaps}
        current_by_req = {gap.requirement_id: gap for gap in current_gaps}

        new_regressions = []
        resolved_gaps = []
        persistent_gaps = []

        for requirement_id, current_gap in current_by_req.items():
            previous_gap = previous_by_req.get(requirement_id)
            if not previous_gap:
                if current_gap.status != "compliant":
                    new_regressions.append(self._format_finding(None, current_gap))
                continue

            if previous_gap.status == "compliant" and current_gap.status != "compliant":
                new_regressions.append(self._format_finding(previous_gap, current_gap))
            elif previous_gap.status != "compliant" and current_gap.status == "compliant":
                resolved_gaps.append(self._format_finding(previous_gap, current_gap))
            elif previous_gap.status != "compliant" and current_gap.status != "compliant":
                persistent_gaps.append(self._format_finding(previous_gap, current_gap))

        return {
            "new_regressions": new_regressions,
            "resolved_gaps": resolved_gaps,
            "persistent_gaps": persistent_gaps,
        }

    def _format_finding(self, previous_gap: Any, current_gap: Any) -> Dict[str, Any]:
        requirement = current_gap.requirement
        return {
            "requirement_id": current_gap.requirement_id,
            "article_reference": requirement.article_reference,
            "title": requirement.title,
            "previous_status": previous_gap.status if previous_gap else "not_evaluated",
            "current_status": current_gap.status,
            "priority": current_gap.priority,
            "agent_name": current_gap.agent_name or "MonitorAgent",
        }

# Singleton instance
monitor_agent = MonitorAgent()
