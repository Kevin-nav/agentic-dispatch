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
- API deployment is running: `agentic-dispatch-api` is `1/1`.
- Web deployment is running: `agentic-dispatch-web` is `1/1`.
- T3 deployment is running: `t3-code-server` is `1/1`.
- Public web route responds with HTTP 200 at `https://dispatch.sankoslides.com`.
- Public API proxy responds at `https://dispatch.sankoslides.com/api/health`.
- `/api/health` reports `api`, `convex`, `github`, and `t3` as `ok`.

Resolved issue:

```text
failed to fetch oauth token from ghcr.io: 403 Forbidden
```

- The GHCR package visibility was corrected by the repository owner.
- API and web images were pulled into containerd on the VPS.
- Kubernetes manifests now use `imagePullPolicy: IfNotPresent` to avoid forced authorization checks on every restart.
- The deploy workflow pre-pulls the API and web images on the VPS before applying manifests.

Additional fix:

- API image `444837d` includes `apps/api/node_modules`, which is required for pnpm package dependency resolution at runtime.

T3 status:

- T3 image is `ghcr.io/kevin-nav/agentic-dispatch-t3:latest`.
- The image installs the official npm package `t3@0.0.23` and `@openai/codex@0.130.0`; it does not build from the local `t3code` clone.
- T3 uses persistent PVC `t3-code-server-data`.
- T3 mounts the shared workspace PVC `agentic-dispatch-workspaces` at `/workspaces/agentic-dispatch`.
- T3 Codex auth is bootstrapped from Kubernetes secret `agentic-dispatch-codex-home`.
- A T3 owner bearer token was issued from inside the T3 pod and manually injected into Kubernetes secret `agentic-dispatch-api-env` for immediate validation.
- Infisical production still needs `T3_OWNER_BEARER_TOKEN` added through the UI because the current machine identity can read/sync but received `403` on secret writes.
- `infra/k8s/infisical/infisical-secrets.yaml` now includes `T3_OWNER_BEARER_TOKEN` in the API env template so the operator will preserve it after the Infisical value exists.

No secret values, bearer tokens, private keys, pairing tokens, raw environment dumps, or unredacted command output were recorded.
