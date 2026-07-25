ALTER TABLE user_discounts
    ADD COLUMN IF NOT EXISTS voucher_code varchar(50);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_discounts_voucher_code
    ON user_discounts (voucher_code)
    WHERE voucher_code IS NOT NULL;
