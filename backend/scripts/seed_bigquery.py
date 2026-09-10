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
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    project_id = os.getenv("GCP_PROJECT_ID", "supplychain-commander")
    dataset_name = os.getenv("BIGQUERY_DATASET", "supply_chain_analytics")
    try:
        from google.cloud import bigquery
        client = bigquery.Client(project=project_id)
        return client, project_id, dataset_name
    except Exception as e:
        return None, None, None

def sync_detected_risk_to_bigquery(risk_dict: dict) -> bool:
    """Idempotently upsert a detected risk record into BigQuery using SQL MERGE."""
    client, project_id, dataset_name = _get_bq_client()
    if not client:
        return False
    try:
        r_dict = risk_dict if isinstance(risk_dict, dict) else (risk_dict.to_dict() if hasattr(risk_dict, "to_dict") else vars(risk_dict))
        ev = r_dict.get("evidence") or r_dict.get("evidence_json") or {}
        evidence_str = json.dumps(ev) if not isinstance(ev, str) else ev

        query = f"""
        MERGE `{project_id}.{dataset_name}.detected_risks` T
        USING (
          SELECT
            @risk_id AS risk_id,
            @risk_type AS risk_type,
            @severity AS severity,
            @status AS status,
            @detection_method AS detection_method,
            @detection_confidence AS detection_confidence,
            @entity_type AS entity_type,
            @entity_id AS entity_id,
            @product_id AS product_id,
            @warehouse_id AS warehouse_id,
            @supplier_id AS supplier_id,
            SAFE_CAST(@detected_at AS TIMESTAMP) AS detected_at,
            @validated_at AS validated_at,
            SAFE_CAST(@converted_at AS TIMESTAMP) AS converted_at,
            @converted_disruption_id AS converted_disruption_id,
            @evidence_json AS evidence_json
        ) S
        ON T.risk_id = S.risk_id
        WHEN MATCHED THEN
          UPDATE SET
            status = S.status,
            severity = S.severity,
            detection_confidence = S.detection_confidence,
            validated_at = S.validated_at,
            converted_at = S.converted_at,
            converted_disruption_id = S.converted_disruption_id,
            evidence_json = S.evidence_json
        WHEN NOT MATCHED THEN
          INSERT (
            risk_id, risk_type, severity, status, detection_method,
            detection_confidence, entity_type, entity_id, product_id,
            warehouse_id, supplier_id, detected_at, validated_at,
            converted_at, converted_disruption_id, evidence_json
          )
          VALUES (
            S.risk_id, S.risk_type, S.severity, S.status, S.detection_method,
            S.detection_confidence, S.entity_type, S.entity_id, S.product_id,
            S.warehouse_id, S.supplier_id, S.detected_at, S.validated_at,
            S.converted_at, S.converted_disruption_id, S.evidence_json
          )
        """

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("risk_id", "STRING", str(r_dict.get("risk_id", ""))),
                bigquery.ScalarQueryParameter("risk_type", "STRING", str(r_dict.get("risk_type", ""))),
                bigquery.ScalarQueryParameter("severity", "STRING", str(r_dict.get("severity", ""))),
                bigquery.ScalarQueryParameter("status", "STRING", str(r_dict.get("status", ""))),
                bigquery.ScalarQueryParameter("detection_method", "STRING", str(r_dict.get("detection_method") or r_dict.get("risk_type") or "DETERMINISTIC")),
                bigquery.ScalarQueryParameter("detection_confidence", "FLOAT64", float(r_dict.get("detection_confidence") or r_dict.get("confidence") or 0.95)),
                bigquery.ScalarQueryParameter("entity_type", "STRING", str(r_dict.get("entity_type") or ("WAREHOUSE" if r_dict.get("warehouse_id") else "SUPPLIER"))),
                bigquery.ScalarQueryParameter("entity_id", "STRING", str(r_dict.get("entity_id") or r_dict.get("warehouse_id") or r_dict.get("supplier_id") or "UNKNOWN")),
                bigquery.ScalarQueryParameter("product_id", "STRING", r_dict.get("product_id") or None),
                bigquery.ScalarQueryParameter("warehouse_id", "STRING", r_dict.get("warehouse_id") or None),
                bigquery.ScalarQueryParameter("supplier_id", "STRING", r_dict.get("supplier_id") or None),
                bigquery.ScalarQueryParameter("detected_at", "STRING", r_dict.get("detected_at") or None),
                bigquery.ScalarQueryParameter("validated_at", "STRING", str(r_dict.get("validated_at")) if r_dict.get("validated_at") else None),
                bigquery.ScalarQueryParameter("converted_at", "STRING", r_dict.get("converted_at") or None),
                bigquery.ScalarQueryParameter("converted_disruption_id", "STRING", r_dict.get("converted_disruption_id") or r_dict.get("associated_disruption_id") or None),
                bigquery.ScalarQueryParameter("evidence_json", "STRING", evidence_str)
            ]
        )
        job = client.query(query, job_config=job_config)
        job.result()
        print(f"[BigQuery MERGE Success] Detected risk {r_dict.get('risk_id')} synced.")
        return True
    except Exception as e:
        print(f"[BigQuery Sync Note] Detected risk BigQuery MERGE skipped: {e}")
        return False

