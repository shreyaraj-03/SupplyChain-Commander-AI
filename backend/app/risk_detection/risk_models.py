"""
SupplyChain Commander AI - Risk Detection Domain Models
Strongly typed definitions for risk signals, evidence, severities, statuses, and audit records.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone

class RiskType(str, Enum):
    DEMAND_SPIKE = "DEMAND_SPIKE"
    INVENTORY_DEPLETION_RISK = "INVENTORY_DEPLETION_RISK"
    SUPPLIER_PERFORMANCE_RISK = "SUPPLIER_PERFORMANCE_RISK"
    SHIPMENT_DELAY_RISK = "SHIPMENT_DELAY_RISK"
    SUPPLY_DEMAND_GAP = "SUPPLY_DEMAND_GAP"
    WAREHOUSE_CAPACITY_RISK = "WAREHOUSE_CAPACITY_RISK"

class RiskSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class RiskStatus(str, Enum):
    DETECTED = "DETECTED"
    VALIDATING = "VALIDATING"
    VALIDATED = "VALIDATED"
    CONVERTED_TO_DISRUPTION = "CONVERTED_TO_DISRUPTION"
    MONITORING = "MONITORING"
    DISMISSED = "DISMISSED"
    RESOLVED = "RESOLVED"

@dataclass
class RiskEvidence:
    """Quantitative, traceable mathematical evidence explaining why a risk was flagged."""
    metric_name: str
    observed_value: float
    baseline_value: float
    threshold_value: float
    unit: str
    summary: str
    drivers: List[str] = field(default_factory=list)
    raw_details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class RiskSignal:
    """Structured Risk Signal emitted by deterministic detectors."""
    risk_id: str
    risk_type: RiskType
    severity: RiskSeverity
    status: RiskStatus
    source: str = "DATA_ANALYSIS"
    title: str = ""
    description: str = ""
    
    # Entity References
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    warehouse_id: Optional[str] = None
    warehouse_name: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    
    # Quantitative & Validation Metrics
    metric: str = ""
    metric_value: float = 0.0
    threshold: float = 0.0
    confidence: float = 0.85 # Detection Confidence (0.00 - 1.00)
    estimated_revenue_at_risk: float = 0.0
    orders_affected_count: int = 0
    days_to_impact: Optional[float] = None
    
    # Evidence & Correlation
    evidence: Optional[RiskEvidence] = None
    correlated_risk_ids: List[str] = field(default_factory=list)
    validation_score: float = 0.0 # 0 - 100
    
    # Timestamps & Lineage
    detected_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    validated_at: Optional[str] = None
    converted_at: Optional[str] = None
    associated_disruption_id: Optional[str] = None
    dismissal_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["risk_type"] = self.risk_type.value
        d["severity"] = self.severity.value
        d["status"] = self.status.value
        if self.evidence:
            d["evidence"] = self.evidence.to_dict()
        return d

@dataclass
class RiskDetectionRun:
    """Execution telemetry record for a scheduled or manual risk detection run."""
    run_id: str
    started_at: str
    completed_at: str
    duration_ms: int
    trigger_type: str # "SCHEDULED" | "MANUAL" | "EVENT"
    products_analyzed_count: int = 0
    inventory_records_analyzed_count: int = 0
    orders_analyzed_count: int = 0
    shipments_analyzed_count: int = 0
    suppliers_analyzed_count: int = 0
    
    # Outcomes
    total_risks_detected: int = 0
    risks_by_type: Dict[str, int] = field(default_factory=dict)
    risks_by_severity: Dict[str, int] = field(default_factory=dict)
    validated_risks_count: int = 0
    disruptions_created_count: int = 0
    duplicates_suppressed_count: int = 0
    status: str = "SUCCESS" # "SUCCESS" | "FAILED"
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class RiskAuditRecord:
    """Immutable audit trail entry for risk transitions and decision logs."""
    audit_id: str
    risk_id: str
    action: str # "DETECTED" | "VALIDATED" | "CONVERTED_TO_DISRUPTION" | "CORRELATED" | "DISMISSED" | "SUPPRESSED_DUPLICATE"
    timestamp: str
    detector: str
    severity: str
    decision_summary: str
    evidence_snapshot: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
