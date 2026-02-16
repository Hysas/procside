# Claude Test Prompt for procside v0.5.0

This document provides a prompt to give Claude a real task using procside MCP tools.

---

## Setup (Run First)

Before giving the prompt to Claude, run the setup script:

```bash
cd /home/hysas/agentic-workflow-documentation-framework
./scripts/setup-test-env.sh /tmp/procside-test 3456
```

This will:
1. Create a test directory
2. Build procside
3. Create MCP configuration files
4. Initialize a process
5. Start the dashboard

Then open Claude Code in the test directory:
```bash
cd /tmp/procside-test
claude
```

---

## Prompt to Copy

```
I need you to help me plan and track two parallel work streams using procside. 

The procside MCP server is available for you to track your work. Here's what each tool does:

**Process Management:**
- `process_init` - Start a new process (provide name and goal)
- `process_list` - See all processes
- `process_switch` - Switch to a different process by ID
- `process_status` - Check current progress
- `process_archive` - Archive a completed process
- `process_restore` - Bring back an archived process

**Step Tracking:**
- `process_add_step` - Add a step to the current process
- `process_step_start` - Mark a step as in progress
- `process_step_complete` - Mark a step done with outputs

**Documentation:**
- `process_decide` - Record a decision (question, choice, rationale)
- `process_risk` - Note a risk (description, impact level)
- `process_evidence` - Record proof of work (command, file, url, or note)
- `process_version` - Create a snapshot of current state
- `process_history` - View past versions

**Output:**
- `process_render` - Generate Markdown/Mermaid docs
- `process_check` - Run quality gates

---

Here's what I need you to work on:

**Work Stream 1: Add Dark Mode Feature**
Plan and execute the implementation of a dark mode theme for a web application. Consider the full lifecycle from research through deployment.

**Work Stream 2: Fix Login Session Timeout**
Users are reporting that they get logged out after 5 minutes of inactivity. Investigate and fix this issue.

---

Please use the procside tools to track your work on both of these. I want to see how you break down the work, make decisions, and track progress. Take your time between actions (a few seconds) so the dashboard can update.
```

---

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
# Stop the dashboard
kill $(cat /tmp/procside-test/.dashboard.pid)

# Remove test directory
rm -rf /tmp/procside-test
```
