import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { adminUsers, auditLogs, categories, orderRequests, products, siteSettings } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { listProducts, getProductBySlug, listPublishedCategories, getPriceBounds } from "@/server/services/catalog";
import { prepareWhatsAppOrder } from "@/server/services/orders";
import { deleteCategory, saveCategory } from "@/server/services/admin-categories";
import { deleteProduct, saveProduct, setProductStatus } from "@/server/services/admin-products";
import { updateOrderRequest } from "@/server/services/admin-orders";
import { consumeRateLimit } from "@/server/rate-limit";
import { catalogQuerySchema } from "@/lib/validation/catalog";
import { makeCategory, makeProduct, makeVariant, resetDb } from "./helpers/db";

const q = (o: Record<string, unknown> = {}) => catalogQuerySchema.parse(o);
const ctx = { clientHash: "test-client" };
let adminId: string;

async function expectApp(promise: Promise<unknown>, code?: string, message?: RegExp) {
  const err = await promise.then(() => null, (e: unknown) => e);
  expect(err, "une AppError était attendue").toBeInstanceOf(AppError);
  if (code) expect((err as AppError).code).toBe(code);
  if (message) expect((err as AppError).message).toMatch(message);
}

beforeEach(async () => {
  await resetDb();
  const [a] = await getDb().insert(adminUsers).values({ email: "a@test.tn", name: "A", passwordHash: "x" }).returning();
  adminId = a!.id;
});

describe("catalogue public", () => {
  it("ne liste que les produits publiés d'une catégorie visible", async () => {
    const cat = await makeCategory();
    const hidden = await makeCategory({ isPublished: false });
    await makeProduct(cat.id, { name: "Visible" });
    await makeProduct(cat.id, { name: "Brouillon", status: "DRAFT" });
    await makeProduct(cat.id, { name: "Archivé", status: "ARCHIVED" });
    await makeProduct(hidden.id, { name: "Catégorie masquée" });
    const r = await listProducts(q(), 12);
    expect(r.items.map((p) => p.name)).toEqual(["Visible"]);
    expect(r.total).toBe(1);
  });

  it("filtre par recherche, catégorie, prix et disponibilité, et trie", async () => {
    const a = await makeCategory({ name: "A", slug: "cat-a" });
    const b = await makeCategory({ name: "B", slug: "cat-b" });
    await makeProduct(a.id, { name: "Alpha IA", priceMillimes: 10_000 });
    await makeProduct(a.id, { name: "Beta", priceMillimes: 90_000, availability: "OUT_OF_STOCK" });
    await makeProduct(b.id, { name: "Gamma", priceMillimes: 50_000 });
    expect((await listProducts(q({ q: "alpha" }), 12)).items.map((p) => p.name)).toEqual(["Alpha IA"]);
    expect((await listProducts(q({ category: "cat-b" }), 12)).items.map((p) => p.name)).toEqual(["Gamma"]);
    expect((await listProducts(q({ min: 20, max: 60 }), 12)).items.map((p) => p.name)).toEqual(["Gamma"]);
    expect((await listProducts(q({ available: "1" }), 12)).total).toBe(2);
    expect((await listProducts(q({ sort: "price-desc" }), 12)).items.map((p) => p.name)).toEqual(["Beta", "Gamma", "Alpha IA"]);
    expect((await listProducts(q({ sort: "price-asc" }), 12)).items[0]!.name).toBe("Alpha IA");
  });

  it("traite % et _ comme des caractères ordinaires dans la recherche", async () => {
    const cat = await makeCategory();
    await makeProduct(cat.id, { name: "Produit normal" });
    expect((await listProducts(q({ q: "%" }), 12)).total).toBe(0);
    expect((await listProducts(q({ q: "_" }), 12)).total).toBe(0);
  });

  it("pagine", async () => {
    const cat = await makeCategory();
    for (let i = 0; i < 5; i++) await makeProduct(cat.id, { name: `P${i}` });
    const p2 = await listProducts(q({ page: 2 }), 2);
    expect(p2.pageCount).toBe(3);
    expect(p2.items).toHaveLength(2);
  });

  it("affiche le prix minimal des offres et les bornes de prix", async () => {
    const cat = await makeCategory();
    const p = await makeProduct(cat.id, { name: "Avec offres", priceMillimes: null });
    await makeVariant(p.id, { name: "1 mois", priceMillimes: 20_000 });
    await makeVariant(p.id, { name: "1 an", priceMillimes: 180_000, position: 1 });
    const r = await listProducts(q(), 12);
    expect(r.items[0]!.priceMillimes).toBe(20_000);
    // Bornes en dinars, calculées sur le prix « à partir de » de chaque produit.
    await makeProduct(cat.id, { name: "Cher", priceMillimes: 150_500 });
    expect(await getPriceBounds()).toEqual({ min: 20, max: 151 });
  });

  it("détail produit : publié seulement, avec ses offres actives", async () => {
    const cat = await makeCategory();
    const p = await makeProduct(cat.id, { slug: "mon-produit" });
    await makeVariant(p.id, { name: "Actif" });
    await makeVariant(p.id, { name: "Inactif", isActive: false, position: 1 });
    const detail = await getProductBySlug("mon-produit");
    expect(detail?.name).toBe(p.name);
    expect(detail?.variants.map((v) => v.name)).toEqual(["Actif"]);
    await setProductStatus(adminId, p.id, "DRAFT");
    expect(await getProductBySlug("mon-produit")).toBeNull();
    expect(await getProductBySlug("inexistant")).toBeNull();
  });

  it("n'expose que les catégories publiées", async () => {
    await makeCategory({ name: "Visible" });
    await makeCategory({ name: "Masquée", isPublished: false });
    expect((await listPublishedCategories()).map((c) => c.name)).toEqual(["Visible"]);
  });
});

