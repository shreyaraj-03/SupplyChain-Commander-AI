import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchDisruptions,
  fetchRisks,
  runRiskDetectionScan,
  convertRiskToDisruption,
  triggerInvestigation,
  runSimulation
} from './services/api.ts';
import {
  Disruption,
  Investigation,
  StrategyScoreWeights,
  RiskSignal
} from './types/supplyChain.ts';
import { Navbar, ActivePerspective } from './components/Navbar.tsx';
import { DisruptionSelector } from './components/DisruptionSelector.tsx';
import { AiDetectedRisksView } from './components/AiDetectedRisksView.tsx';
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
  const [risks, setRisks] = useState<RiskSignal[]>([]);
  const [selectedDisruption, setSelectedDisruption] = useState<Disruption | null>(null);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
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

  // Load disruptions and AI detected risks
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [disrData, riskData] = await Promise.all([
        fetchDisruptions(),
        fetchRisks().catch(() => [])
      ]);
      setDisruptions(disrData);
      setRisks(riskData);

      setSelectedDisruption((prev) => {
        if (!prev && disrData.length > 0) {
          const initial = disrData[0];
          runAgentInvestigation(initial.disruption_id);
          return initial;
        }
        return prev;
      });
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setError(err.message || 'Failed to load disruption and risk data');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-trigger autonomous risk scan when user switches to AI Risk Radar tab if no risks are loaded yet
  const hasAutoScannedRef = useRef(false);
  useEffect(() => {
    if (
      activePerspective === 'risks' &&
      risks.length === 0 &&
      !isScanning &&
      !hasAutoScannedRef.current
    ) {
      hasAutoScannedRef.current = true;
      runDetectionScan();
    }
  }, [activePerspective, risks.length, isScanning]);

  // Run autonomous risk scan
  const runDetectionScan = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const res = await runRiskDetectionScan('MANUAL');
      if (res && res.signals) {
        setRisks(res.signals);
      } else {
        const updatedRisks = await fetchRisks();
        setRisks(updatedRisks);
      }
      const updatedDisruptions = await fetchDisruptions();
      setDisruptions(updatedDisruptions);
    } catch (err: any) {
      console.error('Detection scan error:', err);
      setError(err.message || 'Failed to complete autonomous risk scan');
    } finally {
      setIsScanning(false);
    }
  };

  // Convert risk to formal disruption
  const handleConvertRisk = async (riskId: string) => {
    try {
      await convertRiskToDisruption(riskId);
      await loadData();
    } catch (err: any) {
      console.error('Convert risk error:', err);
      setError(err.message || 'Failed to convert risk to disruption');
    }
  };

  // Investigate an AI detected risk
  const handleInvestigateRisk = async (risk: RiskSignal) => {
    try {
      let targetDisruptionId = risk.associated_disruption_id;
      if (!targetDisruptionId) {
        const conv = await convertRiskToDisruption(risk.risk_id);
        if (conv && conv.disruption) {
          targetDisruptionId = conv.disruption.disruption_id;
        }
      }

      const allDisr = await fetchDisruptions();
      setDisruptions(allDisr);
      const targetDisruption = allDisr.find((d) => d.disruption_id === targetDisruptionId) || allDisr[0];
      if (targetDisruption) {
        setSelectedDisruption(targetDisruption);
        setActivePerspective('operations');
        runAgentInvestigation(targetDisruption.disruption_id);
      }
    } catch (err: any) {
      console.error('Investigate risk error:', err);
      setError(err.message || 'Failed to launch investigation for risk');
    }
  };

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
        onRefresh={loadData}
        isInvestigating={isInvestigating || isScanning}
        activePerspective={activePerspective}
        onPerspectiveChange={setActivePerspective}
        riskCount={risks.filter((r) => r.severity === 'CRITICAL' || r.severity === 'HIGH').length}
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
              onClick={() => loadData()}
              className="px-3 py-1 bg-rose-600 text-white rounded font-medium hover:bg-rose-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* TAB 1: OPERATIONS UI (Full-width Business User View with Incident Switchboard + Mitigations) */}
        {activePerspective === 'operations' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Global Incident Switchboard */}
            <DisruptionSelector
              disruptions={disruptions}
              selectedDisruptionId={selectedDisruption?.disruption_id || null}
              onSelect={handleSelectDisruption}
              onInvestigate={(id) => runAgentInvestigation(id)}
              isInvestigating={isInvestigating}
            />

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

        {/* TAB 2: AI RISK RADAR (Dedicated Early-Warning & Anomaly Telemetry) */}
        {activePerspective === 'risks' && (
          <div className="space-y-6 animate-fadeIn">
            <AiDetectedRisksView
              risks={risks}
              onScan={runDetectionScan}
              isScanning={isScanning}
              onInvestigateRisk={handleInvestigateRisk}
              onConvertRisk={handleConvertRisk}
              isInvestigating={isInvestigating}
            />
          </div>
        )}

        {/* TAB 3: AGENT LAB (Full-width Multi-Agent DAG & BigQuery MCP Inspector) */}
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
