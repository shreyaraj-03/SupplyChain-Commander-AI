"""
SupplyChain Commander AI - Risk Repository
In-memory and persisted storage for Risk Signals, Detection Runs, and Audit Trails.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import json
import os

from backend.app.risk_detection.risk_models import (
    RiskSignal,
    RiskStatus,
    RiskSeverity,
    RiskType,
    RiskDetectionRun,
    RiskAuditRecord
)

class RiskRepository:
    _risks_store: Dict[str, RiskSignal] = {}
    _runs_store: List[RiskDetectionRun] = []
    _audit_logs: List[RiskAuditRecord] = []
    _active_disruptions_cache: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def _get_dynamic_disruptions_file(cls) -> str:
        return os.path.join(os.path.dirname(__file__), "..", "..", "data", "dynamic_disruptions.json")

    @classmethod
    def save_disruption(cls, disruption: Dict[str, Any]) -> Dict[str, Any]:
        disr_id = disruption["disruption_id"]
        cls._active_disruptions_cache[disr_id] = disruption
        
        # Persist to dynamic_disruptions.json
        try:
            fpath = cls._get_dynamic_disruptions_file()
            existing: Dict[str, Any] = {}
            if os.path.exists(fpath):
                with open(fpath, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            existing[disr_id] = disruption
            with open(fpath, "w", encoding="utf-8") as f:
                json.dump(existing, f, indent=2)
        except Exception:
            pass
        return disruption

    @classmethod
    def get_disruption(cls, disruption_id: str) -> Optional[Dict[str, Any]]:
        if disruption_id in cls._active_disruptions_cache:
            return cls._active_disruptions_cache[disruption_id]
        try:
            fpath = cls._get_dynamic_disruptions_file()
            if os.path.exists(fpath):
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if disruption_id in data:
                        cls._active_disruptions_cache[disruption_id] = data[disruption_id]
                        return data[disruption_id]
        except Exception:
            pass
        return None

    @classmethod
    def list_dynamic_disruptions(cls) -> List[Dict[str, Any]]:
        try:
            fpath = cls._get_dynamic_disruptions_file()
            if os.path.exists(fpath):
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    cls._active_disruptions_cache.update(data)
        except Exception:
            pass
        return list(cls._active_disruptions_cache.values())

    @classmethod
    def _get_risks_file(cls) -> str:
        return os.path.join(os.path.dirname(__file__), "..", "..", "data", "detected_risks.json")

    @classmethod
    def save_risk(cls, risk: RiskSignal) -> RiskSignal:
        cls._risks_store[risk.risk_id] = risk
        try:
            fpath = cls._get_risks_file()
            existing: Dict[str, Any] = {}
            if os.path.exists(fpath):
                with open(fpath, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            existing[risk.risk_id] = risk.to_dict()
            with open(fpath, "w", encoding="utf-8") as f:
                json.dump(existing, f, indent=2)
        except Exception:
            pass
        return risk

    @classmethod
    def get_risk(cls, risk_id: str) -> Optional[RiskSignal]:
        if risk_id in cls._risks_store:
            return cls._risks_store[risk_id]
        cls._load_risks_from_file()
        return cls._risks_store.get(risk_id)

    @classmethod
    def _load_risks_from_file(cls):
        try:
            fpath = cls._get_risks_file()
            if os.path.exists(fpath):
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for rid, rdict in data.items():
                        if rid not in cls._risks_store:
                            ev_data = rdict.get("evidence")
                            ev = RiskEvidence(**ev_data) if ev_data else None
                            d = dict(rdict)
                            d["evidence"] = ev
                            d["risk_type"] = RiskType(d["risk_type"])
                            d["severity"] = RiskSeverity(d["severity"])
                            d["status"] = RiskStatus(d["status"])
                            sig = RiskSignal(**d)
                            cls._risks_store[rid] = sig
        except Exception:
            pass

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
        cls._load_risks_from_file()
        risks = list(cls._risks_store.values())
        
        if status:
            risks = [r for r in risks if r.status.value == status]
        if severity:
            risks = [r for r in risks if r.severity.value == severity]
        if risk_type:
            risks = [r for r in risks if r.risk_type.value == risk_type]
        if product_id:
            risks = [r for r in risks if r.product_id == product_id]
        if warehouse_id:
            risks = [r for r in risks if r.warehouse_id == warehouse_id]
        if supplier_id:
            risks = [r for r in risks if r.supplier_id == supplier_id]
            
        # Sort by severity priority (CRITICAL > HIGH > MEDIUM > LOW) and detected_at DESC
        severity_rank = {
            RiskSeverity.CRITICAL: 4,
            RiskSeverity.HIGH: 3,
            RiskSeverity.MEDIUM: 2,
            RiskSeverity.LOW: 1
        }
        risks.sort(key=lambda r: (severity_rank.get(r.severity, 0), r.detected_at), reverse=True)
        return risks

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
        risk = cls._risks_store.get(risk_id)
        if not risk:
            return None
        risk.status = new_status
        if new_status == RiskStatus.DISMISSED:
            risk.dismissal_reason = reason
        return risk

    @classmethod
    def clear(cls):
        cls._risks_store.clear()
        cls._runs_store.clear()
        cls._audit_logs.clear()
        cls._active_disruptions_cache.clear()
