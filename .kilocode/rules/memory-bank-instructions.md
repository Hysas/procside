# Memory Bank Instructions

Memory Bank provides structured context recovery for AI coding assistants. This file instructs how to maintain the memory bank.

## Memory Bank Structure

The memory bank is located at `.kilocode/rules/memory-bank/` and contains:

- `brief.md` - Project overview and quick context
- `productContext.md` - What we're building and why
- `systemPatterns.md` - Architecture and design patterns
- `techContext.md` - Technologies, dependencies, constraints
- `activeContext.md` - Current work, decisions, next steps
- `progress.md` - What's done, what's remaining, known issues

## When to Update Memory Bank

Update the memory bank when:
1. **Major feature completion** - Record what was built and how
2. **Architecture decisions** - Document why choices were made
3. **Pattern discoveries** - Note reusable patterns or gotchas
4. **User corrections** - Incorporate feedback into context
5. **Milestone completion** - Mark progress and plan next steps

## How to Update

Use the command: `update memory bank` followed by what to update.

Examples:
- `update memory bank, add that we chose winston for logging`
- `update memory bank, mark feature-add template as complete`
- `update memory bank, note the mermaid quoting issue`

## File Purposes

### brief.md
Quick project summary for rapid context recovery. Should be readable in 30 seconds.

### productContext.md
- What problem does this solve?
- Who is the target user?
- What are the core features?
- What is the vision for the project?

### systemPatterns.md
- Architecture overview
- Key design patterns used
- Data flow diagrams
- Module relationships
- Critical constraints

### techContext.md
- Technology stack details
- Key dependencies and why they were chosen
- Build/run commands
- Environment requirements
- Known technical debt

### activeContext.md
- What are we working on right now?
- Recent decisions and their rationale
- Active issues or blockers
- What needs to happen next?

### progress.md
- Completed features checklist
- In-progress work
- Known bugs or issues
- Future roadmap items
