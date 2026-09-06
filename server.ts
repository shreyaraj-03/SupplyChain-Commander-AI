import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { disruptions } from './server/data/syntheticData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

// In-memory cache of investigations for instant UI responsiveness
const investigationsStore: Record<string, any> = {};

function getPythonBin(): string {
  if (process.env.PYTHON_BIN) {
    return process.env.PYTHON_BIN;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

function runPythonRiskDetection(inputPayload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'backend', 'run_risk_detection.py');
    const pythonBin = getPythonBin();
    const py = spawn(pythonBin, [scriptPath, JSON.stringify(inputPayload)]);
    py.stdin.end();

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        console.error('Python risk detection runner error:', stderr);
        return reject(new Error(`Python process exited with code ${code}: ${stderr}`));
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse Python risk detection output: ${stdout}`));
      }
    });
  });
}

function runPythonInvestigation(disruptionId: string, weights?: Record<string, number>, forceRefresh: boolean = false): Promise<any> {
  const cacheKey = `${disruptionId}__${JSON.stringify(weights || {})}`;
  if (!forceRefresh && investigationsStore[cacheKey]) {
    return Promise.resolve(investigationsStore[cacheKey]);
  }

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      disruption_id: disruptionId,
      scoring_weights: weights || {
        recovery_speed_weight: 0.30,
        revenue_protection_weight: 0.25,
        cost_efficiency_weight: 0.25,
        customer_impact_weight: 0.20
      }
    });

    const scriptPath = path.join(process.cwd(), 'backend', 'run_investigation.py');
    const pythonBin = getPythonBin();
    const py = spawn(pythonBin, [scriptPath]);

    py.stdin.write(payload);
    py.stdin.end();

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        console.error('Python agent runner error:', stderr);
        return reject(new Error(`Python process exited with code ${code}: ${stderr}`));
      }
      try {
        const result = JSON.parse(stdout);
        investigationsStore[cacheKey] = result;
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse Python agent output: ${stdout}`));
      }
    });
  });
}

function getMergedDisruptions(): any[] {
  const mapByEntity = new Map<string, any>();

  // Add static disruptions first
  for (const d of disruptions) {
    const key = d.disruption_id || `${d.affected_product_id}__${d.destination_warehouse_id}__${d.disruption_type}`;
    mapByEntity.set(key, d);
  }

  // Merge dynamic disruptions from database via RiskRepository
  try {
    const pythonBin = getPythonBin();
    const cmd = `${pythonBin} -c "from backend.app.risk_detection.risk_repository import RiskRepository; import json; print(json.dumps(RiskRepository.list_dynamic_disruptions()))"`;
    const stdout = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    if (stdout && stdout.trim()) {
      const dynamicList = JSON.parse(stdout.trim()) as any[];
      for (const d of dynamicList) {
        const entityKey = d.disruption_id || (d.entity_id
          ? `${d.entity_id}__${d.disruption_type}`
          : `${d.affected_product_id}__${d.destination_warehouse_id}__${d.disruption_type}`);
        mapByEntity.set(entityKey, d);
      }
    }
  } catch (err) {
    console.error('Error fetching dynamic disruptions from DB:', err);
  }

  const merged = Array.from(mapByEntity.values());
  merged.sort((a, b) => {
    const timeA = a.reported_at ? new Date(a.reported_at).getTime() : 0;
    const timeB = b.reported_at ? new Date(b.reported_at).getTime() : 0;
    return timeB - timeA;
  });
  return merged;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'SupplyChain Commander AI Backend Service',
      runtime: 'Python 3.11 + FastAPI Architecture + Node Ingress Engine',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

function prewarmActiveDisruptions(list: any[]) {
  if (!list || list.length === 0) return;
  const toWarm = list.slice(0, 3);
  for (const d of toWarm) {
    if (!d.disruption_id) continue;
    const cacheKey = `${d.disruption_id}__${JSON.stringify({})}`;
    if (!investigationsStore[cacheKey]) {
      runPythonInvestigation(d.disruption_id).catch(() => {});
    }
  }
}

  // Disruptions list (Merged static + dynamic data-detected)
  app.get('/api/disruptions', (req, res) => {
    const list = getMergedDisruptions();
    prewarmActiveDisruptions(list);
    res.json({
      success: true,
      count: list.length,
      disruptions: list
    });
  });

  // Single disruption details
  app.get('/api/disruptions/:id', (req, res) => {
    const list = getMergedDisruptions();
    const disruption = list.find((d) => d.disruption_id === req.params.id);
    if (!disruption) {
      return res.status(404).json({ success: false, error: 'Disruption not found' });
    }
    res.json({ success: true, disruption });
  });

  // Fetch AI Detected Risk Signals
  app.get('/api/risks', async (req, res) => {
    try {
      const { status, severity, risk_type, product_id, warehouse_id, supplier_id } = req.query;
      const result = await runPythonRiskDetection({
        action: 'list_risks',
        status,
        severity,
        risk_type,
        product_id,
        warehouse_id,
        supplier_id
      });
      res.json(result);
    } catch (err: any) {
      console.error('Risk fetch error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Trigger Autonomous Risk Detection Scan
  app.post('/api/risk-detection/run', async (req, res) => {
    try {
      const { trigger_type, auto_convert_critical } = req.body;
      const result = await runPythonRiskDetection({
        action: 'run_scan',
        trigger_type: trigger_type || 'MANUAL',
        auto_convert_critical: auto_convert_critical === true
      });
      res.json(result);
    } catch (err: any) {
      console.error('Risk detection scan error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Convert Risk Signal to Disruption Event
  app.post('/api/risks/:id/convert', async (req, res) => {
    try {
      const result = await runPythonRiskDetection({
        action: 'convert_risk',
        risk_id: req.params.id
      });
      res.json(result);
    } catch (err: any) {
      console.error('Risk conversion error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Trigger Multi-Agent Investigation via Python Commander Agent
  app.post('/api/investigations', async (req, res) => {
    try {
      const { disruption_id, scoring_weights, force_refresh } = req.body;
      if (!disruption_id) {
        return res.status(400).json({ success: false, error: 'disruption_id is required' });
      }

      const investigation = await runPythonInvestigation(disruption_id, scoring_weights, !!force_refresh);
      if (investigation && investigation.investigation_id) {
        investigationsStore[investigation.investigation_id] = investigation;
      }

      res.json({
        success: true,
        investigation
      });
    } catch (err: any) {
      console.error('Investigation error:', err);
      res.status(500).json({ success: false, error: err.message || 'Internal server error during investigation' });
    }
  });

  // Fetch cached investigation by ID
  app.get('/api/investigations/:id', (req, res) => {
    const inv = investigationsStore[req.params.id];
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Investigation not found' });
    }
    res.json({ success: true, investigation: inv });
  });

  // Re-run Deterministic Scoring Simulation with custom weights
  app.post('/api/simulations', async (req, res) => {
    try {
      const { disruption_id, scoring_weights } = req.body;
      const investigation = await runPythonInvestigation(disruption_id || 'DISR_001', scoring_weights);
      res.json({
        success: true,
        investigation
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for frontend development vs static distribution in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SupplyChain Commander AI active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
