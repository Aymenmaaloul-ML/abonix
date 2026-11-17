import { defineConfig, devices } from "@playwright/test";

// Les tests e2e tournent sur le build de production (`npm run build` d'abord), avec une base dédiée *_test.
const PORT = 3100;
export const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql://abonix:abonix_dev@localhost:5432/abonix_e2e";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", locale: "fr-FR" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined } } },
    { name: "mobile", testMatch: /customer\.spec\.ts/, use: { ...devices["Pixel 7"], launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined } } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/robots.txt`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: E2E_DB,
      APP_URL: `http://localhost:${PORT}`,
      HASH_SALT: "e2e-salt-e2e-salt-e2e-salt-123456",
      WHATSAPP_NUMBER: "21655056614",
      STORAGE_PROVIDER: "local",
      UPLOAD_DIR: "./storage/e2e-uploads",
      NODE_ENV: "production",
    },
  },
});
