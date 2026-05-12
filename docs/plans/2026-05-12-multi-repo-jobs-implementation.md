# Multi-Repo Jobs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-repo Agentic Dispatch jobs where selected repositories can be editable or context-only, and the system opens one PR per changed editable repo.

**Architecture:** Extend the existing single-repo job model with a `jobRepos[]` manifest and plural `pullRequests[]` result records while keeping single-repo compatibility during migration. Prepare a job-level workspace root containing all selected repos, then point T3 at that root with a prompt manifest that explains edit policy. After T3 completes, verify changed editable repos and persist PR records instead of relying only on one parsed URL.

**Tech Stack:** TypeScript, Node.js, React, Convex, GitHub App installation tokens, Kubernetes workspace PVC, T3 Code orchestration API.

---

### Task 1: Add Shared Multi-Repo Types

**Files:**
- Modify: `packages/shared/src/jobs.ts`
- Modify: `packages/shared/src/jobs.test.ts`

**Step 1: Add failing type/model tests**

Add tests that construct a job with:

- two repos;
- one `editable`;
- one `context`;
- two pull request records.

Expected shape:

```ts
const job: JobRecord = {
  id: "job_1",
  repoOwner: "ZenoTradingTechnologies",
  repoName: "ztt-execution-service",
  baseBranch: "main",
  workBranch: "agentic-dispatch/job_1",
  prompt: "Inspect related services",
  mode: "async_pr",
  status: "completed",
  repos: [
    {
      owner: "ZenoTradingTechnologies",
      repo: "ztt-execution-service",
      fullName: "ZenoTradingTechnologies/ztt-execution-service",
      role: "editable",
      baseBranch: "main",
      workBranch: "agentic-dispatch/job_1-ztt-execution-service",
      status: "prepared",
    },
    {
      owner: "ZenoTradingTechnologies",
      repo: "ztt-convex-contract",
      fullName: "ZenoTradingTechnologies/ztt-convex-contract",
      role: "context",
      baseBranch: "main",
      status: "prepared",
    },
  ],
  pullRequests: [
    {
      owner: "ZenoTradingTechnologies",
      repo: "ztt-execution-service",
      url: "https://github.com/ZenoTradingTechnologies/ztt-execution-service/pull/12",
      createdAt: "2026-05-12T00:00:00.000Z",
    },
  ],
  createdAt: "2026-05-12T00:00:00.000Z",
  updatedAt: "2026-05-12T00:00:00.000Z",
};
```

**Step 2: Run the shared tests**

Run:

```powershell
pnpm --filter @agentic-dispatch/shared test
```

Expected: fail because the types do not exist.

**Step 3: Implement shared types**

Add:

```ts
export const jobRepoRoles = ["editable", "context"] as const;
export type JobRepoRole = (typeof jobRepoRoles)[number];

export const jobRepoStatuses = ["pending", "prepared", "skipped_empty", "failed"] as const;
export type JobRepoStatus = (typeof jobRepoStatuses)[number];

export interface JobRepoRecord {
  owner: string;
  repo: string;
  fullName: string;
  role: JobRepoRole;
  baseBranch: string;
  workBranch?: string;
  path?: string;
  status: JobRepoStatus;
  failureReason?: string;
}

export interface JobPullRequestRecord {
  owner: string;
  repo: string;
  url: string;
  number?: number;
  headBranch?: string;
  baseBranch?: string;
  createdAt: string;
}
```

Extend `JobRecord` with optional:

```ts
repos?: JobRepoRecord[];
pullRequests?: JobPullRequestRecord[];
```

Keep existing `repoOwner`, `repoName`, `baseBranch`, `workBranch`, and `prUrl` for compatibility.

**Step 4: Run tests**

Run:

```powershell
pnpm --filter @agentic-dispatch/shared test
pnpm --filter @agentic-dispatch/shared typecheck
```

Expected: pass.

**Step 5: Commit**

