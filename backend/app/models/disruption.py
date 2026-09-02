from enum import Enum
from typing import Optional, Dict, Any
from dataclasses import dataclass, field

class DisruptionSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class DisruptionType(str, Enum):
    SUPPLIER_DELAY = "SUPPLIER_DELAY"
    INVENTORY_SHORTAGE = "INVENTORY_SHORTAGE"
    DEMAND_SPIKE = "DEMAND_SPIKE"
    FACILITY_CLOSURE = "FACILITY_CLOSURE"
    SUPPLY_DEMAND_GAP = "SUPPLY_DEMAND_GAP"

class DisruptionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    MITIGATED = "MITIGATED"

@dataclass
class Disruption:
    disruption_id: str
    disruption_type: DisruptionType
    entity_type: str
    entity_id: str
    entity_name: str
    severity: DisruptionSeverity
    reported_at: str
    expected_duration_days: int
    description: str
    status: DisruptionStatus
    scenario_tag: str
    affected_product_id: str
    destination_warehouse_id: str
    source: str = "USER_REPORTED" # "USER_REPORTED" | "DATA_DETECTED" | "EXTERNAL_FEED"
    risk_id: Optional[str] = None
    detection_method: Optional[str] = None
    detection_confidence: Optional[float] = None
    detected_at: Optional[str] = None
    validated_at: Optional[str] = None
    detection_evidence: Optional[Dict[str, Any]] = None

