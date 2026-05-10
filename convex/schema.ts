import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const jobStatusValidator = v.union(
  v.literal("queued"),
  v.literal("preparing_workspace"),
  v.literal("registered_in_t3"),
  v.literal("running_in_t3"),
  v.literal("blocked"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled"),
  v.literal("timed_out"),
);

export default defineSchema({
  jobs: defineTable({
    repoOwner: v.string(),
    repoName: v.string(),
    baseBranch: v.string(),
    workBranch: v.string(),
    prompt: v.string(),
    status: jobStatusValidator,
    failureReason: v.optional(v.string()),
    t3ProjectId: v.optional(v.string()),
    t3ThreadId: v.optional(v.string()),
    prUrl: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  jobEvents: defineTable({
    jobId: v.id("jobs"),
    type: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.string(),
  })
    .index("by_jobId", ["jobId"])
    .index("by_jobId_createdAt", ["jobId", "createdAt"]),

  githubInstallations: defineTable({
    ownerLogin: v.string(),
    installationId: v.number(),
    accountType: v.union(v.literal("User"), v.literal("Organization")),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_ownerLogin", ["ownerLogin"]),

  repoCache: defineTable({
    ownerLogin: v.string(),
    repoName: v.string(),
    defaultBranch: v.string(),
    isPrivate: v.boolean(),
    installationId: v.number(),
    updatedAt: v.string(),
  }).index("by_ownerLogin", ["ownerLogin"]),

  healthChecks: defineTable({
    service: v.string(),
    status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("unhealthy")),
    message: v.optional(v.string()),
    checkedAt: v.string(),
  }),

  notifications: defineTable({
    jobId: v.optional(v.id("jobs")),
    channel: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    message: v.string(),
    createdAt: v.string(),
    sentAt: v.optional(v.string()),
  }),
});
