import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const convexUrl = process.env.CONVEX_URL;
const convexAuthToken = process.env.CONVEX_AUTH_TOKEN;

if (!convexUrl) {
  throw new Error("CONVEX_URL is required");
}

const client = new ConvexHttpClient(convexUrl, {
  auth: convexAuthToken,
  logger: false,
});

const getHealthSummary = makeFunctionReference<"query", Record<string, never>, unknown[]>("health:getHealthSummary");

console.log(`Checking Convex deployment at ${convexUrl}`);
const healthSummary = await client.query(getHealthSummary, {});

if (!Array.isArray(healthSummary)) {
  throw new Error("Convex health summary query returned an unexpected response");
}

console.log(`Convex health summary query worked; ${healthSummary.length} service check(s) returned`);