def sync_batch_risks_to_bigquery(risks: list) -> bool:
    """Idempotently sync a batch of detected risks directly into BigQuery."""
    if not risks:
        return True
    success = True
    for r in risks:
        ok = sync_detected_risk_to_bigquery(r)
        if not ok:
            success = False
    return success

def sync_dynamic_disruption_to_bigquery(disruption: dict) -> bool:
    """Idempotently upsert a dynamic disruption record into BigQuery using SQL MERGE."""
    client, project_id, dataset_name = _get_bq_client()
    if not client:
        return False
    try:
        ev = disruption.get("detection_evidence") or disruption.get("evidence_json") or {}
        evidence_str = json.dumps(ev) if not isinstance(ev, str) else ev

        query = f"""
        MERGE `{project_id}.{dataset_name}.dynamic_disruptions` T
        USING (
          SELECT
            @disruption_id AS disruption_id,
            @disruption_type AS disruption_type,
            @entity_type AS entity_type,
            @entity_id AS entity_id,
            @entity_name AS entity_name,
            @severity AS severity,
            SAFE_CAST(@reported_at AS TIMESTAMP) AS reported_at,
            @expected_duration_days AS expected_duration_days,
            @description AS description,
            @status AS status,
            @scenario_tag AS scenario_tag,
            @affected_product_id AS affected_product_id,
            @destination_warehouse_id AS destination_warehouse_id,
            @source AS source,
            @risk_id AS risk_id,
            @detection_method AS detection_method,
            @detection_confidence AS detection_confidence,
            SAFE_CAST(@detected_at AS TIMESTAMP) AS detected_at,
            SAFE_CAST(@validated_at AS TIMESTAMP) AS validated_at,
            @evidence_json AS evidence_json
        ) S
        ON T.disruption_id = S.disruption_id
        WHEN MATCHED THEN
          UPDATE SET
            status = S.status,
            severity = S.severity,
            expected_duration_days = S.expected_duration_days,
            description = S.description,
            scenario_tag = S.scenario_tag,
            validated_at = S.validated_at,
            evidence_json = S.evidence_json
        WHEN NOT MATCHED THEN
          INSERT (
            disruption_id, disruption_type, entity_type, entity_id, entity_name,
            severity, reported_at, expected_duration_days, description, status,
            scenario_tag, affected_product_id, destination_warehouse_id, source,
            risk_id, detection_method, detection_confidence, detected_at, validated_at, evidence_json
          )
          VALUES (
            S.disruption_id, S.disruption_type, S.entity_type, S.entity_id, S.entity_name,
            S.severity, S.reported_at, S.expected_duration_days, S.description, S.status,
            S.scenario_tag, S.affected_product_id, S.destination_warehouse_id, S.source,
            S.risk_id, S.detection_method, S.detection_confidence, S.detected_at, S.validated_at, S.evidence_json
          )
        """

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("disruption_id", "STRING", str(disruption.get("disruption_id", ""))),
                bigquery.ScalarQueryParameter("disruption_type", "STRING", str(disruption.get("disruption_type", ""))),
                bigquery.ScalarQueryParameter("entity_type", "STRING", str(disruption.get("entity_type", "WAREHOUSE"))),
                bigquery.ScalarQueryParameter("entity_id", "STRING", str(disruption.get("entity_id", "UNKNOWN"))),
                bigquery.ScalarQueryParameter("entity_name", "STRING", str(disruption.get("entity_name", "Unknown Entity"))),
                bigquery.ScalarQueryParameter("severity", "STRING", str(disruption.get("severity", "MEDIUM"))),
                bigquery.ScalarQueryParameter("reported_at", "STRING", disruption.get("reported_at") or None),
                bigquery.ScalarQueryParameter("expected_duration_days", "INT64", int(disruption.get("expected_duration_days", 7))),
                bigquery.ScalarQueryParameter("description", "STRING", str(disruption.get("description", ""))),
                bigquery.ScalarQueryParameter("status", "STRING", str(disruption.get("status", "ACTIVE"))),
                bigquery.ScalarQueryParameter("scenario_tag", "STRING", str(disruption.get("scenario_tag", ""))),
                bigquery.ScalarQueryParameter("affected_product_id", "STRING", str(disruption.get("affected_product_id", ""))),
                bigquery.ScalarQueryParameter("destination_warehouse_id", "STRING", str(disruption.get("destination_warehouse_id", ""))),
                bigquery.ScalarQueryParameter("source", "STRING", str(disruption.get("source", "DATA_DETECTED"))),
                bigquery.ScalarQueryParameter("risk_id", "STRING", disruption.get("risk_id") or None),
                bigquery.ScalarQueryParameter("detection_method", "STRING", disruption.get("detection_method") or None),
                bigquery.ScalarQueryParameter("detection_confidence", "FLOAT64", float(disruption.get("detection_confidence", 0.95)) if disruption.get("detection_confidence") is not None else None),
                bigquery.ScalarQueryParameter("detected_at", "STRING", disruption.get("detected_at") or None),
                bigquery.ScalarQueryParameter("validated_at", "STRING", disruption.get("validated_at") or None),
                bigquery.ScalarQueryParameter("evidence_json", "STRING", evidence_str)
            ]
        )
        job = client.query(query, job_config=job_config)
        job.result()
        print(f"[BigQuery MERGE Success] Dynamic disruption {disruption.get('disruption_id')} synced.")
        return True
    except Exception as e:
        print(f"[BigQuery Sync Note] Dynamic disruption BigQuery MERGE skipped: {e}")
        return False

