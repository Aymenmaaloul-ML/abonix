/** Transforme un texte (accents, arabe non translittéré, symboles) en slug d'URL. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Slugs réservés pour ne pas entrer en conflit avec des routes de l'application. */
export const RESERVED_SLUGS = new Set(["admin", "api", "new", "nouveau", "edit"]);
