# Agentic Dispatch

A hardened orchestration and monitoring layer for autonomous development in K3s.

Agentic Dispatch is a private, self-hosted orchestration layer for T3 Code. It lets you dispatch autonomous development tasks to GitHub repositories from your phone, monitor progress, and collect the resulting pull requests. It runs inside a dedicated K3s namespace with restrictive networking and storage boundaries, so the rest of the VPS remains out of reach while work is in progress.

## Status

Early implementation. See `docs/design.md` for the approved design.

## Local Convex Setup

Install dependencies from the repo lockfile, then run Convex through the pinned project dependency:

```bash
pnpm install
pnpm convex:dev
```

For a one-shot Convex bundle and typecheck after the project has been configured:

```bash
pnpm convex:codegen
```

Do not import workspace packages from `convex/` functions. Convex bundles that directory for its own runtime, so Convex functions should only import local `convex/` files or npm packages available to the Convex deployment.
