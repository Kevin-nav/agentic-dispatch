import type { Octokit } from "@octokit/rest";

export interface PullRequestRef {
  owner: string;
  repo: string;
  head: string;
  base?: string;
}

export interface PullRequestSummary {
  number: number;
  url: string;
  state: string;
}

export interface CreatePullRequestInput {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
}

export async function findPullRequestByBranch(
  octokit: Octokit,
  ref: PullRequestRef,
): Promise<PullRequestSummary | undefined> {
  const params: Parameters<Octokit["pulls"]["list"]>[0] = {
    owner: ref.owner,
    repo: ref.repo,
    head: ref.head,
    state: "open",
    per_page: 10,
  };

  if (ref.base) {
    params.base = ref.base;
  }

  const response = await octokit.pulls.list(params);

  const pull = response.data[0];
  if (!pull) {
    return undefined;
  }

  return {
    number: pull.number,
    url: pull.html_url,
    state: pull.state,
  };
}

export async function createPullRequest(
  octokit: Octokit,
  input: CreatePullRequestInput,
): Promise<PullRequestSummary> {
  const params: Parameters<Octokit["pulls"]["create"]>[0] = {
    owner: input.owner,
    repo: input.repo,
    title: input.title,
    body: input.body,
    head: input.head,
    base: input.base,
  };

  if (input.draft !== undefined) {
    params.draft = input.draft;
  }

  const response = await octokit.pulls.create(params);

  return {
    number: response.data.number,
    url: response.data.html_url,
    state: response.data.state,
  };
}
