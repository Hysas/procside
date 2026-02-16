import type { Process, ProcessStatus } from './process.js';

export interface ProcessRegistry {
  version: number;
  activeProcessId: string | null;
  processes: ProcessMeta[];
  templates: TemplateMeta[];
}

export interface ProcessMeta {
  id: string;
  name: string;
  goal: string;
  status: ProcessStatus;
  template?: string;
  createdAt: string;
  updatedAt: string;
  progress: number;
  tags: string[];
  archived: boolean;
  archivedAt?: string;
}

export interface TemplateMeta {
  id: string;
  name: string;
  source: 'builtin' | 'local' | 'remote';
  path?: string;
  lastUsed: string;
  usageCount: number;
}

export interface ProcessVersion {
  version: number;
  snapshotAt: string;
  reason: string;
  process: Process;
}

export function createEmptyRegistry(): ProcessRegistry {
  return {
    version: 1,
    activeProcessId: null,
    processes: [],
    templates: []
  };
}

export function createProcessMeta(proc: Process): ProcessMeta {
  const completedSteps = proc.steps.filter(s => s.status === 'completed').length;
  const totalSteps = proc.steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  
  return {
    id: proc.id,
    name: proc.name,
    goal: proc.goal,
    status: proc.status,
    template: proc.template,
    createdAt: proc.createdAt,
    updatedAt: proc.updatedAt,
    progress,
    tags: [],
    archived: false
  };
}

export function generateProcessId(existingIds: string[]): string {
  const maxNum = existingIds.reduce((max, id) => {
    const match = id.match(/^proc-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return Math.max(max, num);
    }
    return max;
  }, 0);
  
  const nextNum = maxNum + 1;
  return `proc-${String(nextNum).padStart(3, '0')}`;
}
