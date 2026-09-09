export type DisruptionSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type DisruptionType = 'SUPPLIER_DELAY' | 'INVENTORY_SHORTAGE' | 'DEMAND_SPIKE' | 'FACILITY_CLOSURE';
export type DisruptionStatus = 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'MITIGATED' | 'IN_EXECUTION';
export type OrderPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'STANDARD';
export type AgentStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface MitigationExecutionStep {
  title: string;
  desc: string;
  system: string;
  status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  timestamp?: string;
}

export interface MitigationExecution {
  execution_id: string;
  disruption_id: string;
  strategy_id: string;
  strategy_name: string;
  authorized_budget: number;
  executed_at: string;
  status: 'IN_EXECUTION' | 'SUCCESS' | 'ACTIVE' | 'DISPATCHED' | 'FAILED';
  steps: MitigationExecutionStep[];
}

export interface Product {
  product_id: string;
  product_name: string;
  category: string;
  unit_cost: number;
  selling_price: number;
  reorder_point: number;
  sku: string;
}

export interface Supplier {
  supplier_id: string;
  supplier_name: string;
  location: string;
  region: string;
  reliability_score: number; // 0.0 - 1.0
  average_lead_days: number;
  unit_cost_multiplier: number; // e.g. 1.05 = 5% premium
  capacity_per_day: number;
  contact_email: string;
  tier: 1 | 2 | 3;
}

export interface Warehouse {
  warehouse_id: string;
  warehouse_name: string;
  city: string;
  region: string;
  capacity: number;
  utilization_rate: number;
}

export interface InventoryRecord {
  inventory_id: string;
  product_id: string;
  warehouse_id: string;
  available_quantity: number;
  reserved_quantity: number;
  in_transit_quantity: number;
  safety_stock: number;
  last_updated: string;
}

export interface CustomerOrder {
  order_id: string;
  product_id: string;
  warehouse_id: string;
  customer_name: string;
  customer_region: string;
  quantity: number;
  order_date: string;
  promised_delivery_date: string;
  priority: OrderPriority;
  order_value: number;
  status: 'PENDING' | 'CONFIRMED' | 'IN_TRANSIT' | 'DELAYED' | 'FULFILLED';
}

export interface Shipment {
  shipment_id: string;
  supplier_id: string;
  product_id: string;
  destination_warehouse: string;
  quantity: number;
  planned_arrival: string;
  estimated_arrival: string;
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'DELAYED' | 'DELIVERED';
  delay_days: number;
  tracking_code: string;
}

export interface Disruption {
  disruption_id: string;
  disruption_type: DisruptionType;
  entity_type: 'SUPPLIER' | 'WAREHOUSE' | 'PRODUCT' | 'LOGISTICS_ROUTE';
  entity_id: string;
  entity_name: string;
  severity: DisruptionSeverity;
  reported_at: string;
  expected_duration_days: number;
  description: string;
  status: DisruptionStatus;
  scenario_tag: string;
  affected_product_id: string;
  destination_warehouse_id: string;
  source?: 'STATIC' | 'DATA_DETECTED' | string;
  detection_evidence?: RiskEvidence;
  revenue_at_risk?: number;
  orders_affected_count?: number;
}

export interface SupplierPerformance {
  supplier_id: string;
  performance_date: string;
  on_time_delivery_rate: number; // e.g. 0.94
  quality_score: number; // e.g. 0.98
  average_delay_days: number;
  orders_fulfilled: number;
}

// Agent Output Contracts
export interface BusinessImpactResult {
  disruption_id: string;
  affected_product: string;
  affected_product_id: string;
  expected_shortage: number;
  orders_at_risk: number;
  priority_orders_at_risk: number;
  estimated_revenue_at_risk: number;
  expected_delay_days: number;
  affected_regions: Array<{ region: string; count: number; value: number }>;
  key_findings: string[];
}

