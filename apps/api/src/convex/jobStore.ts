import { ConvexHttpClient } from "convex/browser";

import type {
  JobEventRecord,
  JobPullRequestRecord,
  JobRecord,
  JobRepoRecord,
  JobStatus,
} from "@agentic-dispatch/shared";

import type {
  CreateStoredJobInput,
  InstallationRecord,
  JobFailureCategory,
  JobStore,
} from "../jobs/jobState.js";

type ConvexRecord = Record<string, unknown> & { _id?: string };

export class ConvexJobStore implements JobStore {
  private readonly client: ConvexHttpClient;

  constructor(convexUrl: string) {
    this.client = new ConvexHttpClient(convexUrl);
  }

  async createJob(input: CreateStoredJobInput): Promise<JobRecord> {
    const jobId = await this.mutation<string>("jobs:createJob", {
      repoOwner: input.repoOwner,
      repoName: input.repoName,
      baseBranch: input.baseBranch,
      workBranch: input.workBranch,
      prompt: input.prompt,
      mode: input.mode,
      repos: input.repos,
    });

    const job = await this.getJob(jobId);
    if (!job) throw new Error(`Job not found after create: ${jobId}`);
    return job;
  }

  async getJob(jobId: string): Promise<JobRecord | undefined> {
    const row = await this.query<ConvexRecord | null>("jobs:getJob", { jobId });
    return row ? mapJob(row) : undefined;
  }

  async listJobs(): Promise<JobRecord[]> {
    const rows = await this.query<ConvexRecord[]>("jobs:listJobs", {});
    return rows.map(mapJob);
  }

  async listJobEvents(jobId: string): Promise<JobEventRecord[]> {
    const rows = await this.query<ConvexRecord[]>("jobs:listJobEvents", { jobId });
    return rows.map(mapJobEvent);
  }

  async updateJobStatus(jobId: string, status: JobStatus, message?: string): Promise<void> {
    await this.mutation("jobs:updateJobStatus", { jobId, status, message });
  }

  async attachT3Thread(
    jobId: string,
    t3ProjectId: string,
    t3ThreadId: string,
    t3EnvironmentId?: string,
    t3SessionUrl?: string,
  ): Promise<void> {
    await this.mutation("jobs:attachT3Thread", {
      jobId,
      t3ProjectId,
      t3ThreadId,
      t3EnvironmentId,
      t3SessionUrl,
    });
  }

  async attachPullRequest(jobId: string, prUrl: string): Promise<void> {
    await this.mutation("jobs:attachPullRequest", { jobId, prUrl });
  }

  async attachPullRequests(
    jobId: string,
    pullRequests: JobPullRequestRecord[],
  ): Promise<void> {
    await this.mutation("jobs:attachPullRequests", { jobId, pullRequests });
  }

  async markJobFailed(
    jobId: string,
    failureReason: string,
    _category: JobFailureCategory = "unknown",
  ): Promise<void> {
    await this.mutation("jobs:markJobFailed", { jobId, failureReason });
  }

  async cancelJob(jobId: string, reason = "Job cancelled"): Promise<void> {
    await this.mutation("jobs:cancelJob", { jobId, reason });
  }

  async getInstallationByOwner(ownerLogin: string): Promise<InstallationRecord | undefined> {
    const installations = await this.listInstallations();
    return installations.find(
      (installation) => installation.ownerLogin.toLowerCase() === ownerLogin.toLowerCase(),
    );
  }

  async listInstallations(): Promise<InstallationRecord[]> {
    const rows = await this.query<ConvexRecord[]>("installations:listInstallations", {});
    return rows.map(mapInstallation);
  }

  async upsertInstallation(installation: InstallationRecord): Promise<void> {
    await this.mutation("installations:upsertInstallation", {
      ownerLogin: installation.ownerLogin,
      installationId: installation.installationId,
      accountType: installation.accountType,
    });
  }

  private async query<T>(name: string, args: Record<string, unknown>): Promise<T> {
    return this.client.query(name as never, args as never) as Promise<T>;
  }

  private async mutation<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
    return this.client.mutation(name as never, args as never) as Promise<T>;
  }
}

