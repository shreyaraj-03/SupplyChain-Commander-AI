-- SupplyChain Commander AI - Risk & Disruption Database Schemas
-- BigQuery Dataset: supply_chain_analytics

-- 1. BigQuery detected_risks table schema
CREATE TABLE IF NOT EXISTS `supply_chain_analytics.detected_risks` (
  risk_id STRING NOT NULL,
  risk_type STRING NOT NULL,
  severity STRING NOT NULL,
  status STRING NOT NULL,
  detection_method STRING NOT NULL,
  detection_confidence FLOAT64 NOT NULL,
  entity_type STRING NOT NULL,
  entity_id STRING NOT NULL,
  product_id STRING,
  warehouse_id STRING,
  supplier_id STRING,
  detected_at TIMESTAMP NOT NULL,
  validated_at TIMESTAMP,
  converted_at TIMESTAMP,
  converted_disruption_id STRING,
  evidence_json STRING NOT NULL
);

-- 2. BigQuery dynamic_disruptions table schema
CREATE TABLE IF NOT EXISTS `supply_chain_analytics.dynamic_disruptions` (
  disruption_id STRING NOT NULL,
  disruption_type STRING NOT NULL,
  entity_type STRING NOT NULL,
  entity_id STRING NOT NULL,
  entity_name STRING NOT NULL,
  severity STRING NOT NULL,
  reported_at TIMESTAMP NOT NULL,
  expected_duration_days INT64 NOT NULL,
  description STRING NOT NULL,
  status STRING NOT NULL,
  scenario_tag STRING NOT NULL,
  affected_product_id STRING NOT NULL,
  destination_warehouse_id STRING NOT NULL,
  source STRING NOT NULL,
  risk_id STRING,
  detection_method STRING,
  detection_confidence FLOAT64,
  detected_at TIMESTAMP,
  validated_at TIMESTAMP,
  evidence_json STRING
);

-- 3. BigQuery mitigation_executions table schema
CREATE TABLE IF NOT EXISTS `supply_chain_analytics.mitigation_executions` (
  execution_id STRING NOT NULL,
  disruption_id STRING NOT NULL,
  strategy_id STRING NOT NULL,
  strategy_name STRING NOT NULL,
  authorized_budget FLOAT64 NOT NULL,
  executed_at TIMESTAMP NOT NULL,
  status STRING NOT NULL,
  execution_steps_json STRING NOT NULL
);

-- 4. SQLite DDL for local persistent database (backend/data/supplychain_commander.db)
CREATE TABLE IF NOT EXISTS detected_risks (
  risk_id TEXT PRIMARY KEY,
  risk_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  detection_method TEXT NOT NULL,
  detection_confidence REAL NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  product_id TEXT,
  warehouse_id TEXT,
  supplier_id TEXT,
  detected_at TEXT NOT NULL,
  validated_at TEXT,
  converted_at TEXT,
  converted_disruption_id TEXT,
  evidence_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dynamic_disruptions (
  disruption_id TEXT PRIMARY KEY,
  disruption_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  reported_at TEXT NOT NULL,
  expected_duration_days INTEGER NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  scenario_tag TEXT NOT NULL,
  affected_product_id TEXT NOT NULL,
  destination_warehouse_id TEXT NOT NULL,
  source TEXT NOT NULL,
  risk_id TEXT,
  detection_method TEXT,
  detection_confidence REAL,
  detected_at TEXT,
  validated_at TEXT,
  evidence_json TEXT
);

CREATE TABLE IF NOT EXISTS mitigation_executions (
  execution_id TEXT PRIMARY KEY,
  disruption_id TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  strategy_name TEXT NOT NULL,
  authorized_budget REAL NOT NULL,
  executed_at TEXT NOT NULL,
  status TEXT NOT NULL,
  execution_steps_json TEXT NOT NULL
);
