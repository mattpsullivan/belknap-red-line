# Agent Guidelines

Rules and best practices for AI agents working on this project.

---

## Project Context

**Read these files first to understand the project:**

| File | Purpose |
|------|---------|
| `REQUIREMENTS.md` | Product requirements, user stories, success metrics |
| `RESEARCH.md` | Trail data sources, GPS coordinate acquisition |
| `PLAN.md` | Implementation checklist, tech stack, UI spec - **update this as you work** |
| `AGENTS.md` | This file - agent rules and workflows |

**Environment:**
- All work happens inside the devcontainer
- Working directory inside container: `/workspace`
- Project uses: React 18, TypeScript, Vite, Tailwind, MapLibre, Dexie.js
- Testing: Vitest (unit/integration), Playwright (E2E)

**AI CLI Tools Available:**
- `claude` - Claude Code CLI (requires `ANTHROPIC_API_KEY`)
- `gemini` - Google Gemini CLI (requires `GEMINI_API_KEY` or Google account sign-in)

**Verify you're in the devcontainer:**
```bash
# Should show /workspace
pwd

# Should show node user
whoami

# Should show pnpm available
pnpm --version
```

If these checks fail, you are NOT in the devcontainer. Stop and ask the user to reopen in container.

---

## Devcontainer Setup

### Prerequisites

> **TODO:** Set up authentication for Claude Code and Gemini CLI (API keys not yet configured)

Before opening the project in the devcontainer, set these environment variables on your **host machine**:

```bash
# Required for Claude Code CLI
export ANTHROPIC_API_KEY="your-anthropic-api-key"

# Required for Gemini CLI (or sign in with Google account)
export GEMINI_API_KEY="your-gemini-api-key"
```

Add these to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) for persistence.

### Opening the Devcontainer

1. Open VS Code in the project directory
2. Install the "Dev Containers" extension if not already installed
3. Press `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"
4. Wait for the container to build (first time takes a few minutes)

### Rebuilding After Changes

If `.devcontainer/` files are modified:
1. Press `Ctrl+Shift+P` → "Dev Containers: Rebuild Container"

### Installed Tools

The devcontainer includes:
- **Node.js 22** with npm, pnpm
- **TypeScript** tooling (tsx, biome)
- **Claude Code CLI** (`claude`) - AI coding assistant
- **Gemini CLI** (`gemini`) - Google's AI assistant
- **GitHub CLI** (`gh`)
- **Docker-in-Docker** - for container operations inside the devcontainer
- **SQLite3** - for local database operations

---

## Core Principles

1. **Work incrementally** - Make small, focused changes that can be easily reviewed
2. **Communicate clearly** - Explain what you're doing and why before making changes
3. **Ask when uncertain** - Don't make assumptions about requirements or architecture
4. **Leave the codebase better** - Follow existing patterns, maintain consistency

---

## Mandatory Workflows

### 1. Plan Tracking

**Before every change:**
- Review `PLAN.md` to understand current phase and priorities
- Update the relevant checklist item to indicate work in progress

**After every change:**
- Mark completed items in `PLAN.md`
- Add any new items discovered during implementation
- Note any blockers or deviations from the plan

### 2. Test-Driven Development (TDD)

All code changes must follow TDD:

```
1. WRITE TEST FIRST
   - Create a test that verifies the expected behavior
   - Run the test and confirm it FAILS
   - This proves the test is actually testing something

2. IMPLEMENT CODE
   - Write the minimum code to make the test pass
   - Don't add functionality beyond what's tested

3. VERIFY TEST PASSES
   - Run the test suite
   - Confirm the new test passes
   - Confirm no existing tests broke

4. REFACTOR (if needed)
   - Clean up code while keeping tests green
   - Run tests after any refactoring
