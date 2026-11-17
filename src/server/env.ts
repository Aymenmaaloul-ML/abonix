import "server-only";
import { z } from "zod";

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z
      .string({ error: "DATABASE_URL est requis" })
      .refine((v) => /^postgres(ql)?:\/\//.test(v), "DATABASE_URL doit commencer par postgresql://"),
    APP_URL: z.preprocess(emptyToUndefined, z.url().default("http://localhost:3000")),
    WHATSAPP_NUMBER: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(/^\d{8,15}$/, "WHATSAPP_NUMBER : chiffres uniquement, indicatif inclus, sans + (ex. 21655056614)")
        .default("21655056614"),
    ),
    HASH_SALT: optionalString,
    STORAGE_PROVIDER: z.preprocess(emptyToUndefined, z.enum(["local", "cloudinary"]).default("local")),
    UPLOAD_DIR: z.preprocess(emptyToUndefined, z.string().default("./storage/uploads")),
    CLOUDINARY_CLOUD_NAME: optionalString,
    CLOUDINARY_API_KEY: optionalString,
    CLOUDINARY_API_SECRET: optionalString,
    CLOUDINARY_FOLDER: z.preprocess(emptyToUndefined, z.string().default("abonix")),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && (!env.HASH_SALT || env.HASH_SALT.length < 24)) {
      ctx.addIssue({ code: "custom", path: ["HASH_SALT"], message: "HASH_SALT (24 caractères minimum) est requis en production" });
    }
    if (env.STORAGE_PROVIDER === "cloudinary") {
      for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const) {
        if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: `${key} est requis quand STORAGE_PROVIDER=cloudinary` });
      }
    }
  });

export type Env = z.infer<typeof schema> & { HASH_SALT: string };

let cached: Env | null = null;

/** Lit et valide les variables d'environnement à la première utilisation (jamais pendant le build). */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "env"}: ${i.message}`).join("\n");
    // On n'affiche jamais les valeurs, uniquement les noms de variables fautives.
    throw new Error(`Configuration d'environnement invalide :\n${details}\nVoir .env.example.`);
  }
  cached = { ...parsed.data, HASH_SALT: parsed.data.HASH_SALT ?? "dev-only-salt-change-me-0000000000" };
  return cached;
}
