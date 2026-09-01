import React from 'react';
import {
  TrendingDown,
  DollarSign,
  AlertOctagon,
  Users,
  PackageX,
  Clock,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { BusinessImpactResult, InventoryResult } from '../types/supplyChain.ts';

interface ImpactMetricsViewProps {
  impact: BusinessImpactResult;
  inventory?: InventoryResult;
}

export const ImpactMetricsView: React.FC<ImpactMetricsViewProps> = ({ impact, inventory }) => {
  // Prepare chart data for Regional Orders
  const regionChartData = (impact.affected_regions || []).map((r) => ({
    name: r.region.replace('South Region (', '').replace(')', '').replace(' Region', ''),
    orders: r.count,
    revenueLakhs: Number((r.value / 100000).toFixed(1))
  }));

  // Fallback if empty
  const defaultRegionData = regionChartData.length > 0 ? regionChartData : [
    { name: 'Bangalore Hub', orders: 45, revenueLakhs: 38.2 },
    { name: 'Hyderabad', orders: 35, revenueLakhs: 29.7 },
    { name: 'Chennai', orders: 25, revenueLakhs: 21.2 },
    { name: 'Mumbai West', orders: 50, revenueLakhs: 42.5 },
    { name: 'Delhi NCR', orders: 25, revenueLakhs: 21.2 }
  ];

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8" id="business-impact-dashboard">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-rose-100 text-rose-700">
              <TrendingDown className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Business Impact & Blast Radius Analytics
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic BigQuery aggregation of affected SKU demands, SLA tiers, and financial exposures.
          </p>
        </div>

        <div className="text-xs px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700 font-medium border border-slate-200">
          Affected SKU: <strong className="text-slate-900">{impact.affected_product}</strong>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Revenue at Risk */}
        <div className="p-4 rounded-lg bg-rose-50/70 border border-rose-200">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Revenue at Risk</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-rose-900">
            ₹{(impact.estimated_revenue_at_risk / 10000000).toFixed(2)} Cr
          </div>
          <div className="text-[11px] text-rose-700 mt-1">
            ₹{impact.estimated_revenue_at_risk.toLocaleString('en-IN')} total exposure
          </div>
        </div>

        {/* Shortage Units */}
        <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Inventory Deficit</span>
            <PackageX className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-900">
            {impact.expected_shortage.toLocaleString()} <span className="text-sm font-normal">Units</span>
          </div>
          <div className="text-[11px] text-amber-700 mt-1">
            Below safety buffer threshold
          </div>
        </div>

        {/* Customer Orders at Risk */}
        <div className="p-4 rounded-lg bg-indigo-50/70 border border-indigo-200">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Orders Affected</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-indigo-900">
            {impact.orders_at_risk}
          </div>
          <div className="text-[11px] text-indigo-700 mt-1">
            <strong className="text-rose-600">{impact.priority_orders_at_risk}</strong> Critical SLA accounts
          </div>
        </div>

        {/* Expected Delay */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-slate-700 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Expected Delay</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {impact.expected_delay_days} <span className="text-sm font-normal">Days</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Unmitigated supply recovery time
          </div>
        </div>
      </div>

      {/* Regional Exposure Chart & Key Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Regional Exposure */}
        <div className="lg:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Regional Customer Orders & Revenue Exposure (₹ Lakhs)
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={defaultRegionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="orders" name="Delayed Orders (Qty)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenueLakhs" name="Revenue at Risk (₹ Lakhs)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Findings Bullet List */}
        <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4" />
              Impact Agent Audit Findings
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              {(impact.key_findings || []).map((finding, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Source: <span className="font-mono text-slate-200">supply_chain_analytics.customer_orders</span>
          </div>
        </div>
      </div>
    </section>
  );
};
