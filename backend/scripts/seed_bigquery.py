import os
import sys
import json
from dotenv import load_dotenv

# Load .env file
load_dotenv()

from google.cloud import bigquery

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

def seed_bigquery():
    project_id = os.getenv("GCP_PROJECT_ID", "supplychain-commander")
    dataset_name = os.getenv("BIGQUERY_DATASET", "supply_chain_analytics")
    
    print(f"Connecting to BigQuery project: '{project_id}', dataset: '{dataset_name}'...")
    try:
        client = bigquery.Client(project=project_id)
    except Exception as e:
        print(f"Failed to initialize BigQuery Client: {e}")
        return

    # 1. Provision DDL Tables directly from sql/risk_schema.sql
    schema_path = os.path.join(os.path.dirname(__file__), "..", "..", "sql", "risk_schema.sql")
    if os.path.exists(schema_path):
        with open(schema_path, "r", encoding="utf-8") as f:
            sql_content = f.read()
            # Execute BigQuery statements (everything before SQLite DDL section)
            bq_sql = sql_content.split("-- 4. SQLite DDL")[0].split("-- 3. SQLite DDL")[0]
            statements = [stmt.strip() for stmt in bq_sql.split(";") if stmt.strip() and not stmt.strip().startswith("--")]
            for stmt in statements:
                try:
                    query_job = client.query(stmt)
                    query_job.result()
                    print("Successfully provisioned BigQuery table schema.")
                except Exception as e:
                    print(f"Note on DDL creation: {e}")

    # 2. Load synthetic dataset for operational tables
    dataset_path = os.path.join(os.path.dirname(__file__), "..", "data", "dataset.json")
    if not os.path.exists(dataset_path):
        from backend.data.generate_synthetic_data import generate_datasets
        data = generate_datasets()
    else:
        with open(dataset_path, "r", encoding="utf-8") as f:
            data = json.load(f)

    tables_to_seed = [
        "products",
        "suppliers",
        "warehouses",
        "inventory",
        "customer_orders",
        "shipments",
        "disruptions",
        "supplier_performance"
    ]

    for table_name in tables_to_seed:
        records = data.get(table_name, [])
        if not records:
            continue
        
        table_id = f"{project_id}.{dataset_name}.{table_name}"
        print(f"Seeding {len(records)} records into table '{table_id}'...")
        
        try:
            job_config = bigquery.LoadJobConfig(
                write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
                source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON
            )
            job = client.load_table_from_json(records, table_id, job_config=job_config)
            job.result()
            table = client.get_table(table_id)
            print(f"Successfully seeded '{table_name}'. Current row count: {table.num_rows}")
        except Exception as e:
            print(f"Error seeding table '{table_name}': {e}")

    # 3. Seed mitigation_executions if records exist
    exec_path = os.path.join(os.path.dirname(__file__), "..", "data", "mitigation_executions.json")
    if os.path.exists(exec_path):
        try:
            with open(exec_path, "r", encoding="utf-8") as f:
                exec_data = json.load(f)
            exec_records = list(exec_data.values()) if isinstance(exec_data, dict) else exec_data
            if exec_records:
                formatted_records = []
                for r in exec_records:
                    steps_val = r.get("steps") or r.get("execution_steps_json") or []
                    formatted_records.append({
                        "execution_id": str(r.get("execution_id", "")),
                        "disruption_id": str(r.get("disruption_id", "")),
                        "strategy_id": str(r.get("strategy_id", "")),
                        "strategy_name": str(r.get("strategy_name", "")),
                        "authorized_budget": float(r.get("authorized_budget", 0.0)),
                        "executed_at": r.get("executed_at") or None,
                        "status": str(r.get("status", "SUCCESS")),
                        "execution_steps_json": json.dumps(steps_val) if not isinstance(steps_val, str) else steps_val
                    })
                table_id = f"{project_id}.{dataset_name}.mitigation_executions"
                job_config = bigquery.LoadJobConfig(
                    write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
                    source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON
                )
                job = client.load_table_from_json(formatted_records, table_id, job_config=job_config)
                job.result()
                print(f"Successfully seeded {len(formatted_records)} records into BigQuery '{table_id}'.")
        except Exception as e:
            print(f"Note on seeding mitigation_executions to BigQuery: {e}")

    # 4. Seed detected_risks if records exist
    risk_path = os.path.join(os.path.dirname(__file__), "..", "data", "detected_risks.json")
    if os.path.exists(risk_path):
        try:
            with open(risk_path, "r", encoding="utf-8") as f:
                risk_data = json.load(f)
            risk_records = list(risk_data.values()) if isinstance(risk_data, dict) else risk_data
            if risk_records:
                formatted_risks = []
                for r in risk_records:
                    formatted_risks.append({
                        "risk_id": str(r.get("risk_id", "")),
                        "risk_type": str(r.get("risk_type", "")),
                        "severity": str(r.get("severity", "")),
                        "status": str(r.get("status", "")),
                        "detection_method": str(r.get("detection_method") or r.get("risk_type") or "DETERMINISTIC"),
                        "detection_confidence": float(r.get("detection_confidence") or r.get("confidence") or 0.95),
                        "entity_type": str(r.get("entity_type") or ("WAREHOUSE" if r.get("warehouse_id") else "SUPPLIER")),
                        "entity_id": str(r.get("entity_id") or r.get("warehouse_id") or r.get("supplier_id") or "UNKNOWN"),
                        "product_id": r.get("product_id") or None,
                        "warehouse_id": r.get("warehouse_id") or None,
                        "supplier_id": r.get("supplier_id") or None,
                        "detected_at": r.get("detected_at") or None,
                        "validated_at": r.get("validated_at") or None,
                        "converted_at": r.get("converted_at") or None,
                        "converted_disruption_id": r.get("converted_disruption_id") or None,
                        "evidence_json": json.dumps(r.get("evidence", {})) if not isinstance(r.get("evidence"), str) else (r.get("evidence") or "{}")
                    })
                table_id = f"{project_id}.{dataset_name}.detected_risks"
                job_config = bigquery.LoadJobConfig(
                    write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
                    source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON
                )
                job = client.load_table_from_json(formatted_risks, table_id, job_config=job_config)
                job.result()
                print(f"Successfully seeded {len(formatted_risks)} records into BigQuery '{table_id}'.")
        except Exception as e:
            print(f"Note on seeding detected_risks to BigQuery: {e}")

    # 5. Seed dynamic_disruptions if records exist
    dyn_path = os.path.join(os.path.dirname(__file__), "..", "data", "dynamic_disruptions.json")
    if os.path.exists(dyn_path):
        try:
            with open(dyn_path, "r", encoding="utf-8") as f:
                dyn_data = json.load(f)
            dyn_records = list(dyn_data.values()) if isinstance(dyn_data, dict) else dyn_data
            if dyn_records:
                formatted_disrs = []
                for d in dyn_records:
                    ev = d.get("detection_evidence") or d.get("evidence_json") or {}
                    formatted_disrs.append({
                        "disruption_id": str(d.get("disruption_id", "")),
                        "disruption_type": str(d.get("disruption_type", "")),
                        "entity_type": str(d.get("entity_type", "WAREHOUSE")),
                        "entity_id": str(d.get("entity_id", "UNKNOWN")),
                        "entity_name": str(d.get("entity_name", "Unknown Entity")),
                        "severity": str(d.get("severity", "MEDIUM")),
                        "reported_at": d.get("reported_at") or None,
                        "expected_duration_days": int(d.get("expected_duration_days", 7)),
                        "description": str(d.get("description", "")),
                        "status": str(d.get("status", "ACTIVE")),
                        "scenario_tag": str(d.get("scenario_tag", "")),
                        "affected_product_id": str(d.get("affected_product_id", "")),
                        "destination_warehouse_id": str(d.get("destination_warehouse_id", "")),
                        "source": str(d.get("source", "DATA_DETECTED")),
                        "risk_id": d.get("risk_id") or None,
                        "detection_method": d.get("detection_method") or None,
                        "detection_confidence": float(d.get("detection_confidence", 0.95)) if d.get("detection_confidence") is not None else None,
                        "detected_at": d.get("detected_at") or None,
                        "validated_at": d.get("validated_at") or None,
                        "evidence_json": json.dumps(ev) if not isinstance(ev, str) else ev
                    })
                table_id = f"{project_id}.{dataset_name}.dynamic_disruptions"
                job_config = bigquery.LoadJobConfig(
                    write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
                    source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON
                )
                job = client.load_table_from_json(formatted_disrs, table_id, job_config=job_config)
                job.result()
                print(f"Successfully seeded {len(formatted_disrs)} records into BigQuery '{table_id}'.")
        except Exception as e:
            print(f"Note on seeding dynamic_disruptions to BigQuery: {e}")

    print("\nBigQuery Provisioning & Seeding Completed!")

