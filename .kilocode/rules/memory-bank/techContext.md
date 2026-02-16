# Tech Context

## Technology Stack

### Core
- **TypeScript 5.3+** - Strict mode enabled, ES2022 target
- **Node.js 18+** - ES Modules, native fetch
- **ES Modules** - `type: "module"` in package.json

### Dependencies
- **commander** - CLI framework with subcommands
- **yaml** - YAML parsing and serialization
- **winston** - Structured logging with transports
- **chalk** - Terminal colors (optional, dev)
- **ora** - Progress spinners (optional, dev)

### Dev Dependencies
- **typescript** - tsc compiler
- **vitest** - Test framework
- **@types/node** - Node.js type definitions

## Build System

```bash
npm run build    # tsc → dist/
npm run dev      # tsc --watch
npm test         # vitest
```

## Key Dependencies Rationale

| Dependency | Why Chosen |
|------------|------------|
| commander | Industry standard CLI framework, good subcommand support |
| yaml | Pure JS, ESM compatible, better than js-yaml for our use |
| winston | Mature logging, multiple transports, already in project |
| vitest | Fast, ESM native, Jest-compatible API |

## Environment Variables

```bash
PROCSIDE_ENV          # development | production
PROCSIDE_LOG_LEVEL    # debug | info | warn | error
PROCSIDE_SILENT       # true | false
PROCSIDE_ARTIFACT_DIR # default: .ai
```

## Configuration File

`.procside.yaml`:
```yaml
environment: development
artifactDir: .ai
logLevel: info
silent: false
defaultFormat: all
autoEvidence: true
```

## File Structure Conventions

- `src/` - Source code
- `dist/` - Compiled output (gitignored)
- `templates/` - Process templates
- `.ai/` - Runtime data (gitignored)
- `docs/` - Generated documentation

## Known Technical Debt

1. **No tests yet** - vitest configured but no test files
2. **Parser is fragile** - Could be more resilient to malformed blocks
3. **No MCP integration** - Still uses text parsing instead of tool calls
4. **Template discovery** - Hardcoded paths, could be more dynamic

## Performance Considerations

- YAML parsing is fast for our file sizes
- History can grow large - consider rotation
- No caching needed for CLI use case
