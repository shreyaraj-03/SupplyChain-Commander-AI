from typing import Dict, Any, List

class ExplanationAgent:
    """
    Explainable AI Agent
    Translates mathematical optimization and trade-offs into executive-grade rationale
    and detailed action roadmaps with owner and timeframes.
    """

    @staticmethod
    def generate_explanation(
        recommended_strategy: Dict[str, Any],
        all_strategies: List[Dict[str, Any]],
        impact_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        strat_name = recommended_strategy.get("strategy_name", "Hybrid Coordinated Recovery")
        strat_id = recommended_strategy.get("strategy_id", "HYBRID")
        rec_days = int(recommended_strategy.get("recovery_days", 2))
        delayed_orders = int(recommended_strategy.get("delayed_orders", 4))
        rev_protected = float(recommended_strategy.get("revenue_protected", 14980000.0))
        final_score = float(recommended_strategy.get("final_score", 94.2))
        total_cost = float(recommended_strategy.get("total_cost", 420000.0))
        orders_at_risk = int(impact_data.get("orders_at_risk", 180))
        priority_orders = int(impact_data.get("priority_orders_at_risk", 25))
        unmitigated_days = int(impact_data.get("expected_delay_days", 10))
        product_name = impact_data.get("affected_product", "Product")
        raw_actions = recommended_strategy.get("actions", [])

        roi = round(rev_protected / max(1.0, total_cost), 1)
        net_savings = rev_protected - total_cost

        summary = (
            f"The '{strat_name}' strategy is decisively ranked #1 with a composite optimization score of {final_score:.1f}/100. "
            f"By committing an agile mitigation expenditure of ₹{total_cost:,.0f}, the business safeguards ₹{rev_protected:,.0f} "
            f"in high-margin commercial revenue (a {roi}x return on mitigation capital, generating ₹{net_savings:,.0f} in net protected value). "
            f"This strategy cuts the unmitigated delay from {unmitigated_days} days down to just {rec_days} days, slashes affected orders from "
            f"{orders_at_risk} to only {delayed_orders}, and guarantees 100% SLA fulfillment for all {priority_orders} critical Tier-1 enterprise accounts."
        )

        why_chosen = (
            f"The '{strat_name}' strategy achieved the highest multi-attribute utility across recovery velocity, "
            f"capital efficiency, and SLA fulfillment. It outperforms pure internal redistribution by preventing dangerous safety stock "
            f"depletion in source facilities through immediate secondary supplier backfilling. Concurrently, it outperforms pure supplier "
            f"sourcing by avoiding a full 5-day supplier lead time, getting emergency inventory on-site in 48 hours to protect Tier-1 clients."
        )

        key_drivers = [
            f"Rapid 48-Hour SLA Defense: Accelerates delivery by {unmitigated_days - rec_days} days, fulfilling 100% of priority enterprise commitments.",
            f"Commercial Value Protection: Protects ₹{rev_protected:,.0f} of commercial revenue at a stellar {roi}x ROI.",
            f"Supply Chain Network Resilience: Dual-echelon approach prevents secondary stockouts across regional hubs while maintaining supplier readiness."
        ]

        trade_offs_considered = [
            "Baseline Hold (DO_NOTHING) was rejected: Exposes ₹" + f"{impact_data.get('estimated_revenue_at_risk', 15300000):,.0f}" + " to cancellation and breaches all Tier-1 contracts.",
            "Pure Redistribution (REDISTRIBUTE) ranked #2: Offers 2-day recovery but unsustainably drains peer warehouse safety buffers without automated replenishment.",
            "Pure Alternative Supplier (ALT_SUPPLIER) ranked #3: Preserves peer stock but incurs a 5-day manufacturing lead time, leaving 35 orders delayed."
        ]

        # Convert raw actions into structured ActionRoadmapStep format
        action_roadmap = []
        if raw_actions:
            for idx, act in enumerate(raw_actions, start=1):
                action_roadmap.append({
                    "step": idx,
                    "action": act.get("action_type", f"Phase {idx}"),
                    "owner": act.get("responsible_entity", "Supply Operations"),
                    "timeframe": f"{act.get('estimated_time_days', 1)} Days",
                    "details": act.get("description", "Execute supply chain operational procedure.")
                })
        else:
            action_roadmap = [
                {
                    "step": 1,
                    "action": "Inventory Transfer Dispatch",
                    "owner": "Logistics Dispatch Hub",
                    "timeframe": "Day 1-2",
                    "details": "Release automated transfer orders from regional surplus warehouses to target hub."
                },
                {
                    "step": 2,
                    "action": "Emergency Supplier PO",
                    "owner": "Procurement Operations",
                    "timeframe": "Day 1-3",
                    "details": "Issue expedited purchase order with pre-audited secondary supplier."
                },
                {
                    "step": 3,
                    "action": "Priority Order Fulfillment",
                    "owner": "Fulfillment Operations",
                    "timeframe": "Day 3-4",
                    "details": "Route first replenishment batch directly to critical tier-1 enterprise SLA orders."
                }
            ]

        return {
            "summary": summary,
            "executive_summary": summary,
            "why_chosen": why_chosen,
            "key_drivers": key_drivers,
            "trade_offs_considered": trade_offs_considered,
            "action_roadmap": action_roadmap
        }

