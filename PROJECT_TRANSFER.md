# SupplyChain Commander AI — Complete Project & Architecture Handoff

> **Antigravity AI Agent Handoff Document**  
> *This document provides a comprehensive, production-ready specification of the SupplyChain Commander AI codebase for direct continuation, migration, and production deployment.*

---

## 1. Domain Glossary & Core Definitions

| Concept | Definition & Formula | Business Impact |
| :--- | :--- | :--- |
| **Disruption Event** | An acute operational shock in the supply network categorized as `SUPPLIER_DELAY`, `STOCKOUT`, or `DEMAND_SPIKE`. | Triggers autonomous multi-agent triage and evaluation. |
| **Blast Radius** | The downstream operational exposure measured by **Revenue at Risk** ($\sum \text{quantity} \times \text{unit\_price}$), total orders affected, and priority SLA contract breaches. | Quantifies financial loss if no mitigation is taken. |
| **Inter-Hub Safety Stock Surplus** | Available transfer quantity in peer warehouses: $\text{Surplus} = \max(0, \text{Current Stock} - \text{Safety Stock Buffer})$. | Enables zero-purchase mitigation by rebalancing internal inventory. |
| **Expedite Price Premium** | The percentage cost increase over baseline procurement: $\text{Premium} = \frac{\text{Expedite Cost} - \text{Baseline Cost}}{\text{Baseline Cost}} \times 100$. | Evaluates supplier margin erosion versus recovery speed. |
| **Deterministic Multi-Attribute Utility** | Normalized mathematical scoring engine: $\text{Score} = (w_{\text{speed}} \cdot S_{\text{speed}}) + (w_{\text{rev}} \cdot S_{\text{rev}}) + (w_{\text{cost}} \cdot S_{\text{cost}}) + (w_{\text{cust}} \cdot S_{\text{cust}})$. | Eliminates non-deterministic LLM hallucination in strategy ranking. |
| **Tier-1 Enterprise SLA** | High-value customer orders with strict delivery commitments and punitive breach penalties. | Weighted at highest priority in order re-sequencing. |

---

