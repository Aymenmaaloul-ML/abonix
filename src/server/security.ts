import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { getEnv } from "@/server/env";

/** IP du client. Derrière un reverse-proxy de confiance (Vercel, Nginx), X-Forwarded-For est renseigné par lui. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}

/** Empreinte salée : permet de limiter les abus sans conserver l'IP en clair. */
export function hashIdentifier(value: string): string {
  return createHash("sha256").update(`${getEnv().HASH_SALT}:${value}`).digest("hex").slice(0, 32);
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Protection CSRF pour les routes API (les Server Actions de Next.js comparent déjà Origin et Host).
 * Une requête qui modifie des données doit provenir de notre propre origine.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host && originHost === host) return true;
  try {
    return originHost === new URL(getEnv().APP_URL).host;
  } catch {
    return false;
  }
}
