import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { getSnapshot, createProject, createThread, startTurn } from "../../apps/api/src/t3/client.js";

const baseUrl = process.env.T3_BASE_URL ?? "http://127.0.0.1:3773";
const ownerBearerToken = process.env.T3_OWNER_BEARER_TOKEN;

if (!ownerBearerToken) {
  throw new Error("Set T3_OWNER_BEARER_TOKEN to a redacted local owner bearer session token.");
}

const workspaceRoot = await mkdtemp(join(tmpdir(), "agentic-dispatch-t3-probe-"));
await writeFile(join(workspaceRoot, "README.md"), "# T3 local dispatch probe\n");

const config = { baseUrl, ownerBearerToken };

console.log(`Checking T3 snapshot at ${baseUrl}`);
await getSnapshot(config);

const project = await createProject(config, {
  title: "Agentic Dispatch Local Probe",
  workspaceRoot,
});

const thread = await createThread(config, {
  projectId: project.projectId,
  title: "Agentic Dispatch Local Probe",
  branch: "main",
});

await startTurn(config, {
  threadId: thread.threadId,
  titleSeed: "Agentic Dispatch Local Probe",
  prompt: "Reply with exactly AGENTIC_DISPATCH_T3_PROBE and do not edit files.",
});

console.log(
  JSON.stringify(
    {
      projectId: project.projectId,
      threadId: thread.threadId,
      workspaceRoot,
      note: "Poll /api/orchestration/snapshot or the paired T3 UI for completion.",
    },
    null,
    2,
  ),
);
