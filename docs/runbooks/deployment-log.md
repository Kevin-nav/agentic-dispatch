# Deployment Log

## 2026-05-11 Initial VPS Rollout

Commit deployed on VPS:

```text
363d516
```

VPS:

```text
ubuntu@149.56.140.212
```

Cluster preflight:

- K3s node `vps-df781a4d` is `Ready`.
- Kubernetes version: `v1.34.6+k3s1`.
- Default storage class: `local-path`.
- Existing namespaces were left untouched.
- Existing network policies were limited to `m-platform-prodlike`.

Resources applied:

- Created Linux system user `agentic-dispatch`.
- Created checkout at `/opt/agentic-dispatch/repo`.
- Created namespace `agentic-dispatch`.
- Applied service accounts for API, web, and T3.
- Installed Helm `v3.19.2`.
- Installed Infisical Kubernetes Operator in `agentic-dispatch`, scoped to that namespace.
- Created Kubernetes bootstrap secret `infisical-universal-auth` from local machine identity values.
- Applied Infisical sync resources.
- Confirmed Infisical created:
  - `agentic-dispatch-api-env`
  - `agentic-dispatch-t3-env`
  - `agentic-dispatch-cloudflare-tunnel`
- Applied default-deny and scoped allow NetworkPolicies.
- Applied API deployment/service and workspace PVC.
- Applied web deployment/service.
- Applied Cloudflare `cloudflared` deployment.

Current status:

- `cloudflared` is running and connected to Cloudflare.
- Cloudflare tunnel config currently reports hostname `dispatch.sankoslides.com`.
- API and web pods are blocked on GHCR image pull authorization.

Blocking issue:

```text
failed to fetch oauth token from ghcr.io: 403 Forbidden
```

The cluster cannot pull:

```text
ghcr.io/kevin-nav/agentic-dispatch-api:latest
ghcr.io/kevin-nav/agentic-dispatch-web:latest
```

Resolution options:

1. Make both GHCR packages public.
2. Create a Kubernetes image pull secret with a GitHub token that has `read:packages`.

T3 status:

- T3 deployment was not applied.
- `infra/k8s/apps/t3-deployment.yaml` still requires a verified packaged T3 Code server image.
- `T3_OWNER_BEARER_TOKEN` is intentionally deferred until T3 is deployed and paired.

No secret values, bearer tokens, private keys, pairing tokens, raw environment dumps, or unredacted command output were recorded.
