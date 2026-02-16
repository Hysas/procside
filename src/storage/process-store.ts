import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { Process, Step, Decision, Risk, Evidence, ProcessUpdate, ProcessStatus } from '../types/index.js';

const AI_DIR = '.ai';
const PROCESS_FILE = 'process.yaml';
const HISTORY_FILE = 'history.yaml';

export interface HistoryEntry {
  timestamp: string;
  type: string;
  data: ProcessUpdate;
}

export function ensureAiDir(projectPath: string = process.cwd()): string {
  const aiPath = path.join(projectPath, AI_DIR);
  if (!fs.existsSync(aiPath)) {
    fs.mkdirSync(aiPath, { recursive: true });
  }
  return aiPath;
}

export function getProcessPath(projectPath: string = process.cwd()): string {
  return path.join(projectPath, AI_DIR, PROCESS_FILE);
}

export function getHistoryPath(projectPath: string = process.cwd()): string {
  return path.join(projectPath, AI_DIR, HISTORY_FILE);
}

export function processExists(projectPath: string = process.cwd()): boolean {
  return fs.existsSync(getProcessPath(projectPath));
}

export function loadProcess(projectPath: string = process.cwd()): Process | null {
  const filePath = getProcessPath(projectPath);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = YAML.parse(content);
  return parsed as Process;
}

export function saveProcess(proc: Process, projectPath: string = process.cwd()): void {
  ensureAiDir(projectPath);
  proc.updatedAt = new Date().toISOString();
  const filePath = getProcessPath(projectPath);
  const content = YAML.stringify(proc);
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function loadHistory(projectPath: string = process.cwd()): HistoryEntry[] {
  const filePath = getHistoryPath(projectPath);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = YAML.parse(content);
  return (parsed?.entries || []) as HistoryEntry[];
}

export function appendHistory(entry: HistoryEntry, projectPath: string = process.cwd()): void {
  ensureAiDir(projectPath);
  const history = loadHistory(projectPath);
  history.push(entry);
  const filePath = getHistoryPath(projectPath);
  const content = YAML.stringify({ entries: history });
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function applyUpdate(proc: Process, update: ProcessUpdate): Process {
  const timestamp = new Date().toISOString();
  const processStatuses: ProcessStatus[] = ['planned', 'in_progress', 'blocked', 'completed', 'cancelled'];
  
  switch (update.action) {
    case 'process_start':
    case 'process_update':
      if (update.status && processStatuses.includes(update.status as ProcessStatus)) {
        proc.status = update.status as ProcessStatus;
      }
      break;
    
    case 'step_add':
      if (update.step) {
        const newStep: Step = {
          id: update.step.id || `s${proc.steps.length + 1}`,
          name: update.step.name || 'Unnamed step',
          description: update.step.description,
          inputs: update.step.inputs || [],
          outputs: update.step.outputs || [],
          checks: update.step.checks || [],
          status: update.step.status || 'pending'
        };
        proc.steps.push(newStep);
      }
      break;
      
    case 'step_start':
      if (update.stepId) {
        const step = proc.steps.find(s => s.id === update.stepId);
        if (step) {
          step.status = 'in_progress';
          step.startedAt = timestamp;
        }
      }
      break;
      
    case 'step_complete':
      if (update.stepId) {
        const step = proc.steps.find(s => s.id === update.stepId);
        if (step) {
          step.status = 'completed';
          step.completedAt = timestamp;
          if (update.outputs) {
            step.outputs = [...step.outputs, ...update.outputs];
          }
        }
      }
      break;
      
    case 'step_fail':
      if (update.stepId) {
        const step = proc.steps.find(s => s.id === update.stepId);
        if (step) {
          step.status = 'failed';
          step.completedAt = timestamp;
        }
      }
      break;
      
    case 'decision':
      if (update.decision) {
        const decision: Decision = {
          id: update.decision.id || `d${proc.decisions.length + 1}`,
          question: update.decision.question || '',
          choice: update.decision.choice || '',
          rationale: update.decision.rationale || '',
          options: update.decision.options,
          timestamp: timestamp
        };
        proc.decisions.push(decision);
      }
      break;
      
    case 'risk':
      if (update.risk) {
        const risk: Risk = {
          id: update.risk.id || `r${proc.risks.length + 1}`,
          risk: update.risk.risk || '',
          impact: update.risk.impact || 'medium',
          mitigation: update.risk.mitigation || '',
          status: 'identified',
          identifiedAt: timestamp
        };
        proc.risks.push(risk);
      }
      break;
      
    case 'evidence':
      if (update.evidence) {
        proc.evidence.push(...update.evidence);
      }
      break;
  }
  
  proc.updatedAt = timestamp;
  return proc;
}

export function initProcess(id: string, name: string, goal: string, template?: string, projectPath: string = process.cwd()): Process {
  ensureAiDir(projectPath);
  const proc = {
    id,
    name,
    goal,
    status: 'planned' as const,
    template,
    steps: [],
    decisions: [],
    risks: [],
    evidence: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveProcess(proc, projectPath);
  return proc;
}
