# CLAUDE.md

## Project Overview

This is the **claude** repository — a project by girardmaxime33000. It is currently in its initial stage with no source code, build system, or dependencies configured yet.

- **Repository**: `girardmaxime33000/claude`
- **Status**: Freshly initialized (single initial commit)
- **Primary branch**: `main`

## Repository Structure

```
claude/
├── README.md       # Project description
└── CLAUDE.md       # This file — AI assistant guide
```

## Development Environment

No build tools, package managers, or language runtimes are configured yet. When the project grows, update this section with:

- Language and runtime version requirements
- Package manager and install commands
- Environment variable setup (`.env` files, secrets)

## Common Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint

# Agent commands
npm run agent:run <card-id>       # Execute a single Trello card
npm run agent:poll                # Run one polling cycle
npm run agent:status              # Show running tasks

# Analytics commands (require UMAMI_API_KEY + UMAMI_WEBSITE_ID)
tsx src/cli.ts analytics --days 30        # Full analytics report
tsx src/cli.ts analytics:active           # Current active visitors
tsx src/cli.ts analytics:pages --days 7   # Top pages
tsx src/cli.ts analytics:referrers        # Top referrers
```

## Testing

No testing framework is configured. When tests are added, document:

- Testing framework and runner
- How to run the full test suite
- How to run a single test file
- Any test conventions (file naming, directory structure)

## Code Style and Conventions

No linter or formatter is configured. When established, document:

- Linter and formatter tools
- Naming conventions
- File and directory organization patterns
- Import ordering rules

## CI/CD

No CI/CD pipeline is configured. When added, document:

- Pipeline triggers and stages
- Required checks before merging
- Deployment process

## Key Architectural Decisions

Document important design decisions here as the project evolves.

## MCP Servers

### Context7 (library documentation)

**Always** use the Context7 MCP server automatically — without waiting for an explicit request — whenever the task involves:

- Looking up library or API documentation
- Generating code that uses external libraries/frameworks
- Setting up or configuring tools, frameworks, or dependencies
- Answering questions about library usage, best practices, or APIs

This ensures responses are grounded in up-to-date, accurate documentation rather than potentially stale training data.

## Notes for AI Assistants

- This repository is in early development. Expect the structure to change significantly.
- Always read existing files before proposing modifications.
- Keep changes minimal and focused on the task at hand.
- When adding new tooling or frameworks, update this CLAUDE.md accordingly.
- Prefer simple, readable solutions over clever abstractions.
