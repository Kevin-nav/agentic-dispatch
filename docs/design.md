# Agentic Dispatch Design

## Goal

Build Agentic Dispatch: a private orchestration and monitoring layer for T3 Code on the existing Linux VPS. It lets the user submit GitHub repo tasks from a phone, watch progress in T3 Code, and receive a pull request at the end. The system must protect the VPS's existing Kubernetes applications from the agent runtime.

Tagline: A hardened orchestration and monitoring layer for autonomous development in K3s.

README intro:

Agentic Dispatch is a private, self-hosted orchestration layer for T3 Code. It lets you dispatch autonomous development tasks to GitHub repositories from your phone, monitor progress, and collect the resulting pull requests. It runs inside a dedicated K3s namespace with restrictive networking and storage boundaries, so the rest of the VPS remains out of reach while work is in progress.

## Decisions

- Create a new standalone sibling repo at `T3codes/agentic-dispatch`.
- Treat `T3codes/t3code` as reference-only; do not vendor, copy, submodule, or embed T3 Code source in Agentic Dispatch.
- Deploy into the existing K3s cluster, not a separate Docker/Podman runtime.
- Use a dedicated `agentic-dispatch` namespace.
- Use Infisical Cloud for secrets.
- Use Convex for non-secret operational state.
- Use a GitHub App, not a PAT.
- Use the Tailscale Kubernetes Operator for private HTTPS access.
- Run one persistent T3 Code server for watchability.
- Keep T3 Code as the agent harness/UI.
- Make Agentic Dispatch the orchestration, setup, monitoring, and status layer.
- Use Codex/T3 full-access mode only inside the isolated namespace.

## Architecture

Agentic Dispatch has a backend service, a mobile-friendly web app, Convex data, Infisical secrets, and Kubernetes manifests. It runs beside a persistent released/packaged T3 Code server in the `agentic-dispatch` namespace. The local `t3code` checkout is used only to understand T3's API behavior.

The user opens Agentic Dispatch over Tailscale HTTPS, creates a job, selects a GitHub repo, and writes a prompt. Agentic Dispatch prepares the workspace and injects the task into the persistent T3 Code server using T3's normal orchestration API:

1. `project.create`
2. `thread.create`
3. `thread.turn.start`

T3 Code runs Codex and shows live progress in the normal T3 UI. The async prompt tells Codex to complete the task end-to-end, commit, push, open a PR, report the PR URL, and stop.

## Kubernetes Isolation

The `agentic-dispatch` namespace is the only place this system runs. Existing namespaces such as `ztt`, `m-platform-prodlike`, `duotrak`, and others are not mounted, referenced, or allowed by network policy.

Security rules:

- Default-deny ingress and egress.
- No host path mounts.
- No Docker socket, containerd socket, kubeconfig, or K3s service account token in agent/job pods.
- Dedicated service accounts.
- Job pods do not mount service account tokens unless explicitly required.
- T3 Code and Codex can access public internet, GitHub, package registries, and provider endpoints.
- T3 Code and Codex cannot access cluster service CIDR, pod CIDR, RFC1918 ranges, Tailscale peer ranges, link-local metadata IPs, or existing app services.
- Storage is scoped to Agentic Dispatch only.

Persistent storage:

- T3 `T3CODE_HOME` volume.
- Agentic Dispatch workspace root volume.
- Per-job/repo workspace directories.
- Codex auth mounted read-only where required.

## Tailscale

Use the Tailscale Kubernetes Operator rather than host-level Tailscale.

Tags:

```json
{
  "tagOwners": {
    "tag:agentic-dispatch-operator": [],
    "tag:agentic-dispatch-web": ["tag:agentic-dispatch-operator"],
    "tag:agentic-dispatch-t3": ["tag:agentic-dispatch-operator"]
  }
}
```

Access grants should allow the user's Tailscale user or an admin group to reach:

