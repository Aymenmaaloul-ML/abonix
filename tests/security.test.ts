import { rmSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { eq } from "drizzle-orm";

// Faux contexte de requête Next.js : cookies et en-têtes contrôlés par les tests.
const jar = new Map<string, string>();
let requestHeaders = new Headers({ "x-forwarded-for": "203.0.113.7", "user-agent": "vitest" });
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n)! } : undefined),
    set: (n: string, v: string) => void jar.set(n, v),
    delete: (n: string) => void jar.delete(n),
  }),
  headers: async () => requestHeaders,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

import { getDb } from "@/server/db";
import { adminUsers, categories, sessions } from "@/server/db/schema";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, destroyCurrentSession, validateSessionToken } from "@/server/auth/session";
import { loginAction } from "@/server/actions/auth";
import { saveCategoryAction } from "@/server/actions/categories";
import { deleteProductAction } from "@/server/actions/products";
import { updateOrderAction } from "@/server/actions/admin-orders";
import { saveSettingsAction } from "@/server/actions/content";
import { POST as uploadPost } from "@/app/api/admin/upload/route";
import { processImage } from "@/server/storage/image";
import { storeUploadedImage, verifyNewImageRef } from "@/server/storage";
import { sha256Hex } from "@/server/security";
import { resetDb } from "./helpers/db";

const COOKIE = "abonix_session";
const PASSWORD = "Un-bon-mot-de-passe-42";
let userId: string;

afterAll(() => rmSync(path.resolve(import.meta.dirname, "../storage/test-uploads"), { recursive: true, force: true }));

beforeEach(async () => {
  await resetDb();
  jar.clear();
  requestHeaders = new Headers({ "x-forwarded-for": "203.0.113.7", "user-agent": "vitest" });
  const [u] = await getDb().insert(adminUsers).values({ email: "admin@test.tn", name: "Admin", passwordHash: await hashPassword(PASSWORD) }).returning();
  userId = u!.id;
});

describe("mots de passe", () => {
  it("utilise argon2id, avec un sel différent à chaque hachage", async () => {
    const a = await hashPassword(PASSWORD);
    const b = await hashPassword(PASSWORD);
    expect(a).toMatch(/^\$argon2id\$/);
    expect(a).not.toBe(b);
    expect(await verifyPassword(a, PASSWORD)).toBe(true);
    expect(await verifyPassword(a, "mauvais")).toBe(false);
    expect(await verifyPassword("pas-un-hash", PASSWORD)).toBe(false);
  });
});

describe("sessions", () => {
  it("stocke uniquement l'empreinte du jeton et le valide", async () => {
    await createSession(userId);
    const token = jar.get(COOKIE)!;
    expect(token.length).toBeGreaterThan(30);
    const rows = await getDb().select().from(sessions);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(sha256Hex(token));
    expect(rows[0]!.id).not.toBe(token);
    expect(await validateSessionToken(token)).toMatchObject({ id: userId, email: "admin@test.tn" });
  });
  it("refuse les jetons inconnus, vides, expirés ou supprimés", async () => {
    await createSession(userId);
    const token = jar.get(COOKIE)!;
    expect(await validateSessionToken(undefined)).toBeNull();
    expect(await validateSessionToken("x".repeat(43))).toBeNull();
    await getDb().update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(sessions.id, sha256Hex(token)));
    expect(await validateSessionToken(token)).toBeNull();
    await getDb().update(sessions).set({ expiresAt: new Date(Date.now() + 86_400_000) });
    expect(await validateSessionToken(token)).not.toBeNull();
    await destroyCurrentSession();
    expect(jar.has(COOKIE)).toBe(false);
    expect(await validateSessionToken(token)).toBeNull();
  });
});

describe("connexion", () => {
  it("connecte avec les bons identifiants", async () => {
    expect(await loginAction({ email: "ADMIN@test.tn", password: PASSWORD })).toMatchObject({ ok: true });
    expect(jar.has(COOKIE)).toBe(true);
  });
  it("renvoie le même message pour un e-mail inconnu et un mauvais mot de passe", async () => {
    const a = await loginAction({ email: "admin@test.tn", password: "faux-mot-de-passe" });
    const b = await loginAction({ email: "inconnu@test.tn", password: "faux-mot-de-passe" });
    expect(a).toEqual(b);
    expect(a.ok).toBe(false);
    expect(jar.has(COOKIE)).toBe(false);
  });
  it("bloque après 8 échecs consécutifs, même avec le bon mot de passe", async () => {
    for (let i = 0; i < 8; i++) await loginAction({ email: "admin@test.tn", password: `faux-${i}-mot-de-passe` });
    const blocked = await loginAction({ email: "admin@test.tn", password: PASSWORD });
    expect(blocked).toMatchObject({ ok: false, code: "RATE_LIMITED" });
    expect(jar.has(COOKIE)).toBe(false);
  });
});

