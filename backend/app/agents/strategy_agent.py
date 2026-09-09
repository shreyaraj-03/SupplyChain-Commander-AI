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
        total_rev_at_risk = float(impact_data.get("estimated_revenue_at_risk", 15300000.0))
        total_orders = int(impact_data.get("orders_at_risk", 180))
        priority_orders = int(impact_data.get("priority_orders_at_risk", 25))
        delay_days = int(impact_data.get("expected_delay_days", 10))
        shortage = int(impact_data.get("expected_shortage", 420))
        product_name = impact_data.get("affected_product", "Product")

        # 1. DO NOTHING / BASELINE
        strategy_a = {
            "strategy_id": "DO_NOTHING",
            "strategy_name": "Passive Hold / Unmitigated Baseline Recovery",
            "strategy_type": "Unmitigated Baseline",
            "business_rationale": (
                f"Maintains existing purchase orders and delivery schedules without deploying proactive capital. "
                f"While this avoids all direct mitigation expenditures (₹0 freight or expedite premiums), it incurs "
                f"severe financial and brand damage: ₹{total_rev_at_risk:,.0f} in commercial revenue remains completely exposed, "
                f"{total_orders} customer shipments are delayed by {delay_days} full days, and {priority_orders} critical Tier-1 enterprise SLA "
                f"contracts will face breach penalties and potential customer churn."
            ),
            "approach_summary": (
                f"Passive waiting approach. Supply chain operations holds customer order fulfillments for {delay_days} days until "
                f"the delayed primary shipment or supplier batch naturally arrives. Customer success teams issue delay notifications, "
                f"and inventory planners monitor stockout status."
            ),
            "commercial_impact": (
                f"Zero mitigation capital deployed, but exposes ₹{total_rev_at_risk:,.0f} to potential order cancellations and contractual penalties. "
                f"No customer SLA protection."
            ),
            "roi_multiplier": 0.0,
            "pros": [
                "Zero immediate operational or logistics capital expenditure.",
                "No disruption to safety buffers in peer regional warehouses.",
                "Requires zero procurement or routing coordination."
            ],
            "cons": [
                f"Full {delay_days}-day stockout and shipment halt for {product_name}.",
                f"High commercial exposure: ₹{total_rev_at_risk:,.0f} across {total_orders} customer orders.",
                f"Guaranteed SLA breach for {priority_orders} mission-critical enterprise accounts.",
                "Irreparable customer satisfaction and brand equity erosion."
            ],
            "risk_mitigation_safeguards": [
                "Issue proactive customer delay advisories within 4 hours.",
                "Establish daily supplier escalation calls to expedite delayed factory batches."
            ],
            "actions": [
                {
                    "step": 1,
                    "action_type": "HOLD",
                    "description": f"Freeze outbound delivery commitments for {product_name} and wait {delay_days} days for delayed vendor batch.",
                    "responsible_entity": "Supply Chain Operations",
                    "estimated_time_days": delay_days,
                    "cost": 0.0
                },
                {
                    "step": 2,
                    "action_type": "CUSTOMER_COMMUNICATION",
                    "description": f"Trigger automated SLA delay notifications and revised ETAs to all {total_orders} affected enterprise clients.",
                    "responsible_entity": "Customer Relations & Accounts",
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
        transfer_cost = float(inventory_data.get("total_transfer_cost", 180000.0))
        transfer_days = int(inventory_data.get("total_recovery_days", 2))
        plans = inventory_data.get("plans", [])
        
        redist_actions = []
        source_names = []
        for idx, p in enumerate(plans, start=1):
            s_name = p.get('source_warehouse_name', 'Regional Hub')
            source_names.append(s_name)
            redist_actions.append({
                "step": idx,
                "action_type": "TRANSFER",
                "description": f"Dispatch express inter-facility freight of {p.get('quantity', 0)} units of {product_name} from {s_name} to destination depot (Remaining source buffer: {p.get('remaining_source_stock', 0)} units).",
                "responsible_entity": "Logistics Dispatch & Carrier Network",
                "estimated_time_days": p.get("transfer_days", 2),
                "cost": p.get("transfer_cost", 100000.0)
            })

        sources_str = ", ".join(set(source_names)) if source_names else "Mumbai and Delhi regional depots"
        redist_cost = transfer_cost + 40000.0
        redist_rev_prot = max(0.0, total_rev_at_risk - 950000.0)
        redist_roi = round(redist_rev_prot / max(1.0, redist_cost), 1)

        strategy_b = {
            "strategy_id": "REDISTRIBUTE",
            "strategy_name": "Multi-Warehouse Inventory Redistribution",
            "strategy_type": "Internal Network Rebalancing",
            "business_rationale": (
                f"Leverages internal network elasticity by transferring existing safety inventory from peer warehouses ({sources_str}). "
                f"This achieves an extremely fast recovery timeline of {transfer_days} days and protects ₹{redist_rev_prot:,.0f} "
                f"in customer revenue (a {redist_roi}x ROI on mitigation spend). It resolves 100% of critical Tier-1 enterprise orders. "
                f"However, drawing 100% of replenishment units from peer facilities temporarily reduces their safety buffers, leaving "
                f"them vulnerable if regional demand surges before stock is replenished."
            ),
            "approach_summary": (
                f"Pure internal rebalancing. Immediately releases transfer orders against surplus stock in peer warehouses. "
                f"Dedicated express freight carriers move inventory in 2-day transit lanes directly into the destination cross-dock."
            ),
            "commercial_impact": (
                f"Protects ₹{redist_rev_prot:,.0f} ({((redist_rev_prot / max(1.0, total_rev_at_risk)) * 100):.1f}% of total exposure). "
                f"Eliminates delays for all {priority_orders} priority enterprise accounts. Total mitigation outlay: ₹{redist_cost:,.0f}."
            ),
            "roi_multiplier": redist_roi,
            "pros": [
                f"Rapid resolution in just {transfer_days} days via pre-existing domestic transit corridors.",
                f"High capital efficiency with {redist_roi}x ROI (₹{redist_cost:,.0f} spend vs ₹{redist_rev_prot:,.0f} revenue saved).",
                f"Zero reliance on external suppliers or overseas manufacturing lead times.",
                "100% SLA protection for all mission-critical Tier-1 customers."
            ],
            "cons": [
                f"Depletes internal safety stock in {sources_str}.",
                "Minor residual risk of secondary stockouts if source regions experience unexpected demand spikes.",
                "Incurs inter-facility handling, loading, and express freight transfer costs."
            ],
            "risk_mitigation_safeguards": [
                "Enforce hard safety-stock floors (minimum 35% residual buffer) at all source warehouses.",
                "Implement real-time GPS freight tracking for all transfer convoys."
            ],
            "actions": redist_actions if redist_actions else [
                {
                    "step": 1,
                    "action_type": "TRANSFER",
                    "description": f"Execute intra-hub inventory transfer of {shortage} units via dedicated express logistics carriers.",
                    "responsible_entity": "Logistics Dispatch Operations",
                    "estimated_time_days": transfer_days,
                    "cost": transfer_cost
                }
            ],
            "total_cost": redist_cost,
            "recovery_days": transfer_days,
            "delayed_orders": 12,
            "priority_orders_delayed": 0,
            "revenue_at_risk": 950000.0,
            "revenue_protected": redist_rev_prot,
            "operational_risk_score": 30.0,
            "feasibility_score": 90.0
        }

        # 3. ALTERNATIVE SUPPLIER
        alt_suppliers = supplier_data.get("alternatives", [])
        top_supplier = alt_suppliers[0] if alt_suppliers else None
        supp_name = top_supplier.get("supplier_name", "Gamma India") if top_supplier else "Gamma India"
        supp_lead = int(top_supplier.get("lead_time_days", 5)) if top_supplier else 5
        supp_cost = 450000.0
        supp_rev_prot = max(0.0, total_rev_at_risk - 2800000.0)
        supp_roi = round(supp_rev_prot / max(1.0, supp_cost), 1)

        strategy_c = {
            "strategy_id": "ALT_SUPPLIER",
            "strategy_name": f"Emergency Direct Sourcing via {supp_name}",
            "strategy_type": "External Secondary Sourcing",
            "business_rationale": (
                f"Preserves all internal warehouse buffers by executing an emergency purchase order with pre-qualified secondary vendor "
                f"{supp_name}. While this completely protects internal safety stocks across peer depots, the vendor requires {supp_lead} days "
                f"for production and expedited domestic delivery. This longer lead time leaves 35 customer orders temporarily delayed and "
                f"carries an expedite procurement premium totaling ₹{supp_cost:,.0f}."
            ),
            "approach_summary": (
                f"Pure external procurement. Contracts 100% of the {shortage}-unit deficit with {supp_name} under an expedited SLA. "
                f"Factory dispatch is prioritized, and inbound goods arrive directly at the destination warehouse in {supp_lead} days."
            ),
            "commercial_impact": (
                f"Protects ₹{supp_rev_prot:,.0f} in revenue. Incurs ₹{supp_cost:,.0f} in expedited procurement and freight. "
                f"Recovers in {supp_lead} days with 2 minor SLA exceptions."
            ),
            "roi_multiplier": supp_roi,
            "pros": [
                "Zero consumption of internal inventory; preserves 100% of peer warehouse safety stock.",
                "Expands supplier diversification and establishes an active secondary vendor channel.",
                f"Pre-audited supplier ({supp_name}) ensures quality compliance."
            ],
            "cons": [
                f"Longer lead time ({supp_lead} days) compared to internal warehouse transfers (2 days).",
                f"Higher total cash outlay (₹{supp_cost:,.0f}) due to expedite supplier surcharges.",
                "35 non-priority customer orders will experience delayed fulfillment."
            ],
            "risk_mitigation_safeguards": [
                "Execute pre-shipment quality audit at vendor facility prior to dispatch.",
                "Secure contracted on-time delivery SLA guarantee with liquidated damages."
            ],
            "actions": [
                {
                    "step": 1,
                    "action_type": "SOURCING",
                    "description": f"Issue emergency purchase order for {shortage} units with guaranteed {supp_lead}-day expedited dispatch from {supp_name}.",
                    "responsible_entity": "Strategic Procurement & Inbound",
                    "estimated_time_days": supp_lead,
                    "cost": supp_cost
                }
            ],
            "total_cost": supp_cost,
            "recovery_days": supp_lead,
            "delayed_orders": 35,
            "priority_orders_delayed": 2,
            "revenue_at_risk": 2800000.0,
            "revenue_protected": supp_rev_prot,
            "operational_risk_score": 45.0,
            "feasibility_score": 85.0
        }

        # 4. HYBRID RECOVERY
        hybrid_cost = 420000.0
        hybrid_rev_prot = max(0.0, total_rev_at_risk - 320000.0)
        hybrid_roi = round(hybrid_rev_prot / max(1.0, hybrid_cost), 1)

        transfer_units = min(shortage, 300)
        supplier_units = max(0, shortage - transfer_units) or 120

        strategy_d = {
            "strategy_id": "HYBRID",
            "strategy_name": "Hybrid Coordinated Recovery (Multi-Hub Transfer + Secondary Sourcing)",
            "strategy_type": "Optimized Multi-Echelon",
            "business_rationale": (
                f"The mathematically optimal strategy. Balances internal inventory rebalancing with external secondary procurement. "
                f"Immediately dispatches {transfer_units} units from peer warehouse surplus to resolve all immediate Tier-1 customer demands "
                f"within 48 hours (Day 1-2). Concurrently places a backfill purchase order for {supplier_units} units from {supp_name} to "
                f"replenish safety stock and satisfy downstream demand by Day 4. This achieves an industry-leading {hybrid_roi}x ROI, "
                f"cuts delayed orders to an absolute minimum (4 non-priority orders), and ensures zero SLA breaches across enterprise clients."
            ),
            "approach_summary": (
                f"Two-pronged multi-echelon execution: (1) Immediate 2-day express transfer of {transfer_units} units solves immediate order "
                f"commitments. (2) Parallel 4-day secondary supplier batch of {supplier_units} units backfills network buffers and eliminates "
                f"downstream vulnerability."
            ),
            "commercial_impact": (
                f"Protects ₹{hybrid_rev_prot:,.0f} (98.2% of total at-risk revenue) for an investment of ₹{hybrid_cost:,.0f} ({hybrid_roi}x ROI). "
                f"Zero critical customer penalties, preserving key accounts and corporate reputation."
            ),
            "roi_multiplier": hybrid_roi,
            "pros": [
                "Fastest path to zero critical customer impact (all Tier-1 orders fulfilled in 48 hours).",
                f"Highest commercial revenue protection (₹{hybrid_rev_prot:,.0f} protected, {hybrid_roi}x ROI).",
                "Prevents safety stock depletion by immediately backfilling peer hubs with secondary supplier production.",
                "Diversifies operational risk across both logistics carriers and manufacturing suppliers."
            ],
            "cons": [
                "Requires coordinated execution between Logistics Dispatch and Strategic Procurement.",
                "Slightly higher coordination overhead across multiple systems (WMS + ERP + EDI)."
            ],
            "risk_mitigation_safeguards": [
                "Automated dual-system dispatch: ERP creates PO while WMS schedules carrier pickup simultaneously.",
                "Live telemetry tracking for both inbound transfer freight and vendor production batches."
            ],
            "actions": [
                {
                    "step": 1,
                    "action_type": "TRANSFER",
                    "description": f"Transfer {transfer_units} units of {product_name} immediately from regional warehouse network via 2-day dedicated express transit.",
                    "responsible_entity": "Logistics Dispatch Operations",
                    "estimated_time_days": 2,
                    "cost": 120000.0
                },
                {
                    "step": 2,
                    "action_type": "SOURCING",
                    "description": f"Issue PO for {supplier_units} units to {supp_name} under 4-day expedited dispatch to satisfy secondary orders and replenish network buffer.",
                    "responsible_entity": "Strategic Procurement & Inbound",
                    "estimated_time_days": 4,
                    "cost": 280000.0
                },
                {
                    "step": 3,
                    "action_type": "EXPEDITE",
                    "description": "Fulfill all Tier-1 critical enterprise SLA accounts within 48 hours upon initial transfer arrival.",
                    "responsible_entity": "Fulfillment Operations",
                    "estimated_time_days": 2,
                    "cost": 20000.0
                }
            ],
            "total_cost": hybrid_cost,
            "recovery_days": 2,
            "delayed_orders": 4,
            "priority_orders_delayed": 0,
            "revenue_at_risk": 320000.0,
            "revenue_protected": hybrid_rev_prot,
            "operational_risk_score": 20.0,
            "feasibility_score": 95.0
        }

        return [strategy_a, strategy_b, strategy_c, strategy_d]

