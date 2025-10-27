-- AlterTable
ALTER TABLE "PhysicalCisternFuel" ADD COLUMN     "is_cumulative" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PhysicalSubCistern" (
    "id" SERIAL NOT NULL,
    "parent_cistern_id" INTEGER NOT NULL,
    "sub_cistern_name" TEXT NOT NULL,
    "capacity_liters" DOUBLE PRECISION NOT NULL,
    "current_quantity_liters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_quantity_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalSubCistern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalSubCisternMrn" (
    "id" SERIAL NOT NULL,
    "sub_cistern_id" INTEGER NOT NULL,
    "customs_declaration_number" TEXT NOT NULL,
    "quantity_liters" DECIMAL(12,3) NOT NULL,
    "quantity_kg" DECIMAL(12,3) NOT NULL,
    "remaining_quantity_liters" DECIMAL(12,3) NOT NULL,
    "remaining_quantity_kg" DECIMAL(12,3) NOT NULL,
    "density_at_intake" DECIMAL(8,4) NOT NULL,
    "date_added" TIMESTAMP(3) NOT NULL,
    "source_cistern_mrn_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalSubCisternMrn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhysicalSubCistern_parent_cistern_id_idx" ON "PhysicalSubCistern"("parent_cistern_id");

-- CreateIndex
CREATE INDEX "PhysicalSubCistern_is_active_idx" ON "PhysicalSubCistern"("is_active");

-- CreateIndex
CREATE INDEX "PhysicalSubCisternMrn_sub_cistern_id_idx" ON "PhysicalSubCisternMrn"("sub_cistern_id");

-- CreateIndex
CREATE INDEX "PhysicalSubCisternMrn_customs_declaration_number_idx" ON "PhysicalSubCisternMrn"("customs_declaration_number");

-- CreateIndex
CREATE INDEX "PhysicalSubCisternMrn_date_added_idx" ON "PhysicalSubCisternMrn"("date_added");

-- AddForeignKey
ALTER TABLE "PhysicalSubCistern" ADD CONSTRAINT "PhysicalSubCistern_parent_cistern_id_fkey" FOREIGN KEY ("parent_cistern_id") REFERENCES "PhysicalCisternFuel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalSubCisternMrn" ADD CONSTRAINT "PhysicalSubCisternMrn_sub_cistern_id_fkey" FOREIGN KEY ("sub_cistern_id") REFERENCES "PhysicalSubCistern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
