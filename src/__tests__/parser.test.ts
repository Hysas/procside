import { describe, it, expect } from 'vitest';
import { 
  extractUpdateBlocks, 
  parseUpdateBlock, 
  parseAllUpdates,
  formatUpdateBlock 
} from '../parser/update-parser.js';

describe('Update Parser', () => {
  describe('extractUpdateBlocks', () => {
    it('extracts single update block', () => {
      const text = `
Some text before
[PROCESS_UPDATE]
action: step_complete
step_id: s1
[/PROCESS_UPDATE]
Some text after
`;
      
      const blocks = extractUpdateBlocks(text);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toContain('action: step_complete');
    });

    it('extracts multiple update blocks', () => {
      const text = `
[PROCESS_UPDATE]
action: step_start
step_id: s1
[/PROCESS_UPDATE]

Some output here

[PROCESS_UPDATE]
action: step_complete
step_id: s1
outputs:
  - file.ts
[/PROCESS_UPDATE]
`;
      
      const blocks = extractUpdateBlocks(text);
      expect(blocks.length).toBe(2);
    });

    it('returns empty array when no blocks found', () => {
      const text = 'No update blocks here';
      const blocks = extractUpdateBlocks(text);
      expect(blocks.length).toBe(0);
    });
  });

  describe('parseUpdateBlock', () => {
    it('parses process_update action', () => {
      const block = `
action: process_update
status: in_progress
`;
      
      const result = parseUpdateBlock(block);
      expect(result.action).toBe('process_update');
      expect(result.status).toBe('in_progress');
    });

    it('parses step_add action', () => {
      const block = `
action: step_add
step:
  id: s1
  name: Test Step
  inputs:
    - input1
  checks:
    - check1
`;
      
      const result = parseUpdateBlock(block);
      expect(result.action).toBe('step_add');
      expect(result.step?.id).toBe('s1');
      expect(result.step?.name).toBe('Test Step');
      expect(result.step?.inputs).toEqual(['input1']);
    });

    it('parses step_complete with outputs', () => {
      const block = `
action: step_complete
step_id: s1
outputs:
  - file1.ts
  - file2.ts
`;
      
      const result = parseUpdateBlock(block);
      expect(result.action).toBe('step_complete');
      expect(result.stepId).toBe('s1');
      expect(result.outputs).toEqual(['file1.ts', 'file2.ts']);
    });

    it('parses decision action', () => {
      const block = `
action: decision
decision:
  question: Use A or B?
  choice: A
  rationale: A is better
`;
      
      const result = parseUpdateBlock(block);
      expect(result.action).toBe('decision');
      expect(result.decision?.question).toBe('Use A or B?');
      expect(result.decision?.choice).toBe('A');
      expect(result.decision?.rationale).toBe('A is better');
    });

    it('parses risk action', () => {
      const block = `
action: risk
risk:
  risk: Performance issue
  impact: high
  mitigation: Add caching
`;
      
      const result = parseUpdateBlock(block);
      expect(result.action).toBe('risk');
      expect(result.risk?.risk).toBe('Performance issue');
      expect(result.risk?.impact).toBe('high');
    });

    it('parses evidence action', () => {
      const block = `
action: evidence
evidence:
  - type: command
    value: npm test
  - type: file
    value: src/file.ts
`;
      
      const result = parseUpdateBlock(block);
      expect(result.action).toBe('evidence');
      expect(result.evidence?.length).toBe(2);
      expect(result.evidence?.[0]?.type).toBe('command');
      expect(result.evidence?.[0]?.value).toBe('npm test');
      expect(result.evidence?.[1]?.type).toBe('file');
      expect(result.evidence?.[1]?.value).toBe('src/file.ts');
    });

    it('parses missing action', () => {
      const block = `
action: missing
missing:
  - Add tests
  - Update docs
`;
      
      const result = parseUpdateBlock(block);
      expect(result.action).toBe('missing');
      expect(result.missing).toEqual(['Add tests', 'Update docs']);
    });
  });

  describe('parseAllUpdates', () => {
    it('parses complete agent output', () => {
      const text = `
Starting work...

[PROCESS_UPDATE]
action: step_add
step:
  id: s1
  name: Test Step
[/PROCESS_UPDATE]

[PROCESS_UPDATE]
action: step_start
step_id: s1
[/PROCESS_UPDATE]

Working...

[PROCESS_UPDATE]
action: step_complete
step_id: s1
outputs:
  - result.ts
[/PROCESS_UPDATE]

Done!
`;
      
      const updates = parseAllUpdates(text);
      expect(updates.length).toBe(3);
      expect(updates[0].action).toBe('step_add');
      expect(updates[1].action).toBe('step_start');
      expect(updates[2].action).toBe('step_complete');
    });
  });

  describe('formatUpdateBlock', () => {
    it('formats step_complete update', () => {
      const result = formatUpdateBlock({
        action: 'step_complete',
        stepId: 's1',
        outputs: ['file.ts']
      });
      
      expect(result).toContain('[PROCESS_UPDATE]');
      expect(result).toContain('[/PROCESS_UPDATE]');
      expect(result).toContain('action: step_complete');
      expect(result).toContain('step_id: s1');
      expect(result).toContain('file.ts');
    });

    it('formats decision update', () => {
      const result = formatUpdateBlock({
        action: 'decision',
        decision: {
          question: 'X or Y?',
          choice: 'X',
          rationale: 'X is better'
        }
      });
      
      expect(result).toContain('action: decision');
      expect(result).toContain('question: X or Y?');
      expect(result).toContain('choice: X');
    });
  });
});
