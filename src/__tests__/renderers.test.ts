import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../renderers/markdown.js';
import { renderMermaid, renderMermaidSimple } from '../renderers/mermaid.js';
import { renderChecklist } from '../renderers/checklist.js';
import type { Process } from '../types/index.js';

const createTestProcess = (): Process => ({
  id: 'test-process',
  name: 'Test Process',
  goal: 'Test goal',
  status: 'in_progress',
  steps: [
    {
      id: 's1',
      name: 'Step 1',
      inputs: ['input1'],
      outputs: ['output1'],
      checks: ['check1'],
      status: 'completed'
    },
    {
      id: 's2',
      name: 'Step 2 (with parens)',
      inputs: [],
      outputs: [],
      checks: [],
      status: 'in_progress'
    },
    {
      id: 's3',
      name: 'Step 3',
      inputs: [],
      outputs: [],
      checks: [],
      status: 'pending'
    }
  ],
  decisions: [
    {
      id: 'd1',
      question: 'Use X or Y?',
      choice: 'X',
      rationale: 'X is better for our use case',
      timestamp: '2025-01-01T00:00:00.000Z'
    }
  ],
  risks: [
    {
      id: 'r1',
      risk: 'Performance issue',
      impact: 'high',
      mitigation: 'Add caching',
      status: 'identified',
      identifiedAt: '2025-01-01T00:00:00.000Z'
    }
  ],
  evidence: [
    {
      type: 'command',
      value: 'npm test',
      timestamp: '2025-01-01T00:00:00.000Z'
    },
    {
      type: 'file',
      value: 'src/index.ts',
      timestamp: '2025-01-01T00:00:00.000Z'
    }
  ],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z'
});

describe('Markdown Renderer', () => {
  it('renders process name and goal', () => {
    const proc = createTestProcess();
    const md = renderMarkdown(proc);
    
    expect(md).toContain('# Process: Test Process');
    expect(md).toContain('Test goal');
  });

  it('renders status badge', () => {
    const proc = createTestProcess();
    const md = renderMarkdown(proc);
    
    expect(md).toContain('In Progress');
  });

  it('renders steps table', () => {
    const proc = createTestProcess();
    const md = renderMarkdown(proc);
    
    expect(md).toContain('## Steps');
    expect(md).toContain('Step 1');
    expect(md).toContain('Step 2');
    expect(md).toContain('Step 3');
    expect(md).toContain('input1');
    expect(md).toContain('output1');
  });

  it('renders progress indicator', () => {
    const proc = createTestProcess();
    const md = renderMarkdown(proc);
    
    expect(md).toContain('1/3 steps completed');
  });

  it('renders decisions table', () => {
    const proc = createTestProcess();
    const md = renderMarkdown(proc);
    
    expect(md).toContain('## Decisions');
    expect(md).toContain('Use X or Y?');
    expect(md).toContain('X');
  });

  it('renders risks table', () => {
    const proc = createTestProcess();
    const md = renderMarkdown(proc);
    
    expect(md).toContain('## Risks');
    expect(md).toContain('Performance issue');
    expect(md).toContain('high');
  });

  it('renders evidence list', () => {
    const proc = createTestProcess();
    const md = renderMarkdown(proc);
    
    expect(md).toContain('## Evidence');
    expect(md).toContain('[command]');
    expect(md).toContain('npm test');
    expect(md).toContain('[file]');
    expect(md).toContain('src/index.ts');
  });

  it('renders missing items', () => {
    const proc = createTestProcess();
    const missing = ['No rollback plan', 'Missing tests'];
    const md = renderMarkdown(proc, missing);
    
    expect(md).toContain("## What's Missing");
    expect(md).toContain('No rollback plan');
    expect(md).toContain('Missing tests');
  });
});

describe('Mermaid Renderer', () => {
  it('renders flowchart structure', () => {
    const proc = createTestProcess();
    const mmd = renderMermaid(proc);
    
    expect(mmd).toContain('flowchart TD');
    expect(mmd).toContain('subgraph Process');
  });

  it('renders all steps as nodes', () => {
    const proc = createTestProcess();
    const mmd = renderMermaid(proc);
    
    expect(mmd).toContain('s1');
    expect(mmd).toContain('s2');
    expect(mmd).toContain('s3');
    expect(mmd).toContain('Step 1');
    expect(mmd).toContain('Step 2');
  });

  it('escapes parentheses in labels', () => {
    const proc = createTestProcess();
    const mmd = renderMermaid(proc);
    
    expect(mmd).toContain('["');
    expect(mmd).toContain('Step 2 (with parens)');
  });

  it('renders edges between steps', () => {
    const proc = createTestProcess();
    const mmd = renderMermaid(proc);
    
    expect(mmd).toContain('s1 --> s2');
    expect(mmd).toContain('s2 -.-> s3');
  });

  it('renders style definitions', () => {
    const proc = createTestProcess();
    const mmd = renderMermaid(proc);
    
    expect(mmd).toContain('classDef completed');
    expect(mmd).toContain('classDef inProgress');
    expect(mmd).toContain('classDef pending');
  });

  it('applies correct classes to steps', () => {
    const proc = createTestProcess();
    const mmd = renderMermaid(proc);
    
    expect(mmd).toContain('class s1 completed');
    expect(mmd).toContain('class s2 inProgress');
    expect(mmd).toContain('class s3 pending');
  });

  it('renders empty process gracefully', () => {
    const proc: Process = {
      id: 'empty',
      name: 'Empty',
      goal: 'Nothing',
      status: 'planned',
      steps: [],
      decisions: [],
      risks: [],
      evidence: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    };
    
    const mmd = renderMermaid(proc);
    expect(mmd).toContain('No steps defined');
  });
});

describe('Mermaid Simple Renderer', () => {
  it('renders simple flowchart', () => {
    const proc = createTestProcess();
    const mmd = renderMermaidSimple(proc);
    
    expect(mmd).toContain('```mermaid');
    expect(mmd).toContain('flowchart LR');
    expect(mmd).toContain('s0');
    expect(mmd).toContain('s1');
    expect(mmd).toContain('s0 --> s1');
  });
});

describe('Checklist Renderer', () => {
  it('renders process name', () => {
    const proc = createTestProcess();
    const checklist = renderChecklist(proc);
    
    expect(checklist).toContain('# Process Checklist');
    expect(checklist).toContain('Test Process');
  });

  it('renders completed steps as checked', () => {
    const proc = createTestProcess();
    const checklist = renderChecklist(proc);
    
    expect(checklist).toContain('[x] Step 1');
  });

  it('renders pending steps as unchecked', () => {
    const proc = createTestProcess();
    const checklist = renderChecklist(proc);
    
    expect(checklist).toContain('[ ] Step 2');
    expect(checklist).toContain('[ ] Step 3');
  });

  it('renders step checks', () => {
    const proc = createTestProcess();
    const checklist = renderChecklist(proc);
    
    expect(checklist).toContain('check1');
  });

  it('renders decisions', () => {
    const proc = createTestProcess();
    const checklist = renderChecklist(proc);
    
    expect(checklist).toContain('## Decisions Made');
    expect(checklist).toContain('Use X or Y?');
    expect(checklist).toContain('X');
  });
});
