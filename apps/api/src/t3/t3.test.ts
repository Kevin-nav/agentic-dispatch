import { describe, expect, it } from "vitest";

import { dispatchCommand } from "./client.js";
import {
  buildProjectCreateCommand,
  buildThreadCreateCommand,
  buildTurnStartCommand,
} from "./commands.js";
import { inspectThreadSnapshot } from "./monitor.js";
import { buildAsyncPrPrompt } from "./promptContract.js";
import { buildT3SessionUrl } from "./sessionUrl.js";

describe("T3 command builders", () => {
  it("builds v0.0.23-compatible command payloads", () => {
    const project = buildProjectCreateCommand({
      title: "Agentic Dispatch",
      workspaceRoot: "/workspaces/repo",
      projectId: "project-id",
      commandId: "command-id",
      createdAt: "2026-05-10T00:00:00.000Z",
    });

    expect(project).toMatchObject({
      type: "project.create",
      projectId: "project-id",
      defaultModelSelection: { provider: "codex", model: "gpt-5.4" },
    });

    const thread = buildThreadCreateCommand({
      projectId: project.projectId,
      title: "Task",
      branch: "agentic-dispatch/task",
      threadId: "thread-id",
      commandId: "thread-command",
      createdAt: "2026-05-10T00:00:00.000Z",
    });

    expect(thread).toMatchObject({
      type: "thread.create",
      modelSelection: { provider: "codex", model: "gpt-5.4" },
      runtimeMode: "full-access",
      interactionMode: "default",
      worktreePath: null,
    });

    const turn = buildTurnStartCommand({
      threadId: thread.threadId,
      prompt: "Do the task",
      titleSeed: "Task",
      messageId: "message-id",
      commandId: "turn-command",
      createdAt: "2026-05-10T00:00:00.000Z",
    });

    expect(turn).toMatchObject({
      type: "thread.turn.start",
      modelSelection: { provider: "codex", model: "gpt-5.4" },
      runtimeMode: "full-access",
      interactionMode: "default",
      message: {
        messageId: "message-id",
        role: "user",
        text: "Do the task",
        attachments: [],
      },
    });
  });
});

describe("T3 HTTP client", () => {
  it("sends bearer auth to orchestration dispatch", async () => {
    const calls: Array<Parameters<typeof fetch>> = [];
    const fetchImpl: typeof fetch = async (...args) => {
      calls.push(args);
      return new Response(JSON.stringify({ sequence: 1 }), { status: 200 });
    };

    await dispatchCommand(
      {
        baseUrl: "http://127.0.0.1:3773",
        ownerBearerToken: "owner-token",
        fetchImpl,
      },
      buildProjectCreateCommand({
        title: "Project",
        workspaceRoot: "/workspace",
      }),
    );

    const [, init] = calls[0]!;
    expect(init?.headers).toMatchObject({
      authorization: "Bearer owner-token",
      "content-type": "application/json",
    });
  });
});

describe("T3 monitor", () => {
  it("detects completed thread and PR URL", () => {
    const state = inspectThreadSnapshot(
      {
        threads: [
          {
            threadId: "thread-1",
            turns: [{ state: "completed" }],
            messages: [
              {
                role: "assistant",
                text: "Done: https://github.com/acme/widgets/pull/42",
              },
            ],
          },
        ],
      },
      "thread-1",
    );

    expect(state.status).toBe("completed");
    expect(state.assistantFinalResponse).toContain("Done:");
    expect(state.prUrl).toBe("https://github.com/acme/widgets/pull/42");
  });

  it("detects ready session objects from real T3 snapshots", () => {
    const state = inspectThreadSnapshot(
      {
        threadsByProject: {
          "project-1": [
            {
              id: "thread-1",
              session: { status: "ready" },
              messages: [
                {
                  role: "assistant",
                  text: "Finished the work.",
                },
              ],
            },
          ],
        },
      },
      "thread-1",
    );

    expect(state.status).toBe("completed");
    expect(state.assistantFinalResponse).toBe("Finished the work.");
  });

  it("does not mark an idle ready thread completed before an assistant response exists", () => {
    const state = inspectThreadSnapshot(
      {
        threads: [
          {
            id: "thread-1",
            session: { status: "ready" },
            messages: [],
          },
        ],
      },
      "thread-1",
    );

    expect(state.status).toBe("unknown");
  });

  it("does not treat completed activity text as terminal while the session is still running", () => {
    const state = inspectThreadSnapshot(
      {
        threads: [
          {
            id: "thread-1",
            session: { status: "running" },
            messages: [
              {
                role: "assistant",
                text: "I changed the file and will push next.",
              },
            ],
            activities: [{ kind: "tool.completed" }],
          },
        ],
      },
      "thread-1",
    );

    expect(state.status).toBe("running");
    expect(state.prUrl).toBeUndefined();
  });

  it("does not complete while T3 has a running active turn with a completed latest turn", () => {
    const state = inspectThreadSnapshot(
      {
        threads: [
          {
            id: "thread-1",
            session: {
              status: "running",
              activeTurnId: "turn-1",
            },
            latestTurn: {
              state: "completed",
              assistantMessageId: "assistant:progress",
            },
            messages: [
              {
                id: "assistant:progress",
                role: "assistant",
                text: "The commit is created. I am pushing the branch now.",
              },
            ],
          },
        ],
      },
      "thread-1",
    );

    expect(state.status).toBe("running");
    expect(state.prUrl).toBeUndefined();
  });
});

describe("T3 session URLs", () => {
  it("builds hosted app URLs for environment-scoped threads", () => {
    expect(
      buildT3SessionUrl({
        hostedAppBaseUrl: "https://app.t3.codes",
        environmentId: "environment-1",
        threadId: "thread-1",
      }),
    ).toBe("https://app.t3.codes/environment-1/thread-1");
  });
});

describe("async PR prompt", () => {
  it("contains the no-follow-up instruction and job context", () => {
    const prompt = buildAsyncPrPrompt({
      owner: "acme",
      repo: "widgets",
      baseBranch: "main",
      workBranch: "agentic-dispatch/job-1",
      userPrompt: "Update README",
    });

    expect(prompt).toContain("Do not ask follow-up questions.");
    expect(prompt).toContain("Repository: acme/widgets");
    expect(prompt).toContain("Report the PR URL in your final response.");
  });
});
