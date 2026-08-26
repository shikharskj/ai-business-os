-- Journal source uniqueness for idempotent domain posts (audit fix Wave 0).
-- Replaces non-unique (tenantId, sourceType, sourceId) index.

DROP INDEX IF EXISTS "journals_tenantId_sourceType_sourceId_idx";

-- Detect and reconcile duplicate journals before creating unique index
-- Keep the earliest posted journal for each (tenantId, sourceType, sourceId) tuple
DELETE FROM "journals"
WHERE "id" IN (
  SELECT j."id"
  FROM "journals" j
  INNER JOIN (
    SELECT "tenantId", "sourceType", "sourceId", MIN("postedAt") as earliest_posted
    FROM "journals"
    WHERE "sourceType" IS NOT NULL AND "sourceId" IS NOT NULL
    GROUP BY "tenantId", "sourceType", "sourceId"
    HAVING COUNT(*) > 1
  ) dupes
  ON j."tenantId" = dupes."tenantId"
    AND j."sourceType" = dupes."sourceType"
    AND j."sourceId" = dupes."sourceId"
    AND j."postedAt" > dupes.earliest_posted
);

CREATE UNIQUE INDEX "journals_tenantId_sourceType_sourceId_key"
  ON "journals"("tenantId", "sourceType", "sourceId");
