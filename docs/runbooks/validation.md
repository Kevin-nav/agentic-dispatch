# Validation Runbook

Use this runbook before production use and after any change to networking, secrets, GitHub App permissions, Convex functions, or the T3 server deployment.

## Prerequisites

- `pnpm install` has been run in the repo.
- `kubectl` points at the target K3s cluster.
- The `agentic-dispatch` namespace exists.
- Runtime secrets are injected through Infisical or a local uncommitted environment file.
- Never paste secret values into logs, issues, commits, or chat.

## Local Static Checks

```powershell
pnpm typecheck
pnpm test
```

Both commands must pass before applying Kubernetes manifests or dispatching autonomous work.

## Convex Probe

Required environment:

```text
CONVEX_URL
CONVEX_AUTH_TOKEN optional, only if the deployment requires auth for the probe query
```

Run:

```powershell
pnpm exec tsx scripts/probes/check-convex.ts
```

Expected:

- The deployment URL is reachable.
- `health:getHealthSummary` returns an array.
- No secret values are printed.

## Infisical Probe

Required environment:

```text
INFISICAL_PROJECT_ID
INFISICAL_ENV
INFISICAL_CLIENT_ID
INFISICAL_CLIENT_SECRET
INFISICAL_API_URL optional, defaults to https://us.infisical.com
INFISICAL_ORGANIZATION_SLUG optional
INFISICAL_SECRET_PATH optional, defaults to /
INFISICAL_REQUIRED_SECRETS optional comma-separated override
```

Run:

```powershell
pnpm exec tsx scripts/probes/check-infisical.ts
```

Expected:

- Universal Auth succeeds.
- Required secret names exist.
- Secret values are not requested for display and are never printed.

Default required secrets:

```text
AGENTIC_DISPATCH_SESSION_SECRET
T3_OWNER_BEARER_TOKEN
GITHUB_APP_ID
GITHUB_APP_PRIVATE_KEY
```

## GitHub App Probe

Required environment:

```text
GITHUB_APP_ID
GITHUB_APP_PRIVATE_KEY
GITHUB_PROBE_REPO optional, format owner/repo
```

Run:

```powershell
pnpm exec tsx scripts/probes/check-github-app.ts
```

Expected:

- App authentication works.
- Installations can be listed.
- If `GITHUB_PROBE_REPO` is set, the installation token can read repository metadata.
- The probe does not push, create branches, create pull requests, or print tokens.

## T3 Health Probe

Required environment:

```text
T3_BASE_URL
T3_OWNER_BEARER_TOKEN
```

Run:

```powershell
pnpm exec tsx scripts/probes/check-t3-health.ts
```

Expected:

- T3 base URL responds.
- `/api/orchestration/snapshot` works with the bearer token.
- Dispatch dry-run is skipped by default.

To explicitly test dispatch with a known non-production command payload:

```powershell
$env:AGENTIC_DISPATCH_T3_DISPATCH_DRY_RUN="true"
$env:AGENTIC_DISPATCH_T3_DRY_RUN_COMMAND_JSON="C:\path\to\dry-run-command.json"
pnpm exec tsx scripts/probes/check-t3-health.ts
```

Only use dry-run dispatch against a local or disposable T3 instance unless the command payload has been reviewed.

## Network Isolation Probe

Required:

- `kubectl` can create and delete a temporary pod in `agentic-dispatch`.
- Egress policies for Agentic Dispatch are applied.

Run from a shell with `sh`:

```bash
scripts/probes/check-network-isolation.sh
```

Expected:

- Public internet endpoint succeeds.
- GitHub endpoint succeeds.
- `10.43.0.1` fails.
- `10.42.0.1` fails.
- Known service DNS in another namespace fails.
- Metadata IP `169.254.169.254` fails.

Useful overrides:

```bash
AGENTIC_DISPATCH_NAMESPACE=agentic-dispatch
AGENTIC_DISPATCH_PUBLIC_PROBE_URL=https://example.com
AGENTIC_DISPATCH_GITHUB_PROBE_URL=https://api.github.com/meta
AGENTIC_DISPATCH_OTHER_NAMESPACE_SERVICE_URL=https://kubernetes.default.svc.cluster.local
```

If public or GitHub egress fails, inspect namespace egress policies and DNS policy first. If private, cluster, or metadata addresses succeed, stop deployment and treat the namespace as not isolated.

## Production Readiness Gate

Before enabling real autonomous PR jobs:

- `pnpm typecheck` passes.
- `pnpm test` passes.
- Convex probe passes.
- Infisical probe passes.
- GitHub App probe passes for the selected repo.
- T3 health probe passes.
- Network isolation probe passes in the live cluster.
- No `.env`, private keys, tokens, or kubeconfigs are staged in Git.
