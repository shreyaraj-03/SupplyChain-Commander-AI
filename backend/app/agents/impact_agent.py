from typing import Dict, Any
from backend.app.tools.mcp_tools import MCPTools

class ImpactAgent:
    """
    Business Impact Agent
    Calculates downstream revenue at risk, affected customer orders, priority SLAs, and shortage duration.
    """
    
    @staticmethod
    def analyze(disruption_id: str) -> Dict[str, Any]:
        impact_data = MCPTools.calculate_business_impact(disruption_id)
        return {
            "status": "COMPLETED",
            "agent_name": "Business Impact Agent",
            "summary": f"Calculated ₹{impact_data.get('estimated_revenue_at_risk', 0):,.0f} revenue at risk with {impact_data.get('orders_at_risk', 0)} orders affected.",
            "data": impact_data
        }
