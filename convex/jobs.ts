import { assertJobStatusTransition, type JobStatus } from "@agentic-dispatch/shared";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { jobStatusValidator } from "./schema";

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
  await ctx.db.insert("jobEvents", {
    jobId,
    type,
    message,
    metadata,
    createdAt: nowIso(),
  });
}

export const createJob = mutation({
  args: {
    repoOwner: v.string(),
    repoName: v.string(),
    baseBranch: v.string(),
    workBranch: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const timestamp = nowIso();
    const jobId = await ctx.db.insert("jobs", {
      ...args,
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
  },
  handler: async (ctx, { jobId, t3ProjectId, t3ThreadId }) => {
    const timestamp = nowIso();
    await ctx.db.patch(jobId, { t3ProjectId, t3ThreadId, updatedAt: timestamp });
    await appendJobEvent(ctx, jobId, "t3_thread_attached", "T3 thread attached", {
      t3ProjectId,
      t3ThreadId,
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
    await appendJobEvent(ctx, jobId, "pull_request_attached", "Pull request attached", { prUrl });
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
