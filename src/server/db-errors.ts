/** Détecte une violation de contrainte d'unicité PostgreSQL (code 23505), y compris dans l'erreur enveloppée par Drizzle. */
export function uniqueViolationConstraint(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
    const e = current as { code?: string; constraint?: string; cause?: unknown };
    if (e.code === "23505") return e.constraint ?? "unique";
    current = e.cause;
  }
  return null;
}

export function isForeignKeyViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
    const e = current as { code?: string; cause?: unknown };
    if (e.code === "23503") return true;
    current = e.cause;
  }
  return false;
}
