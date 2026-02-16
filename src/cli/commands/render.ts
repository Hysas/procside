import * as fs from 'fs';
import * as path from 'path';
import { loadProcess, processExists } from '../../storage/index.js';
import { renderMarkdown } from '../../renderers/markdown.js';
import { renderMermaid } from '../../renderers/mermaid.js';
import { getMissingItems } from './status.js';
import logger from '../../logger.js';

export interface RenderOptions {
  format: 'md' | 'mermaid' | 'all';
  output?: string;
  projectPath?: string;
}

export function render(options: RenderOptions): void {
  const { format, output, projectPath = process.cwd() } = options;
  logger.debug(`render called with format=${format}, output=${output}, projectPath=${projectPath}`);

  if (!processExists(projectPath)) {
    logger.warn('No process initialized for render');
    console.log('No process initialized. Run "procside init" first.');
    return;
  }

  const proc = loadProcess(projectPath);
  if (!proc) {
    logger.warn('Process file exists but could not be loaded for render');
    console.log('No process found.');
    return;
  }

  const docsDir = path.join(projectPath, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
    logger.debug(`Created docs directory at ${docsDir}`);
  }

  if (format === 'md' || format === 'all') {
    const mdPath = output || path.join(docsDir, 'PROCESS.md');
    const mdContent = renderMarkdown(proc, getMissingItems(proc));
    fs.writeFileSync(mdPath, mdContent, 'utf-8');
    logger.info(`Rendered Markdown to ${mdPath}`);
    console.log(`Rendered Markdown to ${mdPath}`);
  }

  if (format === 'mermaid' || format === 'all') {
    const mmdPath = output || path.join(docsDir, 'PROCESS.mmd');
    const mmdContent = renderMermaid(proc);
    fs.writeFileSync(mmdPath, mmdContent, 'utf-8');
    logger.info(`Rendered Mermaid to ${mmdPath}`);
    console.log(`Rendered Mermaid to ${mmdPath}`);
  }
}
