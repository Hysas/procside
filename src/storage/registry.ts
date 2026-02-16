import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { Process, ProcessRegistry, ProcessMeta, ProcessVersion } from '../types/index.js';
import { createEmptyRegistry, createProcessMeta, generateProcessId } from '../types/index.js';
import { loadProcess, saveProcess, ensureAiDir, getProcessPath } from './process-store.js';

const REGISTRY_FILE = 'registry.yaml';
const PROCESSES_DIR = 'processes';
const VERSIONS_DIR = 'versions';

export function getRegistryPath(projectPath: string = process.cwd()): string {
  return path.join(projectPath, '.ai', REGISTRY_FILE);
}

export function getProcessesDir(projectPath: string = process.cwd()): string {
  return path.join(projectPath, '.ai', PROCESSES_DIR);
}

export function getVersionsDir(projectPath: string = process.cwd()): string {
  return path.join(projectPath, '.ai', VERSIONS_DIR);
}

export function registryExists(projectPath: string = process.cwd()): boolean {
  return fs.existsSync(getRegistryPath(projectPath));
}

export function loadRegistry(projectPath: string = process.cwd()): ProcessRegistry {
  const filePath = getRegistryPath(projectPath);
  if (!fs.existsSync(filePath)) {
    return createEmptyRegistry();
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = YAML.parse(content);
  return parsed as ProcessRegistry;
}

export function saveRegistry(registry: ProcessRegistry, projectPath: string = process.cwd()): void {
  const aiDir = path.join(projectPath, '.ai');
  if (!fs.existsSync(aiDir)) {
    fs.mkdirSync(aiDir, { recursive: true });
  }
  const filePath = getRegistryPath(projectPath);
  const content = YAML.stringify(registry);
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function getProcessFilePath(id: string, projectPath: string = process.cwd()): string {
  return path.join(getProcessesDir(projectPath), `${id}.yaml`);
}

export function loadProcessById(id: string, projectPath: string = process.cwd()): Process | null {
  const filePath = getProcessFilePath(id, projectPath);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = YAML.parse(content);
  return parsed as Process;
}

export function saveProcessToRegistry(proc: Process, projectPath: string = process.cwd()): void {
  const processesDir = getProcessesDir(projectPath);
  if (!fs.existsSync(processesDir)) {
    fs.mkdirSync(processesDir, { recursive: true });
  }
  
  const filePath = getProcessFilePath(proc.id, projectPath);
  const content = YAML.stringify(proc);
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function createProcessInRegistry(
  name: string,
  goal: string,
  template: string | undefined,
  projectPath: string = process.cwd()
): Process {
  const registry = loadRegistry(projectPath);
  const existingIds = registry.processes.map(p => p.id);
  const id = generateProcessId(existingIds);
  
  const now = new Date().toISOString();
  const proc: Process = {
    id,
    name,
    goal,
    status: 'planned',
    template,
    steps: [],
    decisions: [],
    risks: [],
    evidence: [],
    createdAt: now,
    updatedAt: now
  };
  
  saveProcessToRegistry(proc, projectPath);
  
  const meta = createProcessMeta(proc);
  registry.processes.push(meta);
  registry.activeProcessId = id;
  saveRegistry(registry, projectPath);
  
  createVersionSnapshot(proc, 'Initial process creation', projectPath);
  
  return proc;
}

export function getActiveProcess(projectPath: string = process.cwd()): Process | null {
  const registry = loadRegistry(projectPath);
  if (!registry.activeProcessId) {
    return null;
  }
  return loadProcessById(registry.activeProcessId, projectPath);
}

export function setActiveProcess(id: string, projectPath: string = process.cwd()): boolean {
  const registry = loadRegistry(projectPath);
  const procMeta = registry.processes.find(p => p.id === id);
  if (!procMeta) {
    return false;
  }
  
  registry.activeProcessId = id;
  saveRegistry(registry, projectPath);
  return true;
}

export function listProcesses(projectPath: string = process.cwd()): ProcessMeta[] {
  const registry = loadRegistry(projectPath);
  return registry.processes;
}

export function listActiveProcesses(projectPath: string = process.cwd()): ProcessMeta[] {
  const registry = loadRegistry(projectPath);
  return registry.processes.filter(p => !p.archived);
}

export function archiveProcess(id: string, projectPath: string = process.cwd()): boolean {
  const registry = loadRegistry(projectPath);
  const procMeta = registry.processes.find(p => p.id === id);
  if (!procMeta) {
    return false;
  }
  
  procMeta.archived = true;
  procMeta.archivedAt = new Date().toISOString();
  
  if (registry.activeProcessId === id) {
    const nextActive = registry.processes.find(p => !p.archived && p.id !== id);
    registry.activeProcessId = nextActive?.id || null;
  }
  
  saveRegistry(registry, projectPath);
  return true;
}

export function restoreProcess(id: string, projectPath: string = process.cwd()): boolean {
  const registry = loadRegistry(projectPath);
  const procMeta = registry.processes.find(p => p.id === id);
  if (!procMeta) {
    return false;
  }
  
  procMeta.archived = false;
  delete procMeta.archivedAt;
  
  saveRegistry(registry, projectPath);
  return true;
}

export function updateProcessMeta(proc: Process, projectPath: string = process.cwd()): void {
  const registry = loadRegistry(projectPath);
  const meta = createProcessMeta(proc);
  const existingIndex = registry.processes.findIndex(p => p.id === proc.id);
  
  if (existingIndex >= 0) {
    meta.tags = registry.processes[existingIndex].tags;
    meta.archived = registry.processes[existingIndex].archived;
    meta.archivedAt = registry.processes[existingIndex].archivedAt;
    registry.processes[existingIndex] = meta;
  } else {
    registry.processes.push(meta);
  }
  
  saveRegistry(registry, projectPath);
}

export function createVersionSnapshot(
  proc: Process,
  reason: string,
  projectPath: string = process.cwd()
): number {
  const baseVersionsDir = getVersionsDir(projectPath);
  if (!fs.existsSync(baseVersionsDir)) {
    fs.mkdirSync(baseVersionsDir, { recursive: true });
  }
  
  const versionsDir = path.join(baseVersionsDir, proc.id);
  if (!fs.existsSync(versionsDir)) {
    fs.mkdirSync(versionsDir, { recursive: true });
  }
  
  const existingVersions = listVersions(proc.id, projectPath);
  const nextVersion = existingVersions.length + 1;
  
  const snapshot: ProcessVersion = {
    version: nextVersion,
    snapshotAt: new Date().toISOString(),
    reason,
    process: proc
  };
  
  const versionFile = path.join(versionsDir, `v${nextVersion}.yaml`);
  const content = YAML.stringify(snapshot);
  fs.writeFileSync(versionFile, content, 'utf-8');
  
  return nextVersion;
}

export function listVersions(id: string, projectPath: string = process.cwd()): ProcessVersion[] {
  const versionsDir = path.join(getVersionsDir(projectPath), id);
  if (!fs.existsSync(versionsDir)) {
    return [];
  }
  
  const files = fs.readdirSync(versionsDir)
    .filter(f => f.match(/^v\d+\.yaml$/))
    .sort((a, b) => {
      const numA = parseInt(a.replace('v', '').replace('.yaml', ''), 10);
      const numB = parseInt(b.replace('v', '').replace('.yaml', ''), 10);
      return numA - numB;
    });
  
  return files.map(f => {
    const content = fs.readFileSync(path.join(versionsDir, f), 'utf-8');
    return YAML.parse(content) as ProcessVersion;
  });
}

export function loadVersion(id: string, version: number, projectPath: string = process.cwd()): ProcessVersion | null {
  const versionFile = path.join(getVersionsDir(projectPath), id, `v${version}.yaml`);
  if (!fs.existsSync(versionFile)) {
    return null;
  }
  
  const content = fs.readFileSync(versionFile, 'utf-8');
  return YAML.parse(content) as ProcessVersion;
}

export function migrateFromSingleProcess(projectPath: string = process.cwd()): boolean {
  const oldPath = getProcessPath(projectPath);
  const newDir = getProcessesDir(projectPath);
  
  if (!fs.existsSync(oldPath)) {
    return false;
  }
  
  if (fs.existsSync(getRegistryPath(projectPath))) {
    return false;
  }
  
  fs.mkdirSync(newDir, { recursive: true });
  fs.mkdirSync(path.join(getVersionsDir(projectPath), 'proc-001'), { recursive: true });
  
  const content = fs.readFileSync(oldPath, 'utf-8');
  const proc = YAML.parse(content) as Process;
  
  proc.id = 'proc-001';
  
  const newProcPath = getProcessFilePath('proc-001', projectPath);
  fs.writeFileSync(newProcPath, YAML.stringify(proc), 'utf-8');
  
  const meta = createProcessMeta(proc);
  const registry: ProcessRegistry = {
    version: 1,
    activeProcessId: 'proc-001',
    processes: [meta],
    templates: []
  };
  saveRegistry(registry, projectPath);
  
  createVersionSnapshot(proc, 'Migrated from single-process format', projectPath);
  
  fs.unlinkSync(oldPath);
  
  return true;
}

export function needsMigration(projectPath: string = process.cwd()): boolean {
  const oldPath = getProcessPath(projectPath);
  const registryPath = getRegistryPath(projectPath);
  
  return fs.existsSync(oldPath) && !fs.existsSync(registryPath);
}
