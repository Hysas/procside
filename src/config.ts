import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { ProcsideConfig, Environment } from './types/config.js';
import { DEFAULT_CONFIG, ENV_VAR_MAP } from './types/config.js';

const CONFIG_FILENAME = '.procside.yaml';

let cachedConfig: ProcsideConfig | null = null;

/**
 * Load config from a .procside.yaml file if it exists.
 */
function loadConfigFile(projectPath: string): Partial<ProcsideConfig> {
  const filePath = path.join(projectPath, CONFIG_FILENAME);
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return YAML.parse(content) || {};
  } catch {
    return {};
  }
}

/**
 * Load config values from environment variables.
 */
function loadEnvConfig(): Partial<ProcsideConfig> {
  const config: Partial<ProcsideConfig> = {};

  for (const [envVar, configKey] of Object.entries(ENV_VAR_MAP)) {
    const value = process.env[envVar];
    if (value === undefined) continue;

    switch (configKey) {
      case 'silent':
      case 'autoEvidence':
        (config as any)[configKey] = value === 'true';
        break;
      case 'environment':
        if (value === 'development' || value === 'production') {
          config.environment = value as Environment;
        }
        break;
      case 'logLevel':
        if (['debug', 'info', 'warn', 'error'].includes(value)) {
          config.logLevel = value as ProcsideConfig['logLevel'];
        }
        break;
      case 'defaultFormat':
        if (['md', 'mermaid', 'all'].includes(value)) {
          config.defaultFormat = value as ProcsideConfig['defaultFormat'];
        }
        break;
      default:
        (config as any)[configKey] = value;
        break;
    }
  }

  return config;
}

/**
 * Load and merge configuration with precedence: env vars > config file > defaults.
 * Results are cached after first load.
 */
export function loadConfig(projectPath: string = process.cwd()): ProcsideConfig {
  if (cachedConfig) return cachedConfig;

  const fileConfig = loadConfigFile(projectPath);
  const envConfig = loadEnvConfig();

  cachedConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...envConfig,
    qualityGates: {
      ...DEFAULT_CONFIG.qualityGates,
      ...fileConfig.qualityGates,
    }
  };

  return cachedConfig;
}

/**
 * Clear the cached config (useful for testing or after config changes).
 */
export function resetConfig(): void {
  cachedConfig = null;
}

/**
 * Write a config file to the project directory.
 */
export function writeConfigFile(config: Partial<ProcsideConfig>, projectPath: string = process.cwd()): string {
  const filePath = path.join(projectPath, CONFIG_FILENAME);
  const content = YAML.stringify(config);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Get the path to the config file.
 */
export function getConfigPath(projectPath: string = process.cwd()): string {
  return path.join(projectPath, CONFIG_FILENAME);
}

/**
 * Check if a config file exists.
 */
export function configExists(projectPath: string = process.cwd()): boolean {
  return fs.existsSync(getConfigPath(projectPath));
}
