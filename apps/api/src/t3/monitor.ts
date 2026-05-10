import { getSnapshot, type T3ClientConfig, type T3Snapshot } from "./client.js";

export interface T3ThreadMonitorState {
  status: "running" | "completed" | "failed" | "unknown";
  assistantFinalResponse?: string;
  prUrl?: string;
  rawThread?: unknown;
}

const prUrlPattern = /https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/\d+/;

export async function pollThreadOnce(
  config: T3ClientConfig,
  threadId: string,
): Promise<T3ThreadMonitorState> {
  return inspectThreadSnapshot(await getSnapshot(config), threadId);
}

export function inspectThreadSnapshot(
  snapshot: T3Snapshot,
  threadId: string,
): T3ThreadMonitorState {
  const thread = findThread(snapshot, threadId);
  if (!thread || typeof thread !== "object") {
    return { status: "unknown" };
  }

  const text = collectText(thread);
  const failed = hasValue(thread, ["failed", "error", "errored"]);
  const completed = hasValue(thread, ["completed"]) || hasSessionReady(thread);
  const running = hasValue(thread, ["running", "in_progress"]);
  const assistantFinalResponse = latestAssistantText(thread);

  return {
    status: failed ? "failed" : completed ? "completed" : running ? "running" : "unknown",
    assistantFinalResponse,
    prUrl: (assistantFinalResponse ?? text).match(prUrlPattern)?.[0],
    rawThread: thread,
  };
}

function findThread(value: unknown, threadId: string): unknown {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if ("threadId" in value && value.threadId === threadId) {
    return value;
  }

  if ("id" in value && value.id === threadId) {
    return value;
  }

  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      const match = child.map((item) => findThread(item, threadId)).find(Boolean);
      if (match) return match;
    } else {
      const match = findThread(child, threadId);
      if (match) return match;
    }
  }

  return undefined;
}

function latestAssistantText(value: unknown): string | undefined {
  const messages = collectMessageObjects(value).filter(
    (message) => message.role === "assistant" && typeof message.text === "string",
  );

  return messages.at(-1)?.text as string | undefined;
}

function collectMessageObjects(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== "object") return [];
  const current = value as Record<string, unknown>;
  const here = "role" in current ? [current] : [];
  return here.concat(Object.values(current).flatMap(collectMessageObjects));
}

function collectText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return Object.values(value).map(collectText).join("\n");
}

function hasValue(value: unknown, needles: string[]): boolean {
  if (typeof value === "string") {
    return needles.includes(value.toLowerCase());
  }

  if (!value || typeof value !== "object") return false;
  return Object.values(value).some((child) => hasValue(child, needles));
}

function hasSessionReady(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.session?.toString().toLowerCase() === "ready";
}
