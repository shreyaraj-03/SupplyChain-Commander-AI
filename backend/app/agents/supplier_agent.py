from typing import Dict, Any
from backend.app.tools.mcp_tools import MCPTools

class SupplierAgent:
    """
    Alternative Supplier Sourcing Agent
    Evaluates qualified suppliers, reliability metrics, expediting fees, and lead times.
    """

    @staticmethod
    def analyze(product_id: str, required_quantity: int, max_lead_days: int = 15) -> Dict[str, Any]:
        supplier_data = MCPTools.find_alternative_suppliers(
            product_id=product_id,
            required_quantity=required_quantity,
            max_lead_days=max_lead_days
        )
        count = len(supplier_data.get("alternatives", []))
        return {
            "status": "COMPLETED",
            "agent_name": "Supplier Agent",
            "summary": f"Evaluated vendor catalog and found {count} qualified alternative suppliers.",
            "data": supplier_data
        }
