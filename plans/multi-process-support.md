# Multi-Process Support Design

## Overview

This document outlines the architecture for supporting multiple processes in procside, enabling users to track, visualize, and evolve multiple workflows simultaneously.

## Use Cases

1. **Homelab Container Deployment** - Step-by-step guide for adding new containers that can be used offline
2. **Multiple Active Projects** - Track different processes across different projects
3. **Process Evolution** - Capture how processes change and improve over time
4. **Template-to-Instance Workflow** - Create process instances from reusable templates

## Current Architecture Limitations

| Limitation | Impact |
|------------|--------|
| Single `.ai/process.yaml` file | New process overwrites previous |
| No process registry | Cannot list or switch between processes |
| No versioning | Cannot track process evolution |
| Dashboard shows one process | No multi-process visualization |

## Proposed Architecture

### Storage Structure

```
.ai/
├── registry.yaml              # Process index and metadata
├── processes/
│   ├── proc-001.yaml         # Active process instance
│   ├── proc-002.yaml         # Another active process
│   └── archived/
│       ├── proc-003.yaml     # Completed/archived process
│       └── ...
├── templates/                 # Local template overrides
│   └── custom-deploy.yaml
├── history/
│   ├── global.yaml           # Global event log
│   └── proc-001.yaml         # Per-process history
└── versions/
    └── proc-001/
        ├── v1-initial.yaml   # Process snapshots
        ├── v2-added-step.yaml
        └── ...
```

### Process Registry Schema

```yaml
# .ai/registry.yaml
version: 1
processes:
  - id: proc-001
    name: Add Container to Homelab
    goal: Deploy a new Docker container with proper configuration
    status: in_progress
    template: infra-deploy
    createdAt: 2026-02-10T10:00:00Z
    updatedAt: 2026-02-16T15:30:00Z
    progress: 65
    tags: [homelab, docker, infrastructure]
    archived: false
    
  - id: proc-002
    name: Feature - OAuth Integration
    goal: Add Google OAuth authentication
    status: completed
    template: feature-add
    createdAt: 2026-02-14T09:00:00Z
    updatedAt: 2026-02-15T16:00:00Z
    progress: 100
    tags: [feature, auth]
    archived: false

  - id: proc-003
    name: Bug Fix - API Timeout
    goal: Fix timeout issues in API calls
    status: completed
    template: bugfix
    createdAt: 2026-02-12T14:00:00Z
    updatedAt: 2026-02-12T18:00:00Z
    progress: 100
    tags: [bugfix, api]
    archived: true
    archivedAt: 2026-02-13T10:00:00Z

templates:
  - id: infra-deploy
    name: Infrastructure Deployment
    source: builtin
    lastUsed: 2026-02-16T15:30:00Z
    usageCount: 5
    
  - id: custom-deploy
    name: Custom Homelab Deploy
    source: local
    path: templates/custom-deploy.yaml
    lastUsed: 2026-02-10T10:00:00Z
    usageCount: 2
```

### Process Versioning

Each process can have multiple versions to track evolution:

```yaml
# .ai/versions/proc-001/v1-initial.yaml
version: 1
snapshotAt: 2026-02-10T10:00:00Z
reason: Initial process creation
process:
  id: proc-001
  name: Add Container to Homelab
  steps:
    - id: s1
      name: Plan container requirements
      status: pending
    - id: s2
      name: Create docker-compose.yml
      status: pending

# .ai/versions/proc-001/v2-added-step.yaml
version: 2
snapshotAt: 2026-02-12T14:00:00Z
reason: Added health check step after learning from issues
process:
  id: proc-001
  name: Add Container to Homelab
  steps:
    - id: s1
      name: Plan container requirements
      status: completed
    - id: s2
      name: Create docker-compose.yml
      status: in_progress
    - id: s3
      name: Configure health checks  # NEW STEP
      status: pending
```

### Type Definitions

```typescript
// src/types/registry.ts
export interface ProcessRegistry {
  version: number;
  processes: ProcessMeta[];
  templates: TemplateMeta[];
}

export interface ProcessMeta {
  id: string;
  name: string;
  goal: string;
  status: ProcessStatus;
  template?: string;
  createdAt: string;
  updatedAt: string;
  progress: number;
  tags: string[];
  archived: boolean;
  archivedAt?: string;
}

export interface TemplateMeta {
  id: string;
  name: string;
  source: 'builtin' | 'local' | 'remote';
  path?: string;
  lastUsed: string;
  usageCount: number;
}

export interface ProcessVersion {
  version: number;
  snapshotAt: string;
  reason: string;
  process: Process;
}
```

## Dashboard UI Design

### Home View - Process List

