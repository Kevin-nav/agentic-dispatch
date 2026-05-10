import { loadEnv } from "./config/env.js";

const env = loadEnv();

console.log(`Agentic Dispatch API configured for ${env.infisicalEnv}`);
