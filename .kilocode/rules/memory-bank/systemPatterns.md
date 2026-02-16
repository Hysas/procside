# System Patterns

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      procside CLI                            │
├─────────────────────────────────────────────────────────────┤
│  Commands: init, status, render, step, decide, risk, etc.   │
├─────────────────────────────────────────────────────────────┤
│                        Parser                                │
│  Extracts [PROCESS_UPDATE] blocks from agent output         │
├─────────────────────────────────────────────────────────────┤
│                       Storage                                │
│  .ai/process.yaml (state) + .ai/history.yaml (events)       │
├─────────────────────────────────────────────────────────────┤
│                      Renderers                               │
│  Markdown → PROCESS.md | Mermaid → PROCESS.mmd              │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Patterns

### 1. Append-Only Event Log
- `history.yaml` never modifies existing entries
- Each `[PROCESS_UPDATE]` creates a new history entry
- Enables replay, auditing, and undo

### 2. Single Source of Truth
- `process.yaml` is the authoritative state
- All reads go through `loadProcess()`
- All writes go through `saveProcess()`

### 3. CLI Wrapper Pattern
- `procside run "claude code"` spawns agent as subprocess
- Captures stdout/stderr
- Parses for `[PROCESS_UPDATE]` blocks
- Updates process in real-time

### 4. Template-Based Initialization
- Templates in `templates/*.yaml`
- Contain pre-defined steps and risks
- Loaded via `init --template <name>`

### 5. Renderer Separation
- Multiple output formats (md, mermaid, checklist)
- Same process data, different presentations
- Easy to add new renderers

## Data Flow

```
Agent Output
     │
     ▼
[PROCESS_UPDATE] blocks ──► Parser ──► ProcessUpdate[]
                                    │
                                    ▼
                              applyUpdate()
                                    │
                                    ▼
                            process.yaml
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              status cmd      render cmd      history.yaml
                    │               │
                    ▼               ▼
              CLI output      PROCESS.md
                              PROCESS.mmd
```

## Module Relationships

```
src/index.ts
    ├── cli/commands/
    │   ├── init.ts ──────► templates/
    │   ├── run.ts ───────► parser/
    │   ├── status.ts ────► storage/
    │   └── render.ts ────► renderers/
    │
    ├── storage/
    │   ├── process-store.ts ◄── types/
    │   └── history.ts
    │
    ├── parser/
    │   └── update-parser.ts
    │
    └── renderers/
        ├── markdown.ts
        ├── mermaid.ts
        └── checklist.ts
```

## Critical Constraints

1. **ES Modules** - Must use `.js` extensions in imports
2. **YAML compatibility** - Labels must be safe for YAML parsing
3. **Mermaid escaping** - Parentheses in labels must be quoted
4. **Process global conflict** - Use `proc` variable name, not `process`
5. **Config precedence** - env vars > config file > defaults
