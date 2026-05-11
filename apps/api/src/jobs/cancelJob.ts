import type { ActiveJobRegistry, JobStore } from "./jobState.js";
import type { T3JobClient } from "./runJob.js";

export interface CancelJobDependencies {
  store: JobStore;
  t3: Pick<T3JobClient, "interruptTurn">;
  activeJobs?: ActiveJobRegistry;
}

export async function cancelJob(
  jobId: string,
  deps: CancelJobDependencies,
  reason = "Job cancelled",
) {
  const job = await deps.store.getJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  deps.activeJobs?.abort(jobId);
  const threadId = job.t3ThreadId ?? deps.activeJobs?.get(jobId)?.t3ThreadId;
  if (threadId) {
    await deps.t3.interruptTurn({ threadId });
  }

  await deps.store.cancelJob(jobId, reason);
  return deps.store.getJob(jobId);
}
