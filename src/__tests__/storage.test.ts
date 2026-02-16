import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { 
  loadProcess, 
  saveProcess, 
  processExists, 
  initProcess,
  applyUpdate,
  ensureAiDir,
  getProcessPath
} from '../storage/process-store.js';
import type { Process, ProcessUpdate } from '../types/index.js';

const TEST_DIR = path.join(process.cwd(), '.test-temp');

describe('Process Store', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('ensureAiDir', () => {
    it('creates .ai directory if it does not exist', () => {
      const aiPath = ensureAiDir(TEST_DIR);
      expect(fs.existsSync(aiPath)).toBe(true);
      expect(aiPath).toBe(path.join(TEST_DIR, '.ai'));
    });

    it('returns existing .ai directory', () => {
      const aiPath1 = ensureAiDir(TEST_DIR);
      const aiPath2 = ensureAiDir(TEST_DIR);
      expect(aiPath1).toBe(aiPath2);
    });
  });

  describe('processExists', () => {
    it('returns false when no process exists', () => {
      expect(processExists(TEST_DIR)).toBe(false);
    });

    it('returns true when process exists', () => {
      initProcess('test', 'Test Process', 'Test goal', undefined, TEST_DIR);
      expect(processExists(TEST_DIR)).toBe(true);
    });
  });

  describe('initProcess', () => {
    it('creates a new process with correct defaults', () => {
      const proc = initProcess('test.id', 'Test Process', 'Test goal', undefined, TEST_DIR);
      
      expect(proc.id).toBe('test.id');
      expect(proc.name).toBe('Test Process');
      expect(proc.goal).toBe('Test goal');
      expect(proc.status).toBe('planned');
      expect(proc.steps).toEqual([]);
      expect(proc.decisions).toEqual([]);
      expect(proc.risks).toEqual([]);
      expect(proc.evidence).toEqual([]);
    });

    it('saves process to .ai/process.yaml', () => {
      initProcess('test.id', 'Test Process', 'Test goal', undefined, TEST_DIR);
      
      const processPath = getProcessPath(TEST_DIR);
      expect(fs.existsSync(processPath)).toBe(true);
      
      const content = fs.readFileSync(processPath, 'utf-8');
      const parsed = YAML.parse(content);
      expect(parsed.id).toBe('test.id');
    });
  });

  describe('loadProcess', () => {
    it('returns null when no process exists', () => {
      expect(loadProcess(TEST_DIR)).toBeNull();
    });

    it('loads existing process', () => {
      initProcess('test.id', 'Test Process', 'Test goal', undefined, TEST_DIR);
      
      const proc = loadProcess(TEST_DIR);
      expect(proc).not.toBeNull();
      expect(proc?.id).toBe('test.id');
      expect(proc?.name).toBe('Test Process');
    });
  });

  describe('saveProcess', () => {
    it('saves process changes', () => {
      const proc = initProcess('test.id', 'Test Process', 'Test goal', undefined, TEST_DIR);
      
      proc.status = 'in_progress';
      saveProcess(proc, TEST_DIR);
      
      const loaded = loadProcess(TEST_DIR);
      expect(loaded?.status).toBe('in_progress');
    });
  });

  describe('applyUpdate', () => {
    let proc: Process;

    beforeEach(() => {
      proc = initProcess('test', 'Test', 'Goal', undefined, TEST_DIR);
    });

    it('applies process_update action', () => {
      const update: ProcessUpdate = {
        action: 'process_update',
        status: 'in_progress'
      };
      
      const result = applyUpdate(proc, update);
      expect(result.status).toBe('in_progress');
    });

    it('applies step_add action', () => {
      const update: ProcessUpdate = {
        action: 'step_add',
        step: {
          id: 's1',
          name: 'Test Step',
          inputs: ['input1'],
          outputs: [],
          checks: ['check1'],
          status: 'pending'
        }
      };
      
      const result = applyUpdate(proc, update);
      expect(result.steps.length).toBe(1);
      expect(result.steps[0].id).toBe('s1');
      expect(result.steps[0].name).toBe('Test Step');
    });

    it('applies step_start action', () => {
      proc.steps.push({
        id: 's1',
        name: 'Test Step',
        inputs: [],
        outputs: [],
        checks: [],
        status: 'pending'
      });
      
      const update: ProcessUpdate = {
        action: 'step_start',
        stepId: 's1'
      };
      
      const result = applyUpdate(proc, update);
      expect(result.steps[0].status).toBe('in_progress');
      expect(result.steps[0].startedAt).toBeDefined();
    });

    it('applies step_complete action', () => {
      proc.steps.push({
        id: 's1',
        name: 'Test Step',
        inputs: [],
        outputs: [],
        checks: [],
        status: 'in_progress'
      });
      
      const update: ProcessUpdate = {
        action: 'step_complete',
        stepId: 's1',
        outputs: ['output1', 'output2']
      };
      
      const result = applyUpdate(proc, update);
      expect(result.steps[0].status).toBe('completed');
      expect(result.steps[0].outputs).toContain('output1');
      expect(result.steps[0].outputs).toContain('output2');
    });

    it('applies decision action', () => {
      const update: ProcessUpdate = {
        action: 'decision',
        decision: {
          question: 'Use X or Y?',
          choice: 'X',
          rationale: 'X is better'
        }
      };
      
      const result = applyUpdate(proc, update);
      expect(result.decisions.length).toBe(1);
      expect(result.decisions[0].question).toBe('Use X or Y?');
      expect(result.decisions[0].choice).toBe('X');
    });

    it('applies risk action', () => {
      const update: ProcessUpdate = {
        action: 'risk',
        risk: {
          risk: 'Performance issue',
          impact: 'high',
          mitigation: 'Add caching'
        }
      };
      
      const result = applyUpdate(proc, update);
      expect(result.risks.length).toBe(1);
      expect(result.risks[0].risk).toBe('Performance issue');
      expect(result.risks[0].impact).toBe('high');
    });

    it('applies evidence action', () => {
      const update: ProcessUpdate = {
        action: 'evidence',
        evidence: [
          { type: 'command', value: 'npm test', timestamp: new Date().toISOString() },
          { type: 'file', value: 'src/index.ts', timestamp: new Date().toISOString() }
        ]
      };
      
      const result = applyUpdate(proc, update);
      expect(result.evidence.length).toBe(2);
      expect(result.evidence[0].type).toBe('command');
      expect(result.evidence[1].type).toBe('file');
    });
  });
});
