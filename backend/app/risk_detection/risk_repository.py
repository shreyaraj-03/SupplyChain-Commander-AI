"""
SupplyChain Commander AI - Database Persistent Risk Repository
Replaces flat JSON file storage with SQLite / Database Persistence & Query Engine.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import json
import os

from backend.app.db.db_session import get_db_connection
from backend.app.risk_detection.risk_models import (
    RiskSignal,
    RiskStatus,
    RiskSeverity,
    RiskType,
    RiskEvidence,
    RiskDetectionRun,
    RiskAuditRecord
)

class RiskRepository:
    _risks_store: Dict[str, RiskSignal] = {}
    _runs_store: List[RiskDetectionRun] = []
    _audit_logs: List[RiskAuditRecord] = []
    _active_disruptions_cache: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def _migrate_legacy_json_to_db(cls):
        """One-time migration of existing .json contents into the SQLite database."""
        conn = get_db_connection()
        cursor = conn.cursor()

        # Migrate dynamic_disruptions.json (only if table is empty or ignoring existing keys)
        legacy_disr_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "dynamic_disruptions.json")
        if os.path.exists(legacy_disr_path):
            try:
                cursor.execute("SELECT COUNT(*) FROM dynamic_disruptions")
                count = cursor.fetchone()[0]
                if count == 0:
                    with open(legacy_disr_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        for disr_id, d in data.items():
                            cursor.execute("""
                            INSERT OR IGNORE INTO dynamic_disruptions (
                                disruption_id, disruption_type, entity_type, entity_id, entity_name,
                                severity, reported_at, expected_duration_days, description, status,
                                scenario_tag, affected_product_id, destination_warehouse_id, source,
                                risk_id, detection_method, detection_confidence, detected_at, validated_at, evidence_json
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                d.get("disruption_id"),
                                d.get("disruption_type"),
                                d.get("entity_type"),
                                d.get("entity_id"),
                                d.get("entity_name"),
                                d.get("severity"),
                                d.get("reported_at"),
                                int(d.get("expected_duration_days", 0)),
                                d.get("description"),
                                d.get("status"),
                                d.get("scenario_tag"),
                                d.get("affected_product_id"),
                                d.get("destination_warehouse_id"),
                                d.get("source", "DATA_DETECTED"),
                                d.get("risk_id"),
                                d.get("detection_method"),
                                float(d.get("detection_confidence", 0.0)) if d.get("detection_confidence") else None,
                                d.get("detected_at"),
                                d.get("validated_at"),
                                json.dumps(d.get("detection_evidence", {}))
                            ))
            except Exception as e:
                print(f"Legacy disruptions migration note: {e}")

        # Migrate detected_risks.json (only if table is empty or ignoring existing keys)
        legacy_risks_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "detected_risks.json")
        if os.path.exists(legacy_risks_path):
            try:
                cursor.execute("SELECT COUNT(*) FROM detected_risks")
                rcount = cursor.fetchone()[0]
                if rcount == 0:
                    with open(legacy_risks_path, "r", encoding="utf-8") as f:
                        rdata = json.load(f)
                        for rid, rdict in rdata.items():
                            ev = rdict.get("evidence") or {}
                            detection_method = rdict.get("detection_method") or rdict.get("risk_type") or "DETERMINISTIC"
                            detection_confidence = rdict.get("detection_confidence") or rdict.get("confidence") or 0.95
                            entity_type = rdict.get("entity_type") or ("WAREHOUSE" if rdict.get("warehouse_id") else "SUPPLIER")
                            entity_id = rdict.get("entity_id") or rdict.get("warehouse_id") or rdict.get("supplier_id") or "UNKNOWN"
                            detected_at = rdict.get("detected_at") or datetime.now(timezone.utc).isoformat()

                            cursor.execute("""
                            INSERT OR IGNORE INTO detected_risks (
                                risk_id, risk_type, severity, status, detection_method,
                                detection_confidence, entity_type, entity_id, product_id,
                                warehouse_id, supplier_id, detected_at, validated_at, converted_at,
                                converted_disruption_id, evidence_json
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                rdict.get("risk_id"),
                                rdict.get("risk_type"),
                                rdict.get("severity"),
                                rdict.get("status"),
                                detection_method,
                                float(detection_confidence),
                                entity_type,
                                entity_id,
                                rdict.get("product_id"),
                                rdict.get("warehouse_id"),
                                rdict.get("supplier_id"),
                                detected_at,
                                rdict.get("validated_at"),
                                rdict.get("converted_at"),
                                rdict.get("converted_disruption_id"),
                                json.dumps(ev)
                            ))
            except Exception as e:
                print(f"Legacy risks migration note: {e}")

        conn.commit()
        conn.close()

    @classmethod
    def save_disruption(cls, disruption: Dict[str, Any]) -> Dict[str, Any]:
        disr_id = disruption["disruption_id"]
        cls._active_disruptions_cache[disr_id] = disruption
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT OR REPLACE INTO dynamic_disruptions (
            disruption_id, disruption_type, entity_type, entity_id, entity_name,
            severity, reported_at, expected_duration_days, description, status,
            scenario_tag, affected_product_id, destination_warehouse_id, source,
            risk_id, detection_method, detection_confidence, detected_at, validated_at, evidence_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            disruption.get("disruption_id"),
            disruption.get("disruption_type"),
            disruption.get("entity_type"),
            disruption.get("entity_id"),
            disruption.get("entity_name"),
            disruption.get("severity"),
            disruption.get("reported_at"),
            int(disruption.get("expected_duration_days", 0)),
            disruption.get("description"),
            disruption.get("status"),
            disruption.get("scenario_tag"),
            disruption.get("affected_product_id"),
            disruption.get("destination_warehouse_id"),
            disruption.get("source", "DATA_DETECTED"),
            disruption.get("risk_id"),
            disruption.get("detection_method"),
            float(disruption.get("detection_confidence", 0.0)) if disruption.get("detection_confidence") is not None else None,
            disruption.get("detected_at"),
            disruption.get("validated_at"),
            json.dumps(disruption.get("detection_evidence", {}))
        ))
        conn.commit()
        conn.close()
        return disruption

    @classmethod
    def get_disruption(cls, disruption_id: str) -> Optional[Dict[str, Any]]:
        if disruption_id in cls._active_disruptions_cache:
            return cls._active_disruptions_cache[disruption_id]
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM dynamic_disruptions WHERE disruption_id = ?", (disruption_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            d = dict(row)
            if d.get("evidence_json"):
                try:
                    d["detection_evidence"] = json.loads(d["evidence_json"])
                except Exception:
                    pass
            cls._active_disruptions_cache[disruption_id] = d
            return d
        return None

    @classmethod
    def list_dynamic_disruptions(cls) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM dynamic_disruptions ORDER BY reported_at DESC")
        rows = cursor.fetchall()
        conn.close()

        results = []
        for row in rows:
            d = dict(row)
            if d.get("evidence_json"):
                try:
                    d["detection_evidence"] = json.loads(d["evidence_json"])
                except Exception:
                    pass
            cls._active_disruptions_cache[d["disruption_id"]] = d
            results.append(d)
        return results

    @classmethod
    def save_risk(cls, risk: RiskSignal) -> RiskSignal:
        cls._risks_store[risk.risk_id] = risk
        
        conn = get_db_connection()
        cursor = conn.cursor()
        ev_dict = risk.evidence.to_dict() if risk.evidence else {}
        cursor.execute("""
        INSERT OR REPLACE INTO detected_risks (
            risk_id, risk_type, severity, status, detection_method,
            detection_confidence, entity_type, entity_id, product_id,
            warehouse_id, supplier_id, detected_at, validated_at, converted_at,
            converted_disruption_id, evidence_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            risk.risk_id,
            risk.risk_type.value if hasattr(risk.risk_type, "value") else str(risk.risk_type),
            risk.severity.value if hasattr(risk.severity, "value") else str(risk.severity),
            risk.status.value if hasattr(risk.status, "value") else str(risk.status),
            getattr(risk, "detection_method", risk.risk_type.value if hasattr(risk.risk_type, "value") else str(risk.risk_type)),
            getattr(risk, "confidence", 0.95),
            getattr(risk, "entity_type", "WAREHOUSE" if risk.warehouse_id else "SUPPLIER"),
            getattr(risk, "entity_id", risk.warehouse_id or risk.supplier_id or "UNKNOWN"),
            risk.product_id,
            risk.warehouse_id,
            risk.supplier_id,
            risk.detected_at,
            risk.validated_at,
            risk.converted_at,
            getattr(risk, "associated_disruption_id", getattr(risk, "converted_disruption_id", None)),
            json.dumps(ev_dict)
        ))
        conn.commit()
        conn.close()
        return risk

    @classmethod
    def get_risk(cls, risk_id: str) -> Optional[RiskSignal]:
        if risk_id in cls._risks_store:
            return cls._risks_store[risk_id]
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM detected_risks WHERE risk_id = ?", (risk_id,))
        row = cursor.fetchone()
        conn.close()

    @classmethod
    def _row_to_risk_signal(cls, rdict: Dict[str, Any]) -> RiskSignal:
        ev_data = json.loads(rdict["evidence_json"]) if rdict.get("evidence_json") else {}
        ev = RiskEvidence(**ev_data) if isinstance(ev_data, dict) and ev_data else None
        
        clean_dict = {
            "risk_id": rdict.get("risk_id"),
            "risk_type": RiskType(rdict.get("risk_type")),
            "severity": RiskSeverity(rdict.get("severity")),
            "status": RiskStatus(rdict.get("status")),
            "product_id": rdict.get("product_id"),
            "warehouse_id": rdict.get("warehouse_id"),
            "supplier_id": rdict.get("supplier_id"),
            "detected_at": rdict.get("detected_at"),
            "validated_at": rdict.get("validated_at"),
            "converted_at": rdict.get("converted_at"),
            "associated_disruption_id": rdict.get("converted_disruption_id"),
            "evidence": ev,
            "confidence": float(rdict.get("detection_confidence") or 0.95)
        }
        valid_fields = set(RiskSignal.__dataclass_fields__.keys())
        filtered = {k: v for k, v in clean_dict.items() if k in valid_fields and v is not None}
        return RiskSignal(**filtered)

    @classmethod
    def get_risk(cls, risk_id: str) -> Optional[RiskSignal]:
        if risk_id in cls._risks_store:
            return cls._risks_store[risk_id]
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM detected_risks WHERE risk_id = ?", (risk_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            sig = cls._row_to_risk_signal(dict(row))
            cls._risks_store[risk_id] = sig
            return sig
        return None

    @classmethod
    def list_risks(
        cls,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        risk_type: Optional[str] = None,
        product_id: Optional[str] = None,
        warehouse_id: Optional[str] = None,
        supplier_id: Optional[str] = None
    ) -> List[RiskSignal]:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM detected_risks WHERE 1=1"
        params = []
        if status:
            query += " AND status = ?"
            params.append(status)
        if severity:
            query += " AND severity = ?"
            params.append(severity)
        if risk_type:
            query += " AND risk_type = ?"
            params.append(risk_type)
        if product_id:
            query += " AND product_id = ?"
            params.append(product_id)
        if warehouse_id:
            query += " AND warehouse_id = ?"
            params.append(warehouse_id)
        if supplier_id:
            query += " AND supplier_id = ?"
            params.append(supplier_id)

        query += " ORDER BY detected_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        results = []
        for row in rows:
            sig = cls._row_to_risk_signal(dict(row))
            cls._risks_store[sig.risk_id] = sig
            results.append(sig)

        # Sort by severity priority (CRITICAL > HIGH > MEDIUM > LOW)
        severity_rank = {
            RiskSeverity.CRITICAL: 4,
            RiskSeverity.HIGH: 3,
            RiskSeverity.MEDIUM: 2,
            RiskSeverity.LOW: 1
        }
        results.sort(key=lambda r: (severity_rank.get(r.severity, 0), r.detected_at), reverse=True)
        return results

    @classmethod
    def record_run(cls, run: RiskDetectionRun) -> RiskDetectionRun:
        cls._runs_store.append(run)
        return run

    @classmethod
    def list_runs(cls, limit: int = 20) -> List[RiskDetectionRun]:
        return sorted(cls._runs_store, key=lambda r: r.started_at, reverse=True)[:limit]

    @classmethod
    def get_latest_run(cls) -> Optional[RiskDetectionRun]:
        return cls._runs_store[-1] if cls._runs_store else None

    @classmethod
    def add_audit(cls, audit: RiskAuditRecord) -> RiskAuditRecord:
        cls._audit_logs.append(audit)
        return audit

    @classmethod
    def get_audits_for_risk(cls, risk_id: str) -> List[RiskAuditRecord]:
        return [a for a in cls._audit_logs if a.risk_id == risk_id]

    @classmethod
    def update_risk_status(cls, risk_id: str, new_status: RiskStatus, reason: Optional[str] = None) -> Optional[RiskSignal]:
        risk = cls.get_risk(risk_id)
        if not risk:
            return None
        risk.status = new_status
        if new_status == RiskStatus.DISMISSED:
            risk.dismissal_reason = reason
        cls.save_risk(risk)
        return risk

    @classmethod
    def clear(cls):
        cls._risks_store.clear()
        cls._runs_store.clear()
        cls._audit_logs.clear()
        cls._active_disruptions_cache.clear()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dynamic_disruptions")
        cursor.execute("DELETE FROM detected_risks")
        conn.commit()
        conn.close()

# Perform initial legacy migration on module load
RiskRepository._migrate_legacy_json_to_db()