describe("préparation de commande WhatsApp", () => {
  it("calcule le prix côté serveur et construit le lien wa.me", async () => {
    const cat = await makeCategory();
    const p = await makeProduct(cat.id, { name: "Assistant", priceMillimes: 55_000 });
    const r = await prepareWhatsAppOrder({ productId: p.id, quantity: 1 }, ctx);
    expect(r.unitPriceMillimes).toBe(55_000);
    expect(r.whatsappUrl.startsWith("https://wa.me/21655056614?text=")).toBe(true);
    expect(decodeURIComponent(r.whatsappUrl.split("?text=")[1]!)).toContain("Assistant");
    expect(r.reference).toBeTruthy();
    const [row] = await getDb().select().from(orderRequests);
    expect(row).toMatchObject({ status: "INITIATED", productName: "Assistant", totalMillimes: 55_000, quantity: 1 });
  });

  it("ignore tout prix envoyé par le navigateur", async () => {
    const cat = await makeCategory();
    const p = await makeProduct(cat.id, { priceMillimes: 55_000 });
    const r = await prepareWhatsAppOrder({ productId: p.id, quantity: 1, priceMillimes: 1, unitPriceMillimes: 1 }, ctx);
    expect(r.unitPriceMillimes).toBe(55_000);
  });

  it("utilise l'offre choisie et multiplie par la quantité", async () => {
    const cat = await makeCategory();
    const p = await makeProduct(cat.id, { priceMillimes: null, quantityEnabled: true, maxQuantity: 5 });
    const v = await makeVariant(p.id, { name: "1 an", priceMillimes: 100_000 });
    const r = await prepareWhatsAppOrder({ productId: p.id, variantId: v.id, quantity: 3 }, ctx);
    expect(r.totalMillimes).toBe(300_000);
    const [row] = await getDb().select().from(orderRequests);
    expect(row).toMatchObject({ variantName: "1 an", unitPriceMillimes: 100_000 });
  });

  it("refuse les produits indisponibles", async () => {
    const cat = await makeCategory();
    const hiddenCat = await makeCategory({ isPublished: false });
    const cases = [
      await makeProduct(cat.id, { status: "DRAFT" }),
      await makeProduct(cat.id, { status: "ARCHIVED" }),
      await makeProduct(cat.id, { availability: "OUT_OF_STOCK" }),
      await makeProduct(hiddenCat.id),
    ];
    for (const p of cases) await expectApp(prepareWhatsAppOrder({ productId: p.id, quantity: 1 }, ctx), "UNAVAILABLE");
    expect(await getDb().select().from(orderRequests)).toHaveLength(0);
  });

  it("valide offre, quantité et identifiants", async () => {
    const cat = await makeCategory();
    const plain = await makeProduct(cat.id);
    const withV = await makeProduct(cat.id, { priceMillimes: null });
    const v = await makeVariant(withV.id);
    const other = await makeVariant((await makeProduct(cat.id)).id);
    const soldOut = await makeVariant(withV.id, { name: "Épuisée", availability: "OUT_OF_STOCK", position: 2 });
    await expectApp(prepareWhatsAppOrder({ productId: withV.id, quantity: 1 }, ctx), "VALIDATION", /offre/i);
    await expectApp(prepareWhatsAppOrder({ productId: withV.id, variantId: other.id, quantity: 1 }, ctx), "VALIDATION");
    await expectApp(prepareWhatsAppOrder({ productId: withV.id, variantId: soldOut.id, quantity: 1 }, ctx), "UNAVAILABLE");
    await expectApp(prepareWhatsAppOrder({ productId: plain.id, variantId: v.id, quantity: 1 }, ctx), "VALIDATION");
    await expectApp(prepareWhatsAppOrder({ productId: plain.id, quantity: 2 }, ctx), "VALIDATION", /unité/);
    await expectApp(prepareWhatsAppOrder({ productId: plain.id, quantity: 0 }, ctx), "VALIDATION");
    await expectApp(prepareWhatsAppOrder({ productId: "pas-un-uuid", quantity: 1 }, ctx), "VALIDATION");
    await expectApp(prepareWhatsAppOrder({ productId: "11111111-1111-4111-8111-111111111111", quantity: 1 }, ctx), "UNAVAILABLE");
  });

  it("rejette les robots (champ piège) et limite le débit", async () => {
    const cat = await makeCategory();
    const p = await makeProduct(cat.id);
    await expectApp(prepareWhatsAppOrder({ productId: p.id, quantity: 1, website: "http://spam" }, ctx), "FORBIDDEN");
    for (let i = 0; i < 15; i++) await prepareWhatsAppOrder({ productId: p.id, quantity: 1 }, { clientHash: "rl" });
    await expectApp(prepareWhatsAppOrder({ productId: p.id, quantity: 1 }, { clientHash: "rl" }), "RATE_LIMITED");
  });

  it("n'enregistre rien quand le suivi est désactivé, mais renvoie quand même le lien", async () => {
    const cat = await makeCategory();
    const p = await makeProduct(cat.id);
    await getDb().insert(siteSettings).values({ id: 1, orderTrackingEnabled: false });
    const r = await prepareWhatsAppOrder({ productId: p.id, quantity: 1 }, ctx);
    expect(r.reference).toBeNull();
    expect(r.whatsappUrl).toContain("wa.me");
    expect(await getDb().select().from(orderRequests)).toHaveLength(0);
  });

  it("utilise le numéro des réglages plutôt que celui de l'environnement", async () => {
    const cat = await makeCategory();
    const p = await makeProduct(cat.id);
    await getDb().insert(siteSettings).values({ id: 1, whatsappNumber: "21620123456" });
    expect((await prepareWhatsAppOrder({ productId: p.id, quantity: 1 }, ctx)).whatsappUrl).toContain("wa.me/21620123456");
  });

  it("conserve la demande si le produit est supprimé ensuite", async () => {
    const cat = await makeCategory();
    const p = await makeProduct(cat.id, { name: "Éphémère" });
    await prepareWhatsAppOrder({ productId: p.id, quantity: 1 }, ctx);
    await deleteProduct(adminId, p.id);
    const [row] = await getDb().select().from(orderRequests);
    expect(row).toMatchObject({ productName: "Éphémère", productId: null });
  });

  it("le statut ne change que par une action d'administration", async () => {
    const cat = await makeCategory();
    const p = await makeProduct(cat.id);
    await prepareWhatsAppOrder({ productId: p.id, quantity: 1 }, ctx);
    const [row] = await getDb().select().from(orderRequests);
    const updated = await updateOrderRequest(adminId, { id: row!.id, status: "CONFIRMED", adminNotes: "  OK  " });
    expect(updated).toMatchObject({ status: "CONFIRMED", adminNotes: "OK" });
    await expectApp(updateOrderRequest(adminId, { id: row!.id, status: "HACKED" }));
  });
});

