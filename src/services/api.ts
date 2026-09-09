import { Disruption, Investigation, StrategyScoreWeights } from '../types/supplyChain.ts';

export async function fetchDisruptions(): Promise<Disruption[]> {
  const res = await fetch('/api/disruptions');
  if (!res.ok) {
    throw new Error('Failed to fetch disruptions');
  }
  const data = await res.json();
  return data.disruptions || [];
}

export async function fetchDisruptionById(id: string): Promise<Disruption> {
  const res = await fetch(`/api/disruptions/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch disruption ${id}`);
  }
  const data = await res.json();
  return data.disruption;
}

export async function triggerInvestigation(
  disruptionId: string,
  weights?: StrategyScoreWeights
): Promise<Investigation> {
  const res = await fetch('/api/investigations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      disruption_id: disruptionId,
      scoring_weights: weights
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to trigger investigation');
  }

  const data = await res.json();
  return data.investigation;
}

export async function runSimulation(
  disruptionId: string,
  weights: StrategyScoreWeights
): Promise<Investigation> {
  const res = await fetch('/api/simulations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      disruption_id: disruptionId,
      scoring_weights: weights
    })
  });

  if (!res.ok) {
    throw new Error('Failed to run scoring simulation');
  }

  const data = await res.json();
  return data.investigation;
}

export async function fetchRisks(filters?: Record<string, string>): Promise<any[]> {
  const params = new URLSearchParams(filters || {});
  const res = await fetch(`/api/risks?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to fetch risk signals');
  }
  const data = await res.json();
  return data.risks || [];
}

export async function runRiskDetectionScan(triggerType: string = 'MANUAL'): Promise<any> {
  const res = await fetch('/api/risk-detection/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trigger_type: triggerType,
      auto_convert_critical: false
    })
  });
  if (!res.ok) {
    throw new Error('Failed to run autonomous risk detection scan');
  }
  return await res.json();
}

export async function convertRiskToDisruption(riskId: string): Promise<any> {
  const res = await fetch(`/api/risks/${riskId}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    throw new Error(`Failed to convert risk ${riskId} to disruption`);
  }
  return await res.json();
}

export async function recordMitigationExecution(executionData: any): Promise<any> {
  const res = await fetch('/api/executions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(executionData)
  });
  if (!res.ok) {
    throw new Error('Failed to record mitigation execution');
  }
  return await res.json();
}

export async function fetchMitigationExecutions(disruptionId?: string): Promise<any[]> {
  const query = disruptionId ? `?disruption_id=${encodeURIComponent(disruptionId)}` : '';
  const res = await fetch(`/api/executions${query}`);
  if (!res.ok) {
    throw new Error('Failed to fetch mitigation executions');
  }
  const data = await res.json();
  return data.executions || [];
}