- `tag:agentic-dispatch-web` on `443`
- `tag:agentic-dispatch-t3` on `443`

Tailscale OAuth credential scopes:

- Devices Core: Write
- Auth Keys: Write
- Services: Write

Everything else stays unchecked.

## Data And Secrets

Convex stores operational state only:

- UI settings
- GitHub owner/org installation IDs
- accessible repo cache
- jobs
- job status and timestamps
- T3 project/thread IDs
- sanitized logs/events
- PR URL and result metadata
- notification events
- failure/retry summaries

Convex must not store:

- GitHub App private key
- Tailscale OAuth secret
- Infisical machine identity secret
- Codex auth/session files
- T3 owner bearer token
- raw environment dumps
- unredacted command output that may contain secrets

Infisical Cloud stores:

```env
TAILSCALE_CLIENT_ID=
TAILSCALE_CLIENT_SECRET=
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
AGENTIC_DISPATCH_SESSION_SECRET=
T3_OWNER_BEARER_TOKEN=
```

Later:

```env
TELEGRAM_BOT_TOKEN=
GITHUB_WEBHOOK_SECRET=
```

The GitHub App private key is stored as the full `.pem` contents, including the `BEGIN` and `END` lines.

The T3 owner bearer token is acceptable for v1 if it is revocable and stored in Infisical. A later hardening pass can issue short-lived T3 sessions dynamically.

## GitHub App

One GitHub App is installed on the personal account and selected organizations. Each installation gets a different installation ID, so Agentic Dispatch stores installation IDs per owner/org in Convex.

Repository permissions:

- Contents: Read and write
- Pull requests: Read and write
- Workflows: Read and write
- Metadata: Read
- Checks: Read, optional
- Actions: Read, optional

Deny:

- Repository secrets
- Administration
- Environments
- Deployments unless needed later
- Organization/member permissions
- Security events unless needed later

Workflow edits are allowed. Agentic Dispatch should flag PRs that change `.github/workflows/**` so the UI and PR body clearly call out CI/CD behavior changes.

## Job Lifecycle

Job states:

```text
queued
preparing_workspace
registered_in_t3
running_in_t3
blocked
completed
failed
cancelled
timed_out
```

Async PR flow:

1. User submits repo + prompt.
2. Agentic Dispatch resolves the GitHub installation.
3. Agentic Dispatch creates a short-lived installation token.
4. Agentic Dispatch prepares workspace and branch.
5. Agentic Dispatch registers project/thread in T3.
6. Agentic Dispatch dispatches `thread.turn.start`.
7. T3/Codex implements, tests, commits, pushes, and opens the PR.
8. Agentic Dispatch monitors T3, Git, and GitHub.
9. Agentic Dispatch records PR URL and final status in Convex.

Async prompt contract:

- Complete the task without asking follow-up questions.
- Work only inside the assigned repo/workspace.
- Use the assigned branch.
- Run relevant checks/tests where practical.
- Commit changes.
- Push the branch.
- Open a pull request.
- Include summary and verification in the PR body.
- Report the PR URL in the final response.
- If blocked, leave a clear failure reason and stop.

Interactive mode remains available separately. In interactive mode, Agentic Dispatch prepares the workspace/thread and links the user into T3 for manual collaboration.

## Backend And Web App

Agentic Dispatch has a real backend service. The web app should not directly own trusted control-plane behavior.

Backend responsibilities:

- Infisical secret access
- GitHub App authentication
- installation token creation
- T3 owner-session use
- T3 orchestration calls
- workspace setup
- job state transitions
- PR monitoring
- log redaction
- notification dispatch later

Convex responsibilities:

- persistent operational database
- realtime subscriptions
- job records
- status history
- repo/installation cache
- notification events

Core v1 screens:

- Jobs
- New Job
- Job Detail
- GitHub Setup
- Secrets/Health

Job modes:

- Async PR
- Interactive T3

Future clients:

