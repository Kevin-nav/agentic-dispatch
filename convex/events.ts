import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const appendJobEvent = mutation({
  args: {
    jobId: v.id("jobs"),
    type: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const event = {
      jobId: args.jobId,
      type: args.type,
      message: args.message,
      createdAt: new Date().toISOString(),
      ...(args.metadata === undefined ? {} : { metadata: args.metadata }),
    };

    return ctx.db.insert("jobEvents", event);
  },
});

export const listJobEvents = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) =>
    ctx.db.query("jobEvents").withIndex("by_jobId_createdAt", (q) => q.eq("jobId", jobId)).collect(),
});
