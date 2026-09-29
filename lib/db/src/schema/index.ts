import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const apiKeysTable = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  requestCount: integer("request_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export type ApiKey = typeof apiKeysTable.$inferSelect;