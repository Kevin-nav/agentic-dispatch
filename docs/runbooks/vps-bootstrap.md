# VPS Bootstrap

This runbook records the initial order for bringing Agentic Dispatch onto the K3s VPS. Do not apply these manifests until Task 5 has been reviewed.

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
```

The API service account intentionally has no broad RBAC. Add narrow Job/Pod permissions later only if the orchestrator needs them.

## Secrets

Wire Infisical to create:

- `agentic-dispatch-api-env`
- `agentic-dispatch-t3-env`

Never store secret values in manifests or deployment logs.

## Tailscale

Install the Tailscale Kubernetes Operator with an OAuth client that has:

- Devices Core: Write
- Auth Keys: Write
- Services: Write

Use the tags documented in `infra/k8s/tailscale/README.md`.

## Application Order

Deploy T3 first, then the API, then the web app:

```bash
kubectl apply -f infra/k8s/apps/t3-deployment.yaml
kubectl apply -f infra/k8s/apps/api-deployment.yaml
kubectl apply -f infra/k8s/apps/web-deployment.yaml
kubectl apply -f infra/k8s/tailscale/t3-service.yaml
kubectl apply -f infra/k8s/tailscale/web-service.yaml
```

Validate T3 pairing and orchestration snapshot access before dispatching any repository job.
