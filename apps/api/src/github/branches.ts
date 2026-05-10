import type { Octokit } from "@octokit/rest";

export interface BranchRef {
  owner: string;
  repo: string;
  branch: string;
}

export interface CreateBranchInput extends BranchRef {
  fromSha: string;
}

export async function getBranchHeadSha(octokit: Octokit, ref: BranchRef): Promise<string> {
  const response = await octokit.git.getRef({
    owner: ref.owner,
    repo: ref.repo,
    ref: `heads/${ref.branch}`,
  });

  return response.data.object.sha;
}

export async function createBranch(octokit: Octokit, input: CreateBranchInput): Promise<void> {
  await octokit.git.createRef({
    owner: input.owner,
    repo: input.repo,
    ref: `refs/heads/${input.branch}`,
    sha: input.fromSha,
  });
}

export function getPushBranchInstructions(remote = "origin"): string {
  return `Push workspace commits with git push ${remote} HEAD:<work-branch>.`;
}
