import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { ProcessUpdate } from '../types/index.js';

export interface HistoryEntry {
  timestamp: string;
  type: string;
  data: ProcessUpdate;
  raw?: string;
}

const AI_DIR = '.ai';
const HISTORY_FILE = 'history.yaml';

export function getHistoryPath(projectPath: string = process.cwd()): string {
  return path.join(projectPath, AI_DIR, HISTORY_FILE);
}

export function historyExists(projectPath: string = process.cwd()): boolean {
  return fs.existsSync(getHistoryPath(projectPath));
}

export function loadHistory(projectPath: string = process.cwd()): HistoryEntry[] {
  const filePath = getHistoryPath(projectPath);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  try {
    const parsed = YAML.parse(content);
    return (parsed?.entries || []) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function appendHistory(entry: HistoryEntry, projectPath: string = process.cwd()): void {
  const history = loadHistory(projectPath);
  history.push({
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString()
  });
  
  const aiDir = path.join(projectPath, AI_DIR);
  if (!fs.existsSync(aiDir)) {
    fs.mkdirSync(aiDir, { recursive: true });
  }
  
  const filePath = getHistoryPath(projectPath);
  const content = YAML.stringify({ entries: history });
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function getRecentHistory(count: number = 10, projectPath: string = process.cwd()): HistoryEntry[] {
  const history = loadHistory(projectPath);
  return history.slice(-count);
}

export function clearHistory(projectPath: string = process.cwd()): void {
  const filePath = getHistoryPath(projectPath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
