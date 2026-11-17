import { ICON_NAMES } from "@/lib/icons";

// Teintes douces attribuées de façon stable à une catégorie (ou à une icône) : repère visuel sans image.
const TINTS = [
  { bg: "#e6f6c4", fg: "#2f4a00" },
  { bg: "#d6f0e2", fg: "#0b4d32" },
  { bg: "#fbe4cf", fg: "#6b3410" },
  { bg: "#d9eafa", fg: "#123b63" },
  { bg: "#e9def8", fg: "#3f1f73" },
  { bg: "#f8dfe5", fg: "#6b1a2e" },
] as const;

/** La teinte suit l'icône de la catégorie (ordre de la liste blanche), donc deux catégories voisines diffèrent presque toujours. */
export function tintFor(key: string): { bg: string; fg: string } {
  const i = ICON_NAMES.indexOf(key);
  if (i >= 0) return TINTS[i % TINTS.length]!;
  let h = 0;
  for (let n = 0; n < key.length; n++) h = (h * 31 + key.charCodeAt(n)) >>> 0;
  return TINTS[h % TINTS.length]!;
}