describe("administration : catégories", () => {
  const input = (o: Record<string, unknown> = {}) => ({ name: "Formations", slug: "", description: "", icon: "graduation-cap", isPublished: true, isFeatured: false, ...o });

  it("crée avec slug généré, refuse les doublons et slugs réservés, et journalise", async () => {
    const c = await saveCategory(adminId, input());
    expect(c.slug).toBe("formations");
    await expectApp(saveCategory(adminId, input({ name: "Autre", slug: "formations" })), "CONFLICT");
    await expectApp(saveCategory(adminId, input({ name: "Admin", slug: "admin" })), "VALIDATION");
    await expectApp(saveCategory(adminId, input({ icon: "pas-une-icone" })), "VALIDATION");
    await expectApp(saveCategory(adminId, input({ name: "x" })), "VALIDATION");
    expect((await getDb().select().from(auditLogs)).some((l) => l.action === "category.create")).toBe(true);
  });

  it("modifie et refuse de supprimer une catégorie qui contient des produits", async () => {
    const c = await saveCategory(adminId, input());
    const renamed = await saveCategory(adminId, input({ id: c.id, name: "Cours en ligne", slug: "cours" }));
    expect(renamed).toMatchObject({ id: c.id, name: "Cours en ligne", slug: "cours" });
    await makeProduct(c.id);
    await expectApp(deleteCategory(adminId, c.id), "CONFLICT");
    await getDb().delete(products).where(eq(products.categoryId, c.id));
    await deleteCategory(adminId, c.id);
    expect(await getDb().select().from(categories)).toHaveLength(0);
  });
});

