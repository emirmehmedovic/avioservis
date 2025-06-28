-- Add isMainImage column to VehicleImage table
-- This migration adds the missing isMainImage column that was added to schema.prisma but never migrated

-- AlterTable
ALTER TABLE "VehicleImage" ADD COLUMN "isMainImage" BOOLEAN NOT NULL DEFAULT false;

-- Set one image as main image for each vehicle (if they don't have one)
UPDATE "VehicleImage" 
SET "isMainImage" = true 
WHERE id IN (
  SELECT DISTINCT ON ("vehicleId") id 
  FROM "VehicleImage" 
  ORDER BY "vehicleId", "uploadedAt" ASC
); 