def sync_mitigation_execution_to_bigquery(execution: dict) -> bool:
    """Idempotently upsert an authorized mitigation execution record into BigQuery."""
    client, project_id, dataset_name = _get_bq_client()
    if not client:
        return False
    try:
        steps_val = execution.get("steps") or execution.get("execution_steps_json") or []
        steps_str = json.dumps(steps_val) if not isinstance(steps_val, str) else steps_val

        query = f"""
        MERGE `{project_id}.{dataset_name}.mitigation_executions` T
        USING (
          SELECT
            @execution_id AS execution_id,
            @disruption_id AS disruption_id,
            @strategy_id AS strategy_id,
            @strategy_name AS strategy_name,
            @authorized_budget AS authorized_budget,
            SAFE_CAST(@executed_at AS TIMESTAMP) AS executed_at,
            @status AS status,
            @execution_steps_json AS execution_steps_json
        ) S
        ON T.execution_id = S.execution_id
        WHEN MATCHED THEN
          UPDATE SET
            strategy_id = S.strategy_id,
            strategy_name = S.strategy_name,
            authorized_budget = S.authorized_budget,
            executed_at = S.executed_at,
            status = S.status,
            execution_steps_json = S.execution_steps_json
        WHEN NOT MATCHED THEN
          INSERT (
            execution_id, disruption_id, strategy_id, strategy_name,
            authorized_budget, executed_at, status, execution_steps_json
          )
          VALUES (
            S.execution_id, S.disruption_id, S.strategy_id, S.strategy_name,
            S.authorized_budget, S.executed_at, S.status, S.execution_steps_json
          )
        """

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("execution_id", "STRING", str(execution.get("execution_id", ""))),
                bigquery.ScalarQueryParameter("disruption_id", "STRING", str(execution.get("disruption_id", ""))),
                bigquery.ScalarQueryParameter("strategy_id", "STRING", str(execution.get("strategy_id", ""))),
                bigquery.ScalarQueryParameter("strategy_name", "STRING", str(execution.get("strategy_name", ""))),
                bigquery.ScalarQueryParameter("authorized_budget", "FLOAT64", float(execution.get("authorized_budget", 0.0))),
                bigquery.ScalarQueryParameter("executed_at", "STRING", execution.get("executed_at") or None),
                bigquery.ScalarQueryParameter("status", "STRING", str(execution.get("status", "SUCCESS"))),
                bigquery.ScalarQueryParameter("execution_steps_json", "STRING", steps_str)
            ]
        )
        job = client.query(query, job_config=job_config)
        job.result()

        # Also update linked disruption status in BigQuery (both dynamic and static tables)
        disr_id = execution.get("disruption_id")
        if disr_id:
            try:
                upd_dyn = f"UPDATE `{project_id}.{dataset_name}.dynamic_disruptions` SET status = 'IN_EXECUTION' WHERE disruption_id = '{disr_id}'"
                client.query(upd_dyn).result()
            except Exception:
                pass
            try:
                upd_base = f"UPDATE `{project_id}.{dataset_name}.disruptions` SET status = 'IN_EXECUTION' WHERE disruption_id = '{disr_id}'"
                client.query(upd_base).result()
            except Exception:
                pass

        print(f"[BigQuery MERGE Success] Mitigation execution {execution.get('execution_id')} synced.")
        return True
    except Exception as e:
        print(f"[BigQuery Sync Note] BigQuery mitigation execution MERGE skipped: {e}")
        return False

