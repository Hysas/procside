export { 
  ensureAiDir, 
  getProcessPath, 
  getHistoryPath,
  processExists, 
  loadProcess, 
  saveProcess, 
  applyUpdate, 
  initProcess 
} from './process-store.js';

export { 
  loadHistory, 
  appendHistory, 
  getRecentHistory, 
  clearHistory,
  historyExists 
} from './history.js';

export {
  getRegistryPath,
  getProcessesDir,
  getVersionsDir,
  registryExists,
  loadRegistry,
  saveRegistry,
  loadProcessById,
  saveProcessToRegistry,
  createProcessInRegistry,
  getActiveProcess,
  setActiveProcess,
  listProcesses,
  listActiveProcesses,
  archiveProcess,
  restoreProcess,
  updateProcessMeta,
  createVersionSnapshot,
  listVersions,
  loadVersion,
  migrateFromSingleProcess,
  needsMigration
} from './registry.js';

export type { HistoryEntry } from './process-store.js';
