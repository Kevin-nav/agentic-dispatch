const apiUrl = process.env.INFISICAL_API_URL ?? "https://us.infisical.com";
const projectId = process.env.INFISICAL_PROJECT_ID;
const environment = process.env.INFISICAL_ENV ?? "prod";
const clientId = process.env.INFISICAL_CLIENT_ID;
const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
const organizationSlug = process.env.INFISICAL_ORGANIZATION_SLUG;
const secretPath = process.env.INFISICAL_SECRET_PATH ?? "/";
const requiredSecrets = (
  process.env.INFISICAL_REQUIRED_SECRETS ??
  "AGENTIC_DISPATCH_SESSION_SECRET,T3_OWNER_BEARER_TOKEN,GITHUB_APP_ID,GITHUB_APP_PRIVATE_KEY"
)
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

if (!projectId) throw new Error("INFISICAL_PROJECT_ID is required");
if (!clientId) throw new Error("INFISICAL_CLIENT_ID is required");
if (!clientSecret) throw new Error("INFISICAL_CLIENT_SECRET is required");
if (requiredSecrets.length === 0) throw new Error("At least one required secret name must be configured");

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(new URL(path, apiUrl), init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Infisical request failed: ${response.status} ${body}`);
  }

  return (await response.json()) as T;
}

const loginBody: Record<string, string> = {
  clientId,
  clientSecret,
};

if (organizationSlug) {
  loginBody.organizationSlug = organizationSlug;
}

console.log(`Checking Infisical machine identity against ${apiUrl}`);
const login = await requestJson<{ accessToken: string; tokenType: "Bearer" }>("/api/v1/auth/universal-auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(loginBody),
});

if (!login.accessToken || login.tokenType !== "Bearer") {
  throw new Error("Infisical login response did not include a bearer access token");
}

for (const secretName of requiredSecrets) {
  const params = new URLSearchParams({
    projectId,
    environment,
    secretPath,
    viewSecretValue: "false",
    expandSecretReferences: "false",
    includeImports: "true",
  });

  const result = await requestJson<{ secret?: { secretKey?: string; secretValue?: string } }>(
    `/api/v4/secrets/${encodeURIComponent(secretName)}?${params.toString()}`,
    {
      method: "GET",
      headers: { authorization: `Bearer ${login.accessToken}` },
    },
  );

  if (result.secret?.secretKey !== secretName) {
    throw new Error(`Infisical did not return metadata for required secret ${secretName}`);
  }

  if (typeof result.secret.secretValue === "string" && result.secret.secretValue.length > 0) {
    throw new Error(`Infisical returned a value for ${secretName}; probe expected metadata only`);
  }
}

console.log(`Infisical check passed; ${requiredSecrets.length} required secret(s) exist and values were not printed`);
