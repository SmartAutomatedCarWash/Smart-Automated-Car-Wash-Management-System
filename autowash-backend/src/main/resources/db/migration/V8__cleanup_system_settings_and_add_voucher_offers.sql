-- ================================================================
-- V8: Cleanup System Settings and Add Tier Voucher Offers
-- ================================================================

-- ----------------------------------------------------------------
-- STEP 1: Drop legacy columns from system_settings
-- ----------------------------------------------------------------
ALTER TABLE system_settings DROP COLUMN IF EXISTS silver_threshold;
ALTER TABLE system_settings DROP COLUMN IF EXISTS gold_threshold;
ALTER TABLE system_settings DROP COLUMN IF EXISTS platinum_threshold;
ALTER TABLE system_settings DROP COLUMN IF EXISTS silver_multiplier;
ALTER TABLE system_settings DROP COLUMN IF EXISTS gold_multiplier;
ALTER TABLE system_settings DROP COLUMN IF EXISTS platinum_multiplier;

-- ----------------------------------------------------------------
-- STEP 2: Create tier_voucher_offers table
-- ----------------------------------------------------------------
CREATE TABLE tier_voucher_offers (
    id              VARCHAR(50)     PRIMARY KEY,
    title           VARCHAR(100)    NOT NULL,
    min_tier        VARCHAR(20)     NOT NULL 
                    CHECK (min_tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')),
    points_cost     INT             NOT NULL CHECK (points_cost > 0),
    voucher_value   INT             NOT NULL CHECK (voucher_value > 0),
    accent          VARCHAR(20)     NOT NULL,
    badge           VARCHAR(20)     NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- STEP 3: Seed default tier voucher offers
-- ----------------------------------------------------------------
INSERT INTO tier_voucher_offers (id, title, min_tier, points_cost, voucher_value, accent, badge) VALUES
    ('bronze-50',    'Quick Clean Voucher',    'BRONZE',   50,  50000,  'sky',     'Bronze'),
    ('silver-100',   'Interior Care Voucher',  'SILVER',  100, 100000,  'violet',  'Silver'),
    ('gold-150',     'Premium Wash Voucher',   'GOLD',    150, 150000,  'amber',   'Gold'),
    ('platinum-200', 'Full Detail Voucher',    'PLATINUM',200, 200000,  'rose',    'Platinum'),
    ('diamond-250',  'Diamond Care Voucher',   'DIAMOND', 250, 250000,  'fuchsia', 'Diamond');
