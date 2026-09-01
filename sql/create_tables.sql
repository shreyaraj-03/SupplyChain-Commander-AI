-- SupplyChain Commander AI - BigQuery DDL Schema
-- Dataset: supply_chain_analytics

CREATE TABLE IF NOT EXISTS `supply_chain_analytics.products` (
  product_id STRING NOT NULL,
  product_name STRING NOT NULL,
  category STRING NOT NULL,
  unit_cost NUMERIC NOT NULL,
  selling_price NUMERIC NOT NULL,
  reorder_point INT64 NOT NULL,
  sku STRING NOT NULL
);

CREATE TABLE IF NOT EXISTS `supply_chain_analytics.suppliers` (
  supplier_id STRING NOT NULL,
  supplier_name STRING NOT NULL,
  location STRING NOT NULL,
  region STRING NOT NULL,
  reliability_score FLOAT64 NOT NULL,
  average_lead_days INT64 NOT NULL,
  unit_cost_multiplier FLOAT64 NOT NULL,
  capacity_per_day INT64 NOT NULL,
  contact_email STRING,
  tier INT64
);

CREATE TABLE IF NOT EXISTS `supply_chain_analytics.warehouses` (
  warehouse_id STRING NOT NULL,
  warehouse_name STRING NOT NULL,
  city STRING NOT NULL,
  region STRING NOT NULL,
  capacity INT64 NOT NULL,
  utilization_rate FLOAT64
);

CREATE TABLE IF NOT EXISTS `supply_chain_analytics.inventory` (
  inventory_id STRING NOT NULL,
  product_id STRING NOT NULL,
  warehouse_id STRING NOT NULL,
  available_quantity INT64 NOT NULL,
  reserved_quantity INT64 NOT NULL,
  in_transit_quantity INT64 NOT NULL,
  safety_stock INT64 NOT NULL,
  last_updated TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `supply_chain_analytics.customer_orders` (
  order_id STRING NOT NULL,
  product_id STRING NOT NULL,
  warehouse_id STRING NOT NULL,
  customer_name STRING NOT NULL,
  customer_region STRING NOT NULL,
  quantity INT64 NOT NULL,
  order_date DATE NOT NULL,
  promised_delivery_date DATE NOT NULL,
  priority STRING NOT NULL,
  order_value NUMERIC NOT NULL,
  status STRING NOT NULL
);

CREATE TABLE IF NOT EXISTS `supply_chain_analytics.shipments` (
  shipment_id STRING NOT NULL,
  supplier_id STRING NOT NULL,
  product_id STRING NOT NULL,
  destination_warehouse STRING NOT NULL,
  quantity INT64 NOT NULL,
  planned_arrival DATE NOT NULL,
  estimated_arrival DATE NOT NULL,
  status STRING NOT NULL,
  delay_days INT64 NOT NULL,
  tracking_code STRING
);

CREATE TABLE IF NOT EXISTS `supply_chain_analytics.disruptions` (
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
  destination_warehouse_id STRING NOT NULL
);

CREATE TABLE IF NOT EXISTS `supply_chain_analytics.supplier_performance` (
  supplier_id STRING NOT NULL,
  performance_date DATE NOT NULL,
  on_time_delivery_rate FLOAT64 NOT NULL,
  quality_score FLOAT64 NOT NULL,
  average_delay_days FLOAT64 NOT NULL,
  orders_fulfilled INT64 NOT NULL
);
