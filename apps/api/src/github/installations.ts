import type { Octokit } from "@octokit/rest";
import type { GitHubInstallation } from "@agentic-dispatch/shared";

interface InstallationStore {
  upsertInstallation(installation: GitHubInstallation): Promise<void>;
}

function mapAccountType(type: string | undefined): GitHubInstallation["accountType"] {
  return type === "Organization" ? "Organization" : "User";
}

function mapInstallation(installation: Awaited<ReturnType<Octokit["apps"]["listInstallations"]>>["data"][number]): GitHubInstallation {
  if (!installation.account?.login) {
    throw new Error(`GitHub installation ${installation.id} is missing an account login`);
  }

  return {
    ownerLogin: installation.account.login,
    installationId: installation.id,
    accountType: mapAccountType(installation.account.type),
    updatedAt: installation.updated_at ?? new Date().toISOString(),
  };
}

export async function listInstallations(octokit: Octokit): Promise<GitHubInstallation[]> {
  const installations = await octokit.paginate(octokit.apps.listInstallations);
  return installations.map(mapInstallation);
}

export async function syncInstallations(
  octokit: Octokit,
  store: InstallationStore,
): Promise<GitHubInstallation[]> {
  const installations = await listInstallations(octokit);

  for (const installation of installations) {
    await store.upsertInstallation(installation);
  }

  return installations;
}
