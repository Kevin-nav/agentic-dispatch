export interface AppEnv {
  infisicalEnv: string;
  convexUrl?: string;
  port: number;
  t3BaseUrl: string;
  t3OwnerBearerToken: string;
  workspaceRoot: string;
  jobPollIntervalMs: number;
  jobTimeoutMs: number;
}

export function loadEnv(): AppEnv {
  return {
    infisicalEnv: process.env.INFISICAL_ENV ?? "prod",
    convexUrl: process.env.CONVEX_URL,
    port: parseIntegerEnv("PORT", 3001),
    t3BaseUrl:
      process.env.T3_BASE_URL ??
      "http://t3-code-server.agentic-dispatch.svc.cluster.local:3773",
    t3OwnerBearerToken: process.env.T3_OWNER_BEARER_TOKEN ?? "",
    workspaceRoot:
      process.env.AGENTIC_DISPATCH_WORKSPACE_ROOT ??
      "/workspaces/agentic-dispatch",
    jobPollIntervalMs: parseIntegerEnv("AGENTIC_DISPATCH_JOB_POLL_INTERVAL_MS", 5_000),
    jobTimeoutMs: parseIntegerEnv("AGENTIC_DISPATCH_JOB_TIMEOUT_MS", 60 * 60 * 1_000),
  };
}

function parseIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}
