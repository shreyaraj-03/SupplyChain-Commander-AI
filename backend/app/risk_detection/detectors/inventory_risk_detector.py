"""
SupplyChain Commander AI - Inventory Depletion Risk Detector
Deterministic detector calculating Days of Supply and stockout trajectories across fulfillment nodes.
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

class InventoryRiskDetector:
    """
    Computes Days of Supply = Available Inventory / Average Daily Demand.
    Detects critical depletion below safety stock buffers before complete stockouts occur.
    """

    @classmethod
    def detect(cls, dataset: Dict[str, Any]) -> List[RiskSignal]:
        signals: List[RiskSignal] = []
        cfg = RISK_THRESHOLDS.get("inventory_depletion", {})
        
        products = {p["product_id"]: p for p in dataset.get("products", [])}
        warehouses = {w["warehouse_id"]: w for w in dataset.get("warehouses", [])}
        inventory = dataset.get("inventory", [])
        orders = dataset.get("customer_orders", [])
        
        # Calculate daily demand per product/warehouse from orders
        demand_map: Dict[str, float] = {}
        order_count_map: Dict[str, int] = {}
        order_value_map: Dict[str, float] = {}
        
        for o in orders:
            key = f"{o['product_id']}__{o.get('warehouse_id', 'WH_BLR')}"
            demand_map[key] = demand_map.get(key, 0.0) + o.get("quantity", 0)
            order_count_map[key] = order_count_map.get(key, 0) + 1
            order_value_map[key] = order_value_map.get(key, 0.0) + o.get("order_value", 0.0)
            
        for inv in inventory:
            product_id = inv.get("product_id")
            warehouse_id = inv.get("warehouse_id")
            key = f"{product_id}__{warehouse_id}"
            
            product = products.get(product_id, {})
            warehouse = warehouses.get(warehouse_id, {})
            product_name = product.get("product_name", product_id)
            warehouse_name = warehouse.get("warehouse_name", warehouse_id)
            
            available = float(inv.get("available_quantity", 0))
            reserved = float(inv.get("reserved_quantity", 0))
            safety_stock = float(inv.get("safety_stock", 50))
            in_transit = float(inv.get("in_transit_quantity", 0))
            
            # Net effective inventory (accounting for reserved demand)
            net_available = max(0.0, available - (reserved * 0.5))
            
            # Calculate daily demand
            orders_total = demand_map.get(key, 0.0)
            daily_demand = max(5.0, orders_total / 7.0 if orders_total > 0 else product.get("reorder_point", 100) / 10.0)
            
            days_of_supply = round(net_available / daily_demand, 1) if daily_demand > 0 else 99.0
            
            # Check thresholds
            crit_thresh = cfg.get("critical_days_of_supply", 2.0)
            high_thresh = cfg.get("high_days_of_supply", 5.0)
            med_thresh = cfg.get("medium_days_of_supply", 8.0)
            
            if days_of_supply < med_thresh or available < safety_stock:
                if days_of_supply <= crit_thresh:
                    severity = RiskSeverity.CRITICAL
                    conf = 0.96
                elif days_of_supply <= high_thresh:
                    severity = RiskSeverity.HIGH
                    conf = 0.92
                else:
                    severity = RiskSeverity.MEDIUM
                    conf = 0.84
                    
                total_val = order_value_map.get(key, available * product.get("selling_price", 1000.0))
                orders_count = order_count_map.get(key, max(1, int(reserved / max(1, daily_demand))))
                
                evidence = RiskEvidence(
                    metric_name="days_of_supply",
                    observed_value=days_of_supply,
                    baseline_value=med_thresh,
                    threshold_value=high_thresh,
                    unit="days",
                    summary=f"{product_name} at {warehouse_name} has only {days_of_supply} days of supply remaining ({available:.0f} available units vs {daily_demand:.1f} units/day burn rate).",
                    drivers=[
                        f"Current available inventory: {available:.0f} units (Safety buffer: {safety_stock:.0f} units).",
                        f"Reserved demand: {reserved:.0f} units with burn rate of {daily_demand:.1f} units/day.",
                        f"Projected stockout in approximately {days_of_supply} days if replenishment is not expedited.",
                        f"Incoming in-transit supply: {in_transit:.0f} units."
                    ],
                    raw_details={
                        "available_quantity": available,
                        "reserved_quantity": reserved,
                        "safety_stock": safety_stock,
                        "in_transit_quantity": in_transit,
                        "daily_demand": daily_demand,
                        "days_of_supply": days_of_supply
                    }
                )
                
                risk_id = f"RSK_INVENTORY_{product_id}_{warehouse_id}"
                
                signals.append(RiskSignal(
                    risk_id=risk_id,
                    risk_type=RiskType.INVENTORY_DEPLETION_RISK,
                    severity=severity,
                    status=RiskStatus.DETECTED,
                    title=f"Inventory Depletion Risk: {product_name} ({warehouse_name})",
                    description=f"Projected inventory stockout in {days_of_supply} days for {product_name} at {warehouse_name}.",
                    product_id=product_id,
                    product_name=product_name,
                    warehouse_id=warehouse_id,
                    warehouse_name=warehouse_name,
                    metric="days_of_supply",
                    metric_value=days_of_supply,
                    threshold=high_thresh,
                    confidence=conf,
                    estimated_revenue_at_risk=total_val,
                    orders_affected_count=orders_count,
                    days_to_impact=days_of_supply,
                    evidence=evidence
                ))
                
        return signals
