import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import type { AppEnv } from "../config/env.js";
import { getInstallationToken, makeGitHubAppOctokit } from "../github/appAuth.js";
import { listInstallations as listGitHubInstallations } from "../github/installations.js";
import { createJob, type CreateJobRequest } from "../jobs/createJob.js";
import { cancelJob } from "../jobs/cancelJob.js";
import { ActiveJobRegistry, InMemoryJobStore, type JobStore } from "../jobs/jobState.js";
import { runJob, type GitHubJobClient, type T3JobClient, type WorkspaceManager } from "../jobs/runJob.js";
import {
  createProject,
  createThread,
  interruptTurn,
  startTurn,
  type T3ClientConfig,
} from "../t3/client.js";
import { pollThreadOnce } from "../t3/monitor.js";
import { prepareWorkspace } from "../workspaces/workspaceManager.js";

export interface ServerDependencies {
  store: JobStore;
  github: GitHubJobClient & {
    syncInstallations?: (store: JobStore) => Promise<unknown>;
  };
  workspaceManager: WorkspaceManager;
  t3: T3JobClient;
  activeJobs: ActiveJobRegistry;
}

export function buildDefaultDependencies(env: AppEnv): ServerDependencies {
  const store = new InMemoryJobStore();
  const activeJobs = new ActiveJobRegistry();
  const t3Config: T3ClientConfig = {
    baseUrl: env.t3BaseUrl,
    ownerBearerToken: env.t3OwnerBearerToken,
  };

  const github: ServerDependencies["github"] = {
    getInstallationToken: (installationId) => getInstallationToken(installationId),
    syncInstallations: async (targetStore) => {
      const installations = await listGitHubInstallations(makeGitHubAppOctokit());
      for (const installation of installations) {
        await targetStore.upsertInstallation?.(installation);
      }
      return installations;
    },
  };

  const workspaceManager: WorkspaceManager = {
    prepareWorkspace: (input) =>
      prepareWorkspace({
        ...input,
        root: env.workspaceRoot,
      }),
  };

  const t3: T3JobClient = {
    createProject: async (input) => createProject(t3Config, input),
    createThread: async (input) => createThread(t3Config, input),
    startTurn: async (input) => startTurn(t3Config, input),
    interruptTurn: async (input) => interruptTurn(t3Config, input),
    pollThreadOnce: async (threadId) => pollThreadOnce(t3Config, threadId),
  };

  return { store, github, workspaceManager, t3, activeJobs };
}

export function createHttpServer(env: AppEnv, deps = buildDefaultDependencies(env)) {
  return createServer(async (request, response) => {
    try {
      await routeRequest(request, response, env, deps);
    } catch (error) {
      writeJson(response, statusForError(error), {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

async function routeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  env: AppEnv,
  deps: ServerDependencies,
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://agentic-dispatch.local");

  if (request.method === "GET" && url.pathname === "/api/health") {
    writeJson(response, 200, { status: "healthy" });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/jobs") {
    writeJson(response, 200, { jobs: (await deps.store.listJobs?.()) ?? [] });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/jobs") {
    const job = await createJob(await readJson<CreateJobRequest>(request), deps.store);
    const active = deps.activeJobs.start(job.id);
    void runJob(job.id, deps, {
      pollIntervalMs: env.jobPollIntervalMs,
      timeoutMs: env.jobTimeoutMs,
      signal: active.abortController.signal,
    }).catch((error) => {
      console.error(`Job ${job.id} failed`, error);
    });
    writeJson(response, 202, { job });
    return;
  }

  const jobMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)$/);
  if (request.method === "GET" && jobMatch?.[1]) {
    const job = await deps.store.getJob(decodeURIComponent(jobMatch[1]));
    if (!job) {
      writeJson(response, 404, { error: "Job not found" });
      return;
    }
    writeJson(response, 200, { job });
    return;
  }

  const cancelMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)\/cancel$/);
  if (request.method === "POST" && cancelMatch?.[1]) {
    const job = await cancelJob(decodeURIComponent(cancelMatch[1]), deps);
    writeJson(response, 200, { job });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/github/sync-installations") {
    const installations = deps.github.syncInstallations
      ? await deps.github.syncInstallations(deps.store)
      : [];
    writeJson(response, 200, { installations });
    return;
  }

  writeJson(response, 404, { error: "Not found" });
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString("utf8");
  return body ? (JSON.parse(body) as T) : ({} as T);
}

function writeJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function statusForError(error: unknown): number {
  if (error instanceof SyntaxError) return 400;
  if (error instanceof Error && /not found/i.test(error.message)) return 404;
  if (error instanceof Error && /required|unsupported/i.test(error.message)) return 400;
  return 500;
}
