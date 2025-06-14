   -- Manually created migration to add ValveTestType enum

   -- Create the ValveTestType enum if it does not exist
   DO $$
   BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ValveTestType') THEN
           CREATE TYPE "public"."ValveTestType" AS ENUM ('HECPV', 'ILPCV');
       END IF;
   END$$;