export interface WarehouseRedistributionPlan {
  source_warehouse_id: string;
  source_warehouse_name: string;
  destination_warehouse_id: string;
  destination_warehouse_name: string;
  quantity: number;
  unit_transfer_cost: number;
  transfer_cost: number;
  transfer_days: number;
  remaining_source_stock: number;
  safety_stock_deficit_risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface InventoryResult {
  product_id: string;
  redistribution_possible: boolean;
  total_transferable_units: number;
  plans: WarehouseRedistributionPlan[];
  total_transfer_cost: number;
  total_recovery_days: number;
  risk_assessment: string;
}

export interface AlternativeSupplierOption {
  supplier_id: string;
  supplier_name: string;
  location: string;
  lead_time_days: number;
  reliability_score: number;
  unit_cost: number;
  total_cost: number;
  additional_cost_percentage: number;
  available_capacity: number;
  qualifies: boolean;
  expedited_shipping_available: boolean;
}

export interface SupplierResult {
  product_id: string;
  alternatives: AlternativeSupplierOption[];
  recommended_supplier_id?: string;
  market_tradeoff_summary: string;
}

export interface StrategyAction {
  step: number;
  action_type: 'TRANSFER' | 'SOURCING' | 'EXPEDITE' | 'HOLD' | 'CUSTOMER_COMMUNICATION';
  description: string;
  responsible_entity: string;
  estimated_time_days: number;
  cost: number;
}

export interface RecoveryStrategy {
  strategy_id: 'DO_NOTHING' | 'REDISTRIBUTE' | 'ALT_SUPPLIER' | 'HYBRID';
  strategy_name: string;
  strategy_type: string;
  actions: StrategyAction[];
  total_cost: number;
  recovery_days: number;
  delayed_orders: number;
  priority_orders_delayed: number;
  revenue_at_risk: number;
  revenue_protected: number;
  operational_risk_score: number; // 0-100 (lower is better)
  feasibility_score: number; // 0-100 (higher is better)
  score_breakdown?: StrategyScoreBreakdown;
  final_score?: number; // 0-100
  business_rationale?: string;
  approach_summary?: string;
  commercial_impact?: string;
  roi_multiplier?: number;
  pros?: string[];
  cons?: string[];
  risk_mitigation_safeguards?: string[];
}

export interface StrategyScoreWeights {
  recovery_speed_weight: number; // default 0.30
  revenue_protection_weight: number; // default 0.25
  cost_efficiency_weight: number; // default 0.25
  customer_impact_weight: number; // default 0.20
}

export interface StrategyScoreBreakdown {
  recovery_speed_score: number; // 0-100
  revenue_protection_score: number; // 0-100
  cost_efficiency_score: number; // 0-100
  customer_impact_score: number; // 0-100
  weighted_total: number;
  rank: number;
}

export interface AgentExecutionLog {
  agent_name: 'Commander Agent' | 'Business Impact Agent' | 'Inventory Agent' | 'Supplier Agent' | 'Strategy Agent' | 'Explanation Agent' | 'Scoring Engine';
  status: AgentStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  summary: string;
  tool_calls?: Array<{
    tool_name: string;
    input: Record<string, unknown>;
    output_summary: string;
    timestamp: string;
  }>;
  structured_output?: unknown;
}

export interface ActionRoadmapStep {
  step: number;
  action: string;
  owner: string;
  timeframe: string;
  details: string;
}

export interface ExplanationResult {
  executive_summary: string;
  why_chosen: string;
  trade_offs_considered: string[];
  action_roadmap: ActionRoadmapStep[];
}

export interface RiskEvidence {
  metric_name: string;
  observed_value: number;
  baseline_value: number;
  threshold_value: number;
  unit: string;
  summary: string;
  drivers: string[];
  raw_details: Record<string, any>;
}

export type RiskType =
  | 'DEMAND_SPIKE'
  | 'INVENTORY_DEPLETION_RISK'
  | 'SUPPLIER_PERFORMANCE_RISK'
  | 'SHIPMENT_DELAY_RISK'
  | 'SUPPLY_DEMAND_GAP'
  | 'WAREHOUSE_CAPACITY_RISK';

export type RiskSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type RiskStatus =
  | 'DETECTED'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'CONVERTED_TO_DISRUPTION'
  | 'MONITORING'
  | 'DISMISSED'
  | 'RESOLVED';

export interface RiskSignal {
  risk_id: string;
  risk_type: RiskType;
  severity: RiskSeverity;
  status: RiskStatus;
  source: string;
  title: string;
  description: string;
  product_id?: string;
  product_name?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  metric: string;
  metric_value: number;
  threshold: number;
  confidence: number;
  estimated_revenue_at_risk: number;
  orders_affected_count: number;
  days_to_impact?: number;
  evidence?: RiskEvidence;
  correlated_risk_ids: string[];
  validation_score: number;
  detected_at: string;
  validated_at?: string;
  converted_at?: string;
  associated_disruption_id?: string;
}

export interface RiskDetectionRun {
  run_id: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  trigger_type: string;
  products_analyzed_count: number;
  inventory_records_analyzed_count: number;
  orders_analyzed_count: number;
  shipments_analyzed_count: number;
  suppliers_analyzed_count: number;
  total_risks_detected: number;
  risks_by_type: Record<string, number>;
  risks_by_severity: Record<string, number>;
  validated_risks_count: number;
  disruptions_created_count: number;
  duplicates_suppressed_count: number;
  status: string;
}

export interface Investigation {
  investigation_id: string;
  disruption_id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  started_at: string;
  completed_at?: string;
  disruption_snapshot?: Disruption;
  impact?: BusinessImpactResult;
  inventory?: InventoryResult;
  supplier?: SupplierResult;
  strategies?: RecoveryStrategy[];
  scoring_weights: StrategyScoreWeights;
  recommended_strategy_id?: string;
  recommended_strategy?: RecoveryStrategy;
  explanation?: ExplanationResult;
  agent_logs: AgentExecutionLog[];
}


