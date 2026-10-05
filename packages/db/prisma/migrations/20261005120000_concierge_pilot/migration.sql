CREATE TABLE "clientProfile" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'Private client',
    "preferences" TEXT NOT NULL DEFAULT '',
    "dietary" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "defaultMarkupPercent" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplierProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL,
    "categories" TEXT[],
    "notes" TEXT NOT NULL DEFAULT '',
    "cancellationTerms" TEXT NOT NULL DEFAULT '',
    "paymentTerms" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplierProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conciergeCase" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assigneeId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conciergeCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "serviceSegment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "supplierId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "costCents" INTEGER,
    "sellCents" INTEGER NOT NULL DEFAULT 0,
    "supplierTerms" TEXT NOT NULL DEFAULT '',
    "clientTerms" TEXT NOT NULL DEFAULT '',
    "availability" TEXT NOT NULL DEFAULT '',
    "confirmationReference" TEXT NOT NULL DEFAULT '',
    "confirmationBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "clientNotes" TEXT NOT NULL DEFAULT '',
    "supplierNotes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serviceSegment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conciergeTask" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assigneeId" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conciergeTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conciergeIntake" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "caseId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "proposal" JSONB,
    "extractionStatus" TEXT NOT NULL DEFAULT 'pending',
    "extractionError" TEXT,
    "extractionStartedAt" TIMESTAMP(3),
    "extractionCompletedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conciergeIntake_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conciergeDocument" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "supplierId" TEXT,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conciergeDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conciergeActivity" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conciergeActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clientProfile_contactId_key" ON "clientProfile"("contactId");

CREATE UNIQUE INDEX "supplierProfile_companyId_key" ON "supplierProfile"("companyId");

CREATE UNIQUE INDEX "conciergeCase_reference_key" ON "conciergeCase"("reference");

CREATE INDEX "conciergeCase_status_startsAt_idx" ON "conciergeCase"("status", "startsAt");

CREATE INDEX "serviceSegment_caseId_startsAt_idx" ON "serviceSegment"("caseId", "startsAt");

CREATE INDEX "serviceSegment_supplierId_idx" ON "serviceSegment"("supplierId");

CREATE INDEX "conciergeTask_caseId_dueAt_idx" ON "conciergeTask"("caseId", "dueAt");

CREATE INDEX "conciergeIntake_status_createdAt_idx" ON "conciergeIntake"("status", "createdAt");

CREATE UNIQUE INDEX "conciergeDocument_caseId_audience_version_key" ON "conciergeDocument"("caseId", "audience", "version");

CREATE INDEX "conciergeActivity_caseId_createdAt_idx" ON "conciergeActivity"("caseId", "createdAt");

ALTER TABLE "clientProfile" ADD CONSTRAINT "clientProfile_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplierProfile" ADD CONSTRAINT "supplierProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "conciergeCase" ADD CONSTRAINT "conciergeCase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "conciergeCase" ADD CONSTRAINT "conciergeCase_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "serviceSegment" ADD CONSTRAINT "serviceSegment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "conciergeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "serviceSegment" ADD CONSTRAINT "serviceSegment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplierProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "conciergeTask" ADD CONSTRAINT "conciergeTask_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "conciergeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conciergeTask" ADD CONSTRAINT "conciergeTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "conciergeIntake" ADD CONSTRAINT "conciergeIntake_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "conciergeCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "conciergeDocument" ADD CONSTRAINT "conciergeDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "conciergeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conciergeActivity" ADD CONSTRAINT "conciergeActivity_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "conciergeCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
