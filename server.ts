import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn, spawnSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { disruptions } from './server/data/syntheticData.ts';

// In-memory cache of investigations for instant UI responsiveness
const investigationsStore: Record<string, any> = {};

function getPythonBin(): string {
  if (process.env.PYTHON_BIN) {
    const customPath = process.env.PYTHON_BIN.replace(/^["']|["']$/g, '').trim();
    if (fs.existsSync(customPath)) return customPath;
    if (customPath) return customPath;
  }
  const venvWin = path.join(process.cwd(), 'venv', 'Scripts', 'python.exe');
  if (fs.existsSync(venvWin)) return venvWin;
  const dotVenvWin = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(dotVenvWin)) return dotVenvWin;
  const venvLinux = path.join(process.cwd(), 'venv', 'bin', 'python3');
  if (fs.existsSync(venvLinux)) return venvLinux;
  const dotVenvLinux = path.join(process.cwd(), '.venv', 'bin', 'python3');
  if (fs.existsSync(dotVenvLinux)) return dotVenvLinux;

  return process.platform === 'win32' ? 'python' : 'python3';
}

function safeParseJson(raw: string): any {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1));
    }
    const firstBracket = trimmed.indexOf('[');
    const lastBracket = trimmed.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(trimmed.substring(firstBracket, lastBracket + 1));
    }
    throw err;
  }
}

function runPythonRiskDetection(inputPayload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'backend', 'run_risk_detection.py');
    const pythonBin = getPythonBin();
    const py = spawn(pythonBin, [scriptPath]);
    
    py.stdin.write(JSON.stringify(inputPayload));
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
      if (code !== 0 && !stdout.trim()) {
        console.error('Python risk detection runner error:', stderr);
        return reject(new Error(`Python process exited with code ${code}: ${stderr}`));
      }
      try {
        const result = safeParseJson(stdout);
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse Python risk detection output: ${stdout || stderr}`));
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
      if (code !== 0 && !stdout.trim()) {
        console.error(`Python runner error (code ${code}):`, stderr);
        return reject(new Error(`Python process exited with code ${code}: ${stderr}`));
      }

      try {
        const result = safeParseJson(stdout);
        investigationsStore[cacheKey] = result;
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse Python agent output: ${stdout || stderr}`));
      }
    });
  });
}

function getMergedDisruptions(): any[] {
  const mapById = new Map<string, any>();

  // 1. Add baseline static disruptions first
  for (const d of disruptions) {
    const key = d.disruption_id || `${d.affected_product_id}__${d.destination_warehouse_id}__${d.disruption_type}`;
    mapById.set(key, { ...d });
  }

  // 2. Read dynamic disruptions from local persistent disk JSON (instant & reliable)
  try {
    const dynPath = path.join(process.cwd(), 'backend', 'data', 'dynamic_disruptions.json');
    if (fs.existsSync(dynPath)) {
      const raw = fs.readFileSync(dynPath, 'utf-8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : Object.values(parsed);
        for (const d of list) {
          if (!d) continue;
          const key = d.disruption_id || (d.entity_id
            ? `${d.entity_id}__${d.disruption_type}`
            : `${d.affected_product_id}__${d.destination_warehouse_id}__${d.disruption_type}`);
          mapById.set(key, d);
        }
      }
    }
  } catch (err) {
    console.error('Error reading dynamic disruptions from disk:', err);
  }

  // 3. Sync from Python SQLite database if available
  try {
    const pythonBin = getPythonBin();
    const result = spawnSync(pythonBin, [
      '-c',
      'from backend.app.risk_detection.risk_repository import RiskRepository; import json; print(json.dumps(RiskRepository.list_dynamic_disruptions()))'
    ], { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 2000 });
    
    if (result.stdout && result.stdout.trim()) {
      const dynamicList = JSON.parse(result.stdout.trim()) as any[];
      for (const d of dynamicList) {
        if (!d) continue;
        const key = d.disruption_id || (d.entity_id
          ? `${d.entity_id}__${d.disruption_type}`
          : `${d.affected_product_id}__${d.destination_warehouse_id}__${d.disruption_type}`);
        mapById.set(key, d);
      }
    }
  } catch (err) {
    // Non-blocking fallback
  }

  const merged = Array.from(mapById.values());
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
      if (result && result.success === false) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err: any) {
      console.error('Risk conversion error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Manual Trigger: BigQuery Synchronizer / Backfill
  app.post('/api/bigquery/sync', async (req, res) => {
    try {
      const result = await runPythonRiskDetection({
        action: 'sync_bigquery'
      });
      res.json(result);
    } catch (err: any) {
      console.error('BigQuery sync error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Record Executive Mitigation Dispatch Execution in Database
  app.post('/api/executions', async (req, res) => {
    try {
      const result = await runPythonRiskDetection({
        action: 'save_execution',
        execution: req.body
      });

      // Update in-memory static disruptions status
      if (req.body && req.body.disruption_id) {
        const found = disruptions.find((d) => d.disruption_id === req.body.disruption_id);
        if (found) {
          found.status = 'IN_EXECUTION';
        }
      }

      res.json(result);
    } catch (err: any) {
      console.error('Execution logging error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Fetch Logged Mitigation Executions
  app.get('/api/executions', async (req, res) => {
    try {
      const { disruption_id } = req.query;
      const result = await runPythonRiskDetection({
        action: 'list_executions',
        disruption_id: disruption_id as string
      });
      res.json(result);
    } catch (err: any) {
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

  // Health Check Probes for Google Cloud Run / Kubernetes
  app.get(['/healthz', '/api/health'], (req, res) => {
    res.status(200).json({
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      service: 'SupplyChain Commander AI',
      environment: process.env.NODE_ENV || 'development'
    });
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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`SupplyChain Commander AI active on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  });

  // Graceful shutdown handling for Cloud Run container scaling / termination
  const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Gracefully terminating SupplyChain Commander AI server...`);
    server.close(() => {
      console.log('HTTP server closed cleanly.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Forcefully terminating after 10s shutdown timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
