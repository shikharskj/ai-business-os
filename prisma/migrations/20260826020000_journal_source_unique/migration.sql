-- Journal source uniqueness for idempotent domain posts (audit fix Wave 0).
-- Replaces non-unique (tenantId, sourceType, sourceId) index.

DROP INDEX IF EXISTS "journals_tenantId_sourceType_sourceId_idx";

CREATE UNIQUE INDEX "journals_tenantId_sourceType_sourceId_key"
  ON "journals"("tenantId", "sourceType", "sourceId");
