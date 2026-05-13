/**
 * Local type re-exports for the web app.
 * Mirrors the shared package types without requiring workspace linking at dev time.
 */

export const jobStatuses = [
  "queued",
  "preparing_workspace",
  "registered_in_t3",
  "running_in_t3",
  "blocked",
  "completed",
  "failed",
  "cancelled",
  "timed_out",
] as const;

export type JobStatus = (typeof jobStatuses)[number];
export type JobMode = "async_pr" | "interactive_t3";
export type JobRepoRole = "editable" | "context";
export type JobRepoStatus = "pending" | "prepared" | "skipped_empty" | "failed";

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

export interface JobRecord {
  id: string;
  repoOwner: string;
  repoName: string;
  baseBranch: string;
  workBranch: string;
  prompt: string;
  mode: JobMode;
  status: JobStatus;
  failureReason?: string;
  t3ProjectId?: string;
  t3ThreadId?: string;
  t3EnvironmentId?: string;
  t3SessionUrl?: string;
  prUrl?: string;
  repos?: JobRepoRecord[];
  pullRequests?: JobPullRequestRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface JobEventRecord {
  id: string;
  jobId: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
