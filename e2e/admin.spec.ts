import { expect, test, type Page } from "@playwright/test";
import { ADMIN } from "./global-setup";

async function login(page: Page, password = ADMIN.password) {
  await page.goto("/admin/login");
  await page.getByLabel("Adresse e-mail").fill(ADMIN.email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: /Se connecter/i }).click();
}

test.describe("administration", () => {
  test("l'accès sans session redirige vers la connexion, partout", async ({ page }) => {
    for (const path of ["/admin", "/admin/produits", "/admin/produits/nouveau", "/admin/categories", "/admin/commandes", "/admin/contenu", "/admin/reglages", "/admin/compte"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/admin\/login/);
    }
    const res = await page.request.post("/api/admin/upload", { headers: { origin: "http://localhost:3100" }, multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } } });
    expect(res.status()).toBe(401);
  });

  test("mauvais mot de passe : message générique, pas de session", async ({ page }) => {
    await login(page, "mauvais-mot-de-passe");
    await expect(page.getByText(/incorrect/i)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("gestion complète : catégorie, produit, publication, demande, réglages, déconnexion", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();

    // Catégorie
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: /Ajouter une catégorie/i }).click();
    await page.getByLabel("Nom", { exact: true }).fill("Catégorie E2E");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Catégorie E2E").first()).toBeVisible();

    // Produit à prix fixe
    await page.goto("/admin/produits/nouveau");
    await page.getByLabel("Nom du produit").fill("Produit E2E");
    await page.getByLabel("Référence (SKU)").fill("E2E-001");
    await page.getByLabel("Catégorie", { exact: true }).selectOption({ label: "Catégorie E2E" });
    await page.getByLabel("Description courte").fill("Produit créé par le test de bout en bout.");
    await page.getByLabel("Prix (TND)").fill("12,500");
    await page.getByLabel("Statut de publication").selectOption("PUBLISHED");
    await page.getByRole("button", { name: "Créer le produit" }).click();
    await expect(page).toHaveURL(/\/admin\/produits(\/|$)/);

    // Visible côté public avec le bon prix
    await page.goto("/produits/produit-e2e");
    await expect(page.getByRole("heading", { level: 1, name: "Produit E2E" })).toBeVisible();
    await expect(page.getByText(/12,500|12,5/).first()).toBeVisible();

    // Demande depuis le site, puis suivi côté admin
    await page.getByRole("button", { name: /Commander via WhatsApp/i }).click();
    await expect(page.getByRole("link", { name: /Ouvrir WhatsApp/i })).toBeVisible();
    await page.goto("/admin/commandes");
    await expect(page.getByText("Produit E2E").first()).toBeVisible();
    await page.getByRole("link", { name: /^AB-|^[A-Z]{2,}-/ }).first().click();
    await page.getByLabel("Statut").selectOption("CONFIRMED");
    await page.getByLabel("Notes internes").fill("Confirmé par téléphone");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText(/mise à jour|Enregistré/i).first()).toBeVisible();

    // Dépublication : le produit disparaît du site
    await page.goto("/admin/produits?q=Produit%20E2E");
    await page.getByRole("button", { name: /Dépublier Produit E2E/ }).click();
    await expect(page.getByText(/dépublié/i).first()).toBeVisible();
    expect((await page.request.get("/produits/produit-e2e")).status()).toBe(404);

    // Suppression (avec confirmation)
    await page.getByRole("button", { name: /Supprimer Produit E2E/ }).click();
    await page.getByRole("button", { name: /Supprimer définitivement/ }).click();
    await expect(page.getByText(/supprimé/i).first()).toBeVisible();

    // Réglages : changer le slogan
    await page.goto("/admin/reglages");
    await page.getByLabel("Slogan").fill("Slogan modifié E2E");
    await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
    await expect(page.getByText(/enregistrés/i).first()).toBeVisible();

    // Déconnexion
    await page.getByRole("button", { name: /Se déconnecter/i }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin/produits");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
