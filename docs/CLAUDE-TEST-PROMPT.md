# Claude Test Prompt for procside v0.5.0

Copy and paste this prompt to Claude to test the multi-process features with live dashboard updates.

---

## Prompt to Copy

```
I want you to help me test procside's multi-process features. 

The dashboard is running at http://localhost:3456 - I'll watch it while you work.

Please perform the following tasks, using the procside MCP tools to track your work. Wait 3-5 seconds between actions so I can see the dashboard update.

## Task 1: Feature Development Process
Create and work through a process for adding "Dark Mode" to an application:
- Create the process with an appropriate goal
- Break it down into logical steps (research, design, implement, test, deploy)
- Start working on the first step
- Complete it with some outputs
- Record evidence of your work
- Move to the next step and complete it

## Task 2: Bug Fix Process  
Create a separate process for fixing a "Login Timeout" bug:
- Create the process
- Add appropriate steps for a bug fix workflow
- Work through the first step
- Make a decision about the fix approach

## Task 3: Process Management
- Show me all processes
- Switch between them
- Create a version snapshot
- Archive one process, then restore it

Use whatever procside MCP tools are appropriate for each task. Explain what you're doing as you go.
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

## Available MCP Tools (for reference)

| Tool | Description |
|------|-------------|
| `process_init` | Initialize a new process with name and goal |
| `process_list` | List all processes (optionally include archived) |
| `process_switch` | Switch active process by ID |
| `process_status` | Get current process status and progress |
| `process_add_step` | Add a new step with name, optional inputs/checks |
| `process_step_start` | Mark a step as in_progress |
| `process_step_complete` | Mark a step completed with outputs |
| `process_decide` | Record a decision with question, choice, rationale |
| `process_risk` | Identify a risk with description and impact |
| `process_evidence` | Record evidence (command, file, url, or note) |
| `process_render` | Generate Markdown and/or Mermaid documentation |
| `process_check` | Run quality gates on the process |
| `process_archive` | Archive a completed process |
| `process_restore` | Restore an archived process |
| `process_version` | Create a version snapshot with description |
| `process_history` | View version history of a process |

## What You Should See on the Dashboard

As Claude works, you should see:

1. **Process list** update with new processes
2. **Steps** appear and change status (pending → in_progress → completed)
3. **Progress bar** update as steps complete
4. **Evidence** appear in the evidence feed
5. **Decisions** show up in the decisions panel
6. **Version history** when snapshots are created
7. **Archive/restore** status changes

## Dashboard URL

The dashboard is available at: **http://localhost:3456**

## Cleanup After Test

```bash
# Stop the dashboard (Ctrl+C in the terminal)
# Remove test directory
rm -rf /tmp/procside-live-demo
```
