# Realtime Job Status Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Convex-backed realtime job updates and clearer T3/job progress visibility.

**Architecture:** The web app uses Convex realtime subscriptions when configured and falls back to existing HTTP requests otherwise. The API emits clearer event messages while preserving the existing job status enum.

**Tech Stack:** React, Vite, Convex React client, TypeScript, Node.js API, Convex queries/mutations.

---

### Task 1: Add Realtime Data Hooks

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/api/realtime.ts`
- Modify: `apps/web/src/vite-env.d.ts`

**Steps:**
1. Add `convex` to the web package dependencies.
2. Create hooks for realtime jobs, one job, and job events.
3. Use Convex `watchQuery` when `VITE_CONVEX_URL` exists.
4. Fall back to HTTP fetchers when Convex is not configured.
5. Run `pnpm --filter @agentic-dispatch/web typecheck`.

### Task 2: Wire Jobs List And Detail To Realtime Data

**Files:**
- Modify: `apps/web/src/routes/JobsPage.tsx`
- Modify: `apps/web/src/routes/JobDetailPage.tsx`

**Steps:**
1. Replace initial-only fetch effects with realtime hooks.
2. Keep cancel behavior optimistic but let realtime state reconcile it.
3. Show realtime/fallback connection mode subtly on pages.
4. Turn T3 labels into real links when a session URL exists.
5. Build fallback T3 URLs from environment/thread IDs.

### Task 3: Improve Job Status Copy And Timeline Metadata

**Files:**
- Modify: `apps/api/src/jobs/runJob.ts`
- Modify: `apps/web/src/routes/JobsPage.tsx`
- Modify: `apps/web/src/routes/JobDetailPage.tsx`
- Modify: `apps/web/src/styles.css`

**Steps:**
1. Update API status/event messages with precise step descriptions.
2. Add UI helpers for current-step text.
3. Render useful event metadata in the timeline.
4. Ensure async and interactive jobs both show `Open in T3`.

### Task 4: Verify And Commit

**Commands:**
- `pnpm --filter @agentic-dispatch/web typecheck`
- `pnpm --filter @agentic-dispatch/api test`
- `pnpm typecheck`
- `pnpm test`

**Commit:**
- `git commit -m "feat: add realtime job status updates"`

