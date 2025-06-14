-- CreateTable
CREATE TABLE "HoseDocument" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleId" INTEGER NOT NULL,

    CONSTRAINT "HoseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HoseDocument_vehicleId_idx" ON "HoseDocument"("vehicleId");

-- AddForeignKey
ALTER TABLE "HoseDocument" ADD CONSTRAINT "HoseDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
