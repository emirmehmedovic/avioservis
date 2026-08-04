-- AlterTable - Add price notification fields to Airline
-- These fields are used for sending fuel price notifications to airlines

-- Add email field for price notifications (may already exist from earlier migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Airline' AND column_name = 'price_notification_email') THEN
        ALTER TABLE "Airline" ADD COLUMN "price_notification_email" TEXT;
    END IF;
END $$;

-- Add currency preference for price notifications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Airline' AND column_name = 'price_notification_currency') THEN
        ALTER TABLE "Airline" ADD COLUMN "price_notification_currency" TEXT;
    END IF;
END $$;

-- Add active flag for price notifications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Airline' AND column_name = 'price_notification_active') THEN
        ALTER TABLE "Airline" ADD COLUMN "price_notification_active" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;
