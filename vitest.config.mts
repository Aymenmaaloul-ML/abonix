import path from "node:path";
import { defineConfig } from "vitest/config";

const TEST_DB = "postgresql://abonix:abonix_dev@localhost:5432/abonix_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` lève une erreur hors du serveur Next.js : on le neutralise pour les tests.
      "server-only": path.resolve(import.meta.dirname, "tests/helpers/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/helpers/global-setup.ts"],
    fileParallelism: false, // les tests d'intégration partagent une seule base
    testTimeout: 20_000,
    env: {
      // La base de test est toujours distincte de la base de développement.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? TEST_DB,
      APP_URL: "http://localhost:3000",
      WHATSAPP_NUMBER: "21655056614",
      HASH_SALT: "test-salt-test-salt-test-salt-1234",
      STORAGE_PROVIDER: "local",
      UPLOAD_DIR: path.resolve(import.meta.dirname, "storage/test-uploads"),
      NODE_ENV: "test",
    },
  },
});
