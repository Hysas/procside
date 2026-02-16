import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import {
  loadRegistry,
  saveRegistry,
  loadProcessById,
  createProcessInRegistry,
  getActiveProcess,
  setActiveProcess,
  listProcesses,
  listActiveProcesses,
  archiveProcess,
  restoreProcess,
  updateProcessMeta,
  createVersionSnapshot,
  listVersions,
  loadVersion,
  migrateFromSingleProcess,
  needsMigration,
  getRegistryPath,
  getProcessesDir,
  getVersionsDir
} from '../storage/registry.js';
import { ensureAiDir, getProcessPath } from '../storage/process-store.js';
import type { Process, ProcessRegistry } from '../types/index.js';
import { createEmptyRegistry, generateProcessId } from '../types/index.js';

const TEST_DIR = path.join(process.cwd(), '.test-registry-' + Date.now());

function setupTestDir(): void {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

function cleanupTestDir(): void {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe('Registry Types', () => {
  it('creates empty registry', () => {
    const registry = createEmptyRegistry();
    expect(registry.version).toBe(1);
    expect(registry.activeProcessId).toBeNull();
    expect(registry.processes).toEqual([]);
    expect(registry.templates).toEqual([]);
  });

  it('generates sequential process IDs', () => {
    expect(generateProcessId([])).toBe('proc-001');
    expect(generateProcessId(['proc-001'])).toBe('proc-002');
    expect(generateProcessId(['proc-001', 'proc-003'])).toBe('proc-004');
    expect(generateProcessId(['proc-010', 'proc-002'])).toBe('proc-011');
  });
});

describe('Registry Storage', () => {
  beforeEach(setupTestDir);
  afterEach(cleanupTestDir);

  it('loads empty registry when none exists', () => {
    const registry = loadRegistry(TEST_DIR);
    expect(registry.version).toBe(1);
    expect(registry.processes).toEqual([]);
  });

  it('saves and loads registry', () => {
    const registry = createEmptyRegistry();
    registry.activeProcessId = 'proc-001';
    registry.processes.push({
      id: 'proc-001',
      name: 'Test Process',
      goal: 'Test goal',
      status: 'in_progress',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      progress: 50,
      tags: ['test'],
      archived: false
    });

    saveRegistry(registry, TEST_DIR);

    const loaded = loadRegistry(TEST_DIR);
    expect(loaded.activeProcessId).toBe('proc-001');
    expect(loaded.processes).toHaveLength(1);
    expect(loaded.processes[0].name).toBe('Test Process');
  });

  it('creates process in registry', () => {
    const proc = createProcessInRegistry('Test Process', 'Test goal', undefined, TEST_DIR);

    expect(proc.id).toBe('proc-001');
    expect(proc.name).toBe('Test Process');
    expect(proc.status).toBe('planned');

    const registry = loadRegistry(TEST_DIR);
    expect(registry.activeProcessId).toBe('proc-001');
    expect(registry.processes).toHaveLength(1);

    const loadedProc = loadProcessById('proc-001', TEST_DIR);
    expect(loadedProc).not.toBeNull();
    expect(loadedProc?.name).toBe('Test Process');
  });

  it('creates multiple processes with sequential IDs', () => {
    const proc1 = createProcessInRegistry('Process 1', 'Goal 1', undefined, TEST_DIR);
    const proc2 = createProcessInRegistry('Process 2', 'Goal 2', undefined, TEST_DIR);
    const proc3 = createProcessInRegistry('Process 3', 'Goal 3', undefined, TEST_DIR);

    expect(proc1.id).toBe('proc-001');
    expect(proc2.id).toBe('proc-002');
    expect(proc3.id).toBe('proc-003');

    const processes = listProcesses(TEST_DIR);
    expect(processes).toHaveLength(3);
  });

  it('gets and sets active process', () => {
    createProcessInRegistry('Process 1', 'Goal 1', undefined, TEST_DIR);
    createProcessInRegistry('Process 2', 'Goal 2', undefined, TEST_DIR);

    expect(setActiveProcess('proc-001', TEST_DIR)).toBe(true);

    const active = getActiveProcess(TEST_DIR);
    expect(active?.id).toBe('proc-001');
    expect(active?.name).toBe('Process 1');

    expect(setActiveProcess('proc-002', TEST_DIR)).toBe(true);
    const active2 = getActiveProcess(TEST_DIR);
    expect(active2?.id).toBe('proc-002');

    expect(setActiveProcess('nonexistent', TEST_DIR)).toBe(false);
  });

  it('archives and restores processes', () => {
    createProcessInRegistry('Process 1', 'Goal 1', undefined, TEST_DIR);
    createProcessInRegistry('Process 2', 'Goal 2', undefined, TEST_DIR);

    expect(archiveProcess('proc-001', TEST_DIR)).toBe(true);

    const active = listActiveProcesses(TEST_DIR);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('proc-002');

    const all = listProcesses(TEST_DIR);
    expect(all.find(p => p.id === 'proc-001')?.archived).toBe(true);

    expect(restoreProcess('proc-001', TEST_DIR)).toBe(true);
    const activeAfterRestore = listActiveProcesses(TEST_DIR);
    expect(activeAfterRestore).toHaveLength(2);
  });

  it('updates active process when archiving', () => {
    createProcessInRegistry('Process 1', 'Goal 1', undefined, TEST_DIR);
    createProcessInRegistry('Process 2', 'Goal 2', undefined, TEST_DIR);

    setActiveProcess('proc-001', TEST_DIR);
    archiveProcess('proc-001', TEST_DIR);

    const registry = loadRegistry(TEST_DIR);
    expect(registry.activeProcessId).toBe('proc-002');
  });
});

describe('Version Management', () => {
  beforeEach(setupTestDir);
  afterEach(cleanupTestDir);

  it('creates version snapshot on process creation', () => {
    createProcessInRegistry('Test Process', 'Test goal', undefined, TEST_DIR);

    const versions = listVersions('proc-001', TEST_DIR);
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].reason).toBe('Initial process creation');
  });

  it('creates multiple version snapshots', () => {
    const proc = createProcessInRegistry('Test Process', 'Test goal', undefined, TEST_DIR);

    createVersionSnapshot(proc, 'Added step 2', TEST_DIR);
    createVersionSnapshot(proc, 'Completed step 1', TEST_DIR);

    const versions = listVersions('proc-001', TEST_DIR);
    expect(versions).toHaveLength(3);
    expect(versions[1].reason).toBe('Added step 2');
    expect(versions[2].reason).toBe('Completed step 1');
  });

  it('loads specific version', () => {
    createProcessInRegistry('Test Process', 'Test goal', undefined, TEST_DIR);

    const v1 = loadVersion('proc-001', 1, TEST_DIR);
    expect(v1).not.toBeNull();
    expect(v1?.version).toBe(1);
    expect(v1?.process.name).toBe('Test Process');
  });
});

