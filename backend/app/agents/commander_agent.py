import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from backend.app.models.strategy import StrategyScoreWeights
from backend.app.tools.mcp_tools import MCPTools
from backend.app.agents.impact_agent import ImpactAgent
from backend.app.agents.inventory_agent import InventoryAgent
from backend.app.agents.supplier_agent import SupplierAgent
from backend.app.agents.strategy_agent import StrategyAgent
from backend.app.agents.explanation_agent import ExplanationAgent
from backend.app.services.strategy_scoring import DeterministicScoringEngine

class CommanderAgent:
    """
    Commander Agent (Google ADK Orchestrator)
    Central brain responsible for:
    1. Receiving disruption ID and initiating investigation
    2. Parallel task delegation to Impact, Inventory, Supplier agents
    3. Aggregating findings into Strategy Agent
    4. Deterministic scoring and ranking
    5. Generating Explainable AI rationale
    6. Emitting real-time execution audit logs
    """

    @staticmethod
    def run_investigation(
        disruption_id: str,
        scoring_weights: Optional[StrategyScoreWeights] = None
    ) -> Dict[str, Any]:
        weights = scoring_weights or StrategyScoreWeights()
        investigation_id = f"INV_{disruption_id}_{int(time.time())}"
        started_at = datetime.now(timezone.utc).isoformat()
        logs: List[Dict[str, Any]] = []

        # 1. Fetch Disruption Details
        disruption = MCPTools.get_disruption_details(disruption_id)
        if not disruption:
            return {
                "investigation_id": investigation_id,
                "disruption_id": disruption_id,
                "status": "FAILED",
                "error": f"Disruption {disruption_id} does not exist."
            }

        product_id = disruption.get("affected_product_id", "PROD_001")
        dest_warehouse = disruption.get("destination_warehouse_id", "WH_BLR")

        logs.append({
            "agent_name": "Commander Agent",
            "status": "RUNNING",
            "started_at": started_at,
            "summary": f"Initialized investigation for Disruption {disruption_id} ({disruption.get('entity_name')}). Delegating parallel tasks to domain agents."
        })

        # 2. Parallel Investigation Task Execution
        # 2a. Impact Agent
        t0 = time.time()
        impact_output = ImpactAgent.analyze(disruption_id)
        impact_data = impact_output["data"]
        logs.append({
            "agent_name": "Business Impact Agent",
            "status": "COMPLETED",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "duration_ms": int((time.time() - t0) * 1000),
            "summary": impact_output["summary"],
            "structured_output": impact_data
        })

        # 2b. Inventory Agent
        t1 = time.time()
        inventory_output = InventoryAgent.analyze(
            product_id=product_id,
            required_quantity=impact_data.get("expected_shortage", 420),
            destination_warehouse=dest_warehouse
        )
        inventory_data = inventory_output["data"]
        logs.append({
            "agent_name": "Inventory Agent",
            "status": "COMPLETED",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "duration_ms": int((time.time() - t1) * 1000),
            "summary": inventory_output["summary"],
            "structured_output": inventory_data
        })

        # 2c. Supplier Agent
        t2 = time.time()
        supplier_output = SupplierAgent.analyze(
            product_id=product_id,
            required_quantity=impact_data.get("expected_shortage", 420),
            max_lead_days=15
        )
        supplier_data = supplier_output["data"]
        logs.append({
            "agent_name": "Supplier Agent",
            "status": "COMPLETED",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "duration_ms": int((time.time() - t2) * 1000),
            "summary": supplier_output["summary"],
            "structured_output": supplier_data
        })

        # 3. Strategy Generation
        t3 = time.time()
        raw_strategies = StrategyAgent.generate_strategies(
            impact_data=impact_data,
            inventory_data=inventory_data,
            supplier_data=supplier_data
        )
        logs.append({
            "agent_name": "Strategy Agent",
            "status": "COMPLETED",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "duration_ms": int((time.time() - t3) * 1000),
            "summary": f"Generated {len(raw_strategies)} candidate recovery strategies.",
            "structured_output": raw_strategies
        })

        # 4. Deterministic Quantitative Scoring Engine
        t4 = time.time()
        scored_strategies = DeterministicScoringEngine.score_strategies(
            strategies=raw_strategies,
            weights=weights
        )
        recommended = scored_strategies[0] if scored_strategies else None
        logs.append({
            "agent_name": "Scoring Engine",
            "status": "COMPLETED",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "duration_ms": int((time.time() - t4) * 1000),
            "summary": f"Deterministic scoring ranked {recommended.get('strategy_name', 'Top Strategy')} #1 with score {recommended.get('final_score')}/100.",
            "structured_output": scored_strategies
        })

        # 5. Explanation Agent
        t5 = time.time()
        ai_explanation = ExplanationAgent.generate_explanation(
            recommended_strategy=recommended,
            all_strategies=scored_strategies,
            impact_data=impact_data
        )
        logs.append({
            "agent_name": "Explanation Agent",
            "status": "COMPLETED",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "duration_ms": int((time.time() - t5) * 1000),
            "summary": "Generated evidence-grounded executive decision rationale and execution roadmap.",
            "structured_output": ai_explanation
        })

        # 6. Finalize Commander Log
        completed_at = datetime.now(timezone.utc).isoformat()
        logs[0]["status"] = "COMPLETED"
        logs[0]["completed_at"] = completed_at
        logs[0]["summary"] = f"Investigation concluded. Recommended Strategy: {recommended.get('strategy_name')} (Score: {recommended.get('final_score')}/100)."

        return {
            "investigation_id": investigation_id,
            "disruption_id": disruption_id,
            "status": "COMPLETED",
            "started_at": started_at,
            "completed_at": completed_at,
            "disruption_snapshot": disruption,
            "impact_result": impact_data,
            "inventory_result": inventory_data,
            "supplier_result": supplier_data,
            "impact": impact_data,
            "inventory": inventory_data,
            "supplier": supplier_data,
            "strategies": scored_strategies,
            "scoring_weights": {
                "recovery_speed_weight": weights.recovery_speed_weight,
                "revenue_protection_weight": weights.revenue_protection_weight,
                "cost_efficiency_weight": weights.cost_efficiency_weight,
                "customer_impact_weight": weights.customer_impact_weight
            },
            "recommended_strategy_id": recommended.get("strategy_id") if recommended else None,
            "recommended_strategy": recommended,
            "ai_explanation": ai_explanation,
            "explanation": ai_explanation,
            "agent_logs": logs
        }
