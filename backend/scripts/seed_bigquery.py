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
    
    # Load synthetic dataset
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
            print(f"No records found for table '{table_name}'. Skipping.")
            continue
        
        table_id = f"{project_id}.{dataset_name}.{table_name}"
        print(f"Seeding {len(records)} records into table '{table_id}'...")
        
        try:
            # Configure job to truncate existing data and load new data
            job_config = bigquery.LoadJobConfig(
                write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
                source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON
            )
            
            # Load directly from JSON records
            job = client.load_table_from_json(records, table_id, job_config=job_config)
            job.result()  # Wait for job completion
            
            table = client.get_table(table_id)
            print(f"Successfully seeded '{table_name}'. Current row count: {table.num_rows}")
        except Exception as e:
            print(f"Error seeding table '{table_name}': {e}")

    print("\nBigQuery Database Seeding Attempt Completed!")

if __name__ == "__main__":
    seed_bigquery()
