// Applique les migrations SQL du dossier ./drizzle. Utilisable en production (npm run db:migrate).
import "dotenv/config";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL est requis (voir .env.example).");
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: path.join(process.cwd(), "drizzle") });
    console.log("Migrations appliquées.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Échec des migrations :", err instanceof Error ? err.message : err);
  process.exit(1);
});
