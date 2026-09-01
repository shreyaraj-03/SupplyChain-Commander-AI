import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchDisruptions,
  triggerInvestigation,
  runSimulation
} from './services/api.ts';
import {
  Disruption,
  Investigation,
  StrategyScoreWeights
} from './types/supplyChain.ts';
import { Navbar, ActivePerspective } from './components/Navbar.tsx';
import { DisruptionSelector } from './components/DisruptionSelector.tsx';
import { AgentProgressView } from './components/AgentProgressView.tsx';
import { ImpactMetricsView } from './components/ImpactMetricsView.tsx';
import { InventorySupplierView } from './components/InventorySupplierView.tsx';
import { StrategyMatrix } from './components/StrategyMatrix.tsx';
import { RecommendationView } from './components/RecommendationView.tsx';
import { ExecutionModal } from './components/ExecutionModal.tsx';
import {
  AlertCircle,
  ShieldCheck,
  Briefcase,
  Layers,
  Sparkles,
  ArrowRight,
  Database
} from 'lucide-react';

export default function App() {
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [selectedDisruption, setSelectedDisruption] = useState<Disruption | null>(null);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePerspective, setActivePerspective] = useState<ActivePerspective>('operations');
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);

  const [currentWeights, setCurrentWeights] = useState<StrategyScoreWeights>({
    recovery_speed_weight: 0.30,
    revenue_protection_weight: 0.25,
    cost_efficiency_weight: 0.25,
    customer_impact_weight: 0.20
  });

  // Load initial disruptions
  const loadDisruptions = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchDisruptions();
      setDisruptions(data);
      if (data.length > 0 && !selectedDisruption) {
        const initial = data[0];
        setSelectedDisruption(initial);
        runAgentInvestigation(initial.disruption_id);
      }
    } catch (err: any) {
      console.error('Failed to load disruptions:', err);
      setError(err.message || 'Failed to load disruption data');
    }
  }, []);

  useEffect(() => {
    loadDisruptions();
  }, [loadDisruptions]);

  // Run autonomous multi-agent investigation
  const runAgentInvestigation = async (disruptionId: string, weights?: StrategyScoreWeights) => {
    setIsInvestigating(true);
    setError(null);
    try {
      const inv = await triggerInvestigation(disruptionId, weights || currentWeights);
      setInvestigation(inv);
    } catch (err: any) {
      console.error('Investigation error:', err);
      setError(err.message || 'Failed to complete multi-agent investigation');
    } finally {
      setIsInvestigating(false);
    }
  };

  // Run What-If scoring simulation with custom weights
  const handleSimulateWeights = async (newWeights: StrategyScoreWeights) => {
    if (!selectedDisruption) return;
    setIsSimulating(true);
    setCurrentWeights(newWeights);
    try {
      const inv = await runSimulation(selectedDisruption.disruption_id, newWeights);
      setInvestigation(inv);
    } catch (err: any) {
      console.error('Simulation error:', err);
      setError(err.message || 'Failed to re-calculate strategy ranking');
    } finally {
      setIsSimulating(false);
    }
  };

  // Handle disruption select
  const handleSelectDisruption = (disruption: Disruption) => {
    setSelectedDisruption(disruption);
    if (investigation?.disruption_id !== disruption.disruption_id) {
      runAgentInvestigation(disruption.disruption_id);
    }
  };

  const topStrategy = investigation?.strategies && investigation.strategies.length > 0
    ? investigation.strategies.find((s) => s.strategy_id === investigation.recommended_strategy_id) || investigation.strategies[0]
    : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <Navbar
        onRefresh={loadDisruptions}
        isInvestigating={isInvestigating}
        activePerspective={activePerspective}
        onPerspectiveChange={setActivePerspective}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => selectedDisruption && runAgentInvestigation(selectedDisruption.disruption_id)}
              className="px-3 py-1 bg-rose-600 text-white rounded font-medium hover:bg-rose-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Global Incident Switchboard */}
        <DisruptionSelector
          disruptions={disruptions}
          selectedDisruptionId={selectedDisruption?.disruption_id || null}
          onSelect={handleSelectDisruption}
          onInvestigate={(id) => runAgentInvestigation(id)}
          isInvestigating={isInvestigating}
        />

        {/* TAB 1: OPERATIONS UI (Full-width Business User View) */}
        {activePerspective === 'operations' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Impact & Blast Radius Analytics */}
            {investigation?.impact && (
              <ImpactMetricsView
                impact={investigation.impact}
                inventory={investigation.inventory}
              />
            )}

            {/* Inter-Hub Rebalancing vs Alternative Suppliers */}
            {investigation?.inventory && investigation?.supplier && (
              <InventorySupplierView
                inventory={investigation.inventory}
                supplier={investigation.supplier}
              />
            )}

            {/* Deterministic Strategy Evaluation Matrix + What-If Simulator */}
            {investigation?.strategies && (
              <StrategyMatrix
                strategies={investigation.strategies}
                currentWeights={currentWeights}
                onSimulateWeights={handleSimulateWeights}
                isSimulating={isSimulating}
              />
            )}

            {/* AI Recommendation, Action Roadmap & 1-Click Execution */}
            {investigation?.explanation && topStrategy && (
              <RecommendationView
                explanation={investigation.explanation}
                recommendedStrategy={topStrategy}
                onExecuteMitigation={() => setIsExecutionModalOpen(true)}
              />
            )}
          </div>
        )}

        {/* TAB 2: AGENT LAB (Full-width Multi-Agent DAG & BigQuery MCP Inspector) */}
        {activePerspective === 'agent' && (
          <div className="space-y-6 animate-fadeIn">
            {investigation?.agent_logs && selectedDisruption && (
              <AgentProgressView
                logs={investigation.agent_logs}
                isInvestigating={isInvestigating}
                disruptionId={selectedDisruption.disruption_id}
              />
            )}

            {/* Executive Recommendation Summary inside Agent Lab */}
            {investigation?.explanation && topStrategy && (
              <RecommendationView
                explanation={investigation.explanation}
                recommendedStrategy={topStrategy}
                onExecuteMitigation={() => setIsExecutionModalOpen(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Execution Authorization Modal */}
      {topStrategy && selectedDisruption && (
        <ExecutionModal
          isOpen={isExecutionModalOpen}
          onClose={() => setIsExecutionModalOpen(false)}
          strategy={topStrategy}
          disruption={selectedDisruption}
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SupplyChain Commander AI — Autonomous Multi-Agent Decision Intelligence</span>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            Google ADK Multi-Agent Core • BigQuery Analytics Dataset • Deterministic Optimization
          </div>
        </div>
      </footer>
    </div>
  );
}