## 2. End-to-End System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OPERATIONS DASHBOARD UI                           │
│                          (React 18 + TypeScript)                            │
│   • Tailwind CSS (Responsive High-Contrast Data Layout)                     │
│   • Recharts (Regional Customer Demand & Revenue Exposure Visualizer)       │
│   • Interactive What-If Multi-Attribute Weight Simulation Sliders           │
│   • 1-Click ERP & WMS Autonomous Execution Authorization Dispatch           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API (/api/*)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    NODE / EXPRESS API INGRESS (server.ts)                   │
│   • In-memory session & simulation caching                                  │
│   • Python Multi-Agent Process Bridge (CLI / IPC Runner)                    │
│   • Production Static Asset Ingress & Reverse Proxy                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ CLI / Subprocess / JSON IPC
┌──────────────────────────────────────▼──────────────────────────────────────┐
│             PYTHON 3.11 MULTI-AGENT ENGINE (Google ADK Architecture)        │
│                                                                             │
│                    ┌───────────────────────────────────┐                    │
│                    │         CommanderAgent            │                    │
│                    │ (Supervisor, Telemetry & Audit)   │                    │
│                    └─────────┬───────────────┬─────────┘                    │
│                              │               │                              │
│              ┌───────────────┴──────┐ ┌──────┴──────────────┐               │
│              ▼                      ▼ ▼                     ▼               │
│     ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐       │
│     │   ImpactAgent   │    │ InventoryAgent  │    │  SupplierAgent  │       │
│     │  (Blast Radius) │    │  (Hub Surplus)  │    │ (Alt Sourcing)  │       │
│     └────────┬────────┘    └────────┬────────┘    └────────┬────────┘       │
│              │                      │                      │                │
│              └──────────────────────┼──────────────────────┘                │
│                                     ▼                                       │
│                    ┌───────────────────────────────────┐                    │
│                    │          StrategyAgent            │                    │
│                    │   (4 Mitigation Formulations)     │                    │
│                    └────────────────┬──────────────────┘                    │
│                                     ▼                                       │
│                    ┌───────────────────────────────────┐                    │
│                    │    Deterministic Scoring Engine   │                    │
│                    │ (Normalized Multi-Criteria Math)  │                    │
│                    └────────────────┬──────────────────┘                    │
│                                     ▼                                       │
│                    ┌───────────────────────────────────┐                    │
│                    │         ExplanationAgent          │                    │
│                    │ (Executive Rationale & Roadmap)   │                    │
│                    └───────────────────────────────────┘                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Analytical Tool Invocations
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     DATA & ANALYTICS LAYER (MCP Tools)                      │
│   • Prototype Mode: Local In-Memory JSON (backend/data/dataset.json)        │
│   • Production Mode: Google Cloud BigQuery (supply_chain_analytics.*)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The 6 Multi-Agent Components in Detail

All agents reside in `/backend/app/agents/` and follow strict functional separation:

### 1. `CommanderAgent` (`commander_agent.py`)
- **Role**: Supervisor & Orchestrator.
- **Workflow**:
  1. Ingests active disruption event via `mcp_tools.get_disruption_details()`.
  2. Executes parallel extraction tasks for Impact, Inventory, and Supplier agents.
  3. Computes execution duration for every agent in milliseconds (`duration_ms`).
  4. Delegates to `StrategyAgent`, `DeterministicScoringEngine`, and `ExplanationAgent`.
  5. Emits structured telemetry logs and audit summaries.

### 2. `ImpactAgent` (`impact_agent.py`)
- **Role**: Financial Exposure & Blast Radius Quantifier.
- **Output Schema**:
  - `revenue_at_risk`: Total monetary value of threatened orders.
  - `orders_at_risk`: Total count of unfulfilled customer orders.
  - `priority_orders_at_risk`: High-priority SLA contracts exposed.
  - `regional_breakdown`: Regional demand and delivery risk mapping for Recharts visualization.

### 3. `InventoryAgent` (`inventory_agent.py`)
- **Role**: Network Hub Safety Stock & Transfer Optimizer.
- **Output Schema**:
  - `surplus_warehouses`: List of warehouses having $\text{Stock} > \text{Safety Buffer}$.
  - `transfer_plans`: Feasible hub transfers with unit freight costs and transit lead times.
  - `total_surplus_units`: Aggregated transfer capacity across internal nodes.

### 4. `SupplierAgent` (`supplier_agent.py`)
- **Role**: Qualified Vendor Discovery & Expedite Pricing.
- **Output Schema**:
  - `qualified_suppliers`: Pre-audited alternative suppliers (excluding the disrupted vendor).
  - `reliability_score`: Historical fulfillment accuracy (0.00 – 1.00).
  - `expedite_lead_time_days`: Transit lead time for urgent purchase orders.
  - `cost_premium_pct`: Marginal cost over baseline purchase agreements.

### 5. `StrategyAgent` (`strategy_agent.py`)
- **Role**: Mitigation Strategy Formulation.
- **Synthesizes 4 Concrete Options**:
  1. **Do Nothing (Baseline)**: Incur maximum delay ($10+$ days), zero mitigation cost, high revenue exposure.
  2. **Inventory Redistribution**: Internal transfers from surplus hubs (Low cost, moderate speed).
  3. **Alternative Sourcing**: Expedited PO with qualified domestic vendor (High speed, higher premium).
  4. **Hybrid Optimization**: Split allocation (Immediate 60% hub transfer + 40% expedited supplier batch).

### 6. `DeterministicScoringEngine` (`backend/app/services/strategy_scoring.py`)
- **Role**: Objective Multi-Criteria Mathematical Ranking.
- **Normalization Formula**:
  - Speed Score: $S_{\text{speed}} = 100 \times \left(1 - \frac{\text{recovery\_days}}{\text{max\_days}}\right)$
  - Revenue Score: $S_{\text{rev}} = 100 \times \left(\frac{\text{revenue\_protected}}{\text{total\_revenue\_at\_risk}}\right)$
  - Cost Score: $S_{\text{cost}} = 100 \times \left(1 - \frac{\text{total\_cost}}{\text{max\_cost}}\right)$
  - Customer SLA Score: $S_{\text{cust}} = 100 \times \left(1 - \frac{\text{delayed\_orders}}{\text{total\_orders}}\right)$
- **Final Composite**:
  $$\text{Final Score} = (w_{\text{speed}} \cdot S_{\text{speed}}) + (w_{\text{rev}} \cdot S_{\text{rev}}) + (w_{\text{cost}} \cdot S_{\text{cost}}) + (w_{\text{cust}} \cdot S_{\text{cust}})$$

### 7. `ExplanationAgent` (`explanation_agent.py`)
- **Role**: Natural Language Executive Rationale & Roadmap.
- **Output Schema**:
  - `executive_summary`: Concise C-suite overview of the chosen strategy and ROI.
  - `why_chosen`: Direct trade-off justification comparing the top option against alternatives.
  - `action_roadmap`: Array of structured execution steps with `action`, `owner`, `timeframe`, and `details`.

---

## 4. Complete Codebase Directory Map

```
├── backend/
│   ├── app/
│   │   ├── config/
│   │   │   └── settings.py               # Weights, environment configs & thresholds
│   │   ├── models/
│   │   │   ├── disruption.py             # Disruption schema & severity types
│   │   │   ├── strategy.py               # Recovery strategies, actions & score weights
│   │   │   ├── agent_results.py          # Intermediate agent structured output schemas
│   │   │   └── investigation.py          # Composite investigation model & telemetry logs
│   │   ├── tools/
│   │   │   └── mcp_tools.py              # BigQuery MCP analytical tools & queries
│   │   ├── services/
│   │   │   ├── strategy_scoring.py       # Deterministic scoring & normalization engine
│   │   │   └── investigation_service.py  # Investigation orchestration services
│   │   ├── agents/
│   │   │   ├── commander_agent.py        # Central supervisor agent
│   │   │   ├── impact_agent.py           # Blast radius & revenue risk agent
│   │   │   ├── inventory_agent.py        # Safety stock & rebalancing agent
│   │   │   ├── supplier_agent.py         # Alternative sourcing & expedite agent
│   │   │   ├── strategy_agent.py         # 4-strategy candidate synthesizer
│   │   │   └── explanation_agent.py      # Executive rationale & action roadmap agent
│   │   └── main.py                       # FastAPI application (FastAPI + Uvicorn)
│   ├── data/
│   │   ├── generate_synthetic_data.py    # Synthetic 8-table relational data generator
│   │   └── dataset.json                  # Relational dataset in JSON format
│   ├── run_investigation.py              # CLI & Node subprocess bridge runner
│   ├── requirements.txt                  # Python dependencies
│   └── Dockerfile                        # Production Cloud Run container buildfile
├── sql/
│   └── create_tables.sql                 # Google Cloud BigQuery DDL schema definitions
├── src/
│   ├── components/
│   │   ├── Navbar.tsx                    # Header with telemetry badges & live refresh
│   │   ├── DisruptionSelector.tsx        # Incident switchboard & scenario cards
│   │   ├── AgentProgressView.tsx         # Stepper logs, agent DAG & BigQuery inspector
│   │   ├── AgentDagView.tsx              # Google ADK visual execution graph
│   │   ├── BigQueryInspector.tsx         # Parameterized SQL query inspector
│   │   ├── ImpactMetricsView.tsx         # Blast radius KPIs & Recharts visualization
│   │   ├── InventorySupplierView.tsx     # Warehouse transfer & supplier catalog tables
│   │   ├── StrategyMatrix.tsx            # Strategy comparison & What-If weight sliders
│   │   ├── RecommendationView.tsx        # Decision card, action roadmap & audit tree
│   │   └── ExecutionModal.tsx            # 1-Click ERP / WMS dispatch simulator
│   ├── services/
│   │   └── api.ts                        # Frontend REST API client
│   ├── types/
│   │   └── supplyChain.ts                # TypeScript domain interface definitions
│   ├── App.tsx                           # Master page layout & state manager
│   ├── main.tsx                          # React entrypoint
│   └── index.css                         # Tailwind CSS entrypoint
├── server.ts                             # Node Express API ingress & Vite dev server
├── metadata.json                         # Platform configuration & permissions
└── PROJECT_TRANSFER.md                   # This master handoff document
```

---

## 5. Prototype vs. Production Comparison

| Component | Current Prototype Implementation | Production Target Implementation |
| :--- | :--- | :--- |
| **Data Storage** | Local JSON file (`dataset.json`, 8 relational tables) | Google Cloud BigQuery dataset (`supply_chain_analytics.*`) |
| **Query Engine** | In-memory filtering in `mcp_tools.py` | Parameterized SQL queries via `google-cloud-bigquery` SDK |
| **Backend Deployment** | Python CLI invocation via Node Express `server.ts` | Standalone FastAPI service deployed on Google Cloud Run |
| **Telemetry & Stream** | Batch JSON completion with simulated step duration | Server-Sent Events (SSE) / WebSockets for live token streaming |
| **Action Execution** | Simulated ERP dispatch modal in frontend | Webhook / REST dispatch to SAP S/4HANA, Oracle SCM, or WMS |
| **Auth & Security** | Open local ingress | Firebase Auth / Okta SSO with Role-Based Access Control (RBAC) |

---

## 6. Step-by-Step Production Migration Roadmap

Follow these 5 steps to migrate this prototype to full production on Google Cloud:

### Step 1: Provision Google Cloud BigQuery Analytics Dataset

1. Open **Google Cloud Console** $\rightarrow$ **BigQuery**.
2. Create a dataset named `supply_chain_analytics` in your desired region (e.g., `asia-east1` or `us-central1`).
3. Run the complete SQL DDL schema located at `/sql/create_tables.sql`.
4. Populate the tables with production enterprise data or run `backend/data/generate_synthetic_data.py` modified to write directly to BigQuery via `pandas_gbq` or `BigQueryClient.load_table_from_json()`.

```sql
-- DDL Summary of Tables Created in BigQuery:
-- 1. supply_chain_analytics.products
-- 2. supply_chain_analytics.suppliers
-- 3. supply_chain_analytics.warehouses
-- 4. supply_chain_analytics.inventory
-- 5. supply_chain_analytics.customer_orders
-- 6. supply_chain_analytics.shipments
-- 7. supply_chain_analytics.disruptions
-- 8. supply_chain_analytics.supplier_performance
```

### Step 2: Switch `mcp_tools.py` to Live BigQuery Client

In `backend/app/tools/mcp_tools.py`, replace local JSON filtering with the official Google Cloud BigQuery Python client:

```python
from google.cloud import bigquery
import os

class BigQueryMCPTools:
    def __init__(self, project_id: str = None, dataset_id: str = "supply_chain_analytics"):
        self.project_id = project_id or os.getenv("GCP_PROJECT_ID")
        self.dataset_id = dataset_id
        self.client = bigquery.Client(project=self.project_id)

    def get_inventory_surplus(self, product_id: str):
        query = f"""
        SELECT 
            i.inventory_id, w.warehouse_id, w.warehouse_name, w.city,
            i.current_stock, i.safety_stock,
            (i.current_stock - i.safety_stock) AS available_transfer_surplus,
            w.lead_time_days_to_dest AS transfer_days,
            w.transfer_cost_per_unit
        FROM `{self.project_id}.{self.dataset_id}.inventory` AS i
        JOIN `{self.project_id}.{self.dataset_id}.warehouses` AS w ON i.warehouse_id = w.warehouse_id
        WHERE i.product_id = @product_id AND i.current_stock > i.safety_stock
        ORDER BY w.lead_time_days_to_dest ASC
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("product_id", "STRING", product_id)]
        )
        return [dict(row) for row in self.client.query(query, job_config=job_config).result()]
```

### Step 3: Deploy the FastAPI Backend to Google Cloud Run

1. Build and push the container using `backend/Dockerfile`:
   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT_ID]/supplychain-commander-backend ./backend
   ```
2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy supplychain-commander-backend \
     --image gcr.io/[PROJECT_ID]/supplychain-commander-backend \
     --platform managed \
     --region asia-east1 \
     --allow-unauthenticated \
     --set-env-vars GCP_PROJECT_ID=[PROJECT_ID],BIGQUERY_DATASET=supply_chain_analytics
   ```

### Step 4: Configure Live WebSockets / SSE for Real-Time Streaming

In `backend/app/main.py`, mount a Server-Sent Events (SSE) or WebSocket endpoint:
```python
@app.get("/api/investigations/stream/{disruption_id}")
async def stream_investigation(disruption_id: str):
    async def event_generator():
        # Stream agent start, progress, and payload chunks in real time
        yield f"data: {json.dumps({'agent': 'ImpactAgent', 'status': 'RUNNING'})}\n\n"
        ...
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

### Step 5: Connect Real ERP & WMS Execution Webhooks

In `backend/app/services/investigation_service.py`, implement live enterprise dispatch adapters:
- **SAP S/4HANA**: Trigger OData Purchase Order API (`/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV`).
- **Warehouse Management System (WMS)**: Transmit EDI 940 (Warehouse Shipping Order) or REST Transfer Order.
- **Order Management System (OMS)**: Update priority queue re-sequencing flags.

---

## 7. Developer Verification & Test Commands

Run these commands in your workspace to verify all layers:

```bash
# 1. Validate TypeScript and Linting (Frontend)
npm run lint

# 2. Verify Production Build (Vite + esbuild)
npm run build

# 3. Test Python Agent Pipeline directly via CLI
python3 backend/run_investigation.py '{"disruption_id":"DISR_001"}'

# 4. Verify Local Ingress Health API
curl -s http://localhost:3000/api/health
```

---

*Handoff specification finalized for Antigravity AI Agent.*
