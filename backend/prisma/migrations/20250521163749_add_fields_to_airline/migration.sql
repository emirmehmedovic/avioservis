-- AlterTable
ALTER TABLE "Airline" ADD COLUMN     "address" TEXT,
ADD COLUMN     "isForeign" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "operatingDestinations" TEXT[],
ADD COLUMN     "taxId" TEXT;
