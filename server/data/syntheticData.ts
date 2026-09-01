import {
  Product,
  Supplier,
  Warehouse,
  InventoryRecord,
  CustomerOrder,
  Shipment,
  Disruption,
  SupplierPerformance
} from '../../src/types/supplyChain.ts';

export const products: Product[] = [
  {
    product_id: 'PROD_001',
    product_name: 'Laptop Pro X15 (Core i9 / 32GB)',
    category: 'Enterprise Computing',
    unit_cost: 65000,
    selling_price: 85000,
    reorder_point: 150,
    sku: 'LPT-PRO-X15-09'
  },
  {
    product_id: 'PROD_002',
    product_name: 'Edge Server Blade Ultra-R7',
    category: 'Data Center Hardware',
    unit_cost: 140000,
    selling_price: 195000,
    reorder_point: 80,
    sku: 'SRV-BLD-UR7-02'
  },
  {
    product_id: 'PROD_003',
    product_name: 'Neural Accelerator Module Tensor-X',
    category: 'AI Acceleration Silicon',
    unit_cost: 210000,
    selling_price: 290000,
    reorder_point: 50,
    sku: 'AI-TSR-ACC-99'
  },
  {
    product_id: 'PROD_004',
    product_name: 'Industrial IoT Gateway Router 5G',
    category: 'Industrial Networking',
    unit_cost: 28000,
    selling_price: 42000,
    reorder_point: 200,
    sku: 'IOT-RTR-5G-11'
  }
];

export const suppliers: Supplier[] = [
  {
    supplier_id: 'SUPP_ALPHA',
    supplier_name: 'Alpha Components Global',
    location: 'Shenzhen / Singapore Transit',
    region: 'East Asia',
    reliability_score: 0.82,
    average_lead_days: 10,
    unit_cost_multiplier: 1.0, // baseline
    capacity_per_day: 120,
    contact_email: 'dispatch@alphacomponents.io',
    tier: 1
  },
  {
    supplier_id: 'SUPP_BETA',
    supplier_name: 'Beta Electronics & Subsystems',
    location: 'Penang, Malaysia',
    region: 'Southeast Asia',
    reliability_score: 0.88,
    average_lead_days: 14,
    unit_cost_multiplier: 1.05, // +5% cost
    capacity_per_day: 200,
    contact_email: 'b2b@betaelectronics.com',
    tier: 2
  },
  {
    supplier_id: 'SUPP_GAMMA',
    supplier_name: 'Gamma India Advanced Fabrication',
    location: 'Chennai / Sri City, India',
    region: 'South Asia (Domestic)',
    reliability_score: 0.97,
    average_lead_days: 5,
    unit_cost_multiplier: 1.15, // +15% cost for high-speed & domestic reliability
    capacity_per_day: 150,
    contact_email: 'enterprise@gammaindia.in',
    tier: 1
  },
  {
    supplier_id: 'SUPP_DELTA',
    supplier_name: 'Delta Rapid Logistics & Semi',
    location: 'Hsinchu / Taipei Hub',
    region: 'East Asia',
    reliability_score: 0.92,
    average_lead_days: 7,
    unit_cost_multiplier: 1.10, // +10%
    capacity_per_day: 90,
    contact_email: 'orders@deltasemi.tw',
    tier: 2
  }
];

export const warehouses: Warehouse[] = [
  {
    warehouse_id: 'WH_BLR',
    warehouse_name: 'Bangalore Central Fulfillment Hub',
    city: 'Bangalore',
    region: 'South Region',
    capacity: 25000,
    utilization_rate: 0.88
  },
  {
    warehouse_id: 'WH_MUM',
    warehouse_name: 'Mumbai West Distribution Park',
    city: 'Mumbai',
    region: 'West Region',
    capacity: 35000,
    utilization_rate: 0.62
  },
  {
    warehouse_id: 'WH_DEL',
    warehouse_name: 'Delhi NCR Mega Logistics Depot',
    city: 'Gurugram / Delhi',
    region: 'North Region',
    capacity: 40000,
    utilization_rate: 0.71
  },
  {
    warehouse_id: 'WH_CHE',
    warehouse_name: 'Chennai Coastal Transit Depot',
    city: 'Chennai',
    region: 'South Region',
    capacity: 20000,
    utilization_rate: 0.54
  }
];