- Native mobile app using the same backend API and Convex data model.
- Telegram bot submitting jobs through the same backend.

## Failure And Recovery

Failure categories:

- `setup_failed`
- `t3_failed`
- `agent_failed`
- `pr_failed`
- `policy_failed`
- `timed_out`
- `cancelled`

Rules:

- Jobs must never run forever without a timeout.
- Workspace setup can retry once.
- T3/provider failures should retry only if clearly transient.
- Push/PR failures can retry if branch state is unchanged.
- Timed-out jobs interrupt the T3 session where possible.
- Failed jobs keep their T3 thread and workspace for a retention period.
- Completed jobs keep metadata and PR links; workspaces are cleaned by retention policy.
- Raw provider logs stay namespace-local with retention.
- Convex receives only sanitized logs/events.

Cancellation:

- User can cancel queued/running jobs.
- Agentic Dispatch sends `thread.turn.interrupt` to T3 if running.
- Agentic Dispatch marks the job cancelled.
- If a PR already exists, Agentic Dispatch records it instead of deleting history.

## Deployment Phases

Phase 1: local repo scaffold

- Create `T3codes/agentic-dispatch` as a standalone sibling repo beside `T3codes/t3code`.
- Do not vendor or submodule `T3codes/t3code`.
- Add web/backend/Convex/Kubernetes structure.
- Add `.env.example` and ignore real `.env`.
- Define Convex schema.
- Define Infisical secret names.

Phase 2: cluster foundation

- Create `agentic-dispatch` namespace.
- Install/configure Tailscale Kubernetes Operator.
- Apply tags and grants.
- Apply default-deny NetworkPolicies.
- Apply Pod Security labels.

Phase 3: T3 service

- Deploy persistent T3 Code server.
- Mount `T3CODE_HOME`.
- Mount Codex auth securely.
- Expose T3 through Tailscale HTTPS.
- Pair phone/browser once.
- Verify injected prompt appears in T3 UI.

Phase 4: Agentic Dispatch backend/web

- Deploy backend and web.
- Connect Convex and Infisical.
- Add GitHub App installation sync.
- Add New Job flow that injects into T3.

Phase 5: async PR automation

- Add workspace preparation.
- Add autonomous prompt contract.
- Add monitoring.
- Add cancel/timeout.
- Add logs and health checks.

Phase 6: future

- Telegram bot.
- Notifications.
- Native/mobile client.
- Optional stricter per-job T3 isolation.

## Validation Checklist

T3 in K3s:

- T3 server runs as a pod.
- Persistent `T3CODE_HOME` works.
- Codex auth mount works.
- `thread.turn.start` from backend starts Codex.

Tailscale:

- Agentic Dispatch web gets private HTTPS endpoint.
- T3 server gets private HTTPS endpoint.
- Hosted T3 web pairing works with Tailscale HTTPS backend.
- Phone can access both.

Network isolation:

- T3/Codex can reach public internet.
- T3/Codex cannot reach `10.43.0.0/16`.
- T3/Codex cannot reach `10.42.0.0/16`.
- T3/Codex cannot reach private/Tailscale ranges.
- T3/Codex cannot read host files or Kubernetes credentials.

GitHub App:

- Personal and org installations sync.
- Installation token can clone/push/open PR.
- Workflow changes are allowed.
- PR URL can be detected and recorded.

Autonomous job:

- Prompt runs end-to-end.
- PR is created without questions.
- Agentic Dispatch records status and PR URL.
- Failure, timeout, and cancel paths work.

## Open Risks

- T3 released packaging may require custom image work.
- Codex auth file layout should be treated as opaque and mounted, not parsed.
- Browser private-network restrictions may affect hosted web pairing unless Tailscale HTTPS behaves cleanly.
- K3s/Flannel egress policy must be tested; allow-public-deny-private cannot be assumed.
- Full-access Codex is acceptable only after namespace, network, and storage isolation are verified.
