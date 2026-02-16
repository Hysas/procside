import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Process, Step, Evidence, Decision, Risk, ProcessMeta } from '../types/index.js';
import type { QualityGatesConfig } from '../types/config.js';
import { loadProcess, loadProcessById } from '../storage/index.js';
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

export function generateProcessList(processes: ProcessMeta[], activeProcessId: string | null, projectPath: string): string {
  const statusIcons: Record<string, string> = {
    planned: '📋',
    in_progress: '🔄',
    blocked: '🚫',
    completed: '✅',
    cancelled: '❌'
  };

  const processesHtml = processes.map(p => {
    const icon = statusIcons[p.status] || '📋';
    const isActive = p.id === activeProcessId;
    const progressColor = p.progress === 100 ? 'bg-green-500' : p.progress > 0 ? 'bg-blue-500' : 'bg-gray-600';
    
    return `
      <a href="/process/${p.id}" class="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors ${isActive ? 'ring-2 ring-blue-500' : ''}">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">${icon}</span>
            <span class="font-medium text-white">${escapeHtml(p.name)}</span>
            ${isActive ? '<span class="text-xs bg-blue-600 px-2 py-0.5 rounded">Active</span>' : ''}
          </div>
          <span class="text-sm text-gray-400">${p.progress}%</span>
        </div>
        <p class="text-sm text-gray-400 mb-3">${escapeHtml(p.goal)}</p>
        <div class="w-full bg-gray-700 rounded-full h-2">
          <div class="${progressColor} h-2 rounded-full transition-all" style="width: ${p.progress}%"></div>
        </div>
        <div class="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>${p.status}</span>
          <span>Updated: ${new Date(p.updatedAt).toLocaleDateString()}</span>
        </div>
      </a>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>procside - Processes</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
    }
  </script>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen">
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <header class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-white">procside</h1>
        <p class="text-gray-400 text-sm">Process Documentation Dashboard</p>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-sm text-gray-400">${processes.length} process${processes.length !== 1 ? 'es' : ''}</span>
      </div>
    </header>

    <main>
      ${processes.length === 0 
        ? '<div class="text-center py-12"><p class="text-gray-400">No processes found. Run <code class="bg-gray-800 px-2 py-1 rounded">procside init</code> to create one.</p></div>'
        : `<div class="grid gap-4">${processesHtml}</div>`
      }
    </main>

    <script>
      const eventSource = new EventSource('/events');
      eventSource.onmessage = function(event) {
        location.reload();
      };
    </script>
  </div>
</body>
</html>`;
}

export function generateMultiProcessDashboard(
  processes: ProcessMeta[],
  activeProcessId: string | null,
  projectPath: string,
  animationStyle: string = 'fade'
): string {
  const statusIcons: Record<string, string> = {
    planned: '📋',
    in_progress: '🔄',
    blocked: '🚫',
    completed: '✅',
    cancelled: '❌'
  };

  // Load full process data for active process
  const activeProcess = activeProcessId ? loadProcessById(activeProcessId, projectPath) : null;
  const backgroundProcesses = processes.filter(p => p.id !== activeProcessId);
  
  // Generate JSON for client-side rendering
  const processesJson = JSON.stringify(processes.map(meta => {
    const proc = loadProcessById(meta.id, projectPath);
    return proc ? { ...meta, steps: proc.steps, evidence: proc.evidence, decisions: proc.decisions, risks: proc.risks } : meta;
  }));

  // Active process HTML
  let activeHtml = '';
  if (activeProcess) {
    const completedSteps = activeProcess.steps.filter(s => s.status === 'completed').length;
    const totalSteps = activeProcess.steps.length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    
    activeHtml = `
      <div class="bg-gray-800 rounded-xl p-6 shadow-lg active-process process-card">
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-2xl">${statusIcons[activeProcess.status] || '📋'}</span>
              <h2 class="text-xl font-semibold">${escapeHtml(activeProcess.name)}</h2>
              <span class="text-xs text-gray-500 font-mono">${activeProcess.id}</span>
            </div>
            <p class="text-gray-400 text-sm">${escapeHtml(activeProcess.goal)}</p>
          </div>
          <div class="text-right">
            <span class="px-2 py-1 rounded text-xs font-medium ${getStatusClass(activeProcess.status)}">${activeProcess.status}</span>
            <div class="text-xs text-gray-500 mt-1">Updated: ${new Date(activeProcess.updatedAt).toLocaleString()}</div>
          </div>
        </div>
        
        <div class="mb-4">
          <div class="flex justify-between text-sm text-gray-400 mb-1">
            <span>Progress</span>
            <span>${completedSteps}/${totalSteps} steps</span>
          </div>
          <div class="w-full bg-gray-700 rounded-full h-2">
            <div class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full progress-bar" style="width: ${progress}%"></div>
          </div>
        </div>
        
        <div class="mb-4">
          <h3 class="text-sm font-medium text-gray-300 mb-2">Steps</h3>
          <div class="space-y-2">
            ${renderStepsCompact(activeProcess.steps)}
          </div>
        </div>
        
        <div class="grid grid-cols-3 gap-4 mt-4">
          <div>
            <h3 class="text-sm font-medium text-gray-300 mb-2">Evidence (${activeProcess.evidence.length})</h3>
            <div class="text-xs text-gray-400 max-h-32 overflow-y-auto">
              ${activeProcess.evidence.length > 0 ? activeProcess.evidence.slice(-3).map(e => `<div class="truncate">• ${escapeHtml(e.value)}</div>`).join('') : '<div class="text-gray-500">None</div>'}
            </div>
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-300 mb-2">Decisions (${activeProcess.decisions.length})</h3>
            <div class="text-xs text-gray-400 max-h-32 overflow-y-auto">
              ${activeProcess.decisions.length > 0 ? activeProcess.decisions.slice(-3).map(d => `<div class="truncate">• ${escapeHtml(d.choice)}</div>`).join('') : '<div class="text-gray-500">None</div>'}
            </div>
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-300 mb-2">Risks (${activeProcess.risks.length})</h3>
            <div class="text-xs text-gray-400 max-h-32 overflow-y-auto">
              ${activeProcess.risks.length > 0 ? activeProcess.risks.slice(-3).map(r => `<div class="truncate">• ${escapeHtml(r.risk)}</div>`).join('') : '<div class="text-gray-500">None</div>'}
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    activeHtml = `
      <div class="bg-gray-800 rounded-xl p-6 shadow-lg text-center">
        <p class="text-gray-400">No active process. Waiting for Claude to create one...</p>
      </div>
    `;
  }

  // Background processes HTML
  const backgroundHtml = backgroundProcesses.map(p => {
    const icon = statusIcons[p.status] || '📋';
    return `
      <div class="process-card background-process bg-gray-800 rounded-lg p-4 border-l-4 status-${p.status}">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-lg">${icon}</span>
          <span class="font-medium text-sm truncate">${escapeHtml(p.name)}</span>
        </div>
        <div class="text-xs text-gray-400 mb-2 truncate">${escapeHtml(p.goal)}</div>
        <div class="w-full bg-gray-700 rounded-full h-1.5 mb-2">
          <div class="bg-blue-500 h-1.5 rounded-full progress-bar" style="width: ${p.progress}%"></div>
        </div>
        <div class="flex justify-between text-xs text-gray-500">
          <span>${p.progress}%</span>
          <span>${p.status}</span>
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>procside Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .mermaid { background: transparent !important; }
    
    /* Animation Style: Fade */
    .anim-fade .process-card { transition: opacity 0.3s ease, transform 0.3s ease; }
    .anim-fade .process-card.updating { opacity: 0.5; }
    .anim-fade .step-item { transition: all 0.3s ease; }
    .anim-fade .step-item.changed { animation: fade-highlight 0.5s ease; }
    @keyframes fade-highlight {
      0% { background-color: rgba(59, 130, 246, 0.3); }
      100% { background-color: transparent; }
    }
    
    /* Animation Style: Slide */
    .anim-slide .process-card { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
    .anim-slide .process-card.updating { transform: translateX(10px); }
    .anim-slide .step-item { transition: all 0.3s ease; }
    .anim-slide .step-item.changed { animation: slide-in 0.4s ease; }
    @keyframes slide-in {
      0% { transform: translateX(-20px); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    
    /* Animation Style: Scale */
    .anim-scale .process-card { transition: all 0.3s ease; }
    .anim-scale .process-card.updating { transform: scale(1.02); }
    .anim-scale .step-item { transition: all 0.3s ease; }
    .anim-scale .step-item.changed { animation: scale-pop 0.4s ease; }
    @keyframes scale-pop {
      0% { transform: scale(0.95); opacity: 0.5; }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); opacity: 1; }
    }
    
    /* Animation Style: Minimal */
    .anim-minimal .process-card { transition: border-color 0.2s ease; }
    .anim-minimal .process-card.updating { border-color: #3b82f6; }
    .anim-minimal .step-item { transition: border-left-color 0.2s ease; }
    .anim-minimal .step-item.changed { border-left-color: #22c55e; }
    
    /* Status colors */
    .status-planned { border-left-color: #6b7280; }
    .status-in_progress { border-left-color: #3b82f6; }
    .status-completed { border-left-color: #22c55e; }
    .status-blocked { border-left-color: #f59e0b; }
    .status-cancelled { border-left-color: #ef4444; }
    
    .active-process { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5); }
    .background-process { opacity: 0.7; }
    .background-process:hover { opacity: 1; }
    .progress-bar { transition: width 0.5s ease; }
    
    @keyframes pulse-border {
      0%, 100% { border-left-color: #3b82f6; }
      50% { border-left-color: #93c5fd; }
    }
    .step-in_progress { animation: pulse-border 2s infinite; }
    
    .activity-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      animation: pulse-dot 2s infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }
  </style>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen anim-${animationStyle}">
  <div class="container mx-auto px-4 py-6 max-w-7xl">
    
    <header class="mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-white">procside</h1>
          <span class="text-gray-400 text-sm">Process Documentation Dashboard</span>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-400">${processes.length} processes</span>
          <div class="flex items-center gap-2">
            <div class="activity-dot" id="activity-indicator"></div>
            <span id="live-indicator" class="text-sm text-gray-400">Live</span>
          </div>
        </div>
      </div>
      
      <div class="mt-4 flex gap-2">
        <a href="/" class="px-3 py-1 rounded text-sm ${animationStyle === 'fade' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}">Fade</a>
        <a href="/2" class="px-3 py-1 rounded text-sm ${animationStyle === 'slide' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}">Slide</a>
        <a href="/3" class="px-3 py-1 rounded text-sm ${animationStyle === 'scale' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}">Scale</a>
        <a href="/4" class="px-3 py-1 rounded text-sm ${animationStyle === 'minimal' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}">Minimal</a>
      </div>
    </header>

    <div id="dashboard-content">
      <section id="active-process" class="mb-6">
        ${activeHtml}
      </section>
      
      <section id="background-processes">
        <h3 class="text-sm font-medium text-gray-400 mb-3">Other Processes</h3>
        <div id="process-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${backgroundHtml || '<div class="text-gray-500 text-sm col-span-full">No other processes</div>'}
        </div>
      </section>
    </div>
    
    <footer class="mt-8 text-center text-gray-500 text-xs">
      <p>procside dashboard • Last update: <span id="last-updated">${new Date().toLocaleTimeString()}</span></p>
    </footer>
  </div>
  
  <script>
    let state = {
      processes: ${processesJson},
      activeProcessId: ${activeProcessId ? `"${activeProcessId}"` : 'null'},
      animationStyle: "${animationStyle}"
    };
    
    const statusIcons = {
      planned: '📋',
      in_progress: '🔄',
      blocked: '🚫',
      completed: '✅',
      cancelled: '❌'
    };
    
    const stepIcons = {
      pending: '⏳',
      in_progress: '▶️',
      completed: '✓',
      failed: '✗',
      skipped: '⏭️'
    };
    
    const eventSource = new EventSource('/events');
    
    eventSource.onopen = function() {
      document.getElementById('live-indicator').textContent = 'Live';
      document.getElementById('activity-indicator').style.background = '#22c55e';
    };
    
    eventSource.onmessage = function(event) {
      const data = JSON.parse(event.data);
      if (data.type === 'process-update') {
        fetch('/api/processes')
          .then(res => res.json())
          .then(data => {
            state.processes = data.processes;
            state.activeProcessId = data.activeProcessId;
            render();
          })
          .catch(err => console.error('Failed to fetch updates:', err));
      }
    };
    
    eventSource.onerror = function() {
      document.getElementById('live-indicator').textContent = 'Disconnected';
      document.getElementById('activity-indicator').style.background = '#ef4444';
    };
    
    function escapeHtml(text) {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
    
    function render() {
      renderActiveProcess();
      renderBackgroundProcesses();
      updateTimestamp();
    }
    
    function renderActiveProcess() {
      const container = document.getElementById('active-process');
      const active = state.processes.find(p => p.id === state.activeProcessId);
      
      if (!active) {
        container.innerHTML = \`
          <div class="bg-gray-800 rounded-xl p-6 shadow-lg text-center">
            <p class="text-gray-400">No active process. Waiting for Claude to create one...</p>
          </div>
        \`;
        return;
      }
      
      const completedSteps = active.steps ? active.steps.filter(s => s.status === 'completed').length : 0;
      const totalSteps = active.steps ? active.steps.length : 0;
      const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      
      const stepsHtml = active.steps ? active.steps.map(step => {
        const icon = stepIcons[step.status] || '⏳';
        const activeClass = step.status === 'in_progress' ? 'step-in_progress' : '';
        return \`
          <div class="step-item border-l-4 pl-3 py-2 status-\${step.status} \${activeClass} bg-gray-700/30 rounded-r">
            <div class="flex items-center gap-2">
              <span>\${icon}</span>
              <span class="text-sm">\${escapeHtml(step.name)}</span>
              <span class="text-xs text-gray-500 ml-auto">\${step.status}</span>
            </div>
          </div>
        \`;
      }).join('') : '<p class="text-gray-500 text-sm">No steps defined</p>';
      
      container.innerHTML = \`
        <div class="bg-gray-800 rounded-xl p-6 shadow-lg active-process process-card">
          <div class="flex items-start justify-between mb-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-2xl">\${statusIcons[active.status] || '📋'}</span>
                <h2 class="text-xl font-semibold">\${escapeHtml(active.name)}</h2>
                <span class="text-xs text-gray-500 font-mono">\${active.id}</span>
              </div>
              <p class="text-gray-400 text-sm">\${escapeHtml(active.goal)}</p>
            </div>
            <div class="text-right">
              <span class="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white">\${active.status}</span>
              <div class="text-xs text-gray-500 mt-1">Updated: \${new Date(active.updatedAt).toLocaleString()}</div>
            </div>
          </div>
          
          <div class="mb-4">
            <div class="flex justify-between text-sm text-gray-400 mb-1">
              <span>Progress</span>
              <span>\${completedSteps}/\${totalSteps} steps</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2">
              <div class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full progress-bar" style="width: \${progress}%"></div>
            </div>
          </div>
          
          <div class="mb-4">
            <h3 class="text-sm font-medium text-gray-300 mb-2">Steps</h3>
            <div class="space-y-2">
              \${stepsHtml}
            </div>
          </div>
          
          <div class="grid grid-cols-3 gap-4 mt-4">
            <div>
              <h3 class="text-sm font-medium text-gray-300 mb-2">Evidence (\${active.evidence ? active.evidence.length : 0})</h3>
              <div class="text-xs text-gray-400 max-h-32 overflow-y-auto">
                \${active.evidence && active.evidence.length > 0 ? active.evidence.slice(-3).map(e => \`<div class="truncate">• \${escapeHtml(e.value)}</div>\`).join('') : '<div class="text-gray-500">None</div>'}
              </div>
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-300 mb-2">Decisions (\${active.decisions ? active.decisions.length : 0})</h3>
              <div class="text-xs text-gray-400 max-h-32 overflow-y-auto">
                \${active.decisions && active.decisions.length > 0 ? active.decisions.slice(-3).map(d => \`<div class="truncate">• \${escapeHtml(d.choice)}</div>\`).join('') : '<div class="text-gray-500">None</div>'}
              </div>
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-300 mb-2">Risks (\${active.risks ? active.risks.length : 0})</h3>
              <div class="text-xs text-gray-400 max-h-32 overflow-y-auto">
                \${active.risks && active.risks.length > 0 ? active.risks.slice(-3).map(r => \`<div class="truncate">• \${escapeHtml(r.risk)}</div>\`).join('') : '<div class="text-gray-500">None</div>'}
              </div>
            </div>
          </div>
        </div>
      \`;
    }
    
    function renderBackgroundProcesses() {
      const container = document.getElementById('process-grid');
      const background = state.processes.filter(p => p.id !== state.activeProcessId);
      
      if (background.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-sm col-span-full">No other processes</div>';
        return;
      }
      
      container.innerHTML = background.map(p => \`
        <div class="process-card background-process bg-gray-800 rounded-lg p-4 border-l-4 status-\${p.status}">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">\${statusIcons[p.status] || '📋'}</span>
            <span class="font-medium text-sm truncate">\${escapeHtml(p.name)}</span>
          </div>
          <div class="text-xs text-gray-400 mb-2 truncate">\${escapeHtml(p.goal)}</div>
          <div class="w-full bg-gray-700 rounded-full h-1.5 mb-2">
            <div class="bg-blue-500 h-1.5 rounded-full progress-bar" style="width: \${p.progress}%"></div>
          </div>
          <div class="flex justify-between text-xs text-gray-500">
            <span>\${p.progress}%</span>
            <span>\${p.status}</span>
          </div>
        </div>
      \`).join('');
    }
    
    function updateTimestamp() {
      document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();
    }
  </script>
</body>
</html>`;
}

function renderStepsCompact(steps: Step[]): string {
  if (steps.length === 0) {
    return '<p class="text-gray-500 text-sm">No steps defined</p>';
  }
  
  const stepIcons: Record<string, string> = {
    pending: '⏳',
    in_progress: '▶️',
    completed: '✓',
    failed: '✗',
    skipped: '⏭️'
  };
  
  return steps.map(step => {
    const icon = stepIcons[step.status] || '⏳';
    const activeClass = step.status === 'in_progress' ? 'step-in_progress' : '';
    
    return `
      <div class="step-item border-l-4 pl-3 py-2 status-${step.status} ${activeClass} bg-gray-700/30 rounded-r">
        <div class="flex items-center gap-2">
          <span>${icon}</span>
          <span class="text-sm">${escapeHtml(step.name)}</span>
          <span class="text-xs text-gray-500 ml-auto">${step.status}</span>
        </div>
      </div>
    `;
  }).join('');
}