export const inventoryRecords: InventoryRecord[] = [
  // PROD_001 (Laptop Pro)
  {
    inventory_id: 'INV_001',
    product_id: 'PROD_001',
    warehouse_id: 'WH_BLR',
    available_quantity: 45, // Deficit! Expected 420 shortfall
    reserved_quantity: 180,
    in_transit_quantity: 50,
    safety_stock: 120,
    last_updated: '2026-08-22T00:00:00Z'
  },
  {
    inventory_id: 'INV_002',
    product_id: 'PROD_001',
    warehouse_id: 'WH_MUM',
    available_quantity: 480, // Substantial surplus available for transfer!
    reserved_quantity: 60,
    in_transit_quantity: 0,
    safety_stock: 100,
    last_updated: '2026-08-22T01:30:00Z'
  },
  {
    inventory_id: 'INV_003',
    product_id: 'PROD_001',
    warehouse_id: 'WH_DEL',
    available_quantity: 260, // Moderate surplus available
    reserved_quantity: 90,
    in_transit_quantity: 40,
    safety_stock: 90,
    last_updated: '2026-08-22T02:00:00Z'
  },
  {
    inventory_id: 'INV_004',
    product_id: 'PROD_001',
    warehouse_id: 'WH_CHE',
    available_quantity: 140,
    reserved_quantity: 30,
    in_transit_quantity: 0,
    safety_stock: 50,
    last_updated: '2026-08-22T01:00:00Z'
  },
  // PROD_002 (Server Blade)
  {
    inventory_id: 'INV_005',
    product_id: 'PROD_002',
    warehouse_id: 'WH_BLR',
    available_quantity: 15,
    reserved_quantity: 95,
    in_transit_quantity: 0,
    safety_stock: 50,
    last_updated: '2026-08-22T00:00:00Z'
  },
  {
    inventory_id: 'INV_006',
    product_id: 'PROD_002',
    warehouse_id: 'WH_MUM',
    available_quantity: 160,
    reserved_quantity: 30,
    in_transit_quantity: 20,
    safety_stock: 40,
    last_updated: '2026-08-22T00:00:00Z'
  },
  {
    inventory_id: 'INV_007',
    product_id: 'PROD_002',
    warehouse_id: 'WH_DEL',
    available_quantity: 110,
    reserved_quantity: 40,
    in_transit_quantity: 0,
    safety_stock: 45,
    last_updated: '2026-08-22T00:00:00Z'
  },
  // PROD_003 (Tensor-X Module)
  {
    inventory_id: 'INV_008',
    product_id: 'PROD_003',
    warehouse_id: 'WH_BLR',
    available_quantity: 20,
    reserved_quantity: 120,
    in_transit_quantity: 10,
    safety_stock: 30,
    last_updated: '2026-08-22T00:00:00Z'
  },
  {
    inventory_id: 'INV_009',
    product_id: 'PROD_003',
    warehouse_id: 'WH_MUM',
    available_quantity: 90,
    reserved_quantity: 25,
    in_transit_quantity: 0,
    safety_stock: 25,
    last_updated: '2026-08-22T00:00:00Z'
  }
];

export const customerOrders: CustomerOrder[] = [
  // Key critical enterprise customer orders affected by PROD_001 in Bangalore/South
  {
    order_id: 'ORD_901',
    product_id: 'PROD_001',
    warehouse_id: 'WH_BLR',
    customer_name: 'TechFin Global Systems',
    customer_region: 'South Region (Bangalore Hub)',
    quantity: 45,
    order_date: '2026-08-15',
    promised_delivery_date: '2026-08-24',
    priority: 'CRITICAL',
    order_value: 3825000,
    status: 'DELAYED'
  },
  {
    order_id: 'ORD_902',
    product_id: 'PROD_001',
    warehouse_id: 'WH_BLR',
    customer_name: 'Apex Healthcare Cloud',
    customer_region: 'South Region (Hyderabad)',
    quantity: 35,
    order_date: '2026-08-16',
    promised_delivery_date: '2026-08-25',
    priority: 'CRITICAL',
    order_value: 2975000,
    status: 'DELAYED'
  },
  {
    order_id: 'ORD_903',
    product_id: 'PROD_001',
    warehouse_id: 'WH_BLR',
    customer_name: 'Quantum Data Labs',
    customer_region: 'South Region (Chennai)',
    quantity: 25,
    order_date: '2026-08-17',
    promised_delivery_date: '2026-08-26',
    priority: 'HIGH',
    order_value: 2125000,
    status: 'DELAYED'
  },
  {
    order_id: 'ORD_904',
    product_id: 'PROD_001',
    warehouse_id: 'WH_BLR',
    customer_name: 'State Bank Infrastructure Network',
    customer_region: 'West Region (Mumbai)',
    quantity: 50,
    order_date: '2026-08-18',
    promised_delivery_date: '2026-08-27',
    priority: 'CRITICAL',
    order_value: 4250000,
    status: 'DELAYED'
  },
  {
    order_id: 'ORD_905',
    product_id: 'PROD_001',
    warehouse_id: 'WH_BLR',
    customer_name: 'AeroSpace Dynamic Labs',
    customer_region: 'North Region (Delhi NCR)',
    quantity: 25,
    order_date: '2026-08-19',
    promised_delivery_date: '2026-08-28',
    priority: 'HIGH',
    order_value: 2125000,
    status: 'DELAYED'
  }
];

