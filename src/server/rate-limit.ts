import "server-only";
import { lt, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { rateLimits } from "@/server/db/schema";

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSec: number };

/**
 * Fenêtre fixe, atomique (INSERT … ON CONFLICT DO UPDATE) et stockée en base,
 * donc valable même avec plusieurs instances ou en serverless.
 */
export async function consumeRateLimit(key: string, opts: { limit: number; windowSec: number }): Promise<RateLimitResult> {
  const db = getDb();
  const now = Date.now();
  const windowMs = opts.windowSec * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = new Date(windowStart + windowMs * 2);

  const [row] = await db
    .insert(rateLimits)
    .values({ id: `${key}:${windowStart}`, key, count: 1, expiresAt })
    .onConflictDoUpdate({ target: rateLimits.id, set: { count: sql`${rateLimits.count} + 1` } })
    .returning({ count: rateLimits.count });

  // Nettoyage occasionnel des fenêtres expirées.
  if (Math.random() < 0.02) {
    void db.delete(rateLimits).where(lt(rateLimits.expiresAt, new Date())).catch(() => undefined);
  }

  const count = row?.count ?? 1;
  return {
    allowed: count <= opts.limit,
    remaining: Math.max(0, opts.limit - count),
    retryAfterSec: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)),
  };
}

/** Réinitialise un compteur (ex. après une connexion réussie). */
export async function resetRateLimit(key: string): Promise<void> {
  await getDb().delete(rateLimits).where(sql`${rateLimits.key} = ${key}`);
}
