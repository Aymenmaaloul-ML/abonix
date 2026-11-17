import { describe, expect, it } from "vitest";
import { effectiveAvailability, isProductOrderable } from "@/lib/availability";
import { formatPrice, formatPriceText, millimesToInput, parseTndToMillimes } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { buildOrderMessage, buildWhatsAppUrl, normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { catalogQuerySchema } from "@/lib/validation/catalog";
import { productSchema } from "@/lib/validation/product";
import { orderRequestSchema } from "@/lib/validation/order";
import { changePasswordSchema } from "@/lib/validation/auth";
import { checkPasswordStrength } from "@/server/auth/password";
import { isSameOrigin } from "@/server/security";

describe("argent (millimes)", () => {
  it("convertit les dinars saisis en millimes", () => {
    expect(parseTndToMillimes("49")).toBe(49_000);
    expect(parseTndToMillimes("49,5")).toBe(49_500);
    expect(parseTndToMillimes("49.500")).toBe(49_500);
    expect(parseTndToMillimes("0")).toBe(0);
  });
  it("refuse les montants invalides", () => {
    for (const bad of ["", "abc", "-5", "1.2345", "1e3", "12,3,4"]) expect(parseTndToMillimes(bad), bad).toBeNull();
  });
  it("affiche et reconvertit sans perte", () => {
    expect(formatPriceText(49_500)).toContain("49");
    expect(formatPrice(55_000)).toContain("55");
    expect(parseTndToMillimes(millimesToInput(12_345))).toBe(12_345);
  });
});

describe("slug", () => {
  it("retire accents et ponctuation", () => {
    expect(slugify("Abonnement Créatif – Pro (démo) !")).toBe("abonnement-creatif-pro-demo");
  });
});

describe("WhatsApp", () => {
  it("normalise les numéros tunisiens", () => {
    expect(normalizeWhatsAppNumber("+216 55 056 614")).toBe("21655056614");
    expect(normalizeWhatsAppNumber("0021655056614")).toBe("21655056614");
    expect(normalizeWhatsAppNumber("55056614")).toBe("21655056614");
    expect(normalizeWhatsAppNumber("12")).toBeNull();
    expect(normalizeWhatsAppNumber("abc")).toBeNull();
  });
  it("construit un message complet en français", () => {
    const msg = buildOrderMessage({ productName: "Assistant IA Pro", sku: "IA-1", variantName: "1 mois", quantity: 2, unitPriceMillimes: 55_000, productUrl: "https://abonix.tn/produits/ia", requestReference: "AB-1" });
    for (const part of ["Assistant IA Pro", "IA-1", "Offre : 1 mois", "Quantité : 2", "Total affiché", "https://abonix.tn/produits/ia", "AB-1"]) expect(msg).toContain(part);
  });
  it("omet l'offre et le total quand ils ne s'appliquent pas", () => {
    const msg = buildOrderMessage({ productName: "X", sku: "S", quantity: 1, unitPriceMillimes: 1000, productUrl: "https://x" });
    expect(msg).not.toContain("Offre :");
    expect(msg).not.toContain("Total affiché");
  });
  it("encode correctement accents, retours à la ligne et symboles", () => {
    const url = buildWhatsAppUrl("21655056614", "Bonjour é & à\nligne 2 ?");
    expect(url.startsWith("https://wa.me/21655056614?text=")).toBe(true);
    expect(url).not.toMatch(/\s/);
    expect(decodeURIComponent(url.split("?text=")[1]!)).toBe("Bonjour é & à\nligne 2 ?");
  });
});

describe("disponibilité", () => {
  const v = (availability: "IN_STOCK" | "ON_REQUEST" | "OUT_OF_STOCK", isActive = true) => ({ availability, isActive });
  it("un produit brouillon ou épuisé n'est pas commandable", () => {
    expect(isProductOrderable({ status: "DRAFT", availability: "IN_STOCK" }, [])).toBe(false);
    expect(isProductOrderable({ status: "PUBLISHED", availability: "OUT_OF_STOCK" }, [])).toBe(false);
    expect(isProductOrderable({ status: "PUBLISHED", availability: "IN_STOCK" }, [])).toBe(true);
  });
  it("avec offres, il faut au moins une offre active et non épuisée", () => {
    const p = { status: "PUBLISHED", availability: "IN_STOCK" } as const;
    expect(isProductOrderable(p, [v("OUT_OF_STOCK")])).toBe(false);
    expect(isProductOrderable(p, [v("IN_STOCK", false), v("OUT_OF_STOCK")])).toBe(false);
    expect(isProductOrderable(p, [v("OUT_OF_STOCK"), v("ON_REQUEST")])).toBe(true);
  });
  it("calcule la disponibilité affichée", () => {
    expect(effectiveAvailability({ status: "PUBLISHED", availability: "IN_STOCK" }, [v("ON_REQUEST")])).toBe("ON_REQUEST");
    expect(effectiveAvailability({ status: "PUBLISHED", availability: "OUT_OF_STOCK" }, [v("IN_STOCK")])).toBe("OUT_OF_STOCK");
  });
});

describe("validation produit", () => {
  const base = {
    name: "Produit", slug: "produit", sku: "SKU-1", shortDescription: "Une description assez longue.", description: "", categoryId: "11111111-1111-4111-8111-111111111111",
    status: "DRAFT", availability: "IN_STOCK", isFeatured: false, isPopular: false, pricingMode: "fixed", priceTnd: "10", quantityEnabled: false, maxQuantity: 1,
    features: [], requirements: [], variants: [], images: [], relatedIds: [], faqs: [],
  };
  it("accepte un produit à prix fixe valide", () => expect(productSchema.safeParse(base).success).toBe(true));
  it("refuse un prix invalide", () => expect(productSchema.safeParse({ ...base, priceTnd: "abc" }).success).toBe(false));
  it("exige au moins une offre en mode offres", () => expect(productSchema.safeParse({ ...base, pricingMode: "variants" }).success).toBe(false));
  it("refuse deux offres de même nom", () => {
    const variant = { name: "1 mois", priceTnd: "5", availability: "IN_STOCK", isActive: true };
    expect(productSchema.safeParse({ ...base, pricingMode: "variants", variants: [variant, { ...variant, name: "1 MOIS" }] }).success).toBe(false);
  });
  it("refuse un SKU invalide et un prix d'offre négatif", () => {
    expect(productSchema.safeParse({ ...base, sku: "!!" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, pricingMode: "variants", variants: [{ name: "a", priceTnd: "-1", availability: "IN_STOCK", isActive: true }] }).success).toBe(false);
  });
});

describe("validation des entrées", () => {
  it("demande : quantité entière entre 1 et 100", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(orderRequestSchema.safeParse({ productId: id, quantity: 1 }).success).toBe(true);
    for (const q of [0, -1, 1.5, 101]) expect(orderRequestSchema.safeParse({ productId: id, quantity: q }).success, String(q)).toBe(false);
    expect(orderRequestSchema.safeParse({ productId: "pas-un-uuid", quantity: 1 }).success).toBe(false);
  });
  it("catalogue : valeurs par défaut et bornes", () => {
    expect(catalogQuerySchema.parse({})).toMatchObject({ sort: "featured", page: 1 });
    expect(catalogQuerySchema.safeParse({ sort: "hack" }).success).toBe(false);
    expect(catalogQuerySchema.safeParse({ page: "0" }).success).toBe(false);
  });
  it("mot de passe : 12 caractères et confirmation identique", () => {
    expect(checkPasswordStrength("court")).not.toBeNull();
    expect(checkPasswordStrength("aaaaaaaaaaaaaa")).not.toBeNull();
    expect(checkPasswordStrength("Un-bon-mot-de-passe-42")).toBeNull();
    expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "Un-bon-mot-de-passe-42", confirmPassword: "autre" }).success).toBe(false);
  });
});

describe("même origine (CSRF)", () => {
  const req = (headers: Record<string, string>) => new Request("http://localhost:3000/api/admin/upload", { method: "POST", headers });
  it("accepte la même origine, refuse les autres", () => {
    expect(isSameOrigin(req({ origin: "http://localhost:3000" }))).toBe(true);
    expect(isSameOrigin(req({ origin: "https://evil.example" }))).toBe(false);
    expect(isSameOrigin(req({}))).toBe(false);
  });
});
