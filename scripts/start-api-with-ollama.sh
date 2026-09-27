#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

# Keep the local CPU runtime predictable on small workspaces.
export OLLAMA_HOST="${OLLAMA_HOST:-127.0.0.1:11434}"
export OLLAMA_KEEP_ALIVE="${OLLAMA_KEEP_ALIVE:-5m}"
export OLLAMA_MAX_LOADED_MODELS="${OLLAMA_MAX_LOADED_MODELS:-1}"
export OLLAMA_NUM_PARALLEL="${OLLAMA_NUM_PARALLEL:-1}"
export OLLAMA_CONTEXT_LENGTH="${OLLAMA_CONTEXT_LENGTH:-4096}"

if command -v ollama >/dev/null 2>&1; then
  if ! curl -fsS "http://${OLLAMA_HOST}/api/version" >/dev/null 2>&1; then
    nohup ollama serve >/tmp/ollama.log 2>&1 &
    for _ in $(seq 1 20); do
      if curl -fsS "http://${OLLAMA_HOST}/api/version" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
  fi
else
  echo "Ollama is not installed; the API will run in disconnected mode." >&2
fi

if [[ "${NODE_ENV:-development}" == "production" ]]; then
  exec node --enable-source-maps artifacts/api-server/dist/index.mjs
fi

exec pnpm --filter @workspace/api-server run dev