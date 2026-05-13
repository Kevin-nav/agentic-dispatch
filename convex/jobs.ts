import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { jobPullRequestValidator, jobRepoValidator, jobStatusValidator } from "./schema";

type JobStatus =
  | "queued"
  | "preparing_workspace"
  | "registered_in_t3"
  | "running_in_t3"
  | "blocked"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";

const allowedJobStatusTransitions: Record<JobStatus, readonly JobStatus[]> = {
  queued: ["preparing_workspace", "cancelled", "failed"],
  preparing_workspace: ["registered_in_t3", "failed", "cancelled", "timed_out"],
  registered_in_t3: ["running_in_t3", "completed", "failed", "cancelled", "timed_out"],
  running_in_t3: ["blocked", "completed", "failed", "cancelled", "timed_out"],
  blocked: ["running_in_t3", "failed", "cancelled", "timed_out"],
  completed: [],
  failed: [],
  cancelled: [],
  timed_out: [],
};

function assertJobStatusTransition(from: JobStatus, to: JobStatus): void {
  if (from === to || allowedJobStatusTransitions[from].includes(to)) {
    return;
  }

  throw new Error(`Invalid job status transition: ${from} -> ${to}`);
}

function nowIso(): string {
  return new Date().toISOString();
}

async function appendJobEvent(
  ctx: MutationCtx,
  jobId: Id<"jobs">,
  type: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  const event: {
    jobId: Id<"jobs">;
    type: string;
    message: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
  } = {
    jobId,
    type,
    message,
    createdAt: nowIso(),
  };

  if (metadata !== undefined) {
    event.metadata = metadata;
  }

  await ctx.db.insert("jobEvents", event);
}

export const createJob = mutation({
  args: {
    repoOwner: v.string(),
    repoName: v.string(),
    baseBranch: v.string(),
    workBranch: v.string(),
    prompt: v.string(),
    mode: v.union(v.literal("async_pr"), v.literal("interactive_t3")),
    repos: v.optional(v.array(jobRepoValidator)),
  },
  handler: async (ctx, args) => {
    const timestamp = nowIso();
    const repos =
      args.repos ??
      [
        {
          owner: args.repoOwner,
          repo: args.repoName,
          fullName: `${args.repoOwner}/${args.repoName}`,
          role: "editable" as const,
          baseBranch: args.baseBranch,
          workBranch: args.workBranch,
          status: "pending" as const,
        },
      ];
    const jobId = await ctx.db.insert("jobs", {
      ...args,
      repos,
      status: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await appendJobEvent(ctx, jobId, "job_created", "Job queued", { status: "queued" });
    return jobId;
  },
});

export const updateJobStatus = mutation({
  args: {
    jobId: v.id("jobs"),
    status: jobStatusValidator,
    message: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, status, message }) => {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    assertJobStatusTransition(job.status as JobStatus, status);
    const timestamp = nowIso();
    await ctx.db.patch(jobId, { status, updatedAt: timestamp });
    await appendJobEvent(ctx, jobId, "status_changed", message ?? `Job status changed to ${status}`, {
      from: job.status,
      to: status,
    });
  },
});

export const attachT3Thread = mutation({
  args: {
    jobId: v.id("jobs"),
    t3ProjectId: v.string(),
    t3ThreadId: v.string(),
    t3EnvironmentId: v.optional(v.string()),
    t3SessionUrl: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, t3ProjectId, t3ThreadId, t3EnvironmentId, t3SessionUrl }) => {
    const timestamp = nowIso();
    await ctx.db.patch(jobId, {
      t3ProjectId,
      t3ThreadId,
      t3EnvironmentId,
      t3SessionUrl,
      updatedAt: timestamp,
    });
    await appendJobEvent(ctx, jobId, "t3_thread_attached", "T3 thread attached", {
      t3ProjectId,
      t3ThreadId,
      t3EnvironmentId,
      t3SessionUrl,
    });
  },
});

export const attachPullRequest = mutation({
  args: {
    jobId: v.id("jobs"),
    prUrl: v.string(),
  },
  handler: async (ctx, { jobId, prUrl }) => {
    const timestamp = nowIso();
    await ctx.db.patch(jobId, { prUrl, updatedAt: timestamp });
    await appendJobEvent(ctx, jobId, "pull_request_attached", "Pull request URL captured", {
      prUrl,
    });
  },
});

export const attachPullRequests = mutation({
  args: {
    jobId: v.id("jobs"),
    pullRequests: v.array(jobPullRequestValidator),
  },
  handler: async (ctx, { jobId, pullRequests }) => {
    if (pullRequests.length === 0) {
      throw new Error("attachPullRequests requires at least one pull request");
    }
    const firstPullRequest = pullRequests[0];
    if (!firstPullRequest) {
      throw new Error("attachPullRequests requires at least one pull request");
    }
    const timestamp = nowIso();
    await ctx.db.patch(jobId, {
      pullRequests,
      prUrl: firstPullRequest.url,
      updatedAt: timestamp,
    });
    await appendJobEvent(ctx, jobId, "pull_requests_attached", "Pull requests attached", {
      pullRequests,
    });
  },
});

export const markJobFailed = mutation({
  args: {
    jobId: v.id("jobs"),
    failureReason: v.string(),
  },
  handler: async (ctx, { jobId, failureReason }) => {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    assertJobStatusTransition(job.status as JobStatus, "failed");
    const timestamp = nowIso();
    await ctx.db.patch(jobId, { status: "failed", failureReason, updatedAt: timestamp });
    await appendJobEvent(ctx, jobId, "job_failed", failureReason, { from: job.status });
  },
});

export const cancelJob = mutation({
  args: {
    jobId: v.id("jobs"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, reason }) => {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    assertJobStatusTransition(job.status as JobStatus, "cancelled");
    const timestamp = nowIso();
    await ctx.db.patch(jobId, { status: "cancelled", updatedAt: timestamp });
    await appendJobEvent(ctx, jobId, "job_cancelled", reason ?? "Job cancelled", { from: job.status });
  },
});

export const listJobs = query({
  args: { status: v.optional(jobStatusValidator) },
  handler: async (ctx, { status }) => {
    const rows = status
      ? await ctx.db.query("jobs").withIndex("by_status", (q) => q.eq("status", status)).collect()
      : await ctx.db.query("jobs").withIndex("by_createdAt").order("desc").collect();

    return rows;
  },
});

export const getJob = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => ctx.db.get(jobId),
});

export const listJobEvents = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) =>
    ctx.db.query("jobEvents").withIndex("by_jobId_createdAt", (q) => q.eq("jobId", jobId)).collect(),
});
