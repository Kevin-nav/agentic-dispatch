import { useEffect, useMemo, useState } from "react";
import { ConvexReactClient } from "convex/react";
import { makeFunctionReference } from "convex/server";

import {
  fetchJob,
  fetchJobEvents,
  fetchJobs,
} from "./client.js";
import {
  type JobEventRecord,
  type JobPullRequestRecord,
  type JobRecord,
  type JobRepoRecord,
  jobStatuses,
} from "./types.js";

const convexUrl = import.meta.env.VITE_CONVEX_URL?.trim();
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

const listJobsRef = makeFunctionReference<"query", Record<string, never>, unknown>("jobs:listJobs");
const getJobRef = makeFunctionReference<"query", { jobId: string }, unknown>("jobs:getJob");
const listJobEventsRef = makeFunctionReference<"query", { jobId: string }, unknown>(
  "jobs:listJobEvents",
);

export type DataMode = "realtime" | "http";
const realtimeFallbackMs = 4_000;

interface AsyncState<T> {
  data: T;
  loading: boolean;
  mode: DataMode;
}

export function useJobsData(): AsyncState<JobRecord[]> {
  const [state, setState] = useState<AsyncState<JobRecord[]>>({
    data: [],
    loading: true,
    mode: convexClient ? "realtime" : "http",
  });

  useEffect(() => {
    if (!convexClient) {
      let cancelled = false;
      fetchJobs()
        .then((jobs) => {
          if (!cancelled) setState({ data: jobs, loading: false, mode: "http" });
        })
        .catch(() => {
          if (!cancelled) setState((prev) => ({ ...prev, loading: false }));
        });
      return () => {
        cancelled = true;
      };
    }

    let unsubscribe: (() => void) | undefined;
    let settled = false;
    const fallback = () => {
      unsubscribe?.();
      fetchJobs()
        .then((jobs) => setState({ data: jobs, loading: false, mode: "http" }))
        .catch((error: unknown) => {
          console.error("Failed to fall back to HTTP jobs fetch", error);
          setState((prev) => ({ ...prev, loading: false, mode: "http" }));
        });
    };
    const timeout = window.setTimeout(() => {
      if (!settled) fallback();
    }, realtimeFallbackMs);

    try {
      const watch = convexClient.watchQuery(listJobsRef, {});
      const update = () => {
        try {
          const jobs = watch.localQueryResult();
          if (Array.isArray(jobs)) {
            settled = true;
            window.clearTimeout(timeout);
            setState({ data: jobs.map(mapJob), loading: false, mode: "realtime" });
          }
        } catch (error) {
          console.error("Failed to read realtime jobs result", error);
          window.clearTimeout(timeout);
          fallback();
        }
      };
      unsubscribe = watch.onUpdate(update);
      update();
    } catch (error) {
      console.error("Failed to subscribe to realtime jobs", error);
      window.clearTimeout(timeout);
      fallback();
    }
    return () => {
      window.clearTimeout(timeout);
      unsubscribe?.();
    };
  }, []);

  return state;
}

