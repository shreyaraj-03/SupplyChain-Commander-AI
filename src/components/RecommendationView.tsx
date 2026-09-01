import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Zap,
  Target,
  FileCheck2,
  Workflow,
  Send
} from 'lucide-react';
import { ExplanationResult, RecoveryStrategy } from '../types/supplyChain.ts';

interface RecommendationViewProps {
  explanation: ExplanationResult;
  recommendedStrategy: RecoveryStrategy;
  onExecuteMitigation?: () => void;
}

export const RecommendationView: React.FC<RecommendationViewProps> = ({
  explanation,
  recommendedStrategy,
  onExecuteMitigation
}) => {
  const [showAuditTree, setShowAuditTree] = useState(true);

  return (
    <div className="space-y-6 mb-8" id="ai-recommendation-hub">
      {/* 1. Executive AI Recommendation Card */}
      <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded bg-emerald-500 text-slate-950">
                  AI Autonomous Decision
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Strategy ID: {recommendedStrategy.strategy_id}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                {recommendedStrategy.strategy_name}
              </h2>
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {recommendedStrategy.final_score?.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ 100</span>
            </div>
            <div className="text-[11px] text-slate-400">Composite Ranking Index</div>
          </div>
        </div>

        {/* Executive Summary */}
        <p className="text-sm text-slate-200 leading-relaxed mb-6 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
          {explanation.executive_summary}
        </p>

        {/* Why this strategy won metrics banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-xs">
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 block mb-1">Recovery Speed:</span>
            <span className="text-base font-bold text-white">{recommendedStrategy.recovery_days} Days</span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">Fastest to resolve</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 block mb-1">Revenue Protected:</span>
            <span className="text-base font-bold text-emerald-400">
              ₹{(recommendedStrategy.revenue_protected / 10000000).toFixed(2)} Cr
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Maximum protection</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 block mb-1">Total Mitigation Cost:</span>
            <span className="text-base font-bold text-amber-300 font-mono">
              ₹{recommendedStrategy.total_cost.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">High ROI mitigation</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 block mb-1">Delayed Orders:</span>
            <span className="text-base font-bold text-white">
              {recommendedStrategy.delayed_orders} Orders
            </span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">
              {recommendedStrategy.priority_orders_delayed === 0 ? '0 Critical SLA impact' : `${recommendedStrategy.priority_orders_delayed} SLA impact`}
            </span>
          </div>
        </div>

        {/* Action Roadmap */}
        <div className="mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
            <Workflow className="w-4 h-4" />
            Execution Action Roadmap
          </h4>
          <div className="space-y-2">
            {(explanation.action_roadmap || []).map((step, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-100">{step.action}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">{step.details}</div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                    {step.timeframe}
                  </span>
                  <div className="text-[10px] text-indigo-400 mt-1 font-medium">{step.owner}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 1-Click Authorize & Dispatch Bar */}
        {onExecuteMitigation && (
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/40 p-4 rounded-xl">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Ready for Autonomous Execution
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Will dispatch inter-facility transfer orders & generate supplier purchase orders automatically.
              </div>
            </div>

            <button
              id="authorize-mitigation-btn"
              onClick={onExecuteMitigation}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg hover:shadow-emerald-500/20 transition transform active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Authorize & Execute Mitigation</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. "Why Did AI Choose This?" Explanatory Audit Tree */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div
          onClick={() => setShowAuditTree(!showAuditTree)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-indigo-100 text-indigo-700">
              <HelpCircle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Explainability & Audit Trail: Why AI Chose This Strategy
              </h3>
              <p className="text-xs text-slate-500">
                Transparent multi-agent decision chain and objective trade-off evaluation
              </p>
            </div>
          </div>

          <button className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
            {showAuditTree ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showAuditTree && (
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-6">
            {/* Step-by-Step Decision Tree */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Step 1: Disruption Ingestion */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Stage 1</div>
                <div className="font-bold text-slate-900 text-xs mb-1">Disruption Ingestion</div>
                <p className="text-[11px] text-slate-600">
                  Event detected; SKU deficit with unmitigated delay identified via BigQuery customer orders stream.
                </p>
              </div>

              {/* Step 2: Multi-Agent Sourcing */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Stage 2</div>
                <div className="font-bold text-slate-900 text-xs mb-1">Multi-Agent Sourcing</div>
                <p className="text-[11px] text-slate-600">
                  Inventory Agent surfaced surplus in Mumbai/Delhi; Supplier Agent found alternative capacity.
                </p>
              </div>

              {/* Step 3: Deterministic Scoring */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Stage 3</div>
                <div className="font-bold text-slate-900 text-xs mb-1">Scoring Evaluation</div>
                <p className="text-[11px] text-slate-600">
                  Calculated normalized composite metrics across Speed (30%), Revenue (25%), Cost (25%), Impact (20%).
                </p>
              </div>

              {/* Step 4: Autonomous Selection */}
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] uppercase font-bold text-emerald-700 mb-1">Stage 4 (Decision)</div>
                <div className="font-bold text-emerald-950 text-xs mb-1">Optimized Selection</div>
                <p className="text-[11px] text-emerald-800">
                  Top-ranked strategy achieved decisive score by cutting delay by over 70% while protecting revenue.
                </p>
              </div>
            </div>

            {/* Justification Text Block */}
            <div className="p-4 rounded-lg bg-slate-900 text-white text-xs leading-relaxed">
              <h5 className="font-bold text-indigo-300 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                Autonomous Decision Logic
              </h5>
              <p className="text-slate-300">
                {explanation.why_chosen}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
