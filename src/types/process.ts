import type { Step, StepStatus } from './step.js';
import type { Decision } from './decision.js';
import type { Risk } from './decision.js';
import type { Evidence } from './step.js';

export type ProcessStatus = 'planned' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';

export interface Process {
  id: string;
  name: string;
  goal: string;
  status: ProcessStatus;
  template?: string;
  steps: Step[];
  decisions: Decision[];
  risks: Risk[];
  evidence: Evidence[];
  createdAt: string;
  updatedAt: string;
}

export interface ProcessUpdate {
  processId?: string;
  action: ProcessAction;
  stepId?: string;
  status?: ProcessStatus | StepStatus;
  outputs?: string[];
  evidence?: Evidence[];
  decision?: Partial<Decision>;
  risk?: Partial<Risk>;
  step?: Partial<Step>;
  missing?: string[];
}

export type ProcessAction = 
  | 'process_start' 
  | 'process_update' 
  | 'step_add'
  | 'step_start' 
  | 'step_complete' 
  | 'step_fail'
  | 'decision' 
  | 'risk' 
  | 'missing'
  | 'evidence';

export function createProcess(id: string, name: string, goal: string, template?: string): Process {
  const now = new Date().toISOString();
  return {
    id,
    name,
    goal,
    status: 'planned',
    template,
    steps: [],
    decisions: [],
    risks: [],
    evidence: [],
    createdAt: now,
    updatedAt: now
  };
}
