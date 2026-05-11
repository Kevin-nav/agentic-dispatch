import { loadEnv } from "./config/env.js";
import { createHttpServer } from "./server/http.js";

const env = loadEnv();
const server = createHttpServer(env);

server.listen(env.port, () => {
  console.log(`Agentic Dispatch API listening on port ${env.port} for ${env.infisicalEnv}`);
});