def _get_bq_client():
    project_id = os.getenv("GCP_PROJECT_ID", "supplychain-commander")
    dataset_name = os.getenv("BIGQUERY_DATASET", "supply_chain_analytics")
    try:
        from google.cloud import bigquery
        client = bigquery.Client(project=project_id)
        return client, project_id, dataset_name
    except Exception as e:
        return None, None, None

def sync_detected_risk_to_bigquery(risk_dict: dict) -> bool:
    """Stream insert or update a detected risk record directly into BigQuery."""
    client, project_id, dataset_name = _get_bq_client()
    if not client:
        return False
    try:
        table_id = f"{project_id}.{dataset_name}.detected_risks"
        ev = risk_dict.get("evidence") or risk_dict.get("evidence_json") or {}
        row = {
            "risk_id": str(risk_dict.get("risk_id", "")),
            "risk_type": str(risk_dict.get("risk_type", "")),
            "severity": str(risk_dict.get("severity", "")),
            "status": str(risk_dict.get("status", "")),
            "detection_method": str(risk_dict.get("detection_method") or risk_dict.get("risk_type") or "DETERMINISTIC"),
            "detection_confidence": float(risk_dict.get("detection_confidence") or risk_dict.get("confidence") or 0.95),
            "entity_type": str(risk_dict.get("entity_type") or ("WAREHOUSE" if risk_dict.get("warehouse_id") else "SUPPLIER")),
            "entity_id": str(risk_dict.get("entity_id") or risk_dict.get("warehouse_id") or risk_dict.get("supplier_id") or "UNKNOWN"),
            "product_id": risk_dict.get("product_id") or None,
            "warehouse_id": risk_dict.get("warehouse_id") or None,
            "supplier_id": risk_dict.get("supplier_id") or None,
            "detected_at": risk_dict.get("detected_at") or None,
            "validated_at": risk_dict.get("validated_at") or None,
            "converted_at": risk_dict.get("converted_at") or None,
            "converted_disruption_id": risk_dict.get("converted_disruption_id") or risk_dict.get("associated_disruption_id") or None,
            "evidence_json": json.dumps(ev) if not isinstance(ev, str) else ev
        }
        errors = client.insert_rows_json(table_id, [row])
        if errors:
            print(f"[BigQuery Streaming Error] Failed to insert risk into {table_id}: {errors}")
            return False
        print(f"[BigQuery Streaming Success] Detected risk {row['risk_id']} inserted into BigQuery.")
        return True
    except Exception as e:
        print(f"[BigQuery Sync Note] Detected risk BigQuery stream skipped: {e}")
        return False

