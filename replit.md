# Ollama Control

Ollama Control is a mobile-friendly dashboard and OpenAI-compatible streaming gateway for lightweight local Ollama models.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/ollama-control` — responsive dashboard and quick chat UI
- `artifacts/api-server/src/routes/ollama.ts` — Ollama status, model catalog, pull, and OpenAI-compatible proxy routes
- `lib/api-spec/openapi.yaml` — source of truth for the generated API hooks and schemas
- `scripts/start-api-with-ollama.sh` — starts the CPU-constrained Ollama runtime before the API server

## Architecture decisions

- The gateway proxies `/api/v1/models` and `/api/v1/chat/completions` into Ollama's native `/api/tags` and `/api/chat` APIs.
- The approved model catalog is intentionally small and allowlisted to keep local CPU inference predictable.
- The runtime is configured to keep one model loaded at a time, use one parallel request, and cap context at 4096 tokens.
- API-key enforcement is opt-in through `OLLAMA_GATEWAY_API_KEY`; local dashboard use remains available when it is not configured.

## Product

The dashboard reports live Ollama health, installed models, recommended lightweight models, pull actions, gateway details, and a quick streaming chat session. The gateway returns OpenAI-shaped model and chat responses for compatible clients.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Ollama must be reachable at `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`).
- Image-capable models can analyze images but do not provide general-purpose video generation or editing by themselves.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
