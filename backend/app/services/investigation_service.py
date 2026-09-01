from typing import Dict, Any, Optional
from backend.app.agents.commander_agent import CommanderAgent
from backend.app.models.strategy import StrategyScoreWeights
from backend.app.tools.mcp_tools import MCPTools

# In-memory store for investigation history (synced with Firestore in production)
_investigations_db: Dict[str, Dict[str, Any]] = {}

def get_all_disruptions():
    dataset = MCPTools._load_dataset if hasattr(MCPTools, "_load_dataset") else None
    from backend.data.generate_synthetic_data import generate_datasets
    data = generate_datasets()
    return data.get("disruptions", [])

def get_disruption_by_id(disruption_id: str):
    return MCPTools.get_disruption_details(disruption_id)

def create_investigation(disruption_id: str, weights_dict: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    weights = StrategyScoreWeights(
        recovery_speed_weight=weights_dict.get("recovery_speed_weight", 0.30) if weights_dict else 0.30,
        revenue_protection_weight=weights_dict.get("revenue_protection_weight", 0.25) if weights_dict else 0.25,
        cost_efficiency_weight=weights_dict.get("cost_efficiency_weight", 0.25) if weights_dict else 0.25,
        customer_impact_weight=weights_dict.get("customer_impact_weight", 0.20) if weights_dict else 0.20
    )
    result = CommanderAgent.run_investigation(disruption_id, weights)
    inv_id = result["investigation_id"]
    _investigations_db[inv_id] = result
    return result

def get_investigation_by_id(investigation_id: str):
    return _investigations_db.get(investigation_id)
