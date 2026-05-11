import { describe, expect, it, vi } from "vitest";
import { parseRepoFullName } from "@agentic-dispatch/shared";
import {
  getInstallationToken,
  githubAppRequiredPermissions,
  type GitHubAppAuth,
} from "./appAuth.js";
import { createBranch, getPushBranchInstructions } from "./branches.js";
import { listInstallations, syncInstallations } from "./installations.js";
import { createPullRequest, findPullRequestByBranch } from "./pullRequests.js";

describe("GitHub shared helpers", () => {
  it("parses repository full names", () => {
    expect(parseRepoFullName("octo/example")).toEqual({
      owner: "octo",
      repo: "example",
    });
  });

  it("rejects invalid repository full names", () => {
    expect(() => parseRepoFullName("octo")).toThrow("Invalid repository full name");
    expect(() => parseRepoFullName("octo/example/extra")).toThrow("Invalid repository full name");
  });
});

describe("GitHub installation helpers", () => {
  it("maps GitHub installations without storing secrets", async () => {
    const octokit = {
      apps: {
        listInstallations: vi.fn(),
      },
      paginate: vi.fn().mockResolvedValue([
        {
          id: 42,
          account: {
            login: "acme",
            type: "Organization",
          },
          updated_at: "2026-05-10T00:00:00.000Z",
        },
      ]),
    };

    await expect(listInstallations(octokit as never)).resolves.toEqual([
      {
        ownerLogin: "acme",
        installationId: 42,
        accountType: "Organization",
        updatedAt: "2026-05-10T00:00:00.000Z",
      },
    ]);
  });

  it("syncs installations through the supplied store", async () => {
    const octokit = {
      apps: {
        listInstallations: vi.fn(),
      },
      paginate: vi.fn().mockResolvedValue([
        {
          id: 7,
          account: {
            login: "kevin",
            type: "User",
          },
          updated_at: "2026-05-10T00:00:00.000Z",
        },
      ]),
    };
    const store = {
      upsertInstallation: vi.fn().mockResolvedValue(undefined),
    };

    const synced = await syncInstallations(octokit as never, store);

    expect(synced).toHaveLength(1);
    expect(store.upsertInstallation).toHaveBeenCalledWith({
      ownerLogin: "kevin",
      installationId: 7,
      accountType: "User",
      updatedAt: "2026-05-10T00:00:00.000Z",
    });
  });
});

describe("GitHub app auth", () => {
  it("requests installation tokens with the expected auth shape", async () => {
    const auth = vi.fn().mockResolvedValue({
      token: "redacted",
      expiresAt: "2026-05-10T01:00:00.000Z",
      permissions: {
        contents: "write",
        pull_requests: "write",
      },
      repositorySelection: "selected",
    }) as unknown as GitHubAppAuth;

    await expect(getInstallationToken(123, auth)).resolves.toMatchObject({
      token: "redacted",
      expiresAt: "2026-05-10T01:00:00.000Z",
    });
    expect(auth).toHaveBeenCalledWith({
      type: "installation",
      installationId: 123,
    });
  });
});

describe("GitHub branch helpers", () => {
  it("creates branch refs from explicit SHAs", async () => {
    const octokit = {
      git: {
        createRef: vi.fn().mockResolvedValue({}),
      },
    };

    await createBranch(octokit as never, {
      owner: "octo",
      repo: "example",
      branch: "agentic-dispatch/job-1",
      fromSha: "abc123",
    });

    expect(octokit.git.createRef).toHaveBeenCalledWith({
      owner: "octo",
      repo: "example",
      ref: "refs/heads/agentic-dispatch/job-1",
      sha: "abc123",
    });
  });

  it("documents required workflow permissions in setup metadata", () => {
    expect(getPushBranchInstructions()).toContain("git push origin HEAD:<work-branch>");
    expect(githubAppRequiredPermissions).toEqual({
      contents: "write",
      pull_requests: "write",
      workflows: "write",
    });
  });
});

describe("GitHub pull request helpers", () => {
  it("omits optional list filters when they are not provided", async () => {
    const octokit = {
      pulls: {
        list: vi.fn().mockResolvedValue({ data: [] }),
      },
    };

    await findPullRequestByBranch(octokit as never, {
      owner: "octo",
      repo: "example",
      head: "octo:agentic-dispatch/job-1",
    });

    expect(octokit.pulls.list).toHaveBeenCalledWith({
      owner: "octo",
      repo: "example",
      head: "octo:agentic-dispatch/job-1",
      state: "open",
      per_page: 10,
    });
  });

  it("omits draft when creating a non-explicit pull request", async () => {
    const octokit = {
      pulls: {
        create: vi.fn().mockResolvedValue({
          data: {
            number: 42,
            html_url: "https://github.com/octo/example/pull/42",
            state: "open",
          },
        }),
      },
    };

    await createPullRequest(octokit as never, {
      owner: "octo",
      repo: "example",
      title: "Update",
      body: "Done",
      head: "agentic-dispatch/job-1",
      base: "main",
    });

    expect(octokit.pulls.create).toHaveBeenCalledWith({
      owner: "octo",
      repo: "example",
      title: "Update",
      body: "Done",
      head: "agentic-dispatch/job-1",
      base: "main",
    });
  });
});
