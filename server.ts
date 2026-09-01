import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { disruptions } from './server/data/syntheticData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache of investigations for instant UI responsiveness
const investigationsStore: Record<string, any> = {};

function runPythonInvestigation(disruptionId: string, weights?: Record<string, number>): Promise<any> {
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
    const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
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
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse Python agent output: ${stdout}`));
      }
    });
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // Disruptions list
  app.get('/api/disruptions', (req, res) => {
    res.json({
      success: true,
      count: disruptions.length,
      disruptions
    });
  });

  // Single disruption details
  app.get('/api/disruptions/:id', (req, res) => {
    const disruption = disruptions.find((d) => d.disruption_id === req.params.id);
    if (!disruption) {
      return res.status(404).json({ success: false, error: 'Disruption not found' });
    }
    res.json({ success: true, disruption });
  });

  // Trigger Multi-Agent Investigation via Python Commander Agent
  app.post('/api/investigations', async (req, res) => {
    try {
      const { disruption_id, scoring_weights } = req.body;
      if (!disruption_id) {
        return res.status(400).json({ success: false, error: 'disruption_id is required' });
      }

      const investigation = await runPythonInvestigation(disruption_id, scoring_weights);
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
