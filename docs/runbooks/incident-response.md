# Incident Response Runbook

Use this runbook if Agentic Dispatch credentials are exposed, a job behaves unexpectedly, network isolation fails, or a T3 workspace may have accessed data outside its intended repository.

## First Actions

1. Stop new work intake.
2. Preserve logs and job IDs for review.
3. Do not paste tokens, private keys, or raw secret values into the incident record.
4. If active jobs are running, interrupt them in T3 and mark the corresponding Agentic Dispatch jobs failed or cancelled.

## Contain Kubernetes Workloads

Scale API, web, and T3 deployments to zero:

```bash
kubectl -n agentic-dispatch scale deployment agentic-dispatch-api --replicas=0
kubectl -n agentic-dispatch scale deployment agentic-dispatch-web --replicas=0
kubectl -n agentic-dispatch scale deployment t3-code-server --replicas=0
```

If the namespace itself is suspect, delete it after preserving required evidence:

```bash
kubectl delete namespace agentic-dispatch
```

Recreate the namespace only after root cause and credential rotation are complete.

## Revoke Infisical Machine Identity

In Infisical:

1. Disable or revoke the Agentic Dispatch machine identity client secret.
2. Create a replacement client secret only after the suspected workload is stopped.
3. Review audit logs for secret reads around the incident window.
4. Rotate any downstream secret that may have been exposed.

Required downstream rotations usually include:

```text
AGENTIC_DISPATCH_SESSION_SECRET
T3_OWNER_BEARER_TOKEN
GITHUB_APP_PRIVATE_KEY
Tailscale OAuth credential
Convex deploy/admin credentials if used by the runtime
```

## Rotate GitHub App Private Key

In GitHub App settings:

1. Generate a new private key.
2. Store the new key in Infisical.
3. Delete the old private key.
4. Review installations and repository permissions.
5. Review recent branches, commits, pull requests, and workflow edits created by the app.

If repository integrity is in doubt, suspend the GitHub App installation until review is complete.

## Revoke T3 Owner Token

Invalidate the T3 owner bearer token from the T3 service or by rotating the backing owner session credential.

After rotation:

1. Store the replacement token in Infisical.
2. Restart only the workloads that need the token.
3. Run `scripts/probes/check-t3-health.ts`.
4. Confirm old tokens no longer authenticate.

## Revoke Tailscale OAuth Credential

In the Tailscale admin console:

1. Revoke the OAuth credential used by the Kubernetes operator if it may be exposed.
2. Remove any unexpected devices, services, or auth keys with Agentic Dispatch tags.
3. Create a replacement OAuth credential with only the required scopes:

```text
Devices Core: Write
Auth Keys: Write
Services: Write
```

4. Update the cluster secret through the approved secret path.
5. Confirm Tailscale devices re-register with expected tags only.

## Network Isolation Failure

If `check-network-isolation.sh` shows private, cluster, metadata, or cross-namespace access:

1. Stop all Agentic Dispatch workloads.
2. Leave the namespace in place for policy inspection unless active compromise requires deletion.
3. Capture:

```bash
kubectl -n agentic-dispatch get networkpolicy -o yaml
kubectl -n agentic-dispatch get pods -o wide
kubectl get nodes -o wide
```

4. Review CNI behavior for `ipBlock` exceptions and DNS policy.
5. Do not restart autonomous jobs until the probe passes.

## Recovery Gate

Resume production use only after:

- All suspected credentials are rotated or revoked.
- The live cluster passes the validation runbook.
- GitHub repositories have been reviewed for unexpected pushes, pull requests, and workflow changes.
- T3 workspace storage has been inspected or replaced.
- The incident record includes timeline, root cause, blast radius, actions taken, and remaining risks.
