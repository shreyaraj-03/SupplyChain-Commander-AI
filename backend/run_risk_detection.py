#!/usr/bin/env python3
"""
SupplyChain Commander AI - Risk Detection CLI & Subprocess Runner
Provides JSON IPC interface for Node ingress and automated schedulers.
"""

import sys
import os
import json

# Ensure repository root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.tools.mcp_tools import _load_dataset
from backend.app.risk_detection.risk_engine import RiskDetectionEngine
from backend.app.risk_detection.risk_repository import RiskRepository

def main():
    try:
        input_data = {}
        if len(sys.argv) > 1 and sys.argv[1].strip():
            try:
                input_data = json.loads(sys.argv[1])
            except Exception:
                input_data = {"action": sys.argv[1]}
        elif not sys.stdin.isatty():
            raw = sys.stdin.read()
            if raw.strip():
                input_data = json.loads(raw)

        action = input_data.get("action", "run_scan")
        dataset = _load_dataset()
        
        if action == "run_scan":
            trigger_type = input_data.get("trigger_type", "MANUAL")
            auto_convert = input_data.get("auto_convert_critical", True)
            result = RiskDetectionEngine.run_detection_scan(
                dataset=dataset,
                trigger_type=trigger_type,
                auto_convert_critical=auto_convert
            )
            print(json.dumps({"success": True, **result}))
            
        elif action == "list_risks":
            risks = RiskRepository.list_risks(
                status=input_data.get("status"),
                severity=input_data.get("severity"),
                risk_type=input_data.get("risk_type"),
                product_id=input_data.get("product_id"),
                warehouse_id=input_data.get("warehouse_id"),
                supplier_id=input_data.get("supplier_id")
            )
            print(json.dumps({"success": True, "count": len(risks), "risks": [r.to_dict() for r in risks]}))
            
        elif action == "convert_risk":
            risk_id = input_data.get("risk_id")
            if not risk_id:
                print(json.dumps({"success": False, "error": "risk_id is required"}))
                return
            disruption = RiskDetectionEngine.convert_risk_to_disruption(risk_id, dataset)
            if not disruption:
                print(json.dumps({"success": False, "error": f"Risk {risk_id} not found"}))
                return
            print(json.dumps({"success": True, "disruption": disruption}))
            
        else:
            print(json.dumps({"success": False, "error": f"Unknown action {action}"}))
            
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
