// Règles de disponibilité communes au navigateur (affichage) et au serveur (validation de commande).

export type AvailabilityValue = "IN_STOCK" | "ON_REQUEST" | "OUT_OF_STOCK";

export const availabilityLabels: Record<AvailabilityValue, string> = {
  IN_STOCK: "Disponible",
  ON_REQUEST: "Sur demande",
  OUT_OF_STOCK: "Indisponible",
};

type VariantLike = { isActive: boolean; availability: AvailabilityValue };
type ProductLike = { status: string; availability: AvailabilityValue };

export function isVariantOrderable(v: VariantLike): boolean {
  return v.isActive && v.availability !== "OUT_OF_STOCK";
}

/** Un produit est commandable s'il est publié, non épuisé et (s'il a des offres) qu'au moins une offre l'est. */
export function isProductOrderable(p: ProductLike, activeVariants: VariantLike[]): boolean {
  if (p.status !== "PUBLISHED" || p.availability === "OUT_OF_STOCK") return false;
  const hasVariants = activeVariants.some((v) => v.isActive);
  return hasVariants ? activeVariants.some(isVariantOrderable) : true;
}

/** Disponibilité affichée sur une carte : la meilleure disponibilité parmi les offres actives. */
export function effectiveAvailability(p: ProductLike, activeVariants: VariantLike[]): AvailabilityValue {
  if (p.availability === "OUT_OF_STOCK") return "OUT_OF_STOCK";
  const actives = activeVariants.filter((v) => v.isActive);
  if (actives.length === 0) return p.availability;
  if (actives.some((v) => v.availability === "IN_STOCK")) return p.availability === "ON_REQUEST" ? "ON_REQUEST" : "IN_STOCK";
  if (actives.some((v) => v.availability === "ON_REQUEST")) return "ON_REQUEST";
  return "OUT_OF_STOCK";
}
