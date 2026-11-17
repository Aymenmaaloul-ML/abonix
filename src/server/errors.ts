/** Erreur « attendue » dont le message peut être montré à l'utilisateur. Toute autre erreur est masquée. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "FORBIDDEN" | "UNAUTHENTICATED" | "RATE_LIMITED" | "UNAVAILABLE" = "VALIDATION",
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type ActionResult<T = void> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]>; code?: AppError["code"] };

export function ok<T = void>(data?: T, message?: string): ActionResult<T> {
  return { ok: true, data: data as T, message };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>, code?: AppError["code"]): ActionResult<never> {
  return { ok: false, error, fieldErrors, code };
}
