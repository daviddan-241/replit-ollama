import { spawn } from "node:child_process";
import { promises as dns } from "node:dns";
import { Router, type IRouter, type Request, type Response } from "express";
import { authenticateGatewayKey } from "./control";

const router: IRouter = Router();
const SAFE_COMMANDS: string[][] = [
  ["pwd"],
  ["ls"],
  ["ls", "-l"],
  ["ls", "-la"],
  ["whoami"],
  ["node", "--version"],
  ["python3", "--version"],
  ["npm", "--version"],
  ["git", "--version"],
  ["ollama", "--version"],
];
const COMMAND_TIMEOUT_MS = 12_000;
const MAX_OUTPUT = 20_000;

async function isPublicHostname(hostname: string) {
  const records = await dns.lookup(hostname, { all: true });
  return records.every(({ address }) => {
    const normalized = address.toLowerCase();
    return !(
      normalized === "127.0.0.1" ||
      normalized === "::1" ||
      normalized.startsWith("10.") ||
      normalized.startsWith("192.168.") ||
      normalized.startsWith("172.16.") ||
      normalized.startsWith("172.17.") ||
      normalized.startsWith("172.18.") ||
      normalized.startsWith("172.19.") ||
      normalized.startsWith("172.2") ||
      normalized.startsWith("169.254.") ||
      normalized.startsWith("100.64.") ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd")
    );
  });
}

async function authorizeTool(req: Request, res: Response) {
  const key = await authenticateGatewayKey(req);
  if (!key) {
    res.status(401).json({ error: "A valid API key is required for tools." });
    return null;
  }
  return key;
}

router.post("/tools/web-fetch", async (req, res) => {
  if (!await authorizeTool(req, res)) return;
  const rawUrl = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    res.status(400).json({ error: "Enter a valid URL." });
    return;
  }
  if (!["http:", "https:"].includes(url.protocol) || !(await isPublicHostname(url.hostname))) {
    res.status(400).json({ error: "Only public HTTP(S) URLs are allowed." });
    return;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": "OllamaControl/1.0" },
    });
    if (response.status >= 300 && response.status < 400) {
      res.status(400).json({ error: "Redirects are disabled for web fetches." });
      return;
    }
    const text = (await response.text()).slice(0, 30_000);
    res.json({ url: url.toString(), status: response.status, contentType: response.headers.get("content-type"), text });
  } catch {
    res.status(502).json({ error: "The public URL could not be fetched." });
  } finally {
    clearTimeout(timeout);
  }
});

router.post("/tools/execute", async (req, res) => {
  if (!await authorizeTool(req, res)) return;
  const command = Array.isArray(req.body?.command) ? req.body.command : null;
  if (!command || command.length < 1 || command.length > 6 || command.some((part: unknown) => typeof part !== "string")) {
    res.status(400).json({ error: "Command must be a short argv array." });
    return;
  }
  const executable = command[0] as string;
  const isAllowed = SAFE_COMMANDS.some((allowed) =>
    allowed.length === command.length && allowed.every((part, index) => part === command[index]),
  );
  if (!isAllowed || command.some((part: string) => /[;&|`$<>]/.test(part))) {
    res.status(400).json({ error: "Command is not allowed. Use pwd, ls, whoami, or a version check for the installed runtimes." });
    return;
  }
  const child = spawn(executable, command.slice(1), {
    cwd: "/tmp",
    env: { PATH: process.env.PATH ?? "", HOME: "/tmp", LANG: "C.UTF-8" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer) => { stdout = `${stdout}${chunk.toString()}`.slice(0, MAX_OUTPUT); });
  child.stderr.on("data", (chunk: Buffer) => { stderr = `${stderr}${chunk.toString()}`.slice(0, MAX_OUTPUT); });
  const timer = setTimeout(() => child.kill("SIGKILL"), COMMAND_TIMEOUT_MS);
  child.once("error", () => { clearTimeout(timer); res.status(400).json({ error: "The command could not be started." }); });
  child.once("close", (code, signal) => {
    clearTimeout(timer);
    res.json({ command, exitCode: code, signal, stdout, stderr, sandboxed: true, networkAccess: false, note: "Only fixed diagnostic commands are enabled. Host package installation, network access, and arbitrary shell syntax are disabled." });
  });
});

export default router;