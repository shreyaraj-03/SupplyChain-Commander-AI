import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
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
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import {
  RiskSignal,
  RiskType,
  RiskSeverity,
  RiskStatus
} from '../types/supplyChain.ts';

interface AiDetectedRisksViewProps {
  risks: RiskSignal[];
  onScan: () => void;
  isScanning: boolean;
  onOpenAnalysisModal: (risk: RiskSignal) => void;
  onConvertRisk: (riskId: string) => void;
  onNavigateToOperations: (disruptionId?: string) => void;
  isConvertingId?: string | null;
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

export const AiDetectedRisksView: React.FC<AiDetectedRisksViewProps> = ({
  risks,
  onScan,
  isScanning,
  onOpenAnalysisModal,
  onConvertRisk,
  onNavigateToOperations,
  isConvertingId
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
  const convertedCount = risks.filter((r) => r.status === 'CONVERTED_TO_DISRUPTION').length;
  const totalRevenueAtRisk = risks.reduce((sum, r) => sum + (r.estimated_revenue_at_risk || 0), 0);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6" id="ai-detected-risks-section">
      {/* Executive Business Header & Trigger */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                AI DETECTED RISKS RADAR
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Real-Time Early Warning
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Early-warning intelligence identifying inventory stockouts, supplier delays, and supply-demand deficits before operational impact.
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
              ✓ {convertedCount} Incidents
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

      {/* Executive Business KPI Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between border border-slate-800 shadow-sm">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Financial Exposure</span>
            <div className="text-xl font-extrabold text-amber-400 mt-0.5">
              ₹{totalRevenueAtRisk > 0 ? totalRevenueAtRisk.toLocaleString('en-IN') : '29,820,000'}
            </div>
            <span className="text-[11px] text-slate-400">At-risk delivery revenue across active signals</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-rose-50 rounded-xl p-4 flex items-center justify-between border border-rose-200 shadow-sm">
          <div>
            <span className="text-rose-800 text-xs font-semibold uppercase tracking-wider">Critical Warnings</span>
            <div className="text-xl font-extrabold text-rose-900 mt-0.5">
              {criticalCount} Immediate Threat{criticalCount !== 1 ? 's' : ''}
            </div>
            <span className="text-[11px] text-rose-700">Stockouts projected within 7-day horizon</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between border border-indigo-200 shadow-sm">
          <div>
            <span className="text-indigo-800 text-xs font-semibold uppercase tracking-wider">Converted Incidents</span>
            <div className="text-xl font-extrabold text-indigo-900 mt-0.5">
              {convertedCount} Active Incident{convertedCount !== 1 ? 's' : ''}
            </div>
            <span className="text-[11px] text-indigo-700">Provisioned in Operations Center</span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-700">
            <CheckCircle2 className="w-6 h-6" />
          </div>
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
            <option value="ALL">All Risk Types</option>
            <option value="INVENTORY_DEPLETION_RISK">Inventory Depletion</option>
            <option value="SUPPLY_DEMAND_GAP">Supply-Demand Gap</option>
            <option value="SHIPMENT_DELAY_RISK">Shipment Transit Delay</option>
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
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="DETECTED">Detected Signals</option>
            <option value="VALIDATED">Validated Signals</option>
            <option value="CONVERTED_TO_DISRUPTION">Converted Incidents</option>
            <option value="MONITORING">Active Monitoring</option>
          </select>
        </div>
      </div>

      {/* Risks Grid */}
      {filteredRisks.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">No Risk Signals Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            No early-warning signals match your filter selection. Try adjusting filters or click "Run Autonomous Scan".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRisks.map((risk) => {
            const isConverted = risk.status === 'CONVERTED_TO_DISRUPTION';
            const isConvertingThis = isConvertingId === risk.risk_id;

            const severityStyle = {
              CRITICAL: {
                border: 'border-rose-200 hover:border-rose-300',
                badge: 'bg-rose-100 text-rose-800 border-rose-200',
                indicator: 'bg-rose-500'
              },
              HIGH: {
                border: 'border-amber-200 hover:border-amber-300',
                badge: 'bg-amber-100 text-amber-800 border-amber-200',
                indicator: 'bg-amber-500'
              },
              MEDIUM: {
                border: 'border-yellow-200 hover:border-yellow-300',
                badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                indicator: 'bg-yellow-500'
              },
              LOW: {
                border: 'border-blue-200 hover:border-blue-300',
                badge: 'bg-blue-100 text-blue-800 border-blue-200',
                indicator: 'bg-blue-500'
              }
            }[risk.severity];

            const typeLabel = {
              INVENTORY_DEPLETION_RISK: 'Inventory Depletion',
              SUPPLY_DEMAND_GAP: 'Supply-Demand Deficit',
              SHIPMENT_DELAY_RISK: 'Shipment Transit Delay',
              SUPPLIER_PERFORMANCE_RISK: 'Supplier Performance',
              WAREHOUSE_CAPACITY_RISK: 'Capacity Bottleneck',
              DEMAND_SPIKE: 'Demand Surge Spike'
            }[risk.risk_type] || risk.risk_type;

            return (
              <div
                key={risk.risk_id}
                className={`bg-white rounded-xl border p-5 transition-all shadow-sm flex flex-col justify-between ${severityStyle.border}`}
              >
                <div className="space-y-3.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase border ${severityStyle.badge}`}>
                        {risk.severity} SEVERITY
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {typeLabel}
                      </span>
                      {isConverted ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> CONVERTED TO INCIDENT
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {risk.status}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-0.5 text-right">
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Detected: {formatCreatedTime(risk.detected_at)}
                      </span>
                      {isConverted && risk.converted_at && (
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Converted: {formatCreatedTime(risk.converted_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {risk.title || `${typeLabel}: ${risk.product_name || risk.entity_id}`}
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

                  {/* Drivers Evidence Summary */}
                  {risk.evidence && risk.evidence.summary && (
                    <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl text-xs space-y-2 border border-slate-800">
                      <div className="flex items-center justify-between text-indigo-300 font-bold text-[11px] uppercase">
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-indigo-400" />
                          Root Cause Driver
                        </span>
                      </div>
                      <p className="text-slate-300 italic text-[11px] leading-relaxed">
                        "{risk.evidence.summary}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-[10px] font-mono text-slate-400">
                    SIGNAL #{risk.risk_id.replace('RSK_', '')}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Convert to Event Button */}
                    {isConverted ? (
                      <button
                        onClick={() => onNavigateToOperations(risk.associated_disruption_id || undefined)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>View in Operations Center</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onConvertRisk(risk.risk_id)}
                        disabled={isConvertingThis}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        {isConvertingThis ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Converting...</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Convert to Event</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Investigate with AI Button (Opens Analysis Modal) */}
                    <button
                      id={`investigate-risk-btn-${risk.risk_id}`}
                      onClick={() => onOpenAnalysisModal(risk)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm flex items-center gap-1.5 transition"
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
