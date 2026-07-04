ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS max_bookings_per_slot INT NOT NULL DEFAULT 3;

ALTER TABLE loyalty_accounts DROP CONSTRAINT IF EXISTS loyalty_accounts_tier_check;
ALTER TABLE tier_histories DROP CONSTRAINT IF EXISTS tier_histories_new_tier_check;
ALTER TABLE voucher_tiers DROP CONSTRAINT IF EXISTS voucher_tiers_tier_check;
ALTER TABLE promotion_tiers DROP CONSTRAINT IF EXISTS promotion_tiers_tier_check;
ALTER TABLE tier_configs DROP CONSTRAINT IF EXISTS tier_configs_tier_check;
ALTER TABLE tier_voucher_offers DROP CONSTRAINT IF EXISTS tier_voucher_offers_min_tier_check;

ALTER TABLE loyalty_accounts ALTER COLUMN tier TYPE VARCHAR(50);
ALTER TABLE tier_histories ALTER COLUMN old_tier TYPE VARCHAR(50);
ALTER TABLE tier_histories ALTER COLUMN new_tier TYPE VARCHAR(50);
ALTER TABLE voucher_tiers ALTER COLUMN tier TYPE VARCHAR(50);
ALTER TABLE promotion_tiers ALTER COLUMN tier TYPE VARCHAR(50);
ALTER TABLE tier_configs ALTER COLUMN tier TYPE VARCHAR(50);
ALTER TABLE tier_voucher_offers ALTER COLUMN min_tier TYPE VARCHAR(50);

ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS rank_order INT;
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS system_tier BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

UPDATE tier_configs SET display_name = 'Bronze', rank_order = 0 WHERE tier = 'BRONZE';
UPDATE tier_configs SET display_name = 'Silver', rank_order = 1 WHERE tier = 'SILVER';
UPDATE tier_configs SET display_name = 'Gold', rank_order = 2 WHERE tier = 'GOLD';
UPDATE tier_configs SET display_name = 'Platinum', rank_order = 3 WHERE tier = 'PLATINUM';
UPDATE tier_configs SET display_name = 'Diamond', rank_order = 4 WHERE tier = 'DIAMOND';

UPDATE tier_configs SET display_name = tier WHERE display_name IS NULL;
UPDATE tier_configs SET rank_order = min_points WHERE rank_order IS NULL;

ALTER TABLE tier_configs ALTER COLUMN display_name SET NOT NULL;
ALTER TABLE tier_configs ALTER COLUMN rank_order SET NOT NULL;
ALTER TABLE tier_configs ADD CONSTRAINT uq_tier_configs_rank_order UNIQUE (rank_order);
