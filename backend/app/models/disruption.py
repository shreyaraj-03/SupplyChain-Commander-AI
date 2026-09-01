from enum import Enum
from typing import Optional
from dataclasses import dataclass

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
