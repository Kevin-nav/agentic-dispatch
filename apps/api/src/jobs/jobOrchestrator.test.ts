import { describe, expect, it, vi } from "vitest";

import { cancelJob } from "./cancelJob.js";
import { createJob } from "./createJob.js";
import { ActiveJobRegistry, InMemoryJobStore, type JobStore } from "./jobState.js";
import { runJob, type RunJobDependencies, type T3JobClient } from "./runJob.js";

function makeStore(): InMemoryJobStore {
  return new InMemoryJobStore({
    installations: [
      {
        ownerLogin: "Kevin-nav",
        installationId: 123,
        accountType: "User",
        updatedAt: "2026-05-11T00:00:00.000Z",
      },
    ],
  });
}

async function seedJob(store: JobStore) {
  return createJob(
    {
      repoOwner: "Kevin-nav",
      repoName: "demo",
      baseBranch: "main",
      prompt: "Update README with dispatch notes",
      mode: "async_pr",
    },
    store,
  );
}

function makeDeps(store = makeStore(), t3Overrides: Partial<T3JobClient> = {}) {
  const activeJobs = new ActiveJobRegistry();
  const t3: T3JobClient = {
    createProject: vi.fn(async () => ({ projectId: "project-1" })),
    createThread: vi.fn(async () => ({
      threadId: "thread-1",
      t3EnvironmentId: "environment-1",
      t3SessionUrl: "https://app.t3.codes/environment-1/thread-1",
    })),
    startTurn: vi.fn(async () => undefined),
    interruptTurn: vi.fn(async () => undefined),
    pollThreadOnce: vi.fn(async () => ({
      status: "completed" as const,
      prUrl: "https://github.com/Kevin-nav/demo/pull/42",
      assistantFinalResponse: "Done: https://github.com/Kevin-nav/demo/pull/42",
    })),
    ...t3Overrides,
  };

  const deps: RunJobDependencies = {
    store,
    activeJobs,
    github: {
      getInstallationToken: vi.fn(async () => ({ token: "installation-token" })),
    },
    workspaceManager: {
      prepareWorkspace: vi.fn(async () => ({
        path: "/workspaces/agentic-dispatch/jobs/job-1/Kevin-nav/demo",
        workBranch: "agentic-dispatch/job-1-readme",
      })),
    },
    t3,
    sleep: vi.fn(async () => undefined),
  };

  return { deps, t3, activeJobs, store };
}

