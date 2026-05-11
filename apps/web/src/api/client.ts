/**
 * API client stubs with mock data.
 * These will later be replaced with Convex subscriptions.
 */

import type { JobRecord, JobEventRecord, JobStatus } from "./types.js";

export type { JobRecord, JobEventRecord, JobStatus };

/* ---------- Mock Data ---------- */

const now = new Date();
const hours = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();
const mins = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

const MOCK_JOBS: JobRecord[] = [
  {
    id: "job_001",
    repoOwner: "T3codes",
    repoName: "finance-guardian",
    baseBranch: "main",
    workBranch: "agentic-dispatch/job_001-add-export",
    prompt: "Add CSV export functionality to the transactions page with date range filtering",
    status: "completed",
    t3ProjectId: "proj_abc123",
    t3ThreadId: "thread_xyz789",
    prUrl: "https://github.com/T3codes/finance-guardian/pull/42",
    createdAt: hours(3),
    updatedAt: hours(1),
  },
  {
    id: "job_002",
    repoOwner: "T3codes",
    repoName: "better-data",
    baseBranch: "main",
    workBranch: "agentic-dispatch/job_002-dark-mode",
    prompt: "Implement a dark mode toggle that respects system preferences and persists user choice to localStorage",
    status: "running_in_t3",
    t3ProjectId: "proj_def456",
    t3ThreadId: "thread_uvw321",
    createdAt: mins(45),
    updatedAt: mins(2),
  },
  {
    id: "job_003",
    repoOwner: "T3codes",
    repoName: "castlegate-portal",
    baseBranch: "develop",
    workBranch: "agentic-dispatch/job_003-fix-auth",
    prompt: "Fix the authentication token refresh race condition that causes intermittent 401 errors",
    status: "failed",
    failureReason: "T3 thread encountered unrecoverable error during workspace setup",
    t3ProjectId: "proj_ghi789",
    createdAt: hours(6),
    updatedAt: hours(5),
  },
  {
    id: "job_004",
    repoOwner: "T3codes",
    repoName: "agentic-dispatch",
    baseBranch: "main",
    workBranch: "agentic-dispatch/job_004-add-tests",
    prompt: "Add unit tests for the job orchestrator module with >80% coverage",
    status: "preparing_workspace",
    createdAt: mins(5),
    updatedAt: mins(3),
  },
  {
    id: "job_005",
    repoOwner: "T3codes",
    repoName: "finance-guardian",
    baseBranch: "main",
    workBranch: "agentic-dispatch/job_005-refactor",
    prompt: "Refactor the category management module to use the new shared state pattern",
    status: "queued",
    createdAt: mins(1),
    updatedAt: mins(1),
  },
];

const MOCK_EVENTS: Record<string, JobEventRecord[]> = {
  job_001: [
    { id: "evt_1", jobId: "job_001", type: "status_change", message: "Job queued", createdAt: hours(3) },
    { id: "evt_2", jobId: "job_001", type: "status_change", message: "Preparing workspace — cloning repository", createdAt: hours(2.9) },
    { id: "evt_3", jobId: "job_001", type: "status_change", message: "Registered in T3 — project and thread created", createdAt: hours(2.8) },
    { id: "evt_4", jobId: "job_001", type: "status_change", message: "T3 agent is working on the task", createdAt: hours(2.7) },
    { id: "evt_5", jobId: "job_001", type: "t3_progress", message: "Agent: Analyzing existing transaction page code structure...", createdAt: hours(2.5) },
    { id: "evt_6", jobId: "job_001", type: "t3_progress", message: "Agent: Implementing CSV export utility with date range support...", createdAt: hours(2) },
    { id: "evt_7", jobId: "job_001", type: "t3_progress", message: "Agent: Running test suite — all 14 tests passing", createdAt: hours(1.5) },
    { id: "evt_8", jobId: "job_001", type: "pr_created", message: "Pull request opened: #42", metadata: { prUrl: "https://github.com/T3codes/finance-guardian/pull/42" }, createdAt: hours(1.2) },
    { id: "evt_9", jobId: "job_001", type: "status_change", message: "Job completed successfully", createdAt: hours(1) },
  ],
  job_002: [
    { id: "evt_10", jobId: "job_002", type: "status_change", message: "Job queued", createdAt: mins(45) },
    { id: "evt_11", jobId: "job_002", type: "status_change", message: "Preparing workspace — cloning repository", createdAt: mins(44) },
    { id: "evt_12", jobId: "job_002", type: "status_change", message: "Registered in T3", createdAt: mins(42) },
    { id: "evt_13", jobId: "job_002", type: "status_change", message: "T3 agent is working on the task", createdAt: mins(40) },
    { id: "evt_14", jobId: "job_002", type: "t3_progress", message: "Agent: Implementing CSS custom properties for theme switching...", createdAt: mins(20) },
  ],
  job_003: [
    { id: "evt_15", jobId: "job_003", type: "status_change", message: "Job queued", createdAt: hours(6) },
    { id: "evt_16", jobId: "job_003", type: "status_change", message: "Preparing workspace", createdAt: hours(5.9) },
    { id: "evt_17", jobId: "job_003", type: "error", message: "Failed: T3 thread encountered unrecoverable error during workspace setup", createdAt: hours(5) },
  ],
};

