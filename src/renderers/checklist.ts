import type { Process } from '../types/index.js';

export function renderChecklist(proc: Process): string {
  const lines: string[] = [];
  
  lines.push('# Process Checklist');
  lines.push('');
  lines.push(`Process: **${proc.name}**`);
  lines.push('');
  
  if (proc.steps.length > 0) {
    lines.push('## Steps');
    lines.push('');
    proc.steps.forEach(step => {
      const checkbox = step.status === 'completed' ? '[x]' : '[ ]';
      lines.push(`- ${checkbox} ${step.name}`);
      
      if (step.checks.length > 0) {
        step.checks.forEach((check: string) => {
          lines.push(`  - [ ] ${check}`);
        });
      }
    });
    lines.push('');
  }
  
  if (proc.decisions.length > 0) {
    lines.push('## Decisions Made');
    lines.push('');
    proc.decisions.forEach(d => {
      lines.push(`- [x] ${d.question} → **${d.choice}**`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}
