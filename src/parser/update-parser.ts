import type { ProcessUpdate, ProcessAction, Evidence } from '../types/index.js';

const UPDATE_START = '[PROCESS_UPDATE]';
const UPDATE_END = '[/PROCESS_UPDATE]';

interface ParsedUpdate {
  processId?: string;
  action?: ProcessAction;
  stepId?: string;
  status?: string;
  outputs?: string[];
  evidence?: Evidence[];
  decision?: {
    id?: string;
    question?: string;
    choice?: string;
    rationale?: string;
    options?: string[];
  };
  risk?: {
    id?: string;
    risk?: string;
    impact?: 'low' | 'medium' | 'high';
    mitigation?: string;
  };
  step?: {
    id?: string;
    name?: string;
    description?: string;
    inputs?: string[];
    outputs?: string[];
    checks?: string[];
    status?: string;
  };
  missing?: string[];
}

export function extractUpdateBlocks(text: string): string[] {
  const blocks: string[] = [];
  let startIndex = 0;
  
  while (true) {
    const start = text.indexOf(UPDATE_START, startIndex);
    if (start === -1) break;
    
    const end = text.indexOf(UPDATE_END, start);
    if (end === -1) break;
    
    blocks.push(text.slice(start + UPDATE_START.length, end).trim());
    startIndex = end + UPDATE_END.length;
  }
  
  return blocks;
}

export function parseUpdateBlock(block: string): ParsedUpdate {
  const result: ParsedUpdate = {};
  const lines = block.split('\n');
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;
  let inNestedBlock = false;
  let nestedIndent = 0;
  let inNestedList = false;
  let nestedListIndent = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const lineIndent = line.length - line.trimStart().length;
    
    if (inNestedList && lineIndent < nestedListIndent) {
      inNestedList = false;
    }
    
    if (inNestedBlock && lineIndent <= nestedIndent && !trimmed.startsWith('-')) {
      inNestedBlock = false;
      currentKey = null;
    }
    
    if (trimmed.startsWith('- ') && currentArray !== null) {
      currentArray.push(trimmed.slice(2));
      continue;
    }
    
    if (inNestedList && currentKey === 'evidence' && result.evidence) {
      let lineToParse = trimmed;
      if (lineToParse.startsWith('- ')) {
        lineToParse = lineToParse.slice(2);
      }
      const colonIdx = lineToParse.indexOf(':');
      if (colonIdx !== -1) {
        const k = lineToParse.slice(0, colonIdx).trim();
        const v = lineToParse.slice(colonIdx + 1).trim();
        if (k === 'type') {
          result.evidence.push({ type: v as Evidence['type'], value: '', timestamp: '' });
        } else if (k === 'value') {
          const last = result.evidence[result.evidence.length - 1];
          if (last) last.value = v;
        }
      }
      continue;
    }
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    
    if (inNestedBlock) {
      if (currentKey === 'step' && result.step) {
        if (key === 'id') result.step.id = value;
        else if (key === 'name') result.step.name = value;
        else if (key === 'description') result.step.description = value;
        else if (key === 'inputs') {
          result.step.inputs = [];
          currentArray = result.step.inputs;
        }
        else if (key === 'outputs') {
          result.step.outputs = [];
          currentArray = result.step.outputs;
        }
        else if (key === 'checks') {
          result.step.checks = [];
          currentArray = result.step.checks;
        }
      } else if (currentKey === 'decision' && result.decision) {
        if (key === 'question') result.decision.question = value;
        else if (key === 'choice') result.decision.choice = value;
        else if (key === 'rationale') result.decision.rationale = value;
        else if (key === 'options') {
          result.decision.options = value.split(',').map(s => s.trim());
        }
      } else if (currentKey === 'risk' && result.risk) {
        if (key === 'risk') result.risk.risk = value;
        else if (key === 'impact') result.risk.impact = value as 'low' | 'medium' | 'high';
        else if (key === 'mitigation') result.risk.mitigation = value;
      }
      continue;
    }
    
    switch (key) {
      case 'process_id':
        result.processId = value;
        break;
      case 'action':
        result.action = value as ProcessAction;
        break;
      case 'step_id':
        result.stepId = value;
        break;
      case 'status':
        result.status = value;
        break;
      case 'outputs':
        currentKey = 'outputs';
        currentArray = result.outputs = [];
        break;
      case 'missing':
        currentKey = 'missing';
        currentArray = result.missing = [];
        break;
      case 'evidence':
        currentKey = 'evidence';
        result.evidence = [];
        currentArray = null;
        inNestedList = true;
        nestedListIndent = lineIndent;
        break;
      case 'decision':
        currentKey = 'decision';
        result.decision = {};
        currentArray = null;
        inNestedBlock = true;
        nestedIndent = lineIndent;
        break;
      case 'risk':
        currentKey = 'risk';
        result.risk = {};
        currentArray = null;
        inNestedBlock = true;
        nestedIndent = lineIndent;
        break;
      case 'step':
        currentKey = 'step';
        result.step = {};
        currentArray = null;
        inNestedBlock = true;
        nestedIndent = lineIndent;
        break;
    }
  }
  
  return result;
}

