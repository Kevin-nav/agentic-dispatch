# End-to-End Validation

This log records real Agentic Dispatch validation runs against the production route and a disposable GitHub repository.

## Environment

- Date: 2026-05-12
- Public route: `https://dispatch.sankoslides.com`
- Namespace: `agentic-dispatch`
- Disposable repo: `Kevin-nav/agentic-dispatch-e2e`
- T3 service: `t3-code-server.agentic-dispatch.svc.cluster.local:3773`
- Secrets source: Infisical Production, synced into Kubernetes by the Infisical operator

## Preconditions Verified

- `pnpm test` passed locally.
- `pnpm typecheck` passed locally.
- API deployment rolled out successfully on the VPS.
- Public health passed:

```json
{"api":"ok","convex":"ok","t3":"ok","github":"ok"}
```

## Run 1

- Job ID: `jd712jmkx60852bg3fdck54vxd86jh27`
- T3 project ID: `6ff7a52f-eefa-4da2-b84c-4124fe08fb8b`
- T3 thread ID: `f7337e53-a4de-4633-8ad1-f34a954e9af3`
- Result: T3 created and pushed a branch, then opened PR `https://github.com/Kevin-nav/agentic-dispatch-e2e/pull/1`.
- Dispatch record issue: the API marked the job completed before the final assistant response was available, so `prUrl` was not persisted.
- Follow-up fix: commit `e66cc0c` changed the monitor to use scoped T3 session/latest-turn terminal state and require an assistant response before completing the job.

## Run 2

- Job ID: `jd72x9177fg7htm7kka73s01vn86jegp`
- T3 project ID: `bd6662b5-f79a-4ff9-8149-6b737717cf44`
- T3 thread ID: `86036ebf-7d81-4a5f-86f1-1d8fd785ebe0`
- Result: blocked by the Codex provider before repository work began.
- T3 error: usage limit reached; T3 reported to try again at 2:52 PM.

## Remaining Gate

After the Codex provider quota resets, rerun a disposable E2E job and confirm:

- Job reaches `completed`.
- `prUrl` is present in the Agentic Dispatch job record.
- The PR exists in `Kevin-nav/agentic-dispatch-e2e`.
- No token, private key, or raw environment output appears in logs or docs.

Suggested request payload:

```powershell
$body = @{
  repoOwner = 'Kevin-nav'
  repoName = 'agentic-dispatch-e2e'
  baseBranch = 'main'
  mode = 'async_pr'
  prompt = 'Create a file named validation-notes.md with a short "Agentic Dispatch E2E Round 3" note, commit the change, push the branch, open a pull request, and report the PR URL.'
} | ConvertTo-Json

Invoke-WebRequest -UseBasicParsing -Method Post -Uri https://dispatch.sankoslides.com/api/jobs -ContentType 'application/json' -Body $body -TimeoutSec 60
```

Cleanup after validation:

- Close or merge disposable PRs in `Kevin-nav/agentic-dispatch-e2e`.
- Delete disposable validation branches if they are no longer needed.
