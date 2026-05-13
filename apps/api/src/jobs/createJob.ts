import { newId, type JobRepoRecord, type JobRepoRole } from "@agentic-dispatch/shared";

import { buildRepoWorkBranch, buildWorkBranch, type JobStore } from "./jobState.js";

export interface CreateJobRepoRequest {
  owner: string;
  repo: string;
  fullName?: string;
  role: JobRepoRole;
  baseBranch?: string;
}

export interface CreateJobRequest {
  repoOwner?: string;
  repoName?: string;
  baseBranch?: string;
  prompt: string;
  mode?: "async_pr" | "interactive_t3";
  repos?: CreateJobRepoRequest[];
}

export async function createJob(request: CreateJobRequest, store: JobStore) {
  const normalized = normalizeCreateJobRequest(request);
  const jobId = newId("job");
  const workBranch =
    normalized.repos.length === 1 && !request.repos
      ? buildWorkBranch(jobId, normalized.prompt)
      : buildRepoWorkBranch(jobId, normalized.repoName);
  const repos = normalized.repos.map((repo) => ({
    ...repo,
    workBranch: repo.role === "editable" ? buildRepoWorkBranch(jobId, repo.repo) : undefined,
  }));

  return store.createJob({
    id: jobId,
    repoOwner: normalized.repoOwner,
    repoName: normalized.repoName,
    baseBranch: normalized.baseBranch,
    workBranch,
    prompt: normalized.prompt,
    mode: normalized.mode,
    repos,
  });
}

interface NormalizedCreateJobRequest {
  repoOwner: string;
  repoName: string;
  baseBranch: string;
  prompt: string;
  mode: "async_pr" | "interactive_t3";
  repos: JobRepoRecord[];
}

function normalizeCreateJobRequest(request: CreateJobRequest): NormalizedCreateJobRequest {
  const prompt = request.prompt?.trim();
  const mode = request.mode ?? "async_pr";

  if (!prompt) throw new Error("prompt is required");
  if (mode !== "async_pr" && mode !== "interactive_t3") {
    throw new Error("Unsupported job mode");
  }

  const repos = request.repos ? normalizeRepoRequests(request.repos) : [normalizeLegacyRepo(request)];
  if (repos.length === 0) throw new Error("At least one repository is required");
  if (mode === "async_pr" && !repos.some((repo) => repo.role === "editable")) {
    throw new Error("async_pr jobs require at least one editable repository");
  }

  const primaryRepo = repos.find((repo) => repo.role === "editable") ?? repos[0];
  if (!primaryRepo) throw new Error("At least one repository is required");

  return {
    repoOwner: primaryRepo.owner,
    repoName: primaryRepo.repo,
    baseBranch: primaryRepo.baseBranch,
    prompt,
    mode,
    repos,
  };
}

function normalizeLegacyRepo(request: CreateJobRequest): JobRepoRecord {
  const repoOwner = request.repoOwner?.trim();
  const repoName = request.repoName?.trim();
  const baseBranch = request.baseBranch?.trim() || "main";

  if (!repoOwner) throw new Error("repoOwner is required");
  if (!repoName) throw new Error("repoName is required");

  return {
    owner: repoOwner,
    repo: repoName,
    fullName: `${repoOwner}/${repoName}`,
    role: "editable",
    baseBranch,
    status: "pending",
  };
}

function normalizeRepoRequests(repos: CreateJobRepoRequest[]): JobRepoRecord[] {
  if (repos.length === 0) throw new Error("At least one repository is required");

  const seen = new Set<string>();
  return repos.map((repo, index) => {
    const owner = repo.owner?.trim();
    const repoName = repo.repo?.trim();
    const role = repo.role;
    const baseBranch = repo.baseBranch?.trim() || "main";
    const fullName = repo.fullName?.trim() || `${owner}/${repoName}`;

    if (!owner) throw new Error(`repos[${index}].owner is required`);
    if (!repoName) throw new Error(`repos[${index}].repo is required`);
    if (role !== "editable" && role !== "context") {
      throw new Error(`repos[${index}].role is invalid`);
    }
    if (!baseBranch) throw new Error(`repos[${index}].baseBranch is required`);

    const key = `${owner}/${repoName}`.toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate repository selected: ${owner}/${repoName}`);
    seen.add(key);

    return {
      owner,
      repo: repoName,
      fullName,
      role,
      baseBranch,
      status: "pending",
    };
  });
}