def sync_batch_risks_to_bigquery(risks: list) -> bool:
    """Stream insert a batch of detected risks directly into BigQuery."""
    if not risks:
        return True
    client, project_id, dataset_name = _get_bq_client()
    if not client:
        return False
    try:
        table_id = f"{project_id}.{dataset_name}.detected_risks"
        rows = []
        for r in risks:
            r_dict = r if isinstance(r, dict) else (r.to_dict() if hasattr(r, "to_dict") else vars(r))
            ev = r_dict.get("evidence") or r_dict.get("evidence_json") or {}
            rows.append({
                "risk_id": str(r_dict.get("risk_id", "")),
                "risk_type": str(r_dict.get("risk_type", "")),
                "severity": str(r_dict.get("severity", "")),
                "status": str(r_dict.get("status", "")),
                "detection_method": str(r_dict.get("detection_method") or r_dict.get("risk_type") or "DETERMINISTIC"),
                "detection_confidence": float(r_dict.get("detection_confidence") or r_dict.get("confidence") or 0.95),
                "entity_type": str(r_dict.get("entity_type") or ("WAREHOUSE" if r_dict.get("warehouse_id") else "SUPPLIER")),
                "entity_id": str(r_dict.get("entity_id") or r_dict.get("warehouse_id") or r_dict.get("supplier_id") or "UNKNOWN"),
                "product_id": r_dict.get("product_id") or None,
                "warehouse_id": r_dict.get("warehouse_id") or None,
                "supplier_id": r_dict.get("supplier_id") or None,
                "detected_at": r_dict.get("detected_at") or None,
                "validated_at": r_dict.get("validated_at") or None,
                "converted_at": r_dict.get("converted_at") or None,
                "converted_disruption_id": r_dict.get("converted_disruption_id") or r_dict.get("associated_disruption_id") or None,
                "evidence_json": json.dumps(ev) if not isinstance(ev, str) else ev
            })
        errors = client.insert_rows_json(table_id, rows)
        if errors:
            print(f"[BigQuery Streaming Error] Failed to insert batch risks: {errors}")
            return False
        print(f"[BigQuery Streaming Success] {len(rows)} detected risks stream-inserted into BigQuery.")
        return True
    except Exception as e:
        print(f"[BigQuery Sync Note] Batch risk BigQuery stream skipped: {e}")
        return False

