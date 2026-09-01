from typing import List, Dict, Any
from backend.app.models.strategy import RecoveryStrategy, StrategyScoreBreakdown, StrategyScoreWeights

class DeterministicScoringEngine:
    """
    Computes normalized, objective multi-criteria scores for recovery strategies.
    
    Formula:
    Final Score = (w_speed * Speed_Score) + (w_rev * Rev_Score) + (w_cost * Cost_Score) + (w_cust * Impact_Score)
    """

    @staticmethod
    def score_strategies(
        strategies: List[Dict[str, Any]],
        weights: StrategyScoreWeights
    ) -> List[Dict[str, Any]]:
        if not strategies:
            return []

        # Find min/max bounds for normalization
        max_recovery_days = max(s.get("recovery_days", 1) for s in strategies) or 1
        min_recovery_days = min(s.get("recovery_days", 1) for s in strategies) or 1
        
        max_cost = max(s.get("total_cost", 0.0) for s in strategies) or 1.0
        min_cost = min(s.get("total_cost", 0.0) for s in strategies) or 0.0

        max_protected = max(s.get("revenue_protected", 0.0) for s in strategies) or 1.0
        max_delayed = max(s.get("delayed_orders", 0) for s in strategies) or 1

        scored_strategies = []

        for strat in strategies:
            rec_days = strat.get("recovery_days", 1)
            cost = strat.get("total_cost", 0.0)
            rev_prot = strat.get("revenue_protected", 0.0)
            delayed = strat.get("delayed_orders", 0)

            # 1. Recovery Speed Score (0-100, faster days = higher score)
            if max_recovery_days == min_recovery_days:
                speed_score = 100.0
            else:
                speed_score = round(100.0 * (1.0 - (rec_days - min_recovery_days) / (max_recovery_days - min_recovery_days + 0.001)), 2)
            speed_score = max(5.0, min(100.0, speed_score))

            # 2. Revenue Protection Score (0-100, more revenue protected = higher score)
            rev_score = round(100.0 * (rev_prot / max_protected), 2) if max_protected > 0 else 50.0
            rev_score = max(5.0, min(100.0, rev_score))

            # 3. Cost Efficiency Score (0-100, lower cost = higher score)
            if max_cost == min_cost:
                cost_score = 100.0
            else:
                cost_score = round(100.0 * (1.0 - (cost - min_cost) / (max_cost - min_cost + 0.001)), 2)
            cost_score = max(5.0, min(100.0, cost_score))

            # 4. Customer Impact Score (0-100, fewer delayed orders = higher score)
            impact_score = round(100.0 * (1.0 - (delayed / (max_delayed + 0.001))), 2)
            impact_score = max(5.0, min(100.0, impact_score))

            # Calculate weighted composite total
            weighted_total = round(
                (weights.recovery_speed_weight * speed_score) +
                (weights.revenue_protection_weight * rev_score) +
                (weights.cost_efficiency_weight * cost_score) +
                (weights.customer_impact_weight * impact_score),
                2
            )

            breakdown = {
                "recovery_speed_score": speed_score,
                "revenue_protection_score": rev_score,
                "cost_efficiency_score": cost_score,
                "customer_impact_score": impact_score,
                "weighted_total": weighted_total,
                "rank": 0
            }

            s_copy = dict(strat)
            s_copy["score_breakdown"] = breakdown
            s_copy["final_score"] = weighted_total
            scored_strategies.append(s_copy)

        # Sort strategies by final_score descending and assign rank
        scored_strategies.sort(key=lambda x: x["final_score"], reverse=True)
        for idx, s in enumerate(scored_strategies, start=1):
            s["score_breakdown"]["rank"] = idx

        return scored_strategies
