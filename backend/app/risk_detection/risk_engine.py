"""
SupplyChain Commander AI - Risk Detection Engine
Central orchestrator executing deterministic detectors, signal validation, and disruption generation.
"""

import time
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.app.risk_detection.risk_models import (
    RiskSignal,
    RiskStatus,
    RiskSeverity,
    RiskType,
    RiskDetectionRun,
    RiskAuditRecord
)
from backend.app.risk_detection.detectors.demand_risk_detector import DemandRiskDetector
from backend.app.risk_detection.detectors.inventory_risk_detector import InventoryRiskDetector
from backend.app.risk_detection.detectors.supplier_risk_detector import SupplierRiskDetector
from backend.app.risk_detection.detectors.shipment_risk_detector import ShipmentRiskDetector
from backend.app.risk_detection.detectors.supply_gap_detector import SupplyGapDetector
from backend.app.risk_detection.detectors.warehouse_risk_detector import WarehouseRiskDetector
from backend.app.risk_detection.validators.risk_validator import RiskValidator
from backend.app.risk_detection.risk_repository import RiskRepository
from backend.app.models.disruption import Disruption, DisruptionSeverity, DisruptionStatus, DisruptionType

class RiskDetectionEngine:
    """
    Autonomous Risk Detection Service.
    Monitors supply chain data, runs 6 deterministic detectors, correlates signals,
    and converts high-confidence validated risks into formal Disruption events for the Commander Agent.
    """

    @classmethod
    def run_detection_scan(
        cls,
        dataset: Dict[str, Any],
        trigger_type: str = "MANUAL",
        auto_convert_critical: bool = False
    ) -> Dict[str, Any]:
        t0 = time.time()
        start_iso = datetime.now(timezone.utc).isoformat()
        run_id = f"RUN_{int(time.time())}"
        
        # 1. Run all 6 deterministic detectors
        raw_signals: List[RiskSignal] = []
        
        # Detector 1: Inventory Depletion (Days of Supply)
        inv_signals = InventoryRiskDetector.detect(dataset)
        raw_signals.extend(inv_signals)
        
        # Detector 2: Demand Spike
        demand_signals = DemandRiskDetector.detect(dataset)
        raw_signals.extend(demand_signals)
        
        # Detector 3: Supply-Demand Gap
        gap_signals = SupplyGapDetector.detect(dataset)
        raw_signals.extend(gap_signals)
        
        # Detector 4: Shipment Delay
        ship_signals = ShipmentRiskDetector.detect(dataset)
        raw_signals.extend(ship_signals)
        
        # Detector 5: Supplier Performance Deterioration
        supp_signals = SupplierRiskDetector.detect(dataset)
        raw_signals.extend(supp_signals)
        
        # Detector 6: Warehouse Capacity
        wh_signals = WarehouseRiskDetector.detect(dataset)
        raw_signals.extend(wh_signals)
        
        # 2. Validation, Multi-Signal Correlation & False-Positive Filtering
        existing_disruptions = dataset.get("disruptions", [])
        validated_signals, audit_logs = RiskValidator.validate_signals(raw_signals, existing_disruptions)
        
        # 3. Save signals and audit logs to repository
        for s in validated_signals:
            RiskRepository.save_risk(s)
            
        for a in audit_logs:
            RiskRepository.add_audit(a)
            
        # 4. Auto-convert top validated critical/high risks to Disruption Events if enabled
        converted_count = 0
        new_disruptions: List[Dict[str, Any]] = []
        
        if auto_convert_critical:
            for s in validated_signals:
                st_val = s.status.value if hasattr(s.status, "value") else str(s.status)
                sev_val = s.severity.value if hasattr(s.severity, "value") else str(s.severity)
                if st_val == "VALIDATED" and sev_val in ["CRITICAL", "HIGH"]:
                    # Create disruption if not duplicate
                    disruption_dict = cls._promote_risk_to_disruption(s)
                    if disruption_dict:
                        new_disruptions.append(disruption_dict)
                        converted_count += 1
                        
        # 5. Telemetry & Summary
        duration_ms = int((time.time() - t0) * 1000)
        end_iso = datetime.now(timezone.utc).isoformat()
        
        type_counts: Dict[str, int] = {}
        sev_counts: Dict[str, int] = {}
        for s in validated_signals:
            t_val = s.risk_type.value if hasattr(s.risk_type, "value") else str(s.risk_type)
            s_val = s.severity.value if hasattr(s.severity, "value") else str(s.severity)
            type_counts[t_val] = type_counts.get(t_val, 0) + 1
            sev_counts[s_val] = sev_counts.get(s_val, 0) + 1
            
        validated_count = sum(
            1 for s in validated_signals 
            if (s.status.value if hasattr(s.status, "value") else str(s.status)) in ["VALIDATED", "CONVERTED_TO_DISRUPTION"]
        )

        run_record = RiskDetectionRun(
            run_id=run_id,
            started_at=start_iso,
            completed_at=end_iso,
            duration_ms=duration_ms,
            trigger_type=trigger_type,
            products_analyzed_count=len(dataset.get("products", [])),
            inventory_records_analyzed_count=len(dataset.get("inventory", [])),
            orders_analyzed_count=len(dataset.get("customer_orders", [])),
            shipments_analyzed_count=len(dataset.get("shipments", [])),
            suppliers_analyzed_count=len(dataset.get("suppliers", [])),
            total_risks_detected=len(validated_signals),
            risks_by_type=type_counts,
            risks_by_severity=sev_counts,
            validated_risks_count=validated_count,
            disruptions_created_count=converted_count,
            status="SUCCESS"
        )
        
        RiskRepository.record_run(run_record)
        
        return {
            "run": run_record.to_dict(),
            "signals": [s.to_dict() for s in validated_signals],
            "new_disruptions": new_disruptions,
            "audit_logs": [a.to_dict() for a in audit_logs]
        }

    @classmethod
    def convert_risk_to_disruption(cls, risk_id: str, dataset: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        risk = RiskRepository.get_risk(risk_id)
        if not risk:
            return None
        return cls._promote_risk_to_disruption(risk, dataset)

    @classmethod
    def _promote_risk_to_disruption(cls, risk: RiskSignal, dataset: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        disruption_id = f"DISR_AUTO_{risk.risk_id.replace('RSK_', '')}"
        
        # Map RiskType to DisruptionType
        type_mapping = {
            RiskType.DEMAND_SPIKE: DisruptionType.DEMAND_SPIKE,
            RiskType.INVENTORY_DEPLETION_RISK: DisruptionType.INVENTORY_SHORTAGE,
            RiskType.SUPPLIER_PERFORMANCE_RISK: DisruptionType.SUPPLIER_DELAY,
            RiskType.SHIPMENT_DELAY_RISK: DisruptionType.SUPPLIER_DELAY,
            RiskType.SUPPLY_DEMAND_GAP: DisruptionType.SUPPLY_DEMAND_GAP,
            RiskType.WAREHOUSE_CAPACITY_RISK: DisruptionType.INVENTORY_SHORTAGE
        }
        disruption_type = type_mapping.get(risk.risk_type, DisruptionType.INVENTORY_SHORTAGE)
        
        # Entity determination
        if risk.supplier_id:
            entity_type = "SUPPLIER"
            entity_id = risk.supplier_id
            entity_name = risk.supplier_name or risk.supplier_id
        elif risk.warehouse_id:
            entity_type = "WAREHOUSE"
            entity_id = risk.warehouse_id
            entity_name = risk.warehouse_name or risk.warehouse_id
        else:
            entity_type = "PRODUCT"
            entity_id = risk.product_id or "PROD_001"
            entity_name = risk.product_name or "Product"
            
        now_iso = datetime.now(timezone.utc).isoformat()
        
        title_str = risk.title.strip() if risk.title and risk.title.strip() else (
            f"{risk.risk_type.value.replace('_', ' ').title()} ({risk.product_id or risk.entity_id})"
        )
        desc_str = risk.description.strip() if risk.description and risk.description.strip() else (
            risk.evidence.summary if risk.evidence and risk.evidence.summary else "Multi-indicator anomaly detected across telemetry stream."
        )

        disruption_dict = {
            "disruption_id": disruption_id,
            "disruption_type": disruption_type.value,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "entity_name": entity_name,
            "severity": risk.severity.value,
            "reported_at": now_iso,
            "expected_duration_days": int(risk.days_to_impact or 7),
            "description": f"[AI DATA-DETECTED RISK] {desc_str}",
            "status": "ACTIVE",
            "scenario_tag": f"AI Detected: {title_str}",
            "affected_product_id": risk.product_id or "PROD_001",
            "destination_warehouse_id": risk.warehouse_id or "WH_BLR",
            "source": "DATA_DETECTED",
            "risk_id": risk.risk_id,
            "detection_method": risk.risk_type.value,
            "detection_confidence": risk.confidence,
            "detected_at": risk.detected_at,
            "validated_at": risk.validated_at or now_iso,
            "detection_evidence": risk.evidence.to_dict() if risk.evidence else None
        }
        
        # Update Risk status
        risk.status = RiskStatus.CONVERTED_TO_DISRUPTION
        risk.converted_at = now_iso
        risk.associated_disruption_id = disruption_id
        RiskRepository.save_risk(risk)
        RiskRepository.save_disruption(disruption_dict)
        
        # Add audit entry
        RiskRepository.add_audit(RiskAuditRecord(
            audit_id=f"AUD_CONV_{risk.risk_id}_{int(datetime.now(timezone.utc).timestamp())}",
            risk_id=risk.risk_id,
            action="CONVERTED_TO_DISRUPTION",
            timestamp=now_iso,
            detector=risk.risk_type.value,
            severity=risk.severity.value,
            decision_summary=f"Risk promoted to active Disruption Event {disruption_id} for Commander Agent investigation.",
            evidence_snapshot=risk.evidence.to_dict() if risk.evidence else {}
        ))
        
        return disruption_dict

