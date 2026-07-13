ALTER TABLE user_vouchers DROP CONSTRAINT chk_user_voucher_status;

ALTER TABLE user_vouchers
    ADD CONSTRAINT chk_user_voucher_status
        CHECK (status IN ('AVAILABLE','USED','EXPIRED','FORFEITED'));
