import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Truck,
  Warehouse,
  Send,
  FileCheck,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { RecoveryStrategy, Disruption } from '../types/supplyChain.ts';
import { recordMitigationExecution } from '../services/api.ts';

interface ExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: RecoveryStrategy;
  disruption: Disruption;
  onExecutionComplete?: (execution: any) => void;
}

export const ExecutionModal: React.FC<ExecutionModalProps> = ({
  isOpen,
  onClose,
  strategy,
  disruption,
  onExecutionComplete
}) => {
  const [step, setStep] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState<boolean>(true);
  const [isPersisted, setIsPersisted] = useState<boolean>(false);

  const executionSteps = [
    {
      title: 'Validating Authorization & Budget Approval',
      desc: `Allocating ₹${strategy.total_cost.toLocaleString('en-IN')} mitigation budget.`,
      system: 'SAP ERP Financials'
    },
    {
      title: 'Generating Inter-Facility Transfer Orders',
      desc: 'Routing surplus inventory from Mumbai and Delhi hubs with expedited freight tags.',
      system: 'Warehouse Management System (WMS)'
    },
    {
      title: 'Issuing Expedited Supplier Purchase Order',
      desc: 'Transmitting electronic PO to Delta Dynamics with ISO 9001 quality audit check.',
      system: 'Procurement EDI Gateway'
    },
    {
      title: 'Re-Sequencing Customer Order Queue',
      desc: 'Protecting priority enterprise SLA accounts to maintain 0 customer churn.',
      system: 'Order Management System (OMS)'
    }
  ];

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setIsExecuting(true);
      setIsPersisted(false);
      return;
    }

    const timer1 = setTimeout(() => setStep(1), 500);
    const timer2 = setTimeout(() => setStep(2), 1200);
    const timer3 = setTimeout(() => setStep(3), 1900);
    const timer4 = setTimeout(async () => {
      setStep(4);
      setIsExecuting(false);

      // Persist mitigation authorization to backend DB
      try {
        const executionPayload = {
          execution_id: `EXEC_${disruption.disruption_id.replace('DISR_', '')}_${Date.now()}`,
          disruption_id: disruption.disruption_id,
          strategy_id: strategy.strategy_id,
          strategy_name: strategy.strategy_name,
          authorized_budget: strategy.total_cost,
          executed_at: new Date().toISOString(),
          status: 'SUCCESS',
          steps: executionSteps
        };
        const res = await recordMitigationExecution(executionPayload);
        setIsPersisted(true);
        if (onExecutionComplete) {
          onExecutionComplete(res.execution || executionPayload);
        }
      } catch (err) {
        console.error('Failed to persist mitigation execution to DB:', err);
      }
    }, 2600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [isOpen, disruption.disruption_id, strategy.strategy_id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl text-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded bg-emerald-500 text-slate-950">
                  Execution Dispatch
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {strategy.strategy_id}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Executing: {strategy.strategy_name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Target Impact Snapshot */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Recovery Target:</span>
              <span className="text-sm font-bold text-white">{strategy.recovery_days} Days</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Revenue Protected:</span>
              <span className="text-sm font-bold text-emerald-400">
                ₹{(strategy.revenue_protected / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Disruption:</span>
              <span className="text-sm font-bold text-slate-200 truncate block">{disruption.scenario_tag}</span>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="space-y-3">
            {executionSteps.map((s, idx) => {
              const isDone = step > idx;
              const isCurrent = step === idx;

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isDone
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-slate-200'
                      : isCurrent
                      ? 'bg-indigo-950/40 border-indigo-500/60 text-white shadow-md ring-1 ring-indigo-500/30'
                      : 'bg-slate-800/30 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : isCurrent ? (
                          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center text-[10px] text-slate-500">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-100">{s.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{s.desc}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700 hidden sm:inline">
                      {s.system}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {isExecuting ? (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Broadcasting multi-system API dispatch commands...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Mitigation Strategy Successfully Activated & Logged</span>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            disabled={isExecuting}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition flex items-center gap-2"
          >
            <span>{isExecuting ? 'Processing...' : 'Close & Monitor Live Recovery'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
