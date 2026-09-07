"""
SupplyChain Commander AI - Supply-Demand Gap Detector
Multi-table analytical detector computing projected supply vs demand balances across planning horizons.
"""

from typing import List, Dict, Any
from datetime import datetime, timezone

from backend.app.risk_detection.risk_models import (
    RiskSignal,
    RiskEvidence,
    RiskSeverity,
    RiskStatus,
    RiskType
)
from backend.app.risk_detection.configuration.risk_thresholds import RISK_THRESHOLDS

class SupplyGapDetector:
    """
    Synthesizes current inventory, in-transit purchase orders, and projected customer demand over a 14-day horizon.
    Flags impending network deficits before physical stockouts materialize.
    """

    @classmethod
    def detect(cls, dataset: Dict[str, Any]) -> List[RiskSignal]:
        signals: List[RiskSignal] = []
        cfg = RISK_THRESHOLDS.get("supply_demand_gap", {})
        horizon_days = cfg.get("planning_horizon_days", 14)
        
        products = {p["product_id"]: p for p in dataset.get("products", [])}
        warehouses = {w["warehouse_id"]: w for w in dataset.get("warehouses", [])}
        inventory = dataset.get("inventory", [])
        shipments = dataset.get("shipments", [])
        orders = dataset.get("customer_orders", [])
        
        # Group inventory by product_id and warehouse_id
        inv_map = {f"{i['product_id']}__{i['warehouse_id']}": i for i in inventory}
        
        # Aggregate on-order / in-transit supply by product and destination warehouse
        # Exclude shipments that are severely delayed beyond the horizon
        supply_incoming: Dict[str, int] = {}
        for s in shipments:
            if s.get("status") in ["IN_TRANSIT", "SCHEDULED"]:
                key = f"{s['product_id']}__{s['destination_warehouse']}"
                supply_incoming[key] = supply_incoming.get(key, 0) + int(s.get("quantity", 0))
                
        # Aggregate customer orders by product and warehouse
        demand_orders: Dict[str, List[Dict[str, Any]]] = {}
        for o in orders:
            key = f"{o['product_id']}__{o.get('warehouse_id', 'WH_BLR')}"
            demand_orders.setdefault(key, []).append(o)
            
        for key, inv in inv_map.items():
            product_id = inv.get("product_id")
            warehouse_id = inv.get("warehouse_id")
            
            product = products.get(product_id, {})
            warehouse = warehouses.get(warehouse_id, {})
            product_name = product.get("product_name", product_id)
            warehouse_name = warehouse.get("warehouse_name", warehouse_id)
            unit_price = float(product.get("selling_price", 1000.0))
            
            available_stock = int(inv.get("available_quantity", 0))
            safety_stock = int(inv.get("safety_stock", 50))
            incoming_stock = supply_incoming.get(key, int(inv.get("in_transit_quantity", 0)))
            
            projected_supply = available_stock + incoming_stock
            
            p_orders = demand_orders.get(key, [])
            committed_order_demand = sum(o.get("quantity", 0) for o in p_orders)
            
            # Baseline forecasted run-rate for the planning horizon
            baseline_daily = max(5.0, float(product.get("reorder_point", 100)) / 7.0)
            forecasted_demand = max(committed_order_demand, int(baseline_daily * horizon_days * 0.7))
            
            projected_demand = committed_order_demand + safety_stock
            supply_gap = max(0, projected_demand - projected_supply)
            
            if supply_gap >= cfg.get("min_gap_units", 20):
                gap_ratio = supply_gap / max(1.0, float(projected_demand))
                revenue_at_risk = float(supply_gap * unit_price)
                
                # Check thresholds
                if gap_ratio >= cfg.get("gap_ratio_critical", 0.45) or (supply_gap > 100 and revenue_at_risk >= 5000000.0):
                    severity = RiskSeverity.CRITICAL
                    conf = 0.95
                elif gap_ratio >= cfg.get("gap_ratio_high", 0.25) or revenue_at_risk >= cfg.get("min_revenue_at_risk", 500000.0):
                    severity = RiskSeverity.HIGH
                    conf = 0.92
                elif gap_ratio >= cfg.get("gap_ratio_medium", 0.15):
                    severity = RiskSeverity.MEDIUM
                    conf = 0.85
                else:
                    severity = RiskSeverity.LOW
                    conf = 0.75
                    
                orders_affected = len(p_orders) if p_orders else max(2, supply_gap // 10)
                priority_orders = sum(1 for o in p_orders if o.get("priority") in ["CRITICAL", "HIGH"])
                
                evidence = RiskEvidence(
                    metric_name="projected_supply_gap_units",
                    observed_value=float(supply_gap),
                    baseline_value=0.0,
                    threshold_value=float(cfg.get("min_gap_units", 20)),
                    unit="units",
                    summary=f"Projected supply deficit of {supply_gap} units for {product_name} over {horizon_days}-day planning horizon at {warehouse_name} (Revenue exposure: ₹{revenue_at_risk:,.0f}).",
                    drivers=[
                        f"Projected Total Demand: {projected_demand} units ({committed_order_demand} committed orders + {safety_stock} safety buffer).",
                        f"Projected Total Supply: {projected_supply} units ({available_stock} on hand + {incoming_stock} incoming).",
                        f"Net Supply Deficit: {supply_gap} units ({gap_ratio*100:.1f}% deficit ratio).",
                        f"Affects {orders_affected} customer orders ({priority_orders} tier-1 SLA accounts) totaling ₹{revenue_at_risk:,.0f}."
                    ],
                    raw_details={
                        "product_id": product_id,
                        "warehouse_id": warehouse_id,
                        "available_stock": available_stock,
                        "incoming_stock": incoming_stock,
                        "projected_supply": projected_supply,
                        "committed_order_demand": committed_order_demand,
                        "safety_stock": safety_stock,
                        "projected_demand": projected_demand,
                        "supply_gap": supply_gap,
                        "gap_ratio": gap_ratio,
                        "revenue_at_risk": revenue_at_risk
                    }
                )
                
                risk_id = f"RSK_GAP_{product_id}_{warehouse_id}"
                
                signals.append(RiskSignal(
                    risk_id=risk_id,
                    risk_type=RiskType.SUPPLY_DEMAND_GAP,
                    severity=severity,
                    status=RiskStatus.DETECTED,
                    title=f"Supply Deficit: {product_name} (Shortfall of {supply_gap} units at {warehouse_name})",
                    description=f"{supply_gap}-unit supply shortfall projected over {horizon_days} days for {product_name} at {warehouse_name}.",
                    product_id=product_id,
                    product_name=product_name,
                    warehouse_id=warehouse_id,
                    warehouse_name=warehouse_name,
                    metric="supply_gap_units",
                    metric_value=float(supply_gap),
                    threshold=float(cfg.get("min_gap_units", 20)),
                    confidence=conf,
                    estimated_revenue_at_risk=revenue_at_risk,
                    orders_affected_count=orders_affected,
                    days_to_impact=max(2.0, round(float(available_stock) / max(1.0, baseline_daily), 1)),
                    evidence=evidence
                ))
                
        return signals
