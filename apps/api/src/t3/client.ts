import {
  buildProjectCreateCommand,
  buildThreadCreateCommand,
  buildTurnInterruptCommand,
  buildTurnStartCommand,
  type ProjectCreateInput,
  type T3DispatchCommand,
  type ThreadCreateInput,
  type TurnStartInput,
} from "./commands.js";

export interface T3ClientConfig {
  baseUrl: string;
  ownerBearerToken: string;
  fetchImpl?: typeof fetch;
}

export interface DispatchResponse {
  sequence?: number;
}

export type T3Snapshot = Record<string, unknown>;

export async function getSnapshot(config: T3ClientConfig): Promise<T3Snapshot> {
  return requestJson<T3Snapshot>(config, "/api/orchestration/snapshot", {
    method: "GET",
  });
}

export async function dispatchCommand(
  config: T3ClientConfig,
  command: T3DispatchCommand,
): Promise<DispatchResponse> {
  return requestJson<DispatchResponse>(config, "/api/orchestration/dispatch", {
    method: "POST",
    body: JSON.stringify(command),
  });
}

export async function createProject(
  config: T3ClientConfig,
  input: ProjectCreateInput,
) {
  const command = buildProjectCreateCommand(input);
  await dispatchCommand(config, command);
  return command;
}

export async function createThread(
  config: T3ClientConfig,
  input: ThreadCreateInput,
) {
  const command = buildThreadCreateCommand(input);
  await dispatchCommand(config, command);
  return command;
}

export async function startTurn(config: T3ClientConfig, input: TurnStartInput) {
  const command = buildTurnStartCommand(input);
  await dispatchCommand(config, command);
  return command;
}

export async function interruptTurn(
  config: T3ClientConfig,
  input: { threadId: string; commandId?: string },
) {
  const command = buildTurnInterruptCommand(input);
  await dispatchCommand(config, command);
  return command;
}

async function requestJson<T>(
  config: T3ClientConfig,
  path: string,
  init: RequestInit,
): Promise<T> {
  if (!config.ownerBearerToken) {
    throw new Error("T3 owner bearer token is required");
  }

  const fetchImpl = config.fetchImpl ?? fetch;
  const response = await fetchImpl(new URL(path, config.baseUrl), {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.ownerBearerToken}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`T3 request failed: ${response.status} ${body}`);
  }

  return (await response.json()) as T;
}
