import type { Process, Step } from './types/index.js';
import type { QualityGate, QualityGatesConfig, QualityGateConfig } from './types/config.js';
import { getMissingItems } from './cli/commands/status.js';

const ALL_GATES: QualityGate[] = [
  {
    id: 'has_steps',
    name: 'Has Steps',
    description: 'Process must have at least one step defined',
    severity: 'error',
    check: (proc: Process) => ({
      passed: proc.steps.length > 0,
      message: proc.steps.length > 0 
        ? `Process has ${proc.steps.length} step(s)`
        : 'Process has no steps defined'
    })
  },
  {
    id: 'all_steps_completed',
    name: 'All Steps Completed',
    description: 'All steps must be completed',
    severity: 'error',
    check: (proc: Process) => {
      const incomplete = proc.steps.filter((s: Step) => s.status !== 'completed');
      return {
        passed: incomplete.length === 0,
        message: incomplete.length === 0
          ? 'All steps are completed'
          : `${incomplete.length} step(s) not completed: ${incomplete.map((s: Step) => s.name).join(', ')}`
      };
    }
  },
  {
    id: 'has_evidence',
    name: 'Has Evidence',
    description: 'Process must have at least one evidence item',
    severity: 'warning',
    check: (proc: Process) => ({
      passed: proc.evidence.length > 0,
      message: proc.evidence.length > 0
        ? `Process has ${proc.evidence.length} evidence item(s)`
        : 'No evidence recorded'
    })
  },
  {
    id: 'has_decisions',
    name: 'Has Decisions',
    description: 'Process must have at least one decision logged',
    severity: 'warning',
    check: (proc: Process) => ({
      passed: proc.decisions.length > 0,
      message: proc.decisions.length > 0
        ? `Process has ${proc.decisions.length} decision(s)`
        : 'No decisions logged'
    })
  },
  {
    id: 'no_pending_missing',
    name: 'No Pending Missing Items',
    description: 'All missing items should be resolved',
    severity: 'warning',
    check: (proc: Process) => {
      const missing = getMissingItems(proc);
      return {
        passed: missing.length === 0,
        message: missing.length === 0
          ? 'No missing items detected'
          : `${missing.length} missing item(s): ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`
      };
    }
  },
  {
    id: 'has_rollback',
    name: 'Has Rollback Plan',
    description: 'Process should include a rollback step',
    severity: 'warning',
    check: (proc: Process) => {
      const hasRollback = proc.steps.some((s: Step) =>
        s.name.toLowerCase().includes('rollback') ||
        s.name.toLowerCase().includes('revert')
      );
      return {
        passed: hasRollback,
        message: hasRollback
          ? 'Rollback step found'
          : 'No rollback step defined'
      };
    }
  },
  {
    id: 'has_validation',
    name: 'Has Validation Step',
    description: 'Process should include testing/validation',
    severity: 'warning',
    check: (proc: Process) => {
      const hasValidation = proc.steps.some((s: Step) =>
        s.name.toLowerCase().includes('test') ||
        s.name.toLowerCase().includes('validat') ||
        s.name.toLowerCase().includes('verify')
      );
      return {
        passed: hasValidation,
        message: hasValidation
          ? 'Validation step found'
          : 'No validation step defined'
      };
    }
  }
];

export interface GateResult {
  gate: QualityGate;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning';
}

export interface CheckResult {
  passed: boolean;
  errors: GateResult[];
  warnings: GateResult[];
  exitCode: number;
}

export function getGate(id: string): QualityGate | undefined {
  return ALL_GATES.find(g => g.id === id);
}

export function getAllGates(): QualityGate[] {
  return ALL_GATES;
}

export function runGate(proc: Process, gateId: string): GateResult | null {
  const gate = getGate(gateId);
  if (!gate) return null;
  
  const result = gate.check(proc);
  return {
    gate,
    passed: result.passed,
    message: result.message,
    severity: gate.severity
  };
}

export function runGates(proc: Process, config: QualityGatesConfig): CheckResult {
  if (!config.enabled) {
    return { passed: true, errors: [], warnings: [], exitCode: 0 };
  }
  
  const errors: GateResult[] = [];
  const warnings: GateResult[] = [];
  
  for (const gateConfig of config.gates) {
    if (!gateConfig.enabled) continue;
    
    const result = runGate(proc, gateConfig.id);
    if (!result) continue;
    
    const severity = gateConfig.severity || result.severity;
    
    if (!result.passed) {
      if (severity === 'error') {
        errors.push({ ...result, severity: 'error' });
      } else {
        warnings.push({ ...result, severity: 'warning' });
      }
    }
  }
  
  const passed = errors.length === 0 && (!config.failOnWarning || warnings.length === 0);
  const exitCode = passed ? 0 : 1;
  
  return { passed, errors, warnings, exitCode };
}

export function formatCheckResult(result: CheckResult): string {
  const lines: string[] = [];
  
  if (result.passed) {
    lines.push('✅ All quality gates passed');
  } else {
    lines.push('❌ Quality gates failed');
  }
  
  if (result.errors.length > 0) {
    lines.push('\nErrors:');
    result.errors.forEach(e => {
      lines.push(`  ❌ [${e.gate.id}] ${e.message}`);
    });
  }
  
  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    result.warnings.forEach(w => {
      lines.push(`  ⚠️  [${w.gate.id}] ${w.message}`);
    });
  }
  
  return lines.join('\n');
}
