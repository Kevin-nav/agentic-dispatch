#!/usr/bin/env bash
set -euo pipefail

mkdir -p "$T3CODE_HOME" "$CODEX_HOME" /workspaces/agentic-dispatch

exec t3 serve \
  --host "${T3_HOST:-0.0.0.0}" \
  --port "${T3_PORT:-3773}" \
  --base-dir "$T3CODE_HOME" \
  /workspaces/agentic-dispatch
