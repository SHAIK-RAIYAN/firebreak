# Firebreak

> Stop the spread. Roll back bad deploys with proof.

Firebreak finds the deploy that broke production, proposes a controlled rollback, executes it only after a human approves, and proves recovery with health checks.

## Architecture

- **Web Application:** Next.js 16 (App Router, Tailwind v4) in `apps/web`
- **MCP Server:** NitroStack server in `apps/mcp`
- **Core Domain & Business Logic:** Shared TypeScript library in `packages/core`
- **Alert Fixtures & CLI:** Integration fixtures in `packages/fixtures`

## Getting Started

```bash
# Install dependencies
npm install

# Run development servers
npm run dev

# Build all packages
npm run build

# Run typecheck
npm run typecheck

# Run tests
npm run test
```

## Documentation

Full architectural specifications, data models, and runbooks are available in the [`docs/`](./docs) directory.
