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

## Run 3

- Job ID: `jd74m8dazhc3py96bw3ejm32t186kb8d`
- T3 project ID: `39a44254-6932-45a8-a8f3-7aa7fcdbf7a9`
- T3 thread ID: `2d002bc7-152e-4c40-b286-5a8855dd3441`
- Result: T3 created PR `https://github.com/Kevin-nav/agentic-dispatch-e2e/pull/2`.
- Dispatch record issue: the API still completed early because T3 reported `latestTurn.state = completed` while `session.status` remained `running`.
- Follow-up fix: commit `bf16406` treats an active/running T3 session as authoritative over latest-turn state and waits until the T3 session is ready before completing.

## Run 4

- Job ID: `jd7dbxh9b6cbzbzg1p9b7me7yn86kf2d`
- T3 project ID: `a4e88775-bae3-4213-b513-056e6d5fa2d4`
- T3 thread ID: `ae471f8f-86ab-418f-9a00-7448cc25a5c7`
- T3 session URL: `https://app.t3.codes/b3bb1d95-d967-4b07-b937-4d9393adcdb9/ae471f8f-86ab-418f-9a00-7448cc25a5c7`
- Result: completed with persisted PR URL `https://github.com/Kevin-nav/agentic-dispatch-e2e/pull/3`.

## Interactive Run

- Job ID: `jd73qknn0ypqm42vc78czwdyms86jhqe`
- T3 project ID: `311e9775-1350-416a-b0ea-fa99b8cbf7e4`
- T3 thread ID: `b668efa6-d922-4cab-b1b9-7c3b2e79ac27`
- T3 session URL: `https://app.t3.codes/b3bb1d95-d967-4b07-b937-4d9393adcdb9/b668efa6-d922-4cab-b1b9-7c3b2e79ac27`
- Result: completed after preparing the workspace and T3 thread. No autonomous turn was started.

## Current Gate

The production job path is validated:

- Async PR jobs reach `completed`.
- `prUrl` is present in the Agentic Dispatch job record.
- T3 session URLs are present in async and interactive jobs.
- The PR exists in `Kevin-nav/agentic-dispatch-e2e`.
- No token, private key, or raw environment output appears in logs or docs.

The `app.t3.codes` URL opens the thread when the browser has the VPS T3 environment paired. If a browser is not paired yet, create a fresh T3 pairing token and pair the hosted app to the VPS T3 backend first.

Suggested async request payload:

```powershell
$body = @{
  repoOwner = 'Kevin-nav'
  repoName = 'agentic-dispatch-e2e'
  baseBranch = 'main'
  mode = 'async_pr'
  prompt = 'Create a file named validation-round-N.md with a short validation note, commit the change, push the branch, open a pull request, and report the PR URL.'
} | ConvertTo-Json

Invoke-WebRequest -UseBasicParsing -Method Post -Uri https://dispatch.sankoslides.com/api/jobs -ContentType 'application/json' -Body $body -TimeoutSec 60
```

Suggested interactive request payload:

```powershell
$body = @{
  repoOwner = 'Kevin-nav'
  repoName = 'agentic-dispatch-e2e'
  baseBranch = 'main'
  mode = 'interactive_t3'
  prompt = 'Open an interactive T3 session for Agentic Dispatch validation.'
} | ConvertTo-Json

Invoke-WebRequest -UseBasicParsing -Method Post -Uri https://dispatch.sankoslides.com/api/jobs -ContentType 'application/json' -Body $body -TimeoutSec 60
```

Cleanup after validation:

- Close or merge disposable PRs in `Kevin-nav/agentic-dispatch-e2e`.
- Delete disposable validation branches if they are no longer needed.
