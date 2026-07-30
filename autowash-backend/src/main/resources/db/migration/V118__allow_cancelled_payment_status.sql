ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

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
