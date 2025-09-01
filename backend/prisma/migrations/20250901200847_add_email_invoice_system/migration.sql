-- CreateEnum (only if not exists)
DO $$ BEGIN
    CREATE TYPE "EmailDispatchStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (only if not exists)
DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable (only if not exists)
CREATE TABLE IF NOT EXISTS "EmailInvoiceDispatch" (
    "id" SERIAL NOT NULL,
    "fuelingOperationId" INTEGER NOT NULL,
    "airlineId" INTEGER NOT NULL,
    "status" "EmailDispatchStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "emailSubject" TEXT,
    "emailTo" TEXT,
    "emailBody" TEXT,
    "pdfFileName" TEXT,
    "pdfSha256" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentReceivedAt" TIMESTAMP(3),
    "paymentNote" TEXT,

    CONSTRAINT "EmailInvoiceDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailInvoiceDispatch_fuelingOperationId_key" ON "EmailInvoiceDispatch"("fuelingOperationId");

-- CreateIndex
CREATE INDEX "EmailInvoiceDispatch_airlineId_idx" ON "EmailInvoiceDispatch"("airlineId");

-- CreateIndex
CREATE INDEX "EmailInvoiceDispatch_status_idx" ON "EmailInvoiceDispatch"("status");

-- CreateIndex
CREATE INDEX "EmailInvoiceDispatch_dispatchedAt_idx" ON "EmailInvoiceDispatch"("dispatchedAt");

-- CreateIndex
CREATE INDEX "EmailInvoiceDispatch_paymentStatus_idx" ON "EmailInvoiceDispatch"("paymentStatus");

-- AddForeignKey
ALTER TABLE "EmailInvoiceDispatch" ADD CONSTRAINT "EmailInvoiceDispatch_fuelingOperationId_fkey" FOREIGN KEY ("fuelingOperationId") REFERENCES "FuelingOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailInvoiceDispatch" ADD CONSTRAINT "EmailInvoiceDispatch_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
