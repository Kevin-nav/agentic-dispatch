import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const defaultExecFile = promisify(execFileCallback);

export type GitExecFile = (
  file: string,
  args: readonly string[],
  options?: { cwd?: string },
) => Promise<{ stdout: string; stderr: string }>;

export interface GitCommandOptions {
  cwd?: string;
  execFile?: GitExecFile;
}

export async function git(args: readonly string[], options: GitCommandOptions = {}) {
  const execFile = options.execFile ?? defaultExecFile;
  return execFile("git", args, options.cwd ? { cwd: options.cwd } : undefined);
}

export function buildAuthenticatedGitHubUrl(owner: string, repo: string, token: string): string {
  return `https://x-access-token:${encodeURIComponent(token)}@github.com/${owner}/${repo}.git`;
}

export async function cloneRepository(input: {
  remoteUrl: string;
  targetPath: string;
  execFile?: GitExecFile;
}): Promise<void> {
  await git(["clone", "--no-checkout", input.remoteUrl, input.targetPath], {
    execFile: input.execFile,
  });
}

export async function fetchBranch(input: {
  repositoryPath: string;
  remoteUrl?: string;
  branch: string;
  execFile?: GitExecFile;
}): Promise<void> {
  const remote = input.remoteUrl ?? "origin";
  await git(["fetch", "--prune", remote, input.branch], {
    cwd: input.repositoryPath,
    execFile: input.execFile,
  });
}

export async function checkoutWorkBranch(input: {
  repositoryPath: string;
  baseBranch: string;
  workBranch: string;
  execFile?: GitExecFile;
}): Promise<void> {
  await git(["checkout", "-B", input.workBranch, `origin/${input.baseBranch}`], {
    cwd: input.repositoryPath,
    execFile: input.execFile,
  });
}
