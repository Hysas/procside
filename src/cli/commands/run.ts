import { spawn, ChildProcess } from 'child_process';
import { loadProcess, saveProcess, applyUpdate, appendHistory, processExists } from '../../storage/index.js';
import { parseAllUpdates, formatUpdateBlock } from '../../parser/index.js';
import type { ProcessUpdate, Process } from '../../types/index.js';
import logger from '../../logger.js';

export interface RunOptions {
  command: string;
  projectPath?: string;
  onUpdate?: (update: ProcessUpdate) => void;
  onOutput?: (data: string) => void;
}

export interface RunResult {
  exitCode: number;
  updates: ProcessUpdate[];
  output: string;
}

export function runAgent(options: RunOptions): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const { command, projectPath = process.cwd() } = options;
    logger.info(`Running agent command: ${command}`);
    logger.debug(`Agent project path: ${projectPath}`);

    let proc = loadProcess(projectPath);
    if (!proc) {
      logger.info('No existing process found, creating default process');
      proc = {
        id: 'main',
        name: 'Main Process',
        goal: 'Document the AI agent workflow',
        status: 'in_progress',
        steps: [],
        decisions: [],
        risks: [],
        evidence: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      saveProcess(proc, projectPath);
    }
    
    const parts = parseCommand(command);
    const childProcess = spawn(parts[0], parts.slice(1), {
      cwd: projectPath,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    
    let output = '';
    const allUpdates: ProcessUpdate[] = [];
    
    childProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      
      if (options.onOutput) {
        options.onOutput(text);
      }
      
      const updates = parseAllUpdates(text);
      for (const update of updates) {
        logger.info(`Process update received: action=${update.action}`);
        logger.debug(`Update details: ${JSON.stringify(update)}`);
        allUpdates.push(update);
        proc = applyUpdate(proc!, update);
        saveProcess(proc!, projectPath);
        
        appendHistory({
          timestamp: new Date().toISOString(),
          type: update.action,
          data: update,
          raw: text
        }, projectPath);
        
        if (options.onUpdate) {
          options.onUpdate(update);
        }
      }
    });
    
    childProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      
      if (options.onOutput) {
        options.onOutput(text);
      }
    });
    
    childProcess.on('close', (code) => {
      logger.info(`Agent command completed with exit code ${code || 0}, ${allUpdates.length} updates captured`);
      resolve({
        exitCode: code || 0,
        updates: allUpdates,
        output
      });
    });

    childProcess.on('error', (err) => {
      logger.error(`Agent command failed: ${err.message}`);
      reject(err);
    });
  });
}

function parseCommand(command: string): string[] {
  const match = command.match(/(?:[^\s"]+|"[^"]*")+/g);
  if (!match) return [command];
  return match.map(arg => arg.replace(/^"|"$/g, ''));
}

export function runWithPassthrough(command: string, projectPath: string = process.cwd()): Promise<number> {
  return new Promise((resolve, reject) => {
    logger.info(`Running passthrough command: ${command}`);
    let proc = loadProcess(projectPath);
    if (!proc) {
      logger.info('No existing process found for passthrough, creating default process');
      proc = {
        id: 'main',
        name: 'Main Process',
        goal: 'Document the AI agent workflow',
        status: 'in_progress',
        steps: [],
        decisions: [],
        risks: [],
        evidence: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      saveProcess(proc, projectPath);
    }
    
    const childProcess = spawn(command, [], {
      cwd: projectPath,
      shell: true,
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    childProcess.on('close', (code) => {
      resolve(code || 0);
    });
    
    childProcess.on('error', (err) => {
      reject(err);
    });
  });
}
