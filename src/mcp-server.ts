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
  appendHistory
} from './storage/index.js';
import { applyUpdate } from './storage/process-store.js';
import { getMissingItems } from './cli/commands/status.js';
import { renderMarkdown } from './renderers/markdown.js';
import { renderMermaid } from './renderers/mermaid.js';
import type { Process, ProcessUpdate, Step } from './types/index.js';

const server = new McpServer({
  name: 'procside',
  version: '0.2.0'
});

const getProjectPath = (projectPath?: string): string => {
  return projectPath || process.cwd();
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
    
    if (processExists(basePath)) {
      const existing = loadProcess(basePath);
      return {
        content: [{
          type: 'text' as const,
          text: `Process already exists: ${existing?.name || 'Unknown'}\nUse process_status to view current state.`
        }]
      };
    }
    
    const id = name.toLowerCase().replace(/\s+/g, '.');
    const proc = initProcess(id, name, goal, template, basePath);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Process initialized:\n- ID: ${proc.id}\n- Name: ${proc.name}\n- Goal: ${proc.goal}\n\nUse process_add_step to add steps.`
      }]
    };
  }
);

server.tool(
  'process_status',
  'Get current process status and progress',
  {
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ projectPath }) => {
    const basePath = getProjectPath(projectPath);
    
    if (!processExists(basePath)) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process initialized. Use process_init first.'
        }]
      };
    }
    
    const proc = loadProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process found.'
        }]
      };
    }
    
    const completed = proc.steps.filter(s => s.status === 'completed').length;
    const total = proc.steps.length;
    const missing = getMissingItems(proc);
    
    let status = `Process: ${proc.name}\n`;
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
  'Add a new step to the process',
  {
    name: z.string().describe('Name of the step'),
    stepId: z.string().optional().describe('Custom step ID (auto-generated if not provided)'),
    inputs: z.array(z.string()).optional().describe('Inputs required for this step'),
    checks: z.array(z.string()).optional().describe('Checks to verify step completion'),
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ name, stepId, inputs, checks, projectPath }) => {
    const basePath = getProjectPath(projectPath);
    
    if (!processExists(basePath)) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process initialized. Use process_init first.'
        }]
      };
    }
    
    const proc = loadProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process found.'
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
    saveProcess(proc, basePath);
    
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
    
    if (!processExists(basePath)) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process initialized. Use process_init first.'
        }]
      };
    }
    
    const proc = loadProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process found.'
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
    
    saveProcess(proc, basePath);
    
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
    
    if (!processExists(basePath)) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process initialized. Use process_init first.'
        }]
      };
    }
    
    const proc = loadProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process found.'
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
    
    saveProcess(proc, basePath);
    
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
    
    if (!processExists(basePath)) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process initialized. Use process_init first.'
        }]
      };
    }
    
    const proc = loadProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process found.'
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
    
    saveProcess(proc, basePath);
    
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
    
    if (!processExists(basePath)) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process initialized. Use process_init first.'
        }]
      };
    }
    
    const proc = loadProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process found.'
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
    
    saveProcess(proc, basePath);
    
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
    
    if (!processExists(basePath)) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process initialized. Use process_init first.'
        }]
      };
    }
    
    const proc = loadProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process found.'
        }]
      };
    }
    
    proc.evidence.push({
      type,
      value,
      timestamp: new Date().toISOString()
    });
    
    saveProcess(proc, basePath);
    
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
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ format = 'both', projectPath }) => {
    const basePath = getProjectPath(projectPath);
    
    if (!processExists(basePath)) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process initialized. Use process_init first.'
        }]
      };
    }
    
    const proc = loadProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process found.'
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
    projectPath: z.string().optional().describe('Project directory path')
  },
  async ({ projectPath }) => {
    const basePath = getProjectPath(projectPath);
    
    if (!processExists(basePath)) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process initialized. Use process_init first.'
        }]
      };
    }
    
    const proc = loadProcess(basePath);
    if (!proc) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No process found.'
        }]
      };
    }
    
    const missing = getMissingItems(proc);
    const hasSteps = proc.steps.length > 0;
    const hasEvidence = proc.evidence.length > 0;
    const allComplete = proc.steps.every(s => s.status === 'completed');
    
    let result = 'Quality Check Results:\n\n';
    result += hasSteps ? '✅ Has steps\n' : '❌ No steps defined\n';
    result += allComplete ? '✅ All steps completed\n' : `⚠️ ${proc.steps.filter(s => s.status !== 'completed').length} steps incomplete\n`;
    result += hasEvidence ? '✅ Has evidence\n' : '⚠️ No evidence recorded\n';
    
    if (missing.length > 0) {
      result += '\nMissing items:\n';
      missing.forEach(m => {
        result += `  - ${m}\n`;
      });
    }
    
    const passed = hasSteps;
    
    return {
      content: [{
        type: 'text' as const,
        text: result
      }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
