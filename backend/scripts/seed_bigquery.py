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
            # Execute BigQuery statements (lines 1 to 46 before SQLite section)
            bq_sql = sql_content.split("-- 3. SQLite DDL")[0]
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

    print("\nBigQuery Provisioning & Seeding Completed!")

if __name__ == "__main__":
    seed_bigquery()
