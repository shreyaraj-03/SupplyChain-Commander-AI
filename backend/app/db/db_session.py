"""
SupplyChain Commander AI - Database Session & Connection Manager
Provides SQLite local persistent storage (backend/data/supplychain_commander.db)
and optional BigQuery/Cloud SQL table synchronization.
"""

import os
import sqlite3
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
DB_PATH = os.getenv("TEST_DB_PATH") or os.path.join(DB_DIR, "supplychain_commander.db")

def get_db_connection() -> sqlite3.Connection:
    if not os.getenv("TEST_DB_PATH"):
        os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
    except Exception:
        pass
    return conn

def init_db():
    """Ensure database tables exist on startup."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS detected_risks (
        risk_id TEXT PRIMARY KEY,
        risk_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        title TEXT,
        description TEXT,
        detection_method TEXT,
        detection_confidence REAL,
        entity_type TEXT,
        entity_id TEXT,
        product_id TEXT,
        product_name TEXT,
        warehouse_id TEXT,
        warehouse_name TEXT,
        supplier_id TEXT,
        supplier_name TEXT,
        estimated_revenue_at_risk REAL,
        orders_affected_count INTEGER,
        days_to_impact REAL,
        detected_at TEXT,
        validated_at TEXT,
        converted_at TEXT,
        converted_disruption_id TEXT,
        evidence_json TEXT
    );
    """)

    # Migrate existing SQLite table if columns were missing
    new_cols = [
        ("title", "TEXT"),
        ("description", "TEXT"),
        ("product_name", "TEXT"),
        ("warehouse_name", "TEXT"),
        ("supplier_name", "TEXT"),
        ("estimated_revenue_at_risk", "REAL"),
        ("orders_affected_count", "INTEGER"),
        ("days_to_impact", "REAL")
    ]
    for col_name, col_type in new_cols:
        try:
            cursor.execute(f"ALTER TABLE detected_risks ADD COLUMN {col_name} {col_type};")
        except Exception:
            pass

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dynamic_disruptions (
        disruption_id TEXT PRIMARY KEY,
        disruption_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_name TEXT NOT NULL,
        severity TEXT NOT NULL,
        reported_at TEXT NOT NULL,
        expected_duration_days INTEGER NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        scenario_tag TEXT NOT NULL,
        affected_product_id TEXT NOT NULL,
        destination_warehouse_id TEXT NOT NULL,
        source TEXT NOT NULL,
        risk_id TEXT,
        detection_method TEXT,
        detection_confidence REAL,
        detected_at TEXT,
        validated_at TEXT,
        evidence_json TEXT
    );
    """)

    conn.commit()
    conn.close()

# Auto-initialize DB on import
init_db()
