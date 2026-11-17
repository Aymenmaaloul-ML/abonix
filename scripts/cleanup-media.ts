// Supprime les images locales orphelines (téléversées mais jamais rattachées, ou détachées depuis).
//   npm run media:cleanup            → simulation : liste ce qui serait supprimé
//   npm run media:cleanup -- --apply → supprime réellement
// Les fichiers de moins de 24 h sont conservés (un formulaire peut être en cours de saisie).
// Avec STORAGE_PROVIDER=cloudinary, utilisez la console Cloudinary (le script ne touche pas aux images distantes).
import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isNotNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import { categories, productImages, siteSettings } from "@/server/db/schema";
import { getEnv } from "@/server/env";
import { LOCAL_KEY_PATTERN, uploadDir } from "@/server/storage/local";

const MIN_AGE_MS = 24 * 60 * 60 * 1000;

async function main() {
  const apply = process.argv.includes("--apply");
  if (getEnv().STORAGE_PROVIDER !== "local") {
    console.log("STORAGE_PROVIDER n'est pas « local » : rien à nettoyer ici.");
    return;
  }
  const db = getDb();
  const used = new Set<string>();
  for (const r of await db.select({ k: productImages.storageKey }).from(productImages)) used.add(r.k);
  for (const r of await db.select({ k: categories.imageKey }).from(categories).where(isNotNull(categories.imageKey))) if (r.k) used.add(r.k);
  const [settings] = await db.select().from(siteSettings).limit(1);
  for (const url of [settings?.logoUrl, settings?.faviconUrl, settings?.ogImageUrl]) {
    if (url?.startsWith("/uploads/")) used.add(url.slice("/uploads/".length));
  }

  const dir = uploadDir();
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    console.log(`Dossier introuvable (${dir}) : rien à nettoyer.`);
    return;
  }
  let orphans = 0;
  for (const name of files) {
    if (!LOCAL_KEY_PATTERN.test(name) || used.has(name)) continue;
    const full = path.join(dir, name);
    const stat = await fs.stat(full);
    if (Date.now() - stat.mtimeMs < MIN_AGE_MS) continue;
    orphans++;
    if (apply) await fs.unlink(full);
    console.log(`${apply ? "supprimé" : "orphelin"} : ${name}`);
  }
  console.log(orphans === 0 ? "Aucun fichier orphelin." : apply ? `${orphans} fichier(s) supprimé(s).` : `${orphans} fichier(s) orphelin(s). Relancez avec --apply pour les supprimer.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Échec :", e instanceof Error ? e.message : e);
  process.exit(1);
});
