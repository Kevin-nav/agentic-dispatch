import { getInstallationToken, makeGitHubAppAuth, makeInstallationOctokit } from "../../apps/api/src/github/appAuth.js";
import { listInstallationRepos } from "../../apps/api/src/github/repos.js";

const repoFullName = process.env.GITHUB_PROBE_REPO;

interface GitHubInstallationProbeResult {
  id: number;
  account?: {
    login?: string;
    type?: string;
  } | null;
  updated_at?: string | null;
}

function parseRepoFullName(value: string): { owner: string; repo: string } {
  const [owner, repo, extra] = value.split("/");
  if (!owner || !repo || extra) {
    throw new Error(`Invalid repository full name: ${value}`);
  }

  return { owner, repo };
}

async function requestGitHub<T>(path: string, token: string): Promise<T> {
  const response = await fetch(new URL(path, "https://api.github.com"), {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "user-agent": "agentic-dispatch-validation-probe",
      "x-github-api-version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub request failed: ${response.status} ${body}`);
  }

  return (await response.json()) as T;
}

const appAuth = makeGitHubAppAuth();
const appToken = await appAuth({ type: "app" });

console.log("Checking GitHub App authentication");
const rawInstallations = await requestGitHub<GitHubInstallationProbeResult[]>("/app/installations", appToken.token);
const installations = rawInstallations.map((installation) => {
  if (!installation.account?.login) {
    throw new Error(`GitHub installation ${installation.id} is missing an account login`);
  }

  return {
    ownerLogin: installation.account.login,
    installationId: installation.id,
    accountType: installation.account.type === "Organization" ? "Organization" : "User",
    updatedAt: installation.updated_at ?? new Date().toISOString(),
  };
});
console.log(`GitHub App authentication worked; found ${installations.length} installation(s)`);

if (installations.length === 0) {
  throw new Error("GitHub App has no installations");
}

if (!repoFullName) {
  console.log("GITHUB_PROBE_REPO is not set; skipping selected repository access check");
  process.exit(0);
}

const { owner, repo } = parseRepoFullName(repoFullName);
const installation = installations.find((candidate) => candidate.ownerLogin.toLowerCase() === owner.toLowerCase());

if (!installation) {
  throw new Error(`No GitHub App installation found for ${owner}`);
}

const installationToken = await getInstallationToken(installation.installationId, appAuth);
if (!installationToken.token || !installationToken.expiresAt) {
  throw new Error(`Installation token response for ${owner} was incomplete`);
}

const installationOctokit = await makeInstallationOctokit(installation.installationId, appAuth);
const repos = await listInstallationRepos(installationOctokit);
const repoVisible = repos.some(
  (candidate) => candidate.owner.toLowerCase() === owner.toLowerCase() && candidate.repo === repo,
);

if (!repoVisible) {
  throw new Error(`Repository ${repoFullName} was not visible to installation ${installation.installationId}`);
}

const response = await installationOctokit.repos.get({ owner, repo });
console.log(
  JSON.stringify(
    {
      owner,
      repo,
      defaultBranch: response.data.default_branch,
      private: response.data.private,
      installationId: installation.installationId,
    },
    null,
    2,
  ),
);
