import React from 'react';
import { Warehouse, Truck, Check, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { InventoryResult, SupplierResult } from '../types/supplyChain.ts';

interface InventorySupplierViewProps {
  inventory: InventoryResult;
  supplier: SupplierResult;
}

export const InventorySupplierView: React.FC<InventorySupplierViewProps> = ({ inventory, supplier }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* 1. Inventory Redistribution Capabilities */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between" id="inventory-agent-panel">
        <div>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-amber-100 text-amber-700">
                <Warehouse className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Warehouse Inventory Rebalancing</h3>
                <p className="text-xs text-slate-500">Evaluated inter-hub surplus stocks across network</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              {inventory.total_transferable_units} Units Available
            </span>
          </div>

          <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {inventory.risk_assessment}
          </p>

          {/* Transfer Plans Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-semibold">
                  <th className="py-2 px-2.5">Source Facility</th>
                  <th className="py-2 px-2.5">Transfer Qty</th>
                  <th className="py-2 px-2.5">Transit Days</th>
                  <th className="py-2 px-2.5">Transfer Cost</th>
                  <th className="py-2 px-2.5">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {inventory.plans.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-2.5 font-medium">{p.source_warehouse_name}</td>
                    <td className="py-2.5 px-2.5 font-bold text-indigo-700">{p.quantity} Units</td>
                    <td className="py-2.5 px-2.5">{p.transfer_days} Days</td>
                    <td className="py-2.5 px-2.5 font-mono">₹{p.transfer_cost.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.safety_stock_deficit_risk === 'LOW'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.safety_stock_deficit_risk} RISK
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Total Transfer Cost: <strong className="text-slate-900 font-mono">₹{inventory.total_transfer_cost.toLocaleString('en-IN')}</strong></span>
          <span>Lead Time: <strong className="text-slate-900">{inventory.total_recovery_days} Days</strong></span>
        </div>
      </section>

      {/* 2. Alternative Supplier Sourcing */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between" id="supplier-agent-panel">
        <div>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-blue-100 text-blue-700">
                <Truck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Alternative Supplier Catalog</h3>
                <p className="text-xs text-slate-500">Pre-qualified vendor reliability & expedite metrics</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-100 text-blue-800 border border-blue-200">
              {supplier.alternatives.length} Qualified Vendors
            </span>
          </div>

          <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {supplier.market_tradeoff_summary}
          </p>

          {/* Supplier Cards List */}
          <div className="space-y-2.5">
            {supplier.alternatives.map((alt) => (
              <div
                key={alt.supplier_id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between text-xs transition"
              >
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    {alt.supplier_name}
                    {alt.supplier_id === supplier.recommended_supplier_id && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded">
                        Top Sourcing Option
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">{alt.location}</div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="font-bold text-slate-900">{alt.lead_time_days} Days Lead</div>
                    <div className="text-[11px] text-slate-500">{(alt.reliability_score * 100).toFixed(0)}% Reliability</div>
                  </div>

                  <div>
                    <div className="font-bold text-slate-900 font-mono">
                      ₹{(alt.unit_cost / 1000).toFixed(0)}k/unit
                    </div>
                    <div className={`text-[11px] font-semibold ${alt.additional_cost_percentage > 10 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      +{alt.additional_cost_percentage}% premium
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Target Batch: <strong className="text-slate-900">420 Units</strong></span>
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> ISO 9001 Audited Vendors
          </span>
        </div>
      </section>
    </div>
  );
};
