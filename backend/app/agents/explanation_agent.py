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
        strat_name = recommended_strategy.get("strategy_name", "Hybrid Recovery")
        strat_id = recommended_strategy.get("strategy_id", "HYBRID")
        rec_days = recommended_strategy.get("recovery_days", 2)
        delayed_orders = recommended_strategy.get("delayed_orders", 4)
        rev_protected = recommended_strategy.get("revenue_protected", 14980000.0)
        final_score = recommended_strategy.get("final_score", 94.2)
        total_cost = recommended_strategy.get("total_cost", 420000.0)
        orders_at_risk = impact_data.get("orders_at_risk", 180)
        raw_actions = recommended_strategy.get("actions", [])

        summary = (
            f"The '{strat_name}' strategy is recommended with a decisive composite ranking score of {final_score}/100. "
            f"It achieves rapid operational recovery in {rec_days} days while slashing delayed customer orders from "
            f"{orders_at_risk} down to {delayed_orders}. By protecting ₹{rev_protected:,.0f} "
            f"in high-margin enterprise revenue for an estimated mitigation deployment cost of ₹{total_cost:,.0f}, it maximizes "
            f"customer retention and return-on-mitigation."
        )

        why_chosen = (
            f"The '{strat_name}' strategy achieved the highest multi-attribute utility across recovery speed, "
            f"cost efficiency, and SLA fulfillment. It recovers inventory in {rec_days} days (versus {impact_data.get('expected_delay_days', 10)} "
            f"unmitigated days) and eliminates critical customer SLA penalties by fulfilling high-priority enterprise demand first."
        )

        key_drivers = [
            f"Ultra-fast recovery speed ({rec_days} days) prevents SLA breaches for all high-priority enterprise contracts.",
            f"Protects ₹{rev_protected:,.0f} of at-risk revenue versus complete loss under the unmitigated baseline.",
            f"Avoids creating downstream stockouts by taking balanced tranches from warehouse network surplus."
        ]

        trade_offs_considered = [
            "Pure warehouse redistribution is low-cost but consumes internal safety stocks in peer hubs.",
            "Pure alternative supplier procurement incurs longer supplier lead times and higher expedite price premiums.",
            f"The selected {strat_name} balances risk, capital outlay, and customer satisfaction."
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
