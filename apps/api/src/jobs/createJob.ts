import { newId } from "@agentic-dispatch/shared";

import { buildWorkBranch, type JobStore } from "./jobState.js";

export interface CreateJobRequest {
  repoOwner: string;
  repoName: string;
  baseBranch?: string;
  prompt: string;
  mode?: "async_pr" | "interactive_t3";
}

export async function createJob(request: CreateJobRequest, store: JobStore) {
  const normalized = normalizeCreateJobRequest(request);
  const jobId = newId("job");
  const workBranch = buildWorkBranch(jobId, normalized.prompt);

  return store.createJob({
    id: jobId,
    repoOwner: normalized.repoOwner,
    repoName: normalized.repoName,
    baseBranch: normalized.baseBranch,
    workBranch,
    prompt: normalized.prompt,
    mode: normalized.mode,
  });
}

function normalizeCreateJobRequest(request: CreateJobRequest): Required<CreateJobRequest> {
  const repoOwner = request.repoOwner?.trim();
  const repoName = request.repoName?.trim();
  const baseBranch = request.baseBranch?.trim() || "main";
  const prompt = request.prompt?.trim();
  const mode = request.mode ?? "async_pr";

  if (!repoOwner) throw new Error("repoOwner is required");
  if (!repoName) throw new Error("repoName is required");
  if (!prompt) throw new Error("prompt is required");
  if (mode !== "async_pr" && mode !== "interactive_t3") {
    throw new Error("Unsupported job mode");
  }

  return { repoOwner, repoName, baseBranch, prompt, mode };
}
