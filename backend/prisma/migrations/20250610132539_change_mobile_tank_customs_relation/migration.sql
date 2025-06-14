-- DropForeignKey
ALTER TABLE "MobileTankCustoms" DROP CONSTRAINT "MobileTankCustoms_mobile_tank_id_fkey";

-- AddForeignKey
ALTER TABLE "MobileTankCustoms" ADD CONSTRAINT "MobileTankCustoms_mobile_tank_id_fkey" FOREIGN KEY ("mobile_tank_id") REFERENCES "FuelTank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
