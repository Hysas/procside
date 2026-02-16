# procside

Process-first agent collaboration framework - A CLI tool that documents AI agent workflows as structured process artifacts.

## Project Overview

procside sits alongside CLI agents like Claude Code and Codex, capturing what they do and modeling it into a structured "process graph" with steps, decisions, risks, and evidence. It renders human-friendly documentation continuously and helps spot what's missing.

## Tech Stack

- **Language:** TypeScript (ES Modules)
- **Runtime:** Node.js 18+
- **CLI Framework:** commander
- **YAML Parsing:** yaml
- **Logging:** winston
- **Config:** .procside.yaml with env var overrides
- **Build:** tsc (TypeScript compiler)
- **Test:** vitest

## Code Style

- Use ES Modules (`import`/`export`)
- File extensions must include `.js` in imports (e.g., `from './foo.js'`)
- No comments unless explicitly requested
- Use `const` for variables, avoid `let` unless necessary
- Prefer arrow functions
- Use TypeScript strict mode

## Project Structure

```
src/
├── index.ts              # CLI entry point (commander)
├── config.ts             # Configuration loader
├── logger.ts             # Winston logger setup
├── types/                # Type definitions
├── storage/              # YAML persistence layer
├── parser/               # [PROCESS_UPDATE] block parsing
├── cli/commands/         # CLI command implementations
└── renderers/            # Markdown, Mermaid, Checklist output

templates/                # Process templates (YAML)
.ai/                      # Runtime data (gitignored)
docs/                     # Generated documentation
```

## Key Files

- `src/index.ts` - CLI entry point with all commander commands
- `src/storage/process-store.ts` - Core process persistence and update logic
- `src/parser/update-parser.ts` - Parses [PROCESS_UPDATE] blocks from agent output
- `src/renderers/markdown.ts` - Generates PROCESS.md
- `src/renderers/mermaid.ts` - Generates Mermaid flowcharts

## Commands to Run

```bash
npm run build      # Compile TypeScript
npm run dev        # Watch mode
npm test           # Run tests (vitest)
node dist/index.js # Run CLI directly
```

## Architecture Decisions

1. **YAML for storage** - Human-readable, version-controllable, .ai/process.yaml
2. **Append-only history** - .ai/history.yaml never loses information
3. **CLI wrapper approach** - Can wrap any agent command via `procside run`
4. **Template-based initialization** - Pre-defined workflows in templates/
5. **Self-documenting** - PROCESS.md is both human and AI readable

## CLI Commands

| Command | Description |
|---------|-------------|
| `init [--template <name>]` | Initialize process tracking |
| `add-step <name>` | Add a step to the process |
| `step <id> --status <status>` | Update step status |
| `decide <question> <choice>` | Record a decision |
| `risk <description>` | Identify a risk |
| `evidence <type> <value>` | Record evidence |
| `status` | Show current process |
| `render` | Generate PROCESS.md and Mermaid |
| `templates` | List available templates |
| `config` | Show/manage configuration |

## Process Update Protocol

Agents emit [PROCESS_UPDATE] blocks:

```
[PROCESS_UPDATE]
action: step_complete
step_id: s1
outputs:
  - file.ts
[/PROCESS_UPDATE]
```

Actions: `process_start`, `process_update`, `step_add`, `step_start`, `step_complete`, `step_fail`, `decision`, `risk`, `evidence`, `missing`

## Configuration

- Config file: `.procside.yaml`
- Environment variables: `PROCSIDE_*` (e.g., `PROCSIDE_ENV=production`)
- Precedence: env vars > config file > defaults

## When Adding New Features

1. Add types in `src/types/` if needed
2. Implement logic in appropriate module
3. Add CLI command in `src/index.ts` if user-facing
4. Update renderers if output format changes
5. Run `npm run build` to verify compilation
6. Test with `node dist/index.js <command>`

## Known Issues / Gotchas

- Mermaid labels must be quoted to handle parentheses - use `["label"]` format
- ES Modules require `.js` extension in import paths even for `.ts` files
- The word `process` is a Node.js global - use `proc` as variable name to avoid conflicts
