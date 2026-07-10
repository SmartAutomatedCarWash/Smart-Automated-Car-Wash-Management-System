ALTER TABLE user_vouchers DROP CONSTRAINT IF EXISTS chk_user_voucher_status;

ALTER TABLE user_vouchers
    ADD CONSTRAINT chk_user_voucher_status
        CHECK (status IN ('AVAILABLE','USED','EXPIRED','FORFEITED'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_vouchers_user_template
    ON user_vouchers(user_id, voucher_template_id);
