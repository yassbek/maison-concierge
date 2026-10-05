CREATE TABLE "conciergeBriefShare" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conciergeBriefShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conciergeBriefShare_tokenHash_key" ON "conciergeBriefShare"("tokenHash");

CREATE INDEX "conciergeBriefShare_documentId_revokedAt_idx" ON "conciergeBriefShare"("documentId", "revokedAt");

ALTER TABLE "conciergeBriefShare" ADD CONSTRAINT "conciergeBriefShare_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "conciergeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
