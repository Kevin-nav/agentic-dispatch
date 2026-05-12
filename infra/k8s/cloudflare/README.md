# Cloudflare Tunnel

Agentic Dispatch exposes the web application through Cloudflare Tunnel instead of Tailscale.

Public hostname:

```text
dispatch.sankoslides.com
```

Tunnel origin target:

```text
http://agentic-dispatch-web.agentic-dispatch.svc.cluster.local:80
```

The `cloudflared` pods run in the `agentic-dispatch` namespace so the tunnel token, network policy, and lifecycle stay scoped to this application.

The tunnel token is stored in Infisical as:

```env
CLOUDFLARE_TUNNEL_TOKEN=
```

The Infisical operator syncs it to the Kubernetes secret:

```text
agentic-dispatch-cloudflare-tunnel
```

Do not commit the token and do not put it in GitHub Secrets unless a GitHub Action is explicitly managing Cloudflare resources.

The manifest uses `cloudflare/cloudflared:latest` for initial rollout. After the first successful deployment, pin it to the digest or version verified on the VPS.
