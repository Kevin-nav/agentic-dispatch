# Infisical Secret Delivery

Runtime secrets come from Infisical Cloud and are synced into Kubernetes by the Infisical Kubernetes Operator. Do not commit secret values.

The operator CRDs in this directory use Universal Auth and expect this bootstrap Kubernetes secret to exist in the `agentic-dispatch` namespace before applying `infisical-secrets.yaml`:

```text
infisical-universal-auth
```

Create it on the VPS from local secret values, not from a committed manifest:

```bash
kubectl -n agentic-dispatch create secret generic infisical-universal-auth \
  --from-literal=clientId="$INFISICAL_CLIENT_ID" \
  --from-literal=clientSecret="$INFISICAL_CLIENT_SECRET"
```

Expected Infisical Production secret names:

- `CONVEX_DEPLOYMENT`
- `CONVEX_URL`
- `CONVEX_SITE_URL`
- `INFISICAL_PROJECT_ID`
- `INFISICAL_ENV`
- `AGENTIC_DISPATCH_SESSION_SECRET`
- `T3_BASE_URL`
- `T3_OWNER_BEARER_TOKEN`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `CLOUDFLARE_TUNNEL_TOKEN`

The operator creates these Kubernetes secrets:

- `agentic-dispatch-api-env`
- `agentic-dispatch-t3-env`
- `agentic-dispatch-cloudflare-tunnel`

`T3_OWNER_BEARER_TOKEN` may stay empty until the T3 service is deployed and paired. Fill it in Infisical Production before running autonomous jobs.
