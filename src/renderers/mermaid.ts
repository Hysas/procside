import type { Process, Step } from '../types/index.js';

function escapeMermaidLabel(label: string): string {
  return label.replace(/"/g, "'");
}

function getStepShape(step: Step): string {
  switch (step.status) {
    case 'completed':
      return '[%s]';
    case 'in_progress':
      return '([%s])';
    case 'failed':
      return '[[%s]]';
    case 'skipped':
      return '(%s)';
    default:
      return '[%s]';
  }
}

export function renderMermaid(proc: Process): string {
  const lines: string[] = [];
  
  lines.push('flowchart TD');
  lines.push('');
  
  lines.push(`  subgraph Process["${escapeMermaidLabel(proc.name)}"]`);
  lines.push(`    direction TB`);
  lines.push('');
  
  if (proc.steps.length === 0) {
    lines.push('    empty["No steps defined"]');
  } else {
    proc.steps.forEach((step, i) => {
      const safeId = step.id.replace(/[^a-zA-Z0-9]/g, '_');
      const statusEmoji = getStatusEmoji(step.status);
      const label = escapeMermaidLabel(`${statusEmoji} ${step.name}`);
      
      lines.push(`    ${safeId}["${label}"]`);
    });
    
    lines.push('');
    
    for (let i = 0; i < proc.steps.length - 1; i++) {
      const currentId = proc.steps[i].id.replace(/[^a-zA-Z0-9]/g, '_');
      const nextId = proc.steps[i + 1].id.replace(/[^a-zA-Z0-9]/g, '_');
      
      const edgeStyle = proc.steps[i].status === 'completed' ? '-->' : '-.->';
      lines.push(`    ${currentId} ${edgeStyle} ${nextId}`);
    }
  }
  
  lines.push('  end');
  lines.push('');
  
  lines.push('  %% Styles');
  lines.push('  classDef completed fill:#d4edda,stroke:#28a745,color:#155724');
  lines.push('  classDef inProgress fill:#fff3cd,stroke:#ffc107,color:#856404');
  lines.push('  classDef pending fill:#f8f9fa,stroke:#6c757d,color:#495057');
  lines.push('  classDef failed fill:#f8d7da,stroke:#dc3545,color:#721c24');
  lines.push('');
  
  proc.steps.forEach(step => {
    const safeId = step.id.replace(/[^a-zA-Z0-9]/g, '_');
    const styleClass = getStyleClass(step.status);
    lines.push(`  class ${safeId} ${styleClass}`);
  });
  
  return lines.join('\n');
}

function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    completed: '✅',
    in_progress: '🔄',
    pending: '⏳',
    failed: '❌',
    skipped: '⏭️',
    blocked: '🚫'
  };
  return emojis[status] || '📋';
}

function getStyleClass(status: string): string {
  const classes: Record<string, string> = {
    completed: 'completed',
    in_progress: 'inProgress',
    pending: 'pending',
    failed: 'failed',
    skipped: 'pending',
    blocked: 'pending'
  };
  return classes[status] || 'pending';
}

export function renderMermaidSimple(proc: Process): string {
  const lines: string[] = [];
  
  lines.push('```mermaid');
  lines.push('flowchart LR');
  
  proc.steps.forEach((step, i) => {
    const safeId = `s${i}`;
    const emoji = getStatusEmoji(step.status);
    const label = escapeMermaidLabel(`${emoji} ${step.name}`);
    lines.push(`  ${safeId}["${label}"]`);
  });
  
  for (let i = 0; i < proc.steps.length - 1; i++) {
    lines.push(`  s${i} --> s${i + 1}`);
  }
  
  lines.push('```');
  
  return lines.join('\n');
}
