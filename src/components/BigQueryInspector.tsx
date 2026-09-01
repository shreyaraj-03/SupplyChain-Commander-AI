import React, { useState } from 'react';
import { Database, Terminal, Code2, Server, Search, CheckCircle2, Play, Copy, Check } from 'lucide-react';

interface BigQueryInspectorProps {
  disruptionId: string;
}

export const BigQueryInspector: React.FC<BigQueryInspectorProps> = ({ disruptionId }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'suppliers' | 'disruptions'>('inventory');
  const [copied, setCopied] = useState(false);

  const queryCatalog = {
    inventory: {
      title: 'Inventory Agent: Multi-Hub Safety Stock Query',
      table: 'supply_chain_analytics.inventory',
      latency: '24ms',
      recordsReturned: 5,
      sql: `SELECT 
    i.inventory_id,
    w.warehouse_id,
    w.warehouse_name,
    w.city,
    w.state,
    i.current_stock,
    i.safety_stock,
    (i.current_stock - i.safety_stock) AS available_transfer_surplus,
    w.lead_time_days_to_dest AS transfer_days,
    (w.transfer_cost_per_unit * (i.current_stock - i.safety_stock)) AS est_transfer_cost
FROM 
    \`supply_chain_analytics.inventory\` AS i
JOIN 
    \`supply_chain_analytics.warehouses\` AS w 
    ON i.warehouse_id = w.warehouse_id
WHERE 
    i.product_id = 'PROD_001'
    AND i.current_stock > i.safety_stock
ORDER BY 
    w.lead_time_days_to_dest ASC;`
    },
    orders: {
      title: 'Business Impact Agent: Blast Radius & SLA Exposure',
      table: 'supply_chain_analytics.customer_orders',
      latency: '31ms',
      recordsReturned: 180,
      sql: `SELECT 
    co.region,
    COUNT(co.order_id) AS total_orders_affected,
    SUM(co.quantity * co.unit_price) AS revenue_at_risk,
    SUM(CASE WHEN co.customer_priority = 'TIER_1_ENTERPRISE' THEN 1 ELSE 0 END) AS priority_sla_orders,
    SUM(CASE WHEN co.customer_priority = 'TIER_1_ENTERPRISE' THEN co.quantity * co.unit_price ELSE 0 END) AS priority_revenue_at_risk
FROM 
    \`supply_chain_analytics.customer_orders\` AS co
WHERE 
    co.product_id = 'PROD_001'
    AND co.order_status = 'PENDING_FULFILLMENT'
    AND co.promised_delivery_date <= DATE_ADD(CURRENT_DATE(), INTERVAL 14 DAY)
GROUP BY 
    co.region
ORDER BY 
    revenue_at_risk DESC;`
    },
    suppliers: {
      title: 'Supplier Agent: Alternative Vendor Performance Query',
      table: 'supply_chain_analytics.supplier_performance',
      latency: '18ms',
      recordsReturned: 4,
      sql: `SELECT 
    s.supplier_id,
    s.supplier_name,
    s.location,
    s.iso_certified,
    sp.on_time_delivery_rate,
    sp.defect_rate_ppm,
    sp.reliability_score,
    s.expedite_unit_cost,
    s.expedite_lead_time_days,
    ((s.expedite_unit_cost - p.baseline_unit_cost) / p.baseline_unit_cost * 100) AS cost_premium_pct
FROM 
    \`supply_chain_analytics.suppliers\` AS s
JOIN 
    \`supply_chain_analytics.supplier_performance\` AS sp 
    ON s.supplier_id = sp.supplier_id
JOIN 
    \`supply_chain_analytics.products\` AS p 
    ON s.product_id = p.product_id
WHERE 
    s.product_id = 'PROD_001'
    AND s.supplier_id != 'SUPP_ALPHA' -- Exclude primary disrupted supplier
    AND sp.reliability_score >= 0.85
ORDER BY 
    s.expedite_lead_time_days ASC,
    sp.reliability_score DESC;`
    },
    disruptions: {
      title: 'Commander Agent: Active Disruption Event Ingestion',
      table: 'supply_chain_analytics.disruptions',
      latency: '12ms',
      recordsReturned: 1,
      sql: `SELECT 
    d.disruption_id,
    d.disruption_type,
    d.severity,
    d.affected_product_id,
    p.product_name,
    d.destination_warehouse_id,
    w.warehouse_name AS destination_facility,
    d.expected_duration_days,
    d.reported_at,
    d.description
FROM 
    \`supply_chain_analytics.disruptions\` AS d
JOIN 
    \`supply_chain_analytics.products\` AS p 
    ON d.affected_product_id = p.product_id
JOIN 
    \`supply_chain_analytics.warehouses\` AS w 
    ON d.destination_warehouse_id = w.warehouse_id
WHERE 
    d.disruption_id = '${disruptionId}'
LIMIT 1;`
    }
  };

  const currentQuery = queryCatalog[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentQuery.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-white" id="bigquery-mcp-inspector">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              BigQuery MCP Tool Query Inspector
              <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                GCP Live Analytical Engine
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Deterministic SQL executed across <span className="font-mono text-slate-300">supply_chain_analytics.*</span> datasets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-400">
            ⚡ Latency: {currentQuery.latency}
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-indigo-300">
            📊 Rows: {currentQuery.recordsReturned}
          </span>
        </div>
      </div>

      {/* Query Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-3 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Inventory Rebalancing SQL
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Customer Orders Blast Radius
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
            activeTab === 'suppliers'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Alternative Supplier Performance
        </button>
        <button
          onClick={() => setActiveTab('disruptions')}
          className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
            activeTab === 'disruptions'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Active Disruption Telemetry
        </button>
      </div>

      {/* Query Code Block */}
      <div className="relative">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-t-lg border-t border-x border-slate-800 text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            Target: {currentQuery.table}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy SQL'}</span>
          </button>
        </div>

        <pre className="p-3.5 rounded-b-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed max-h-52">
          <code>{currentQuery.sql}</code>
        </pre>
      </div>
    </div>
  );
};
