# SupplyChain Commander AI

Autonomous Multi-Agent Disruption Investigation & Recovery Platform powered by Google ADK architecture and BigQuery analytics.

---

## 📖 Quick Links & Documentation

- **Full Project Specification & Antigravity Handoff**: See [`PROJECT_TRANSFER.md`](./PROJECT_TRANSFER.md)
- **BigQuery DDL SQL Schema**: See [`sql/create_tables.sql`](./sql/create_tables.sql)
- **Backend Service**: See [`backend/`](./backend/)
- **Frontend Dashboard**: See [`src/`](./src/)

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts, Lucide Icons
- **Ingress**: Node Express / Vite Dev Middleware (`server.ts`)
- **Backend Multi-Agent Engine**: Python 3.11, Google ADK Multi-Agent Architecture
- **Analytics & Data**: Google Cloud BigQuery DDL / BigQuery MCP Analytical Tools

---

## 🚀 Running the Project

```bash
# Build and verify frontend
npm run build

# Direct Python Multi-Agent CLI test
python3 backend/run_investigation.py '{"disruption_id":"DISR_001"}'

# Verify local backend API
curl -s http://localhost:3000/api/health
