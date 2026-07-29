ALTER TABLE customer_combo_usages
    ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'CONSUMED';

ALTER TABLE customer_combo_usages
    DROP CONSTRAINT IF EXISTS customer_combo_usages_status_check;

ALTER TABLE customer_combo_usages
    ADD CONSTRAINT customer_combo_usages_status_check
    CHECK (status IN ('RESERVED', 'CONSUMED', 'RELEASED', 'FORFEITED'));
