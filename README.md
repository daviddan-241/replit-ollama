# Ollama Control

Ollama Control is a mobile-friendly dashboard and OpenAI-compatible gateway for lightweight local Ollama models.

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

`POST /api/v1/chat/completions` accepts standard OpenAI chat payloads and supports Server-Sent Events when `"stream": true`.

Set `OLLAMA_GATEWAY_API_KEY` to require `Authorization: Bearer <key>` on `/api/v1/*`. Without that variable, the gateway is intentionally local-only and does not require a key.

The Ollama host can be changed with `OLLAMA_BASE_URL`; it defaults to `http://127.0.0.1:11434`.

## Runtime behavior

The API service starts Ollama automatically when the binary is available and applies conservative CPU settings:

- one loaded model at a time
- one parallel request
- 4096-token context
- five-minute model keep-alive

The dashboard reports the actual runtime state and installed model list. It does not claim that uninstalled or unsupported models are available.