ALTER TABLE customer_combos
    DROP CONSTRAINT IF EXISTS customer_combos_status_check;

ALTER TABLE customer_combos
    ADD CONSTRAINT customer_combos_status_check
    CHECK (status IN ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'USED_UP', 'CANCELLED'));
