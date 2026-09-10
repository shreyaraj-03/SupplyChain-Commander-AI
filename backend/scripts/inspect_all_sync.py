import json
import os
from google.cloud import bigquery
from dotenv import load_dotenv

load_dotenv('backend/.env')
load_dotenv('.env')

from backend.app.db.db_session import get_db_connection

client = bigquery.Client(project=os.getenv('GCP_PROJECT_ID', 'supplychain-commander'))

conn = get_db_connection()
c = conn.cursor()

c.execute('SELECT disruption_id, status, risk_id FROM dynamic_disruptions')
sqlite_disrs = c.fetchall()
c.execute('SELECT risk_id, status, converted_disruption_id FROM detected_risks')
sqlite_risks = c.fetchall()
c.execute('SELECT execution_id, disruption_id, status FROM mitigation_executions')
sqlite_execs = c.fetchall()
conn.close()

print('=== SQLITE (supplychain_commander.db) ===')
print('dynamic_disruptions count:', len(sqlite_disrs))
for r in sqlite_disrs:
    print('  disruption:', dict(r))
print('detected_risks (converted):', [dict(r)['risk_id'] for r in sqlite_risks if dict(r)['status'] == 'CONVERTED_TO_DISRUPTION'])
print('mitigation_executions count:', len(sqlite_execs))
for r in sqlite_execs:
    print('  execution:', dict(r))

query_disr = 'SELECT disruption_id, status, risk_id FROM `supplychain-commander.supply_chain_analytics.dynamic_disruptions`'
bq_disrs = list(client.query(query_disr).result())

query_risks = "SELECT risk_id, status, converted_disruption_id FROM `supplychain-commander.supply_chain_analytics.detected_risks` WHERE status = 'CONVERTED_TO_DISRUPTION'"
bq_risks = list(client.query(query_risks).result())

query_execs = 'SELECT execution_id, disruption_id, status FROM `supplychain-commander.supply_chain_analytics.mitigation_executions`'
bq_execs = list(client.query(query_execs).result())

print('\n=== BIGQUERY ===')
print('dynamic_disruptions count:', len(bq_disrs))
for r in bq_disrs:
    print('  disruption:', r.disruption_id, r.status, r.risk_id)
print('detected_risks (converted):', [r.risk_id for r in bq_risks])
print('mitigation_executions count:', len(bq_execs))
for r in bq_execs:
    print('  execution:', r.execution_id, r.disruption_id, r.status)

# Check JSON files
json_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))
dyn_json_path = os.path.join(json_dir, 'dynamic_disruptions.json')
if os.path.exists(dyn_json_path):
    with open(dyn_json_path, 'r', encoding='utf-8') as f:
        dj = json.load(f)
    print('\n=== JSON CACHE ===')
    print('dynamic_disruptions.json count:', len(dj), list(dj.keys()))
