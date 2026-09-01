import React from 'react';
import {
  BrainCircuit,
  TrendingDown,
  Warehouse,
  Truck,
  FileSpreadsheet,
  Calculator,
  MessageSquareQuote,
  ArrowDown,
  ArrowRight,
  Sparkles,
  Layers,
  Database
} from 'lucide-react';
import { AgentExecutionLog } from '../types/supplyChain.ts';

interface AgentDagViewProps {
  logs: AgentExecutionLog[];
  isInvestigating: boolean;
  selectedAgent: string | null;
  onSelectAgent: (name: string) => void;
}

export const AgentDagView: React.FC<AgentDagViewProps> = ({
  logs,
  isInvestigating,
  selectedAgent,
  onSelectAgent
}) => {
  const getAgentStatus = (name: string) => {
    const log = logs.find((l) => l.agent_name === name);
    if (!log) return { status: 'PENDING', duration: 0 };
    return { status: log.status, duration: log.duration_ms || 0 };
  };

  const commander = getAgentStatus('Commander Agent');
  const impact = getAgentStatus('Business Impact Agent');
  const inventory = getAgentStatus('Inventory Agent');
  const supplier = getAgentStatus('Supplier Agent');
  const strategy = getAgentStatus('Strategy Agent');
  const scoring = getAgentStatus('Scoring Engine');
  const explanation = getAgentStatus('Explanation Agent');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white mb-6" id="multi-agent-dag-view">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Google ADK Multi-Agent Orchestration Architecture
            </h4>
            <p className="text-[11px] text-slate-400">
              Interactive execution graph: Supervisor delegation, parallel domain extraction, and synthesis.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
          Parallel Orchestration Mode
        </span>
      </div>

      {/* DAG Visualization Diagram */}
      <div className="space-y-4">
        {/* Layer 1: Commander Agent */}
        <div className="flex justify-center">
          <button
            onClick={() => onSelectAgent('Commander Agent')}
            className={`w-full max-w-sm p-3 rounded-xl border transition-all text-left flex items-center justify-between ${
              selectedAgent === 'Commander Agent'
                ? 'bg-indigo-600 border-indigo-400 shadow-lg ring-2 ring-indigo-400/40 text-white'
                : 'bg-slate-800/80 border-slate-700 hover:border-slate-600 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              <div>
                <div className="text-xs font-bold">1. Commander Agent (Supervisor)</div>
                <div className="text-[10px] text-slate-300">Delegates tasks & handles session telemetry</div>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-slate-900/80 px-2 py-0.5 rounded text-emerald-400 border border-slate-700">
              {commander.duration}ms
            </span>
          </button>
        </div>

        {/* Down Arrow / Split Connector */}
        <div className="flex justify-center items-center text-slate-500">
          <ArrowDown className="w-4 h-4 animate-bounce" />
          <span className="text-[10px] uppercase font-mono tracking-wider ml-1 text-indigo-400 font-semibold">
            Parallel Domain Tool Calls (BigQuery MCP)
          </span>
        </div>

        {/* Layer 2: Domain Agents in Parallel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Impact Agent */}
          <button
            onClick={() => onSelectAgent('Business Impact Agent')}
            className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
              selectedAgent === 'Business Impact Agent'
                ? 'bg-rose-950/60 border-rose-500 shadow-lg ring-2 ring-rose-500/40 text-white'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold">Impact Agent</span>
              </div>
              <span className="text-[10px] font-mono bg-slate-900/80 px-1.5 py-0.5 rounded text-rose-300 border border-slate-700">
                {impact.duration}ms
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Quantifies SKU deficit, revenue at risk, and affected customer orders.
            </p>
          </button>

          {/* Inventory Agent */}
          <button
            onClick={() => onSelectAgent('Inventory Agent')}
            className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
              selectedAgent === 'Inventory Agent'
                ? 'bg-amber-950/60 border-amber-500 shadow-lg ring-2 ring-amber-500/40 text-white'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Warehouse className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold">Inventory Agent</span>
              </div>
              <span className="text-[10px] font-mono bg-slate-900/80 px-1.5 py-0.5 rounded text-amber-300 border border-slate-700">
                {inventory.duration}ms
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Scans network hubs for surplus safety stocks and routes inter-hub transfers.
            </p>
          </button>

          {/* Supplier Agent */}
          <button
            onClick={() => onSelectAgent('Supplier Agent')}
            className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
              selectedAgent === 'Supplier Agent'
                ? 'bg-blue-950/60 border-blue-500 shadow-lg ring-2 ring-blue-500/40 text-white'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold">Supplier Agent</span>
              </div>
              <span className="text-[10px] font-mono bg-slate-900/80 px-1.5 py-0.5 rounded text-blue-300 border border-slate-700">
                {supplier.duration}ms
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Evaluates qualified vendors, expedite lead times, and reliability ratings.
            </p>
          </button>
        </div>

        {/* Down Arrow / Consolidation */}
        <div className="flex justify-center items-center text-slate-500">
          <ArrowDown className="w-4 h-4" />
          <span className="text-[10px] uppercase font-mono tracking-wider ml-1 text-emerald-400 font-semibold">
            Synthesis & Mathematical Evaluation
          </span>
        </div>

        {/* Layer 3: Strategy & Scoring Agents */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Strategy Agent */}
          <button
            onClick={() => onSelectAgent('Strategy Agent')}
            className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
              selectedAgent === 'Strategy Agent'
                ? 'bg-emerald-950/60 border-emerald-500 shadow-lg ring-2 ring-emerald-500/40 text-white'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold">Strategy Agent</span>
              </div>
              <span className="text-[10px] font-mono bg-slate-900/80 px-1.5 py-0.5 rounded text-emerald-300 border border-slate-700">
                {strategy.duration}ms
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Synthesizes 4 distinct recovery options.
            </p>
          </button>

          {/* Scoring Engine */}
          <button
            onClick={() => onSelectAgent('Scoring Engine')}
            className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
              selectedAgent === 'Scoring Engine'
                ? 'bg-purple-950/60 border-purple-500 shadow-lg ring-2 ring-purple-500/40 text-white'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold">Scoring Engine</span>
              </div>
              <span className="text-[10px] font-mono bg-slate-900/80 px-1.5 py-0.5 rounded text-purple-300 border border-slate-700">
                {scoring.duration}ms
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Deterministic normalized multi-criteria ranking.
            </p>
          </button>

          {/* Explanation Agent */}
          <button
            onClick={() => onSelectAgent('Explanation Agent')}
            className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
              selectedAgent === 'Explanation Agent'
                ? 'bg-cyan-950/60 border-cyan-500 shadow-lg ring-2 ring-cyan-500/40 text-white'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <MessageSquareQuote className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold">Explanation Agent</span>
              </div>
              <span className="text-[10px] font-mono bg-slate-900/80 px-1.5 py-0.5 rounded text-cyan-300 border border-slate-700">
                {explanation.duration}ms
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Formulates executive rationale & execution roadmap.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