function mapJob(row: ConvexRecord): JobRecord {
  const job: JobRecord = {
    id: requireString(row._id, "job._id"),
    repoOwner: requireString(row.repoOwner, "job.repoOwner"),
    repoName: requireString(row.repoName, "job.repoName"),
    baseBranch: requireString(row.baseBranch, "job.baseBranch"),
    workBranch: requireString(row.workBranch, "job.workBranch"),
    prompt: requireString(row.prompt, "job.prompt"),
    mode: optionalString(row.mode) === "interactive_t3" ? "interactive_t3" : "async_pr",
    status: requireString(row.status, "job.status") as JobStatus,
    failureReason: optionalString(row.failureReason),
    t3ProjectId: optionalString(row.t3ProjectId),
    t3ThreadId: optionalString(row.t3ThreadId),
    t3EnvironmentId: optionalString(row.t3EnvironmentId),
    t3SessionUrl: optionalString(row.t3SessionUrl),
    prUrl: optionalString(row.prUrl),
    repos: mapJobRepos(row.repos),
    pullRequests: mapPullRequests(row.pullRequests),
    createdAt: requireString(row.createdAt, "job.createdAt"),
    updatedAt: requireString(row.updatedAt, "job.updatedAt"),
  };

  job.repos ??= [
    {
      owner: job.repoOwner,
      repo: job.repoName,
      fullName: `${job.repoOwner}/${job.repoName}`,
      role: "editable",
      baseBranch: job.baseBranch,
      workBranch: job.workBranch,
      status: "prepared",
    },
  ];

  return job;
}

function mapJobRepos(value: unknown): JobRepoRecord[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((repo, index) => {
    if (!isRecord(repo)) throw new Error(`Invalid Convex row: job.repos[${index}] is invalid`);
    return {
      owner: requireString(repo.owner, `job.repos[${index}].owner`),
      repo: requireString(repo.repo, `job.repos[${index}].repo`),
      fullName: requireString(repo.fullName, `job.repos[${index}].fullName`),
      role: requireString(repo.role, `job.repos[${index}].role`) as JobRepoRecord["role"],
      baseBranch: requireString(repo.baseBranch, `job.repos[${index}].baseBranch`),
      workBranch: optionalString(repo.workBranch),
      path: optionalString(repo.path),
      status: requireString(repo.status, `job.repos[${index}].status`) as JobRepoRecord["status"],
      failureReason: optionalString(repo.failureReason),
    };
  });
}

function mapPullRequests(value: unknown): JobPullRequestRecord[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((pullRequest, index) => {
    if (!isRecord(pullRequest)) {
      throw new Error(`Invalid Convex row: job.pullRequests[${index}] is invalid`);
    }
    return {
      owner: requireString(pullRequest.owner, `job.pullRequests[${index}].owner`),
      repo: requireString(pullRequest.repo, `job.pullRequests[${index}].repo`),
      url: requireString(pullRequest.url, `job.pullRequests[${index}].url`),
      number: optionalNumber(pullRequest.number),
      headBranch: optionalString(pullRequest.headBranch),
      baseBranch: optionalString(pullRequest.baseBranch),
      createdAt: requireString(pullRequest.createdAt, `job.pullRequests[${index}].createdAt`),
    };
  });
}

function mapJobEvent(row: ConvexRecord): JobEventRecord {
  return {
    id: requireString(row._id, "event._id"),
    jobId: requireString(row.jobId, "event.jobId"),
    type: requireString(row.type, "event.type"),
    message: requireString(row.message, "event.message"),
    metadata: isRecord(row.metadata) ? row.metadata : undefined,
    createdAt: requireString(row.createdAt, "event.createdAt"),
  };
}

function mapInstallation(row: ConvexRecord): InstallationRecord {
  return {
    ownerLogin: requireString(row.ownerLogin, "installation.ownerLogin"),
    installationId: requireNumber(row.installationId, "installation.installationId"),
    accountType: requireString(row.accountType, "installation.accountType") as
      | "User"
      | "Organization",
    updatedAt: requireString(row.updatedAt, "installation.updatedAt"),
  };
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`Invalid Convex row: ${label} is missing`);
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== "number") throw new Error(`Invalid Convex row: ${label} is missing`);
  return value;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
