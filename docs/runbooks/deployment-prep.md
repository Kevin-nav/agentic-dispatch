# Deployment Preparation

This is the pre-Task 9 checklist. It prepares the repository and artifacts, but it does not apply manifests to the VPS.

## GitHub Handoff

The VPS rollout should consume this project through GitHub, not by copying local files from the workstation.

1. Merge the deployment-prep changes to `main`.
2. Push `main` to `origin`:

   ```bash
   git push origin main
   ```

3. Confirm the GitHub Actions workflow `Build Images` published:

   ```text
   ghcr.io/kevin-nav/agentic-dispatch-api:latest
   ghcr.io/kevin-nav/agentic-dispatch-web:latest
   ```

4. On the VPS, update the checkout from GitHub:

   ```bash
   git clone https://github.com/Kevin-nav/agentic-dispatch.git
   cd agentic-dispatch
   git pull --ff-only origin main
   ```

Use immutable `sha-<commit>` image tags for the real Task 9 rollout when possible. `latest` is present in manifests only as a convenience default before the first live deployment.

## Required Before Task 9

- GitHub repository has the latest code.
- GitHub Actions image build is green.
- GHCR package visibility and VPS pull access are confirmed.
- Infisical contains the required API and T3 secret values.
- Infisical contains `CLOUDFLARE_TUNNEL_TOKEN` for `dispatch.sankslides.com`.
- Convex deployment variables are set.
- The T3 Code server image is replaced with a verified packaged/released server image.
- Cloudflare Tunnel public hostname routes `dispatch.sankslides.com` to `agentic-dispatch-web`.
- Tailscale is not required for the web application; keep it only for private T3/admin access if needed.
- No real secret values are committed.

## T3 Image Gate

`infra/k8s/apps/t3-deployment.yaml` still requires a real packaged T3 Code server image. The prior local probe verified installed T3 Code `v0.0.23` through the packaged desktop server entry, but that is not the same as a Linux container artifact.

Do not apply the T3 deployment until the image value is replaced with a tested image that:

- starts the T3 server on port `3773`;
- persists `T3CODE_HOME`;
- can read mounted Codex auth without exposing it in logs;
- supports `/api/orchestration/snapshot`;
- supports `project.create`, `thread.create`, and `thread.turn.start`.

## Local Verification

Run before pushing:

```bash
pnpm typecheck
pnpm test
pnpm build
docker build -f apps/api/Dockerfile -t agentic-dispatch-api:local .
docker build -f apps/web/Dockerfile -t agentic-dispatch-web:local .
```

## CI/CD

GitHub Actions owns build verification and image publication:

- `CI`: install, typecheck, test, and build on pull requests and `main`.
- `Build Images`: verify the workspace, build API/web images, and publish GHCR tags on `main` or manual dispatch.

Runtime secrets are not injected into CI. They stay in Infisical and are synced into Kubernetes during deployment.

The manual `Deploy VPS` workflow needs only VPS access secrets if you choose to use GitHub Actions for deployment:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_SSH_PORT` optional, defaults to `22`

Do not add GitHub App private keys, Cloudflare tunnel tokens, T3 bearer tokens, or Convex credentials to GitHub Secrets for this app. Those stay in Infisical.