```
┌─────────────────────────────────────────────────────────────────────────┐
│  procside dashboard                              [New Process] [⚙️]    │
├─────────────────────────────────────────────────────────────────────────┤
│  Filters: [All ▼] [Active] [Completed] [Archived]    Search: [____]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Active Processes (2)                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🔄 Add Container to Homelab                                        │ │
│  │ Goal: Deploy a new Docker container with proper configuration      │ │
│  │ ─────────────────────────────────────────────────────────────────  │ │
│  │ Progress: 65% ████████████░░░░░░░░  13/20 steps                   │ │
│  │ Template: infra-deploy    Tags: homelab, docker                   │ │
│  │ Last updated: 5 mins ago                                          │ │
│  │ [View Details] [Create Version] [Archive]                         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ ⏳ API Rate Limiting Implementation                                │ │
│  │ Goal: Add rate limiting to public API endpoints                   │ │
│  │ ─────────────────────────────────────────────────────────────────  │ │
│  │ Progress: 0% ░░░░░░░░░░░░░░░░░░░░  0/8 steps                      │ │
│  │ Template: feature-add    Tags: api, security                      │ │
│  │ Last updated: 2 hours ago                                         │ │
│  │ [View Details] [Start Process] [Edit]                             │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Completed (3) ▼                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ ✅ OAuth Integration                              Completed Feb 15 │ │
│  │ Goal: Add Google OAuth authentication                             │ │
│  │ [View Details] [Clone as New] [Export]                            │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Process Detail View

Same as current dashboard but with additional header:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back to Processes    Add Container to Homelab                        │
│  Status: In Progress    Progress: 65%    Version: 3                     │
│  [Edit Process] [Create Version] [Clone] [Archive]                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ... existing dashboard content ...                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Version History View

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Version History: Add Container to Homelab                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  v3 (current) - Feb 16, 2026                                           │
│  Reason: Added network isolation step for security                      │
│  Changes: +1 step, 2 steps completed                                    │
│  [View Full] [Compare with Previous]                                    │
│                                                                          │
│  v2 - Feb 12, 2026                                                      │
│  Reason: Added health check step after learning from issues            │
│  Changes: +1 step, 1 step completed                                     │
│  [View Full] [Compare with Previous] [Restore]                          │
│                                                                          │
│  v1 - Feb 10, 2026                                                      │
│  Reason: Initial process creation                                       │
│  Changes: Process created from template infra-deploy                    │
│  [View Full] [Restore]                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## CLI Commands

### New Commands

| Command | Description |
|---------|-------------|
| `procside list` | List all processes |
| `procside switch <id>` | Set active process |
| `procside archive <id>` | Archive a completed process |
| `procside restore <id>` | Restore archived process |
| `procside clone <id>` | Clone process as new instance |
| `procside version <id> --note "reason"` | Create version snapshot |
| `procside history <id>` | Show version history |
| `procside export <id>` | Export process as standalone file |
| `procside import <file>` | Import process from file |

### Updated Commands

| Command | Changes |
|---------|---------|
| `procside init` | Creates new process in registry, auto-switches to it |
| `procside status` | Shows active process, option `--all` for all processes |
| `procside step` | Operates on active process, option `--process <id>` |
| `procside dashboard` | Shows process list by default, option `--process <id>` for detail |

### Command Examples

```bash
# List all processes
procside list
# Output:
#   proc-001  Add Container to Homelab     in_progress  65%
#   proc-002  OAuth Integration            completed    100%
# * proc-003  API Rate Limiting            planned      0%

# Create new process from template
procside init --template infra-deploy --name "Deploy Grafana"

# Switch active process
procside switch proc-001

# Create version snapshot
procside version proc-001 --note "Added monitoring step"

# View version history
procside history proc-001

# Clone completed process as new instance
procside clone proc-002 --name "Add GitHub OAuth"

# Archive completed process
procside archive proc-002

# Export for offline use
procside export proc-001 --output homelab-container-guide.md
```

## Implementation Phases

### Phase 1: Registry and Storage (v0.5.0)

- [ ] Create `ProcessRegistry` type definitions
- [ ] Implement `registry.ts` storage module
- [ ] Update `process-store.ts` for multi-process support
- [ ] Add process ID generation
- [ ] Migrate existing `.ai/process.yaml` to new structure
- [ ] Update all CLI commands to use registry

### Phase 2: Dashboard Multi-Process View (v0.5.0)

- [ ] Create process list template
- [ ] Update server to serve process list at `/`
- [ ] Move current dashboard to `/process/:id`
- [ ] Add process switching in UI
- [ ] Watch entire `.ai/processes/` directory

### Phase 3: Version History (v0.6.0)

- [ ] Implement version snapshot storage
- [ ] Add `procside version` command
- [ ] Add `procside history` command
- [ ] Create version comparison view
- [ ] Add version restore functionality

### Phase 4: Process Evolution Tracking (v0.6.0)

- [ ] Track step changes between versions
- [ ] Calculate diff between versions
- [ ] Show evolution timeline in dashboard
- [ ] Export process with full history

### Phase 5: Template Management (v0.7.0)

- [ ] Local template storage
- [ ] Template usage tracking
- [ ] Create template from process
- [ ] Template inheritance

## Migration Path

### From v0.4.0 to v0.5.0

1. On first run with new version, detect old `.ai/process.yaml`
2. Create `.ai/processes/` directory
3. Move existing process to `.ai/processes/proc-001.yaml`
4. Create `.ai/registry.yaml` with single entry
5. Create initial version snapshot

```typescript
// Migration logic in storage module
function migrateToMultiProcess(): void {
  const oldPath = '.ai/process.yaml';
  const newDir = '.ai/processes';
  
  if (fs.existsSync(oldPath) && !fs.existsSync(newDir)) {
    fs.mkdirSync(newDir, { recursive: true });
    fs.mkdirSync('.ai/versions/proc-001', { recursive: true });
    
    const proc = loadOldProcess(oldPath);
    proc.id = 'proc-001';
    
    fs.renameSync(oldPath, `${newDir}/proc-001.yaml`);
    createRegistryWithEntry(proc);
    createVersionSnapshot('proc-001', proc, 'Migrated from single-process format');
  }
}
```

## Open Questions

1. **Process ID format** - Use sequential IDs (proc-001) or UUIDs?
2. **Concurrent access** - How to handle multiple agents updating same process?
3. **Remote sync** - Should processes sync to a remote server?
4. **Process templates from registry** - Allow creating templates from completed processes?

## Next Steps

1. Review and approve this design
2. Create detailed implementation tickets for Phase 1
3. Begin with registry storage module
