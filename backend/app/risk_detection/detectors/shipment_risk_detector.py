"""
SupplyChain Commander AI - Shipment Delay Risk Detector
Deterministic detector identifying critical in-transit logistics delays impacting downstream customer fulfillment.
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

class ShipmentRiskDetector:
    """
    Evaluates in-transit and scheduled purchase orders where Estimated Arrival exceeds Planned Arrival.
    Connects logistical bottlenecks to downstream customer order exposure and destination hubs.
    """

    @classmethod
    def detect(cls, dataset: Dict[str, Any]) -> List[RiskSignal]:
        signals: List[RiskSignal] = []
        cfg = RISK_THRESHOLDS.get("shipment_delay", {})
        
        products = {p["product_id"]: p for p in dataset.get("products", [])}
        warehouses = {w["warehouse_id"]: w for w in dataset.get("warehouses", [])}
        suppliers = {s["supplier_id"]: s for s in dataset.get("suppliers", [])}
        shipments = dataset.get("shipments", [])
        orders = dataset.get("customer_orders", [])
        
        for ship in shipments:
            delay_days = int(ship.get("delay_days", 0))
            status = ship.get("status", "SCHEDULED")
            
            if delay_days < cfg.get("delay_days_low", 2) and status != "DELAYED":
                continue
                
            shipment_id = ship.get("shipment_id")
            product_id = ship.get("product_id")
            supplier_id = ship.get("supplier_id")
            dest_warehouse_id = ship.get("destination_warehouse")
            quantity = int(ship.get("quantity", 0))
            
            product = products.get(product_id, {})
            warehouse = warehouses.get(dest_warehouse_id, {})
            supplier = suppliers.get(supplier_id, {})
            
            product_name = product.get("product_name", product_id)
            warehouse_name = warehouse.get("warehouse_name", dest_warehouse_id)
            supplier_name = supplier.get("supplier_name", supplier_id)
            
            # Find downstream customer orders depending on this arrival
            affected_orders = [
                o for o in orders 
                if o.get("product_id") == product_id and o.get("warehouse_id") == dest_warehouse_id
            ]
            orders_count = len(affected_orders)
            revenue_risk = sum(o.get("order_value", 0.0) for o in affected_orders) if affected_orders else quantity * product.get("selling_price", 1000.0)
            priority_count = sum(1 for o in affected_orders if o.get("priority") in ["CRITICAL", "HIGH"])
            
            # Severity classification
            if delay_days >= cfg.get("delay_days_critical", 10):
                severity = RiskSeverity.CRITICAL
                conf = 0.96
            elif delay_days >= cfg.get("delay_days_high", 7):
                severity = RiskSeverity.HIGH
                conf = 0.92
            elif delay_days >= cfg.get("delay_days_medium", 4):
                severity = RiskSeverity.MEDIUM
                conf = 0.85
            else:
                severity = RiskSeverity.LOW
                conf = 0.78
                
            evidence = RiskEvidence(
                metric_name="shipment_delay_days",
                observed_value=float(delay_days),
                baseline_value=0.0,
                threshold_value=float(cfg.get("delay_days_medium", 4)),
                unit="days",
                summary=f"Shipment {shipment_id} ({quantity} units of {product_name} from {supplier_name}) is delayed by {delay_days} days to {warehouse_name}.",
                drivers=[
                    f"Planned arrival: {ship.get('planned_arrival')} vs Estimated arrival: {ship.get('estimated_arrival')} ({delay_days} days late).",
                    f"Consignment size: {quantity} units in transit (Tracking: {ship.get('tracking_code', 'N/A')}).",
                    f"Downstream customer impact: {orders_count} orders threatened ({priority_count} critical SLA accounts).",
                    f"Total at-risk delivery revenue: ₹{revenue_risk:,.0f}."
                ],
                raw_details={
                    "shipment_id": shipment_id,
                    "delay_days": delay_days,
                    "quantity": quantity,
                    "planned_arrival": ship.get("planned_arrival"),
                    "estimated_arrival": ship.get("estimated_arrival"),
                    "tracking_code": ship.get("tracking_code"),
                    "orders_at_risk_count": orders_count,
                    "revenue_at_risk": revenue_risk
                }
            )
            
            risk_id = f"RSK_SHIPMENT_{shipment_id}"
            
            signals.append(RiskSignal(
                risk_id=risk_id,
                risk_type=RiskType.SHIPMENT_DELAY_RISK,
                severity=severity,
                status=RiskStatus.DETECTED,
                title=f"In-Transit Delay: Shipment {shipment_id} ({quantity} units of {product_name} from {supplier_name})",
                description=f"{delay_days}-day transit delay for {quantity} units of {product_name} from {supplier_name} to {warehouse_name}.",
                product_id=product_id,
                product_name=product_name,
                warehouse_id=dest_warehouse_id,
                warehouse_name=warehouse_name,
                supplier_id=supplier_id,
                supplier_name=supplier_name,
                metric="delay_days",
                metric_value=float(delay_days),
                threshold=float(cfg.get("delay_days_medium", 4)),
                confidence=conf,
                estimated_revenue_at_risk=revenue_risk,
                orders_affected_count=orders_count or max(1, quantity // 10),
                days_to_impact=float(delay_days),
                evidence=evidence
            ))
            
        return signals
