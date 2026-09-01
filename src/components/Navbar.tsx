import React from 'react';
import {
  ShieldAlert,
  Cpu,
  Database,
  Activity,
  RefreshCw,
  Briefcase,
  Layers
} from 'lucide-react';

export type ActivePerspective = 'operations' | 'agent';

interface NavbarProps {
  onRefresh?: () => void;
  isInvestigating?: boolean;
  activePerspective: ActivePerspective;
  onPerspectiveChange: (perspective: ActivePerspective) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRefresh,
  isInvestigating,
  activePerspective,
  onPerspectiveChange
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
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hidden sm:inline">
                Google ADK + BigQuery
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Autonomous Multi-Agent Disruption Investigation & Recovery</p>
          </div>
        </div>

        {/* 2-Tab Perspective Switcher (Operations UI vs Agent Lab) */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            id="view-operations-tab"
            onClick={() => onPerspectiveChange('operations')}
            className={`px-3.5 py-1.5 rounded-lg font-medium flex items-center gap-2 transition ${
              activePerspective === 'operations'
                ? 'bg-emerald-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Operations Center (Business User View)"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Operations UI</span>
          </button>

          <button
            id="view-agent-tab"
            onClick={() => onPerspectiveChange('agent')}
            className={`px-3.5 py-1.5 rounded-lg font-medium flex items-center gap-2 transition ${
              activePerspective === 'agent'
                ? 'bg-indigo-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Multi-Agent Lab (Architecture & BigQuery Inspector)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Agent Lab</span>
          </button>
        </div>

        {/* System Badges & Refresh */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>Python: <strong className="text-white">v3.11</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>MCP: <strong className="text-white">BigQuery</strong></span>
          </div>

          {onRefresh && (
            <button
              id="refresh-feed-btn"
              onClick={onRefresh}
              disabled={isInvestigating}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 disabled:opacity-50 flex items-center gap-1.5"
              title="Refresh Disruptions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isInvestigating ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline text-xs">Refresh</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
