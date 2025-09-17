/*
  Warnings:

  - Made the column `emailSubject` on table `EmailInvoiceDispatch` required. This step will fail if there are existing NULL values in that column.
  - Made the column `emailTo` on table `EmailInvoiceDispatch` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pdfFileName` on table `EmailInvoiceDispatch` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pdfSha256` on table `EmailInvoiceDispatch` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "EmailInvoiceDispatch" DROP CONSTRAINT "EmailInvoiceDispatch_fuelingOperationId_fkey";

-- DropIndex
DROP INDEX "EmailInvoiceDispatch_fuelingOperationId_key";

-- AlterTable
ALTER TABLE "EmailInvoiceDispatch" ALTER COLUMN "emailSubject" SET NOT NULL,
ALTER COLUMN "emailTo" SET NOT NULL,
ALTER COLUMN "pdfFileName" SET NOT NULL,
ALTER COLUMN "pdfSha256" SET NOT NULL;

-- AlterTable
ALTER TABLE "plan_kalibracije" ADD COLUMN     "adr_dozvole_radnika_do" TIMESTAMP(3),
ADD COLUMN     "adr_dozvole_radnika_od" TIMESTAMP(3),
ADD COLUMN     "ispitivanje_elektro_instalacija_do" TIMESTAMP(3),
ADD COLUMN     "ispitivanje_elektro_instalacija_od" TIMESTAMP(3),
ADD COLUMN     "kalibraza_pp_aparata_do" TIMESTAMP(3),
ADD COLUMN     "kalibraza_pp_aparata_od" TIMESTAMP(3),
ADD COLUMN     "kalibraza_vatro_dojava_do" TIMESTAMP(3),
ADD COLUMN     "kalibraza_vatro_dojava_od" TIMESTAMP(3),
ADD COLUMN     "mjerenje_otpora_uzemljenja_do" TIMESTAMP(3),
ADD COLUMN     "mjerenje_otpora_uzemljenja_od" TIMESTAMP(3),
ADD COLUMN     "strucne_licence_radnika_do" TIMESTAMP(3),
ADD COLUMN     "strucne_licence_radnika_od" TIMESTAMP(3),
ADD COLUMN     "vatro_dojava_do" TIMESTAMP(3),
ADD COLUMN     "vatro_dojava_od" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "EmailInvoiceDispatch_fuelingOperationId_idx" ON "EmailInvoiceDispatch"("fuelingOperationId");

-- AddForeignKey
ALTER TABLE "EmailInvoiceDispatch" ADD CONSTRAINT "EmailInvoiceDispatch_fuelingOperationId_fkey" FOREIGN KEY ("fuelingOperationId") REFERENCES "FuelingOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
