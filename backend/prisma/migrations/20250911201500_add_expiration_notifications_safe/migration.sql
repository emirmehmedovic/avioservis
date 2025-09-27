-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('WARNING_30_DAYS', 'WARNING_15_DAYS', 'CRITICAL_7_DAYS', 'EXPIRED');

-- CreateTable
CREATE TABLE "ExpirationNotification" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldDisplayName" TEXT NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "daysUntilExpiration" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpirationNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpirationNotification_vehicleId_idx" ON "ExpirationNotification"("vehicleId");

-- CreateIndex
CREATE INDEX "ExpirationNotification_notificationType_idx" ON "ExpirationNotification"("notificationType");

-- CreateIndex
CREATE INDEX "ExpirationNotification_isActive_idx" ON "ExpirationNotification"("isActive");

-- CreateIndex
CREATE INDEX "ExpirationNotification_isRead_idx" ON "ExpirationNotification"("isRead");

-- CreateIndex
CREATE INDEX "ExpirationNotification_expirationDate_idx" ON "ExpirationNotification"("expirationDate");

-- AddForeignKey
ALTER TABLE "ExpirationNotification" ADD CONSTRAINT "ExpirationNotification_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;




