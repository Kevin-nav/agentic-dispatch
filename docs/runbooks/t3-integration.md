# T3 Integration Runbook

Agentic Dispatch talks to T3 Code as an external installed service through the orchestration HTTP API. It does not import, vendor, copy, or require the sibling `T3codes/t3code` source checkout.

## Tested Contract

- Tested installed T3 version: `v0.0.23`
- Snapshot endpoint: `GET /api/orchestration/snapshot`
- Dispatch endpoint: `POST /api/orchestration/dispatch`
- Auth header: `Authorization: Bearer <T3_OWNER_BEARER_TOKEN>`
- Required dispatch order: `project.create` -> `thread.create` -> `thread.turn.start`

The local contract is intentionally minimal and lives in `apps/api/src/t3`. It only models the fields Agentic Dispatch needs to create a project, create a thread, start a turn, poll completion, and extract a PR URL from the assistant's final response.

## Runtime Defaults

- Provider: `codex`
- Model: `gpt-5.4`
- Runtime mode: `full-access`
- Interaction mode: `default`

The model can be overridden by API config where needed, but the default should stay aligned with the tested `v0.0.23` behavior until a new probe validates a newer contract.

## Local Probe

Set a local owner bearer token without printing it:

```powershell
$env:T3_BASE_URL = "http://127.0.0.1:3773"
$env:T3_OWNER_BEARER_TOKEN = "<redacted-owner-session-token>"
pnpm --filter ./apps/api exec tsx ../../scripts/probes/local-t3-dispatch-probe.ts
```

The probe creates a temporary workspace outside the repo, dispatches a project/thread/turn, and prints only IDs plus the temporary path. It never stores the bearer token.

## Notes From Prior Validation

Previous local validation used the installed packaged server, not the source checkout. Port `3773` may already be occupied by a normal desktop instance; use another T3 server port and set `T3_BASE_URL` if needed. The plain dispatch route does not bootstrap a missing thread from `thread.turn.start` alone, so always send all three commands in order.
