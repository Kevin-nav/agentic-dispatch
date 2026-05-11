import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";

import {
  buildAuthenticatedGitHubUrl,
  checkoutWorkBranch,
  cloneRepository,
  fetchBranch,
  type GitExecFile,
} from "./git.js";

export interface PrepareWorkspaceInput {
  root: string;
  jobId: string;
  owner: string;
  repo: string;
  baseBranch: string;
  workBranch: string;
  installationToken: string;
  execFile?: GitExecFile;
}

export interface PreparedWorkspace {
  path: string;
  workBranch: string;
}

export async function prepareWorkspace(input: PrepareWorkspaceInput): Promise<PreparedWorkspace> {
  const repositoryPath = getJobRepositoryPath(input.root, input.jobId, input.owner, input.repo);
  const remoteUrl = buildAuthenticatedGitHubUrl(input.owner, input.repo, input.installationToken);

  await mkdir(join(input.root, "jobs", safePathSegment(input.jobId), safePathSegment(input.owner)), {
    recursive: true,
  });

  if (await repositoryExists(repositoryPath)) {
    await fetchBranch({
      repositoryPath,
      remoteUrl,
      branch: input.baseBranch,
      execFile: input.execFile,
    });
  } else {
    await cloneRepository({
      remoteUrl,
      targetPath: repositoryPath,
      execFile: input.execFile,
    });
    await fetchBranch({
      repositoryPath,
      branch: input.baseBranch,
      execFile: input.execFile,
    });
  }

  await checkoutWorkBranch({
    repositoryPath,
    baseBranch: input.baseBranch,
    workBranch: input.workBranch,
    execFile: input.execFile,
  });

  return { path: repositoryPath, workBranch: input.workBranch };
}

export function getJobRepositoryPath(
  root: string,
  jobId: string,
  owner: string,
  repo: string,
): string {
  return join(
    root,
    "jobs",
    safePathSegment(jobId),
    safePathSegment(owner),
    safePathSegment(repo),
  );
}

function safePathSegment(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9_.-]/g, "-");
  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new Error(`Invalid path segment: ${value}`);
  }
  return sanitized;
}

async function repositoryExists(path: string): Promise<boolean> {
  try {
    const result = await stat(join(path, ".git"));
    return result.isDirectory();
  } catch {
    return false;
  }
}
