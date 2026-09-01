import React from 'react';
import { AlertTriangle, Clock, Box, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import { Disruption } from '../types/supplyChain.ts';

interface DisruptionSelectorProps {
  disruptions: Disruption[];
  selectedDisruptionId: string | null;
  onSelect: (disruption: Disruption) => void;
  onInvestigate: (disruptionId: string) => void;
  isInvestigating: boolean;
}

export const DisruptionSelector: React.FC<DisruptionSelectorProps> = ({
  disruptions,
  selectedDisruptionId,
  onSelect,
  onInvestigate,
  isInvestigating
}) => {
  return (
    <section className="mb-8" id="disruptions-section">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Active Supply Chain Disruptions
          </h2>
          <p className="text-sm text-slate-500">
            Select a live disruption or simulate a scenario to trigger the autonomous multi-agent investigation workflow.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
          {disruptions.length} Disruptions Detected
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {disruptions.map((d) => {
          const isSelected = selectedDisruptionId === d.disruption_id;
          const severityColors = {
            CRITICAL: 'bg-rose-50 border-rose-300 text-rose-700',
            HIGH: 'bg-amber-50 border-amber-300 text-amber-700',
            MEDIUM: 'bg-yellow-50 border-yellow-300 text-yellow-700',
            LOW: 'bg-blue-50 border-blue-300 text-blue-700'
          }[d.severity];

          return (
            <div
              key={d.disruption_id}
              id={`disruption-card-${d.disruption_id}`}
              onClick={() => onSelect(d)}
              className={`cursor-pointer rounded-xl border p-5 transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 text-white border-indigo-500 shadow-lg ring-2 ring-indigo-500/30'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div>
                {/* Header Pills */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase border ${
                    isSelected ? 'bg-indigo-950 text-indigo-300 border-indigo-700' : severityColors
                  }`}>
                    {d.severity} SEVERITY
                  </span>
                  <span className={`text-xs flex items-center gap-1 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {d.expected_duration_days} Days Delay
                  </span>
                </div>

                {/* Scenario Tag */}
                <h3 className="font-semibold text-base mb-1 line-clamp-1">
                  {d.scenario_tag}
                </h3>
                <p className={`text-xs line-clamp-2 mb-4 leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                  {d.description}
                </p>

                {/* Key Attributes */}
                <div className="space-y-1.5 text-xs mb-4">
                  <div className={`flex items-center gap-2 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                    <Box className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Product ID: <strong>{d.affected_product_id}</strong></span>
                  </div>
                  <div className={`flex items-center gap-2 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Target Hub: <strong>{d.destination_warehouse_id} (Bangalore)</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-700/50 mt-auto flex items-center justify-between">
                <span className={`text-[11px] font-mono ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`}>
                  {d.disruption_id}
                </span>

                <button
                  id={`investigate-btn-${d.disruption_id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(d);
                    onInvestigate(d.disruption_id);
                  }}
                  disabled={isInvestigating}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    isSelected
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                      : 'bg-slate-900 hover:bg-indigo-700 text-white'
                  } disabled:opacity-50`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isInvestigating && isSelected ? 'Analyzing...' : 'Investigate with AI'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
