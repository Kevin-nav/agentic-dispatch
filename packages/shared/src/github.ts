export interface GitHubInstallation {
  ownerLogin: string;
  installationId: number;
  accountType: "User" | "Organization";
  updatedAt: string;
}

export interface GitHubRepoRef {
  owner: string;
  repo: string;
}

export function parseRepoFullName(value: string): GitHubRepoRef {
  const [owner, repo] = value.split("/");
  if (!owner || !repo || value.split("/").length !== 2) {
    throw new Error(`Invalid repository full name: ${value}`);
  }

  return { owner, repo };
}
