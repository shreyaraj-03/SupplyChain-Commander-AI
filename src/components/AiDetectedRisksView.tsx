import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Play,
  TrendingUp,
  AlertOctagon,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Activity,
  Warehouse,
  Truck,
  Box,
  RefreshCw,
  Zap,
  Info
} from 'lucide-react';
import {
  RiskSignal,
  RiskType,
  RiskSeverity,
  RiskStatus,
  Disruption
} from '../types/supplyChain.ts';

interface AiDetectedRisksViewProps {
  risks: RiskSignal[];
  onScan: () => void;
  isScanning: boolean;
  onInvestigateRisk: (risk: RiskSignal) => void;
  onConvertRisk: (riskId: string) => void;
  isInvestigating: boolean;
}

export const AiDetectedRisksView: React.FC<AiDetectedRisksViewProps> = ({
  risks,
  onScan,
  isScanning,
  onInvestigateRisk,
  onConvertRisk,
  isInvestigating
}) => {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filtering logic
  const filteredRisks = risks.filter((r) => {
    if (selectedType !== 'ALL' && r.risk_type !== selectedType) return false;
    if (selectedSeverity !== 'ALL' && r.severity !== selectedSeverity) return false;
    if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchProduct = r.product_name?.toLowerCase().includes(q) || r.product_id?.toLowerCase().includes(q);
      const matchWarehouse = r.warehouse_name?.toLowerCase().includes(q) || r.warehouse_id?.toLowerCase().includes(q);
      const matchSupplier = r.supplier_name?.toLowerCase().includes(q) || r.supplier_id?.toLowerCase().includes(q);
      const matchTitle = r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      if (!matchProduct && !matchWarehouse && !matchSupplier && !matchTitle) return false;
    }
    return true;
  });

  const criticalCount = risks.filter((r) => r.severity === 'CRITICAL').length;
  const highCount = risks.filter((r) => r.severity === 'HIGH').length;
  const validatedCount = risks.filter((r) => r.status === 'VALIDATED' || r.status === 'CONVERTED_TO_DISRUPTION').length;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6" id="ai-detected-risks-section">
      {/* Header & Autonomous Trigger */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                AI DETECTED RISKS
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Continuous BigQuery Telemetry
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Deterministic mathematical early-warning engine identifying demand surges, stockout trajectories, and supply-demand deficits before operational impact.
              </p>
            </div>
          </div>
        </div>

        {/* Telemetry Pills & Action Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold border border-rose-200 flex items-center gap-1">
              🔴 {criticalCount} Critical
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold border border-amber-200 flex items-center gap-1">
              🟠 {highCount} High
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
              ✓ {validatedCount} Validated
            </span>
          </div>

          <button
            id="run-risk-scan-btn"
            onClick={onScan}
            disabled={isScanning}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 flex items-center gap-2 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Running Scan...' : 'Run Autonomous Scan'}</span>
          </button>
        </div>
      </div>

      {/* Multi-Dimensional Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search product, hub, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Risk Type Filter */}
        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          >
            <option value="ALL">All Risk Types ({risks.length})</option>
            <option value="SUPPLY_DEMAND_GAP">Supply-Demand Gap</option>
            <option value="INVENTORY_DEPLETION_RISK">Inventory Depletion</option>
            <option value="DEMAND_SPIKE">Demand Spike</option>
            <option value="SHIPMENT_DELAY_RISK">Shipment Delay</option>
            <option value="SUPPLIER_PERFORMANCE_RISK">Supplier Performance</option>
            <option value="WAREHOUSE_CAPACITY_RISK">Warehouse Capacity</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">🔴 Critical Only</option>
            <option value="HIGH">🟠 High Only</option>
            <option value="MEDIUM">🟡 Medium Only</option>
            <option value="LOW">🔵 Low Only</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          >
            <option value="ALL">All Lifecycle Statuses</option>
            <option value="VALIDATED">Validated</option>
            <option value="CONVERTED_TO_DISRUPTION">Converted to Disruption</option>
            <option value="VALIDATING">Validating</option>
            <option value="DETECTED">Detected</option>
            <option value="MONITORING">Monitoring</option>
          </select>
        </div>
      </div>

      {/* Risk Cards Grid */}
      {filteredRisks.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300 space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No Risk Signals Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {risks.length === 0
              ? 'No risks currently loaded. Click "Run Autonomous Scan" to execute the 6 deterministic detectors against BigQuery data.'
              : 'No risk signals match your filter criteria. Try resetting the filters.'}
          </p>
          {risks.length === 0 && (
            <button
              onClick={onScan}
              disabled={isScanning}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
            >
              Run Autonomous Detection Scan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredRisks.map((risk) => {
            const severityStyle = {
              CRITICAL: {
                badge: 'bg-rose-100 text-rose-800 border-rose-300',
                border: 'border-rose-200 hover:border-rose-400',
                iconColor: 'text-rose-600',
                bg: 'bg-rose-50/30'
              },
              HIGH: {
                badge: 'bg-amber-100 text-amber-800 border-amber-300',
                border: 'border-amber-200 hover:border-amber-400',
                iconColor: 'text-amber-600',
                bg: 'bg-amber-50/30'
              },
              MEDIUM: {
                badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                border: 'border-yellow-200 hover:border-yellow-400',
                iconColor: 'text-yellow-600',
                bg: 'bg-yellow-50/30'
              },
              LOW: {
                badge: 'bg-blue-100 text-blue-800 border-blue-300',
                border: 'border-blue-200 hover:border-blue-400',
                iconColor: 'text-blue-600',
                bg: 'bg-blue-50/30'
              }
            }[risk.severity];

            const typeLabel = {
              DEMAND_SPIKE: 'Demand Surge Anomaly',
              INVENTORY_DEPLETION_RISK: 'Inventory Depletion Risk',
              SUPPLIER_PERFORMANCE_RISK: 'Supplier Reliability Deterioration',
              SHIPMENT_DELAY_RISK: 'In-Transit Freight Delay',
              SUPPLY_DEMAND_GAP: 'Projected Supply-Demand Gap',
              WAREHOUSE_CAPACITY_RISK: 'Warehouse Capacity Bottleneck'
            }[risk.risk_type];

            return (
              <div
                key={risk.risk_id}
                id={`risk-card-${risk.risk_id}`}
                className={`rounded-xl border p-5 transition-all flex flex-col justify-between shadow-sm hover:shadow-md bg-white ${severityStyle.border}`}
              >
                <div className="space-y-3.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase border ${severityStyle.badge}`}>
                        {risk.severity === 'CRITICAL' && '🔴 '}
                        {risk.severity === 'HIGH' && '🟠 '}
                        {risk.severity === 'MEDIUM' && '🟡 '}
                        {risk.severity === 'LOW' && '🔵 '}
                        {risk.severity}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {typeLabel}
                      </span>
                      {risk.status === 'CONVERTED_TO_DISRUPTION' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Converted to Disruption
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {risk.status}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(risk.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {risk.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {risk.description}
                    </p>
                  </div>

                  {/* Entity Metadata Row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {risk.product_name && (
                      <div className="flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-semibold text-slate-800">{risk.product_name}</span>
                      </div>
                    )}
                    {risk.warehouse_name && (
                      <div className="flex items-center gap-1.5">
                        <Warehouse className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{risk.warehouse_name}</span>
                      </div>
                    )}
                    {risk.supplier_name && (
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-blue-500" />
                        <span>{risk.supplier_name}</span>
                      </div>
                    )}
                    {risk.estimated_revenue_at_risk > 0 && (
                      <div className="ml-auto font-bold text-rose-700">
                        ₹{risk.estimated_revenue_at_risk.toLocaleString('en-IN')} At Risk
                      </div>
                    )}
                  </div>

                  {/* Evidence Box (Traceable Quantitative Rationale) */}
                  {risk.evidence && (
                    <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl text-xs space-y-2 border border-slate-800">
                      <div className="flex items-center justify-between text-indigo-300 font-bold text-[11px] uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-indigo-400" />
                          Deterministic Evidence
                        </span>
                        <span className="text-slate-400 font-mono font-normal">
                          {risk.evidence.metric_name}: <strong className="text-white">{risk.evidence.observed_value}{risk.evidence.unit}</strong> (Threshold: {risk.evidence.threshold_value}{risk.evidence.unit})
                        </span>
                      </div>
                      <p className="text-slate-300 italic text-[11px] leading-relaxed">
                        "{risk.evidence.summary}"
                      </p>
                      {risk.evidence.drivers && risk.evidence.drivers.length > 0 && (
                        <ul className="space-y-1 text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                          {risk.evidence.drivers.map((drv, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-indigo-400 font-bold">•</span>
                              <span>{drv}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Validation & Correlation Telemetry */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                        Detection Confidence: <strong>{Math.round(risk.confidence * 100)}%</strong>
                      </span>
                      {risk.validation_score > 0 && (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-semibold border border-indigo-200">
                          Validation Score: <strong>{risk.validation_score}/100</strong>
                        </span>
                      )}
                    </div>

                    {risk.correlated_risk_ids && risk.correlated_risk_ids.length > 0 && (
                      <span className="text-amber-700 font-medium flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Layers className="w-3 h-3" />
                        {risk.correlated_risk_ids.length} Correlated Signals
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-mono text-slate-400">
                    {risk.risk_id}
                  </span>

                  <div className="flex items-center gap-2">
                    {risk.status !== 'CONVERTED_TO_DISRUPTION' && (
                      <button
                        onClick={() => onConvertRisk(risk.risk_id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                      >
                        Convert to Event
                      </button>
                    )}

                    <button
                      id={`investigate-risk-btn-${risk.risk_id}`}
                      onClick={() => onInvestigateRisk(risk)}
                      disabled={isInvestigating}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Investigate with AI</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
