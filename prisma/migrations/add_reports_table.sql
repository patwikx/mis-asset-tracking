-- Add reports table
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "parameters" JSONB,
    "data" JSONB NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessUnitId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- Add indexes for better performance
CREATE INDEX "reports_businessUnitId_idx" ON "reports"("businessUnitId");
CREATE INDEX "reports_type_idx" ON "reports"("type");
CREATE INDEX "reports_generatedAt_idx" ON "reports"("generatedAt");
CREATE INDEX "reports_isActive_idx" ON "reports"("isActive");