def sync_disruption_to_bigquery(disruption: dict) -> bool:
    """Idempotently upsert a disruption into BigQuery `disruptions` table using SQL MERGE.

    This is the MISSING LINK: when a risk is converted to a disruption, the record
    must be upserted into BOTH:
      - `dynamic_disruptions` (AI-detection metadata)
      - `disruptions`         (canonical operational disruption record)
    so that both BQ tables remain consistent with SQLite and disk.
    """
    client, project_id, dataset_name = _get_bq_client()
    if not client:
        return False
    try:
        query = f"""
        MERGE `{project_id}.{dataset_name}.disruptions` T
        USING (
          SELECT
            @disruption_id AS disruption_id,
            @disruption_type AS disruption_type,
            @entity_type AS entity_type,
            @entity_id AS entity_id,
            @entity_name AS entity_name,
            @severity AS severity,
            SAFE_CAST(@reported_at AS TIMESTAMP) AS reported_at,
            @expected_duration_days AS expected_duration_days,
            @description AS description,
            @status AS status,
            @scenario_tag AS scenario_tag,
            @affected_product_id AS affected_product_id,
            @destination_warehouse_id AS destination_warehouse_id,
            @source AS source
        ) S
        ON T.disruption_id = S.disruption_id
        WHEN MATCHED THEN
          UPDATE SET
            status = S.status,
            severity = S.severity,
            expected_duration_days = S.expected_duration_days,
            description = S.description
        WHEN NOT MATCHED THEN
          INSERT (
            disruption_id, disruption_type, entity_type, entity_id, entity_name,
            severity, reported_at, expected_duration_days, description, status,
            scenario_tag, affected_product_id, destination_warehouse_id, source
          )
          VALUES (
            S.disruption_id, S.disruption_type, S.entity_type, S.entity_id, S.entity_name,
            S.severity, S.reported_at, S.expected_duration_days, S.description, S.status,
            S.scenario_tag, S.affected_product_id, S.destination_warehouse_id, S.source
          )
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("disruption_id", "STRING", str(disruption.get("disruption_id", ""))),
                bigquery.ScalarQueryParameter("disruption_type", "STRING", str(disruption.get("disruption_type", ""))),
                bigquery.ScalarQueryParameter("entity_type", "STRING", str(disruption.get("entity_type", "WAREHOUSE"))),
                bigquery.ScalarQueryParameter("entity_id", "STRING", str(disruption.get("entity_id", "UNKNOWN"))),
                bigquery.ScalarQueryParameter("entity_name", "STRING", str(disruption.get("entity_name", "Unknown Entity"))),
                bigquery.ScalarQueryParameter("severity", "STRING", str(disruption.get("severity", "MEDIUM"))),
                bigquery.ScalarQueryParameter("reported_at", "STRING", disruption.get("reported_at") or None),
                bigquery.ScalarQueryParameter("expected_duration_days", "INT64", int(disruption.get("expected_duration_days", 7))),
                bigquery.ScalarQueryParameter("description", "STRING", str(disruption.get("description", ""))),
                bigquery.ScalarQueryParameter("status", "STRING", str(disruption.get("status", "ACTIVE"))),
                bigquery.ScalarQueryParameter("scenario_tag", "STRING", str(disruption.get("scenario_tag", ""))),
                bigquery.ScalarQueryParameter("affected_product_id", "STRING", str(disruption.get("affected_product_id", ""))),
                bigquery.ScalarQueryParameter("destination_warehouse_id", "STRING", str(disruption.get("destination_warehouse_id", ""))),
                bigquery.ScalarQueryParameter("source", "STRING", str(disruption.get("source", "DATA_DETECTED"))),
            ]
        )
        job = client.query(query, job_config=job_config)
        job.result()
        print(f"[BigQuery MERGE Success] Disruption {disruption.get('disruption_id')} synced to `disruptions` table.")
        return True
    except Exception as e:
        print(f"[BigQuery Sync Note] `disruptions` table MERGE skipped for {disruption.get('disruption_id')}: {e}")
        return False


if __name__ == "__main__":
    seed_bigquery()
