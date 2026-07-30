ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;

ALTER TABLE payments
    ADD CONSTRAINT payments_method_check
    CHECK (method IN ('CASH_AT_COUNTER', 'BANK_TRANSFER', 'E_WALLET', 'OWNED_COMBO'));
