import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { ensureAiDir, createProcessInRegistry, saveProcessToRegistry, updateProcessMeta, registryExists, needsMigration, migrateFromSingleProcess, loadRegistry } from '../../storage/index.js';
import type { Process, Step, Risk } from '../../types/index.js';

const AI_DIR = '.ai';
const TEMPLATES_DIR = 'templates';

function getTemplatesDir(): string {
  const possiblePaths = [
    path.join(process.cwd(), TEMPLATES_DIR),
    path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..', TEMPLATES_DIR),
    path.join('/usr/lib/node_modules/procside', TEMPLATES_DIR),
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(process.cwd(), TEMPLATES_DIR);
}

function loadTemplate(templateName: string): { steps: Step[]; risks: Risk[] } | null {
  const templatesDir = getTemplatesDir();
  const templateFile = path.join(templatesDir, `${templateName}.yaml`);
  
  if (!fs.existsSync(templateFile)) {
    console.log(`Template "${templateName}" not found at ${templateFile}`);
    return null;
  }
  
  try {
    const content = fs.readFileSync(templateFile, 'utf-8');
    const template = YAML.parse(content);
    
    const steps: Step[] = (template.steps || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      inputs: s.inputs || [],
      outputs: s.outputs || [],
      checks: s.checks || [],
      status: 'pending' as const
    }));
    
    const risks: Risk[] = (template.risks || []).map((r: any) => ({
      id: r.id,
      risk: r.risk,
      impact: r.impact || 'medium',
      mitigation: r.mitigation || '',
      status: 'identified' as const,
      identifiedAt: new Date().toISOString()
    }));
    
    return { steps, risks };
  } catch (error) {
    console.log(`Error loading template: ${error}`);
    return null;
  }
}

export function init(projectPath: string = process.cwd(), options?: {
  name?: string;
  goal?: string;
  template?: string;
}): void {
  // Check if migration is needed
  if (needsMigration(projectPath)) {
    console.log('Migrating to multi-process format...');
    migrateFromSingleProcess(projectPath);
    console.log('Migration complete.\n');
  }

  const name = options?.name || 'Main Process';
  const goal = options?.goal || 'Document the AI agent workflow';

  let steps: Step[] = [];
  let risks: Risk[] = [];

  if (options?.template) {
    const template = loadTemplate(options.template);
    if (template) {
      steps = template.steps;
      risks = template.risks;
      console.log(`Loaded template: ${options.template} (${steps.length} steps, ${risks.length} risks)`);
    }
  }

  const proc = createProcessInRegistry(name, goal, options?.template, projectPath);
  
  // Add steps and risks from template
  if (steps.length > 0 || risks.length > 0) {
    proc.steps = steps;
    proc.risks = risks;
    saveProcessToRegistry(proc, projectPath);
    updateProcessMeta(proc, projectPath);
  }

  const aiPath = ensureAiDir(projectPath);

  const docsDir = path.join(projectPath, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  console.log(`Initialized procside in ${aiPath}`);
  console.log(`Process ID: ${proc.id}`);
  console.log(`Process Name: ${name}`);
  if (options?.template) {
    console.log(`Template: ${options.template}`);
  }
  if (steps.length > 0) {
    console.log(`\nSteps loaded:`);
    steps.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name}`);
    });
  }
  console.log(`\nNext steps:`);
  console.log(`  1. Run an agent: procside run "claude code"`);
  console.log(`  2. View status: procside status`);
  console.log(`  3. Render docs: procside render`);
  console.log(`  4. View all processes: procside list`);
}

export function listTemplates(): string[] {
  const templatesDir = getTemplatesDir();
  if (!fs.existsSync(templatesDir)) {
    return [];
  }
  return fs.readdirSync(templatesDir)
    .filter(f => f.endsWith('.yaml'))
    .map(f => f.replace('.yaml', ''));
}
