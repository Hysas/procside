import { getActiveProcess, loadRegistry, needsMigration, migrateFromSingleProcess } from '../../storage/index.js';
import type { Process, Step, Decision, Risk } from '../../types/index.js';
import logger from '../../logger.js';

const STATUS_ICONS: Record<string, string> = {
  planned: '📋',
  in_progress: '🔄',
  blocked: '🚫',
  completed: '✅',
  cancelled: '❌',
  pending: '⏳',
  skipped: '⏭️',
  failed: '❗'
};

function getStatusIcon(status: string): string {
  return STATUS_ICONS[status] || '❓';
}

export function status(projectPath: string = process.cwd()): void {
  logger.debug(`status called with projectPath=${projectPath}`);

  // Check if migration is needed
  if (needsMigration(projectPath)) {
    logger.info('Migrating to multi-process format');
    migrateFromSingleProcess(projectPath);
  }

  const proc = getActiveProcess(projectPath);
  if (!proc) {
    logger.warn('No active process');
    console.log('No active process. Run "procside init" first.');
    console.log('Use "procside list" to see all processes.');
    return;
  }

  const registry = loadRegistry(projectPath);
  
  logger.info(`Displaying status for process: ${proc.id} (${proc.status})`);
  
  console.log('\n' + '='.repeat(60));
  console.log(`${getStatusIcon(proc.status)} ${proc.name}`);
  console.log('='.repeat(60));
  console.log(`\nGoal: ${proc.goal}`);
  console.log(`Status: ${proc.status}`);
  console.log(`ID: ${proc.id}`);
  if (proc.template) {
    console.log(`Template: ${proc.template}`);
  }
  console.log(`Active: ${registry.activeProcessId === proc.id ? 'Yes' : 'No'}`);
  
  if (proc.steps.length > 0) {
    console.log('\n--- Steps ---');
    const completedSteps = proc.steps.filter(s => s.status === 'completed').length;
    console.log(`Progress: ${completedSteps}/${proc.steps.length} completed\n`);
    
    proc.steps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${getStatusIcon(step.status)} ${step.name}`);
      if (step.inputs.length > 0) {
        console.log(`     Inputs: ${step.inputs.join(', ')}`);
      }
      if (step.outputs.length > 0) {
        console.log(`     Outputs: ${step.outputs.join(', ')}`);
      }
    });
  }
  
  if (proc.decisions.length > 0) {
    console.log('\n--- Decisions ---');
    proc.decisions.forEach(d => {
      console.log(`  • ${d.question}`);
      console.log(`    → ${d.choice}`);
      if (d.rationale) {
        console.log(`    Rationale: ${d.rationale}`);
      }
    });
  }
  
  if (proc.risks.length > 0) {
    console.log('\n--- Risks ---');
    proc.risks.forEach(r => {
      console.log(`  ${getStatusIcon(r.status)} ${r.risk} (${r.impact})`);
      if (r.mitigation) {
        console.log(`    Mitigation: ${r.mitigation}`);
      }
    });
  }
  
  if (proc.evidence.length > 0) {
    console.log('\n--- Evidence ---');
    proc.evidence.forEach(e => {
      const time = new Date(e.timestamp).toLocaleTimeString();
      console.log(`  • [${e.type}] ${e.value} (${time})`);
    });
  }
  
  const missing = getMissingItems(proc);
  if (missing.length > 0) {
    console.log('\n--- What\'s Missing ---');
    missing.forEach(m => {
      console.log(`  [ ] ${m}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

export function getMissingItems(proc: Process): string[] {
  const missing: string[] = [];
  
  const hasOutputs = proc.steps.some(s => s.outputs.length > 0);
  const hasEvidence = proc.evidence.length > 0;
  const hasDecisions = proc.decisions.length > 0;
  const hasRisks = proc.risks.length > 0;
  
  if (!hasOutputs && proc.steps.length > 0) {
    missing.push('No step outputs documented');
  }
  
  if (!hasEvidence) {
    missing.push('No evidence recorded');
  }
  
  if (!hasDecisions && proc.status !== 'planned') {
    missing.push('No decisions logged');
  }
  
  if (!hasRisks && proc.status === 'in_progress') {
    missing.push('Risk assessment not done');
  }
  
  const hasRollback = proc.steps.some(s => 
    s.name.toLowerCase().includes('rollback') || 
    s.name.toLowerCase().includes('revert')
  );
  if (!hasRollback && proc.status === 'in_progress') {
    missing.push('No rollback procedure defined');
  }
  
  const hasValidation = proc.steps.some(s => 
    s.name.toLowerCase().includes('test') || 
    s.name.toLowerCase().includes('validate') ||
    s.name.toLowerCase().includes('verify')
  );
  if (!hasValidation && proc.steps.length > 2) {
    missing.push('No validation/testing step');
  }
  
  return missing;
}

export function statusJson(projectPath: string = process.cwd()): object | null {
  logger.debug(`statusJson called with projectPath=${projectPath}`);

  // Check if migration is needed
  if (needsMigration(projectPath)) {
    migrateFromSingleProcess(projectPath);
  }

  const proc = getActiveProcess(projectPath);
  if (!proc) {
    logger.debug('No active process found for JSON status');
    return null;
  }

  const registry = loadRegistry(projectPath);

  logger.info(`Returning JSON status for process: ${proc.id}`);
  
  return {
    ...proc,
    activeProcessId: registry.activeProcessId,
    missing: getMissingItems(proc),
    progress: {
      completed: proc.steps.filter((s: Step) => s.status === 'completed').length,
      total: proc.steps.length
    }
  };
}
