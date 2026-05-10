# Agentic Dispatch

A hardened orchestration and monitoring layer for autonomous development in K3s.

Agentic Dispatch is a private, self-hosted orchestration layer for T3 Code. It lets you dispatch autonomous development tasks to GitHub repositories from your phone, monitor progress, and collect the resulting pull requests. It runs inside a dedicated K3s namespace with restrictive networking and storage boundaries, so the rest of the VPS remains out of reach while work is in progress.

## Status

Early implementation. See `docs/design.md` for the approved design.
