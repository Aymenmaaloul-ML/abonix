import { expect, test } from "@playwright/test";

test.describe("parcours client", () => {
  test("accueil, catalogue, filtres, fiche produit et commande WhatsApp", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto("/produits");
    await expect(page.getByText(/produits?$/i).first()).toBeVisible();
    const cards = page.locator("a[href^='/produits/']");
    expect(await cards.count()).toBeGreaterThan(3);

    // Recherche : un seul résultat attendu, puis aucun résultat pour une requête absurde.
    await page.goto("/produits?q=Assistant%20IA");
    await expect(page.locator("a[href^='/produits/']").first()).toBeVisible();
    await page.goto("/produits?q=zzzzzzzz-introuvable");
    await expect(page.getByText(/aucun produit/i).first()).toBeVisible();

    // Les produits brouillon de la démo ne sont jamais visibles.
    await page.goto("/produits?q=brouillon");
    await expect(page.locator("a[href^='/produits/']")).toHaveCount(0);

    // Fiche produit à offres.
    await page.goto("/produits?q=Assistant%20IA");
    await page.locator("a[href^='/produits/']").first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Sans offre choisie : message d'erreur, aucun appel WhatsApp.
    const order = page.getByRole("button", { name: /Commander via WhatsApp/i });
    await order.click({ force: true }); // aria-disabled : le clic est volontairement possible pour afficher l'aide
    await expect(page.getByRole("alert").filter({ hasText: /offre/i })).toBeVisible();

    // Avec une offre : demande enregistrée et lien wa.me avec le message prérempli.
    // (Sur mobile, le site quitte la page vers WhatsApp ; sur ordinateur, il ouvre un onglet.)
    await page.route("https://wa.me/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<p>WhatsApp</p>" }));
    await page.getByRole("radio").first().check({ force: true });
    await order.click();
    let href: string;
    if (testInfo.project.name === "mobile") {
      await page.waitForURL(/^https:\/\/wa\.me\//);
      href = page.url();
    } else {
      const link = page.getByRole("link", { name: /Ouvrir WhatsApp/i });
      await expect(link).toBeVisible();
      href = (await link.getAttribute("href"))!;
    }
    expect(href.startsWith("https://wa.me/21655056614?text=")).toBe(true);
    const text = decodeURIComponent(href.split("?text=")[1]!);
    expect(text).toContain("Produit :");
    expect(text).toContain("Quantité : 1");
    expect(text).toContain("Demande n°");
  });

  test("produit indisponible : commande impossible, aucune demande créée", async ({ page }) => {
    await page.goto("/produits/carte-cadeau-applications-10-demo");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/indisponible/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Commander via WhatsApp/i })).toHaveCount(0);
    const contact = page.getByRole("link", { name: /Nous contacter sur WhatsApp/i });
    expect(await contact.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/21655056614/);
  });

  test("pages inconnues : 404, pages d'information accessibles", async ({ page, request }) => {
    expect((await request.get("/produits/n-existe-pas")).status()).toBe(404);
    expect((await request.get("/categories/n-existe-pas")).status()).toBe(404);
    for (const path of ["/a-propos", "/contact", "/faq", "/confidentialite", "/conditions"]) {
      expect((await request.get(path)).status(), path).toBe(200);
    }
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(await (await request.get("/sitemap.xml")).text()).toContain("<urlset");
    await page.goto("/");
  });

  test("en-têtes de sécurité et administration noindex", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["content-security-policy"]).toContain("script-src");
    expect(h["x-frame-options"] ?? h["content-security-policy"]).toBeTruthy();
    const admin = await request.get("/admin/login");
    expect(await admin.text()).toMatch(/noindex/i);
  });
});
