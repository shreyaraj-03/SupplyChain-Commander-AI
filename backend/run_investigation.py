#!/usr/bin/env python3
import sys
import os
import json

# Ensure repository root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.agents.commander_agent import CommanderAgent
from backend.app.models.strategy import StrategyScoreWeights

def main():
    try:
        input_data = {}
        if len(sys.argv) > 1:
            input_data = json.loads(sys.argv[1])
        elif not sys.stdin.isatty():
            raw = sys.stdin.read()
            if raw.strip():
                input_data = json.loads(raw)

        disruption_id = input_data.get("disruption_id", "DISR_001")
        weights_raw = input_data.get("scoring_weights", {})
        
        weights = StrategyScoreWeights(
            recovery_speed_weight=float(weights_raw.get("recovery_speed_weight", 0.30)),
            revenue_protection_weight=float(weights_raw.get("revenue_protection_weight", 0.25)),
            cost_efficiency_weight=float(weights_raw.get("cost_efficiency_weight", 0.25)),
            customer_impact_weight=float(weights_raw.get("customer_impact_weight", 0.20))
        )

        result = CommanderAgent.run_investigation(disruption_id, weights)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"status": "FAILED", "error": str(e)}))

if __name__ == "__main__":
    main()
