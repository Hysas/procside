# procside

**Process-first agent collaboration framework** — Documents AI agent workflows as structured process artifacts.

## Overview

`procside` sits alongside CLI agents like Claude Code and Codex, capturing what they do and modeling it into a structured "process graph" with steps, decisions, risks, and evidence. It renders human-friendly documentation continuously and helps you spot what's missing.

## Features

- **Capture** agent activity (user intent, tool calls, file changes, decisions)
- **Model** activity as structured process with steps, inputs/outputs, checkpoints
- **Render** human-friendly docs (Markdown + Mermaid diagrams)
- **Check** for gaps: missing validations, rollback plans, security considerations

## Installation

```bash
npm install -g procside
```

Or use directly with npx:

```bash
npx procside --help
```

## Quick Start

### 1. Initialize in your project

```bash
cd your-project
procside init
```

This creates `.ai/process.yaml` where your process will be tracked.

### 2. Run an agent through procside

```bash
procside run "claude code add a new feature for user authentication"
```

### 3. View the process status

```bash
procside status
```

### 4. Render documentation

```bash
procside render
```

This generates:
- `docs/PROCESS.md` — Human-readable process documentation
- `docs/PROCESS.mmd` — Mermaid flowchart diagram

## CLI Commands

| Command | Description |
|---------|-------------|
| `procside init` | Initialize process tracking in current project |
| `procside init --template <name>` | Initialize with a template |
| `procside status` | Show current process state |
| `procside render` | Generate Markdown and Mermaid docs |
| `procside add-step <name>` | Add a step to the process |
| `procside step <id> --status <status>` | Update a step |
| `procside decide <question> <choice>` | Record a decision |
| `procside risk <description>` | Identify a risk |
| `procside evidence <type> <value>` | Record evidence |
| `procside missing` | Show what's missing |
| `procside templates` | List available templates |
| `procside gates` | List quality gates |
| `procside check` | Run quality gates (exit 1 on failure) |
| `procside config` | Show/manage configuration |

## MCP Integration

procside includes an MCP server for direct integration with Claude Code.

### Setup

Add to your project's Claude Code config (`~/.claude.json`):

```json
{
  "projects": {
    "/path/to/your/project": {
      "mcpServers": {
        "procside": {
          "command": "node",
          "args": ["/path/to/procside/dist/mcp-server.js"]
        }
      }
    }
  }
}
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `process_init` | Initialize a new process |
| `process_status` | Get current process state |
| `process_add_step` | Add a step |
| `process_step_start` | Mark step in progress |
| `process_step_complete` | Mark step completed |
| `process_decide` | Record a decision |
| `process_risk` | Identify a risk |
| `process_evidence` | Record evidence |
| `process_render` | Generate documentation |
| `process_check` | Run quality gates |

## Quality Gates

Run `procside check` to validate process completeness.

| Gate | Severity | Description |
|------|----------|-------------|
| has_steps | error | Process must have steps |
| all_steps_completed | error | All steps must be done |
| has_evidence | warning | Must have evidence |
| has_decisions | warning | Must have decisions |
| no_pending_missing | warning | No unresolved gaps |
| has_rollback | warning | Must have rollback step |
| has_validation | warning | Must have test step |

Configure in `.procside.yaml`:

```yaml
qualityGates:
  enabled: true
  failOnWarning: false
  gates:
    - id: has_steps
      enabled: true
    - id: all_steps_completed
      enabled: false
```

## The `[PROCESS_UPDATE]` Protocol

Agents can emit structured updates that procside parses:

```
[PROCESS_UPDATE]
process_id: my-feature
action: step_complete
step_id: s1
status: completed
outputs:
  - "Created auth module"
  - "Added JWT support"
evidence:
  - type: command
    value: "npm test -- auth.test.ts"
decision:
  question: "Use JWT or session-based auth?"
  choice: "JWT"
  rationale: "Stateless, scalable, good for microservices"
missing:
  - "Add rate limiting"
  - "Document API endpoints"
[/PROCESS_UPDATE]
```

### Supported Actions

| Action | Description |
|--------|-------------|
| `process_start` | Initialize a new process |
| `process_update` | Update process status |
| `step_start` | Mark a step as in progress |
| `step_complete` | Mark a step completed with outputs |
| `step_fail` | Mark a step as failed |
| `decision` | Record a decision made |
| `risk` | Identify a risk |
| `evidence` | Add evidence of work done |
| `missing` | Note something missing |

## Process Templates

Use built-in templates for common workflows:

```bash
procside init --template feature-add
```

Available templates:
- `feature-add` — Implement a new feature
- `bugfix` — Fix a bug
- `refactor` — Refactor code
- `infra-deploy` — Deploy infrastructure
- `debugging` — Debug an issue

## Project Structure

```
your-project/
├── .ai/
│   ├── process.yaml    # Current process state
│   └── history.yaml    # Immutable event log
├── docs/
│   ├── PROCESS.md      # Generated documentation
│   └── PROCESS.mmd     # Mermaid diagram
└── templates/          # Process templates (optional)
```

## What Gets Tracked

### Steps
- Name, description, status
- Inputs and outputs
- Validation checks

### Decisions
- Question asked
- Choice made
- Rationale

### Risks
- Risk description
- Impact level
- Mitigation strategy
- Status

### Evidence
- Commands run
- Files created/modified
- URLs referenced
- Notes

### Missing Items
Automatically detected gaps:
- No step outputs documented
- No evidence recorded
- No decisions logged
- No risk assessment done
- No rollback procedure defined
- No validation/testing step

## Example Output

### PROCESS.md

```markdown
# Process: Add Authentication
> **Goal:** Implement user authentication with JWT
> **Status:** 🔄 In Progress

**Progress:** 2/4 steps completed

## Steps
| # | Step | Status | Inputs | Outputs |
|---|------|--------|--------|---------|
| 1 | Design auth flow | ✅ | requirements | auth flow diagram |
| 2 | Implement JWT | ✅ | flow diagram | auth module |
| 3 | Add tests | 🔄 | auth module | - |
| 4 | Document API | ⏳ | - | - |

## Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| JWT vs Sessions? | JWT | Stateless, scalable |

## What's Missing
- [ ] No rollback procedure defined
- [ ] No security considerations noted
```

## Configuration

Create `.procside.yaml` in your project root:

```yaml
output:
  markdown: docs/PROCESS.md
  mermaid: docs/PROCESS.mmd

quality_gates:
  require_outputs: true
  require_evidence: true
  require_rollback: true
  require_validation: true
```

## Development

```bash
# Clone the repo
git clone https://github.com/your-org/procside.git
cd procside

# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/index.js --help

# Run tests
npm test
```

## Roadmap

### v0.4.0 - Team Features
- Multi-agent process merging
- Process templates marketplace
- Web dashboard for visualization

### v0.5.0 - Advanced
- CI/CD plugins (GitHub Actions, GitLab CI)
- Process analytics and metrics
- Custom gate definitions

## License

MIT
