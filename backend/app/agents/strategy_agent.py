from typing import Dict, Any, List

class StrategyAgent:
    """
    Recovery Strategy Generator Agent
    Synthesizes findings from Impact, Inventory, and Supplier agents into 4 actionable recovery strategies:
    1. DO_NOTHING (Wait baseline)
    2. REDISTRIBUTE (Warehouse network inventory transfer)
    3. ALT_SUPPLIER (Alternative supplier sourcing)
    4. HYBRID (Combined inventory transfer + emergency supplier batch)
    """

    @staticmethod
    def generate_strategies(
        impact_data: Dict[str, Any],
        inventory_data: Dict[str, Any],
        supplier_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        total_rev_at_risk = impact_data.get("estimated_revenue_at_risk", 15300000.0)
        total_orders = impact_data.get("orders_at_risk", 180)
        priority_orders = impact_data.get("priority_orders_at_risk", 25)
        delay_days = impact_data.get("expected_delay_days", 10)
        shortage = impact_data.get("expected_shortage", 420)

        # 1. DO NOTHING
        strategy_a = {
            "strategy_id": "DO_NOTHING",
            "strategy_name": "Do Nothing / Wait for Baseline Recovery",
            "strategy_type": "Passive / Unmitigated",
            "actions": [
                {
                    "step": 1,
                    "action_type": "HOLD",
                    "description": f"Maintain default shipping schedule and wait {delay_days} days for delayed vendor batch.",
                    "responsible_entity": "Supply Operations",
                    "estimated_time_days": delay_days,
                    "cost": 0.0
                },
                {
                    "step": 2,
                    "action_type": "CUSTOMER_COMMUNICATION",
                    "description": "Send delay notifications to all affected enterprise customers.",
                    "responsible_entity": "Customer Relations",
                    "estimated_time_days": 1,
                    "cost": 50000.0
                }
            ],
            "total_cost": 50000.0,
            "recovery_days": delay_days,
            "delayed_orders": total_orders,
            "priority_orders_delayed": priority_orders,
            "revenue_at_risk": total_rev_at_risk,
            "revenue_protected": 0.0,
            "operational_risk_score": 85.0,
            "feasibility_score": 100.0
        }

        # 2. INVENTORY REDISTRIBUTION
        transfer_cost = inventory_data.get("total_transfer_cost", 180000.0)
        transfer_days = inventory_data.get("total_recovery_days", 2)
        plans = inventory_data.get("plans", [])
        
        redist_actions = []
        for idx, p in enumerate(plans, start=1):
            redist_actions.append({
                "step": idx,
                "action_type": "TRANSFER",
                "description": f"Expedite inter-warehouse freight of {p.get('quantity', 0)} units from {p.get('source_warehouse_name', 'Hub')} to destination.",
                "responsible_entity": "Logistics Dispatch",
                "estimated_time_days": p.get("transfer_days", 2),
                "cost": p.get("transfer_cost", 100000.0)
            })

        strategy_b = {
            "strategy_id": "REDISTRIBUTE",
            "strategy_name": "Multi-Warehouse Inventory Redistribution",
            "strategy_type": "Internal Network Rebalancing",
            "actions": redist_actions if redist_actions else [
                {
                    "step": 1,
                    "action_type": "TRANSFER",
                    "description": "Execute intra-hub inventory transfer of 420 units via express logistics.",
                    "responsible_entity": "Logistics Dispatch",
                    "estimated_time_days": transfer_days,
                    "cost": transfer_cost
                }
            ],
            "total_cost": transfer_cost + 40000.0,
            "recovery_days": transfer_days,
            "delayed_orders": 12,
            "priority_orders_delayed": 0,
            "revenue_at_risk": 950000.0,
            "revenue_protected": total_rev_at_risk - 950000.0,
            "operational_risk_score": 30.0,
            "feasibility_score": 90.0
        }

        # 3. ALTERNATIVE SUPPLIER
        alt_suppliers = supplier_data.get("alternatives", [])
        top_supplier = alt_suppliers[0] if alt_suppliers else None
        supp_name = top_supplier.get("supplier_name", "Gamma India") if top_supplier else "Gamma India"
        supp_lead = top_supplier.get("lead_time_days", 5) if top_supplier else 5
        supp_cost = 450000.0

        strategy_c = {
            "strategy_id": "ALT_SUPPLIER",
            "strategy_name": f"Direct Sourcing via {supp_name}",
            "strategy_type": "External Procurement",
            "actions": [
                {
                    "step": 1,
                    "action_type": "SOURCING",
                    "description": f"Issue emergency purchase order for {shortage} units with expedited domestic dispatch from {supp_name}.",
                    "responsible_entity": "Strategic Procurement",
                    "estimated_time_days": supp_lead,
                    "cost": supp_cost
                }
            ],
            "total_cost": supp_cost,
            "recovery_days": supp_lead,
            "delayed_orders": 35,
            "priority_orders_delayed": 2,
            "revenue_at_risk": 2800000.0,
            "revenue_protected": total_rev_at_risk - 2800000.0,
            "operational_risk_score": 45.0,
            "feasibility_score": 85.0
        }

        # 4. HYBRID RECOVERY
        strategy_d = {
            "strategy_id": "HYBRID",
            "strategy_name": "Hybrid Coordinated Recovery (Transfer + Secondary Sourcing)",
            "strategy_type": "Optimized Multi-Echelon",
            "actions": [
                {
                    "step": 1,
                    "action_type": "TRANSFER",
                    "description": "Transfer 300 units immediately from Mumbai West Distribution Hub (2-day express transit).",
                    "responsible_entity": "Logistics Dispatch",
                    "estimated_time_days": 2,
                    "cost": 120000.0
                },
                {
                    "step": 2,
                    "action_type": "SOURCING",
                    "description": f"Source 120 units from {supp_name} to fulfill balance and preserve regional buffer.",
                    "responsible_entity": "Procurement & Inbound",
                    "estimated_time_days": 4,
                    "cost": 280000.0
                },
                {
                    "step": 3,
                    "action_type": "EXPEDITE",
                    "description": "Fulfill critical tier-1 priority accounts within 48 hours.",
                    "responsible_entity": "Fulfillment Operations",
                    "estimated_time_days": 2,
                    "cost": 20000.0
                }
            ],
            "total_cost": 420000.0,
            "recovery_days": 2,
            "delayed_orders": 4,
            "priority_orders_delayed": 0,
            "revenue_at_risk": 320000.0,
            "revenue_protected": total_rev_at_risk - 320000.0,
            "operational_risk_score": 20.0,
            "feasibility_score": 95.0
        }

        return [strategy_a, strategy_b, strategy_c, strategy_d]
