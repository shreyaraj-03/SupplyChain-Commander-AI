import sys, os
sys.path.insert(0, os.getcwd())
from dotenv import load_dotenv
load_dotenv('backend/.env')
load_dotenv('.env')
from google.cloud import bigquery

client = bigquery.Client(project='supplychain-commander')
ds = 'supply_chain_analytics'
proj = 'supplychain-commander'

print('=== BigQuery disruptions ===')
rows = list(client.query(
    f'SELECT disruption_id, source FROM `{proj}.{ds}.disruptions` ORDER BY reported_at'
).result())
print(f'Count: {len(rows)}')
for r in rows:
    print(f'  {r.disruption_id} | {r.source}')

print()
print('=== BigQuery dynamic_disruptions ===')
rows2 = list(client.query(
    f'SELECT disruption_id FROM `{proj}.{ds}.dynamic_disruptions` ORDER BY reported_at'
).result())
print(f'Count: {len(rows2)}')
for r in rows2:
    print(f'  {r.disruption_id}')
