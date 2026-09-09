import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Award,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
  ShieldCheck,
  Workflow,
  Layers,
  ArrowRight
} from 'lucide-react';
import { RecoveryStrategy, StrategyScoreWeights } from '../types/supplyChain.ts';

interface StrategyMatrixProps {
  strategies: RecoveryStrategy[];
  currentWeights: StrategyScoreWeights;
  onSimulateWeights: (newWeights: StrategyScoreWeights) => void;
  isSimulating?: boolean;
}

export const StrategyMatrix: React.FC<StrategyMatrixProps> = ({
  strategies,
  currentWeights,
  onSimulateWeights,
  isSimulating
}) => {
  const [speedWeight, setSpeedWeight] = useState(currentWeights.recovery_speed_weight * 100);
  const [revWeight, setRevWeight] = useState(currentWeights.revenue_protection_weight * 100);
  const [costWeight, setCostWeight] = useState(currentWeights.cost_efficiency_weight * 100);
  const [impactWeight, setImpactWeight] = useState(currentWeights.customer_impact_weight * 100);
  const [showWeightsEditor, setShowWeightsEditor] = useState(false);
  const [expandedStrategyId, setExpandedStrategyId] = useState<string | null>(null);

  const handleApplyWeights = () => {
    const total = speedWeight + revWeight + costWeight + impactWeight;
    // Normalize to 1.0
    const normalized: StrategyScoreWeights = {
      recovery_speed_weight: Number((speedWeight / total).toFixed(2)),
      revenue_protection_weight: Number((revWeight / total).toFixed(2)),
      cost_efficiency_weight: Number((costWeight / total).toFixed(2)),
      customer_impact_weight: Number((impactWeight / total).toFixed(2))
    };
    onSimulateWeights(normalized);
  };

  const handleResetDefaults = () => {
    setSpeedWeight(30);
    setRevWeight(25);
    setCostWeight(25);
    setImpactWeight(20);
    onSimulateWeights({
      recovery_speed_weight: 0.30,
      revenue_protection_weight: 0.25,
      cost_efficiency_weight: 0.25,
      customer_impact_weight: 0.20
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedStrategyId(expandedStrategyId === id ? null : id);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8" id="strategy-comparison-section">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-indigo-100 text-indigo-700">
              <Award className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Deterministic Strategy Evaluation & Alternate Solution Deep-Dives
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Objective mathematical ranking combining Speed (30%), Revenue Protection (25%), Cost (25%), and SLA Impact (20%). Click any option to inspect its full operational & commercial business case.
          </p>
        </div>

        {/* Weights Simulation Toggle Button */}
        <button
          id="toggle-weights-simulator-btn"
          onClick={() => setShowWeightsEditor(!showWeightsEditor)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition ${
            showWeightsEditor
              ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
              : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
          <span>{showWeightsEditor ? 'Close Simulator' : 'What-If Weight Simulation'}</span>
        </button>
      </div>

      {/* Interactive Weight Adjustment Box */}
      {showWeightsEditor && (
        <div className="p-5 rounded-xl bg-slate-900 text-white mb-6 border border-slate-800 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Adjust Business Priority Weights (Deterministic Re-Scoring)
            </span>
            <button
              onClick={handleResetDefaults}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Speed Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Recovery Speed:</span>
                <span className="font-bold text-indigo-400">{speedWeight}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="70"
                value={speedWeight}
                onChange={(e) => setSpeedWeight(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Revenue Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Revenue Protection:</span>
                <span className="font-bold text-emerald-400">{revWeight}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="70"
                value={revWeight}
                onChange={(e) => setRevWeight(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Cost Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Cost Efficiency:</span>
                <span className="font-bold text-amber-400">{costWeight}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="70"
                value={costWeight}
                onChange={(e) => setCostWeight(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Impact Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Customer SLA Impact:</span>
                <span className="font-bold text-rose-400">{impactWeight}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="70"
                value={impactWeight}
                onChange={(e) => setImpactWeight(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-400">
              Weights are normalized dynamically to calculate composite ranking index.
            </span>
            <button
              onClick={handleApplyWeights}
              disabled={isSimulating}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isSimulating ? 'Recalculating...' : 'Re-Score Strategies'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Full Comparison Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3">Rank & Strategy</th>
              <th className="py-3 px-3">Recovery Speed</th>
              <th className="py-3 px-3">Total Cost</th>
              <th className="py-3 px-3">Orders Delayed</th>
              <th className="py-3 px-3">Revenue Protected</th>
              <th className="py-3 px-3">Risk Index</th>
              <th className="py-3 px-3 text-right">Composite Score</th>
              <th className="py-3 px-3 text-center">Business Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {strategies.map((strat, idx) => {
              const rank = strat.score_breakdown?.rank || idx + 1;
              const isWinner = rank === 1;
              const isExpanded = expandedStrategyId === strat.strategy_id;

              return (
                <React.Fragment key={strat.strategy_id}>
                  <tr
                    onClick={() => toggleExpand(strat.strategy_id)}
                    className={`cursor-pointer transition ${
                      isWinner
                        ? 'bg-indigo-50/70 font-medium hover:bg-indigo-100/60'
                        : isExpanded
                        ? 'bg-slate-100 font-medium'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Strategy Info */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isWinner
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          #{rank}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {strat.strategy_name}
                            {isWinner && (
                              <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-emerald-600 text-white shadow-sm">
                                RECOMMENDED
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{strat.strategy_type}</div>
                        </div>
                      </div>
                    </td>

                    {/* Recovery Days */}
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-slate-900">{strat.recovery_days} Days</span>
                      <div className="text-[10px] text-slate-500">
                        Score: {strat.score_breakdown?.recovery_speed_score?.toFixed(0)}/100
                      </div>
                    </td>

                    {/* Cost */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold text-slate-900">
                        ₹{strat.total_cost.toLocaleString('en-IN')}
                      </span>
                      <div className="text-[10px] text-slate-500">
                        Score: {strat.score_breakdown?.cost_efficiency_score?.toFixed(0)}/100
                      </div>
                    </td>

                    {/* Orders Delayed */}
                    <td className="py-3.5 px-3">
                      <span className={`font-bold ${strat.delayed_orders > 20 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {strat.delayed_orders} Orders
                      </span>
                      <div className="text-[10px] text-slate-500">
                        {strat.priority_orders_delayed} Priority SLA
                      </div>
                    </td>

                    {/* Revenue Protected */}
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-emerald-700">
                        ₹{(strat.revenue_protected / 10000000).toFixed(2)} Cr
                      </span>
                      <div className="text-[10px] text-slate-500">
                        ₹{(strat.revenue_at_risk / 10000000).toFixed(2)} Cr at risk
                      </div>
                    </td>

                    {/* Operational Risk */}
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        strat.operational_risk_score <= 30
                          ? 'bg-emerald-100 text-emerald-800'
                          : strat.operational_risk_score <= 50
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {strat.operational_risk_score.toFixed(0)} / 100
                      </span>
                    </td>

                    {/* Final Score */}
                    <td className="py-3.5 px-3 text-right">
                      <span className={`text-base font-extrabold font-mono ${
                        isWinner ? 'text-indigo-700' : 'text-slate-700'
                      }`}>
                        {strat.final_score?.toFixed(1) || strat.score_breakdown?.weighted_total?.toFixed(1)}
                      </span>
                      <span className="text-[11px] text-slate-400"> / 100</span>
                    </td>

                    {/* Expand Toggle */}
                    <td className="py-3.5 px-3 text-center">
                      <button className="p-1 rounded hover:bg-slate-200 text-slate-500">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Strategy Deep-Dive Row */}
                  {isExpanded && (
                    <tr className="bg-slate-900 text-white">
                      <td colSpan={8} className="p-5 border-y border-slate-800">
                        <div className="space-y-4 text-xs">
                          {/* Header and Type */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${
                                  isWinner ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                                }`}>
                                  Option #{rank}: {strat.strategy_id}
                                </span>
                                <h4 className="font-bold text-base text-white">{strat.strategy_name}</h4>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{strat.strategy_type}</div>
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              {strat.roi_multiplier ? (
                                <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-700">
                                  {strat.roi_multiplier}x ROI on Spend
                                </span>
                              ) : null}
                              <span className="px-2.5 py-1 rounded bg-slate-800 text-indigo-300 font-mono border border-slate-700">
                                Score: {strat.final_score?.toFixed(1)}/100
                              </span>
                            </div>
                          </div>

                          {/* Business Rationale Narrative */}
                          {strat.business_rationale && (
                            <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/80 leading-relaxed text-slate-200">
                              <strong className="text-indigo-300 block mb-1 uppercase tracking-wider text-[10px]">
                                Business Rationale & Commercial Justification:
                              </strong>
                              {strat.business_rationale}
                            </div>
                          )}

                          {/* Operational Approach */}
                          {strat.approach_summary && (
                            <div className="p-3.5 rounded-lg bg-slate-800/50 border border-slate-700/50 leading-relaxed text-slate-300">
                              <strong className="text-emerald-400 block mb-1 uppercase tracking-wider text-[10px]">
                                Operational Approach & Mechanics:
                              </strong>
                              {strat.approach_summary}
                            </div>
                          )}

                          {/* Pros & Cons Matrix */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {/* Pros */}
                            <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
                              <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                Strategic Advantages & Business Value
                              </div>
                              <ul className="space-y-1.5 text-slate-300 text-[11px]">
                                {(strat.pros || [
                                  `Rapid delivery in ${strat.recovery_days} days.`,
                                  `Protects ₹${(strat.revenue_protected / 10000000).toFixed(2)} Cr revenue.`
                                ]).map((p, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span>{p}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Cons */}
                            <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-800/40">
                              <div className="text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                Strategic Bottlenecks & Trade-Offs
                              </div>
                              <ul className="space-y-1.5 text-slate-300 text-[11px]">
                                {(strat.cons || [
                                  `Mitigation expenditure: ₹${strat.total_cost.toLocaleString('en-IN')}`,
                                  `${strat.delayed_orders} orders will experience delayed fulfillment.`
                                ]).map((c, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-rose-400 font-bold">✕</span>
                                    <span>{c}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Action Steps Preview */}
                          {strat.actions && strat.actions.length > 0 && (
                            <div className="pt-2">
                              <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Workflow className="w-3.5 h-3.5 text-indigo-400" />
                                Action Steps Executed Under This Option ({strat.actions.length} Steps)
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                {strat.actions.map((act, i) => (
                                  <div key={i} className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
                                    <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400 mb-1">
                                      <span className="font-bold text-emerald-400">Step {act.step}: {act.action_type}</span>
                                      <span className="font-mono">{act.estimated_time_days}d</span>
                                    </div>
                                    <div className="text-slate-200 text-[11px] leading-snug mb-2">{act.description}</div>
                                    <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-700/50">
                                      <span className="text-indigo-300">{act.responsible_entity}</span>
                                      <span className="font-mono font-bold text-amber-300">₹{act.cost.toLocaleString('en-IN')}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Helper Footer */}
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span>Click on any alternate strategy row to expand its full operational & commercial business breakdown.</span>
        </div>
        <span className="font-semibold text-slate-700">{strategies.length} Candidate Options Evaluated</span>
      </div>
    </section>
  );
};

