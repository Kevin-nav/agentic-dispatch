export const T3_TESTED_VERSION = "v0.0.23";
export const DEFAULT_T3_MODEL = "gpt-5.4";
export const DEFAULT_T3_PROVIDER = "codex";
export const DEFAULT_T3_RUNTIME_MODE = "full-access";
export const DEFAULT_T3_INTERACTION_MODE = "default";

export interface T3ModelSelection {
  provider: typeof DEFAULT_T3_PROVIDER;
  model: string;
}

export interface ProjectCreateInput {
  title: string;
  workspaceRoot: string;
  model?: string;
  projectId?: string;
  commandId?: string;
  createdAt?: string;
}

export interface ThreadCreateInput {
  projectId: string;
  title: string;
  branch: string;
  model?: string;
  threadId?: string;
  commandId?: string;
  worktreePath?: string | null;
  createdAt?: string;
}

export interface TurnStartInput {
  threadId: string;
  prompt: string;
  titleSeed: string;
  model?: string;
  messageId?: string;
  commandId?: string;
  createdAt?: string;
}

export interface ProjectCreateCommand {
  type: "project.create";
  commandId: string;
  projectId: string;
  title: string;
  workspaceRoot: string;
  defaultModelSelection: T3ModelSelection;
  createdAt: string;
}

export interface ThreadCreateCommand {
  type: "thread.create";
  commandId: string;
  threadId: string;
  projectId: string;
  title: string;
  modelSelection: T3ModelSelection;
  runtimeMode: typeof DEFAULT_T3_RUNTIME_MODE;
  interactionMode: typeof DEFAULT_T3_INTERACTION_MODE;
  branch: string;
  worktreePath: string | null;
  createdAt: string;
}

export interface TurnStartCommand {
  type: "thread.turn.start";
  commandId: string;
  threadId: string;
  message: {
    messageId: string;
    role: "user";
    text: string;
    attachments: [];
  };
  modelSelection: T3ModelSelection;
  titleSeed: string;
  runtimeMode: typeof DEFAULT_T3_RUNTIME_MODE;
  interactionMode: typeof DEFAULT_T3_INTERACTION_MODE;
  createdAt: string;
}

export type T3DispatchCommand =
  | ProjectCreateCommand
  | ThreadCreateCommand
  | TurnStartCommand;

export function buildProjectCreateCommand(
  input: ProjectCreateInput,
): ProjectCreateCommand {
  return {
    type: "project.create",
    commandId: input.commandId ?? crypto.randomUUID(),
    projectId: input.projectId ?? crypto.randomUUID(),
    title: input.title,
    workspaceRoot: input.workspaceRoot,
    defaultModelSelection: modelSelection(input.model),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function buildThreadCreateCommand(
  input: ThreadCreateInput,
): ThreadCreateCommand {
  return {
    type: "thread.create",
    commandId: input.commandId ?? crypto.randomUUID(),
    threadId: input.threadId ?? crypto.randomUUID(),
    projectId: input.projectId,
    title: input.title,
    modelSelection: modelSelection(input.model),
    runtimeMode: DEFAULT_T3_RUNTIME_MODE,
    interactionMode: DEFAULT_T3_INTERACTION_MODE,
    branch: input.branch,
    worktreePath: input.worktreePath ?? null,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function buildTurnStartCommand(input: TurnStartInput): TurnStartCommand {
  return {
    type: "thread.turn.start",
    commandId: input.commandId ?? crypto.randomUUID(),
    threadId: input.threadId,
    message: {
      messageId: input.messageId ?? crypto.randomUUID(),
      role: "user",
      text: input.prompt,
      attachments: [],
    },
    modelSelection: modelSelection(input.model),
    titleSeed: input.titleSeed,
    runtimeMode: DEFAULT_T3_RUNTIME_MODE,
    interactionMode: DEFAULT_T3_INTERACTION_MODE,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

function modelSelection(model = DEFAULT_T3_MODEL): T3ModelSelection {
  return {
    provider: DEFAULT_T3_PROVIDER,
    model,
  };
}
