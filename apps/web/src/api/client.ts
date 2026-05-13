import type { JobEventRecord, JobRecord, JobStatus } from "./types.js";

export type { JobEventRecord, JobRecord, JobStatus };

export interface GitHubInstallation {
  ownerLogin: string;
  installationId: number;
  accountType: "User" | "Organization";
  updatedAt: string;
}

export interface InstallationRepo {
  id: number;
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
}

export interface HealthSummary {
  api: "ok" | "degraded" | "down";
  convex: "ok" | "degraded" | "down";
  t3: "ok" | "degraded" | "down";
  github: "ok" | "degraded" | "down";
  activeJobs: number;
  totalJobs: number;
  lastCheck: string;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message =
      typeof body?.error === "string" ? body.error : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

export async function fetchJobs(): Promise<JobRecord[]> {
  const { jobs } = await apiRequest<{ jobs: JobRecord[] }>("/api/jobs");
  return jobs;
}

export async function fetchJob(id: string): Promise<JobRecord | null> {
  const { job } = await apiRequest<{ job: JobRecord }>(`/api/jobs/${encodeURIComponent(id)}`);
  return job;
}

export async function fetchJobEvents(jobId: string): Promise<JobEventRecord[]> {
  const { events } = await apiRequest<{ events: JobEventRecord[] }>(
    `/api/jobs/${encodeURIComponent(jobId)}/events`,
  );
  return events;
}

export async function createJob(input: {
  repoFullName: string;
  baseBranch: string;
  prompt: string;
  mode: "async_pr" | "interactive";
  repos?: Array<{
    owner: string;
    repo: string;
    fullName?: string;
    role: "editable" | "context";
    baseBranch?: string;
  }>;
}): Promise<JobRecord> {
  const [repoOwner, repoName, extra] = input.repoFullName.split("/");
  if (!repoOwner || !repoName || extra) {
    throw new Error("Select a repository in owner/repo format");
  }

  const { job } = await apiRequest<{ job: JobRecord }>("/api/jobs", {
    method: "POST",
    body: JSON.stringify({
      repoOwner,
      repoName,
      baseBranch: input.baseBranch,
      prompt: input.prompt,
      mode: input.mode === "interactive" ? "interactive_t3" : "async_pr",
      repos: input.repos,
    }),
  });

  return job;
}

export async function cancelJob(id: string): Promise<void> {
  await apiRequest<{ job: JobRecord }>(`/api/jobs/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
  });
}

export async function fetchInstallations(): Promise<GitHubInstallation[]> {
  const { installations } = await apiRequest<{ installations: GitHubInstallation[] }>(
    "/api/github/installations",
  );
  return installations;
}

export async function fetchRepos(): Promise<InstallationRepo[]> {
  const { repos } = await apiRequest<{ repos: InstallationRepo[] }>("/api/github/repos");
  return repos;
}

export async function syncInstallations(): Promise<void> {
  await apiRequest<{ installations: GitHubInstallation[] }>("/api/github/sync-installations", {
    method: "POST",
  });
}

export async function fetchHealth(): Promise<HealthSummary> {
  return apiRequest<HealthSummary>("/api/health");
}
