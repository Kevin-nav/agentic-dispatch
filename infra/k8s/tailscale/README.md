# Tailscale Exposure

Agentic Dispatch uses the Tailscale Kubernetes Operator to expose private services without opening public ingress.

Required device tags:

- `tag:agentic-dispatch-operator`
- `tag:agentic-dispatch-web`
- `tag:agentic-dispatch-t3`

Required OAuth scopes:

- Devices Core: Write
- Auth Keys: Write
- Services: Write

Install and configure the operator from the official Tailscale Kubernetes Operator documentation. Store OAuth client credentials in the cluster secret expected by the operator. Do not commit OAuth credentials or generated auth keys.

The web service is intended for phone access over Tailnet. The T3 service is intended for pairing and private orchestration access only.
