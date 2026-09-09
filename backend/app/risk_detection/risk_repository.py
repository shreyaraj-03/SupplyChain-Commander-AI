"""
SupplyChain Commander AI - Database Persistent Risk Repository
Replaces flat JSON file storage with SQLite / Database Persistence & Query Engine.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import json
import os
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

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
    def _persist_disruption_to_disk(cls, disruption: Dict[str, Any]):
        try:
            data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
            os.makedirs(data_dir, exist_ok=True)
            dyn_path = os.path.join(data_dir, "dynamic_disruptions.json")
            data = {}
            if os.path.exists(dyn_path):
                try:
                    with open(dyn_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                except Exception:
                    data = {}
            data[disruption["disruption_id"]] = disruption
            with open(dyn_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

            ds_path = os.path.join(data_dir, "dataset.json")
            if os.path.exists(ds_path):
                try:
                    with open(ds_path, "r", encoding="utf-8") as f:
                        ds_data = json.load(f)
                    disrs = ds_data.get("disruptions", [])
                    idx = next((i for i, d in enumerate(disrs) if d.get("disruption_id") == disruption["disruption_id"]), None)
                    if idx is not None:
                        disrs[idx] = disruption
                    else:
                        disrs.append(disruption)
                    ds_data["disruptions"] = disrs
                    with open(ds_path, "w", encoding="utf-8") as f:
                        json.dump(ds_data, f, indent=2)
                except Exception:
                    pass
        except Exception as e:
            print(f"Disk disruption persistence note: {e}")

    @classmethod
    def _persist_risk_to_disk(cls, risk_dict: Dict[str, Any]):
        try:
            data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
            os.makedirs(data_dir, exist_ok=True)
            risk_path = os.path.join(data_dir, "detected_risks.json")
            data = {}
            if os.path.exists(risk_path):
                try:
                    with open(risk_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                except Exception:
                    data = {}
            data[risk_dict["risk_id"]] = risk_dict
            with open(risk_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Disk risk persistence note: {e}")

    @classmethod
    def sync_converted_risk_statuses(cls):
        """Cross-checks dynamic_disruptions with detected_risks to ensure risk status consistency."""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT risk_id, disruption_id, reported_at 
            FROM dynamic_disruptions 
            WHERE risk_id IS NOT NULL AND risk_id != ''
            """)
            rows = cursor.fetchall()
            for r in rows:
                r_id = r["risk_id"]
                d_id = r["disruption_id"]
                rep_at = r["reported_at"]
                cursor.execute("""
                UPDATE detected_risks 
                SET status = 'CONVERTED_TO_DISRUPTION',
                    converted_at = COALESCE(converted_at, ?),
                    converted_disruption_id = ?
                WHERE risk_id = ? AND status != 'CONVERTED_TO_DISRUPTION'
                """, (rep_at, d_id, r_id))
            conn.commit()

            # Also fetch all converted risks and sync to disk JSON
            cursor.execute("SELECT * FROM detected_risks WHERE status = 'CONVERTED_TO_DISRUPTION'")
            c_rows = cursor.fetchall()
            conn.close()

            for crow in c_rows:
                sig = cls._row_to_risk_signal(dict(crow))
                cls._persist_risk_to_disk(sig.to_dict())
        except Exception as e:
            print(f"Risk status sync note: {e}")

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
        cls.sync_converted_risk_statuses()

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
        cls._persist_disruption_to_disk(disruption)

        # Stream sync to BigQuery if configured
        try:
            from backend.scripts.seed_bigquery import sync_dynamic_disruption_to_bigquery
            sync_dynamic_disruption_to_bigquery(disruption)
        except Exception:
            pass

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
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check existing row in SQLite DB to prevent status regression (e.g., CONVERTED_TO_DISRUPTION -> MONITORING)
        cursor.execute("SELECT status, converted_at, converted_disruption_id FROM detected_risks WHERE risk_id = ?", (risk.risk_id,))
        existing_row = cursor.fetchone()
        if existing_row:
            ex_dict = dict(existing_row)
            if ex_dict.get("status") == "CONVERTED_TO_DISRUPTION":
                risk.status = RiskStatus.CONVERTED_TO_DISRUPTION
                if not risk.converted_at and ex_dict.get("converted_at"):
                    risk.converted_at = ex_dict.get("converted_at")
                if not getattr(risk, "associated_disruption_id", None) and ex_dict.get("converted_disruption_id"):
                    risk.associated_disruption_id = ex_dict.get("converted_disruption_id")

        cls._risks_store[risk.risk_id] = risk
        
        ev_dict = risk.evidence.to_dict() if risk.evidence else {}
        cursor.execute("""
        INSERT OR REPLACE INTO detected_risks (
            risk_id, risk_type, severity, status, title, description, detection_method,
            detection_confidence, entity_type, entity_id, product_id, product_name,
            warehouse_id, warehouse_name, supplier_id, supplier_name,
            estimated_revenue_at_risk, orders_affected_count, days_to_impact,
            detected_at, validated_at, converted_at, converted_disruption_id, evidence_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            risk.risk_id,
            risk.risk_type.value if hasattr(risk.risk_type, "value") else str(risk.risk_type),
            risk.severity.value if hasattr(risk.severity, "value") else str(risk.severity),
            risk.status.value if hasattr(risk.status, "value") else str(risk.status),
            risk.title,
            risk.description,
            getattr(risk, "detection_method", risk.risk_type.value if hasattr(risk.risk_type, "value") else str(risk.risk_type)),
            getattr(risk, "confidence", 0.95),
            getattr(risk, "entity_type", "WAREHOUSE" if risk.warehouse_id else "SUPPLIER"),
            getattr(risk, "entity_id", risk.warehouse_id or risk.supplier_id or "UNKNOWN"),
            risk.product_id,
            risk.product_name,
            risk.warehouse_id,
            risk.warehouse_name,
            risk.supplier_id,
            risk.supplier_name,
            risk.estimated_revenue_at_risk,
            risk.orders_affected_count,
            risk.days_to_impact,
            risk.detected_at,
            risk.validated_at,
            risk.converted_at,
            getattr(risk, "associated_disruption_id", getattr(risk, "converted_disruption_id", None)),
            json.dumps(ev_dict)
        ))
        conn.commit()
        conn.close()
        cls._persist_risk_to_disk(risk.to_dict())

        # Stream sync to BigQuery if configured
        try:
            from backend.scripts.seed_bigquery import sync_detected_risk_to_bigquery
            sync_detected_risk_to_bigquery(risk.to_dict())
        except Exception:
            pass

        return risk

    @classmethod
    def _row_to_risk_signal(cls, rdict: Dict[str, Any]) -> RiskSignal:
        ev_data = json.loads(rdict["evidence_json"]) if rdict.get("evidence_json") else {}
        ev = RiskEvidence(**ev_data) if isinstance(ev_data, dict) and ev_data else None
        
        p_id = rdict.get("product_id")
        w_id = rdict.get("warehouse_id")
        s_id = rdict.get("supplier_id")
        
        p_name = rdict.get("product_name")
        w_name = rdict.get("warehouse_name")
        s_name = rdict.get("supplier_name")
        title = rdict.get("title")
        desc = rdict.get("description")

        if not p_name or not w_name or not title or "undefined" in str(title).lower():
            try:
                from backend.app.tools.mcp_tools import _load_dataset
                ds = _load_dataset()
                if p_id and (not p_name or p_name == "None"):
                    prod = next((p for p in ds.get("products", []) if p.get("product_id") == p_id), None)
                    if prod:
                        p_name = prod.get("product_name")
                if w_id and (not w_name or w_name == "None"):
                    wh = next((w for w in ds.get("warehouses", []) if w.get("warehouse_id") == w_id), None)
                    if wh:
                        w_name = wh.get("warehouse_name")
                if s_id and (not s_name or s_name == "None"):
                    supp = next((s for s in ds.get("suppliers", []) if s.get("supplier_id") == s_id), None)
                    if supp:
                        s_name = supp.get("supplier_name")
            except Exception:
                pass

        if not title or "undefined" in str(title).lower():
            risk_type_str = str(rdict.get("risk_type", ""))
            type_display = {
                "INVENTORY_DEPLETION_RISK": "Stockout Risk",
                "SUPPLY_DEMAND_GAP": "Supply Deficit",
                "SHIPMENT_DELAY_RISK": "In-Transit Shipment Delay",
                "SUPPLIER_PERFORMANCE_RISK": "Supplier Performance Deterioration",
                "WAREHOUSE_CAPACITY_RISK": "Warehouse Capacity Bottleneck",
                "DEMAND_SPIKE": "Demand Surge"
            }.get(risk_type_str, "Supply Network Risk")
            
            target = p_name or s_name or w_name or p_id or s_id or w_id or "Network Element"
            location = f" ({w_name})" if w_name and target != w_name else ""
            title = f"{type_display}: {target}{location}"

        if not desc or desc == "None":
            desc = ev.summary if ev else "Multi-indicator supply network anomaly detected."

        clean_dict = {
            "risk_id": rdict.get("risk_id"),
            "risk_type": RiskType(rdict.get("risk_type")),
            "severity": RiskSeverity(rdict.get("severity")),
            "status": RiskStatus(rdict.get("status")),
            "title": title,
            "description": desc,
            "product_id": p_id,
            "product_name": p_name,
            "warehouse_id": w_id,
            "warehouse_name": w_name,
            "supplier_id": s_id,
            "supplier_name": s_name,
            "metric": rdict.get("metric", "anomaly_score"),
            "metric_value": float(rdict.get("metric_value") or (ev.observed_value if ev else 0.0)),
            "threshold": float(rdict.get("threshold") or (ev.threshold_value if ev else 0.0)),
            "confidence": float(rdict.get("detection_confidence") or 0.95),
            "estimated_revenue_at_risk": float(rdict.get("estimated_revenue_at_risk") or 0.0),
            "orders_affected_count": int(rdict.get("orders_affected_count") or 0),
            "days_to_impact": float(rdict.get("days_to_impact")) if rdict.get("days_to_impact") is not None else None,
            "detected_at": rdict.get("detected_at"),
            "validated_at": rdict.get("validated_at"),
            "converted_at": rdict.get("converted_at"),
            "associated_disruption_id": rdict.get("converted_disruption_id"),
            "evidence": ev
        }
        valid_fields = set(RiskSignal.__dataclass_fields__.keys())
        filtered = {k: v for k, v in clean_dict.items() if k in valid_fields and v is not None}
        return RiskSignal(**filtered)

    @classmethod
    def get_risk(cls, risk_id: str) -> Optional[RiskSignal]:
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
        cls.sync_converted_risk_statuses()
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
    def save_mitigation_execution(cls, execution: Dict[str, Any]) -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        exec_id = execution.get("execution_id") or f"EXEC_{int(datetime.now(timezone.utc).timestamp())}"
        execution["execution_id"] = exec_id
        
        cursor.execute("""
        INSERT OR REPLACE INTO mitigation_executions (
            execution_id, disruption_id, strategy_id, strategy_name,
            authorized_budget, executed_at, status, execution_steps_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            exec_id,
            execution.get("disruption_id", ""),
            execution.get("strategy_id", ""),
            execution.get("strategy_name", ""),
            float(execution.get("authorized_budget", 0.0)),
            execution.get("executed_at") or datetime.now(timezone.utc).isoformat(),
            execution.get("status", "SUCCESS"),
            json.dumps(execution.get("steps", []))
        ))
        # If linked to a disruption, update disruption status to IN_EXECUTION
        disr_id = execution.get("disruption_id")
        if disr_id:
            cursor.execute("UPDATE dynamic_disruptions SET status = 'IN_EXECUTION' WHERE disruption_id = ?", (disr_id,))
            if disr_id in cls._active_disruptions_cache:
                cls._active_disruptions_cache[disr_id]["status"] = "IN_EXECUTION"
            
            # Also update dynamic_disruptions.json on disk if present
            try:
                data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
                dyn_path = os.path.join(data_dir, "dynamic_disruptions.json")
                if os.path.exists(dyn_path):
                    with open(dyn_path, "r", encoding="utf-8") as f:
                        dyn_data = json.load(f)
                    if disr_id in dyn_data:
                        dyn_data[disr_id]["status"] = "IN_EXECUTION"
                        with open(dyn_path, "w", encoding="utf-8") as f:
                            json.dump(dyn_data, f, indent=2)
            except Exception:
                pass

        conn.commit()
        conn.close()

        # Persist execution log to disk JSON
        try:
            data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
            os.makedirs(data_dir, exist_ok=True)
            exec_path = os.path.join(data_dir, "mitigation_executions.json")
            data = {}
            if os.path.exists(exec_path):
                try:
                    with open(exec_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                except Exception:
                    data = {}
            data[exec_id] = execution
            with open(exec_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass

        # Sync to Google BigQuery if project/credentials are active
        try:
            from backend.scripts.seed_bigquery import sync_mitigation_execution_to_bigquery
            sync_mitigation_execution_to_bigquery(execution)
        except Exception:
            pass

        return execution

    @classmethod
    def list_mitigation_executions(cls, disruption_id: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        if disruption_id:
            cursor.execute("SELECT * FROM mitigation_executions WHERE disruption_id = ? ORDER BY executed_at DESC", (disruption_id,))
        else:
            cursor.execute("SELECT * FROM mitigation_executions ORDER BY executed_at DESC")
        rows = cursor.fetchall()
        conn.close()

        results = []
        for row in rows:
            d = dict(row)
            if d.get("execution_steps_json"):
                try:
                    d["steps"] = json.loads(d["execution_steps_json"])
                except Exception:
                    pass
            results.append(d)
        return results

    @classmethod
    def sync_all_to_bigquery(cls) -> Dict[str, Any]:
        """Backfill / synchronize all stored risks, dynamic disruptions, and mitigation executions to BigQuery."""
        results = {"risks": 0, "disruptions": 0, "executions": 0, "errors": []}
        try:
            from backend.scripts.seed_bigquery import (
                sync_batch_risks_to_bigquery,
                sync_dynamic_disruption_to_bigquery,
                sync_mitigation_execution_to_bigquery
            )
            # Sync risks
            risks = cls.list_risks()
            if risks:
                sync_batch_risks_to_bigquery(risks)
                results["risks"] = len(risks)

            # Sync disruptions
            disruptions = cls.list_dynamic_disruptions()
            for d in disruptions:
                sync_dynamic_disruption_to_bigquery(d)
            results["disruptions"] = len(disruptions)

            # Sync executions
            executions = cls.list_mitigation_executions()
            for e in executions:
                sync_mitigation_execution_to_bigquery(e)
            results["executions"] = len(executions)
        except Exception as err:
            results["errors"].append(str(err))
        return results

# Perform initial legacy migration on module load
RiskRepository._migrate_legacy_json_to_db()