def sync_dynamic_disruption_to_bigquery(disruption: dict) -> bool:
    """Stream insert a newly created/updated dynamic disruption record directly into BigQuery."""
    client, project_id, dataset_name = _get_bq_client()
    if not client:
        return False
    try:
        table_id = f"{project_id}.{dataset_name}.dynamic_disruptions"
        ev = disruption.get("detection_evidence") or disruption.get("evidence_json") or {}
        row = {
            "disruption_id": str(disruption.get("disruption_id", "")),
            "disruption_type": str(disruption.get("disruption_type", "")),
            "entity_type": str(disruption.get("entity_type", "WAREHOUSE")),
            "entity_id": str(disruption.get("entity_id", "UNKNOWN")),
            "entity_name": str(disruption.get("entity_name", "Unknown Entity")),
            "severity": str(disruption.get("severity", "MEDIUM")),
            "reported_at": disruption.get("reported_at") or None,
            "expected_duration_days": int(disruption.get("expected_duration_days", 7)),
            "description": str(disruption.get("description", "")),
            "status": str(disruption.get("status", "ACTIVE")),
            "scenario_tag": str(disruption.get("scenario_tag", "")),
            "affected_product_id": str(disruption.get("affected_product_id", "")),
            "destination_warehouse_id": str(disruption.get("destination_warehouse_id", "")),
            "source": str(disruption.get("source", "DATA_DETECTED")),
            "risk_id": disruption.get("risk_id") or None,
            "detection_method": disruption.get("detection_method") or None,
            "detection_confidence": float(disruption.get("detection_confidence", 0.95)) if disruption.get("detection_confidence") is not None else None,
            "detected_at": disruption.get("detected_at") or None,
            "validated_at": disruption.get("validated_at") or None,
            "evidence_json": json.dumps(ev) if not isinstance(ev, str) else ev
        }
        errors = client.insert_rows_json(table_id, [row])
        if errors:
            print(f"[BigQuery Streaming Error] Failed to insert dynamic disruption into {table_id}: {errors}")
            return False
        print(f"[BigQuery Streaming Success] Dynamic disruption {row['disruption_id']} inserted into BigQuery.")
        return True
    except Exception as e:
        print(f"[BigQuery Sync Note] Dynamic disruption BigQuery stream skipped: {e}")
        return False

def sync_mitigation_execution_to_bigquery(execution: dict) -> bool:
    """Stream insert a newly authorized mitigation execution record directly into BigQuery."""
    client, project_id, dataset_name = _get_bq_client()
    if not client:
        return False
    try:
        table_id = f"{project_id}.{dataset_name}.mitigation_executions"
        steps_val = execution.get("steps") or execution.get("execution_steps_json") or []
        row = {
            "execution_id": str(execution.get("execution_id", "")),
            "disruption_id": str(execution.get("disruption_id", "")),
            "strategy_id": str(execution.get("strategy_id", "")),
            "strategy_name": str(execution.get("strategy_name", "")),
            "authorized_budget": float(execution.get("authorized_budget", 0.0)),
            "executed_at": execution.get("executed_at") or None,
            "status": str(execution.get("status", "SUCCESS")),
            "execution_steps_json": json.dumps(steps_val) if not isinstance(steps_val, str) else steps_val
        }
        errors = client.insert_rows_json(table_id, [row])
        if errors:
            print(f"[BigQuery Streaming Error] Failed to insert execution into {table_id}: {errors}")
            return False
        print(f"[BigQuery Streaming Success] Mitigation execution {row['execution_id']} inserted into BigQuery.")
        return True
    except Exception as e:
        print(f"[BigQuery Sync Note] BigQuery stream sync skipped: {e}")
        return False

if __name__ == "__main__":
    seed_bigquery()
