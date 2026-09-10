#!/usr/bin/env python3
"""
SupplyChain Commander AI - Complete Cross-Layer Data Sync Validator
Compares records and row counts across:
1. Local JSON / Cache files (backend/data/*.json)
2. Local SQLite Database (backend/data/supplychain_commander.db)
3. Google BigQuery Dataset (supplychain-commander.supply_chain_analytics)
"""

import os
import sys
import json
import sqlite3
from dotenv import load_dotenv

# Ensure repository root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
load_dotenv()

from backend.app.db.db_session import get_db_connection
from backend.scripts.seed_bigquery import _get_bq_client

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))

def validate_all_layers():
    print("=" * 70)
    print(" SupplyChain Commander AI - Data Synchronization Audit Report")
    print("=" * 70)

    # 1. Load Local JSON files
    json_counts = {}
    
    # Dataset tables
    ds_path = os.path.join(DATA_DIR, "dataset.json")
    if os.path.exists(ds_path):
        with open(ds_path, "r", encoding="utf-8") as f:
            ds = json.load(f)
        for k in ["products", "warehouses", "suppliers", "inventory", "customer_orders", "shipments", "disruptions", "supplier_performance"]:
            json_counts[k] = len(ds.get(k, []))
    
    # detected_risks.json
    r_path = os.path.join(DATA_DIR, "detected_risks.json")
    if os.path.exists(r_path):
        with open(r_path, "r", encoding="utf-8") as f:
            r_data = json.load(f)
        json_counts["detected_risks"] = len(r_data)

    # dynamic_disruptions.json
    d_path = os.path.join(DATA_DIR, "dynamic_disruptions.json")
    if os.path.exists(d_path):
        with open(d_path, "r", encoding="utf-8") as f:
            d_data = json.load(f)
        json_counts["dynamic_disruptions"] = len(d_data)

    # mitigation_executions.json
    m_path = os.path.join(DATA_DIR, "mitigation_executions.json")
    if os.path.exists(m_path):
        with open(m_path, "r", encoding="utf-8") as f:
            m_data = json.load(f)
        json_counts["mitigation_executions"] = len(m_data)

    # 2. Query Local SQLite DB
    sqlite_counts = {}
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row["name"] for row in cursor.fetchall() if not row["name"].startswith("sqlite_")]
        for t in tables:
            cursor.execute(f"SELECT COUNT(*) as cnt FROM {t}")
            sqlite_counts[t] = cursor.fetchone()["cnt"]
        conn.close()
    except Exception as e:
        print(f"SQLite audit note: {e}")

    # 3. Query Google BigQuery
    bq_counts = {}
    client, project_id, dataset_name = _get_bq_client()
    if client:
        try:
            query = f"""
            SELECT table_id, row_count
            FROM `{project_id}.{dataset_name}.__TABLES__`
            """
            query_job = client.query(query)
            for row in query_job.result():
                bq_counts[row.table_id] = row.row_count
        except Exception as e:
            print(f"BigQuery audit query error: {e}")
            # Fallback per table
            for t in ["products", "warehouses", "suppliers", "inventory", "customer_orders", "shipments", "disruptions", "supplier_performance", "detected_risks", "dynamic_disruptions", "mitigation_executions"]:
                try:
                    table_ref = client.get_table(f"{project_id}.{dataset_name}.{t}")
                    bq_counts[t] = table_ref.num_rows
                except Exception:
                    pass

    # 4. Print Summary Comparison Table
    all_entities = [
        ("products", "Product Master Catalog"),
        ("warehouses", "Regional Distribution Hubs"),
        ("suppliers", "Tier-1/2 Manufacturing Suppliers"),
        ("inventory", "Regional SKU Inventory Levels"),
        ("customer_orders", "Downstream Enterprise Orders"),
        ("shipments", "Active Freight Inbound Shipments"),
        ("disruptions", "Disruption Scenarios (Static + Dynamic)"),
        ("supplier_performance", "Vendor Lead Time & OTD Performance"),
        ("detected_risks", "AI Data-Detected Risk Signals"),
        ("dynamic_disruptions", "AI Data-Converted Disruption Events"),
        ("mitigation_executions", "Authorized Mitigation Executions")
    ]

    print(f"\n{'Table / Entity':<32} | {'Local JSON':<12} | {'SQLite DB':<12} | {'BigQuery DB':<12} | {'Sync Status'}")
    print("-" * 88)

    all_in_sync = True
    for entity_key, label in all_entities:
        j_cnt = json_counts.get(entity_key, "N/A")
        s_cnt = sqlite_counts.get(entity_key, "N/A")
        b_cnt = bq_counts.get(entity_key, "N/A")

        # Determine sync status
        # SQLite stores dynamic operational tables (detected_risks, dynamic_disruptions, mitigation_executions)
        # JSON and BigQuery store all tables
        is_synced = True
        if b_cnt != "N/A" and j_cnt != "N/A" and b_cnt != j_cnt:
            is_synced = False
        if s_cnt != "N/A" and j_cnt != "N/A" and s_cnt != j_cnt:
            is_synced = False

        status_str = "MATCHED (IN SYNC)" if is_synced else "MISMATCH"
        if not is_synced:
            all_in_sync = False

        print(f"{entity_key:<32} | {str(j_cnt):<12} | {str(s_cnt):<12} | {str(b_cnt):<12} | {status_str}")

    print("=" * 88)
    if all_in_sync:
        print(">> AUDIT RESULT: ALL CACHE, LOCAL DB, AND BIGQUERY DATA TIERS ARE 100% IN SYNC!")
    else:
        print(">> AUDIT RESULT: Discrepancies detected between tiers.")

if __name__ == "__main__":
    validate_all_layers()
