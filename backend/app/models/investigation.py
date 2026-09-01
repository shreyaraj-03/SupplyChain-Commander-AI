from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from .disruption import Disruption
from .agent_results import BusinessImpactResult, InventoryResult, SupplierResult
from .strategy import RecoveryStrategy, StrategyScoreWeights

@dataclass
class AgentExecutionLog:
    agent_name: str
    status: str  # 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED'
    started_at: str
    summary: str
    completed_at: Optional[str] = None
    duration_ms: Optional[int] = None
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    structured_output: Optional[Any] = None

@dataclass
class Investigation:
    investigation_id: str
    disruption_id: str
    status: str  # 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
    started_at: str
    disruption_snapshot: Disruption
    scoring_weights: StrategyScoreWeights
    completed_at: Optional[str] = None
    impact_result: Optional[BusinessImpactResult] = None
    inventory_result: Optional[InventoryResult] = None
    supplier_result: Optional[SupplierResult] = None
    strategies: List[RecoveryStrategy] = field(default_factory=list)
    recommended_strategy_id: Optional[str] = None
    recommended_strategy: Optional[RecoveryStrategy] = None
    ai_explanation: Optional[Dict[str, Any]] = None
    agent_logs: List[AgentExecutionLog] = field(default_factory=list)
