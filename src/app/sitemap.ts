import type { MetadataRoute } from "next";
import { getEnv } from "@/server/env";
import { listSitemapEntries } from "@/server/services/catalog";
import { getPageContent } from "@/server/services/admin-content";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getEnv().APP_URL.replace(/\/$/, "");
  const { products, categories } = await listSitemapEntries();
  const legal = await Promise.all(["a-propos", "confidentialite", "conditions"].map((slug) => getPageContent(slug)));
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/produits`, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({ url: `${base}/categories/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/produits/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    // Les pages encore en brouillon ne sont pas annoncées aux moteurs de recherche.
    ...legal.filter((p) => p && !p.isDraft).map((p) => ({ url: `${base}/${p!.slug}`, changeFrequency: "yearly" as const, priority: 0.3 })),
  ];
}