describe("administration : produits", () => {
  const input = (categoryId: string, o: Record<string, unknown> = {}) => ({
    name: "Nouveau produit", slug: "", sku: "NP-001", brand: "", shortDescription: "Une description suffisamment longue.", description: "Détails", categoryId,
    status: "PUBLISHED", availability: "IN_STOCK", isFeatured: false, isPopular: false, pricingMode: "fixed", priceTnd: "49,500", quantityEnabled: false, maxQuantity: 1,
    features: ["A", "B"], requirements: [], variants: [], images: [], relatedIds: [], faqs: [], ...o,
  });

  it("crée un produit à prix fixe, en millimes", async () => {
    const cat = await makeCategory();
    const { id, slug } = await saveProduct(adminId, input(cat.id));
    expect(slug).toBe("nouveau-produit");
    const [row] = await getDb().select().from(products).where(eq(products.id, id));
    expect(row).toMatchObject({ priceMillimes: 49_500, sku: "NP-001", status: "PUBLISHED" });
  });

  it("crée un produit à offres puis synchronise les offres à la modification", async () => {
    const cat = await makeCategory();
    const { id } = await saveProduct(adminId, input(cat.id, { pricingMode: "variants", priceTnd: "", variants: [
      { name: "1 mois", priceTnd: "20", availability: "IN_STOCK", isActive: true },
      { name: "1 an", priceTnd: "180", availability: "ON_REQUEST", isActive: true },
    ] }));
    let detail = await getProductBySlug("nouveau-produit");
    expect(detail?.variants.map((v) => v.name)).toEqual(["1 mois", "1 an"]);
    const keep = detail!.variants[0]!;
    await saveProduct(adminId, input(cat.id, { id, pricingMode: "variants", priceTnd: "", variants: [{ id: keep.id, name: "1 mois", priceTnd: "25", availability: "IN_STOCK", isActive: true }] }));
    detail = await getProductBySlug("nouveau-produit");
    expect(detail?.variants).toHaveLength(1);
    expect(detail?.variants[0]).toMatchObject({ id: keep.id, priceMillimes: 25_000 });
  });

  it("refuse SKU et slug dupliqués, catégorie inconnue et données invalides", async () => {
    const cat = await makeCategory();
    await saveProduct(adminId, input(cat.id));
    await expectApp(saveProduct(adminId, input(cat.id, { name: "Autre", slug: "autre" })), "CONFLICT"); // SKU dupliqué
    await expectApp(saveProduct(adminId, input(cat.id, { sku: "NP-002", slug: "nouveau-produit" })), "CONFLICT"); // slug dupliqué
    await expectApp(saveProduct(adminId, input("11111111-1111-4111-8111-111111111111", { sku: "NP-003", slug: "x3" })));
    await expectApp(saveProduct(adminId, input(cat.id, { sku: "NP-004", slug: "x4", priceTnd: "abc" })), "VALIDATION");
    await expectApp(saveProduct(adminId, input(cat.id, { sku: "NP-005", slug: "x5", images: [{ url: "https://evil.example/x.png", storageKey: "../../etc/passwd", provider: "local" }] })));
  });

  it("publie, dépublie et supprime", async () => {
    const cat = await makeCategory();
    const { id, slug } = await saveProduct(adminId, input(cat.id));
    await setProductStatus(adminId, id, "DRAFT");
    expect(await getProductBySlug(slug)).toBeNull();
    await setProductStatus(adminId, id, "PUBLISHED");
    expect(await getProductBySlug(slug)).not.toBeNull();
    await deleteProduct(adminId, id);
    expect(await getProductBySlug(slug)).toBeNull();
  });
});

describe("limitation de débit", () => {
  it("bloque au-delà de la limite et isole les clés", async () => {
    for (let i = 0; i < 3; i++) expect((await consumeRateLimit("k1", { limit: 3, windowSec: 60 })).allowed).toBe(true);
    const blocked = await consumeRateLimit("k1", { limit: 3, windowSec: 60 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect((await consumeRateLimit("k2", { limit: 3, windowSec: 60 })).allowed).toBe(true);
  });
});
