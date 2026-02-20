# Active Context

## Current State

**v0.5.0 Complete** - Multi-process support with registry, versioning, and MCP tools.

### v0.5.0 Multi-Process Progress
| Task | Status |
|------|--------|
| Registry types (ProcessRegistry, ProcessMeta, ProcessVersion) | ✅ Done |
| Registry storage functions | ✅ Done |
| CLI commands (list, switch, archive, restore, version, history) | ✅ Done |
| MCP server tools (16 tools total) | ✅ Done |
| Migration from single-process format | ✅ Done |
| Tests (95 tests passing) | ✅ Done |

## Multi-Process Architecture

```
.ai/
├── registry.yaml          # Process index and metadata
├── processes/             # Individual process files
│   ├── proc-001.yaml
│   └── proc-002.yaml
├── versions/              # Version snapshots
│   └── proc-001/
│       ├── v1.yaml
│       └── v2.yaml
└── history/               # Event logs
```

## New CLI Commands
- `procside list` - List all processes
- `procside switch <id>` - Switch active process
- `procside archive <id>` - Archive a process
- `procside restore <id>` - Restore archived process
- `procside version [note]` - Create version snapshot
- `procside history [id]` - View version history

## MCP Server Tools (16)
process_init, process_list, process_switch, process_status, process_add_step, process_step_start, process_step_complete, process_decide, process_risk, process_evidence, process_render, process_check, process_archive, process_restore, process_version, process_history

## Next Steps
1. Publish to npm registry (v0.5.1)
2. Set up CI/CD for automated releases
3. Consider dashboard multi-process visualization
4. Plan v0.6.0 features (team collaboration)

## Session Context

Working directory: `/home/hysas/agentic-workflow-documentation-framework`
GitHub: https://github.com/Hysas/procside