/* ---------- GitHub Installations ---------- */

export interface GitHubInstallation {
  ownerLogin: string;
  installationId: number;
  accountType: "User" | "Organization";
  updatedAt: string;
}

const MOCK_INSTALLATIONS: GitHubInstallation[] = [
  { ownerLogin: "T3codes", installationId: 12345, accountType: "Organization", updatedAt: hours(24) },
  { ownerLogin: "kevin-dev", installationId: 67890, accountType: "User", updatedAt: hours(48) },
];

const MOCK_REPOS: string[] = [
  "T3codes/finance-guardian",
  "T3codes/better-data",
  "T3codes/castlegate-portal",
  "T3codes/agentic-dispatch",
  "T3codes/slide-engine",
];

/* ---------- Health ---------- */

export interface HealthSummary {
  api: "ok" | "degraded" | "down";
  convex: "ok" | "degraded" | "down";
  t3: "ok" | "degraded" | "down";
  github: "ok" | "degraded" | "down";
  activeJobs: number;
  totalJobs: number;
  lastCheck: string;
}

const MOCK_HEALTH: HealthSummary = {
  api: "ok",
  convex: "ok",
  t3: "ok",
  github: "ok",
  activeJobs: 2,
  totalJobs: 5,
  lastCheck: mins(1),
};

/* ---------- API Client ---------- */

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchJobs(): Promise<JobRecord[]> {
  await delay(300);
  return [...MOCK_JOBS];
}

export async function fetchJob(id: string): Promise<JobRecord | null> {
  await delay(200);
  return MOCK_JOBS.find((j) => j.id === id) ?? null;
}

export async function fetchJobEvents(jobId: string): Promise<JobEventRecord[]> {
  await delay(200);
  return MOCK_EVENTS[jobId] ?? [];
}

export async function createJob(input: {
  repoFullName: string;
  baseBranch: string;
  prompt: string;
  mode: "async_pr" | "interactive";
}): Promise<JobRecord> {
  await delay(600);
  const [owner, repo] = input.repoFullName.split("/");
  const id = `job_${Date.now()}`;
  const job: JobRecord = {
    id,
    repoOwner: owner ?? "unknown",
    repoName: repo ?? "unknown",
    baseBranch: input.baseBranch,
    workBranch: `agentic-dispatch/${id}-task`,
    prompt: input.prompt,
    status: "queued",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  MOCK_JOBS.unshift(job);
  return job;
}

export async function cancelJob(id: string): Promise<void> {
  await delay(400);
  const job = MOCK_JOBS.find((j) => j.id === id);
  if (job) {
    job.status = "cancelled";
    job.updatedAt = new Date().toISOString();
  }
}

export async function fetchInstallations(): Promise<GitHubInstallation[]> {
  await delay(300);
  return [...MOCK_INSTALLATIONS];
}

export async function fetchRepos(): Promise<string[]> {
  await delay(200);
  return [...MOCK_REPOS];
}

export async function syncInstallations(): Promise<void> {
  await delay(800);
}

export async function fetchHealth(): Promise<HealthSummary> {
  await delay(250);
  return { ...MOCK_HEALTH };
}
