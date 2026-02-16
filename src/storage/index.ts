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

export type { HistoryEntry } from './process-store.js';
