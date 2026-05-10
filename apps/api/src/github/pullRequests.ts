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
  const response = await octokit.pulls.list({
    owner: ref.owner,
    repo: ref.repo,
    head: ref.head,
    base: ref.base,
    state: "open",
    per_page: 10,
  });

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
  const response = await octokit.pulls.create({
    owner: input.owner,
    repo: input.repo,
    title: input.title,
    body: input.body,
    head: input.head,
    base: input.base,
    draft: input.draft,
  });

  return {
    number: response.data.number,
    url: response.data.html_url,
    state: response.data.state,
  };
}
