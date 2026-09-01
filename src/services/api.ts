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
