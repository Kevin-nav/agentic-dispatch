#!/usr/bin/env sh
set -eu

NAMESPACE="${AGENTIC_DISPATCH_NAMESPACE:-agentic-dispatch}"
POD_NAME="${AGENTIC_DISPATCH_NETWORK_PROBE_POD:-agentic-dispatch-network-probe}"
IMAGE="${AGENTIC_DISPATCH_NETWORK_PROBE_IMAGE:-curlimages/curl:8.11.1}"
PUBLIC_URL="${AGENTIC_DISPATCH_PUBLIC_PROBE_URL:-https://example.com}"
GITHUB_URL="${AGENTIC_DISPATCH_GITHUB_PROBE_URL:-https://api.github.com/meta}"
SERVICE_DNS_URL="${AGENTIC_DISPATCH_OTHER_NAMESPACE_SERVICE_URL:-https://kubernetes.default.svc.cluster.local}"

cleanup() {
  kubectl -n "$NAMESPACE" delete pod "$POD_NAME" --ignore-not-found=true >/dev/null 2>&1 || true
}

cleanup
trap cleanup EXIT INT TERM

kubectl -n "$NAMESPACE" run "$POD_NAME" \
  --image="$IMAGE" \
  --restart=Never \
  --labels=app=agentic-dispatch-network-probe \
  --command -- sleep 3600 >/dev/null

kubectl -n "$NAMESPACE" wait --for=condition=Ready "pod/$POD_NAME" --timeout=90s >/dev/null

probe() {
  label="$1"
  url="$2"
  expectation="$3"

  set +e
  kubectl -n "$NAMESPACE" exec "$POD_NAME" -- \
    curl --silent --show-error --fail --location --max-time 8 --connect-timeout 3 --insecure "$url" >/dev/null 2>&1
  status="$?"
  set -e

  if [ "$expectation" = "allow" ] && [ "$status" -eq 0 ]; then
    printf "PASS allow %s\n" "$label"
    return 0
  fi

  if [ "$expectation" = "deny" ] && [ "$status" -ne 0 ]; then
    printf "PASS deny %s\n" "$label"
    return 0
  fi

  printf "FAIL %s expected=%s exit=%s url=%s\n" "$label" "$expectation" "$status" "$url" >&2
  return 1
}

probe "public internet" "$PUBLIC_URL" allow
probe "github" "$GITHUB_URL" allow
probe "service network 10.43.0.1" "https://10.43.0.1" deny
probe "pod network 10.42.0.1" "http://10.42.0.1" deny
probe "other namespace service dns" "$SERVICE_DNS_URL" deny
probe "metadata endpoint" "http://169.254.169.254/latest/meta-data/" deny

printf "Network isolation probe completed in namespace %s\n" "$NAMESPACE"
