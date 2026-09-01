from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class BusinessImpactResult:
    disruption_id: str
    affected_product: str
    affected_product_id: str
    expected_shortage: int
    orders_at_risk: int
    priority_orders_at_risk: int
    estimated_revenue_at_risk: float
    expected_delay_days: int
    affected_regions: List[Dict[str, Any]] = field(default_factory=list)
    key_findings: List[str] = field(default_factory=list)

@dataclass
class WarehouseRedistributionPlan:
    source_warehouse_id: str
    source_warehouse_name: str
    destination_warehouse_id: str
    destination_warehouse_name: str
    quantity: int
    unit_transfer_cost: float
    transfer_cost: float
    transfer_days: int
    remaining_source_stock: int
    safety_stock_deficit_risk: str

@dataclass
class InventoryResult:
    product_id: str
    redistribution_possible: bool
    total_transferable_units: int
    plans: List[WarehouseRedistributionPlan] = field(default_factory=list)
    total_transfer_cost: float = 0.0
    total_recovery_days: int = 0
    risk_assessment: str = ""

@dataclass
class AlternativeSupplierOption:
    supplier_id: str
    supplier_name: str
    location: str
    lead_time_days: int
    reliability_score: float
    unit_cost: float
    total_cost: float
    additional_cost_percentage: float
    available_capacity: int
    qualifies: bool
    expedited_shipping_available: bool

@dataclass
class SupplierResult:
    product_id: str
    alternatives: List[AlternativeSupplierOption] = field(default_factory=list)
    recommended_supplier_id: Optional[str] = None
    market_tradeoff_summary: str = ""
