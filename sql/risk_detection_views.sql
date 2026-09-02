-- =============================================================================
-- SupplyChain Commander AI - Risk Detection BigQuery Analytical Views & DDL
-- Dataset: supply_chain_analytics
-- Optimized for partition-aware querying, pre-aggregated run rates, and risk detection.
-- =============================================================================

-- 1. Daily Product Demand & Historical Moving Baseline View
CREATE OR REPLACE VIEW `supply_chain_analytics.v_daily_product_demand` AS
WITH daily_orders AS (
  SELECT
    product_id,
    warehouse_id,
    order_date,
    COUNT(order_id) AS total_orders,
    SUM(quantity) AS daily_units_demanded,
    SUM(order_value) AS daily_order_value,
    COUNTIF(priority IN ('CRITICAL', 'HIGH')) AS priority_orders
  FROM `supply_chain_analytics.customer_orders`
  GROUP BY product_id, warehouse_id, order_date
),
moving_averages AS (
  SELECT
    product_id,
    warehouse_id,
    order_date,
    daily_units_demanded,
    daily_order_value,
    AVG(daily_units_demanded) OVER(
      PARTITION BY product_id, warehouse_id
      ORDER BY order_date
      ROWS BETWEEN 14 PRECEDING AND 1 PRECEDING
    ) AS historical_baseline_demand_14d,
    AVG(daily_units_demanded) OVER(
      PARTITION BY product_id, warehouse_id
      ORDER BY order_date
      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS recent_avg_demand_3d
  FROM daily_orders
)
SELECT
  product_id,
  warehouse_id,
  order_date,
  daily_units_demanded,
  historical_baseline_demand_14d,
  recent_avg_demand_3d,
  SAFE_DIVIDE(recent_avg_demand_3d - historical_baseline_demand_14d, historical_baseline_demand_14d) AS demand_surge_ratio
FROM moving_averages;

-- 2. Inventory Days of Supply & Safety Stock Health View
CREATE OR REPLACE VIEW `supply_chain_analytics.v_inventory_days_of_supply` AS
WITH recent_run_rates AS (
  SELECT
    product_id,
    warehouse_id,
    SAFE_DIVIDE(SUM(quantity), 7.0) AS avg_daily_burn_rate
  FROM `supply_chain_analytics.customer_orders`
  WHERE order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  GROUP BY product_id, warehouse_id
)
SELECT
  i.inventory_id,
  i.product_id,
  p.product_name,
  i.warehouse_id,
  w.warehouse_name,
  i.available_quantity,
  i.reserved_quantity,
  i.safety_stock,
  i.in_transit_quantity,
  COALESCE(r.avg_daily_burn_rate, SAFE_DIVIDE(p.reorder_point, 10.0)) AS avg_daily_demand,
  SAFE_DIVIDE(
    GREATEST(0, i.available_quantity - (i.reserved_quantity * 0.5)),
    COALESCE(r.avg_daily_burn_rate, SAFE_DIVIDE(p.reorder_point, 10.0))
  ) AS days_of_supply,
  CASE
    WHEN i.available_quantity < (i.safety_stock * 0.5) THEN 'CRITICAL_DEPLETION'
    WHEN i.available_quantity < i.safety_stock THEN 'SAFETY_BUFFER_BREACH'
    ELSE 'HEALTHY'
  END AS inventory_health_status
FROM `supply_chain_analytics.inventory` AS i
JOIN `supply_chain_analytics.products` AS p ON i.product_id = p.product_id
JOIN `supply_chain_analytics.warehouses` AS w ON i.warehouse_id = w.warehouse_id
LEFT JOIN recent_run_rates AS r ON i.product_id = r.product_id AND i.warehouse_id = r.warehouse_id;

-- 3. Supplier Performance Trends (30-Day Rolling Comparison)
CREATE OR REPLACE VIEW `supply_chain_analytics.v_supplier_performance_trends` AS
SELECT
  sp.supplier_id,
  s.supplier_name,
  s.reliability_score AS baseline_reliability,
  sp.on_time_delivery_rate AS recent_otd_rate,
  (s.reliability_score - sp.on_time_delivery_rate) AS otd_deterioration_rate,
  sp.average_delay_days,
  sp.quality_score,
  sp.orders_fulfilled,
  CASE
    WHEN (s.reliability_score - sp.on_time_delivery_rate) >= 0.20 THEN 'CRITICAL_DETERIORATION'
    WHEN (s.reliability_score - sp.on_time_delivery_rate) >= 0.10 THEN 'WARNING_DECAY'
    ELSE 'NOMINAL'
  END AS supplier_health_status
FROM `supply_chain_analytics.supplier_performance` AS sp
JOIN `supply_chain_analytics.suppliers` AS s ON sp.supplier_id = s.supplier_id;

-- 4. Delayed Shipments Linked to Downstream Customer Exposure
CREATE OR REPLACE VIEW `supply_chain_analytics.v_shipment_delay_metrics` AS
SELECT
  s.shipment_id,
  s.supplier_id,
  sup.supplier_name,
  s.product_id,
  p.product_name,
  s.destination_warehouse AS destination_warehouse_id,
  w.warehouse_name,
  s.quantity AS shipment_quantity,
  s.planned_arrival,
  s.estimated_arrival,
  s.delay_days,
  s.status AS shipment_status,
  s.tracking_code,
  COUNT(o.order_id) AS exposed_customer_orders_count,
  COUNTIF(o.priority IN ('CRITICAL', 'HIGH')) AS exposed_critical_sla_count,
  COALESCE(SUM(o.order_value), s.quantity * p.selling_price) AS downstream_revenue_exposure
FROM `supply_chain_analytics.shipments` AS s
JOIN `supply_chain_analytics.products` AS p ON s.product_id = p.product_id
JOIN `supply_chain_analytics.warehouses` AS w ON s.destination_warehouse = w.warehouse_id
JOIN `supply_chain_analytics.suppliers` AS sup ON s.supplier_id = sup.supplier_id
LEFT JOIN `supply_chain_analytics.customer_orders` AS o 
  ON s.product_id = o.product_id 
  AND s.destination_warehouse = o.warehouse_id
WHERE s.delay_days >= 2 OR s.status = 'DELAYED'
GROUP BY 
  s.shipment_id, s.supplier_id, sup.supplier_name, s.product_id, p.product_name,
  s.destination_warehouse, w.warehouse_name, s.quantity, s.planned_arrival,
  s.estimated_arrival, s.delay_days, s.status, s.tracking_code, p.selling_price;

-- 5. Projected 14-Day Supply-Demand Gap Analysis
CREATE OR REPLACE VIEW `supply_chain_analytics.v_projected_supply_demand_gap` AS
WITH committed_orders AS (
  SELECT
    product_id,
    warehouse_id,
    SUM(quantity) AS committed_order_demand,
    COUNT(order_id) AS pending_order_count,
    COUNTIF(priority IN ('CRITICAL', 'HIGH')) AS critical_order_count,
    SUM(order_value) AS total_order_value
  FROM `supply_chain_analytics.customer_orders`
  GROUP BY product_id, warehouse_id
),
inbound_freight AS (
  SELECT
    product_id,
    destination_warehouse AS warehouse_id,
    SUM(quantity) AS in_transit_supply
  FROM `supply_chain_analytics.shipments`
  WHERE status IN ('IN_TRANSIT', 'SCHEDULED')
  GROUP BY product_id, destination_warehouse
)
SELECT
  i.product_id,
  p.product_name,
  i.warehouse_id,
  w.warehouse_name,
  i.available_quantity,
  i.safety_stock,
  COALESCE(inf.in_transit_supply, i.in_transit_quantity) AS in_transit_supply,
  (i.available_quantity + COALESCE(inf.in_transit_supply, i.in_transit_quantity)) AS projected_supply,
  (COALESCE(co.committed_order_demand, 0) + i.safety_stock) AS projected_demand,
  GREATEST(0, (COALESCE(co.committed_order_demand, 0) + i.safety_stock) - (i.available_quantity + COALESCE(inf.in_transit_supply, i.in_transit_quantity))) AS supply_deficit_units,
  (GREATEST(0, (COALESCE(co.committed_order_demand, 0) + i.safety_stock) - (i.available_quantity + COALESCE(inf.in_transit_supply, i.in_transit_quantity))) * p.selling_price) AS projected_revenue_deficit,
  co.pending_order_count,
  co.critical_order_count
FROM `supply_chain_analytics.inventory` AS i
JOIN `supply_chain_analytics.products` AS p ON i.product_id = p.product_id
JOIN `supply_chain_analytics.warehouses` AS w ON i.warehouse_id = w.warehouse_id
LEFT JOIN committed_orders AS co ON i.product_id = co.product_id AND i.warehouse_id = co.warehouse_id
LEFT JOIN inbound_freight AS inf ON i.product_id = inf.product_id AND i.warehouse_id = inf.warehouse_id;

-- 6. Warehouse Capacity Utilization & Inbound Congestion Risk
CREATE OR REPLACE VIEW `supply_chain_analytics.v_warehouse_capacity_utilization` AS
WITH inbound_units AS (
  SELECT
    destination_warehouse AS warehouse_id,
    SUM(quantity) AS scheduled_inbound_units
  FROM `supply_chain_analytics.shipments`
  WHERE status IN ('IN_TRANSIT', 'SCHEDULED')
  GROUP BY destination_warehouse
)
SELECT
  w.warehouse_id,
  w.warehouse_name,
  w.city,
  w.capacity,
  w.utilization_rate AS current_utilization_rate,
  CAST(w.capacity * w.utilization_rate AS INT64) AS occupied_units,
  COALESCE(iu.scheduled_inbound_units, 0) AS scheduled_inbound_units,
  SAFE_DIVIDE(CAST(w.capacity * w.utilization_rate AS INT64) + COALESCE(iu.scheduled_inbound_units, 0), w.capacity) AS projected_utilization_rate,
  CASE
    WHEN SAFE_DIVIDE(CAST(w.capacity * w.utilization_rate AS INT64) + COALESCE(iu.scheduled_inbound_units, 0), w.capacity) >= 0.95 THEN 'CRITICAL_CONGESTION'
    WHEN SAFE_DIVIDE(CAST(w.capacity * w.utilization_rate AS INT64) + COALESCE(iu.scheduled_inbound_units, 0), w.capacity) >= 0.90 THEN 'HIGH_UTILIZATION'
    WHEN w.utilization_rate >= 0.85 THEN 'WARNING_LEVEL'
    ELSE 'BALANCED'
  END AS capacity_risk_status
FROM `supply_chain_analytics.warehouses` AS w
LEFT JOIN inbound_units AS iu ON w.warehouse_id = iu.warehouse_id;
