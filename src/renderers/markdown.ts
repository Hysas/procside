import type { Process, Step } from '../types/index.js';

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

function getStatusBadge(status: string): string {
  const badges: Record<string, string> = {
    planned: '📋 Planned',
    in_progress: '🔄 In Progress',
    blocked: '🚫 Blocked',
    completed: '✅ Completed',
    cancelled: '❌ Cancelled',
    pending: '⏳ Pending',
    skipped: '⏭️ Skipped',
    failed: '❗ Failed'
  };
  return badges[status] || status;
}

export function renderMarkdown(proc: Process, missing: string[] = []): string {
  const lines: string[] = [];
  
  lines.push(`# Process: ${proc.name}`);
  lines.push('');
  lines.push(`> **Goal:** ${proc.goal}`);
  lines.push(`> **Status:** ${getStatusBadge(proc.status)}`);
  lines.push(`> **ID:** \`${proc.id}\``);
  
  if (proc.template) {
    lines.push(`> **Template:** ${proc.template}`);
  }
  lines.push('');
  
  const completedSteps = proc.steps.filter(s => s.status === 'completed').length;
  if (proc.steps.length > 0) {
    lines.push(`**Progress:** ${completedSteps}/${proc.steps.length} steps completed`);
    lines.push('');
  }
  
  if (proc.steps.length > 0) {
    lines.push('## Steps');
    lines.push('');
    lines.push('| # | Step | Status | Inputs | Outputs |');
    lines.push('|---|------|--------|--------|---------|');
    
    proc.steps.forEach((step, i) => {
      const icon = getStatusIcon(step.status);
      const inputs = step.inputs.length > 0 ? step.inputs.join(', ') : '-';
      const outputs = step.outputs.length > 0 ? step.outputs.join(', ') : '-';
      lines.push(`| ${i + 1} | ${step.name} | ${icon} | ${inputs} | ${outputs} |`);
    });
    lines.push('');
  }
  
  if (proc.decisions.length > 0) {
    lines.push('## Decisions');
    lines.push('');
    lines.push('| Decision | Choice | Rationale |');
    lines.push('|----------|--------|-----------|');
    
    proc.decisions.forEach(d => {
      const rationale = d.rationale.length > 50 ? d.rationale.slice(0, 47) + '...' : d.rationale;
      lines.push(`| ${d.question} | ${d.choice} | ${rationale} |`);
    });
    lines.push('');
  }
  
  if (proc.risks.length > 0) {
    lines.push('## Risks');
    lines.push('');
    lines.push('| Risk | Impact | Mitigation | Status |');
    lines.push('|------|--------|------------|--------|');
    
    proc.risks.forEach(r => {
      const mitigation = r.mitigation.length > 40 ? r.mitigation.slice(0, 37) + '...' : r.mitigation;
      lines.push(`| ${r.risk} | ${r.impact} | ${mitigation} | ${getStatusIcon(r.status)} |`);
    });
    lines.push('');
  }
  
  if (proc.evidence.length > 0) {
    lines.push('## Evidence');
    lines.push('');
    proc.evidence.forEach(e => {
      const time = new Date(e.timestamp).toLocaleString();
      lines.push(`- **[${e.type}]** ${e.value} _(${time})_`);
    });
    lines.push('');
  }
  
  if (missing.length > 0) {
    lines.push('## What\'s Missing');
    lines.push('');
    missing.forEach(m => {
      lines.push(`- [ ] ${m}`);
    });
    lines.push('');
  }
  
  lines.push('---');
  lines.push(`_Last updated: ${new Date().toLocaleString()}_`);
  lines.push('');
  
  return lines.join('\n');
}
