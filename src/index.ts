#!/usr/bin/env node

import { Command } from "commander";
import {
  init,
  runAgent,
  status,
  render,
  statusJson,
} from "./cli/commands/index.js";

const program = new Command();

program
  .name("procside")
  .description(
    "Process-first agent collaboration framework - documents AI agent workflows as structured process artifacts",
  )
  .version("0.1.0");

program
  .command("init")
  .description("Initialize procside in the current project")
  .option("-n, --name <name>", "Process name", "Main Process")
  .option("-g, --goal <goal>", "Process goal", "Document the AI agent workflow")
  .option("-t, --template <template>", "Process template to use")
  .action((options) => {
    init(process.cwd(), {
      name: options.name,
      goal: options.goal,
      template: options.template,
    });
  });

program
  .command("run <command>")
  .description("Run an agent command and capture process updates")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("--json", "Output updates as JSON")
  .action(async (command, options) => {
    try {
      const result = await runAgent({
        command,
        projectPath: options.path,
        onOutput: (data) => {
          process.stdout.write(data);
        },
        onUpdate: (update) => {
          if (options.json) {
            console.log(JSON.stringify(update));
          }
        },
      });

      process.exit(result.exitCode);
    } catch (error) {
      console.error("Error running agent:", error);
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show current process status")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("--json", "Output as JSON")
  .action((options) => {
    if (options.json) {
      const json = statusJson(options.path);
      if (json) {
        console.log(JSON.stringify(json, null, 2));
      } else {
        console.log("{}");
      }
    } else {
      status(options.path);
    }
  });

program
  .command("render")
  .description("Render process documentation")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("-f, --format <format>", "Output format: md, mermaid, all", "all")
  .option("-o, --output <file>", "Output file path")
  .action((options) => {
    render({
      format: options.format,
      output: options.output,
      projectPath: options.path,
    });
  });

program
  .command("step <stepId>")
  .description("Update a step status")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option(
    "-s, --status <status>",
    "New status: pending, in_progress, completed, skipped, failed",
  )
  .option("--add-output <output>", "Add an output to the step")
  .action(async (stepId, options) => {
    const { loadProcess, saveProcess } = await import("./storage/index.js");
    const proc = loadProcess(options.path);

    if (!proc) {
      console.log('No process found. Run "procside init" first.');
      return;
    }

    const step = proc.steps.find((s) => s.id === stepId);
    if (!step) {
      console.log(`Step ${stepId} not found.`);
      return;
    }

    if (options.status) {
      step.status = options.status;
      if (options.status === "in_progress") {
        step.startedAt = new Date().toISOString();
      } else if (
        options.status === "completed" ||
        options.status === "failed"
      ) {
        step.completedAt = new Date().toISOString();
      }
    }

    if (options.addOutput) {
      step.outputs.push(options.addOutput);
    }

    saveProcess(proc, options.path);
    console.log(`Updated step ${stepId}`);
  });

program
  .command("add-step <name>")
  .description("Add a new step to the process")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("-i, --id <id>", "Step ID (auto-generated if not provided)")
  .option("--inputs <inputs>", "Comma-separated inputs")
  .option("--checks <checks>", "Comma-separated checks")
  .action(async (name, options) => {
    const { loadProcess, saveProcess } = await import("./storage/index.js");
    const proc = loadProcess(options.path);

    if (!proc) {
      console.log('No process found. Run "procside init" first.');
      return;
    }

    const stepId = options.id || `s${proc.steps.length + 1}`;
    const step = {
      id: stepId,
      name,
      inputs: options.inputs ? options.inputs.split(",") : [],
      outputs: [],
      checks: options.checks ? options.checks.split(",") : [],
      status: "pending" as const,
    };

    proc.steps.push(step);
    saveProcess(proc, options.path);
    console.log(`Added step ${stepId}: ${name}`);
  });

program
  .command("decide <question> <choice>")
  .description("Record a decision")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("-r, --rationale <rationale>", "Rationale for the decision")
  .action(async (question, choice, options) => {
    const { loadProcess, saveProcess } = await import("./storage/index.js");
    const proc = loadProcess(options.path);

    if (!proc) {
      console.log('No process found. Run "procside init" first.');
      return;
    }

    proc.decisions.push({
      id: `d${proc.decisions.length + 1}`,
      question,
      choice,
      rationale: options.rationale || "",
      timestamp: new Date().toISOString(),
    });

    saveProcess(proc, options.path);
    console.log(`Recorded decision: ${question} → ${choice}`);
  });

program
  .command("risk <description>")
  .description("Identify a risk")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("-i, --impact <impact>", "Impact level: low, medium, high", "medium")
  .option("-m, --mitigation <mitigation>", "Mitigation strategy")
  .action(async (description, options) => {
    const { loadProcess, saveProcess } = await import("./storage/index.js");
    const proc = loadProcess(options.path);

    if (!proc) {
      console.log('No process found. Run "procside init" first.');
      return;
    }

    proc.risks.push({
      id: `r${proc.risks.length + 1}`,
      risk: description,
      impact: options.impact as "low" | "medium" | "high",
      mitigation: options.mitigation || "",
      status: "identified",
      identifiedAt: new Date().toISOString(),
    });

    saveProcess(proc, options.path);
    console.log(`Identified risk: ${description}`);
  });

program
  .command("evidence <type> <value>")
  .description("Record evidence of work")
  .option("-p, --path <path>", "Project path", process.cwd())
  .action(async (type, value, options) => {
    const { loadProcess, saveProcess } = await import("./storage/index.js");
    const proc = loadProcess(options.path);

    if (!proc) {
      console.log('No process found. Run "procside init" first.');
      return;
    }

    proc.evidence.push({
      type: type as "command" | "file" | "url" | "note",
      value,
      timestamp: new Date().toISOString(),
    });

    saveProcess(proc, options.path);
    console.log(`Recorded evidence: [${type}] ${value}`);
  });

program
  .command("config")
  .description("Show or initialize configuration")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("--init", "Create a .procside.yaml config file with defaults")
  .option("--env <env>", "Set environment (development, production)")
  .option("--set <key=value>", "Set a config value (e.g. --set logLevel=debug)")
  .action(async (options) => {
    const { loadConfig, writeConfigFile, configExists } =
      await import("./config.js");
    const { DEFAULT_CONFIG } = await import("./types/config.js");

    if (options.init) {
      if (configExists(options.path)) {
        console.log("Config file already exists at .procside.yaml");
        return;
      }
      const defaults = { ...DEFAULT_CONFIG };
      if (options.env) {
        defaults.environment = options.env;
      }
      const filePath = writeConfigFile(defaults, options.path);
      console.log(`Created config file: ${filePath}`);
      return;
    }

    if (options.set) {
      const config = loadConfig(options.path);
      const [key, value] = options.set.split("=");
      if (!key || value === undefined) {
        console.log("Invalid format. Use --set key=value");
        return;
      }
      const updated = {
        ...config,
        [key]: value === "true" ? true : value === "false" ? false : value,
      };
      writeConfigFile(updated, options.path);
      console.log(`Set ${key} = ${value}`);
      return;
    }

    // Show current config
    const config = loadConfig(options.path);
    console.log("Current Configuration:\n");
    console.log(`  Environment:    ${config.environment}`);
    console.log(`  Artifact Dir:   ${config.artifactDir}`);
    console.log(`  Log Level:      ${config.logLevel}`);
    console.log(`  Silent:         ${config.silent}`);
    console.log(`  Default Format: ${config.defaultFormat}`);
    console.log(`  Auto Evidence:  ${config.autoEvidence}`);
    console.log(
      `\n  Config file:    ${configExists(options.path) ? ".procside.yaml (found)" : "not found (using defaults)"}`,
    );
  });

program
  .command("templates")
  .description("List available process templates")
  .action(async () => {
    const { listTemplates } = await import("./cli/commands/init.js");
    const templates = listTemplates();
    if (templates.length === 0) {
      console.log("No templates found.");
      return;
    }
    console.log("Available templates:\n");
    templates.forEach((t) => {
      console.log(`  - ${t}`);
    });
    console.log("\nUsage: procside init --template <name>");
  });

program
  .command("missing")
  .description("Show what's missing in the current process")
  .option("-p, --path <path>", "Project path", process.cwd())
  .action(async (options) => {
    const { loadProcess, processExists } = await import("./storage/index.js");
    const { getMissingItems } = await import("./cli/commands/status.js");

    if (!processExists(options.path)) {
      console.log('No process initialized. Run "procside init" first.');
      return;
    }

    const proc = loadProcess(options.path);
    if (!proc) {
      console.log("No process found.");
      return;
    }

    const missing = getMissingItems(proc);
    if (missing.length === 0) {
      console.log("✅ No missing items detected!");
    } else {
      console.log("What's Missing:\n");
      missing.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m}`);
      });
    }
  });

program
  .command("check")
  .description("Run quality gates on the current process")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("--json", "Output as JSON")
  .option("--fail-on-warning", "Exit with error code on warnings")
  .action(async (options) => {
    const { loadProcess, processExists } = await import("./storage/index.js");
    const { loadConfig } = await import("./config.js");
    const { runGates, formatCheckResult } = await import("./quality-gates.js");

    if (!processExists(options.path)) {
      console.log('No process initialized. Run "procside init" first.');
      process.exit(1);
    }

    const proc = loadProcess(options.path);
    if (!proc) {
      console.log("No process found.");
      process.exit(1);
    }

    const config = loadConfig(options.path);
    if (options.failOnWarning !== undefined) {
      config.qualityGates.failOnWarning = options.failOnWarning;
    }

    const result = runGates(proc, config.qualityGates);

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            passed: result.passed,
            errors: result.errors.map((e) => ({
              id: e.gate.id,
              message: e.message,
            })),
            warnings: result.warnings.map((w) => ({
              id: w.gate.id,
              message: w.message,
            })),
            exitCode: result.exitCode,
          },
          null,
          2,
        ),
      );
    } else {
      console.log(formatCheckResult(result));
    }

    process.exit(result.exitCode);
  });

program
  .command("gates")
  .description("List available quality gates")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const { getAllGates } = await import("./quality-gates.js");
    const { loadConfig } = await import("./config.js");

    const config = loadConfig();
    const gates = getAllGates();

    if (options.json) {
      console.log(
        JSON.stringify(
          gates.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            severity: g.severity,
          })),
          null,
          2,
        ),
      );
      return;
    }

    console.log("Available Quality Gates:\n");
    gates.forEach((g) => {
      const enabled =
        config.qualityGates.gates.find((c) => c.id === g.id)?.enabled ?? false;
      const status = enabled ? "✓" : " ";
      console.log(`  [${status}] ${g.id}`);
      console.log(`      ${g.description}`);
      console.log(`      Severity: ${g.severity}`);
      console.log("");
    });
    console.log("Enable/disable gates in .procside.yaml");
  });

program
  .command("dashboard")
  .description("Start web dashboard for process visualization")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("--port <port>", "Port to run server on", "3000")
  .option("--no-open", "Do not open browser automatically")
  .action(async (options) => {
    const { startServer } = await import("./dashboard/server.js");
    const { processExists } = await import("./storage/index.js");

    if (!processExists(options.path)) {
      console.log('No process initialized. Run "procside init" first.');
      process.exit(1);
    }

    const port = parseInt(options.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.log("Invalid port number. Must be between 1 and 65535.");
      process.exit(1);
    }

    startServer({
      port,
      projectPath: options.path,
      open: options.open,
    });
  });

program.parse();
