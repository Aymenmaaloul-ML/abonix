import { formatPriceText } from "./money";

export type OrderMessageInput = {
  siteName?: string;
  productName: string;
  sku: string;
  variantName?: string | null;
  quantity: number;
  unitPriceMillimes: number;
  productUrl: string;
  /** Référence interne de la demande (si le suivi est activé). */
  requestReference?: string | null;
};

/** Message d'ouverture de commande, en français. */
export function buildOrderMessage(input: OrderMessageInput): string {
  const lines: string[] = [
    `Bonjour ${input.siteName ?? "Abonix"} ! Je souhaite commander le produit suivant :`,
    "",
    `Produit : ${input.productName}`,
    `Référence : ${input.sku}`,
  ];
  if (input.variantName) lines.push(`Offre : ${input.variantName}`);
  lines.push(`Quantité : ${input.quantity}`);
  lines.push(`Prix affiché : ${formatPriceText(input.unitPriceMillimes)}`);
  if (input.quantity > 1) lines.push(`Total affiché : ${formatPriceText(input.unitPriceMillimes * input.quantity)}`);
  lines.push(`Lien du produit : ${input.productUrl}`);
  if (input.requestReference) lines.push(`Demande n° : ${input.requestReference}`);
  lines.push("", "Pouvez-vous confirmer la disponibilité et les modalités de commande ?", "", "Merci !");
  return lines.join("\n");
}

/** Lien officiel click-to-chat. Le texte est encodé avec encodeURIComponent (accents, arabe, retours à la ligne). */
export function buildWhatsAppUrl(phoneDigits: string, message?: string): string {
  const base = `https://wa.me/${phoneDigits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Normalise un numéro saisi ("+216 55 056 614", "0021655056614", "55056614") en chiffres avec indicatif.
 * Retourne null si le numéro n'est pas plausible.
 */
export function normalizeWhatsAppNumber(raw: string): string | null {
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  digits = digits.replace(/\D/g, "");
  if (/^\d{8}$/.test(digits)) digits = `216${digits}`; // numéro tunisien local
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

/** « 21655056614 » → « +216 55 056 614 » pour l'affichage. */
export function formatPhoneDisplay(digits: string): string {
  if (/^216\d{8}$/.test(digits)) return `+216 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  return `+${digits}`;
}