describe('Migration', () => {
  beforeEach(setupTestDir);
  afterEach(cleanupTestDir);

  it('detects when migration is needed', () => {
    expect(needsMigration(TEST_DIR)).toBe(false);

    const aiDir = path.join(TEST_DIR, '.ai');
    fs.mkdirSync(aiDir, { recursive: true });
    
    const oldProcess: Process = {
      id: 'old-id',
      name: 'Old Process',
      goal: 'Old goal',
      status: 'in_progress',
      steps: [],
      decisions: [],
      risks: [],
      evidence: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    };

    const oldPath = getProcessPath(TEST_DIR);
    fs.writeFileSync(oldPath, YAML.stringify(oldProcess), 'utf-8');

    expect(needsMigration(TEST_DIR)).toBe(true);
  });

  it('migrates from single process format', () => {
    const aiDir = path.join(TEST_DIR, '.ai');
    fs.mkdirSync(aiDir, { recursive: true });
    
    const oldProcess: Process = {
      id: 'old-id',
      name: 'Old Process',
      goal: 'Old goal',
      status: 'in_progress',
      steps: [
        { id: 's1', name: 'Step 1', inputs: [], outputs: [], checks: [], status: 'completed' },
        { id: 's2', name: 'Step 2', inputs: [], outputs: [], checks: [], status: 'pending' }
      ],
      decisions: [],
      risks: [],
      evidence: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z'
    };

    const oldPath = getProcessPath(TEST_DIR);
    fs.writeFileSync(oldPath, YAML.stringify(oldProcess), 'utf-8');

    const result = migrateFromSingleProcess(TEST_DIR);
    expect(result).toBe(true);

    expect(fs.existsSync(oldPath)).toBe(false);

    const registry = loadRegistry(TEST_DIR);
    expect(registry.activeProcessId).toBe('proc-001');
    expect(registry.processes).toHaveLength(1);
    expect(registry.processes[0].name).toBe('Old Process');
    expect(registry.processes[0].progress).toBe(50);

    const proc = loadProcessById('proc-001', TEST_DIR);
    expect(proc).not.toBeNull();
    expect(proc?.id).toBe('proc-001');
    expect(proc?.steps).toHaveLength(2);

    const versions = listVersions('proc-001', TEST_DIR);
    expect(versions).toHaveLength(1);
    expect(versions[0].reason).toBe('Migrated from single-process format');
  });

  it('does not migrate if registry already exists', () => {
    const aiDir = path.join(TEST_DIR, '.ai');
    fs.mkdirSync(aiDir, { recursive: true });
    
    const oldProcess: Process = {
      id: 'old-id',
      name: 'Old Process',
      goal: 'Old goal',
      status: 'in_progress',
      steps: [],
      decisions: [],
      risks: [],
      evidence: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    };

    const oldPath = getProcessPath(TEST_DIR);
    fs.writeFileSync(oldPath, YAML.stringify(oldProcess), 'utf-8');

    const registry = createEmptyRegistry();
    saveRegistry(registry, TEST_DIR);

    const result = migrateFromSingleProcess(TEST_DIR);
    expect(result).toBe(false);

    expect(fs.existsSync(oldPath)).toBe(true);
  });
});
