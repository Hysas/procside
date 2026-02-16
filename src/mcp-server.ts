#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as path from 'path';
import { 
  loadProcess, 
  saveProcess, 
  processExists, 
  initProcess,
  appendHistory,
  getActiveProcess,
  saveProcessToRegistry,
  updateProcessMeta,
  createProcessInRegistry,
  listProcesses,
  listActiveProcesses,
  setActiveProcess,
  archiveProcess,
  restoreProcess,
  createVersionSnapshot,
  listVersions,
  loadProcessById,
  loadRegistry,
  needsMigration,
  migrateFromSingleProcess
} from './storage/index.js';
import { applyUpdate } from './storage/process-store.js';
import { getMissingItems } from './cli/commands/status.js';
import { renderMarkdown } from './renderers/markdown.js';
import { renderMermaid } from './renderers/mermaid.js';
import type { Process, ProcessUpdate, Step } from './types/index.js';

const server = new McpServer({
  name: 'procside',
  version: '0.5.0'
});

const getProjectPath = (projectPath?: string): string => {
  return projectPath || process.cwd();
};

const ensureMigrated = (basePath: string): void => {
  if (needsMigration(basePath)) {
    migrateFromSingleProcess(basePath);
  }
};

server.tool(
  'process_init',
  'Initialize a new process to track agent work',
  {
    name: z.string().describe('Name of the process'),
    goal: z.string().describe('Goal or objective of the process'),
    template: z.string().optional().describe('Template to use (feature-add, bugfix, refactor, etc.)'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ name, goal, template, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const proc = createProcessInRegistry(name, goal, template, basePath);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Process initialized:\n- ID: ${proc.id}\n- Name: ${proc.name}\n- Goal: ${proc.goal}\n\nUse process_add_step to add steps.`
      }]
    };
  }
);

server.tool(
  'process_list',
  'List all processes in the registry',
  {
    includeArchived: z.boolean().optional().describe('Include archived processes'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ includeArchived, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const registry = loadRegistry(basePath);
    const processes = includeArchived ? listProcesses(basePath) : listActiveProcesses(basePath);
    
    if (processes.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No processes found. Use process_init to create one.'
        }]
      };
    }
    
    let text = `Processes (${processes.length}):\n\n`;
    processes.forEach(p => {
      const active = p.id === registry.activeProcessId ? '* ' : '  ';
      const archived = p.archived ? ' (archived)' : '';
      text += `${active}${p.id}: ${p.name}\n`;
      text += `   Goal: ${p.goal}\n`;
      text += `   Progress: ${p.progress}% | Status: ${p.status}${archived}\n\n`;
    });
    
    return {
      content: [{
        type: 'text' as const,
        text
      }]
    };
  }
);

server.tool(
  'process_switch',
  'Switch to a different process',
  {
    processId: z.string().describe('ID of the process to switch to'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ processId, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const success = setActiveProcess(processId, basePath);
    if (!success) {
      return {
        content: [{
          type: 'text' as const,
          text: `Process ${processId} not found. Use process_list to see available processes.`
        }]
      };
    }
    
    const proc = loadProcessById(processId, basePath);
    return {
      content: [{
        type: 'text' as const,
        text: `Switched to process: ${proc?.name} (${processId})`
      }]
    };
  }
);

server.tool(
  'process_status',
  'Get current process status and progress',
  {
    processId: z.string().optional().describe('Process ID (defaults to active process)'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ processId, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const proc = processId 
      ? loadProcessById(processId, basePath)
      : getActiveProcess(basePath);
    
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No active process. Use process_init first or specify a processId.'
        }]
      };
    }
    
    const completed = proc.steps.filter(s => s.status === 'completed').length;
    const total = proc.steps.length;
    const missing = getMissingItems(proc);
    
    let status = `Process: ${proc.name} (${proc.id})\n`;
    status += `Goal: ${proc.goal}\n`;
    status += `Status: ${proc.status}\n`;
    status += `Progress: ${completed}/${total} steps completed\n\n`;
    
    if (proc.steps.length > 0) {
      status += 'Steps:\n';
      proc.steps.forEach((s, i) => {
        const icon = s.status === 'completed' ? '✅' : s.status === 'in_progress' ? '🔄' : '⏳';
        status += `  ${i + 1}. ${icon} ${s.name}\n`;
      });
    }
    
    if (proc.decisions.length > 0) {
      status += '\nDecisions:\n';
      proc.decisions.forEach(d => {
        status += `  • ${d.question} → ${d.choice}\n`;
      });
    }
    
    if (missing.length > 0) {
      status += '\nMissing:\n';
      missing.forEach(m => {
        status += `  - ${m}\n`;
      });
    }
    
    return {
      content: [{
        type: 'text' as const,
        text: status
      }]
    };
  }
);

server.tool(
  'process_add_step',
  'Add a new step to the active process',
  {
    name: z.string().describe('Name of the step'),
    stepId: z.string().optional().describe('Custom step ID (auto-generated if not provided)'),
    inputs: z.array(z.string()).optional().describe('Inputs required for this step'),
    checks: z.array(z.string()).optional().describe('Checks to verify step completion'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ name, stepId, inputs, checks, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const proc = getActiveProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No active process. Use process_init first.'
        }]
      };
    }
    
    const id = stepId || `s${proc.steps.length + 1}`;
    const step: Step = {
      id,
      name,
      inputs: inputs || [],
      outputs: [],
      checks: checks || [],
      status: 'pending'
    };
    
    proc.steps.push(step);
    saveProcessToRegistry(proc, basePath);
    updateProcessMeta(proc, basePath);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Added step ${id}: ${name}\n\nUse process_step_start to begin working on it.`
      }]
    };
  }
);

