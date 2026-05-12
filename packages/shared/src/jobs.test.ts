import { describe, expect, it } from "vitest";

import {
  assertJobStatusTransition,
  canTransitionJobStatus,
  type JobEventRecord,
  type JobRecord,
} from "./jobs.js";

describe("job status transitions", () => {
  it("allows the expected happy path", () => {
    expect(canTransitionJobStatus("queued", "preparing_workspace")).toBe(true);
    expect(canTransitionJobStatus("preparing_workspace", "registered_in_t3")).toBe(true);
    expect(canTransitionJobStatus("registered_in_t3", "running_in_t3")).toBe(true);
    expect(canTransitionJobStatus("running_in_t3", "completed")).toBe(true);
  });

  it("rejects transitions out of terminal states", () => {
    expect(canTransitionJobStatus("completed", "running_in_t3")).toBe(false);
    expect(() => assertJobStatusTransition("failed", "queued")).toThrow(
      "Invalid job status transition: failed -> queued",
    );
  });
});

describe("job records", () => {
  it("models appended job events", () => {
    const event: JobEventRecord = {
      id: "event_1",
      jobId: "job_1",
      type: "status_changed",
      message: "Job moved to running_in_t3",
      metadata: { status: "running_in_t3" },
      createdAt: "2026-05-10T00:00:00.000Z",
    };

    expect(event.jobId).toBe("job_1");
    expect(event.metadata).toEqual({ status: "running_in_t3" });
  });

  it("models PR URL attachment", () => {
    const job: JobRecord = {
      id: "job_1",
      repoOwner: "Kevin-nav",
      repoName: "agentic-dispatch",
      baseBranch: "main",
      workBranch: "agentic-dispatch/job_1-test",
      prompt: "Test",
      mode: "async_pr",
      status: "completed",
      prUrl: "https://github.com/Kevin-nav/agentic-dispatch/pull/1",
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-05-10T00:00:00.000Z",
    };

    expect(job.prUrl).toContain("/pull/1");
  });
});
