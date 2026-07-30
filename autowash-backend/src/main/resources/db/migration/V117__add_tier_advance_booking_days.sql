ALTER TABLE tier_configs
    ADD COLUMN IF NOT EXISTS advance_booking_days integer NOT NULL DEFAULT 30;

UPDATE tier_configs
SET advance_booking_days = CASE tier
    WHEN 'BRONZE' THEN 6
    WHEN 'SILVER' THEN 12
    WHEN 'GOLD' THEN 18
    WHEN 'PLATINUM' THEN 24
    WHEN 'DIAMOND' THEN 30
    ELSE LEAST(30, GREATEST(1, rank_order * 6))
END;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_tier_advance_booking_days_positive'
    ) THEN
        ALTER TABLE tier_configs
            ADD CONSTRAINT chk_tier_advance_booking_days_positive CHECK (advance_booking_days >= 1);
    END IF;
END $$;
