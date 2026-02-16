export type Environment = 'development' | 'production';

export interface QualityGate {
  id: string;
  name: string;
  description: string;
  check: (process: import('./process.js').Process) => { passed: boolean; message: string };
  severity: 'error' | 'warning';
}

export interface QualityGatesConfig {
  enabled: boolean;
  failOnWarning: boolean;
  gates: QualityGateConfig[];
}

export interface QualityGateConfig {
  id: string;
  enabled: boolean;
  severity?: 'error' | 'warning';
}

export interface ProcsideConfig {
  environment: Environment;
  artifactDir: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  silent: boolean;
  defaultFormat: 'md' | 'mermaid' | 'all';
  autoEvidence: boolean;
  qualityGates: QualityGatesConfig;
}

export const DEFAULT_CONFIG: ProcsideConfig = {
  environment: 'development',
  artifactDir: '.ai',
  logLevel: 'info',
  silent: false,
  defaultFormat: 'all',
  autoEvidence: true,
  qualityGates: {
    enabled: true,
    failOnWarning: false,
    gates: [
      { id: 'has_steps', enabled: true },
      { id: 'all_steps_completed', enabled: false },
      { id: 'has_evidence', enabled: true },
      { id: 'has_decisions', enabled: false },
      { id: 'no_pending_missing', enabled: true },
      { id: 'has_rollback', enabled: false },
      { id: 'has_validation', enabled: false },
    ]
  }
};

export const ENV_VAR_MAP: Record<string, keyof ProcsideConfig> = {
  PROCSIDE_ENV: 'environment',
  PROCSIDE_ARTIFACT_DIR: 'artifactDir',
  PROCSIDE_LOG_LEVEL: 'logLevel',
  PROCSIDE_SILENT: 'silent',
  PROCSIDE_DEFAULT_FORMAT: 'defaultFormat',
  PROCSIDE_AUTO_EVIDENCE: 'autoEvidence',
};
