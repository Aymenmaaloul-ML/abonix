import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { categories, productVariants, products } from "@/server/db/schema";

export async function resetDb() {
  await getDb().execute(sql`truncate table order_requests, audit_logs, rate_limits, sessions, admin_users, product_related, product_images, product_variants, faqs, products, categories, page_contents, site_settings restart identity cascade`);
}

export async function makeCategory(over: Partial<typeof categories.$inferInsert> = {}) {
  const [c] = await getDb().insert(categories).values({ name: "Outils IA", slug: `outils-ia-${Math.random().toString(36).slice(2, 7)}`, icon: "sparkles", isPublished: true, ...over }).returning();
  return c!;
}

type ProductOver = Partial<typeof products.$inferInsert>;
export async function makeProduct(categoryId: string, over: ProductOver = {}) {
  const n = Math.random().toString(36).slice(2, 8);
  const [p] = await getDb()
    .insert(products)
    .values({ name: `Produit ${n}`, slug: `produit-${n}`, sku: `SKU-${n}`, shortDescription: "Description courte du produit de test.", description: "", categoryId, status: "PUBLISHED", availability: "IN_STOCK", priceMillimes: 49_000, ...over })
    .returning();
  return p!;
}

export async function makeVariant(productId: string, over: Partial<typeof productVariants.$inferInsert> = {}) {
  const [v] = await getDb().insert(productVariants).values({ productId, name: "1 mois", priceMillimes: 20_000, availability: "IN_STOCK", isActive: true, ...over }).returning();
  return v!;
}
