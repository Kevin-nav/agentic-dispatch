import type { Octokit } from "@octokit/rest";

export interface InstallationRepo {
  id: number;
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
}

export async function listInstallationRepos(octokit: Octokit): Promise<InstallationRepo[]> {
  const repos = await octokit.paginate(octokit.apps.listReposAccessibleToInstallation);

  return repos.map((repo) => ({
    id: repo.id,
    owner: repo.owner.login,
    repo: repo.name,
    fullName: repo.full_name,
    defaultBranch: repo.default_branch,
    private: repo.private,
  }));
}
