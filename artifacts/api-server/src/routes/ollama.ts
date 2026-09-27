import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateOllamaChatCompletionBody,
  GetOllamaStatusResponse,
  ListOllamaCatalogResponse,
  ListOllamaModelsResponse,
  PullOllamaModelBody,
  PullOllamaModelResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const OLLAMA_BASE_URL = (
  process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434"
).replace(/\/+$/, "");
const GATEWAY_API_KEY = process.env.OLLAMA_GATEWAY_API_KEY?.trim();

const catalog = [
  {
    name: "qwen3:4b",
    label: "Qwen 3 4B",
    family: "Qwen",
    size: "~2.5 GB",
    purpose: "Fast general chat, reasoning, and tool-oriented tasks",
    capabilities: ["chat", "reasoning", "multilingual"],
    recommended: true,
    pullCommand: "ollama pull qwen3:4b",
  },
  {
    name: "qwen2.5-coder:3b",
    label: "Qwen 2.5 Coder 3B",
    family: "Qwen Coder",
    size: "~2.0 GB",
    purpose: "Lightweight coding, debugging, and code explanation",
    capabilities: ["code", "debugging", "completion"],
    recommended: true,
    pullCommand: "ollama pull qwen2.5-coder:3b",
  },
  {
    name: "llama3.2:3b",
    label: "Llama 3.2 3B",
    family: "Llama",
    size: "~2.0 GB",
    purpose: "Low-latency everyday assistant and writing model",
    capabilities: ["chat", "writing", "summaries"],
    recommended: true,
    pullCommand: "ollama pull llama3.2:3b",
  },
  {
    name: "llava:7b",
    label: "LLaVA 7B",
    family: "LLaVA",
    size: "~4.7 GB",
    purpose: "Image understanding and visual question answering",
    capabilities: ["vision", "image-analysis", "chat"],
    recommended: false,
    pullCommand: "ollama pull llava:7b",
  },
  {
    name: "dolphin3:8b",
    label: "Dolphin 3 8B",
    family: "Dolphin",
    size: "~4.9 GB",
    purpose: "Community-tuned general model; verify outputs before use",
    capabilities: ["chat", "coding", "roleplay"],
    recommended: false,
    pullCommand: "ollama pull dolphin3:8b",
  },
] as const;

type ApprovedModel = (typeof catalog)[number]["name"];
const approvedModels = new Set<ApprovedModel>(catalog.map((item) => item.name));

function isApprovedModel(value: string): value is ApprovedModel {
  return approvedModels.has(value as ApprovedModel);
}

type OllamaTag = {
  name?: string;
  size?: number;
  digest?: string;
  modified_at?: string;
};

type OllamaTagsResponse = {
  models?: OllamaTag[];
};

type OllamaChatResponse = {
  model?: string;
  message?: {
    role?: string;
    content?: string;
  };
  prompt_eval_count?: number;
  eval_count?: number;
  done?: boolean;
};

function hasValidGatewayKey(req: Request): boolean {
  if (!GATEWAY_API_KEY) return true;
  return req.header("authorization") === `Bearer ${GATEWAY_API_KEY}`;
}

function rejectUnauthorized(req: Request, res: Response): boolean {
  if (hasValidGatewayKey(req)) return false;
  res.status(401).json({ error: "A valid Bearer API key is required." });
  return true;
}

async function ollamaFetch(path: string, init?: RequestInit): Promise<globalThis.Response> {
  return fetch(`${OLLAMA_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
}

async function getTags(): Promise<OllamaTagsResponse> {
  const response = await ollamaFetch("/api/tags");
  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status} from /api/tags`);
  }
  return (await response.json()) as OllamaTagsResponse;
}

function modelList(tags: OllamaTagsResponse) {
  return ListOllamaModelsResponse.parse({
    object: "list",
    data: (tags.models ?? []).map((model) => ({
      id: model.name ?? "unknown",
      object: "model",
      created: model.modified_at
        ? Math.floor(new Date(model.modified_at).getTime() / 1000)
        : Math.floor(Date.now() / 1000),
      ownedBy: "ollama",
      size: model.size ?? null,
      digest: model.digest ?? null,
    })),
  });
}

