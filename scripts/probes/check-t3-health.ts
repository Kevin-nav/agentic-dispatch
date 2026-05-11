import { readFile } from "node:fs/promises";

import { dispatchCommand, getSnapshot } from "../../apps/api/src/t3/client.js";
import type { T3DispatchCommand } from "../../apps/api/src/t3/commands.js";

const baseUrl = process.env.T3_BASE_URL ?? "http://127.0.0.1:3773";
const ownerBearerToken = process.env.T3_OWNER_BEARER_TOKEN;
const dryRunEnabled = process.env.AGENTIC_DISPATCH_T3_DISPATCH_DRY_RUN === "true";
const dryRunCommandPath = process.env.AGENTIC_DISPATCH_T3_DRY_RUN_COMMAND_JSON;

if (!ownerBearerToken) {
  throw new Error("T3_OWNER_BEARER_TOKEN is required");
}

console.log(`Checking T3 snapshot endpoint at ${baseUrl}`);
const snapshot = await getSnapshot({ baseUrl, ownerBearerToken });

if (!snapshot || typeof snapshot !== "object") {
  throw new Error("T3 snapshot response was not an object");
}

console.log("T3 snapshot endpoint responded");

if (!dryRunEnabled) {
  console.log("T3 dispatch dry-run skipped. Set AGENTIC_DISPATCH_T3_DISPATCH_DRY_RUN=true to enable it.");
  process.exit(0);
}

if (!dryRunCommandPath) {
  throw new Error(
    "AGENTIC_DISPATCH_T3_DRY_RUN_COMMAND_JSON is required when AGENTIC_DISPATCH_T3_DISPATCH_DRY_RUN=true",
  );
}

const dryRunCommand = JSON.parse(await readFile(dryRunCommandPath, "utf8")) as T3DispatchCommand;
await dispatchCommand({ baseUrl, ownerBearerToken }, dryRunCommand);
console.log("T3 dispatch dry-run command was accepted");
