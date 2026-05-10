# Infisical Secret Delivery

Runtime secrets must come from Infisical Cloud or Kubernetes secrets generated from Infisical. Do not commit secret values.

Expected secret names for the initial deployment:

- `CONVEX_DEPLOYMENT`
- `CONVEX_URL`
- `INFISICAL_PROJECT_ID`
- `INFISICAL_ENV`
- `AGENTIC_DISPATCH_SESSION_SECRET`
- `T3_BASE_URL`
- `T3_OWNER_BEARER_TOKEN`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`

The deployment skeletons reference Kubernetes secrets named `agentic-dispatch-api-env` and `agentic-dispatch-t3-env`. Wire these from the chosen Infisical operator or external-secrets controller during VPS rollout.
