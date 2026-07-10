CREATE UNIQUE INDEX IF NOT EXISTS uq_user_vouchers_user_template
    ON user_vouchers(user_id, voucher_template_id);
