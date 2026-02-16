import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { generateDashboard } from '../dashboard/generator.js';
import { createServer, startWatcher, stopWatcher } from '../dashboard/server.js';
import type { Process } from '../types/index.js';

const TEST_DIR = path.join(process.cwd(), '.test-dashboard');
const AI_DIR = path.join(TEST_DIR, '.ai');

function createTestProcess(): Process {
  return {
    id: 'test-process',
    name: 'Test Process',
    goal: 'Test the dashboard functionality',
    status: 'in_progress',
    steps: [
      { id: 's1', name: 'Setup', inputs: [], outputs: ['config.yaml'], checks: [], status: 'completed' },
      { id: 's2', name: 'Implementation', inputs: ['config.yaml'], outputs: [], checks: ['tests pass'], status: 'in_progress' },
      { id: 's3', name: 'Deploy', inputs: [], outputs: [], checks: [], status: 'pending' }
    ],
    decisions: [
      { id: 'd1', question: 'Which framework?', choice: 'Express', rationale: 'Simple and widely used', timestamp: new Date().toISOString() }
    ],
    risks: [
      { id: 'r1', risk: 'Performance issues', impact: 'medium', mitigation: '', status: 'identified', identifiedAt: new Date().toISOString() }
    ],
    evidence: [
      { type: 'command', value: 'npm test', timestamp: new Date().toISOString() },
      { type: 'file', value: 'src/index.ts', timestamp: new Date().toISOString() }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

describe('Dashboard Generator', () => {
  let testProcess: Process;

  beforeEach(() => {
    testProcess = createTestProcess();
  });

  describe('generateDashboard', () => {
    it('should generate HTML with process name', () => {
      const html = generateDashboard(testProcess, TEST_DIR);
      expect(html).toContain('Test Process');
    });

    it('should generate HTML with process goal', () => {
      const html = generateDashboard(testProcess, TEST_DIR);
      expect(html).toContain('Test the dashboard functionality');
    });

    it('should include progress calculation', () => {
      const html = generateDashboard(testProcess, TEST_DIR);
      expect(html).toContain('1'); // completed steps
      expect(html).toContain('3'); // total steps
    });

    it('should render steps with status icons', () => {
      const html = generateDashboard(testProcess, TEST_DIR);
      expect(html).toContain('Setup');
      expect(html).toContain('Implementation');
      expect(html).toContain('Deploy');
      expect(html).toContain('completed');
      expect(html).toContain('in_progress');
      expect(html).toContain('pending');
    });

    it('should render evidence items', () => {
      const html = generateDashboard(testProcess, TEST_DIR);
      expect(html).toContain('npm test');
      expect(html).toContain('src/index.ts');
    });

    it('should render decisions', () => {
      const html = generateDashboard(testProcess, TEST_DIR);
      expect(html).toContain('Which framework?');
      expect(html).toContain('Express');
    });

    it('should render risks', () => {
      const html = generateDashboard(testProcess, TEST_DIR);
      expect(html).toContain('Performance issues');
    });

    it('should include Mermaid diagram', () => {
      const html = generateDashboard(testProcess, TEST_DIR);
      expect(html).toContain('flowchart TD');
      expect(html).toContain('s1');
    });

    it('should escape HTML in process name', () => {
      testProcess.name = '<script>alert("xss")</script>';
      const html = generateDashboard(testProcess, TEST_DIR);
      expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should handle empty process', () => {
      const emptyProcess: Process = {
        id: 'empty',
        name: 'Empty Process',
        goal: '',
        status: 'planned',
        steps: [],
        decisions: [],
        risks: [],
        evidence: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const html = generateDashboard(emptyProcess, TEST_DIR);
      expect(html).toContain('Empty Process');
      expect(html).toContain('No steps defined');
    });
  });
});

describe('Dashboard Server', () => {
  describe('createServer', () => {
    it('should create an HTTP server', () => {
      const server = createServer({ projectPath: TEST_DIR });
      expect(server).toBeDefined();
      expect(typeof server.listen).toBe('function');
      server.close();
    });
  });

  describe('startWatcher and stopWatcher', () => {
    it('should start and stop watcher without error', () => {
      expect(() => startWatcher(TEST_DIR)).not.toThrow();
      expect(() => stopWatcher()).not.toThrow();
    });
  });
});
