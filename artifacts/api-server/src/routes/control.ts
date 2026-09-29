import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, apiKeysTable } from "@workspace/db";

const router: IRouter = Router();
const ADMIN_KEY = process.env.OLLAMA_CONTROL_ADMIN_KEY?.trim();
const GATEWAY_API_KEY = process.env.OLLAMA_GATEWAY_API_KEY?.trim();

export type AuthenticatedKey = {
  id: string;
  name: string;
  keyPrefix: string;
};

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function readBearer(req: Request) {
  const value = req.header("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

function isAdmin(req: Request) {
  if (!ADMIN_KEY) return process.env.NODE_ENV !== "production";
  return readBearer(req) === ADMIN_KEY || req.header("x-control-plane-key") === ADMIN_KEY;
}

export async function authenticateGatewayKey(req: Request): Promise<AuthenticatedKey | null> {
  const bearer = readBearer(req);
  if (!bearer) return null;
  if (GATEWAY_API_KEY && bearer === GATEWAY_API_KEY) {
    return { id: "gateway", name: "Gateway secret", keyPrefix: "gateway" };
  }
  if (ADMIN_KEY && bearer === ADMIN_KEY) {
    return { id: "admin", name: "Control plane", keyPrefix: "admin" };
  }
  try {
    const [key] = await db.select().from(apiKeysTable).where(
      and(eq(apiKeysTable.keyHash, hashKey(bearer)), eq(apiKeysTable.isActive, true)),
    ).limit(1);
    if (!key || key.revokedAt || (key.expiresAt && key.expiresAt <= new Date())) return null;
    await db.update(apiKeysTable)
      .set({ lastUsedAt: new Date(), requestCount: key.requestCount + 1 })
      .where(eq(apiKeysTable.id, key.id));
    return { id: key.id, name: key.name, keyPrefix: key.keyPrefix };
  } catch {
    return null;
  }
}

export function requireControlPlane(req: Request, res: Response) {
  if (isAdmin(req)) return true;
  res.status(401).json({ error: "Control-plane access requires the configured admin key." });
  return false;
}

router.get("/control/keys", async (req, res) => {
  if (!requireControlPlane(req, res)) return;
  const keys = await db.select({
    id: apiKeysTable.id,
    name: apiKeysTable.name,
    keyPrefix: apiKeysTable.keyPrefix,
    createdAt: apiKeysTable.createdAt,
    lastUsedAt: apiKeysTable.lastUsedAt,
    expiresAt: apiKeysTable.expiresAt,
    revokedAt: apiKeysTable.revokedAt,
    requestCount: apiKeysTable.requestCount,
    isActive: apiKeysTable.isActive,
  }).from(apiKeysTable).orderBy(desc(apiKeysTable.createdAt));
  res.json(keys);
});

router.post("/control/keys", async (req, res) => {
  if (!requireControlPlane(req, res)) return;
  const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 80) : "";
  const expiresAt = req.body?.expiresAt ? new Date(req.body.expiresAt) : null;
  if (!name || (expiresAt && Number.isNaN(expiresAt.getTime()))) {
    res.status(400).json({ error: "A name and a valid optional expiration date are required." });
    return;
  }
  const secret = `oc_live_${randomUUID().replaceAll("-", "")}_${randomBytes(18).toString("hex")}`;
  const created = await db.insert(apiKeysTable).values({
    name,
    keyPrefix: secret.slice(0, 16),
    keyHash: hashKey(secret),
    expiresAt,
  }).returning({
    id: apiKeysTable.id,
    name: apiKeysTable.name,
    keyPrefix: apiKeysTable.keyPrefix,
    createdAt: apiKeysTable.createdAt,
    expiresAt: apiKeysTable.expiresAt,
  });
  res.status(201).json({ ...created[0], secret });
});

router.post("/control/keys/:id/revoke", async (req, res) => {
  if (!requireControlPlane(req, res)) return;
  const [updated] = await db.update(apiKeysTable)
    .set({ revokedAt: new Date(), isActive: false })
    .where(eq(apiKeysTable.id, req.params.id))
    .returning({ id: apiKeysTable.id });
  if (!updated) {
    res.status(404).json({ error: "API key not found." });
    return;
  }
  res.json({ revoked: true, id: updated.id });
});

export default router;