// Crée (ou met à jour le mot de passe d') un administrateur.
//   ADMIN_EMAIL=moi@exemple.tn ADMIN_NAME="Amine" npm run admin:create
// Le mot de passe est demandé de façon masquée, ou lu dans ADMIN_PASSWORD (utile en CI).
// Aucun mot de passe par défaut n'existe : il n'y a pas d'inscription publique.
import "dotenv/config";
import readline from "node:readline";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { adminUsers } from "@/server/db/schema";
import { checkPasswordStrength, hashPassword } from "@/server/auth/password";
import { loginSchema } from "@/lib/validation/auth";

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (s.includes(question)) write.call(rl, s);
      else if (s.includes("\n") || s.includes("\r")) write.call(rl, s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a); }));
}

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? (await prompt("E-mail de l'administrateur : "))).trim().toLowerCase();
  const name = (process.env.ADMIN_NAME ?? (await prompt("Nom affiché : "))).trim() || "Administrateur";
  const password = process.env.ADMIN_PASSWORD ?? (await promptHidden("Mot de passe (12 caractères minimum) : "));

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "E-mail invalide.");
  const weak = checkPasswordStrength(password);
  if (weak) throw new Error(weak);

  const db = getDb();
  const passwordHash = await hashPassword(password);
  const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, parsed.data.email));
  if (existing) {
    await db.update(adminUsers).set({ passwordHash, name }).where(eq(adminUsers.id, existing.id));
    console.log(`Mot de passe mis à jour pour ${parsed.data.email}.`);
  } else {
    await db.insert(adminUsers).values({ email: parsed.data.email, name, passwordHash });
    console.log(`Administrateur créé : ${parsed.data.email}.`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("Échec :", error instanceof Error ? error.message : error);
  process.exit(1);
});
