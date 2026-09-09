import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchDisruptions,
  fetchRisks,
  runRiskDetectionScan,
  convertRiskToDisruption,
  triggerInvestigation,
  runSimulation,
  fetchMitigationExecutions
} from './services/api.ts';
import {
  Disruption,
  Investigation,
  StrategyScoreWeights,
  RiskSignal,
  MitigationExecution
} from './types/supplyChain.ts';
import { Navbar, ActivePerspective } from './components/Navbar.tsx';
import { DisruptionSelector } from './components/DisruptionSelector.tsx';
import { AiDetectedRisksView } from './components/AiDetectedRisksView.tsx';
import { RiskAnalysisModal } from './components/RiskAnalysisModal.tsx';
import { ImpactMetricsView } from './components/ImpactMetricsView.tsx';
import { InventorySupplierView } from './components/InventorySupplierView.tsx';
import { StrategyMatrix } from './components/StrategyMatrix.tsx';
import { RecommendationView } from './components/RecommendationView.tsx';
import { ExecutionModal } from './components/ExecutionModal.tsx';
import { ConvertRiskConfirmationModal } from './components/ConvertRiskConfirmationModal.tsx';
import {
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [risks, setRisks] = useState<RiskSignal[]>([]);
  const [executions, setExecutions] = useState<MitigationExecution[]>([]);
  const [selectedDisruption, setSelectedDisruption] = useState<Disruption | null>(null);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePerspective, setActivePerspective] = useState<ActivePerspective>('operations');
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);

  // AI Risk Analysis & Conversion Confirmation Modal State
  const [selectedRiskForAnalysis, setSelectedRiskForAnalysis] = useState<RiskSignal | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);
  const [isConvertingId, setIsConvertingId] = useState<string | null>(null);
  const [riskToConvert, setRiskToConvert] = useState<RiskSignal | null>(null);
  const [isConvertConfirmationOpen, setIsConvertConfirmationOpen] = useState<boolean>(false);

  const [currentWeights, setCurrentWeights] = useState<StrategyScoreWeights>({
    recovery_speed_weight: 0.30,
    revenue_protection_weight: 0.25,
    cost_efficiency_weight: 0.25,
    customer_impact_weight: 0.20
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load disruptions, AI detected risks, and logged executions
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      setError(null);
      const [disrData, riskData, execData] = await Promise.all([
        fetchDisruptions(),
        fetchRisks().catch(() => []),
        fetchMitigationExecutions().catch(() => [])
      ]);
      setDisruptions(disrData);
      setRisks(riskData);
      setExecutions(execData);

      setSelectedDisruption((prev) => {
        if (!prev && disrData.length > 0) {
          const initial = disrData[0];
          runAgentInvestigation(initial.disruption_id);
          return initial;
        }
        if (prev) {
          const updated = disrData.find((d) => d.disruption_id === prev.disruption_id);
          if (updated) return updated;
        }
        return prev;
      });
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setError(err.message || 'Failed to load disruption and risk data');
    } finally {
      setIsRefreshing(false);
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

  // Convert risk signal to active disruption event
  const handleConvertRisk = async (riskId: string, shouldNavigate: boolean = true) => {
    setIsConvertingId(riskId);
    try {
      const conv = await convertRiskToDisruption(riskId);
      const [updatedDisr, updatedRisks] = await Promise.all([
        fetchDisruptions(),
        fetchRisks()
      ]);
      setDisruptions(updatedDisr);
      setRisks(updatedRisks);

      if (conv && conv.disruption) {
        const targetDisruption = updatedDisr.find((d) => d.disruption_id === conv.disruption.disruption_id) || conv.disruption;
        setSelectedDisruption(targetDisruption);
        runAgentInvestigation(targetDisruption.disruption_id);

        if (shouldNavigate) {
          setActivePerspective('operations');
        }
      }
    } catch (err: any) {
      console.error('Convert risk error:', err);
      setError(err.message || 'Failed to convert risk to disruption');
    } finally {
      setIsConvertingId(null);
    }
  };

  // Request confirmation to convert risk signal to active disruption event
  const handleRequestConvertRisk = (riskId: string) => {
    const targetRisk = risks.find((r) => r.risk_id === riskId) || selectedRiskForAnalysis;
    if (targetRisk) {
      setRiskToConvert(targetRisk);
      setIsConvertConfirmationOpen(true);
    } else {
      handleConvertRisk(riskId);
    }
  };

  const handleConfirmConvertRisk = async () => {
    if (!riskToConvert) return;
    const targetId = riskToConvert.risk_id;
    try {
      await handleConvertRisk(targetId);
    } finally {
      setIsConvertConfirmationOpen(false);
      setRiskToConvert(null);
    }
  };

  // Open detailed AI Risk Analysis Modal
  const handleOpenAnalysisModal = (risk: RiskSignal) => {
    setSelectedRiskForAnalysis(risk);
    setIsAnalysisModalOpen(true);
  };

  // Navigate to Operations Center perspective and select disruption
  const handleNavigateToOperations = async (disruptionId?: string) => {
    setActivePerspective('operations');
    let currentList = disruptions;
    if (!disruptionId || !disruptions.some((d) => d.disruption_id === disruptionId)) {
      currentList = await fetchDisruptions();
      setDisruptions(currentList);
    }
    if (disruptionId) {
      const target = currentList.find((d) => d.disruption_id === disruptionId);
      if (target) {
        handleSelectDisruption(target);
      }
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

  // Handle mitigation execution completion
  const handleExecutionComplete = (newExec: MitigationExecution) => {
    setExecutions((prev) => [newExec, ...prev.filter((e) => e.disruption_id !== newExec.disruption_id)]);
    setDisruptions((prev) =>
      prev.map((d) => (d.disruption_id === newExec.disruption_id ? { ...d, status: 'IN_EXECUTION' as const } : d))
    );
    setSelectedDisruption((prev) =>
      prev && prev.disruption_id === newExec.disruption_id ? { ...prev, status: 'IN_EXECUTION' as const } : prev
    );
  };

  const topStrategy = investigation?.strategies && investigation.strategies.length > 0
    ? investigation.strategies.find((s) => s.strategy_id === investigation.recommended_strategy_id) || investigation.strategies[0]
    : null;

  const isSelectedDisruptionExecuted = selectedDisruption
    ? selectedDisruption.status === 'IN_EXECUTION' ||
      selectedDisruption.status === 'MITIGATED' ||
      executions.some((e) => e.disruption_id === selectedDisruption.disruption_id)
    : false;

  const currentExecutionRecord = selectedDisruption
    ? executions.find((e) => e.disruption_id === selectedDisruption.disruption_id)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <Navbar
        onRefresh={loadData}
        isRefreshing={isRefreshing}
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

        {/* TAB 1: OPERATIONS CENTER */}
        {activePerspective === 'operations' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Global Incident Switchboard */}
            <DisruptionSelector
              disruptions={disruptions}
              selectedDisruptionId={selectedDisruption?.disruption_id || null}
              onSelect={handleSelectDisruption}
              onInvestigate={(id) => runAgentInvestigation(id)}
              isInvestigating={isInvestigating}
              executions={executions}
              onOpenExecutionLogs={(disr) => {
                setSelectedDisruption(disr);
                setIsExecutionModalOpen(true);
              }}
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
                isExecuted={isSelectedDisruptionExecuted}
                executionRecord={currentExecutionRecord}
              />
            )}
          </div>
        )}

        {/* TAB 2: AI RISK RADAR */}
        {activePerspective === 'risks' && (
          <div className="space-y-6 animate-fadeIn">
            <AiDetectedRisksView
              risks={risks}
              onScan={runDetectionScan}
              isScanning={isScanning}
              onOpenAnalysisModal={handleOpenAnalysisModal}
              onConvertRisk={handleRequestConvertRisk}
              onNavigateToOperations={handleNavigateToOperations}
              isConvertingId={isConvertingId}
            />
          </div>
        )}
      </main>

      {/* Detailed AI Risk Analysis Modal */}
      <RiskAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        risk={selectedRiskForAnalysis}
        onConvertRisk={handleRequestConvertRisk}
        onNavigateToOperations={handleNavigateToOperations}
      />

      {/* Convert Risk Confirmation Pop-up Modal */}
      <ConvertRiskConfirmationModal
        isOpen={isConvertConfirmationOpen}
        onClose={() => {
          setIsConvertConfirmationOpen(false);
          setRiskToConvert(null);
        }}
        onConfirm={handleConfirmConvertRisk}
        risk={riskToConvert}
        isConverting={isConvertingId !== null}
      />

      {/* Execution Authorization Modal */}
      {topStrategy && selectedDisruption && (
        <ExecutionModal
          isOpen={isExecutionModalOpen}
          onClose={() => setIsExecutionModalOpen(false)}
          strategy={topStrategy}
          disruption={selectedDisruption}
          onExecutionComplete={handleExecutionComplete}
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SupplyChain Commander AI — Enterprise Autonomous Risk Radar & Operations Intelligence</span>
          </div>
          <div className="text-slate-400 text-[11px] font-medium">
            Real-Time Telemetry • Deterministic Strategy Ranking • Automated Executive Mitigation
          </div>
        </div>
      </footer>
    </div>
  );
}
