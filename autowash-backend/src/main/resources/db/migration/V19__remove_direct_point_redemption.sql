-- Drop points redemption settings from system_settings
ALTER TABLE "system_settings" DROP COLUMN IF EXISTS "vnd_per_point";
ALTER TABLE "system_settings" DROP COLUMN IF EXISTS "min_redemption_points";
ALTER TABLE "system_settings" DROP COLUMN IF EXISTS "max_redemption_points";

-- Drop points applied directly to bookings
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "points_redeemed";
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "points_discount";
