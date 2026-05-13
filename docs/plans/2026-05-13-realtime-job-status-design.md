# Realtime Job Status Design

## Goal

Make Agentic Dispatch job progress visible without manual refreshes, and make the T3 session URL easy to open for both async and interactive jobs.

## Approach

The web app should prefer Convex realtime subscriptions when `VITE_CONVEX_URL` is configured. If Convex is not configured in local development, it should keep the current HTTP behavior so the app remains usable.

The API should continue to store canonical `status` values, but event messages should describe the exact step in progress. The UI will derive a readable current step from the latest event plus the canonical status.

## UX Requirements

- Jobs list updates automatically when jobs are created, progress, complete, or fail.
- Job detail updates automatically for job row changes and timeline events.
- Job cards show a real `Open T3` link when `t3SessionUrl` exists.
- Job detail shows `Open in T3` prominently for both `interactive_t3` and `async_pr`.
- If `t3SessionUrl` is missing but `t3EnvironmentId` and `t3ThreadId` exist, the web app builds a fallback URL from `VITE_T3_HOSTED_APP_BASE_URL`.
- Timeline entries should show useful metadata such as T3 thread ID, project ID, PR URL, failure category, and status transitions.

## Implementation Notes

- Add a small Convex realtime client module in `apps/web/src/api/realtime.ts`.
- Use Convex `watchQuery` with function references for `jobs:listJobs`, `jobs:getJob`, and `jobs:listJobEvents`.
- Keep HTTP fetches as fallback when Convex is absent.
- Improve `runJob` event messages around GitHub installation, workspace prep, T3 registration, autonomous turn start, PR attachment, and completion.
- Avoid changing the status enum for this pass; richer UI text comes from event messages and derived display helpers.