export function parseAllUpdates(text: string): ProcessUpdate[] {
  const blocks = extractUpdateBlocks(text);
  return blocks.map(block => {
    const parsed = parseUpdateBlock(block);
    return convertToProcessUpdate(parsed);
  });
}

function convertToProcessUpdate(parsed: ParsedUpdate): ProcessUpdate {
  const update: ProcessUpdate = {
    processId: parsed.processId,
    action: parsed.action || 'process_update',
    stepId: parsed.stepId,
    status: parsed.status as any,
    outputs: parsed.outputs,
    missing: parsed.missing
  };
  
  if (parsed.evidence) {
    update.evidence = parsed.evidence.map(e => ({
      ...e,
      timestamp: new Date().toISOString()
    }));
  }
  
  if (parsed.decision) {
    update.decision = parsed.decision;
  }
  
  if (parsed.risk) {
    update.risk = parsed.risk;
  }
  
  return update;
}

export function formatUpdateBlock(update: ProcessUpdate): string {
  const lines = [UPDATE_START];
  
  if (update.processId) lines.push(`process_id: ${update.processId}`);
  lines.push(`action: ${update.action}`);
  if (update.stepId) lines.push(`step_id: ${update.stepId}`);
  if (update.status) lines.push(`status: ${update.status}`);
  
  if (update.outputs && update.outputs.length > 0) {
    lines.push('outputs:');
    update.outputs.forEach(o => lines.push(`  - ${o}`));
  }
  
  if (update.evidence && update.evidence.length > 0) {
    lines.push('evidence:');
    update.evidence.forEach(e => {
      lines.push(`  - type: ${e.type}`);
      lines.push(`    value: ${e.value}`);
    });
  }
  
  if (update.decision) {
    lines.push('decision:');
    if (update.decision.question) lines.push(`  question: ${update.decision.question}`);
    if (update.decision.choice) lines.push(`  choice: ${update.decision.choice}`);
    if (update.decision.rationale) lines.push(`  rationale: ${update.decision.rationale}`);
  }
  
  if (update.risk) {
    lines.push('risk:');
    if (update.risk.risk) lines.push(`  risk: ${update.risk.risk}`);
    if (update.risk.impact) lines.push(`  impact: ${update.risk.impact}`);
    if (update.risk.mitigation) lines.push(`  mitigation: ${update.risk.mitigation}`);
  }
  
  if (update.missing && update.missing.length > 0) {
    lines.push('missing:');
    update.missing.forEach(m => lines.push(`  - ${m}`));
  }
  
  lines.push(UPDATE_END);
  return lines.join('\n');
}
