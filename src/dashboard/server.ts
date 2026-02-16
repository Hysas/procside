import express, { Request, Response } from 'express';
import * as http from 'http';
import * as path from 'path';
import { EventEmitter } from 'events';
import * as chokidar from 'chokidar';
import open from 'open';
import { loadProcess } from '../storage/index.js';
import { loadConfig } from '../config.js';
import { generateDashboard } from './generator.js';

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
  
  app.get('/', (req: Request, res: Response) => {
    try {
      const proc = loadProcess(projectPath);
      if (!proc) {
        res.send('<html><body><h1>No process found</h1><p>Run `procside init` first</p></body></html>');
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
  const processPath = path.join(projectPath, '.ai', 'process.yaml');
  
  watcher = chokidar.watch(processPath, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });
  
  watcher.on('change', () => {
    events.emit('process-update');
  });
  
  watcher.on('add', () => {
    events.emit('process-update');
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
    console.log(`  Watching: ${path.join(projectPath, '.ai/process.yaml')}`);
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
