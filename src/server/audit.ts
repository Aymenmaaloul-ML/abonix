import "server-only";
import { getDb, type Database } from "@/server/db";
import { auditLogs } from "@/server/db/schema";

type DbOrTx = Pick<Database, "insert">;

export type AuditEntry = {
  adminUserId?: string | null;
  action: string; // ex. "product.create"
  entityType: string;
  entityId?: string | null;
  summary?: string;
  metadata?: Record<string, unknown>;
};

/** Journalise une action d'administration. Ne doit jamais faire échouer l'action elle-même. */
export async function recordAudit(entry: AuditEntry, db: DbOrTx = getDb()): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      adminUserId: entry.adminUserId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      summary: entry.summary,
      metadata: entry.metadata,
    });
  } catch (error) {
    console.error("[audit] écriture impossible", error instanceof Error ? error.message : "erreur inconnue");
  }
}
