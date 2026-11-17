// Amorçage de la base : réglages, pages, FAQ et (optionnellement) catalogue de démonstration.
//   npm run db:seed              → contenu de base + catalogue de démo
//   npm run db:seed -- --base-only → contenu de base uniquement (recommandé en production)
// Le script est idempotent : le relancer ne duplique rien et n'écrase pas vos modifications.
import "dotenv/config";
import { eq, isNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import { categories, faqs, pageContents, productRelated, productVariants, products, siteSettings } from "@/server/db/schema";
import { getEnv } from "@/server/env";
import { parseTndToMillimes } from "@/lib/money";
import { DEFAULT_FOOTER_LINKS, DEFAULT_HOMEPAGE_SECTIONS, DEFAULT_PAGES, DEFAULT_STEPS, DEFAULT_TRUST_ITEMS } from "@/server/services/default-content";
import { DEMO_CATEGORIES, DEMO_FAQS, DEMO_PRODUCTS } from "./seed-data";

const baseOnly = process.argv.includes("--base-only");

async function seedSettings() {
  const db = getDb();
  const [existing] = await db.select({ id: siteSettings.id }).from(siteSettings).where(eq(siteSettings.id, 1));
  if (existing) return console.log("• Réglages : déjà présents, conservés.");
  await db.insert(siteSettings).values({
    id: 1,
    whatsappNumber: getEnv().WHATSAPP_NUMBER,
    trustItems: DEFAULT_TRUST_ITEMS,
    howItWorks: DEFAULT_STEPS,
    footerLinks: DEFAULT_FOOTER_LINKS,
    homepageSections: DEFAULT_HOMEPAGE_SECTIONS,
  });
  console.log("• Réglages créés.");
}

async function seedPages() {
  const db = getDb();
  for (const page of DEFAULT_PAGES) {
    await db.insert(pageContents).values({ slug: page.slug, title: page.title, body: page.body, isDraft: page.isDraft, seoDescription: page.seoDescription }).onConflictDoNothing();
  }
  console.log(`• Pages éditables : ${DEFAULT_PAGES.length} vérifiées.`);
}

async function seedGeneralFaqs() {
  const db = getDb();
  const existing = await db.select({ id: faqs.id }).from(faqs).where(isNull(faqs.productId)).limit(1);
  if (existing.length) return console.log("• FAQ : déjà présentes, conservées.");
  await db.insert(faqs).values(DEMO_FAQS.map((f, position) => ({ ...f, position })));
  console.log(`• FAQ : ${DEMO_FAQS.length} questions créées.`);
}

async function seedCatalog() {
  const db = getDb();
  const categoryIds = new Map<string, string>();
  for (const [position, c] of DEMO_CATEGORIES.entries()) {
    await db.insert(categories).values({ slug: c.slug, name: c.name, icon: c.icon, description: c.description, isFeatured: c.featured, position }).onConflictDoNothing();
    const [row] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, c.slug));
    categoryIds.set(c.slug, row!.id);
  }

  const productIds = new Map<string, string>();
  let created = 0;
  for (const [position, p] of DEMO_PRODUCTS.entries()) {
    const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.sku, p.sku));
    if (existing) {
      productIds.set(p.slug, existing.id);
      continue;
    }
    const [row] = await db
      .insert(products)
      .values({
        slug: p.slug,
        sku: p.sku,
        name: p.name,
        brand: p.brand ?? null,
        shortDescription: p.short,
        description: p.description,
        categoryId: categoryIds.get(p.category)!,
        status: p.status ?? "PUBLISHED",
        availability: p.availability ?? "IN_STOCK",
        isFeatured: p.featured ?? false,
        isPopular: p.popular ?? false,
        position,
        priceMillimes: p.variants ? null : parseTndToMillimes(String(p.priceTnd))!,
        quantityEnabled: Boolean(p.quantityMax),
        maxQuantity: p.quantityMax ?? 1,
        features: p.features,
        requirements: p.requirements ?? [],
        publishedAt: (p.status ?? "PUBLISHED") === "PUBLISHED" ? new Date() : null,
      })
      .returning({ id: products.id });
    productIds.set(p.slug, row!.id);
    created++;
    if (p.variants) {
      await db.insert(productVariants).values(
        p.variants.map((v, i) => ({
          productId: row!.id,
          name: v.name,
          priceMillimes: parseTndToMillimes(String(v.priceTnd))!,
          durationLabel: v.durationLabel ?? null,
          licenseType: v.licenseType ?? null,
          availability: v.availability ?? ("IN_STOCK" as const),
          position: i,
        })),
      );
    }
    if (p.faqs) await db.insert(faqs).values(p.faqs.map((f, i) => ({ productId: row!.id, question: f.question, answer: f.answer, position: i })));
  }

  // Produits associés (uniquement pour les produits créés par ce passage).
  for (const p of DEMO_PRODUCTS) {
    const id = productIds.get(p.slug)!;
    const [already] = await db.select({ id: productRelated.productId }).from(productRelated).where(eq(productRelated.productId, id)).limit(1);
    if (already || !p.related?.length) continue;
    const rows = p.related.map((slug, position) => ({ productId: id, relatedProductId: productIds.get(slug)!, position })).filter((r) => r.relatedProductId);
    if (rows.length) await db.insert(productRelated).values(rows);
  }
  console.log(`• Catalogue de démo : ${DEMO_CATEGORIES.length} catégories, ${created} produits créés (SKU « DEMO-… »).`);
}

async function main() {
  getEnv();
  await seedSettings();
  await seedPages();
  await seedGeneralFaqs();
  if (!baseOnly) await seedCatalog();
  else console.log("• Catalogue de démo ignoré (--base-only).");
  console.log("Amorçage terminé.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Échec de l'amorçage :", error instanceof Error ? error.message : error);
  process.exit(1);
});