export const shipments: Shipment[] = [
  {
    shipment_id: 'SHP_7001',
    supplier_id: 'SUPP_ALPHA',
    product_id: 'PROD_001',
    destination_warehouse: 'WH_BLR',
    quantity: 500,
    planned_arrival: '2026-08-23',
    estimated_arrival: '2026-09-02',
    status: 'DELAYED',
    delay_days: 10,
    tracking_code: 'TRK-ALPHA-8891'
  },
  {
    shipment_id: 'SHP_7002',
    supplier_id: 'SUPP_GAMMA',
    product_id: 'PROD_002',
    destination_warehouse: 'WH_DEL',
    quantity: 100,
    planned_arrival: '2026-08-25',
    estimated_arrival: '2026-08-25',
    status: 'IN_TRANSIT',
    delay_days: 0,
    tracking_code: 'TRK-GAMMA-3320'
  }
];

export const disruptions: Disruption[] = [
  {
    disruption_id: 'DISR_001',
    disruption_type: 'SUPPLIER_DELAY',
    entity_type: 'SUPPLIER',
    entity_id: 'SUPP_ALPHA',
    entity_name: 'Alpha Components Global',
    severity: 'CRITICAL',
    reported_at: '2026-08-22T01:15:00Z',
    expected_duration_days: 10,
    description: 'Supplier Alpha Components reported a severe 10-day shipment delay for core Laptop Pro components due to typhoons and semiconductor packaging line maintenance in Shenzhen/Singapore corridors.',
    status: 'ACTIVE',
    scenario_tag: 'Scenario 1: Supplier Delay (Alpha Components)',
    affected_product_id: 'PROD_001',
    destination_warehouse_id: 'WH_BLR'
  },
  {
    disruption_id: 'DISR_002',
    disruption_type: 'INVENTORY_SHORTAGE',
    entity_type: 'WAREHOUSE',
    entity_id: 'WH_BLR',
    entity_name: 'Bangalore Central Fulfillment Hub',
    severity: 'HIGH',
    reported_at: '2026-08-21T18:30:00Z',
    expected_duration_days: 7,
    description: 'Edge Server Blade Ultra-R7 local inventory is depleted below safety stock thresholds across South India regional data center orders.',
    status: 'ACTIVE',
    scenario_tag: 'Scenario 2: Warehouse Stockout (Edge Server)',
    affected_product_id: 'PROD_002',
    destination_warehouse_id: 'WH_BLR'
  },
  {
    disruption_id: 'DISR_003',
    disruption_type: 'DEMAND_SPIKE',
    entity_type: 'PRODUCT',
    entity_id: 'PROD_003',
    entity_name: 'Neural Accelerator Module Tensor-X',
    severity: 'HIGH',
    reported_at: '2026-08-22T02:00:00Z',
    expected_duration_days: 14,
    description: 'Surge in enterprise AI cluster buildout orders created an instantaneous 280% demand spike over quarterly baseline forecast.',
    status: 'ACTIVE',
    scenario_tag: 'Scenario 3: Demand Spike (AI Tensor Accelerators)',
    affected_product_id: 'PROD_003',
    destination_warehouse_id: 'WH_BLR'
  }
];

export const supplierPerformances: SupplierPerformance[] = [
  {
    supplier_id: 'SUPP_ALPHA',
    performance_date: '2026-08-01',
    on_time_delivery_rate: 0.82,
    quality_score: 0.94,
    average_delay_days: 3.8,
    orders_fulfilled: 340
  },
  {
    supplier_id: 'SUPP_BETA',
    performance_date: '2026-08-01',
    on_time_delivery_rate: 0.88,
    quality_score: 0.96,
    average_delay_days: 1.9,
    orders_fulfilled: 280
  },
  {
    supplier_id: 'SUPP_GAMMA',
    performance_date: '2026-08-01',
    on_time_delivery_rate: 0.97,
    quality_score: 0.99,
    average_delay_days: 0.4,
    orders_fulfilled: 420
  },
  {
    supplier_id: 'SUPP_DELTA',
    performance_date: '2026-08-01',
    on_time_delivery_rate: 0.92,
    quality_score: 0.95,
    average_delay_days: 1.2,
    orders_fulfilled: 190
  }
];
