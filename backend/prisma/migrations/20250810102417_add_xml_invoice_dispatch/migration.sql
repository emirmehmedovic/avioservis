-- CreateEnum
CREATE TYPE "XmlDispatchStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "XmlInvoiceDispatch" (
    "id" SERIAL NOT NULL,
    "fuelingOperationId" INTEGER NOT NULL,
    "airlineId" INTEGER NOT NULL,
    "status" "XmlDispatchStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "xmlFileName" TEXT NOT NULL,
    "xmlSha256" TEXT NOT NULL,
    "remotePath" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XmlInvoiceDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "XmlInvoiceDispatch_fuelingOperationId_key" ON "XmlInvoiceDispatch"("fuelingOperationId");

-- CreateIndex
CREATE INDEX "XmlInvoiceDispatch_status_idx" ON "XmlInvoiceDispatch"("status");

-- CreateIndex
CREATE INDEX "XmlInvoiceDispatch_airlineId_idx" ON "XmlInvoiceDispatch"("airlineId");

-- CreateIndex
CREATE INDEX "XmlInvoiceDispatch_createdAt_idx" ON "XmlInvoiceDispatch"("createdAt");

-- AddForeignKey
ALTER TABLE "XmlInvoiceDispatch" ADD CONSTRAINT "XmlInvoiceDispatch_fuelingOperationId_fkey" FOREIGN KEY ("fuelingOperationId") REFERENCES "FuelingOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XmlInvoiceDispatch" ADD CONSTRAINT "XmlInvoiceDispatch_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
