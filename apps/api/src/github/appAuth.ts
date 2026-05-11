import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export interface GitHubAppAuthConfig {
  appId?: string;
  privateKey?: string;
}

export interface InstallationToken {
  token: string;
  expiresAt: string;
  permissions?: Record<string, string>;
  repositorySelection?: string;
}

export type GitHubAppAuth = ReturnType<typeof createAppAuth>;

export const githubAppRequiredPermissions = {
  contents: "write",
  pull_requests: "write",
  workflows: "write",
} as const;

function readGitHubAppConfig(config: GitHubAppAuthConfig = {}) {
  const appId = config.appId ?? process.env.GITHUB_APP_ID;
  const privateKey = config.privateKey ?? process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId) {
    throw new Error("GITHUB_APP_ID is required");
  }

  if (!privateKey) {
    throw new Error("GITHUB_APP_PRIVATE_KEY is required");
  }

  return {
    appId,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  };
}

export function makeGitHubAppAuth(config: GitHubAppAuthConfig = {}): GitHubAppAuth {
  return createAppAuth(readGitHubAppConfig(config));
}

export function makeGitHubAppOctokit(config: GitHubAppAuthConfig = {}): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: readGitHubAppConfig(config),
  });
}

export async function getInstallationToken(
  installationId: number,
  auth: GitHubAppAuth = makeGitHubAppAuth(),
): Promise<InstallationToken> {
  const result = await auth({
    type: "installation",
    installationId,
  });

  return {
    token: result.token,
    expiresAt: result.expiresAt,
    permissions: result.permissions,
    repositorySelection: result.repositorySelection,
  };
}

export async function makeInstallationOctokit(
  installationId: number,
  auth: GitHubAppAuth = makeGitHubAppAuth(),
): Promise<Octokit> {
  const { token } = await getInstallationToken(installationId, auth);
  return new Octokit({ auth: token });
}
