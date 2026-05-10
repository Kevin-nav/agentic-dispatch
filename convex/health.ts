import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const recordHealthCheck = mutation({
  args: {
    service: v.string(),
    status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("unhealthy")),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    ctx.db.insert("healthChecks", {
      ...args,
      checkedAt: new Date().toISOString(),
    }),
});

export const getHealthSummary = query({
  args: {},
  handler: async (ctx) => {
    const checks = await ctx.db.query("healthChecks").collect();
    const latestByService = new Map<string, (typeof checks)[number]>();

    for (const check of checks) {
      const current = latestByService.get(check.service);
      if (!current || current.checkedAt < check.checkedAt) {
        latestByService.set(check.service, check);
      }
    }

    return [...latestByService.values()].sort((a, b) => a.service.localeCompare(b.service));
  },
});
