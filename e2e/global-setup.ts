import { execSync } from "node:child_process";
import { Client } from "pg";

export const ADMIN = { email: "e2e-admin@abonix.test", password: "E2E-Passw0rd-long-123" };

/** Recrée la base e2e (jamais la base de développement), applique les migrations, charge la démo et crée un admin. */
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL ?? "postgresql://abonix:abonix_dev@localhost:5432/abonix_e2e";
  const u = new URL(url);
  const name = u.pathname.slice(1);
  if (!/_e2e$|_test$/.test(name)) throw new Error(`Base e2e « ${name} » refusée : le nom doit finir par _e2e ou _test.`);
  u.pathname = "/postgres";
  const admin = new Client({ connectionString: u.toString() });
  await admin.connect();
  try {
    await admin.query(`drop database if exists "${name}" with (force)`);
    await admin.query(`create database "${name}"`);
  } finally {
    await admin.end();
  }
  const env = { ...process.env, DATABASE_URL: url, NODE_ENV: "development", ADMIN_EMAIL: ADMIN.email, ADMIN_NAME: "Admin E2E", ADMIN_PASSWORD: ADMIN.password } as NodeJS.ProcessEnv;
  for (const script of ["db:migrate", "db:seed", "admin:create"]) execSync(`npm run ${script}`, { env, stdio: "pipe" });
}
