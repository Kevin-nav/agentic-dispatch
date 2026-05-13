import type { JobRecord } from "@agentic-dispatch/shared";

import { buildAsyncPrPrompt } from "../t3/promptContract.js";
import type { T3ThreadMonitorState } from "../t3/monitor.js";
import type { PreparedWorkspace } from "../workspaces/workspaceManager.js";
import {
  type ActiveJobRegistry,
  type JobFailureCategory,
  type JobStore,
  normalizeOwner,
} from "./jobState.js";

export interface GitHubJobClient {
  getInstallationToken(installationId: number): Promise<{ token: string }>;
}

export interface WorkspaceManager {
  prepareWorkspace(input: {
    jobId: string;
    owner: string;
    repo: string;
    baseBranch: string;
    workBranch: string;
    installationToken: string;
  }): Promise<PreparedWorkspace>;
}

export interface T3JobClient {
  createProject(input: { title: string; workspaceRoot: string }): Promise<{ projectId: string }>;
  createThread(input: {
    projectId: string;
    title: string;
    branch: string;
    worktreePath: string;
  }): Promise<{ threadId: string; t3EnvironmentId?: string; t3SessionUrl?: string }>;
  startTurn(input: { threadId: string; prompt: string; titleSeed: string }): Promise<unknown>;
  interruptTurn(input: { threadId: string }): Promise<unknown>;
  pollThreadOnce(threadId: string): Promise<T3ThreadMonitorState>;
}

export interface RunJobDependencies {
  store: JobStore;
  github: GitHubJobClient;
  workspaceManager: WorkspaceManager;
  t3: T3JobClient;
  activeJobs?: ActiveJobRegistry;
  sleep?: (ms: number) => Promise<void>;
}

export interface RunJobOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const defaultPollIntervalMs = 5_000;
const defaultTimeoutMs = 60 * 60 * 1_000;

export async function runJob(
  jobId: string,
  deps: RunJobDependencies,
  options: RunJobOptions = {},
): Promise<JobRecord> {
  const job = await requireJob(deps.store, jobId);
  const signal = options.signal;

  try {
    throwIfAborted(signal);
    await deps.store.updateJobStatus(
      jobId,
      "preparing_workspace",
      `Resolving GitHub installation for ${job.repoOwner}`,
    );
    const installation = await deps.store.getInstallationByOwner(normalizeOwner(job.repoOwner));
    if (!installation) {
      throw new CategorizedJobError(
        "github_installation_unavailable",
        `No GitHub App installation found for ${job.repoOwner}`,
      );
    }

    await deps.store.updateJobStatus(
      jobId,
      "preparing_workspace",
      `Requesting GitHub installation token for ${job.repoOwner}`,
    );
    const { token } = await deps.github.getInstallationToken(installation.installationId);
    await deps.store.updateJobStatus(
      jobId,
      "preparing_workspace",
      `Preparing workspace for ${job.repoOwner}/${job.repoName} on ${job.baseBranch}`,
    );
    const workspace = await prepareWorkspaceForJob(job, jobId, token, deps);

    throwIfAborted(signal);
    await deps.store.updateJobStatus(
      jobId,
      "preparing_workspace",
      "Workspace ready; creating T3 project and thread",
    );
    const { projectId, threadId, t3EnvironmentId, t3SessionUrl } = await registerJobInT3(
      job,
      jobId,
      workspace,
      deps,
    );
    deps.activeJobs?.setT3Thread(jobId, threadId);
    await deps.store.attachT3Thread(jobId, projectId, threadId, t3EnvironmentId, t3SessionUrl);
    await deps.store.updateJobStatus(
      jobId,
      "registered_in_t3",
      t3SessionUrl ? "T3 session ready to open" : "T3 thread registered; session URL unavailable",
    );

    if (job.mode === "interactive_t3") {
      await deps.store.updateJobStatus(jobId, "completed", "Interactive T3 session ready");
      return requireJob(deps.store, jobId);
    }

    const prompt = buildAsyncPrPrompt({
      owner: job.repoOwner,
      repo: job.repoName,
      baseBranch: job.baseBranch,
      workBranch: job.workBranch,
      userPrompt: job.prompt,
    });
    await deps.store.updateJobStatus(
      jobId,
      "registered_in_t3",
      "Starting autonomous T3 turn",
    );
    await startT3Turn(job, jobId, threadId, prompt, deps);
    await deps.store.updateJobStatus(
      jobId,
      "running_in_t3",
      "T3 is running; waiting for completion and PR result",
    );

    const result = await waitForT3Completion(threadId, deps, {
      pollIntervalMs: options.pollIntervalMs ?? defaultPollIntervalMs,
      timeoutMs: options.timeoutMs ?? defaultTimeoutMs,
      signal,
    });

    if (result.prUrl) {
      await deps.store.attachPullRequest(jobId, result.prUrl);
    }

    await deps.store.updateJobStatus(
      jobId,
      "completed",
      result.prUrl ? "Job completed with pull request" : "Job completed without a pull request",
    );
    return requireJob(deps.store, jobId);
  } catch (error) {
    await handleRunFailure(jobId, deps, signal, error);
    return requireJob(deps.store, jobId);
  } finally {
    deps.activeJobs?.finish(jobId);
  }
}

