-- Alter image_url to TEXT to support multiple comma-separated URLs
ALTER TABLE "services" ALTER COLUMN "image_url" TYPE TEXT;
ALTER TABLE "packages" ALTER COLUMN "image_url" TYPE TEXT;
ALTER TABLE "combos" ALTER COLUMN "image_url" TYPE TEXT;
