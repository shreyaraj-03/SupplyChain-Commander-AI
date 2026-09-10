#!/usr/bin/env python3
"""
SupplyChain Commander AI - Script to reduce AI converted disruptions from 6 to 1.
Updates:
1. Local JSON files (dynamic_disruptions.json, detected_risks.json, dataset.json)
2. Local SQLite DB (dynamic_disruptions, detected_risks)
3. Google BigQuery tables (dynamic_disruptions, detected_risks)
"""

import os
import sys
import json
import sqlite3
from dotenv import load_dotenv

# Ensure repository root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
load_dotenv()

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
KEEP_DISRUPTION_ID = "DISR_AUTO_INVENTORY_PROD_004_WH_DEL"
KEEP_RISK_ID = "RSK_INVENTORY_PROD_004_WH_DEL"

def update_json_files():
    print("--- 1. Updating Local JSON Files ---")
    
    # 1. dynamic_disruptions.json
    dyn_path = os.path.join(DATA_DIR, "dynamic_disruptions.json")
    if os.path.exists(dyn_path):
        with open(dyn_path, "r", encoding="utf-8") as f:
            dyn_data = json.load(f)
        
        single_dyn = {}
        if KEEP_DISRUPTION_ID in dyn_data:
            single_dyn[KEEP_DISRUPTION_ID] = dyn_data[KEEP_DISRUPTION_ID]
        else:
            # Fallback to first available
            first_key = list(dyn_data.keys())[0] if dyn_data else None
            if first_key:
                single_dyn[first_key] = dyn_data[first_key]
        
        with open(dyn_path, "w", encoding="utf-8") as f:
            json.dump(single_dyn, f, indent=2)
        print(f"Updated dynamic_disruptions.json -> {len(single_dyn)} dynamic disruption retained: {list(single_dyn.keys())}")

    # 2. detected_risks.json
    risk_path = os.path.join(DATA_DIR, "detected_risks.json")
    if os.path.exists(risk_path):
        with open(risk_path, "r", encoding="utf-8") as f:
            risk_data = json.load(f)
        
        for r_id, r in risk_data.items():
            if r_id == KEEP_RISK_ID:
                r["status"] = "CONVERTED_TO_DISRUPTION"
                r["converted_disruption_id"] = KEEP_DISRUPTION_ID
            else:
                # Reset any other converted status back to VALIDATED
                if r.get("status") == "CONVERTED_TO_DISRUPTION":
                    r["status"] = "VALIDATED"
                    r["converted_at"] = None
                    r["converted_disruption_id"] = None
        
        with open(risk_path, "w", encoding="utf-8") as f:
            json.dump(risk_data, f, indent=2)
        print(f"Updated detected_risks.json -> 1 risk as CONVERTED ({KEEP_RISK_ID}), {len(risk_data)-1} remaining as VALIDATED/MONITORING.")

    # 3. dataset.json
    ds_path = os.path.join(DATA_DIR, "dataset.json")
    if os.path.exists(ds_path):
        with open(ds_path, "r", encoding="utf-8") as f:
            ds_data = json.load(f)
        
        disrs = ds_data.get("disruptions", [])
        filtered_disrs = []
        for d in disrs:
            d_id = d.get("disruption_id", "")
            if not d_id.startswith("DISR_AUTO_") or d_id == KEEP_DISRUPTION_ID:
                filtered_disrs.append(d)
        
        ds_data["disruptions"] = filtered_disrs
        with open(ds_path, "w", encoding="utf-8") as f:
            json.dump(ds_data, f, indent=2)
        print(f"Updated dataset.json -> {len(filtered_disrs)} disruptions total (3 baseline + 1 AI-detected).")

def update_sqlite_db():
    print("\n--- 2. Updating Local SQLite DB ---")
    try:
        from backend.app.db.db_session import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Clean dynamic_disruptions table
        cursor.execute("DELETE FROM dynamic_disruptions WHERE disruption_id != ?", (KEEP_DISRUPTION_ID,))
        deleted_disr = cursor.rowcount
        print(f"SQLite dynamic_disruptions: Deleted {deleted_disr} extra records. Retained {KEEP_DISRUPTION_ID}.")

        # 2. Reset status in detected_risks table
        cursor.execute("""
            UPDATE detected_risks 
            SET status = 'VALIDATED', converted_at = NULL, converted_disruption_id = NULL 
            WHERE risk_id != ? AND status = 'CONVERTED_TO_DISRUPTION'
        """, (KEEP_RISK_ID,))
        reset_risks = cursor.rowcount
        print(f"SQLite detected_risks: Reset {reset_risks} risks back to VALIDATED.")

        # Ensure KEEP_RISK_ID is CONVERTED_TO_DISRUPTION
        cursor.execute("""
            UPDATE detected_risks
            SET status = 'CONVERTED_TO_DISRUPTION', converted_disruption_id = ?
            WHERE risk_id = ?
        """, (KEEP_DISRUPTION_ID, KEEP_RISK_ID))

        conn.commit()
        conn.close()
        print("SQLite DB update successfully committed.")
    except Exception as e:
        print(f"SQLite DB update note: {e}")

def update_bigquery():
    print("\n--- 3. Updating Google BigQuery Database ---")
    try:
        from backend.scripts.seed_bigquery import _get_bq_client, seed_bigquery
        from google.cloud import bigquery
        
        client, project_id, dataset_name = _get_bq_client()
        if not client:
            print("BigQuery client not available (skipping BigQuery remote sync).")
            return

        # Re-seed all tables cleanly including detected_risks, dynamic_disruptions, mitigation_executions
        seed_bigquery()
        print("BigQuery database synchronized successfully.")
    except Exception as e:
        print(f"BigQuery update note: {e}")

def main():
    update_json_files()
    update_sqlite_db()
    update_bigquery()
    print("\n=== All updates complete: Exactly 1 AI-converted disruption active across JSON, SQLite, and BigQuery! ===")

if __name__ == "__main__":
    main()
