import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Terminal,
  BrainCircuit,
  TrendingDown,
  Warehouse,
  Truck,
  FileSpreadsheet,
  Calculator,
  MessageSquareQuote,
  Database,
  Network
} from 'lucide-react';
import { AgentExecutionLog } from '../types/supplyChain.ts';
import { AgentDagView } from './AgentDagView.tsx';
import { BigQueryInspector } from './BigQueryInspector.tsx';

interface AgentProgressViewProps {
  logs: AgentExecutionLog[];
  isInvestigating: boolean;
  disruptionId: string;
}

export const AgentProgressView: React.FC<AgentProgressViewProps> = ({
  logs,
  isInvestigating,
  disruptionId
}) => {
  const [viewTab, setViewTab] = useState<'dag' | 'logs' | 'sql'>('dag');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [selectedAgentName, setSelectedAgentName] = useState<string | null>('Commander Agent');

  const getAgentIcon = (name: string) => {
    switch (name) {
      case 'Commander Agent':
        return <BrainCircuit className="w-4 h-4 text-indigo-400" />;
      case 'Business Impact Agent':
        return <TrendingDown className="w-4 h-4 text-rose-400" />;
      case 'Inventory Agent':
        return <Warehouse className="w-4 h-4 text-amber-400" />;
      case 'Supplier Agent':
        return <Truck className="w-4 h-4 text-blue-400" />;
      case 'Strategy Agent':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
      case 'Scoring Engine':
        return <Calculator className="w-4 h-4 text-purple-400" />;
      case 'Explanation Agent':
        return <MessageSquareQuote className="w-4 h-4 text-cyan-400" />;
      default:
        return <Cpu className="w-4 h-4 text-slate-400" />;
    }
  };

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const handleSelectFromDag = (agentName: string) => {
    setSelectedAgentName(agentName);
    const idx = logs.findIndex((l) => l.agent_name === agentName);
    if (idx !== -1) {
      setExpandedIndex(idx);
      setViewTab('logs');
    }
  };

  return (
    <div className="space-y-4 mb-8" id="multi-agent-system-panel">
      {/* Top Header & Tab Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Agent Core Intelligence</h3>
              <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                Google ADK + BigQuery
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous reasoning, multi-agent DAG execution, and MCP queries.</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs self-stretch sm:self-auto">
          <button
            id="tab-agent-dag"
            onClick={() => setViewTab('dag')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition ${
              viewTab === 'dag'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Agent DAG</span>
          </button>

          <button
            id="tab-agent-logs"
            onClick={() => setViewTab('logs')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition ${
              viewTab === 'logs'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Step Logs ({logs.length})</span>
          </button>

          <button
            id="tab-agent-sql"
            onClick={() => setViewTab('sql')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition ${
              viewTab === 'sql'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>BigQuery SQL</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Interactive Agent DAG */}
      {viewTab === 'dag' && (
        <AgentDagView
          logs={logs}
          isInvestigating={isInvestigating}
          selectedAgent={selectedAgentName}
          onSelectAgent={handleSelectFromDag}
        />
      )}

      {/* Tab 2: BigQuery MCP Query Inspector */}
      {viewTab === 'sql' && (
        <BigQueryInspector disruptionId={disruptionId} />
      )}

      {/* Tab 3: Detailed Stepper Logs & JSON Payloads */}
      {viewTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span>Agent Pipeline Execution Telemetry</span>
            <span className="font-mono text-emerald-400">Total Latency: {logs.reduce((acc, l) => acc + (l.duration_ms || 0), 0)}ms</span>
          </div>

          <div className="space-y-2.5">
            {logs.map((log, idx) => {
              const isExpanded = expandedIndex === idx;
              const isCompleted = log.status === 'COMPLETED';

              return (
                <div
                  key={idx}
                  className={`rounded-lg border transition-all ${
                    isExpanded
                      ? 'bg-slate-800/80 border-indigo-500/50 shadow-md'
                      : isCompleted
                      ? 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                      : 'bg-slate-800/20 border-slate-800'
                  }`}
                >
                  <div
                    onClick={() => toggleExpand(idx)}
                    className="p-3 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getAgentIcon(log.agent_name)}
                        <span className="font-semibold text-xs text-slate-100">{log.agent_name}</span>
                      </div>

                      <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                        {log.summary}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 text-xs text-slate-400">
                      {log.duration_ms !== undefined && (
                        <span className="font-mono text-[10px] bg-slate-950 px-2 py-0.5 rounded text-slate-300 border border-slate-800">
                          {log.duration_ms}ms
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Expandable Structured Payload */}
                  {isExpanded && log.structured_output && (
                    <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-700/60 bg-slate-950/70 rounded-b-lg">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1.5">
                        <span className="flex items-center gap-1 text-indigo-400">
                          <Terminal className="w-3 h-3" />
                          Structured Agent Payload (JSON):
                        </span>
                        <span>{new Date(log.started_at).toLocaleTimeString()}</span>
                      </div>
                      <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-300 overflow-x-auto max-h-52 leading-relaxed">
                        {JSON.stringify(log.structured_output, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
