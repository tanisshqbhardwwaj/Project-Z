-- Migrate legacy builder orgs to contractor
UPDATE "Organization" SET "businessType" = 'CONTRACTOR' WHERE "businessType" = 'BUILDER';

-- Drop builder unit booking tables
DROP TABLE IF EXISTS "UnitBooking";
DROP TABLE IF EXISTS "BuilderUnit";
