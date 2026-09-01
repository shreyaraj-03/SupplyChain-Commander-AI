from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class StrategyAction:
    step: int
    action_type: str  # 'TRANSFER' | 'SOURCING' | 'EXPEDITE' | 'HOLD' | 'CUSTOMER_COMMUNICATION'
    description: str
    responsible_entity: str
    estimated_time_days: int
    cost: float

@dataclass
class StrategyScoreBreakdown:
    recovery_speed_score: float
    revenue_protection_score: float
    cost_efficiency_score: float
    customer_impact_score: float
    weighted_total: float
    rank: int

@dataclass
class RecoveryStrategy:
    strategy_id: str  # 'DO_NOTHING' | 'REDISTRIBUTE' | 'ALT_SUPPLIER' | 'HYBRID'
    strategy_name: str
    strategy_type: str
    actions: List[StrategyAction]
    total_cost: float
    recovery_days: int
    delayed_orders: int
    priority_orders_delayed: int
    revenue_at_risk: float
    revenue_protected: float
    operational_risk_score: float
    feasibility_score: float
    score_breakdown: Optional[StrategyScoreBreakdown] = None
    final_score: Optional[float] = None

@dataclass
class StrategyScoreWeights:
    recovery_speed_weight: float = 0.30
    revenue_protection_weight: float = 0.25
    cost_efficiency_weight: float = 0.25
    customer_impact_weight: float = 0.20
