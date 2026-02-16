# procside v0.5.0 Test Guide

This guide walks you through testing the new multi-process support features.

## Prerequisites

```bash
# Build the project
npm run build

# Verify CLI works
node dist/index.js --help
```

## Test 1: Initialize Multiple Processes

### Step 1: Create a test directory
```bash
mkdir -p /tmp/procside-test
cd /tmp/procside-test
```

### Step 2: Initialize first process
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js init --name "Feature: User Auth" --goal "Add user authentication"
```

**Expected output:**
```
Process initialized: proc-001
Name: Feature: User Auth
Goal: Add user authentication
```

### Step 3: Check the registry was created
```bash
cat .ai/registry.yaml
```

**Expected output:**
```yaml
version: 1
activeProcessId: proc-001
processes:
  - id: proc-001
    name: Feature: User Auth
    ...
```

### Step 4: Initialize a second process
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js init --name "Bug: API Timeout" --goal "Fix timeout issues"
```

**Expected output:**
```
Process initialized: proc-002
```

## Test 2: List Processes

### Step 1: List all processes
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js list
```

**Expected output:**
```
Processes:

* 🔄 proc-001  Feature: User Auth
     Goal: Add user authentication
     Progress: 0%  Status: planned

  🔄 proc-002  Bug: API Timeout
     Goal: Fix timeout issues
     Progress: 0%  Status: planned
```

### Step 2: List with JSON output
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js list --json
```

## Test 3: Add Steps and Switch Between Processes

### Step 1: Add steps to first process
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js add-step "Design auth flow"
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js add-step "Implement JWT"
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js add-step "Add tests"
```

### Step 2: Check status
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js status
```

### Step 3: Switch to second process
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js switch proc-002
```

**Expected output:**
```
Switched to process: Bug: API Timeout (proc-002)
```

### Step 4: Add steps to second process
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js add-step "Reproduce issue"
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js add-step "Fix timeout"
```

### Step 5: Verify list shows both processes with steps
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js list
```

## Test 4: Version Snapshots

### Step 1: Create a version snapshot
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js version "Initial planning complete"
```

**Expected output:**
```
Created version 1 of process: Bug: API Timeout
```

### Step 2: View version history
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js history
```

**Expected output:**
```
Version History: Bug: API Timeout (proc-002)

  v1 (current) - [date]
    Initial planning complete
```

### Step 3: Check version file exists
```bash
ls -la .ai/versions/proc-002/
```

## Test 5: Archive and Restore

### Step 1: Switch back to first process
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js switch proc-001
```

### Step 2: Archive the second process
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js archive proc-002
```

**Expected output:**
```
Archived process: Bug: API Timeout (proc-002)
```

### Step 3: List active processes (should show only proc-001)
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js list
```

### Step 4: List all processes including archived
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js list --all
```

**Expected output:**
```
Processes:

* 🔄 proc-001  Feature: User Auth
     ...

  🔄 proc-002  Bug: API Timeout
     ...
     Progress: 0%  Status: planned (archived)
```

### Step 5: Restore the archived process
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js restore proc-002
```

**Expected output:**
```
Restored process: Bug: API Timeout (proc-002)
```

## Test 6: MCP Server

### Step 1: Test MCP server starts
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node /home/hysas/agentic-workflow-documentation-framework/dist/mcp-server.js
```

**Expected output:** JSON response with 16 tools listed

### Step 2: Test process_list tool
```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"process_list","arguments":{}}}' | node /home/hysas/agentic-workflow-documentation-framework/dist/mcp-server.js
```

## Test 7: Migration from Single-Process

### Step 1: Create an old-style single process
```bash
mkdir -p /tmp/procside-migration-test
cd /tmp/procside-migration-test

# Create old-style process.yaml
cat > .ai/process.yaml << 'EOF'
name: Legacy Process
goal: Test migration
status: planned
steps:
  - id: s1
    name: First step
    status: pending
    inputs: []
    outputs: []
    checks: []
decisions: []
risks: []
evidence: []
EOF
```

### Step 2: Run any command to trigger migration
```bash
node /home/hysas/agentic-workflow-documentation-framework/dist/index.js list
```

**Expected output:**
```
Migrating to multi-process format...
Migration complete.

Processes:

* 🔄 proc-001  Legacy Process
     ...
```

### Step 3: Verify new structure
```bash
ls -la .ai/
```

**Expected files:**
- `registry.yaml`
- `processes/proc-001.yaml`
- `versions/proc-001/v1.yaml`

## Cleanup

```bash
rm -rf /tmp/procside-test
rm -rf /tmp/procside-migration-test
```

## Summary

If all tests pass, you've verified:
- ✅ Multi-process initialization
- ✅ Process listing and switching
- ✅ Version snapshots and history
- ✅ Archive and restore
- ✅ MCP server with 16 tools
- ✅ Migration from single-process format
