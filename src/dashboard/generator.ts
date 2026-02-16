import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Process, Step, Evidence, Decision, Risk } from '../types/index.js';
import type { QualityGatesConfig } from '../types/config.js';
import { loadProcess } from '../storage/index.js';
import { getMissingItems } from '../cli/commands/status.js';
import { renderMermaid } from '../renderers/mermaid.js';
import { runGates } from '../quality-gates.js';
import { DEFAULT_CONFIG } from '../types/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_PATH = path.join(__dirname, 'templates', 'dashboard.html');

export function generateDashboard(proc: Process, projectPath: string, gatesConfig?: QualityGatesConfig): string {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const config = gatesConfig || DEFAULT_CONFIG.qualityGates;
  
  const completedSteps = proc.steps.filter(s => s.status === 'completed').length;
  const totalSteps = proc.steps.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  
  const data: Record<string, string> = {
    processName: escapeHtml(proc.name),
    processGoal: escapeHtml(proc.goal),
    processStatus: proc.status.toUpperCase(),
    statusClass: getStatusClass(proc.status),
    completedSteps: String(completedSteps),
    totalSteps: String(totalSteps),
    progressPercent: String(progressPercent),
    mermaidDiagram: renderMermaid(proc),
    stepsHtml: renderStepsHtml(proc.steps),
    evidenceHtml: renderEvidenceHtml(proc.evidence),
    decisionsHtml: renderDecisionsHtml(proc.decisions),
    risksHtml: renderRisksHtml(proc.risks),
    gatesHtml: renderGatesHtml(proc, config),
    missingHtml: renderMissingHtml(proc),
    lastUpdated: new Date().toLocaleString()
  };
  
  let html = template;
  for (const [key, value] of Object.entries(data)) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    planned: 'bg-gray-600 text-gray-100',
    in_progress: 'bg-blue-600 text-white',
    completed: 'bg-green-600 text-white',
    blocked: 'bg-yellow-600 text-white',
    cancelled: 'bg-red-600 text-white'
  };
  return classes[status] || 'bg-gray-600 text-gray-100';
}

function renderStepsHtml(steps: Step[]): string {
  if (steps.length === 0) {
    return '<p class="text-gray-400 text-sm">No steps defined</p>';
  }
  
  return steps.map((step, i) => {
    const statusIcon = getStepIcon(step.status);
    const statusClass = `step-${step.status}`;
    const isActive = step.status === 'in_progress' ? 'pulse-active' : '';
    
    const outputsHtml = step.outputs.length > 0 
      ? `<div class="mt-2 text-xs text-gray-400">Outputs: ${step.outputs.map(o => escapeHtml(o)).join(', ')}</div>`
      : '';
    
    return `
      <div class="border-l-4 pl-4 py-3 ${statusClass} ${isActive} rounded-r transition-all duration-300">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-xl">${statusIcon}</span>
            <div>
              <div class="font-medium">${escapeHtml(step.name)}</div>
              ${step.description ? `<div class="text-sm text-gray-400">${escapeHtml(step.description)}</div>` : ''}
            </div>
          </div>
          <span class="text-xs text-gray-500 uppercase">${step.status}</span>
        </div>
        ${outputsHtml}
      </div>
    `;
  }).join('');
}

function getStepIcon(status: string): string {
  const icons: Record<string, string> = {
    pending: '⏳',
    in_progress: '🔄',
    completed: '✅',
    failed: '❌',
    skipped: '⏭️'
  };
  return icons[status] || '📋';
}

function renderEvidenceHtml(evidence: Evidence[]): string {
  if (evidence.length === 0) {
    return '<p class="text-gray-400 text-sm">No evidence recorded</p>';
  }
  
  const typeIcons: Record<string, string> = {
    command: '⚡',
    file: '📄',
    url: '🔗',
    note: '📝'
  };
  
  return evidence.slice().reverse().map(e => {
    const icon = typeIcons[e.type] || '📌';
    const time = new Date(e.timestamp).toLocaleTimeString();
    return `
      <div class="flex items-start gap-2 p-2 bg-gray-700/50 rounded text-sm">
        <span>${icon}</span>
        <div class="flex-1 min-w-0">
          <span class="text-gray-300 truncate">${escapeHtml(e.value)}</span>
          <span class="text-gray-500 text-xs ml-2">${time}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderDecisionsHtml(decisions: Decision[]): string {
  if (decisions.length === 0) {
    return '<p class="text-gray-400 text-sm">No decisions recorded</p>';
  }
  
  return decisions.map(d => {
    return `
      <div class="bg-gray-700/50 rounded p-3">
        <div class="text-sm font-medium text-gray-200">${escapeHtml(d.question)}</div>
        <div class="mt-1 text-blue-400 font-medium">→ ${escapeHtml(d.choice)}</div>
        ${d.rationale ? `<div class="mt-1 text-xs text-gray-400">${escapeHtml(d.rationale)}</div>` : ''}
      </div>
    `;
  }).join('');
}

function renderRisksHtml(risks: Risk[]): string {
  if (risks.length === 0) {
    return '<p class="text-gray-400 text-sm">No risks identified</p>';
  }
  
  const impactColors: Record<string, string> = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-red-400'
  };
  
  return risks.map(r => {
    const color = impactColors[r.impact] || 'text-gray-400';
    return `
      <div class="bg-gray-700/50 rounded p-3">
        <div class="flex items-center justify-between">
          <span class="text-sm">${escapeHtml(r.risk)}</span>
          <span class="text-xs ${color} uppercase font-medium">${r.impact}</span>
        </div>
        ${r.mitigation ? `<div class="mt-1 text-xs text-gray-400">Mitigation: ${escapeHtml(r.mitigation)}</div>` : ''}
      </div>
    `;
  }).join('');
}

function renderGatesHtml(proc: Process, config: QualityGatesConfig): string {
  const result = runGates(proc, config);
  
  if (result.errors.length === 0 && result.warnings.length === 0) {
    return '<div class="text-green-400 text-sm">✅ All gates passed</div>';
  }
  
  let html = '';
  
  result.errors.forEach(e => {
    html += `
      <div class="flex items-center gap-2 p-2 bg-red-900/30 rounded text-sm">
        <span>❌</span>
        <span>${escapeHtml(e.message)}</span>
      </div>
    `;
  });
  
  result.warnings.forEach(w => {
    html += `
      <div class="flex items-center gap-2 p-2 bg-yellow-900/30 rounded text-sm">
        <span>⚠️</span>
        <span>${escapeHtml(w.message)}</span>
      </div>
    `;
  });
  
  return html;
}

function renderMissingHtml(proc: Process): string {
  const missing = getMissingItems(proc);
  
  if (missing.length === 0) {
    return '<div class="text-green-400 text-sm">✅ Nothing missing</div>';
  }
  
  return missing.map(m => {
    return `
      <div class="flex items-center gap-2 text-gray-300">
        <input type="checkbox" disabled class="rounded border-gray-600">
        <span>${escapeHtml(m)}</span>
      </div>
    `;
  }).join('');
}

export function generateAndSave(projectPath: string): string {
  const proc = loadProcess(projectPath);
  if (!proc) {
    throw new Error('No process found');
  }
  
  const html = generateDashboard(proc, projectPath);
  
  const dashboardDir = path.join(projectPath, 'docs');
  if (!fs.existsSync(dashboardDir)) {
    fs.mkdirSync(dashboardDir, { recursive: true });
  }
  
  const outputPath = path.join(dashboardDir, 'dashboard.html');
  fs.writeFileSync(outputPath, html, 'utf-8');
  
  return outputPath;
}
