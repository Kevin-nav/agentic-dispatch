# VPS Bootstrap

This runbook records the initial order for bringing Agentic Dispatch onto the K3s VPS. Do not apply these manifests until Task 9 is explicitly approved.

## Source Of Truth

Use GitHub as the handoff path to the VPS:

```bash
git clone https://github.com/Kevin-nav/agentic-dispatch.git
cd agentic-dispatch
git pull --ff-only origin main
```

Confirm the API and web images were built by GitHub Actions and are pullable from GHCR before applying application manifests:

```text
ghcr.io/kevin-nav/agentic-dispatch-api:latest
ghcr.io/kevin-nav/agentic-dispatch-web:latest
```

Prefer replacing `latest` with the immutable `sha-<commit>` tags from the approved GitHub Actions run during the live rollout.

## Public Web Access

The web application is exposed through Cloudflare Tunnel at:

```text
https://dispatch.sankslides.com
```

Tailscale is not required for the web app. Keep Tailscale only for private T3/admin access if needed.

## Preflight

Run read-only checks:

```bash
kubectl get nodes -o wide
kubectl get ns
kubectl get networkpolicy -A
```

Confirm the existing cluster is healthy and no production namespace depends on permissive namespace-wide policies.

## Base Namespace

Apply the isolated namespace and baseline controls:

```bash
kubectl apply -f infra/k8s/base/namespace.yaml
kubectl apply -f infra/k8s/base/serviceaccounts.yaml
kubectl apply -f infra/k8s/base/pod-security.yaml
kubectl apply -f infra/k8s/base/networkpolicies/default-deny.yaml
kubectl apply -f infra/k8s/base/networkpolicies/allow-dns.yaml
kubectl apply -f infra/k8s/base/networkpolicies/allow-control-plane-internal.yaml
kubectl apply -f infra/k8s/base/networkpolicies/allow-public-egress.yaml
```

The API service account intentionally has no broad RBAC. Add narrow Job/Pod permissions later only if the orchestrator needs them.

## Secrets

Install the Infisical Kubernetes Operator, then create the Universal Auth bootstrap secret in the `agentic-dispatch` namespace from local values:

```bash
kubectl -n agentic-dispatch create secret generic infisical-universal-auth \
  --from-literal=clientId="$INFISICAL_CLIENT_ID" \
  --from-literal=clientSecret="$INFISICAL_CLIENT_SECRET"
```

Apply the Infisical sync resources:

```bash
kubectl apply -f infra/k8s/infisical/serviceaccount.yaml
kubectl apply -f infra/k8s/infisical/infisical-secrets.yaml
```

Infisical will create:

- `agentic-dispatch-api-env`
- `agentic-dispatch-t3-env`
- `agentic-dispatch-cloudflare-tunnel`

Never store secret values in manifests or deployment logs.

## Cloudflare Tunnel

Confirm the Cloudflare tunnel has a public hostname:

```text
dispatch.sankslides.com
```

The origin service should be:

```text
http://agentic-dispatch-web.agentic-dispatch.svc.cluster.local:80
```

The `cloudflared` deployment runs in the `agentic-dispatch` namespace and reads `CLOUDFLARE_TUNNEL_TOKEN` from the Infisical-managed Kubernetes secret `agentic-dispatch-cloudflare-tunnel`.

## Application Order

Deploy T3 first, then the API, then the web app:

```bash
kubectl apply -f infra/k8s/apps/t3-deployment.yaml
kubectl apply -f infra/k8s/apps/api-deployment.yaml
kubectl apply -f infra/k8s/apps/api-service.yaml
kubectl apply -f infra/k8s/apps/web-deployment.yaml
kubectl apply -f infra/k8s/apps/web-service.yaml
kubectl apply -f infra/k8s/base/networkpolicies/allow-cloudflare-tunnel.yaml
kubectl apply -f infra/k8s/cloudflare/cloudflared-deployment.yaml
kubectl apply -f infra/k8s/base/networkpolicies/allow-tailscale-ingress.yaml
kubectl apply -f infra/k8s/tailscale/t3-service.yaml
```

Validate T3 pairing and orchestration snapshot access before dispatching any repository job.

Do not apply `infra/k8s/apps/t3-deployment.yaml` until its image has been replaced with a verified packaged T3 Code server image. The placeholder image is intentionally not deployment-ready.
