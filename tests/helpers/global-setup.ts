import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";

/** Crée la base de test si besoin et applique les migrations. Refuse de toucher une base qui ne s'appelle pas *_test. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://abonix:abonix_dev@localhost:5432/abonix_test";
  const target = new URL(url);
  const dbName = target.pathname.slice(1);
  if (!/_test$/.test(dbName)) throw new Error(`Base de test « ${dbName} » refusée : le nom doit finir par _test.`);

  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query("select 1 from pg_database where datname = $1", [dbName]);
    if (!rowCount) await client.query(`create database "${dbName}"`);
  } finally {
    await client.end();
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  } finally {
    await pool.end();
  }
}