export function useJobData(jobId: string | undefined): AsyncState<JobRecord | null> {
  const [state, setState] = useState<AsyncState<JobRecord | null>>({
    data: null,
    loading: Boolean(jobId),
    mode: convexClient ? "realtime" : "http",
  });

  useEffect(() => {
    if (!jobId) {
      setState((prev) => ({ ...prev, data: null, loading: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));
    if (!convexClient) {
      let cancelled = false;
      fetchJob(jobId)
        .then((job) => {
          if (!cancelled) setState({ data: job, loading: false, mode: "http" });
        })
        .catch(() => {
          if (!cancelled) setState((prev) => ({ ...prev, loading: false }));
        });
      return () => {
        cancelled = true;
      };
    }

    let unsubscribe: (() => void) | undefined;
    let settled = false;
    const fallback = () => {
      unsubscribe?.();
      fetchJob(jobId)
        .then((job) => setState({ data: job, loading: false, mode: "http" }))
        .catch((error: unknown) => {
          console.error("Failed to fall back to HTTP job fetch", error);
          setState((prev) => ({ ...prev, loading: false, mode: "http" }));
        });
    };
    const timeout = window.setTimeout(() => {
      if (!settled) fallback();
    }, realtimeFallbackMs);

    try {
      const watch = convexClient.watchQuery(getJobRef, { jobId });
      const update = () => {
        try {
          const job = watch.localQueryResult();
          if (job !== undefined) {
            settled = true;
            window.clearTimeout(timeout);
            setState({ data: job ? mapJob(job) : null, loading: false, mode: "realtime" });
          }
        } catch (error) {
          console.error("Failed to read realtime job result", error);
          window.clearTimeout(timeout);
          fallback();
        }
      };
      unsubscribe = watch.onUpdate(update);
      update();
    } catch (error) {
      console.error("Failed to subscribe to realtime job", error);
      window.clearTimeout(timeout);
      fallback();
    }
    return () => {
      window.clearTimeout(timeout);
      unsubscribe?.();
    };
  }, [jobId]);

  return state;
}

export function useJobEventsData(jobId: string | undefined): AsyncState<JobEventRecord[]> {
  const [state, setState] = useState<AsyncState<JobEventRecord[]>>({
    data: [],
    loading: Boolean(jobId),
    mode: convexClient ? "realtime" : "http",
  });

  useEffect(() => {
    if (!jobId) {
      setState((prev) => ({ ...prev, data: [], loading: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));
    if (!convexClient) {
      let cancelled = false;
      fetchJobEvents(jobId)
        .then((events) => {
          if (!cancelled) setState({ data: events, loading: false, mode: "http" });
        })
        .catch(() => {
          if (!cancelled) setState((prev) => ({ ...prev, loading: false }));
        });
      return () => {
        cancelled = true;
      };
    }

    let unsubscribe: (() => void) | undefined;
    let settled = false;
    const fallback = () => {
      unsubscribe?.();
      fetchJobEvents(jobId)
        .then((events) => setState({ data: events, loading: false, mode: "http" }))
        .catch((error: unknown) => {
          console.error("Failed to fall back to HTTP job events fetch", error);
          setState((prev) => ({ ...prev, loading: false, mode: "http" }));
        });
    };
    const timeout = window.setTimeout(() => {
      if (!settled) fallback();
    }, realtimeFallbackMs);

    try {
      const watch = convexClient.watchQuery(listJobEventsRef, { jobId });
      const update = () => {
        try {
          const events = watch.localQueryResult();
          if (Array.isArray(events)) {
            settled = true;
            window.clearTimeout(timeout);
            setState({ data: events.map(mapJobEvent), loading: false, mode: "realtime" });
          }
        } catch (error) {
          console.error("Failed to read realtime job events result", error);
          window.clearTimeout(timeout);
          fallback();
        }
      };
      unsubscribe = watch.onUpdate(update);
      update();
    } catch (error) {
      console.error("Failed to subscribe to realtime job events", error);
      window.clearTimeout(timeout);
      fallback();
    }
    return () => {
      window.clearTimeout(timeout);
      unsubscribe?.();
    };
  }, [jobId]);

  return state;
}

export function useT3SessionUrl(job: JobRecord | null): string | undefined {
  return useMemo(() => buildT3SessionUrl(job), [job]);
}

export function buildT3SessionUrl(job: JobRecord | null): string | undefined {
  if (!job) return undefined;
  if (job.t3SessionUrl && isHttpUrl(job.t3SessionUrl)) return job.t3SessionUrl;
  const hostedBaseUrl = import.meta.env.VITE_T3_HOSTED_APP_BASE_URL?.replace(/\/$/, "");
  if (!hostedBaseUrl || !job.t3EnvironmentId || !job.t3ThreadId) return undefined;
  return `${hostedBaseUrl}/${encodeURIComponent(job.t3EnvironmentId)}/${encodeURIComponent(job.t3ThreadId)}`;
}

function mapJob(value: unknown): JobRecord {
  const row = requireRecord(value);
  const repoOwner = requireString(row.repoOwner);
  const repoName = requireString(row.repoName);
  const baseBranch = requireString(row.baseBranch);
  const workBranch = requireString(row.workBranch);
  return {
    id: requireString(row._id),
    repoOwner,
    repoName,
    baseBranch,
    workBranch,
    prompt: requireString(row.prompt),
    mode: optionalString(row.mode) === "interactive_t3" ? "interactive_t3" : "async_pr",
    status: requireJobStatus(row.status),
    failureReason: optionalString(row.failureReason),
    t3ProjectId: optionalString(row.t3ProjectId),
    t3ThreadId: optionalString(row.t3ThreadId),
    t3EnvironmentId: optionalString(row.t3EnvironmentId),
    t3SessionUrl: optionalString(row.t3SessionUrl),
    prUrl: optionalString(row.prUrl),
    repos: mapJobRepos(row.repos),
    pullRequests: mapPullRequests(row.pullRequests),
    createdAt: requireString(row.createdAt),
    updatedAt: requireString(row.updatedAt),
  };
}

function mapJobRepos(value: unknown): JobRepoRecord[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((repo) => {
    const row = requireRecord(repo);
    return {
      owner: requireString(row.owner),
      repo: requireString(row.repo),
      fullName: requireString(row.fullName),
      role: requireJobRepoRole(row.role),
      baseBranch: requireString(row.baseBranch),
      workBranch: optionalString(row.workBranch),
      path: optionalString(row.path),
      status: requireJobRepoStatus(row.status),
      failureReason: optionalString(row.failureReason),
    };
  });
}

function mapPullRequests(value: unknown): JobPullRequestRecord[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((pullRequest) => {
    const row = requireRecord(pullRequest);
    return {
      owner: requireString(row.owner),
      repo: requireString(row.repo),
      url: requireString(row.url),
      number: optionalNumber(row.number),
      headBranch: optionalString(row.headBranch),
      baseBranch: optionalString(row.baseBranch),
      createdAt: requireString(row.createdAt),
    };
  });
}

function mapJobEvent(value: unknown): JobEventRecord {
  const row = requireRecord(value);
  return {
    id: requireString(row._id),
    jobId: requireString(row.jobId),
    type: requireString(row.type),
    message: requireString(row.message),
    metadata: isRecord(row.metadata) ? row.metadata : undefined,
    createdAt: requireString(row.createdAt),
  };
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("Invalid Convex realtime row");
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid Convex realtime row");
  return value;
}

function requireJobStatus(value: unknown): JobRecord["status"] {
  const status = requireString(value);
  if ((jobStatuses as readonly string[]).includes(status)) return status as JobRecord["status"];
  throw new Error("Invalid Convex realtime row");
}

function requireJobRepoRole(value: unknown): JobRepoRecord["role"] {
  const role = requireString(value);
  if (role === "editable" || role === "context") return role;
  throw new Error("Invalid Convex realtime row");
}

function requireJobRepoStatus(value: unknown): JobRepoRecord["status"] {
  const status = requireString(value);
  if (status === "pending" || status === "prepared" || status === "skipped_empty" || status === "failed") {
    return status;
  }
  throw new Error("Invalid Convex realtime row");
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
