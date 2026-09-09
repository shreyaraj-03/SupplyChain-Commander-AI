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
  Send,
  TrendingUp,
  DollarSign,
  Layers,
  AlertCircle,
  Clock,
  Building2,
  Check
} from 'lucide-react';
import { ExplanationResult, RecoveryStrategy } from '../types/supplyChain.ts';

interface RecommendationViewProps {
  explanation: ExplanationResult;
  recommendedStrategy: RecoveryStrategy;
  onExecuteMitigation?: () => void;
  isExecuted?: boolean;
  executionRecord?: any;
}

export const RecommendationView: React.FC<RecommendationViewProps> = ({
  explanation,
  recommendedStrategy,
  onExecuteMitigation,
  isExecuted = false,
  executionRecord
}) => {
  const [showAuditTree, setShowAuditTree] = useState(true);

  const roi = recommendedStrategy.roi_multiplier || (
    recommendedStrategy.total_cost > 0
      ? Number((recommendedStrategy.revenue_protected / recommendedStrategy.total_cost).toFixed(1))
      : 0
  );

  const netSavings = recommendedStrategy.revenue_protected - recommendedStrategy.total_cost;

  return (
    <div className="space-y-6 mb-8" id="ai-recommendation-hub">
      {/* 1. Executive AI Recommendation Card */}
      <div className={`rounded-xl border p-6 text-white shadow-xl transition-all ${
        isExecuted
          ? 'border-emerald-500 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 ring-2 ring-emerald-500/30'
          : 'border-emerald-500/40 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shadow-inner flex-shrink-0 ${
              isExecuted
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/50'
                : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
            }`}>
              {isExecuted ? <CheckCircle2 className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {isExecuted ? (
                  <span className="text-xs uppercase font-black px-2.5 py-0.5 rounded bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                    Solution Accepted & In Execution
                  </span>
                ) : (
                  <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded bg-emerald-500 text-slate-950 shadow-sm">
                    Rank #1 Recommended Solution
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  {recommendedStrategy.strategy_type || 'Optimized Multi-Echelon'}
                </span>
                {executionRecord?.execution_id && (
                  <span className="text-[11px] text-emerald-300 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60">
                    ID: {executionRecord.execution_id}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {recommendedStrategy.strategy_name}
              </h2>
            </div>
          </div>

          <div className="text-right flex flex-col items-end flex-shrink-0">
            <div className="text-3xl font-black text-emerald-400 font-mono">
              {recommendedStrategy.final_score?.toFixed(1) || '94.2'} <span className="text-sm font-normal text-slate-400">/ 100</span>
            </div>
            <div className="text-[11px] text-slate-400">Optimization Index</div>
          </div>
        </div>

        {/* Live Execution Dispatch Badge Banner if in execution */}
        {isExecuted && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <div>
                <div className="font-bold text-emerald-300 text-sm">
                  Autonomous Multi-System Mitigation Active & Dispatched
                </div>
                <div className="text-slate-300 text-[11px] mt-0.5">
                  Inter-facility transfers sequenced • Expedited PO sent via EDI • Customer SLA priority re-allocated.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
                SAP ERP: APPROVED
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
                WMS: ROUTED
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
                EDI: DISPATCHED
              </span>
            </div>
          </div>
        )}

        {/* Executive Summary Narrative */}
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 mb-5 leading-relaxed text-slate-200 text-xs sm:text-sm">
          <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
            Executive Business Rationale & Strategic Summary
          </div>
          <p>
            {explanation.executive_summary}
          </p>
          {recommendedStrategy.approach_summary && (
            <div className="mt-3 pt-3 border-t border-slate-700/60 text-xs text-slate-300">
              <strong className="text-emerald-400">Operational Approach: </strong>
              {recommendedStrategy.approach_summary}
            </div>
          )}
        </div>

        {/* Financial & Operational KPI Quad */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-xs">
          {/* 1. Recovery Speed */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Recovery Velocity</span>
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-lg font-bold text-white">{recommendedStrategy.recovery_days} Days</div>
            <div className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Fastest to resolve
            </div>
          </div>

          {/* 2. Revenue Protected */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Revenue Protected</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-emerald-400">
              ₹{(recommendedStrategy.revenue_protected / 10000000).toFixed(2)} Cr
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {roi > 0 ? `${roi}x ROI on spend` : 'Max Protection'}
            </div>
          </div>

          {/* 3. Mitigation Capital */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Mitigation Cost</span>
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-amber-300 font-mono">
              ₹{recommendedStrategy.total_cost.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5">
              ₹{(netSavings / 10000000).toFixed(2)} Cr Net Protected
            </div>
          </div>

          {/* 4. SLA & Order Impact */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Order Fulfillment</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {recommendedStrategy.delayed_orders} Delayed
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5 font-semibold">
              {recommendedStrategy.priority_orders_delayed === 0
                ? '0 Tier-1 SLA breaches'
                : `${recommendedStrategy.priority_orders_delayed} SLA exceptions`}
            </div>
          </div>
        </div>

        {/* Action Roadmap */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Workflow className="w-4 h-4" />
              Autonomous Action Roadmap & SOP Execution Plan
            </h4>
            <span className="text-[11px] text-slate-400">
              {(explanation.action_roadmap || []).length} Coordinated Phases
            </span>
          </div>

          <div className="space-y-2.5">
            {(explanation.action_roadmap || []).map((step, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 sm:mt-0">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-slate-100 text-sm">{step.action}</div>
                    <div className="text-slate-300 text-xs mt-0.5 leading-relaxed">{step.details}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                    {step.timeframe}
                  </span>
                  <div className="px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 text-[11px] font-semibold border border-indigo-800/60">
                    {step.owner}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strategic Safeguards if present */}
        {recommendedStrategy.risk_mitigation_safeguards && recommendedStrategy.risk_mitigation_safeguards.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs">
            <h5 className="font-bold text-indigo-300 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Operational Safeguards & Network Buffer Protection
            </h5>
            <ul className="space-y-1.5 text-slate-300">
              {recommendedStrategy.risk_mitigation_safeguards.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 1-Click Authorize & Dispatch Bar */}
        {onExecuteMitigation && (
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-xl">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {isExecuted ? 'Mitigation Authorization Confirmed' : 'Ready for Autonomous Execution'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isExecuted
                  ? 'All dispatch API calls executed and recorded in database. Click to review live telemetry logs.'
                  : 'Will dispatch inter-facility transfer orders & generate supplier purchase orders automatically.'}
              </div>
            </div>

            <button
              id="authorize-mitigation-btn"
              onClick={onExecuteMitigation}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-lg transition transform active:scale-95 ${
                isExecuted
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:shadow-emerald-500/20'
              }`}
            >
              {isExecuted ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              <span>{isExecuted ? 'View Dispatch Telemetry & Logs' : 'Authorize & Execute Mitigation'}</span>
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
                Autonomous Decision Logic & Comparative Analysis
              </h5>
              <p className="text-slate-300 leading-relaxed mb-3">
                {explanation.why_chosen}
              </p>

              {explanation.trade_offs_considered && explanation.trade_offs_considered.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Trade-offs Evaluated Against Alternates:</div>
                  <ul className="space-y-1 text-slate-300 text-[11px]">
                    {explanation.trade_offs_considered.map((t, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-indigo-400 font-bold">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

