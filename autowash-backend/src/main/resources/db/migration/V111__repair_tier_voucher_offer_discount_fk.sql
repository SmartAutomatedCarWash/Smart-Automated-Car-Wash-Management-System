ALTER TABLE tier_voucher_offers
    ADD COLUMN IF NOT EXISTS discount_id uuid;

UPDATE tier_voucher_offers
SET discount_id = (
    SELECT id
    FROM discounts
    ORDER BY created_at NULLS LAST, id
    LIMIT 1
)
WHERE discount_id IS NULL;

ALTER TABLE tier_voucher_offers
    ALTER COLUMN discount_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tier_voucher_offers_discount_id'
    ) THEN
        ALTER TABLE tier_voucher_offers
            ADD CONSTRAINT fk_tier_voucher_offers_discount_id
            FOREIGN KEY (discount_id) REFERENCES discounts(id);
    END IF;
END $$;
