# Multi-Repo Jobs Design

## Goal

Allow one Agentic Dispatch job to prepare several GitHub repositories in the same T3 workspace, with per-repo edit policy, so the agent can reason across related services and open pull requests only for editable repositories that actually changed.

## Current State

Agentic Dispatch currently models a job as one repository:

- `JobRecord` has `repoOwner`, `repoName`, `baseBranch`, `workBranch`, `prUrl`.
- `prepareWorkspace` clones one repo into `/workspaces/agentic-dispatch/jobs/<jobId>/<owner>/<repo>`.
- T3 receives one `workspaceRoot` and one `worktreePath`.
- The async prompt tells the agent to work only inside that repository and report one PR URL.
- Interactive mode still prepares the same single-repo workspace before linking the user into T3.

This works for isolated tasks but is weak for service ecosystems. It also fails confusingly for empty repositories because GitHub metadata can report `defaultBranch: main` while the repo has no actual `refs/heads/main`, causing:

```text
fatal: couldn't find remote ref main
```

That error is not caused by missing Git; Git is installed in both the API and T3 containers.

## Desired Model

A job should own a list of repositories:

```ts
type JobRepoRole = "editable" | "context";

interface JobRepo {
  owner: string;
  repo: string;
  fullName: string;
  role: JobRepoRole;
  baseBranch: string;
  workBranch?: string;
  path?: string;
  status: "pending" | "prepared" | "skipped_empty" | "failed";
  failureReason?: string;
}
```

Rules:

- At least one repo is required.
- At least one repo should be `editable` for `async_pr` jobs.
- `context` repos are read-only guidance for the agent.
- `editable` repos may be modified, committed, pushed, and opened as PRs.
- PRs are opened only for editable repos that actually changed.
- A job can complete with zero PRs if no editable repo changed and the agent explains why.
- Context repo changes are a policy violation and should fail or be surfaced as a blocked state.

## Workspace Layout

Use one job root with repo role grouping:

```text
/workspaces/agentic-dispatch/jobs/<jobId>/
  repos/
    editable/
      ZenoTradingTechnologies/
        ztt-execution-service/
      ZenoTradingTechnologies/
        ztt-api/
    context/
      ZenoTradingTechnologies/
        ztt-convex-contract/
```

T3 project `workspaceRoot` and thread `worktreePath` should point to the job root:

```text
/workspaces/agentic-dispatch/jobs/<jobId>
```

That gives T3 one coherent workspace while still making edit policy obvious in paths.

## Git Preparation

For each selected repo:

1. Resolve the GitHub App installation by owner.
2. Issue an installation token.
3. Clone with `--no-checkout`.
4. Verify the selected base branch exists with `git ls-remote --heads`.
5. Fetch the branch.
6. For editable repos, checkout a generated work branch from `origin/<baseBranch>`.
7. For context repos, checkout detached or normal base branch and mark it read-only in the prompt. Do not rely on filesystem permissions alone for v1.

Empty repo behavior:

- If a repo has no base branch ref, mark that repo `skipped_empty`.
- If it is context-only, continue and tell T3 it was unavailable because it is empty.
- If it is editable and required by the task, fail before T3 with a clear message.
- The web UI should not show an empty-repo failure as a generic Git error.

## Prompt Contract

The async prompt must include a repo manifest:

```text
Workspace root: /workspaces/agentic-dispatch/jobs/<jobId>

Editable repositories:
- ZenoTradingTechnologies/ztt-execution-service
  Path: repos/editable/ZenoTradingTechnologies/ztt-execution-service
  Base branch: main
  Work branch: agentic-dispatch/<jobId>-ztt-execution-service

Context repositories:
- ZenoTradingTechnologies/ztt-convex-contract
  Path: repos/context/ZenoTradingTechnologies/ztt-convex-contract
  Base branch: main

Rules:
- You may modify only editable repositories.
- Do not modify context repositories.
- Commit and push only changed editable repositories.
- Open one PR per changed editable repository.
- Report every PR URL in the final response.
```

Interactive mode should also receive a manifest, but should not start an autonomous turn. The T3 thread title should make it clear the workspace is multi-repo.

## PR Detection And Storage

Store plural PR records instead of only `prUrl`:

```ts
interface JobPullRequest {
  owner: string;
  repo: string;
  url: string;
  number?: number;
  headBranch?: string;
  baseBranch?: string;
  createdAt: string;
}
```

Keep the existing `prUrl` temporarily as a backward-compatible first PR field, but new UI should prefer `pullRequests[]`.

PR discovery should use two layers:

- Parse all GitHub PR URLs from the final T3 assistant response.
- Verify changed editable repos by checking local Git status and GitHub branches/PRs after T3 completion.

The source of truth for completion should be verified PR records, not only free-form text.

## Web UI

New Job should allow:

- selecting multiple repos from `/api/github/repos`;
- marking each selected repo as `editable` or `context`;
- choosing base branch per repo, defaulting to GitHub metadata;
- warning when a selected repo appears empty or branch validation fails.

Job Detail should show:

- repo manifest with role/status/path;
- T3 session URL;
- one PR row per changed editable repo;
- context repo policy warnings if any.

## Failure Modes

Handle these explicitly:

- GitHub App not installed on an owner.
- GitHub App installed but repo not accessible.
- Empty repo or missing base branch.
- Partial workspace preparation failure.
- T3 modifies a context repo.
- T3 creates a branch but no PR.
- T3 opens some PRs and then fails on another repo.
- Duplicate work branch already exists.
- PR URL parsing misses a URL that exists in GitHub.

Partial PR creation should not be hidden. If two PRs were opened and a third failed, the job should preserve the two PR URLs and mark the job `failed` or `blocked` with a clear partial-completion message.

## Security And Isolation

The GitHub App token is still short-lived and scoped by installation. Do not persist installation tokens. Do not log remotes without redacting `x-access-token`.

Do not mount other VPS namespaces or app data. Multi-repo means multiple GitHub repos inside the existing Agentic Dispatch workspace PVC, not broader cluster access.

## Recommended V1 Cut

Build this in stages:

1. Data model supports `jobRepos[]` and `pullRequests[]`.
2. API accepts multi-repo jobs while preserving single-repo compatibility.
3. Workspace manager prepares multiple repos and handles empty branch refs clearly.
4. T3 prompt uses a multi-repo manifest.
5. Monitor records multiple PRs.
6. Web UI creates and displays multi-repo jobs.

