import { useEffect, useMemo, useState } from "react";
import { ConvexReactClient } from "convex/react";
import { makeFunctionReference } from "convex/server";

import {
  fetchJob,
  fetchJobEvents,
  fetchJobs,
  type JobEventRecord,
  type JobRecord,
} from "./client.js";

const convexUrl = import.meta.env.VITE_CONVEX_URL?.trim();
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

const listJobsRef = makeFunctionReference<"query", Record<string, never>, unknown>("jobs:listJobs");
const getJobRef = makeFunctionReference<"query", { jobId: string }, unknown>("jobs:getJob");
const listJobEventsRef = makeFunctionReference<"query", { jobId: string }, unknown>(
  "jobs:listJobEvents",
);

export type DataMode = "realtime" | "http";

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

    const watch = convexClient.watchQuery(listJobsRef, {});
    const update = () => {
      const jobs = watch.localQueryResult();
      if (Array.isArray(jobs)) {
        setState({ data: jobs.map(mapJob), loading: false, mode: "realtime" });
      }
    };
    const unsubscribe = watch.onUpdate(update);
    update();
    return unsubscribe;
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

    const watch = convexClient.watchQuery(getJobRef, { jobId });
    const update = () => {
      const job = watch.localQueryResult();
      if (job !== undefined) {
        setState({ data: job ? mapJob(job) : null, loading: false, mode: "realtime" });
      }
    };
    const unsubscribe = watch.onUpdate(update);
    update();
    return unsubscribe;
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

    const watch = convexClient.watchQuery(listJobEventsRef, { jobId });
    const update = () => {
      const events = watch.localQueryResult();
      if (Array.isArray(events)) {
        setState({ data: events.map(mapJobEvent), loading: false, mode: "realtime" });
      }
    };
    const unsubscribe = watch.onUpdate(update);
    update();
    return unsubscribe;
  }, [jobId]);

  return state;
}

export function useT3SessionUrl(job: JobRecord | null): string | undefined {
  return useMemo(() => buildT3SessionUrl(job), [job]);
}

export function buildT3SessionUrl(job: JobRecord | null): string | undefined {
  if (!job) return undefined;
  if (job.t3SessionUrl) return job.t3SessionUrl;
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
    status: requireString(row.status) as JobRecord["status"],
    failureReason: optionalString(row.failureReason),
    t3ProjectId: optionalString(row.t3ProjectId),
    t3ThreadId: optionalString(row.t3ThreadId),
    t3EnvironmentId: optionalString(row.t3EnvironmentId),
    t3SessionUrl: optionalString(row.t3SessionUrl),
    prUrl: optionalString(row.prUrl),
    repos: Array.isArray(row.repos) ? (row.repos as JobRecord["repos"]) : undefined,
    pullRequests: Array.isArray(row.pullRequests)
      ? (row.pullRequests as JobRecord["pullRequests"])
      : undefined,
    createdAt: requireString(row.createdAt),
    updatedAt: requireString(row.updatedAt),
  };
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

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
