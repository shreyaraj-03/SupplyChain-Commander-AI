import React from 'react';
import { AlertTriangle, X, ArrowRight, ShieldAlert, DollarSign, Box, Warehouse, Truck } from 'lucide-react';
import { RiskSignal } from '../types/supplyChain.ts';

interface ConvertRiskConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  risk: RiskSignal | null;
  isConverting?: boolean;
}

export const ConvertRiskConfirmationModal: React.FC<ConvertRiskConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  risk,
  isConverting
}) => {
  if (!isOpen || !risk) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Confirm Disruption Escalation</h3>
              <p className="text-xs text-slate-400">Executive Authorization Required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isConverting}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-slate-800">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Escalate Risk Signal to Active Disruption Event</span>
            </div>
            <p className="text-xs text-amber-950 leading-relaxed font-medium">
              Are you sure you want to escalate and convert this AI Risk Signal into an active Disruption Event in the Operations Center?
            </p>
          </div>

          {/* Risk Summary Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900 text-sm">{risk.title || risk.risk_id}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-rose-100 text-rose-800 border border-rose-200">
                {risk.severity} SEVERITY
              </span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">
              {risk.description}
            </p>

            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-slate-600 font-semibold">
              {risk.product_name && (
                <span className="flex items-center gap-1">
                  <Box className="w-3.5 h-3.5 text-indigo-500" />
                  {risk.product_name}
                </span>
              )}
              {risk.warehouse_name && (
                <span className="flex items-center gap-1">
                  <Warehouse className="w-3.5 h-3.5 text-emerald-500" />
                  {risk.warehouse_name}
                </span>
              )}
              {risk.supplier_name && (
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-blue-500" />
                  {risk.supplier_name}
                </span>
              )}
              {risk.estimated_revenue_at_risk > 0 && (
                <span className="text-rose-700 font-bold flex items-center gap-1 ml-auto">
                  <DollarSign className="w-3.5 h-3.5" />
                  ₹{risk.estimated_revenue_at_risk.toLocaleString('en-IN')} At Risk
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isConverting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isConverting}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center gap-2 transition disabled:opacity-50"
          >
            {isConverting ? (
              <span>Converting...</span>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <span>Confirm & Convert to Event</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
