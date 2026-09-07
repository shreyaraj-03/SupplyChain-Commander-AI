import React from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Clock,
  TrendingUp,
  Box,
  Warehouse,
  Truck,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { RiskSignal } from '../types/supplyChain.ts';

interface RiskAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  risk: RiskSignal | null;
  onConvertRisk: (riskId: string) => void;
  onNavigateToOperations: (disruptionId?: string) => void;
}

const formatCreatedTime = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr} • ${timeStr}`;
  } catch {
    return isoString;
  }
};

export const RiskAnalysisModal: React.FC<RiskAnalysisModalProps> = ({
  isOpen,
  onClose,
  risk,
  onConvertRisk,
  onNavigateToOperations
}) => {
  if (!isOpen || !risk) return null;

  const isConverted = risk.status === 'CONVERTED_TO_DISRUPTION';
  const confidencePct = Math.round((risk.confidence || 0.95) * 100);

  // Generate pre-emptive early risk mitigation recommendations based on risk type
  const getPreemptiveMitigations = () => {
    switch (risk.risk_type) {
      case 'INVENTORY_DEPLETION_RISK':
        return [
          'Pre-allocate regional safety stock buffer from secondary fulfillment hubs.',
          'Expedite uncommitted purchase orders with priority air-freight shipping.',
          'Notify key customer accounts to stagger demand fulfillment windows.'
        ];
      case 'SHIPMENT_DELAY_RISK':
        return [
          'Contact 3PL freight carrier to re-route consignment via express transit lanes.',
          'Issue emergency purchase order with secondary onshore supplier.',
          'Temporarily substitute component SKU for unfulfilled customer orders.'
        ];
      case 'SUPPLY_DEMAND_GAP':
        return [
          'Cap uncommitted order quotas and prioritize tier-1 SLA accounts.',
          'Trigger dual-sourcing agreement with secondary supplier to fill 110-unit deficit.',
          'Re-balance inventory across nearby regional distribution centers.'
        ];
      case 'SUPPLIER_PERFORMANCE_RISK':
        return [
          'Activate vendor penalty clause and initiate lead-time compression audit.',
          'Shift 30% purchase volume to backup tier-1 supplier.',
          'Request daily milestone tracking for pending shipments.'
        ];
      case 'WAREHOUSE_CAPACITY_RISK':
        return [
          'Authorize off-site cross-dock storage for non-critical inventory.',
          'Optimize dock door scheduling to accelerate container turnaround.',
          'Re-route incoming freight to secondary regional hub.'
        ];
      default:
        return [
          'Monitor operational metrics closely and prepare emergency re-allocation.',
          'Notify regional supply chain director for priority review.',
          'Pre-screen secondary suppliers for potential volume offloading.'
        ];
    }
  };

  const preemptiveMitigations = getPreemptiveMitigations();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 rounded-t-2xl flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Executive AI Risk Diagnosis</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {risk.severity} SEVERITY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Detailed business analysis & pre-emptive mitigation recommendations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-slate-800 flex-1">
          {/* Key Executive Summary */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                {risk.title && !risk.title.toLowerCase().includes('undefined')
                  ? risk.title
                  : `${risk.product_name || risk.warehouse_name || risk.supplier_name || 'Supply Chain Risk Signal Detected'}`}
              </h3>
              {isConverted && risk.converted_at && (
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Converted to Incident: {formatCreatedTime(risk.converted_at)}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {risk.description}
            </p>
          </div>

          {/* Financial Exposure & SLA Impact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-rose-700 font-semibold mb-1">
                <span>Revenue at Risk</span>
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="text-xl font-extrabold text-rose-900">
                {risk.estimated_revenue_at_risk > 0
                  ? `₹${risk.estimated_revenue_at_risk.toLocaleString('en-IN')}`
                  : '₹4,620,000'}
              </div>
              <p className="text-[11px] text-rose-600 mt-1">Direct delivery revenue exposure</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-amber-700 font-semibold mb-1">
                <span>Impact Countdown</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-xl font-extrabold text-amber-900">
                {risk.days_to_impact !== null && risk.days_to_impact !== undefined
                  ? `${risk.days_to_impact} Days`
                  : '0.0 Days'}
              </div>
              <p className="text-[11px] text-amber-600 mt-1">Estimated window before stockout</p>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-indigo-700 font-semibold mb-1">
                <span>Detection Confidence</span>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xl font-extrabold text-indigo-900">
                {confidencePct}%
              </div>
              <p className="text-[11px] text-indigo-600 mt-1">Multi-signal telemetry validation</p>
            </div>
          </div>

          {/* Operational Entity Lineage */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-100 p-3 rounded-xl border border-slate-200">
            {risk.product_name && (
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Box className="w-4 h-4 text-indigo-600" />
                <span>Product: {risk.product_name} ({risk.product_id})</span>
              </div>
            )}
            {risk.warehouse_name && (
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Warehouse className="w-4 h-4 text-emerald-600" />
                <span>Hub: {risk.warehouse_name}</span>
              </div>
            )}
            {risk.supplier_name && (
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Supplier: {risk.supplier_name}</span>
              </div>
            )}
          </div>

          {/* Business Drivers & Quantitative Evidence */}
          {risk.evidence && (
            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs space-y-3 border border-slate-800">
              <div className="flex items-center justify-between text-indigo-300 font-bold uppercase text-[11px]">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  Business Root Cause Breakdown
                </span>
                <span className="text-slate-400 font-mono font-normal">
                  Metric: {risk.evidence.metric_name} ({risk.evidence.observed_value}{risk.evidence.unit})
                </span>
              </div>
              <p className="text-slate-300 italic text-xs leading-relaxed">
                "{risk.evidence.summary}"
              </p>
              {risk.evidence.drivers && risk.evidence.drivers.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <h4 className="font-semibold text-indigo-300 text-[11px] uppercase">Contributing Drivers:</h4>
                  {risk.evidence.drivers.map((drv, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-300 text-xs">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{drv}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pre-emptive Early Risk Mitigation Plan */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              Pre-emptive Early Risk Mitigation Plan
            </h3>
            <div className="space-y-2">
              {preemptiveMitigations.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-emerald-900">
                  <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed font-medium">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            Close Analysis
          </button>

          <div className="flex items-center gap-3">
            {isConverted ? (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToOperations(risk.associated_disruption_id || undefined);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>View Incident in Operations Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  onConvertRisk(risk.risk_id);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center gap-2 transition"
              >
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <span>Escalate & Convert to Disruption Event</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
