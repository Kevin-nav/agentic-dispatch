import {
  type JobEventRecord,
  type JobRecord,
  type JobStatus,
  assertJobStatusTransition,
  newId,
} from "@agentic-dispatch/shared";

export type JobFailureCategory =
  | "github_installation_unavailable"
  | "workspace_prepare_failed"
  | "t3_dispatch_failed"
  | "t3_monitor_failed"
  | "timeout"
  | "cancelled"
  | "unknown";

export interface InstallationRecord {
  ownerLogin: string;
  installationId: number;
  accountType: "User" | "Organization";
  updatedAt: string;
}

export interface CreateStoredJobInput {
  id: string;
  repoOwner: string;
  repoName: string;
  baseBranch: string;
  workBranch: string;
  prompt: string;
}

export interface JobStore {
  createJob(input: CreateStoredJobInput): Promise<JobRecord>;
  getJob(jobId: string): Promise<JobRecord | undefined>;
  listJobs?(): Promise<JobRecord[]>;
  updateJobStatus(jobId: string, status: JobStatus, message?: string): Promise<void>;
  attachT3Thread(jobId: string, t3ProjectId: string, t3ThreadId: string): Promise<void>;
  attachPullRequest(jobId: string, prUrl: string): Promise<void>;
  markJobFailed(
    jobId: string,
    failureReason: string,
    category?: JobFailureCategory,
  ): Promise<void>;
  cancelJob(jobId: string, reason?: string): Promise<void>;
  getInstallationByOwner(ownerLogin: string): Promise<InstallationRecord | undefined>;
  upsertInstallation?(installation: InstallationRecord): Promise<void>;
}

export interface ActiveJob {
  abortController: AbortController;
  t3ThreadId?: string;
}

export class ActiveJobRegistry {
  private readonly jobs = new Map<string, ActiveJob>();

  start(jobId: string): ActiveJob {
    const active = { abortController: new AbortController() };
    this.jobs.set(jobId, active);
    return active;
  }

  setT3Thread(jobId: string, t3ThreadId: string): void {
    const active = this.jobs.get(jobId);
    if (active) {
      active.t3ThreadId = t3ThreadId;
    }
  }

  get(jobId: string): ActiveJob | undefined {
    return this.jobs.get(jobId);
  }

  abort(jobId: string): void {
    this.jobs.get(jobId)?.abortController.abort();
  }

  finish(jobId: string): void {
    this.jobs.delete(jobId);
  }
}

export class InMemoryJobStore implements JobStore {
  private readonly jobs = new Map<string, JobRecord>();
  private readonly events = new Map<string, JobEventRecord[]>();
  private readonly installations = new Map<string, InstallationRecord>();

  constructor(seed?: { installations?: InstallationRecord[] }) {
    for (const installation of seed?.installations ?? []) {
      this.installations.set(normalizeOwner(installation.ownerLogin), installation);
    }
  }

  async createJob(input: CreateStoredJobInput): Promise<JobRecord> {
    const now = new Date().toISOString();
    const job: JobRecord = {
      ...input,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);
    this.appendEvent(job.id, "job_created", "Job queued", { status: "queued" });
    return job;
  }

  async getJob(jobId: string): Promise<JobRecord | undefined> {
    return this.jobs.get(jobId);
  }

  async listJobs(): Promise<JobRecord[]> {
    return [...this.jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateJobStatus(jobId: string, status: JobStatus, message?: string): Promise<void> {
    const job = this.requireJob(jobId);
    assertJobStatusTransition(job.status, status);
    this.patchJob(jobId, { status });
    this.appendEvent(jobId, "status_changed", message ?? `Job status changed to ${status}`, {
      from: job.status,
      to: status,
    });
  }

  async attachT3Thread(jobId: string, t3ProjectId: string, t3ThreadId: string): Promise<void> {
    this.requireJob(jobId);
    this.patchJob(jobId, { t3ProjectId, t3ThreadId });
    this.appendEvent(jobId, "t3_thread_attached", "T3 thread attached", {
      t3ProjectId,
      t3ThreadId,
    });
  }

  async attachPullRequest(jobId: string, prUrl: string): Promise<void> {
    this.requireJob(jobId);
    this.patchJob(jobId, { prUrl });
    this.appendEvent(jobId, "pull_request_attached", "Pull request attached", { prUrl });
  }

  async markJobFailed(
    jobId: string,
    failureReason: string,
    category: JobFailureCategory = "unknown",
  ): Promise<void> {
    const job = this.requireJob(jobId);
    assertJobStatusTransition(job.status, "failed");
    this.patchJob(jobId, { status: "failed", failureReason });
    this.appendEvent(jobId, "job_failed", failureReason, { from: job.status, category });
  }

  async cancelJob(jobId: string, reason = "Job cancelled"): Promise<void> {
    const job = this.requireJob(jobId);
    assertJobStatusTransition(job.status, "cancelled");
    this.patchJob(jobId, { status: "cancelled" });
    this.appendEvent(jobId, "job_cancelled", reason, { from: job.status });
  }

  async getInstallationByOwner(ownerLogin: string): Promise<InstallationRecord | undefined> {
    return this.installations.get(normalizeOwner(ownerLogin));
  }

  async upsertInstallation(installation: InstallationRecord): Promise<void> {
    this.installations.set(normalizeOwner(installation.ownerLogin), installation);
  }

  getJobEvents(jobId: string): JobEventRecord[] {
    return this.events.get(jobId) ?? [];
  }

  private requireJob(jobId: string): JobRecord {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    return job;
  }

  private patchJob(jobId: string, patch: Partial<JobRecord>): void {
    const current = this.requireJob(jobId);
    this.jobs.set(jobId, {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  private appendEvent(
    jobId: string,
    type: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    const event: JobEventRecord = {
      id: newId("evt"),
      jobId,
      type,
      message,
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.events.set(jobId, [...(this.events.get(jobId) ?? []), event]);
  }
}

export function buildWorkBranch(jobId: string, prompt: string): string {
  return `agentic-dispatch/${jobId}-${slugify(prompt)}`;
}

export function normalizeOwner(owner: string): string {
  return owner.trim().toLowerCase();
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "job";
}
