export interface AppEnv {
  infisicalEnv: string;
  t3BaseUrl: string;
}

export function loadEnv(): AppEnv {
  return {
    infisicalEnv: process.env.INFISICAL_ENV ?? "prod",
    t3BaseUrl:
      process.env.T3_BASE_URL ??
      "http://t3-code-server.agentic-dispatch.svc.cluster.local:3773",
  };
}