describe("autorisation : aucune action d'administration sans session", () => {
  it("refuse toutes les Server Actions d'écriture", async () => {
    const results = await Promise.all([
      saveCategoryAction({ name: "Pirate", slug: "", description: "", icon: "layers", isPublished: true, isFeatured: false }),
      deleteProductAction("11111111-1111-4111-8111-111111111111"),
      updateOrderAction({ id: "11111111-1111-4111-8111-111111111111", status: "CONFIRMED" }),
      saveSettingsAction({}),
    ]);
    for (const r of results) expect(r).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
    expect(await getDb().select().from(categories)).toHaveLength(0);
  });
  it("accepte les mêmes actions avec une session valide", async () => {
    await loginAction({ email: "admin@test.tn", password: PASSWORD });
    const r = await saveCategoryAction({ name: "Légitime", slug: "", description: "", icon: "layers", isPublished: true, isFeatured: false });
    expect(r.ok).toBe(true);
    expect(await getDb().select().from(categories)).toHaveLength(1);
  });
  it("ne révèle aucun détail technique en cas d'erreur inattendue", async () => {
    await loginAction({ email: "admin@test.tn", password: PASSWORD });
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await deleteProductAction("pas-un-uuid");
    spy.mockRestore();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).not.toMatch(/select|insert|postgres|stack|at /i);
  });
});

async function pngBuffer(width = 64, height = 64) {
  return sharp({ create: { width, height, channels: 3, background: "#2d5bff" } }).png().toBuffer();
}
function uploadRequest(file: Blob | null, headers: Record<string, string> = { origin: "http://localhost:3000" }) {
  const form = new FormData();
  if (file) form.set("file", file, "x.png");
  return new Request("http://localhost:3000/api/admin/upload", { method: "POST", body: form, headers });
}

describe("images", () => {
  it("convertit en WebP, redimensionne et supprime les métadonnées", async () => {
    const withExif = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#fff" } }).jpeg().withMetadata({ exif: { IFD0: { Copyright: "secret" } } }).toBuffer();
    const out = await processImage(withExif, "image/jpeg");
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("webp");
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(2000);
    expect(meta.exif).toBeUndefined();
  });
  it("refuse SVG, faux fichiers, fichiers vides ou trop gros, et types MIME interdits", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await expect(processImage(svg, "image/png")).rejects.toThrow();
    await expect(processImage(svg, "image/svg+xml")).rejects.toThrow(/Format/);
    await expect(processImage(Buffer.from("MZ pas une image"), "image/png")).rejects.toThrow(/image valide/);
    await expect(processImage(Buffer.alloc(0), "image/png")).rejects.toThrow(/vide/);
    await expect(processImage(Buffer.alloc(5 * 1024 * 1024 + 1), "image/png")).rejects.toThrow(/lourde/);
    await expect(processImage(await pngBuffer(), "application/pdf")).rejects.toThrow(/Format/);
  });
  it("génère un nom de fichier aléatoire sans utiliser le nom d'origine", async () => {
    // Écrit dans UPLOAD_DIR (storage/test-uploads, défini dans vitest.config.mts), nettoyé après le test.
    const stored = await storeUploadedImage(await pngBuffer(), "image/png");
    try {
      expect(stored.storageKey).toMatch(/^[0-9a-f-]{36}\.webp$/);
      expect(stored.url).toBe(`/uploads/${stored.storageKey}`);
      expect(await verifyNewImageRef({ provider: "local", storageKey: stored.storageKey, url: "n'importe quoi" })).toBe(stored.url);
    } finally {
      rmSync(path.resolve(import.meta.dirname, "../storage/test-uploads"), { recursive: true, force: true });
    }
  });
  it("refuse une référence d'image forgée", async () => {
    await expect(verifyNewImageRef({ provider: "local", storageKey: "../../etc/passwd", url: "/uploads/x" })).rejects.toThrow();
    await expect(verifyNewImageRef({ provider: "local", storageKey: "11111111-1111-4111-8111-111111111111.webp", url: "/x" })).rejects.toThrow(/introuvable/);
    await expect(verifyNewImageRef({ provider: "cloudinary", storageKey: "abonix/x", url: "https://evil.example/x.png" })).rejects.toThrow();
  });
});

describe("route de téléversement", () => {
  it("refuse sans session (401)", async () => {
    expect((await uploadPost(uploadRequest(new Blob([await pngBuffer()], { type: "image/png" })))).status).toBe(401);
  });
  it("refuse une autre origine (403), même connecté", async () => {
    await loginAction({ email: "admin@test.tn", password: PASSWORD });
    expect((await uploadPost(uploadRequest(new Blob([await pngBuffer()], { type: "image/png" }), { origin: "https://evil.example" }))).status).toBe(403);
    expect((await uploadPost(uploadRequest(new Blob([await pngBuffer()], { type: "image/png" }), {}))).status).toBe(403);
  });
  it("accepte une vraie image, refuse fichier absent, faux fichier et type interdit", async () => {
    await loginAction({ email: "admin@test.tn", password: PASSWORD });
    const ok = await uploadPost(uploadRequest(new Blob([await pngBuffer()], { type: "image/png" })));
    expect(ok.status).toBe(201);
    expect((await ok.json()).image.storageKey).toMatch(/\.webp$/);
    expect((await uploadPost(uploadRequest(null))).status).toBe(400);
    expect((await uploadPost(uploadRequest(new Blob(["pas une image"], { type: "image/png" })))).status).toBe(400);
    expect((await uploadPost(uploadRequest(new Blob(["<svg/>"], { type: "image/svg+xml" })))).status).toBe(400);
  });
});