server.tool(
  'process_step_start',
  'Mark a step as in progress',
  {
    stepId: z.string().describe('ID of the step to start'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ stepId, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const proc = getActiveProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No active process. Use process_init first.'
        }]
      };
    }
    
    const step = proc.steps.find(s => s.id === stepId);
    if (!step) {
      return {
        content: [{
          type: 'text' as const,
          text: `Step ${stepId} not found. Available steps: ${proc.steps.map(s => s.id).join(', ')}`
        }]
      };
    }
    
    step.status = 'in_progress';
    step.startedAt = new Date().toISOString();
    
    if (proc.status === 'planned') {
      proc.status = 'in_progress';
    }
    
    saveProcessToRegistry(proc, basePath);
    updateProcessMeta(proc, basePath);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Started step ${stepId}: ${step.name}`
      }]
    };
  }
);

server.tool(
  'process_step_complete',
  'Mark a step as completed with outputs',
  {
    stepId: z.string().describe('ID of the step to complete'),
    outputs: z.array(z.string()).optional().describe('Outputs produced by this step'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ stepId, outputs, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const proc = getActiveProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No active process. Use process_init first.'
        }]
      };
    }
    
    const step = proc.steps.find(s => s.id === stepId);
    if (!step) {
      return {
        content: [{
          type: 'text' as const,
          text: `Step ${stepId} not found.`
        }]
      };
    }
    
    step.status = 'completed';
    step.completedAt = new Date().toISOString();
    if (outputs) {
      step.outputs = [...step.outputs, ...outputs];
    }
    
    const allComplete = proc.steps.every(s => s.status === 'completed');
    if (allComplete) {
      proc.status = 'completed';
    }
    
    saveProcessToRegistry(proc, basePath);
    updateProcessMeta(proc, basePath);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Completed step ${stepId}: ${step.name}${outputs ? `\nOutputs: ${outputs.join(', ')}` : ''}`
      }]
    };
  }
);

server.tool(
  'process_decide',
  'Record a decision made during the process',
  {
    question: z.string().describe('The question or decision point'),
    choice: z.string().describe('The choice made'),
    rationale: z.string().optional().describe('Why this choice was made'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ question, choice, rationale, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const proc = getActiveProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No active process. Use process_init first.'
        }]
      };
    }
    
    proc.decisions.push({
      id: `d${proc.decisions.length + 1}`,
      question,
      choice,
      rationale: rationale || '',
      timestamp: new Date().toISOString()
    });
    
    saveProcessToRegistry(proc, basePath);
    updateProcessMeta(proc, basePath);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Recorded decision: ${question} → ${choice}`
      }]
    };
  }
);

server.tool(
  'process_risk',
  'Identify a risk in the process',
  {
    description: z.string().describe('Description of the risk'),
    impact: z.enum(['low', 'medium', 'high']).optional().describe('Impact level'),
    mitigation: z.string().optional().describe('How to mitigate the risk'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ description, impact, mitigation, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const proc = getActiveProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No active process. Use process_init first.'
        }]
      };
    }
    
    proc.risks.push({
      id: `r${proc.risks.length + 1}`,
      risk: description,
      impact: impact || 'medium',
      mitigation: mitigation || '',
      status: 'identified',
      identifiedAt: new Date().toISOString()
    });
    
    saveProcessToRegistry(proc, basePath);
    updateProcessMeta(proc, basePath);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Identified risk: ${description} (${impact || 'medium'})`
      }]
    };
  }
);

