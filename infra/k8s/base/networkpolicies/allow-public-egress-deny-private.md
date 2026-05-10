# Public Egress With Private Range Deny Strategy

Kubernetes NetworkPolicy does not portably express "allow all public internet but deny private, cluster, and metadata ranges" across every CNI. Before relying on this behavior on K3s, validate the active CNI implementation and confirm how it handles `ipBlock.except`.

Candidate policy for live testing:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-public-egress-candidate
  namespace: agentic-dispatch
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
              - 100.64.0.0/10
              - 169.254.0.0/16
              - 127.0.0.0/8
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 80
```

Validation probes before production:

- A pod in `agentic-dispatch` can reach `https://github.com` and the Convex/Infisical endpoints.
- The same pod cannot reach Kubernetes service IPs such as `10.43.0.1`.
- The pod cannot reach pod CIDRs such as `10.42.0.1`.
- The pod cannot reach `169.254.169.254`.
- The pod cannot resolve or connect to known services in other namespaces except explicitly allowed shared services.

Keep this policy out of the applied base until the live VPS network plugin has been verified.