```bash
git add packages/shared/src/jobs.ts packages/shared/src/jobs.test.ts
git commit -m "feat: add multi-repo job types"
```

### Task 2: Extend Convex Schema And Store Mapping

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/jobs.ts`
- Modify: `apps/api/src/convex/jobStore.ts`
- Modify: `apps/api/src/jobs/jobState.ts`

**Step 1: Add tests in API store/orchestrator fixtures**

Update existing API tests that construct jobs to include or assert `repos` and `pullRequests` where relevant.

**Step 2: Extend Convex schema**

Add optional fields to `jobs`:

```ts
repos: v.optional(v.array(v.object({
  owner: v.string(),
  repo: v.string(),
  fullName: v.string(),
  role: v.union(v.literal("editable"), v.literal("context")),
  baseBranch: v.string(),
  workBranch: v.optional(v.string()),
  path: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("prepared"),
    v.literal("skipped_empty"),
    v.literal("failed"),
  ),
  failureReason: v.optional(v.string()),
}))),
pullRequests: v.optional(v.array(v.object({
  owner: v.string(),
  repo: v.string(),
  url: v.string(),
  number: v.optional(v.number()),
  headBranch: v.optional(v.string()),
  baseBranch: v.optional(v.string()),
  createdAt: v.string(),
}))),
```

**Step 3: Update create mutation**

Allow `jobs:createJob` to accept optional `repos`. Store it on the job row. For backward compatibility, if no `repos` is provided, create a one-item editable manifest from the legacy single-repo fields.

**Step 4: Add attach pull requests mutation**

Add `jobs:attachPullRequests` that stores plural PR records and emits a `pull_requests_attached` event. Keep `attachPullRequest` for legacy single-PR behavior.

**Step 5: Update API mappings**

In `ConvexJobStore.mapJob`, map optional `repos` and `pullRequests`. Default legacy rows to:

```ts
repos: [{
  owner: row.repoOwner,
  repo: row.repoName,
  fullName: `${row.repoOwner}/${row.repoName}`,
  role: "editable",
  baseBranch: row.baseBranch,
  workBranch: row.workBranch,
  status: "prepared",
}]
```

only if callers need a manifest. Avoid rewriting old rows during read.

**Step 6: Run tests**

```powershell
pnpm test
pnpm typecheck
```

**Step 7: Commit**

```bash
git add convex/schema.ts convex/jobs.ts apps/api/src/convex/jobStore.ts apps/api/src/jobs/jobState.ts
git commit -m "feat: persist multi-repo job manifests"
```

### Task 3: Update Job Creation API

**Files:**
- Modify: `apps/api/src/jobs/createJob.ts`
- Modify: `apps/api/src/server/http.ts`
- Modify: `apps/api/src/jobs/jobOrchestrator.test.ts`
- Modify: `apps/web/src/api/client.ts`
- Modify: `apps/web/src/api/types.ts`

**Step 1: Write request-normalization tests**

Cover:

- legacy single-repo request still works;
- multi-repo request requires at least one repo;
- `async_pr` requires at least one editable repo;
- invalid role is rejected;
- duplicate repo full names are rejected;
- missing base branch defaults to repo default when supplied by web, otherwise `main`.

**Step 2: Add request types**

Add:

```ts
interface CreateJobRepoRequest {
  owner: string;
  repo: string;
  fullName?: string;
  role: "editable" | "context";
  baseBranch?: string;
}
```

Extend `CreateJobRequest`:

```ts
repos?: CreateJobRepoRequest[];
```

**Step 3: Build compatibility manifest**

If `request.repos` is missing, create:

```ts
[{
  owner: request.repoOwner,
  repo: request.repoName,
  fullName: `${request.repoOwner}/${request.repoName}`,
  role: "editable",
  baseBranch,
  workBranch,
  status: "pending",
}]
```

For multi-repo jobs, keep legacy top-level `repoOwner/repoName/baseBranch/workBranch` as the first editable repo for old screens.

**Step 4: Run tests**

```powershell
pnpm --filter @agentic-dispatch/api test
```

**Step 5: Commit**

```bash
git add apps/api/src/jobs/createJob.ts apps/api/src/server/http.ts apps/api/src/jobs/jobOrchestrator.test.ts apps/web/src/api/client.ts apps/web/src/api/types.ts
git commit -m "feat: accept multi-repo job requests"
```

### Task 4: Build Multi-Repo Workspace Preparation

**Files:**
- Modify: `apps/api/src/workspaces/git.ts`
- Modify: `apps/api/src/workspaces/workspaceManager.ts`
- Add: `apps/api/src/workspaces/multiRepoWorkspaceManager.ts`
- Add or modify tests under `apps/api/src/workspaces`

**Step 1: Add Git helper tests**

Test a helper that checks whether a remote branch exists:

```ts
await remoteBranchExists({ remoteUrl, branch: "main", execFile });
```

Expected git call:

```text
git ls-remote --heads <remoteUrl> main
```

It should return `false` for empty stdout.

**Step 2: Implement `remoteBranchExists`**

In `git.ts`, add a helper using `git(["ls-remote", "--heads", remoteUrl, branch])`.

**Step 3: Add multi-repo workspace tests**

Test that a manifest with editable/context repos creates paths:

```text
<root>/jobs/<jobId>/repos/editable/<owner>/<repo>
<root>/jobs/<jobId>/repos/context/<owner>/<repo>
```

Test that empty context repos are marked `skipped_empty` and empty editable repos fail with a clear message.

**Step 4: Implement preparation**

Create `prepareMultiRepoWorkspace(input)` returning:

```ts
interface PreparedMultiRepoWorkspace {
  rootPath: string;
  repos: JobRepoRecord[];
}
```

Generate per-repo work branches:

```text
agentic-dispatch/<jobId>-<repo-slug>
```

**Step 5: Preserve existing single-repo function**

Keep `prepareWorkspace` until all callers move. It can delegate to the multi-repo implementation for a one-repo manifest later.

**Step 6: Run tests**

```powershell
pnpm --filter @agentic-dispatch/api test
pnpm typecheck
```

**Step 7: Commit**

```bash
git add apps/api/src/workspaces/git.ts apps/api/src/workspaces/workspaceManager.ts apps/api/src/workspaces/multiRepoWorkspaceManager.ts apps/api/src/workspaces
git commit -m "feat: prepare multi-repo workspaces"
```

### Task 5: Update Orchestrator For Multi-Repo Jobs

**Files:**
- Modify: `apps/api/src/jobs/runJob.ts`
- Modify: `apps/api/src/jobs/jobState.ts`
- Modify: `apps/api/src/jobs/jobOrchestrator.test.ts`
- Modify: `apps/api/src/server/http.ts`

**Step 1: Add orchestrator tests**

Cover:

- multi-repo interactive job prepares repos and completes with a T3 session URL;
- multi-repo async job points T3 project/thread at the job root path;
- empty editable repo fails before T3;
- context-only async job is rejected before run;
- skipped empty context repo is included in the prompt manifest as unavailable.

**Step 2: Extend `WorkspaceManager` dependency**

Replace single-repo `prepareWorkspace` dependency with `prepareJobWorkspace` that accepts job manifest and returns job root plus prepared repo records.

**Step 3: Store prepared repo manifest**

Add store method or mutation to patch prepared `repos[]` after workspace preparation. Emit a `workspace_prepared` event with sanitized repo statuses.

**Step 4: Register T3 using job root**

Use:

```ts
workspaceRoot: prepared.rootPath
worktreePath: prepared.rootPath
title: `${primaryOwner}/${primaryRepo} + ${repoCount - 1} repos`
```

**Step 5: Run tests**

```powershell
pnpm --filter @agentic-dispatch/api test
```

**Step 6: Commit**

```bash
git add apps/api/src/jobs/runJob.ts apps/api/src/jobs/jobState.ts apps/api/src/jobs/jobOrchestrator.test.ts apps/api/src/server/http.ts
git commit -m "feat: orchestrate multi-repo jobs"
```

### Task 6: Add Multi-Repo Prompt Contract

**Files:**
- Modify: `apps/api/src/t3/promptContract.ts`
- Modify: `apps/api/src/t3/t3.test.ts`

**Step 1: Add prompt tests**

Assert the prompt includes:

- workspace root;
- editable repo list with paths and work branches;
- context repo list with paths;
- explicit “do not edit context repositories” rule;
- “open one PR per changed editable repository” rule.

**Step 2: Implement prompt builder**

Add:

```ts
export function buildMultiRepoAsyncPrPrompt(input: MultiRepoPromptInput): string
```

Keep `buildAsyncPrPrompt` for old one-repo compatibility or have it call the new builder.

**Step 3: Wire orchestrator**

Use the multi-repo prompt when `job.repos` has more than one repo or when any repo is context-only.

**Step 4: Run tests and commit**

```powershell
pnpm --filter @agentic-dispatch/api test
git add apps/api/src/t3/promptContract.ts apps/api/src/t3/t3.test.ts apps/api/src/jobs/runJob.ts
git commit -m "feat: add multi-repo t3 prompt contract"
```

### Task 7: Detect Changed Repos And Persist PRs

**Files:**
- Modify: `apps/api/src/workspaces/git.ts`
- Add: `apps/api/src/jobs/prResults.ts`
- Modify: `apps/api/src/t3/monitor.ts`
- Modify: `apps/api/src/jobs/runJob.ts`
- Modify: `convex/jobs.ts`
- Modify: `apps/api/src/convex/jobStore.ts`

**Step 1: Add tests for PR URL extraction**

Input final assistant response with multiple PR URLs. Expect all GitHub PR URLs, deduplicated.

**Step 2: Add changed repo detection**

Add helper:

```ts
getRepoChangeStatus({ repositoryPath }): Promise<{ hasChanges: boolean; summary: string }>
```

Use `git status --porcelain` and optionally `git log origin/<baseBranch>..HEAD`.

**Step 3: Add PR result parser**

Map PR URLs to repo names:

```ts
https://github.com/<owner>/<repo>/pull/<number>
```

**Step 4: Persist plural PRs**

Call `attachPullRequests(jobId, pullRequests)`. Set legacy `prUrl` to the first PR for older UI compatibility.

**Step 5: Define completion behavior**

Rules:

- If T3 completed and PRs exist, complete.
- If T3 completed and no editable repos changed, complete with no PRs.
- If T3 completed, editable repos changed, and no PR was found, mark `blocked` or `failed` with a clear message.
- If context repos changed, fail with policy violation.

**Step 6: Run tests and commit**

```powershell
pnpm test
pnpm typecheck
git add apps/api/src/workspaces/git.ts apps/api/src/jobs/prResults.ts apps/api/src/t3/monitor.ts apps/api/src/jobs/runJob.ts convex/jobs.ts apps/api/src/convex/jobStore.ts
git commit -m "feat: record pull requests per changed repo"
```

### Task 8: Update Web UI

**Files:**
- Modify: `apps/web/src/routes/NewJobPage.tsx`
- Modify: `apps/web/src/routes/JobDetailPage.tsx`
- Modify: `apps/web/src/routes/JobsPage.tsx`
- Modify: `apps/web/src/api/client.ts`
- Modify: `apps/web/src/api/types.ts`
- Modify: `apps/web/src/styles.css`

**Step 1: Add UI state for selected repos**

New Job should support adding multiple repos from `/api/github/repos`. Each selected repo needs:

- role segmented control: `Editable` / `Context`;
- base branch input defaulting to repo default branch;
- remove button.

**Step 2: Add validation**

Disable submit when:

- no repos selected;
- `async_pr` has no editable repos;
- duplicate repo exists;
- any selected repo lacks a base branch.

**Step 3: Submit multi-repo payload**

Send `repos[]` in `createJob`.

**Step 4: Update Job Detail**

Show:

- repo manifest table;
- role badges;
- repo status;
- one PR link per `pullRequests[]`;
- legacy `prUrl` fallback.

**Step 5: Run checks**

```powershell
pnpm --filter @agentic-dispatch/web typecheck
pnpm build
```

**Step 6: Commit**

```bash
git add apps/web/src/routes/NewJobPage.tsx apps/web/src/routes/JobDetailPage.tsx apps/web/src/routes/JobsPage.tsx apps/web/src/api/client.ts apps/web/src/api/types.ts apps/web/src/styles.css
git commit -m "feat: add multi-repo job UI"
```

### Task 9: Update Runbooks And Local Handoff

**Files:**
- Modify: `docs/runbooks/validation.md`
- Modify: `docs/runbooks/e2e-validation.md`
- Modify: `LOCAL_VPS_AGENT_HANDOFF.md` if present locally; do not commit it.

**Step 1: Document multi-repo validation**

Add a section that tests:

- one editable repo;
- one editable plus one context repo;
- two editable repos where only one changes;
- empty repo failure message;
- organization private repo access.

**Step 2: Document operational notes**

Include:

- Git is required in API and T3 images;
- empty repos have no branch ref even if GitHub metadata says `main`;
- one PR per changed editable repo;
- context repo changes are policy violations.

**Step 3: Commit tracked docs**

```bash
git add docs/runbooks/validation.md docs/runbooks/e2e-validation.md
git commit -m "docs: add multi-repo validation runbook"
```

### Task 10: Full Verification And Deployment

**Files:**
- No code files unless fixes are needed.

**Step 1: Run local checks**

```powershell
pnpm test
pnpm typecheck
pnpm build
```

Expected: all pass.

**Step 2: Deploy Convex**

Deploy the active Convex deployment used by the VPS. In this environment, confirm whether production uses the configured dev URL or prod URL before deployment.

Commands previously used:

```powershell
pnpm exec convex dev --once --typecheck disable
pnpm exec convex deploy --yes --message "Agentic Dispatch multi-repo jobs"
```

Use the one that targets the active `CONVEX_URL`.

**Step 3: Push and wait for images**

```powershell
git push origin main
gh run list --repo Kevin-nav/agentic-dispatch --limit 5
gh run watch <build-images-run-id> --repo Kevin-nav/agentic-dispatch --exit-status
```

**Step 4: Roll out VPS**

```bash
ssh ubuntu@149.56.140.212 'set -euo pipefail
cd /opt/agentic-dispatch/repo
sudo -u agentic-dispatch git fetch origin main
sudo -u agentic-dispatch git pull --ff-only origin main
sudo crictl rmi ghcr.io/kevin-nav/agentic-dispatch-api:latest || true
sudo crictl rmi ghcr.io/kevin-nav/agentic-dispatch-web:latest || true
sudo crictl pull ghcr.io/kevin-nav/agentic-dispatch-api:latest
sudo crictl pull ghcr.io/kevin-nav/agentic-dispatch-web:latest
sudo kubectl rollout restart deployment/agentic-dispatch-api -n agentic-dispatch
sudo kubectl rollout restart deployment/agentic-dispatch-web -n agentic-dispatch
sudo kubectl rollout status deployment/agentic-dispatch-api -n agentic-dispatch --timeout=240s
sudo kubectl rollout status deployment/agentic-dispatch-web -n agentic-dispatch --timeout=240s'
```

**Step 5: Production validation**

Run:

- public health check;
- interactive multi-repo job;
- async multi-repo job with two editable repos where only one is changed;
- async multi-repo job with editable plus context repo;
- empty repo selected as context;
- empty repo selected as editable.

Record job IDs and PR URLs in `docs/runbooks/e2e-validation.md`.

**Step 6: Final commit for validation docs**

```bash
git add docs/runbooks/e2e-validation.md
git commit -m "docs: record multi-repo e2e validation"
git push origin main
```