async function prepareWorkspaceForJob(
  job: JobRecord,
  jobId: string,
  token: string,
  deps: RunJobDependencies,
): Promise<PreparedWorkspace> {
  try {
    return await deps.workspaceManager.prepareWorkspace({
      jobId,
      owner: job.repoOwner,
      repo: job.repoName,
      baseBranch: job.baseBranch,
      workBranch: job.workBranch,
      installationToken: token,
    });
  } catch (error) {
    throw new CategorizedJobError("workspace_prepare_failed", errorMessage(error));
  }
}

async function registerJobInT3(
  job: JobRecord,
  jobId: string,
  workspace: PreparedWorkspace,
  deps: RunJobDependencies,
): Promise<{
  projectId: string;
  threadId: string;
  t3EnvironmentId?: string;
  t3SessionUrl?: string;
}> {
  try {
    const project = await deps.t3.createProject({
      title: `${job.repoOwner}/${job.repoName}`,
      workspaceRoot: workspace.path,
    });
    const thread = await deps.t3.createThread({
      projectId: project.projectId,
      title: job.prompt.slice(0, 80) || `Job ${jobId}`,
      branch: job.workBranch,
      worktreePath: workspace.path,
    });
    return {
      projectId: project.projectId,
      threadId: thread.threadId,
      t3EnvironmentId: thread.t3EnvironmentId,
      t3SessionUrl: thread.t3SessionUrl,
    };
  } catch (error) {
    throw new CategorizedJobError("t3_dispatch_failed", errorMessage(error));
  }
}

async function startT3Turn(
  job: JobRecord,
  jobId: string,
  threadId: string,
  prompt: string,
  deps: RunJobDependencies,
): Promise<void> {
  try {
    await deps.t3.startTurn({
      threadId,
      prompt,
      titleSeed: job.prompt.slice(0, 80) || `Job ${jobId}`,
    });
  } catch (error) {
    throw new CategorizedJobError("t3_dispatch_failed", errorMessage(error));
  }
}

async function waitForT3Completion(
  threadId: string,
  deps: RunJobDependencies,
  options: Required<Pick<RunJobOptions, "pollIntervalMs" | "timeoutMs">> & {
    signal?: AbortSignal;
  },
): Promise<T3ThreadMonitorState> {
  const sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const deadline = Date.now() + options.timeoutMs;

  while (Date.now() <= deadline) {
    throwIfAborted(options.signal);
    const state = await deps.t3.pollThreadOnce(threadId);
    if (state.status === "completed") return state;
    if (state.status === "failed") {
      throw new CategorizedJobError("t3_monitor_failed", "T3 thread failed");
    }
    await sleep(options.pollIntervalMs);
  }

  throw new CategorizedJobError("timeout", "Job timed out");
}

async function handleRunFailure(
  jobId: string,
  deps: RunJobDependencies,
  signal: AbortSignal | undefined,
  error: unknown,
): Promise<void> {
  const job = await deps.store.getJob(jobId);
  if (!job || ["completed", "failed", "cancelled", "timed_out"].includes(job.status)) {
    return;
  }

  if (signal?.aborted || isAbortError(error)) {
    if (job.t3ThreadId) {
      await deps.t3.interruptTurn({ threadId: job.t3ThreadId });
    }
    await deps.store.cancelJob(jobId, "Job cancelled");
    return;
  }

  const category = error instanceof CategorizedJobError ? error.category : "unknown";
  if (category === "timeout") {
    if (job.t3ThreadId) {
      await deps.t3.interruptTurn({ threadId: job.t3ThreadId });
    }
    await deps.store.updateJobStatus(jobId, "timed_out", "Job timed out");
    return;
  }

  await deps.store.markJobFailed(jobId, errorMessage(error), category);
}

async function requireJob(store: JobStore, jobId: string): Promise<JobRecord> {
  const job = await store.getJob(jobId);
  if (!job) throw new Error(`Job not found: ${jobId}`);
  return job;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new DOMException("Job cancelled", "AbortError");
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class CategorizedJobError extends Error {
  constructor(
    public readonly category: JobFailureCategory,
    message: string,
  ) {
    super(message);
  }
}
