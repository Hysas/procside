export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';

export interface Step {
  id: string;
  name: string;
  description?: string;
  inputs: string[];
  outputs: string[];
  checks: string[];
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
}

export interface Evidence {
  type: 'command' | 'file' | 'url' | 'note';
  value: string;
  timestamp: string;
  stepId?: string;
}

export function createStep(id: string, name: string, options?: Partial<Step>): Step {
  return {
    id,
    name,
    description: options?.description,
    inputs: options?.inputs || [],
    outputs: options?.outputs || [],
    checks: options?.checks || [],
    status: options?.status || 'pending',
    startedAt: options?.startedAt,
    completedAt: options?.completedAt
  };
}

export function createEvidence(type: Evidence['type'], value: string, stepId?: string): Evidence {
  return {
    type,
    value,
    timestamp: new Date().toISOString(),
    stepId
  };
}
