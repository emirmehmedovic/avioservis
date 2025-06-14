-- Add price-related columns to FuelIntakeRecords if they don't exist
DO $$
BEGIN
    -- Add price_per_kg column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'FuelIntakeRecords'
        AND column_name = 'price_per_kg'
    ) THEN
        ALTER TABLE "FuelIntakeRecords" ADD COLUMN "price_per_kg" DOUBLE PRECISION;
    END IF;

    -- Add currency column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'FuelIntakeRecords'
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE "FuelIntakeRecords" ADD COLUMN "currency" TEXT;
    END IF;

    -- Add total_price column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'FuelIntakeRecords'
        AND column_name = 'total_price'
    ) THEN
        ALTER TABLE "FuelIntakeRecords" ADD COLUMN "total_price" DOUBLE PRECISION;
    END IF;
END
$$;