```

**Test commands:**
```bash
pnpm test           # Run all tests
pnpm test:watch     # Watch mode for TDD
pnpm test:coverage  # Coverage report
```

### 3. Environment Restrictions

**CRITICAL: Only work within the devcontainer.**

- Do NOT access or modify the host machine
- Do NOT install global packages outside the container
- Do NOT modify files outside `/workspace`

**If devcontainer changes are needed:**
1. STOP immediately
2. Explain what change is needed and why
3. Wait for explicit user permission
4. Only then modify `.devcontainer/` files

Examples requiring permission:
- Adding new system packages to Dockerfile
- Adding new services to docker-compose.yml
- Changing port mappings
- Modifying volume mounts

---

## Code Standards

### TypeScript
- Strict mode enabled
- Explicit return types on functions
- No `any` types without justification
- Prefer `interface` over `type` for object shapes

### React
- Functional components with hooks
- Props interfaces defined and exported
- Custom hooks for reusable logic
- Avoid prop drilling - use context when appropriate

### Testing
- Unit tests for utilities and hooks
- Integration tests for database operations
- E2E tests for critical user flows
- Mock external dependencies (GPS, maps)

### File Organization
- One component per file
- Co-locate tests with source (`Component.tsx` + `Component.test.tsx`)
- Barrel exports in `index.ts` only when beneficial

---

## Git Practices

### Commits
- Atomic commits (one logical change per commit)
- Conventional commit messages:
  ```
  feat: add trail completion modal
  fix: correct distance calculation
  test: add useProgress hook tests
  refactor: extract map utilities
  docs: update PLAN.md with phase 2 details
  ```

### Branches
- Work on feature branches, not main
- Branch naming: `feat/trail-map`, `fix/gps-accuracy`, `test/coverage`

---

## Communication Protocol

### Before Starting Work
1. State what you plan to do
2. Reference the relevant PLAN.md section
3. Ask clarifying questions if needed

### During Work
1. Announce each file you're creating/modifying
2. Explain non-obvious decisions
3. Stop and ask if you encounter unexpected issues

### After Completing Work
1. Summarize what was done
2. List any tests added/modified
3. Note any follow-up items
4. Update PLAN.md

---

## Error Handling

### When Tests Fail
1. Do NOT comment out or skip failing tests
2. Investigate the root cause
3. Fix the code, not the test (unless test is wrong)
4. If stuck, ask for help with full error context

### When Blocked
1. Clearly state what's blocking you
2. Provide relevant error messages/logs
3. Suggest possible solutions if you have ideas
4. Wait for guidance before proceeding

---

## Prohibited Actions

- Modifying host system files
- Installing packages globally
- Skipping tests to "save time"
- Making changes without updating PLAN.md
- Committing code that doesn't pass tests
- Adding features not in the current phase
- Removing or weakening existing tests
- Using `--force` flags without explicit permission

---

## Commit Workflow

**Commit each incremental change individually** - don't batch multiple changes.

After completing each discrete task (test passing, feature working, bug fixed):

1. Stage only related files: `git add <specific-files>`
2. Write a conventional commit message:
   ```
   <type>: <short description>

   [optional body explaining why, not what]
   ```

**Commit types:**
- `feat:` - New feature or functionality
- `fix:` - Bug fix
- `test:` - Adding or updating tests
- `refactor:` - Code change that neither fixes nor adds
- `docs:` - Documentation only
- `chore:` - Build, config, dependencies
- `style:` - Formatting, no code change

**Examples:**
```bash
git add src/hooks/useTrails.ts src/hooks/useTrails.test.ts
git commit -m "feat: add useTrails hook for loading trail data"

git add src/services/database/db.ts
git commit -m "feat: set up Dexie database with completions table"

git add PLAN.md
git commit -m "docs: mark useTrails implementation complete"
```

**Do NOT:**
- Combine unrelated changes in one commit
- Use vague messages like "updates" or "fixes"
- Commit failing tests (except intentionally for TDD red phase)
- Commit without updating PLAN.md

---

## Quick Reference

```
1. Check PLAN.md     → Find next task
2. Write failing test → Verify it fails
3. Implement code    → Minimum to pass
4. Verify test passes → Run full suite
5. Update PLAN.md    → Mark checkbox complete
6. Git commit        → Conventional message, single change
7. Repeat
```
