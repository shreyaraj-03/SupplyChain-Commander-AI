import React from 'react';
import {
  AlertTriangle,
  Clock,
  Box,
  MapPin,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowRight,
  Activity,
  Layers,
  TrendingUp,
  DollarSign,
  Building2,
  Truck
} from 'lucide-react';
import { Disruption, MitigationExecution } from '../types/supplyChain.ts';

interface DisruptionSelectorProps {
  disruptions: Disruption[];
  selectedDisruptionId: string | null;
  onSelect: (disruption: Disruption) => void;
  onInvestigate: (disruptionId: string) => void;
  isInvestigating: boolean;
  executions?: MitigationExecution[];
  onOpenExecutionLogs?: (disruption: Disruption) => void;
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

const getHubCity = (warehouseId?: string) => {
  if (!warehouseId) return 'Main Logistics Hub';
  const map: Record<string, string> = {
    WH_BLR: 'Bangalore Central Depot',
    WH_DEL: 'Delhi NCR Logistics Depot',
    WH_BOM: 'Mumbai West Hub',
    WH_HYD: 'Hyderabad Mega Hub',
    WH_MAA: 'Chennai Coastal Center'
  };
  return map[warehouseId] || warehouseId;
};

const formatRevenue = (num?: number) => {
  if (!num) return null;
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
};

export const DisruptionSelector: React.FC<DisruptionSelectorProps> = ({
  disruptions,
  selectedDisruptionId,
  onSelect,
  onInvestigate,
  isInvestigating,
  executions = [],
  onOpenExecutionLogs
}) => {
  const executionsMap = new Map<string, MitigationExecution>();
  for (const exec of executions) {
    if (exec.disruption_id) {
      executionsMap.set(exec.disruption_id, exec);
    }
  }

  const isDisruptionExecuting = (d: Disruption) => {
    return d.status === 'IN_EXECUTION' || d.status === 'MITIGATED' || executionsMap.has(d.disruption_id);
  };

  const pendingDisruptions = disruptions.filter((d) => !isDisruptionExecuting(d));
  const executingDisruptions = disruptions.filter((d) => isDisruptionExecuting(d));

  return (
    <div className="space-y-8 mb-8" id="disruptions-hub">
      {/* SECTION 1: ACTIVE INCIDENTS REQUIRING MITIGATION */}
      <section id="active-disruptions-section">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Active Supply Chain Incidents Requiring Mitigation
            </h2>
            <p className="text-sm text-slate-500">
              Select an incident to evaluate multi-agent blast radius, simulate strategic score weights, and authorize autonomous recovery.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 shadow-sm">
            {pendingDisruptions.length} Actionable Incidents
          </span>
        </div>

        {pendingDisruptions.length === 0 ? (
          <div className="p-6 bg-white border border-slate-200 rounded-xl text-center text-slate-500 text-sm shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="font-semibold text-slate-800">All Detected Incidents Have Been Authorized & Mitigated!</div>
            <div className="text-xs text-slate-500 mt-1">Review live autonomous progress in the section below or scan the AI Risk Radar.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {pendingDisruptions.map((d) => {
              const isSelected = selectedDisruptionId === d.disruption_id;
              const severityColors = {
                CRITICAL: 'bg-rose-50 border-rose-300 text-rose-700 font-bold',
                HIGH: 'bg-amber-50 border-amber-300 text-amber-700 font-bold',
                MEDIUM: 'bg-yellow-50 border-yellow-300 text-yellow-700 font-semibold',
                LOW: 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
              }[d.severity];

              const isAiDetected = d.source === 'DATA_DETECTED' || d.disruption_id.startsWith('DISR_AUTO_');
              const ev = d.detection_evidence;
              const revAtRisk = d.revenue_at_risk || (ev?.raw_details?.revenue_at_risk as number | undefined);
              const ordersAtRisk = d.orders_affected_count || (ev?.raw_details?.orders_at_risk_count as number | undefined) || (ev?.raw_details?.order_count as number | undefined);

              return (
                <div
                  key={d.disruption_id}
                  id={`disruption-card-${d.disruption_id}`}
                  onClick={() => onSelect(d)}
                  className={`cursor-pointer rounded-xl border p-5 transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 text-white border-indigo-500 shadow-xl ring-2 ring-indigo-500/40'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <div>
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded border tracking-wider ${
                          isSelected ? 'bg-indigo-950 text-indigo-300 border-indigo-700' : severityColors
                        }`}>
                          {d.severity} SEVERITY
                        </span>
                        {isAiDetected ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                            isSelected
                              ? 'bg-purple-950/80 text-purple-300 border-purple-700'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            <Sparkles className="w-2.5 h-2.5" />
                            AI DATA-DETECTED
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isSelected
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            SYSTEM REPORTED
                          </span>
                        )}
                      </div>

                      <span className={`text-xs font-semibold flex items-center gap-1 flex-shrink-0 ${
                        isSelected ? 'text-amber-300' : 'text-amber-600'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        {d.expected_duration_days}d Lead Impact
                      </span>
                    </div>

                    {/* Disruption Title / Scenario Tag */}
                    <h3 className={`font-bold text-base mb-2 leading-snug ${
                      isSelected ? 'text-white' : 'text-slate-900'
                    }`}>
                      {d.scenario_tag && d.scenario_tag.trim() !== 'AI Detected:'
                        ? d.scenario_tag.replace('AI Detected: ', '')
                        : `${d.disruption_type ? d.disruption_type.replace('_', ' ') : 'Disruption'} (${d.affected_product_id})`}
                    </h3>

                    {/* Full Visible Description (No truncation) */}
                    <div className={`text-xs mb-4 leading-relaxed p-3 rounded-lg border ${
                      isSelected
                        ? 'bg-slate-800/80 text-slate-200 border-slate-700/80'
                        : 'bg-slate-50 text-slate-700 border-slate-100'
                    }`}>
                      {d.description}
                    </div>

                    {/* Rich Business Context Grid */}
                    <div className="space-y-2 text-xs mb-4">
                      {/* Product & Warehouse */}
                      <div className={`flex items-center justify-between gap-2 p-2 rounded-lg ${
                        isSelected ? 'bg-slate-800/50' : 'bg-slate-50/80'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          <span className="truncate">Product: <strong className="font-semibold">{d.affected_product_id}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-right flex-shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-medium">{getHubCity(d.destination_warehouse_id)}</span>
                        </div>
                      </div>

                      {/* Financial & Order Impact if available */}
                      {(revAtRisk || ordersAtRisk) && (
                        <div className={`flex items-center justify-between gap-2 p-2 rounded-lg border ${
                          isSelected
                            ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                            : 'bg-rose-50/70 border-rose-200/80 text-rose-900'
                        }`}>
                          {revAtRisk ? (
                            <span className="flex items-center gap-1 font-semibold">
                              <DollarSign className="w-3.5 h-3.5 text-rose-500" />
                              Revenue Exposure: <strong className="font-bold">{formatRevenue(revAtRisk)}</strong>
                            </span>
                          ) : <span />}
                          {ordersAtRisk ? (
                            <span className="text-[11px] font-medium text-right">
                              {ordersAtRisk} Customer Orders
                            </span>
                          ) : null}
                        </div>
                      )}

                      {/* Ingestion Time */}
                      {d.reported_at && (
                        <div className={`flex items-center gap-2 text-[11px] px-1 ${
                          isSelected ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Detected: {formatCreatedTime(d.reported_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button Footer */}
                  <div className={`pt-3 border-t mt-auto flex items-center justify-between ${
                    isSelected ? 'border-slate-800' : 'border-slate-100'
                  }`}>
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      isSelected ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/50' : 'bg-slate-100 text-slate-600'
                    }`}>
                      #{d.disruption_id.replace('DISR_AUTO_', '').replace('DISR_', '')}
                    </span>

                    <button
                      id={`investigate-btn-${d.disruption_id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(d);
                        onInvestigate(d.disruption_id);
                      }}
                      disabled={isInvestigating}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                        isSelected
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                          : 'bg-slate-900 hover:bg-indigo-700 text-white shadow-sm'
                      } disabled:opacity-50`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isInvestigating && isSelected ? 'Analyzing Agents...' : 'Investigate Strategy'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: DEDICATED IN-EXECUTION & MITIGATED DISRUPTIONS */}
      <section id="in-execution-disruptions-section" className="pt-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Mitigations In Execution & Autonomous Recovery
            </h2>
            <p className="text-sm text-slate-500">
              Disruptions where multi-agent mitigation solutions have been accepted and dispatched to ERP, WMS, and EDI systems.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            {executingDisruptions.length} Mitigations Executing
          </span>
        </div>

        {executingDisruptions.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-slate-500 text-sm">
            <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="font-semibold text-slate-700">No Active Mitigations Currently in Execution</div>
            <div className="text-xs text-slate-500 mt-1">
              Select an incident above, review the recommended AI strategy, and click <strong className="text-emerald-700">"Authorize & Execute Mitigation"</strong> to initiate autonomous dispatch.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {executingDisruptions.map((d) => {
              const isSelected = selectedDisruptionId === d.disruption_id;
              const execRecord = executionsMap.get(d.disruption_id);

              return (
                <div
                  key={d.disruption_id}
                  id={`executing-disruption-${d.disruption_id}`}
                  onClick={() => onSelect(d)}
                  className={`cursor-pointer rounded-xl border p-5 transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 text-white border-emerald-500 shadow-xl ring-2 ring-emerald-500/40'
                      : 'bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 text-slate-900 border-emerald-200 hover:border-emerald-300 hover:shadow-lg'
                  }`}
                >
                  <div>
                    {/* Execution Pill & Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded uppercase bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                        IN EXECUTION
                      </span>
                      <span className={`text-xs font-mono font-semibold ${isSelected ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        {execRecord?.execution_id || 'EXEC_ACTIVE'}
                      </span>
                    </div>

                    {/* Disruption Title */}
                    <h3 className="font-bold text-base mb-2 leading-snug">
                      {d.scenario_tag && d.scenario_tag.trim() !== 'AI Detected:'
                        ? d.scenario_tag.replace('AI Detected: ', '')
                        : `${d.disruption_type ? d.disruption_type.replace('_', ' ') : 'Disruption'} (${d.affected_product_id})`}
                    </h3>

                    {/* Description */}
                    <p className={`text-xs mb-3 leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                      {d.description}
                    </p>

                    {/* Accepted Strategy Badge */}
                    <div className={`text-xs font-semibold p-3 rounded-lg mb-3 border ${
                      isSelected
                        ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                        : 'bg-emerald-100/70 border-emerald-300 text-emerald-900'
                    }`}>
                      <div className="text-[10px] uppercase font-bold text-emerald-600 mb-0.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Accepted Solution Strategy
                      </div>
                      <div className="font-bold text-sm">{execRecord?.strategy_name || 'Autonomous Multi-Facility Rebalancing'}</div>
                    </div>

                    {/* Key Attributes & Telemetry */}
                    <div className="space-y-1.5 text-xs mb-4">
                      <div className={`flex items-center justify-between ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                        <span className="flex items-center gap-1.5">
                          <Box className="w-3.5 h-3.5 text-indigo-400" />
                          Product: <strong>{d.affected_product_id}</strong>
                        </span>
                        <span>Hub: <strong>{getHubCity(d.destination_warehouse_id)}</strong></span>
                      </div>

                      {execRecord?.authorized_budget ? (
                        <div className={`flex items-center justify-between ${isSelected ? 'text-emerald-300' : 'text-emerald-800'}`}>
                          <span>Authorized Budget:</span>
                          <strong className="font-mono">₹{execRecord.authorized_budget.toLocaleString('en-IN')}</strong>
                        </div>
                      ) : null}

                      {execRecord?.executed_at && (
                        <div className={`flex items-center gap-1.5 text-[11px] ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Clock className="w-3 h-3 text-emerald-500" />
                          <span>Dispatched: {formatCreatedTime(execRecord.executed_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Execution Action Footer */}
                  <div className={`pt-3 border-t mt-auto flex items-center justify-between ${
                    isSelected ? 'border-slate-800' : 'border-emerald-200'
                  }`}>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>ERP & WMS SYNCED</span>
                    </div>

                    <button
                      id={`telemetry-btn-${d.disruption_id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(d);
                        if (onOpenExecutionLogs) {
                          onOpenExecutionLogs(d);
                        } else {
                          onInvestigate(d.disruption_id);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        isSelected
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
                          : 'bg-slate-900 hover:bg-emerald-800 text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>View Solution</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

