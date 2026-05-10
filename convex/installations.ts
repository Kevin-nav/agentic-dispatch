import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

function nowIso(): string {
  return new Date().toISOString();
}

export const upsertInstallation = mutation({
  args: {
    ownerLogin: v.string(),
    installationId: v.number(),
    accountType: v.union(v.literal("User"), v.literal("Organization")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("githubInstallations")
      .withIndex("by_ownerLogin", (q) => q.eq("ownerLogin", args.ownerLogin))
      .unique();

    const timestamp = nowIso();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: timestamp });
      return existing._id;
    }

    return ctx.db.insert("githubInstallations", {
      ...args,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const upsertRepo = mutation({
  args: {
    ownerLogin: v.string(),
    repoName: v.string(),
    defaultBranch: v.string(),
    isPrivate: v.boolean(),
    installationId: v.number(),
  },
  handler: async (ctx, args) => {
    const repos = await ctx.db
      .query("repoCache")
      .withIndex("by_ownerLogin", (q) => q.eq("ownerLogin", args.ownerLogin))
      .collect();
    const existing = repos.find((repo) => repo.repoName === args.repoName);
    const timestamp = nowIso();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: timestamp });
      return existing._id;
    }

    return ctx.db.insert("repoCache", { ...args, updatedAt: timestamp });
  },
});

export const listInstallations = query({
  args: {},
  handler: async (ctx) => ctx.db.query("githubInstallations").withIndex("by_ownerLogin").collect(),
});

export const listRepos = query({
  args: { ownerLogin: v.optional(v.string()) },
  handler: async (ctx, { ownerLogin }) =>
    ownerLogin
      ? ctx.db.query("repoCache").withIndex("by_ownerLogin", (q) => q.eq("ownerLogin", ownerLogin)).collect()
      : ctx.db.query("repoCache").collect(),
});
