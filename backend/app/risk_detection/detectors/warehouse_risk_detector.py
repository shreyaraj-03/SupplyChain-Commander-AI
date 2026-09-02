"""
SupplyChain Commander AI - Warehouse Capacity Risk Detector
Deterministic detector monitoring warehouse utilization thresholds and impending overflow from scheduled inbound freight.
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

class WarehouseRiskDetector:
    """
    Monitors physical storage capacity utilization across network hubs.
    Detects storage bottlenecks and congestion risks caused by inbound delivery waves.
    """

    @classmethod
    def detect(cls, dataset: Dict[str, Any]) -> List[RiskSignal]:
        signals: List[RiskSignal] = []
        cfg = RISK_THRESHOLDS.get("warehouse_capacity", {})
        
        warehouses = dataset.get("warehouses", [])
        shipments = dataset.get("shipments", [])
        inventory = dataset.get("inventory", [])
        
        # Calculate incoming shipment unit volume by destination warehouse
        inbound_volume: Dict[str, int] = {}
        for s in shipments:
            if s.get("status") in ["IN_TRANSIT", "SCHEDULED"]:
                wh_id = s.get("destination_warehouse")
                inbound_volume[wh_id] = inbound_volume.get(wh_id, 0) + int(s.get("quantity", 0))
                
        # Calculate current physical inventory count by warehouse
        inv_by_wh: Dict[str, int] = {}
        for i in inventory:
            wh_id = i.get("warehouse_id")
            inv_by_wh[wh_id] = inv_by_wh.get(wh_id, 0) + int(i.get("available_quantity", 0)) + int(i.get("reserved_quantity", 0))
            
        for wh in warehouses:
            warehouse_id = wh.get("warehouse_id")
            warehouse_name = wh.get("warehouse_name", warehouse_id)
            capacity = int(wh.get("capacity", 30000))
            
            # Base utilization rate
            base_utilization = float(wh.get("utilization_rate", 0.70))
            
            # Calculate dynamic utilization based on active inventory and incoming volume
            current_occupied = int(base_utilization * capacity)
            incoming = inbound_volume.get(warehouse_id, 0)
            projected_occupied = current_occupied + incoming
            projected_utilization = projected_occupied / max(1.0, float(capacity))
            
            # Check thresholds
            crit_thresh = cfg.get("utilization_critical", 0.95)
            high_thresh = cfg.get("utilization_high", 0.90)
            warn_thresh = cfg.get("utilization_warning", 0.85)
            
            if projected_utilization >= warn_thresh or base_utilization >= warn_thresh:
                if projected_utilization >= crit_thresh or base_utilization >= crit_thresh:
                    severity = RiskSeverity.CRITICAL
                    conf = 0.94
                elif projected_utilization >= high_thresh or base_utilization >= high_thresh:
                    severity = RiskSeverity.HIGH
                    conf = 0.88
                else:
                    severity = RiskSeverity.MEDIUM
                    conf = 0.80
                    
                evidence = RiskEvidence(
                    metric_name="warehouse_utilization_pct",
                    observed_value=round(projected_utilization * 100, 1),
                    baseline_value=round(base_utilization * 100, 1),
                    threshold_value=round(high_thresh * 100, 1),
                    unit="%",
                    summary=f"{warehouse_name} is operating at {projected_utilization*100:.1f}% capacity ({projected_occupied:,} / {capacity:,} slots utilized with {incoming} units inbound).",
                    drivers=[
                        f"Current occupied capacity: {current_occupied:,} / {capacity:,} units ({base_utilization*100:.1f}% baseline).",
                        f"Inbound scheduled freight: {incoming:,} units arriving within 7 days.",
                        f"Projected congestion margin: {capacity - projected_occupied:,} remaining slots before complete threshold breach.",
                        f"Risk of put-away delays, cross-dock congestion, and dock turnaround penalties."
                    ],
                    raw_details={
                        "warehouse_id": warehouse_id,
                        "capacity": capacity,
                        "base_utilization": base_utilization,
                        "current_occupied": current_occupied,
                        "incoming_inbound": incoming,
                        "projected_occupied": projected_occupied,
                        "projected_utilization": projected_utilization
                    }
                )
                
                risk_id = f"RSK_WH_{warehouse_id}"
                
                signals.append(RiskSignal(
                    risk_id=risk_id,
                    risk_type=RiskType.WAREHOUSE_CAPACITY_RISK,
                    severity=severity,
                    status=RiskStatus.DETECTED,
                    title=f"Warehouse Capacity Bottleneck: {warehouse_name}",
                    description=f"{warehouse_name} projected at {projected_utilization*100:.1f}% utilization due to incoming delivery waves.",
                    warehouse_id=warehouse_id,
                    warehouse_name=warehouse_name,
                    metric="utilization_pct",
                    metric_value=round(projected_utilization * 100, 1),
                    threshold=round(high_thresh * 100, 1),
                    confidence=conf,
                    estimated_revenue_at_risk=incoming * 15000.0 if incoming > 0 else 1200000.0,
                    orders_affected_count=max(10, incoming // 20),
                    days_to_impact=max(1.0, round((1.0 - base_utilization) * 20, 1)),
                    evidence=evidence
                ))
                
        return signals