describe("job orchestrator", () => {
  it("normalizes legacy single-repo job requests", async () => {
    const store = makeStore();

    const job = await createJob(
      {
        repoOwner: " Kevin-nav ",
        repoName: " demo ",
        prompt: "Update README",
        mode: "async_pr",
      },
      store,
    );

    expect(job.repoOwner).toBe("Kevin-nav");
    expect(job.repoName).toBe("demo");
    expect(job.baseBranch).toBe("main");
    expect(job.repos).toEqual([
      expect.objectContaining({
        owner: "Kevin-nav",
        repo: "demo",
        fullName: "Kevin-nav/demo",
        role: "editable",
        baseBranch: "main",
        status: "pending",
      }),
    ]);
  });

  it("normalizes multi-repo job requests", async () => {
    const store = makeStore();

    const job = await createJob(
      {
        prompt: "Inspect related services",
        mode: "async_pr",
        repos: [
          {
            owner: "Kevin-nav",
            repo: "demo",
            role: "editable",
            baseBranch: "main",
          },
          {
            owner: "Kevin-nav",
            repo: "contracts",
            fullName: "Kevin-nav/contracts",
            role: "context",
          },
        ],
      },
      store,
    );

    expect(job.repoOwner).toBe("Kevin-nav");
    expect(job.repoName).toBe("demo");
    expect(job.workBranch).toContain("-demo");
    expect(job.repos).toEqual([
      expect.objectContaining({
        fullName: "Kevin-nav/demo",
        role: "editable",
        baseBranch: "main",
        workBranch: expect.stringContaining("-demo"),
      }),
      expect.objectContaining({
        fullName: "Kevin-nav/contracts",
        role: "context",
        baseBranch: "main",
        workBranch: undefined,
      }),
    ]);
  });

  it("rejects invalid multi-repo create requests", async () => {
    const store = makeStore();

    await expect(
      createJob({ prompt: "No repos", mode: "async_pr", repos: [] }, store),
    ).rejects.toThrow("At least one repository is required");

    await expect(
      createJob(
        {
          prompt: "Context only",
          mode: "async_pr",
          repos: [{ owner: "Kevin-nav", repo: "docs", role: "context" }],
        },
        store,
      ),
    ).rejects.toThrow("async_pr jobs require at least one editable repository");

    await expect(
      createJob(
        {
          prompt: "Bad role",
          mode: "interactive_t3",
          repos: [{ owner: "Kevin-nav", repo: "docs", role: "readonly" as never }],
        },
        store,
      ),
    ).rejects.toThrow("repos[0].role is invalid");

    await expect(
      createJob(
        {
          prompt: "Duplicate",
          mode: "interactive_t3",
          repos: [
            { owner: "Kevin-nav", repo: "docs", role: "editable" },
            { owner: "kevin-nav", repo: "DOCS", role: "context" },
          ],
        },
        store,
      ),
    ).rejects.toThrow("Duplicate repository selected");
  });

  it("runs a successful async PR flow and stores the PR URL", async () => {
    const store = makeStore();
    const job = await seedJob(store);
    const { deps, t3 } = makeDeps(store);

    const result = await runJob(job.id, deps, { pollIntervalMs: 1, timeoutMs: 100 });

    expect(result.status).toBe("completed");
    expect(result.t3ProjectId).toBe("project-1");
    expect(result.t3ThreadId).toBe("thread-1");
    expect(result.t3SessionUrl).toBe("https://app.t3.codes/environment-1/thread-1");
    expect(result.prUrl).toBe("https://github.com/Kevin-nav/demo/pull/42");
    expect(t3.startTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: "thread-1",
        prompt: expect.stringContaining("Do not ask follow-up questions."),
      }),
    );
  });

  it("prepares an interactive T3 session without starting an autonomous turn", async () => {
    const store = makeStore();
    const job = await createJob(
      {
        repoOwner: "Kevin-nav",
        repoName: "demo",
        baseBranch: "main",
        prompt: "Help me inspect this repo interactively",
        mode: "interactive_t3",
      },
      store,
    );
    const { deps, t3 } = makeDeps(store);

    const result = await runJob(job.id, deps, { pollIntervalMs: 1, timeoutMs: 100 });

    expect(result.status).toBe("completed");
    expect(result.mode).toBe("interactive_t3");
    expect(result.t3ThreadId).toBe("thread-1");
    expect(result.t3SessionUrl).toBe("https://app.t3.codes/environment-1/thread-1");
    expect(t3.startTurn).not.toHaveBeenCalled();
    expect(t3.pollThreadOnce).not.toHaveBeenCalled();
  });

  it("marks a T3 dispatch failure as failed", async () => {
    const store = makeStore();
    const job = await seedJob(store);
    const { deps } = makeDeps(store, {
      startTurn: vi.fn(async () => {
        throw new Error("dispatch rejected");
      }),
    });

    const result = await runJob(job.id, deps, { pollIntervalMs: 1, timeoutMs: 100 });

    expect(result.status).toBe("failed");
    expect(result.failureReason).toBe("dispatch rejected");
    expect(store.getJobEvents(job.id).at(-1)?.metadata).toMatchObject({
      category: "t3_dispatch_failed",
    });
  });

  it("interrupts T3 and marks the job timed out", async () => {
    const store = makeStore();
    const job = await seedJob(store);
    const { deps, t3 } = makeDeps(store, {
      pollThreadOnce: vi.fn(async () => ({ status: "running" as const })),
    });

    const result = await runJob(job.id, deps, { pollIntervalMs: 1, timeoutMs: -1 });

    expect(result.status).toBe("timed_out");
    expect(t3.interruptTurn).toHaveBeenCalledWith({ threadId: "thread-1" });
  });

  it("cancels an active job and interrupts its T3 thread", async () => {
    const store = makeStore();
    const job = await seedJob(store);
    await store.updateJobStatus(job.id, "preparing_workspace");
    await store.attachT3Thread(job.id, "project-1", "thread-1");
    await store.updateJobStatus(job.id, "registered_in_t3");
    await store.updateJobStatus(job.id, "running_in_t3");
    const { deps, t3, activeJobs } = makeDeps(store);
    activeJobs.start(job.id);
    activeJobs.setT3Thread(job.id, "thread-1");

    const result = await cancelJob(job.id, deps);

    expect(result?.status).toBe("cancelled");
    expect(t3.interruptTurn).toHaveBeenCalledWith({ threadId: "thread-1" });
    expect(activeJobs.get(job.id)?.abortController.signal.aborted).toBe(true);
  });

  it("fails when the GitHub installation is missing", async () => {
    const store = new InMemoryJobStore();
    const job = await seedJob(store);
    const { deps } = makeDeps(store);

    const result = await runJob(job.id, deps, { pollIntervalMs: 1, timeoutMs: 100 });

    expect(result.status).toBe("failed");
    expect(result.failureReason).toContain("No GitHub App installation");
    expect(store.getJobEvents(job.id).at(-1)?.metadata).toMatchObject({
      category: "github_installation_unavailable",
    });
  });
});
