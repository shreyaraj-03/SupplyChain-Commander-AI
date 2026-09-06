import React from 'react';
import {
  ShieldAlert,
  Activity,
  RefreshCw,
  Briefcase
} from 'lucide-react';

export type ActivePerspective = 'operations' | 'risks';

interface NavbarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isInvestigating?: boolean;
  activePerspective: ActivePerspective;
  onPerspectiveChange: (perspective: ActivePerspective) => void;
  riskCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRefresh,
  isRefreshing,
  isInvestigating,
  activePerspective,
  onPerspectiveChange,
  riskCount = 0
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">SupplyChain Commander AI</span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Enterprise Supply Chain Risk Radar & Operations Center</p>
          </div>
        </div>

        {/* 2-Tab Perspective Switcher (Operations Center vs AI Risk Radar) */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            id="view-operations-tab"
            onClick={() => onPerspectiveChange('operations')}
            className={`px-4 py-1.5 rounded-lg font-medium flex items-center gap-2 transition ${
              activePerspective === 'operations'
                ? 'bg-emerald-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Operations Center (Incident Switchboard & Mitigations)"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Operations Center</span>
          </button>

          <button
            id="view-risks-tab"
            onClick={() => onPerspectiveChange('risks')}
            className={`px-4 py-1.5 rounded-lg font-medium flex items-center gap-2 transition ${
              activePerspective === 'risks'
                ? 'bg-amber-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="AI Risk Radar (Early-Warning Telemetry)"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>AI Risk Radar</span>
            {riskCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {riskCount}
              </span>
            )}
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 text-xs text-slate-300">
          {onRefresh && (
            <button
              id="refresh-feed-btn"
              onClick={onRefresh}
              disabled={isInvestigating || isRefreshing}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition border border-slate-700 disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm"
              title="Refresh Operations & AI Risk Telemetry Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isInvestigating ? 'animate-spin text-indigo-400' : 'text-slate-300'}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh Feed'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
