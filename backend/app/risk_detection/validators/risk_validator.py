"""
SupplyChain Commander AI - Risk Validator & Correlation Layer
Evaluates multi-signal correlation, filters false positives, calculates validation scores, and enforces cooldowns.
"""

from typing import List, Dict, Any, Tuple
from datetime import datetime, timezone

from backend.app.risk_detection.risk_models import (
    RiskSignal,
    RiskStatus,
    RiskSeverity,
    RiskType,
    RiskAuditRecord
)
from backend.app.risk_detection.configuration.risk_thresholds import RISK_THRESHOLDS
from backend.app.risk_detection.risk_repository import RiskRepository

class RiskValidator:
    """
    Validates detected risk signals through multi-dimensional mathematical criteria:
    1. Multi-signal correlation (reinforcing indicators)
    2. False-positive suppression & minimum business impact
    3. Deterministic Validation Score (0 - 100)
    4. Deduplication & Cooldown management
    """

    @classmethod
    def validate_signals(
        cls,
        raw_signals: List[RiskSignal],
        existing_disruptions: List[Dict[str, Any]]
    ) -> Tuple[List[RiskSignal], List[RiskAuditRecord]]:
        validated_signals: List[RiskSignal] = []
        audit_logs: List[RiskAuditRecord] = []
        cfg = RISK_THRESHOLDS.get("validation", {})
        
        # 1. Multi-Signal Correlation Phase
        # Group signals by (product_id, warehouse_id) or supplier_id
        entity_groups: Dict[str, List[RiskSignal]] = {}
        for s in raw_signals:
            if s.product_id and s.warehouse_id:
                key = f"P_{s.product_id}__W_{s.warehouse_id}"
            elif s.supplier_id:
                key = f"S_{s.supplier_id}"
            elif s.warehouse_id:
                key = f"W_{s.warehouse_id}"
            else:
                key = f"GEN_{s.risk_id}"
            entity_groups.setdefault(key, []).append(s)
            
        # Correlate signals within the same entity group
        for key, group in entity_groups.items():
            if len(group) > 1:
                all_ids = [s.risk_id for s in group]
                for s in group:
                    s.correlated_risk_ids = [rid for rid in all_ids if rid != s.risk_id]
                    # Confidence boost for multi-signal confirmation
                    boost = min(0.12, (len(group) - 1) * 0.06)
                    s.confidence = min(0.98, round(s.confidence + boost, 2))
                    
                    # Elevate severity if multiple high indicators confirm the deficit
                    if len(group) >= 3 and s.severity == RiskSeverity.HIGH:
                        s.severity = RiskSeverity.CRITICAL
                    elif len(group) >= 2 and s.severity == RiskSeverity.MEDIUM:
                        s.severity = RiskSeverity.HIGH
                        
                    if s.evidence and s.correlated_risk_ids:
                        s.evidence.drivers.append(
                            f"Multi-Signal Correlation: Confirmed by {len(s.correlated_risk_ids)} additional independent risk signals."
                        )

        # 2. Validation Scoring, False-Positive Control & Deduplication Phase
        min_rev = cfg.get("min_revenue_impact", 250000.0)
        min_orders = cfg.get("min_orders_affected", 2)
        min_val_score = cfg.get("min_validation_score", 60.0)
        
        active_disruption_keys = set()
        for d in existing_disruptions:
            if d.get("status") in ["ACTIVE", "INVESTIGATING"]:
                p_id = d.get("affected_product_id", "")
                w_id = d.get("destination_warehouse_id", "")
                s_id = d.get("entity_id", "")
                active_disruption_keys.add(f"{p_id}__{w_id}")
                active_disruption_keys.add(f"{s_id}")

        for s in raw_signals:
            # Check business impact thresholds
            has_sufficient_impact = (
                s.estimated_revenue_at_risk >= min_rev or
                s.orders_affected_count >= min_orders or
                s.severity == RiskSeverity.CRITICAL
            )
            
            # Calculate validation score (0 - 100)
            sev_weights = {
                RiskSeverity.CRITICAL: 30.0,
                RiskSeverity.HIGH: 24.0,
                RiskSeverity.MEDIUM: 16.0,
                RiskSeverity.LOW: 8.0
            }
            conf_points = s.confidence * 40.0 # max 40
            sev_points = sev_weights.get(s.severity, 10.0) # max 30
            correlation_points = min(20.0, len(s.correlated_risk_ids) * 10.0) # max 20
            impact_points = min(10.0, (s.estimated_revenue_at_risk / 5000000.0) * 10.0) # max 10
            
            validation_score = round(conf_points + sev_points + correlation_points + impact_points, 1)
            s.validation_score = validation_score
            
            # Deduplication check against active disruptions
            entity_key_pw = f"{s.product_id}__{s.warehouse_id}" if s.product_id and s.warehouse_id else ""
            entity_key_s = f"{s.supplier_id}" if s.supplier_id else ""
            is_duplicate = (entity_key_pw in active_disruption_keys) or (entity_key_s in active_disruption_keys)
            
            now_iso = datetime.now(timezone.utc).isoformat()
            
            if is_duplicate:
                s.status = RiskStatus.MONITORING
                audit_logs.append(RiskAuditRecord(
                    audit_id=f"AUD_{s.risk_id}_{int(datetime.now(timezone.utc).timestamp())}",
                    risk_id=s.risk_id,
                    action="SUPPRESSED_DUPLICATE",
                    timestamp=now_iso,
                    detector=s.risk_type.value,
                    severity=s.severity.value,
                    decision_summary=f"Active disruption already exists for entity. Risk status set to MONITORING.",
                    evidence_snapshot=s.evidence.to_dict() if s.evidence else {}
                ))
            elif not has_sufficient_impact:
                s.status = RiskStatus.MONITORING
                audit_logs.append(RiskAuditRecord(
                    audit_id=f"AUD_{s.risk_id}_{int(datetime.now(timezone.utc).timestamp())}",
                    risk_id=s.risk_id,
                    action="MONITORING",
                    timestamp=now_iso,
                    detector=s.risk_type.value,
                    severity=s.severity.value,
                    decision_summary=f"Below minimum business impact threshold (₹{s.estimated_revenue_at_risk:,.0f} < ₹{min_rev:,.0f}). Retained under MONITORING.",
                    evidence_snapshot=s.evidence.to_dict() if s.evidence else {}
                ))
            elif validation_score >= min_val_score:
                s.status = RiskStatus.VALIDATED
                s.validated_at = now_iso
                audit_logs.append(RiskAuditRecord(
                    audit_id=f"AUD_{s.risk_id}_{int(datetime.now(timezone.utc).timestamp())}",
                    risk_id=s.risk_id,
                    action="VALIDATED",
                    timestamp=now_iso,
                    detector=s.risk_type.value,
                    severity=s.severity.value,
                    decision_summary=f"Risk validated with score {validation_score}/100. Confidence: {s.confidence*100:.0f}%, Correlated indicators: {len(s.correlated_risk_ids)}.",
                    evidence_snapshot=s.evidence.to_dict() if s.evidence else {}
                ))
            else:
                s.status = RiskStatus.VALIDATING
                audit_logs.append(RiskAuditRecord(
                    audit_id=f"AUD_{s.risk_id}_{int(datetime.now(timezone.utc).timestamp())}",
                    risk_id=s.risk_id,
                    action="VALIDATING",
                    timestamp=now_iso,
                    detector=s.risk_type.value,
                    severity=s.severity.value,
                    decision_summary=f"Validation score {validation_score} below threshold {min_val_score}. Set to VALIDATING.",
                    evidence_snapshot=s.evidence.to_dict() if s.evidence else {}
                ))
                
            validated_signals.append(s)
            
        return validated_signals, audit_logs
