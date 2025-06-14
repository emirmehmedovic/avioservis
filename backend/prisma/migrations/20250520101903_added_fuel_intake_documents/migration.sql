-- CreateTable
CREATE TABLE "FuelIntakeDocuments" (
    "id" SERIAL NOT NULL,
    "fuel_intake_record_id" INTEGER NOT NULL,
    "document_name" TEXT NOT NULL,
    "document_path" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelIntakeDocuments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FuelIntakeDocuments_fuel_intake_record_id_idx" ON "FuelIntakeDocuments"("fuel_intake_record_id");

-- AddForeignKey
ALTER TABLE "FuelIntakeDocuments" ADD CONSTRAINT "FuelIntakeDocuments_fuel_intake_record_id_fkey" FOREIGN KEY ("fuel_intake_record_id") REFERENCES "FuelIntakeRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;
