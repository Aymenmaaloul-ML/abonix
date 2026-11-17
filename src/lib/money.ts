// Montants en millimes (entiers). 1 TND = 1000 millimes. Aucun calcul en virgule flottante.

const dinarFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** « 49 DT » ou « 49,500 DT ». Les espaces sont insécables pour éviter les retours à la ligne. */
export function formatPrice(millimes: number, currency = "DT"): string {
  const negative = millimes < 0;
  const abs = Math.abs(Math.trunc(millimes));
  const dinars = Math.floor(abs / 1000);
  const rest = abs % 1000;
  const body = rest === 0 ? dinarFormatter.format(dinars) : `${dinarFormatter.format(dinars)},${String(rest).padStart(3, "0")}`;
  return `${negative ? "-" : ""}${body} ${currency}`;
}

/** Variante pour les messages texte (WhatsApp) : « 49 TND ». */
export function formatPriceText(millimes: number): string {
  return formatPrice(millimes, "TND").replace(/ /g, " ").replace(/ /g, " ");
}

/** Affiche « À partir de … » pour une liste de prix. */
export function priceRange(millimes: number[]): { min: number; max: number } | null {
  if (millimes.length === 0) return null;
  return { min: Math.min(...millimes), max: Math.max(...millimes) };
}

/**
 * Convertit une saisie d'administrateur ("12", "12,5", "12.500") en millimes.
 * Retourne null si la valeur est invalide (négative, texte, plus de 3 décimales).
 */
export function parseTndToMillimes(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const millimes = Number(whole) * 1000 + Number(frac.padEnd(3, "0"));
  return Number.isSafeInteger(millimes) && millimes <= 100_000_000_000 ? millimes : null;
}

/** Inverse de parseTndToMillimes pour pré-remplir un champ de formulaire. */
export function millimesToInput(millimes: number | null | undefined): string {
  if (millimes == null) return "";
  const dinars = Math.floor(millimes / 1000);
  const rest = millimes % 1000;
  if (rest === 0) return String(dinars);
  return `${dinars}.${String(rest).padStart(3, "0").replace(/0+$/, "")}`;
}
