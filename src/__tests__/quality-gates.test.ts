import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getGate, 
  getAllGates, 
  runGate, 
  runGates, 
  formatCheckResult 
} from '../quality-gates.js';
import type { Process } from '../types/index.js';
import type { QualityGatesConfig } from '../types/config.js';

const createTestProcess = (overrides: Partial<Process> = {}): Process => ({
  id: 'test',
  name: 'Test Process',
  goal: 'Test goal',
  status: 'in_progress',
  steps: [],
  decisions: [],
  risks: [],
  evidence: [],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  ...overrides
});

const defaultGatesConfig: QualityGatesConfig = {
  enabled: true,
  failOnWarning: false,
  gates: [
    { id: 'has_steps', enabled: true },
    { id: 'all_steps_completed', enabled: false },
    { id: 'has_evidence', enabled: true },
    { id: 'has_decisions', enabled: false },
    { id: 'no_pending_missing', enabled: true },
    { id: 'has_rollback', enabled: false },
    { id: 'has_validation', enabled: false },
  ]
};

describe('Quality Gates', () => {
  describe('getGate', () => {
    it('returns gate by id', () => {
      const gate = getGate('has_steps');
      expect(gate).toBeDefined();
      expect(gate?.id).toBe('has_steps');
      expect(gate?.name).toBe('Has Steps');
    });

    it('returns undefined for unknown gate', () => {
      expect(getGate('unknown')).toBeUndefined();
    });
  });

  describe('getAllGates', () => {
    it('returns all defined gates', () => {
      const gates = getAllGates();
      expect(gates.length).toBe(7);
      expect(gates.map(g => g.id)).toContain('has_steps');
      expect(gates.map(g => g.id)).toContain('has_evidence');
    });
  });

  describe('runGate', () => {
    it('passes has_steps when steps exist', () => {
      const proc = createTestProcess({
        steps: [{ id: 's1', name: 'Step 1', inputs: [], outputs: [], checks: [], status: 'pending' }]
      });
      
      const result = runGate(proc, 'has_steps');
      expect(result).not.toBeNull();
      expect(result?.passed).toBe(true);
    });

    it('fails has_steps when no steps', () => {
      const proc = createTestProcess();
      const result = runGate(proc, 'has_steps');
      expect(result?.passed).toBe(false);
      expect(result?.message).toContain('no steps');
    });

    it('passes all_steps_completed when all done', () => {
      const proc = createTestProcess({
        steps: [
          { id: 's1', name: 'Step 1', inputs: [], outputs: [], checks: [], status: 'completed' },
          { id: 's2', name: 'Step 2', inputs: [], outputs: [], checks: [], status: 'completed' }
        ]
      });
      
      const result = runGate(proc, 'all_steps_completed');
      expect(result?.passed).toBe(true);
    });

    it('fails all_steps_completed when incomplete', () => {
      const proc = createTestProcess({
        steps: [
          { id: 's1', name: 'Step 1', inputs: [], outputs: [], checks: [], status: 'completed' },
          { id: 's2', name: 'Step 2', inputs: [], outputs: [], checks: [], status: 'in_progress' }
        ]
      });
      
      const result = runGate(proc, 'all_steps_completed');
      expect(result?.passed).toBe(false);
    });

    it('passes has_evidence when evidence exists', () => {
      const proc = createTestProcess({
        evidence: [{ type: 'command', value: 'npm test', timestamp: '2025-01-01T00:00:00.000Z' }]
      });
      
      const result = runGate(proc, 'has_evidence');
      expect(result?.passed).toBe(true);
    });

    it('passes has_rollback when rollback step exists', () => {
      const proc = createTestProcess({
        steps: [{ id: 's1', name: 'Rollback changes', inputs: [], outputs: [], checks: [], status: 'pending' }]
      });
      
      const result = runGate(proc, 'has_rollback');
      expect(result?.passed).toBe(true);
    });

    it('passes has_validation when test step exists', () => {
      const proc = createTestProcess({
        steps: [{ id: 's1', name: 'Run tests', inputs: [], outputs: [], checks: [], status: 'pending' }]
      });
      
      const result = runGate(proc, 'has_validation');
      expect(result?.passed).toBe(true);
    });
  });

  describe('runGates', () => {
    it('passes when gates disabled', () => {
      const proc = createTestProcess();
      const config: QualityGatesConfig = { ...defaultGatesConfig, enabled: false };
      
      const result = runGates(proc, config);
      expect(result.passed).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('fails on error gates', () => {
      const proc = createTestProcess();
      const result = runGates(proc, defaultGatesConfig);
      
      expect(result.passed).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('passes with warnings', () => {
      const proc = createTestProcess({
        steps: [{ id: 's1', name: 'Step', inputs: [], outputs: [], checks: [], status: 'completed' }],
        evidence: [{ type: 'note', value: 'done', timestamp: '' }]
      });
      
      const result = runGates(proc, defaultGatesConfig);
      
      expect(result.passed).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('fails on warnings when failOnWarning is true', () => {
      const proc = createTestProcess({
        steps: [{ id: 's1', name: 'Step', inputs: [], outputs: [], checks: [], status: 'completed' }],
        evidence: [{ type: 'note', value: 'done', timestamp: '' }]
      });
      
      const config: QualityGatesConfig = { ...defaultGatesConfig, failOnWarning: true };
      const result = runGates(proc, config);
      
      expect(result.passed).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('skips disabled gates', () => {
      const proc = createTestProcess();
      const config: QualityGatesConfig = {
        enabled: true,
        failOnWarning: false,
        gates: [
          { id: 'has_steps', enabled: false },
          { id: 'has_evidence', enabled: false },
          { id: 'no_pending_missing', enabled: false }
        ]
      };
      
      const result = runGates(proc, config);
      expect(result.passed).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('formatCheckResult', () => {
    it('formats passing result', () => {
      const result = {
        passed: true,
        errors: [],
        warnings: [],
        exitCode: 0
      };
      
      const formatted = formatCheckResult(result);
      expect(formatted).toContain('✅');
      expect(formatted).toContain('passed');
    });

    it('formats failing result with errors', () => {
      const gate = getGate('has_steps')!;
      const result = {
        passed: false,
        errors: [{ gate, passed: false, message: 'No steps', severity: 'error' as const }],
        warnings: [],
        exitCode: 1
      };
      
      const formatted = formatCheckResult(result);
      expect(formatted).toContain('❌');
      expect(formatted).toContain('Errors:');
      expect(formatted).toContain('has_steps');
    });

    it('formats warnings', () => {
      const gate = getGate('has_evidence')!;
      const result = {
        passed: true,
        errors: [],
        warnings: [{ gate, passed: false, message: 'No evidence', severity: 'warning' as const }],
        exitCode: 0
      };
      
      const formatted = formatCheckResult(result);
      expect(formatted).toContain('Warnings:');
      expect(formatted).toContain('has_evidence');
    });
  });
});
