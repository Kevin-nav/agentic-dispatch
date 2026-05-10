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

export const terminalJobStatuses = [
  "completed",
  "failed",
  "cancelled",
  "timed_out",
] as const satisfies readonly JobStatus[];

export type TerminalJobStatus = (typeof terminalJobStatuses)[number];

export const allowedJobStatusTransitions: Record<JobStatus, readonly JobStatus[]> = {
  queued: ["preparing_workspace", "cancelled", "failed"],
  preparing_workspace: ["registered_in_t3", "failed", "cancelled", "timed_out"],
  registered_in_t3: ["running_in_t3", "failed", "cancelled", "timed_out"],
  running_in_t3: ["blocked", "completed", "failed", "cancelled", "timed_out"],
  blocked: ["running_in_t3", "failed", "cancelled", "timed_out"],
  completed: [],
  failed: [],
  cancelled: [],
  timed_out: [],
};

export function isJobStatus(value: string): value is JobStatus {
  return (jobStatuses as readonly string[]).includes(value);
}

export function canTransitionJobStatus(from: JobStatus, to: JobStatus): boolean {
  return from === to || allowedJobStatusTransitions[from].includes(to);
}

export function assertJobStatusTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransitionJobStatus(from, to)) {
    throw new Error(`Invalid job status transition: ${from} -> ${to}`);
  }
}

export interface JobRecord {
  id: string;
  repoOwner: string;
  repoName: string;
  baseBranch: string;
  workBranch: string;
  prompt: string;
  status: JobStatus;
  failureReason?: string;
  t3ProjectId?: string;
  t3ThreadId?: string;
  prUrl?: string;
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