server.tool(
  'process_evidence',
  'Record evidence of work done',
  {
    type: z.enum(['command', 'file', 'url', 'note']).describe('Type of evidence'),
    value: z.string().describe('The evidence value (command, file path, URL, or note)'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ type, value, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const proc = getActiveProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No active process. Use process_init first.'
        }]
      };
    }
    
    proc.evidence.push({
      type,
      value,
      timestamp: new Date().toISOString()
    });
    
    saveProcessToRegistry(proc, basePath);
    updateProcessMeta(proc, basePath);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Recorded evidence: [${type}] ${value}`
      }]
    };
  }
);

server.tool(
  'process_render',
  'Generate documentation (Markdown and Mermaid)',
  {
    format: z.enum(['md', 'mermaid', 'both']).optional().describe('Output format'),
    processId: z.string().optional().describe('Process ID (defaults to active process)'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ format = 'both', processId, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const proc = processId 
      ? loadProcessById(processId, basePath)
      : getActiveProcess(basePath);
    
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No active process. Use process_init first or specify a processId.'
        }]
      };
    }
    
    const missing = getMissingItems(proc);
    let output = '';
    
    if (format === 'md' || format === 'both') {
      output += '## PROCESS.md\n\n';
      output += renderMarkdown(proc, missing);
      output += '\n\n';
    }
    
    if (format === 'mermaid' || format === 'both') {
      output += '## Mermaid Diagram\n\n```mermaid\n';
      output += renderMermaid(proc);
      output += '\n```\n';
    }
    
    return {
      content: [{
        type: 'text' as const,
        text: output
      }]
    };
  }
);

server.tool(
  'process_check',
  'Run quality gates and check process completeness',
  {
    processId: z.string().optional().describe('Process ID (defaults to active process)'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ processId, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const proc = processId 
      ? loadProcessById(processId, basePath)
      : getActiveProcess(basePath);
    
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No active process. Use process_init first or specify a processId.'
        }]
      };
    }
    
    const missing = getMissingItems(proc);
    const hasSteps = proc.steps.length > 0;
    const hasEvidence = proc.evidence.length > 0;
    const allComplete = proc.steps.every(s => s.status === 'completed');
    
    let result = `Quality Check Results for ${proc.name}:\n\n`;
    result += hasSteps ? '✅ Has steps\n' : '❌ No steps defined\n';
    result += allComplete ? '✅ All steps completed\n' : `⚠️ ${proc.steps.filter(s => s.status !== 'completed').length} steps incomplete\n`;
    result += hasEvidence ? '✅ Has evidence\n' : '⚠️ No evidence recorded\n';
    
    if (missing.length > 0) {
      result += '\nMissing items:\n';
      missing.forEach(m => {
        result += `  - ${m}\n`;
      });
    }
    
    return {
      content: [{
        type: 'text' as const,
        text: result
      }]
    };
  }
);

server.tool(
  'process_archive',
  'Archive a completed process',
  {
    processId: z.string().describe('ID of the process to archive'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ processId, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const success = archiveProcess(processId, basePath);
    if (!success) {
      return {
        content: [{
          type: 'text' as const,
          text: `Process ${processId} not found.`
        }]
      };
    }
    
    return {
      content: [{
        type: 'text' as const,
        text: `Archived process: ${processId}`
      }]
    };
  }
);

server.tool(
  'process_restore',
  'Restore an archived process',
  {
    processId: z.string().describe('ID of the process to restore'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ processId, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const success = restoreProcess(processId, basePath);
    if (!success) {
      return {
        content: [{
          type: 'text' as const,
          text: `Process ${processId} not found or not archived.`
        }]
      };
    }
    
    return {
      content: [{
        type: 'text' as const,
        text: `Restored process: ${processId}`
      }]
    };
  }
);

server.tool(
  'process_version',
  'Create a version snapshot of the current process',
  {
    description: z.string().optional().describe('Description of this version'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ description, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const proc = getActiveProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No active process. Use process_init first.'
        }]
      };
    }
    
    const reason = description || 'Manual version snapshot';
    const versionNum = createVersionSnapshot(proc, reason, basePath);
    
    const completedSteps = proc.steps.filter(s => s.status === 'completed').length;
    const totalSteps = proc.steps.length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    
    return {
      content: [{
        type: 'text' as const,
        text: `Created version: v${versionNum}\nProcess: ${proc.name}\nProgress: ${progress}%`
      }]
    };
  }
);

server.tool(
  'process_history',
  'View version history of a process',
  {
    processId: z.string().optional().describe('Process ID (defaults to active process)'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ processId, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    ensureMigrated(basePath);
    
    const registry = loadRegistry(basePath);
    const targetId = processId || registry.activeProcessId;
    
    if (!targetId) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process specified and no active process.'
        }]
      };
    }
    
    const versions = listVersions(targetId, basePath);
    
    if (versions.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: `No version history for process ${targetId}.`
        }]
      };
    }
    
    let text = `Version history for ${targetId}:\n\n`;
    versions.forEach(v => {
      const completedSteps = v.process.steps.filter(s => s.status === 'completed').length;
      const totalSteps = v.process.steps.length;
      const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      text += `v${v.version}: ${progress}% - ${v.reason}\n`;
      text += `  Created: ${v.snapshotAt}\n`;
    });
    
    return {
      content: [{
        type: 'text' as const,
        text
      }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