router.get("/ollama/status", async (req, res) => {
  let connected = false;
  let version: string | null = null;
  let modelCount = 0;

  try {
    const [versionResponse, tags] = await Promise.all([
      ollamaFetch("/api/version"),
      getTags(),
    ]);
    connected = versionResponse.ok;
    if (versionResponse.ok) {
      const payload = (await versionResponse.json()) as { version?: string };
      version = payload.version ?? null;
    }
    modelCount = tags.models?.length ?? 0;
  } catch (error) {
    req.log.warn({ err: error }, "Ollama runtime is unavailable");
  }

  res.json(
    GetOllamaStatusResponse.parse({
      connected,
      endpoint: OLLAMA_BASE_URL,
      version,
      modelCount,
      apiKeyConfigured: Boolean(GATEWAY_API_KEY),
      runtime: connected ? "ollama" : "unavailable",
    }),
  );
});

router.get("/ollama/catalog", (_req, res) => {
  res.json(ListOllamaCatalogResponse.parse(catalog));
});

router.post("/ollama/pull", (req, res) => {
  const parsed = PullOllamaModelBody.safeParse(req.body);
  if (!parsed.success || !isApprovedModel(parsed.data.model)) {
    res.status(400).json({ error: "That model is not in the approved lightweight catalog." });
    return;
  }

  const child = spawn("ollama", ["pull", parsed.data.model], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  child.once("error", (error) => {
    req.log.warn({ err: error, model: parsed.data.model }, "Unable to start ollama pull");
  });

  res.status(202).json(
    PullOllamaModelResponse.parse({
      accepted: true,
      model: parsed.data.model,
      message: `Pull started for ${parsed.data.model}. Refresh installed models when it completes.`,
    }),
  );
});

router.get("/v1/models", async (req, res) => {
  if (rejectUnauthorized(req, res)) return;

  try {
    res.json(modelList(await getTags()));
  } catch (error) {
    req.log.warn({ err: error }, "Unable to list Ollama models");
    res.status(502).json({ error: "Ollama is unavailable. Start Ollama and try again." });
  }
});

router.post("/v1/chat/completions", async (req, res) => {
  if (rejectUnauthorized(req, res)) return;

  const parsed = CreateOllamaChatCompletionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid chat completion request." });
    return;
  }
  if (!isApprovedModel(parsed.data.model)) {
    res.status(400).json({ error: "That model is not in the approved lightweight catalog." });
    return;
  }

  const stream = parsed.data.stream === true;
  const ollamaResponse = await ollamaFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      model: parsed.data.model,
      messages: parsed.data.messages,
      stream,
      options: {
        ...(parsed.data.temperature === undefined
          ? {}
          : { temperature: parsed.data.temperature }),
        ...(parsed.data.max_tokens === undefined
          ? {}
          : { num_predict: parsed.data.max_tokens }),
      },
    }),
  }).catch((error: unknown) => {
    req.log.warn({ err: error }, "Unable to reach Ollama chat endpoint");
    return null;
  });

  if (!ollamaResponse?.ok || !ollamaResponse.body) {
    res.status(502).json({ error: "Ollama is unavailable or rejected the request." });
    return;
  }

  const id = `chatcmpl-${randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);

  if (stream) {
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const reader = ollamaResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let firstChunk = true;

    const writeChunk = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const chunk = JSON.parse(line) as OllamaChatResponse;
          const done = chunk.done === true;
          writeChunk({
            id,
            object: "chat.completion.chunk",
            created,
            model: chunk.model ?? parsed.data.model,
            choices: [
              {
                index: 0,
                delta: {
                  ...(firstChunk ? { role: "assistant" } : {}),
                  ...(chunk.message?.content ? { content: chunk.message.content } : {}),
                },
                finish_reason: done ? "stop" : null,
              },
            ],
          });
          firstChunk = false;
        }
      }
      if (buffer.trim()) {
        const chunk = JSON.parse(buffer) as OllamaChatResponse;
        writeChunk({
          id,
          object: "chat.completion.chunk",
          created,
          model: chunk.model ?? parsed.data.model,
          choices: [
            {
              index: 0,
              delta: { content: chunk.message?.content ?? "" },
              finish_reason: chunk.done ? "stop" : null,
            },
          ],
        });
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      req.log.warn({ err: error }, "Ollama streaming response failed");
      res.end();
    }
    return;
  }

  const payload = (await ollamaResponse.json()) as OllamaChatResponse;
  res.json({
    id,
    object: "chat.completion",
    created,
    model: payload.model ?? parsed.data.model,
    choices: [
      {
        index: 0,
        message: {
          role: payload.message?.role ?? "assistant",
          content: payload.message?.content ?? "",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: payload.prompt_eval_count ?? 0,
      completion_tokens: payload.eval_count ?? 0,
      total_tokens: (payload.prompt_eval_count ?? 0) + (payload.eval_count ?? 0),
    },
  });
});

export default router;