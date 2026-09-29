# Ollama Control

Ollama Control is a mobile-friendly dashboard and OpenAI-compatible gateway for lightweight local Ollama models.

It also includes a persistent control plane for gateway credentials and two deliberately narrow tools: public web fetching and fixed diagnostic commands. The tools are not an unrestricted host terminal.

## Included local profile

The current workspace profile is tuned for a small CPU runtime and keeps only one model loaded at a time:

- `qwen3:4b` — general chat and reasoning
- `qwen2.5-coder:3b` — coding and debugging
- Optional catalog entries for `llama3.2:3b`, `llava:7b`, and `dolphin3:8b`

Vision models can analyze images, but Ollama text/vision models do not provide general-purpose video generation or editing by themselves.

## Gateway

The API server exposes:

- `GET /api/ollama/status`
- `GET /api/ollama/catalog`
- `GET /api/v1/models`
- `POST /api/v1/chat/completions`
- `GET /api/control/keys`
- `POST /api/control/keys`
- `POST /api/control/keys/:id/revoke`
- `POST /api/tools/web-fetch`
- `POST /api/tools/execute`

`POST /api/v1/chat/completions` accepts standard OpenAI chat payloads and supports Server-Sent Events when `"stream": true`.

Set `OLLAMA_GATEWAY_API_KEY` to accept a static `Authorization: Bearer <key>` on `/api/v1/*`, or issue database-backed keys from the `/keys` control panel. Set `OLLAMA_CONTROL_ADMIN_KEY` to protect key management in production. Keys are stored as SHA-256 hashes, support expiration and revocation, and their secret is returned only at creation time.

The Ollama host can be changed with `OLLAMA_BASE_URL`; it defaults to `http://127.0.0.1:11434`.

## Runtime behavior

The API service starts Ollama automatically when the binary is available and applies conservative CPU settings:

- one loaded model at a time
- one parallel request
- 4096-token context
- five-minute model keep-alive

The dashboard reports the actual runtime state and installed model list. It does not claim that uninstalled or unsupported models are available.

## Tools boundary

- Web fetch accepts only public `http` and `https` URLs, blocks private address ranges, limits response size, and does not follow redirects.
- Terminal execution uses fixed command/argument pairs such as `pwd`, `ls -la`, `whoami`, and runtime version checks. It does not support `apt`, arbitrary shell syntax, network commands, code interpreters, host mounts, or host secrets.