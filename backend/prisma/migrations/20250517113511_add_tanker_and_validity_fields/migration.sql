-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "adr_vazi_do" TIMESTAMP(3),
ADD COLUMN     "crijeva_za_tocenje" TEXT,
ADD COLUMN     "kapacitet_cisterne" DOUBLE PRECISION,
ADD COLUMN     "periodicni_pregled_vazi_do" TIMESTAMP(3),
ADD COLUMN     "registrovano_do" TIMESTAMP(3),
ADD COLUMN     "tip_filtera" TEXT;
