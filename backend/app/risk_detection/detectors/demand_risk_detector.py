"""
SupplyChain Commander AI - Demand Risk Detector
Deterministic detector for identifying abnormal surges in product demand over historical baselines.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid

from backend.app.risk_detection.risk_models import (
    RiskSignal,
    RiskEvidence,
    RiskSeverity,
    RiskStatus,
    RiskType
)
from backend.app.risk_detection.configuration.risk_thresholds import RISK_THRESHOLDS

class DemandRiskDetector:
    """
    Analyzes current product order velocities against historical moving averages.
    Detects demand spikes and evaluates persistence over consecutive observation windows.
    """

    @classmethod
    def detect(cls, dataset: Dict[str, Any]) -> List[RiskSignal]:
        signals: List[RiskSignal] = []
        cfg = RISK_THRESHOLDS.get("demand_spike", {})
        
        products = {p["product_id"]: p for p in dataset.get("products", [])}
        warehouses = {w["warehouse_id"]: w for w in dataset.get("warehouses", [])}
        orders = dataset.get("customer_orders", [])
        
        # Group orders by product_id and warehouse_id
        grouped_orders: Dict[str, List[Dict[str, Any]]] = {}
        for o in orders:
            key = f"{o['product_id']}__{o.get('warehouse_id', 'WH_BLR')}"
            grouped_orders.setdefault(key, []).append(o)
            
        for key, p_orders in grouped_orders.items():
            product_id, warehouse_id = key.split("__")
            product = products.get(product_id, {})
            warehouse = warehouses.get(warehouse_id, {})
            
            product_name = product.get("product_name", product_id)
            warehouse_name = warehouse.get("warehouse_name", warehouse_id)
            
            # Baseline parameters (from dataset or product reorder baseline)
            # Default baseline daily demand is derived from reorder_point / 10 if not explicitly defined
            baseline_daily_demand = float(product.get("baseline_daily_demand", max(20.0, product.get("reorder_point", 100) / 7.0)))
            
            # Calculate current total quantity and daily rate over recent order window (e.g. 3-7 days)
            total_demanded = sum(o.get("quantity", 0) for o in p_orders)
            total_value = sum(o.get("order_value", 0.0) for o in p_orders)
            order_count = len(p_orders)
            
            # Calculate observation window in days (default: min 3 days, max 7 days)
            observed_days = max(1.0, min(7.0, float(order_count)))
            current_daily_demand = total_demanded / observed_days
            
            if baseline_daily_demand <= 0:
                continue
                
            pct_increase = (current_daily_demand - baseline_daily_demand) / baseline_daily_demand
            
            # Evaluate against thresholds
            if pct_increase >= cfg.get("low", 0.10) and order_count >= cfg.get("min_order_volume", 2):
                if pct_increase >= cfg.get("critical", 0.50):
                    severity = RiskSeverity.CRITICAL
                    conf = 0.95
                elif pct_increase >= cfg.get("high", 0.30):
                    severity = RiskSeverity.HIGH
                    conf = 0.90
                elif pct_increase >= cfg.get("medium", 0.20):
                    severity = RiskSeverity.MEDIUM
                    conf = 0.82
                else:
                    severity = RiskSeverity.LOW
                    conf = 0.75
                    
                evidence = RiskEvidence(
                    metric_name="daily_demand_increase_pct",
                    observed_value=round(pct_increase * 100, 1),
                    baseline_value=round(baseline_daily_demand, 1),
                    threshold_value=round(cfg.get("high", 0.30) * 100, 1),
                    unit="%",
                    summary=f"Daily demand for {product_name} surged to {current_daily_demand:.1f} units/day ({pct_increase*100:+.1f}% over baseline of {baseline_daily_demand:.1f} units/day).",
                    drivers=[
                        f"Current daily demand of {current_daily_demand:.1f} units vs baseline of {baseline_daily_demand:.1f} units.",
                        f"{order_count} customer orders totaling {total_demanded} units in current active window.",
                        f"Total order value exposure of ₹{total_value:,.0f} across {warehouse_name}."
                    ],
                    raw_details={
                        "current_daily_demand": current_daily_demand,
                        "baseline_daily_demand": baseline_daily_demand,
                        "pct_increase": pct_increase,
                        "total_demanded": total_demanded,
                        "total_order_value": total_value,
                        "order_count": order_count
                    }
                )
                
                risk_id = f"RSK_DEMAND_{product_id}_{warehouse_id}"
                
                signals.append(RiskSignal(
                    risk_id=risk_id,
                    risk_type=RiskType.DEMAND_SPIKE,
                    severity=severity,
                    status=RiskStatus.DETECTED,
                    title=f"Demand Spike: {product_name} ({warehouse_name})",
                    description=f"Demand for {product_name} is running {pct_increase*100:.1f}% above historical baseline at {warehouse_name}.",
                    product_id=product_id,
                    product_name=product_name,
                    warehouse_id=warehouse_id,
                    warehouse_name=warehouse_name,
                    metric="demand_increase_pct",
                    metric_value=round(pct_increase * 100, 1),
                    threshold=round(cfg.get("high", 0.30) * 100, 1),
                    confidence=conf,
                    estimated_revenue_at_risk=total_value,
                    orders_affected_count=order_count,
                    days_to_impact=max(1.0, 7.0 - observed_days),
                    evidence=evidence
                ))
                
        return signals
