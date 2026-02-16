import express, { Request, Response } from 'express';
import * as http from 'http';
import * as path from 'path';
import { EventEmitter } from 'events';
import * as chokidar from 'chokidar';
import open from 'open';
import { getActiveProcess, loadRegistry, listActiveProcesses, loadProcessById, needsMigration, migrateFromSingleProcess } from '../storage/index.js';
import { loadConfig } from '../config.js';
import { generateDashboard, generateProcessList, generateMultiProcessDashboard } from './generator.js';

const events = new EventEmitter();
let watcher: chokidar.FSWatcher | null = null;

export interface DashboardServerOptions {
  port?: number;
  projectPath?: string;
  open?: boolean;
}

export function createServer(options: DashboardServerOptions = {}): http.Server {
  const { projectPath = process.cwd() } = options;
  const app = express();
  const config = loadConfig(projectPath);
  
  // Check if migration is needed
  if (needsMigration(projectPath)) {
    migrateFromSingleProcess(projectPath);
  }
  
  // API endpoint for JSON data
  app.get('/api/processes', (req: Request, res: Response) => {
    try {
      const registry = loadRegistry(projectPath);
      const processes = listActiveProcesses(projectPath).map(meta => {
        const proc = loadProcessById(meta.id, projectPath);
        return proc ? { ...meta, steps: proc.steps, evidence: proc.evidence, decisions: proc.decisions, risks: proc.risks } : meta;
      });
      res.json({
        processes,
        activeProcessId: registry.activeProcessId
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load processes' });
    }
  });
  
  // Multi-process dashboard with animation style variants
  app.get(['/', '/1', '/2', '/3', '/4'], (req: Request, res: Response) => {
    try {
      const registry = loadRegistry(projectPath);
      const processes = listActiveProcesses(projectPath);
      
      // Determine animation style from path
      let animationStyle = 'fade';
      if (req.path === '/2') animationStyle = 'slide';
      else if (req.path === '/3') animationStyle = 'scale';
      else if (req.path === '/4') animationStyle = 'minimal';
      
      const html = generateMultiProcessDashboard(processes, registry.activeProcessId, projectPath, animationStyle);
      res.send(html);
    } catch (error) {
      res.status(500).send('<html><body><h1>Error</h1><p>Failed to generate dashboard</p></body></html>');
    }
  });
  
  app.get('/process/:id', (req: Request, res: Response) => {
    try {
      const processId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const proc = loadProcessById(processId, projectPath);
      if (!proc) {
        res.status(404).send('<html><body><h1>Process not found</h1></body></html>');
        return;
      }
      const html = generateDashboard(proc, projectPath, config.qualityGates);
      res.send(html);
    } catch (error) {
      res.status(500).send('<html><body><h1>Error</h1><p>Failed to generate dashboard</p></body></html>');
    }
  });
  
  app.get('/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    const sendUpdate = () => {
      res.write(`data: ${JSON.stringify({ type: 'process-update' })}\n\n`);
    };
    
    events.on('process-update', sendUpdate);
    
    req.on('close', () => {
      events.off('process-update', sendUpdate);
    });
  });
  
  return http.createServer(app);
}

export function startWatcher(projectPath: string): void {
  const aiDir = path.join(projectPath, '.ai');
  
  watcher = chokidar.watch(aiDir, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    },
    ignored: /(^|[\/\\])\../
  });
  
  watcher.on('change', (filePath) => {
    events.emit('process-update', { path: filePath });
  });
  
  watcher.on('add', (filePath) => {
    events.emit('process-update', { path: filePath });
  });
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

export function startServer(options: DashboardServerOptions = {}): http.Server {
  const { port = 3000, projectPath = process.cwd(), open: shouldOpen = true } = options;
  
  const server = createServer({ projectPath });
  
  startWatcher(projectPath);
  
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`\n  procside dashboard running at ${url}`);
    console.log(`  Watching: ${path.join(projectPath, '.ai/')}`);
    console.log(`\n  Press Ctrl+C to stop\n`);
    
    if (shouldOpen) {
      open(url).catch(() => {
        console.log(`  Could not open browser. Open manually: ${url}`);
      });
    }
  });
  
  const shutdown = () => {
    console.log('\n  Shutting down...');
    stopWatcher();
    server.close(() => {
      console.log('  Server stopped');
      process.exit(0);
    });
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  return server;
}
