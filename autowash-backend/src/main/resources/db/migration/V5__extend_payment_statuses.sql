DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT con.conname
    INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'payments'
      AND nsp.nspname = current_schema()
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

ALTER TABLE payments
    ADD CONSTRAINT payments_status_check
    CHECK (status IN (
        'UNPAID',
        'PENDING',
        'PENDING_PAYMENT',
        'PAID',
        'FAILED',
        'CANCELLED',
        'REFUND_PENDING',
        'PARTIALLY_REFUNDED',
        'REFUND_FAILED',
        'REFUNDED'
    ));
