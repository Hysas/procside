# Claude Test Prompt for procside v0.5.0

Copy and paste this prompt to Claude to test the multi-process features with live dashboard updates.

**IMPORTANT: This prompt uses MCP tools, not bash commands. Make sure procside MCP server is configured.**

---

## Prompt to Copy

```
I want you to help me test procside's multi-process features using the MCP tools. 

The dashboard is already running at http://localhost:3456 - I'll watch it while you perform tasks.

Use the procside MCP tools to perform these tasks. Wait 3-5 seconds between each step so I can see the dashboard update.

## Process 1: Feature Development
1. Use process_init to create: name="Feature: Dark Mode", goal="Add dark mode support to the application"
2. Use process_add_step to add step: name="Research design requirements"
3. Use process_add_step to add step: name="Create color palette"  
4. Use process_add_step to add step: name="Implement CSS variables"
5. Use process_add_step to add step: name="Add toggle switch"
6. Use process_add_step to add step: name="Test across browsers"
7. Use process_step_start to mark step "s1" as in_progress
8. Use process_step_complete to complete step "s1" with outputs=["Design requirements documented"]
9. Use process_evidence to record: type="note", value="Researched Material Design dark theme guidelines"
10. Use process_step_start to mark step "s2" as in_progress
11. Use process_step_complete to complete step "s2" with outputs=["Color palette defined"]

## Process 2: Bug Fix (parallel process)
12. Use process_init to create: name="Bug: Login Timeout", goal="Fix the login session timeout issue"
13. Use process_add_step to add step: name="Reproduce the bug"
14. Use process_add_step to add step: name="Identify root cause"
15. Use process_add_step to add step: name="Implement fix"
16. Use process_add_step to add step: name="Add regression test"
17. Use process_step_start to mark step "s1" as in_progress
18. Use process_step_complete to complete step "s1" with outputs=["Bug reproduced in test environment"]
19. Use process_decide to record: question="Session timeout duration?", choice="Increase to 30 minutes", rationale="Users reported 5 min timeout too short"

## Switch Between Processes
20. Use process_list to show all processes
21. Use process_switch to switch back to proc-001
22. Use process_status to show current process

## Version and Archive
23. Use process_version to create snapshot with description="Dark mode design complete"
24. Use process_history to view version history
25. Use process_archive to archive proc-002
26. Use process_list to show all processes (should show proc-002 as archived)

## Final Steps
27. Use process_restore to restore proc-002
28. Use process_list to show final state of all processes

Please use the MCP tools for each step and tell me what you're doing so I can follow along on the dashboard.
```

---

## MCP Server Configuration

Make sure the procside MCP server is configured in your Claude Code settings:

```json
{
  "mcpServers": {
    "procside": {
      "command": "node",
      "args": ["/home/hysas/agentic-workflow-documentation-framework/dist/mcp-server.js"]
    }
  }
}
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `process_init` | Initialize a new process |
| `process_list` | List all processes |
| `process_switch` | Switch active process |
| `process_status` | Get process status |
| `process_add_step` | Add a step |
| `process_step_start` | Mark step in progress |
| `process_step_complete` | Mark step completed |
| `process_decide` | Record a decision |
| `process_risk` | Identify a risk |
| `process_evidence` | Record evidence |
| `process_render` | Generate documentation |
| `process_check` | Run quality gates |
| `process_archive` | Archive a process |
| `process_restore` | Restore archived process |
| `process_version` | Create version snapshot |
| `process_history` | View version history |

## What You Should See on the Dashboard

As Claude executes each MCP tool, you should see:

1. **Process list** update with new processes
2. **Steps** appear and change status (pending → in_progress → completed)
3. **Progress bar** update as steps complete
4. **Evidence** appear in the evidence feed
5. **Decisions** show up in the decisions panel
6. **Version history** when snapshots are created
7. **Archive/restore** status changes

## Dashboard URL

The dashboard will be available at: **http://localhost:3456**

## Cleanup After Test

```bash
# Stop the dashboard (Ctrl+C in the terminal)
# Remove test directory
rm -rf /tmp/procside-live-demo
```
