-- CreateTable
CREATE TABLE "MobileTankCustoms" (
    "id" SERIAL NOT NULL,
    "mobile_tank_id" INTEGER NOT NULL,
    "customs_declaration_number" TEXT NOT NULL,
    "quantity_liters" DOUBLE PRECISION NOT NULL,
    "date_added" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remaining_quantity_liters" DOUBLE PRECISION NOT NULL,
    "supplier_name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileTankCustoms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MobileTankCustoms_mobile_tank_id_idx" ON "MobileTankCustoms"("mobile_tank_id");

-- CreateIndex
CREATE INDEX "MobileTankCustoms_customs_declaration_number_idx" ON "MobileTankCustoms"("customs_declaration_number");

-- CreateIndex
CREATE INDEX "MobileTankCustoms_date_added_idx" ON "MobileTankCustoms"("date_added");

-- AddForeignKey
ALTER TABLE "MobileTankCustoms" ADD CONSTRAINT "MobileTankCustoms_mobile_tank_id_fkey" FOREIGN KEY ("mobile_tank_id") REFERENCES "FuelTank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
