# Product Context

## What Problem Does This Solve?

AI coding agents (Claude Code, Codex, etc.) work in isolation - each session starts with zero context about:
- What work was done previously
- What decisions were made and why
- What's still missing or incomplete

This leads to:
- Re-explaining the project every session
- Inconsistent approaches across sessions
- Lost decision rationale
- No visibility into agent reasoning

## Solution

**procside** is a "process sidecar" that:
1. **Captures** agent activity as structured process data
2. **Models** work as steps, decisions, risks, evidence
3. **Renders** human-readable documentation (Markdown, Mermaid)
4. **Checks** for gaps and missing items

## Target Users

- Developers using AI coding assistants (Claude Code, Codex)
- Teams who want visibility into AI agent work
- Projects requiring audit trails of AI decisions
- Anyone wanting to understand "what did the AI do?"

## Core Features

### Process Tracking
- Steps with inputs, outputs, checks
- Status tracking (pending, in_progress, completed, failed)
- Automatic progress calculation

### Decision Logging
- Question asked
- Choice made
- Rationale preserved

### Risk Management
- Risk identification
- Impact assessment
- Mitigation strategies

### Evidence Collection
- Commands run
- Files created/modified
- URLs referenced
- Notes captured

### Gap Detection
- Missing validations
- Missing rollback plans
- Missing security considerations
- Missing documentation

### Template System
- Pre-defined workflows (feature-add, bugfix, refactor, etc.)
- Customizable process templates
- Quick project initialization

## Vision

Make AI agent work **transparent, auditable, and understandable**:
- Every session documented automatically
- Decisions preserved for future reference
- Process quality enforceable
- Human-friendly output for review
