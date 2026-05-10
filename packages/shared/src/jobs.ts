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

export interface JobRecord {
  id: string;
  repoOwner: string;
  repoName: string;
  baseBranch: string;
  workBranch: string;
  prompt: string;
  status: JobStatus;
  t3ProjectId?: string;
  t3ThreadId?: string;
  prUrl?: string;
  createdAt: string;
  updatedAt: string;
}
