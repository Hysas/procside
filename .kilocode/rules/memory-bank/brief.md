# procside

**Process-first agent collaboration framework** - A CLI tool that documents AI agent workflows as structured process artifacts.

## What it does

procside sits alongside CLI agents like Claude Code and Codex, capturing what they do and modeling it into a structured "process graph" with steps, decisions, risks, and evidence. It renders human-friendly documentation continuously and helps spot what's missing.

## Tech Stack

- **Language:** TypeScript (ES Modules)
- **Runtime:** Node.js 18+
- **CLI Framework:** commander
- **YAML Parsing:** yaml (js-yaml compatible)
- **Logging:** winston
- **Config:** .procside.yaml with env var overrides
- **Build:** tsc (TypeScript compiler)

## Project Structure

```
src/
├── index.ts              # CLI entry point (commander)
├── config.ts             # Configuration loader
├── logger.ts             # Winston logger setup
├── types/
│   ├── index.ts          # Type re-exports
│   ├── process.ts        # Process, ProcessUpdate, ProcessAction
│   ├── step.ts           # Step, StepStatus, Evidence
│   ├── decision.ts       # Decision, Risk
│   └── config.ts         # ProcsideConfig interface
├── storage/
│   ├── index.ts          # Storage re-exports
│   ├── process-store.ts  # YAML read/write, applyUpdate
│   └── history.ts        # Append-only event log
├── parser/
│   ├── index.ts          # Parser re-exports
│   └── update-parser.ts  # [PROCESS_UPDATE] block parsing
├── cli/commands/
│   ├── index.ts          # Command re-exports
│   ├── init.ts           # procside init (with template loading)
│   ├── run.ts            # procside run (agent wrapper)
│   ├── status.ts         # procside status
│   └── render.ts         # procside render
└── renderers/
    ├── index.ts          # Renderer re-exports
    ├── markdown.ts       # PROCESS.md output
    ├── mermaid.ts        # Mermaid flowchart output
    └── checklist.ts      # Checklist output

templates/                 # Process templates (YAML)
├── feature-add.yaml
├── bugfix.yaml
├── refactor.yaml
├── infra-deploy.yaml
└── debugging.yaml

.ai/                       # Runtime data (gitignored)
├── process.yaml          # Current process state
├── history.yaml          # Event log
└── procside.log          # Log file

docs/                      # Generated docs
├── PROCESS.md
└── PROCESS.mmd
```

## Key Commands

- `procside init [--template <name>]` - Initialize process tracking
- `procside add-step <name>` - Add a step
- `procside step <id> --status <status>` - Update step status
- `procside decide <question> <choice>` - Record a decision
- `procside risk <description>` - Identify a risk
- `procside evidence <type> <value>` - Record evidence
- `procside status` - Show current process
- `procside render` - Generate PROCESS.md and Mermaid
- `procside templates` - List available templates
- `procside config` - Show/manage configuration

## Architecture Decisions

1. **YAML for storage** - Human-readable, version-controllable
2. **Append-only history** - Never lose information
3. **CLI wrapper approach** - Can wrap any agent command
4. **Template-based initialization** - Pre-defined workflows
5. **Self-documenting** - PROCESS.md is both human and AI readable

## Current Status

MVP complete with:
- Full CLI command set
- Template loading
- Config system with env vars
- Winston logging
- Mermaid diagram rendering
- Tested with Claude Code integration
