-- ================================================================
-- V2: Migrate Loyalty Tier (MEMBER → BRONZE) + add DIAMOND + tier_configs table
-- ================================================================

-- ----------------------------------------------------------------
-- STEP 1: Drop old CHECK constraints
-- ----------------------------------------------------------------
ALTER TABLE loyalty_accounts DROP CONSTRAINT IF EXISTS loyalty_accounts_tier_check;
ALTER TABLE tier_histories DROP CONSTRAINT IF EXISTS tier_histories_new_tier_check;
ALTER TABLE voucher_tiers DROP CONSTRAINT IF EXISTS voucher_tiers_tier_check;
ALTER TABLE promotion_tiers DROP CONSTRAINT IF EXISTS promotion_tiers_tier_check;

-- ----------------------------------------------------------------
-- STEP 2: Migrate data MEMBER -> BRONZE trên tất cả bảng
-- ----------------------------------------------------------------
UPDATE loyalty_accounts  SET tier     = 'BRONZE' WHERE tier     = 'MEMBER';
UPDATE tier_histories    SET new_tier = 'BRONZE' WHERE new_tier = 'MEMBER';
UPDATE tier_histories    SET old_tier = 'BRONZE' WHERE old_tier = 'MEMBER';
UPDATE voucher_tiers     SET tier     = 'BRONZE' WHERE tier     = 'MEMBER';
UPDATE promotion_tiers   SET tier     = 'BRONZE' WHERE tier     = 'MEMBER';

-- ----------------------------------------------------------------
-- STEP 3: Thêm CHECK constraints mới — loyalty_accounts
-- ----------------------------------------------------------------
ALTER TABLE loyalty_accounts ADD CONSTRAINT loyalty_accounts_tier_check
    CHECK (tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'));

-- Đổi DEFAULT value của column (tránh lỗi khi INSERT user mới sau migration)
ALTER TABLE loyalty_accounts ALTER COLUMN tier SET DEFAULT 'BRONZE';

-- ----------------------------------------------------------------
-- STEP 4: Thêm CHECK constraints mới — tier_histories
-- ----------------------------------------------------------------
ALTER TABLE tier_histories ADD CONSTRAINT tier_histories_new_tier_check
    CHECK (new_tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'));

-- ----------------------------------------------------------------
-- STEP 5: Thêm CHECK constraints mới — voucher_tiers
-- ----------------------------------------------------------------
ALTER TABLE voucher_tiers ADD CONSTRAINT voucher_tiers_tier_check
    CHECK (tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'));

-- ----------------------------------------------------------------
-- STEP 6: Thêm CHECK constraints mới — promotion_tiers
-- ----------------------------------------------------------------
ALTER TABLE promotion_tiers ADD CONSTRAINT promotion_tiers_tier_check
    CHECK (tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'));

-- ----------------------------------------------------------------
-- STEP 6: Tạo bảng tier_configs
-- ----------------------------------------------------------------
CREATE TABLE tier_configs (
    tier                VARCHAR(20)     PRIMARY KEY
                        CHECK (tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')),
    min_points          INT             NOT NULL DEFAULT 0,
    point_multiplier    NUMERIC(4, 2)   NOT NULL DEFAULT 1.0,
    has_priority_queue  BOOLEAN         NOT NULL DEFAULT false,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (min_points >= 0),
    CHECK (point_multiplier > 0)
);

INSERT INTO tier_configs (tier, min_points, point_multiplier, has_priority_queue) VALUES
    ('BRONZE',   0,      1.0, false),
    ('SILVER',   500,    1.2, false),
    ('GOLD',     1500,   1.5, true),
    ('PLATINUM', 4000,   2.0, true),
    ('DIAMOND',  10000,  2.5, true);
