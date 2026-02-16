# Claude Test Prompt for procside v0.5.0

Copy and paste this prompt to Claude to test the multi-process features with live dashboard updates.

---

## Prompt to Copy

```
I want you to help me test procside's multi-process features. Please perform the following tasks while I watch the dashboard at http://localhost:3456

First, start the dashboard in the background:
1. Run: cd /tmp/procside-live-demo && node /home/hysas/agentic-workflow-documentation-framework/dist/index.js dashboard --port 3456

Then perform these tasks in order, waiting 3-5 seconds between each step so I can see the dashboard update:

## Process 1: Feature Development
1. Initialize a new process: "Feature: Dark Mode" with goal "Add dark mode support to the application"
2. Add steps:
   - "Research design requirements"
   - "Create color palette"
   - "Implement CSS variables"
   - "Add toggle switch"
   - "Test across browsers"
3. Start the first step (mark as in_progress)
4. Complete the first step and add output: "Design requirements documented"
5. Record evidence: note "Researched Material Design dark theme guidelines"
6. Move to the next step and mark it in_progress
7. Complete that step with output: "Color palette defined"

## Process 2: Bug Fix (parallel process)
8. Create a second process: "Bug: Login Timeout" with goal "Fix the login session timeout issue"
9. Add steps:
   - "Reproduce the bug"
   - "Identify root cause"
   - "Implement fix"
   - "Add regression test"
10. Start and complete the first step with output: "Bug reproduced in test environment"
11. Record a decision: "Session timeout" -> "Increase to 30 minutes" with rationale "Users reported 5 min timeout too short"

## Switch Between Processes
12. Switch back to the first process (proc-001)
13. Show me the status of both processes using the list command

## Version and Archive
14. Create a version snapshot of proc-001 with note "Dark mode design complete"
15. View the version history
16. Archive the bug fix process (proc-002)
17. List all processes including archived

## Final Steps
18. Restore the archived process
19. Show final status of all processes

Please execute each command and tell me what you're doing so I can follow along on the dashboard.
```

---

## What You Should See on the Dashboard

As Claude executes each command, you should see:

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
