"""
SupplyChain Commander AI - Supplier Performance Risk Detector
Deterministic detector evaluating deterioration in supplier reliability, on-time delivery rates, and quality scores.
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

class SupplierRiskDetector:
    """
    Analyzes historical vs rolling 30-day supplier fulfillment metrics.
    Detects reliability decay, transit lead-time creep, and quality threshold breaches.
    """

    @classmethod
    def detect(cls, dataset: Dict[str, Any]) -> List[RiskSignal]:
        signals: List[RiskSignal] = []
        cfg = RISK_THRESHOLDS.get("supplier_performance", {})
        
        suppliers = {s["supplier_id"]: s for s in dataset.get("suppliers", [])}
        performances = dataset.get("supplier_performance", [])
        shipments = dataset.get("shipments", [])
        
        for perf in performances:
            supplier_id = perf.get("supplier_id")
            supplier = suppliers.get(supplier_id, {})
            supplier_name = supplier.get("supplier_name", supplier_id)
            
            baseline_otd = float(supplier.get("reliability_score", 0.90))
            current_otd = float(perf.get("on_time_delivery_rate", 0.90))
            avg_delay = float(perf.get("average_delay_days", 0.0))
            quality = float(perf.get("quality_score", 1.0))
            orders_fulfilled = int(perf.get("orders_fulfilled", 100))
            
            otd_drop = max(0.0, baseline_otd - current_otd)
            
            # Check thresholds
            drop_crit = cfg.get("otd_drop_critical", 0.30)
            drop_high = cfg.get("otd_drop_high", 0.20)
            drop_med = cfg.get("otd_drop_medium", 0.10)
            
            delay_crit = cfg.get("avg_delay_days_critical", 7.0)
            delay_high = cfg.get("avg_delay_days_high", 4.0)
            delay_med = cfg.get("avg_delay_days_medium", 2.0)
            
            if otd_drop >= drop_med or avg_delay >= delay_med or quality < cfg.get("quality_score_min", 0.90):
                if otd_drop >= drop_crit or avg_delay >= delay_crit:
                    severity = RiskSeverity.CRITICAL
                    conf = 0.95
                elif otd_drop >= drop_high or avg_delay >= delay_high:
                    severity = RiskSeverity.HIGH
                    conf = 0.91
                else:
                    severity = RiskSeverity.MEDIUM
                    conf = 0.83
                    
                # Find affected shipments
                supplier_shipments = [s for s in shipments if s.get("supplier_id") == supplier_id]
                delayed_units = sum(s.get("quantity", 0) for s in supplier_shipments if s.get("status") == "DELAYED")
                
                evidence = RiskEvidence(
                    metric_name="on_time_delivery_rate_drop",
                    observed_value=round(current_otd * 100, 1),
                    baseline_value=round(baseline_otd * 100, 1),
                    threshold_value=round((baseline_otd - drop_high) * 100, 1),
                    unit="%",
                    summary=f"Supplier {supplier_name} on-time fulfillment dropped from {baseline_otd*100:.0f}% to {current_otd*100:.0f}% (Average delay: {avg_delay:.1f} days).",
                    drivers=[
                        f"On-Time Delivery rate fell by {otd_drop*100:.1f} percentage points over 30-day window.",
                        f"Average shipment delay increased to {avg_delay:.1f} days across {orders_fulfilled} recent purchase orders.",
                        f"Quality acceptance score at {quality*100:.1f}%.",
                        f"Active delayed units in transit: {delayed_units} units."
                    ],
                    raw_details={
                        "baseline_otd": baseline_otd,
                        "current_otd": current_otd,
                        "otd_drop": otd_drop,
                        "average_delay_days": avg_delay,
                        "quality_score": quality,
                        "orders_fulfilled": orders_fulfilled
                    }
                )
                
                risk_id = f"RSK_SUPPLIER_{supplier_id}"
                
                signals.append(RiskSignal(
                    risk_id=risk_id,
                    risk_type=RiskType.SUPPLIER_PERFORMANCE_RISK,
                    severity=severity,
                    status=RiskStatus.DETECTED,
                    title=f"Supplier Performance Risk: {supplier_name}",
                    description=f"Performance deterioration detected for {supplier_name} (OTD dropped {otd_drop*100:.1f}% with {avg_delay:.1f} days avg delay).",
                    supplier_id=supplier_id,
                    supplier_name=supplier_name,
                    metric="otd_rate",
                    metric_value=round(current_otd * 100, 1),
                    threshold=round((baseline_otd - drop_high) * 100, 1),
                    confidence=conf,
                    estimated_revenue_at_risk=delayed_units * 50000.0 if delayed_units > 0 else 2500000.0,
                    orders_affected_count=max(5, len(supplier_shipments)),
                    days_to_impact=avg_delay,
                    evidence=evidence
                ))
                
        return signals
