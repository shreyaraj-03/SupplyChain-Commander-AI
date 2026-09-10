"""Check disruptions across all storage tiers."""
import json
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from dotenv import load_dotenv
load_dotenv('backend/.env')
load_dotenv('.env')

from backend.app.db.db_session import get_db_connection

print("=== SQLite Tables ===")
conn = get_db_connection()
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print("Tables:", tables)

print("\n=== SQLite dynamic_disruptions ===")
c.execute("SELECT disruption_id, disruption_type, scenario_tag FROM dynamic_disruptions")
dd_rows = c.fetchall()
print(f"Count: {len(dd_rows)}")
for r in dd_rows:
    print(f"  {r[0]} | {r[1]}")

conn.close()

print("\n=== Static Disruptions (syntheticData.ts) ===")
synth_path = os.path.join(os.path.dirname(__file__), '..', '..', 'server', 'data', 'syntheticData.ts')
if os.path.exists(synth_path):
    with open(synth_path, 'r', encoding='utf-8') as f:
        content = f.read()
    import re
    ids = re.findall(r'disruption_id:\s*["\']([^"\']+)["\']', content)
    print(f"Count: {len(ids)}")
    for d in ids:
        print(f"  {d}")

print("\n=== dataset.json disruptions ===")
dataset_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'dataset.json')
if os.path.exists(dataset_path):
    with open(dataset_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    disrs = data.get('disruptions', [])
    print(f"Count: {len(disrs)}")
    for d in disrs:
        print(f"  {d.get('disruption_id')} | {d.get('disruption_type')}")

print("\n=== dynamic_disruptions.json ===")
dyn_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'dynamic_disruptions.json')
if os.path.exists(dyn_path):
    with open(dyn_path, 'r', encoding='utf-8') as f:
        dj = json.load(f)
    print(f"Count: {len(dj)}")
    for k, v in dj.items():
        print(f"  {k} | {v.get('disruption_type')}")

print("\n=== BigQuery disruptions ===")
try:
    from google.cloud import bigquery
    client = bigquery.Client(project=os.getenv('GCP_PROJECT_ID', 'supplychain-commander'))
    bq_d = list(client.query('SELECT disruption_id, disruption_type FROM `supplychain-commander.supply_chain_analytics.disruptions`').result())
    print(f"BigQuery disruptions count: {len(bq_d)}")
    for r in bq_d:
        print(f"  {r.disruption_id} | {r.disruption_type}")
    bq_dd = list(client.query('SELECT disruption_id, disruption_type FROM `supplychain-commander.supply_chain_analytics.dynamic_disruptions`').result())
    print(f"BigQuery dynamic_disruptions count: {len(bq_dd)}")
    for r in bq_dd:
        print(f"  {r.disruption_id} | {r.disruption_type}")
except Exception as e:
    print(f"BigQuery note: {e}")
