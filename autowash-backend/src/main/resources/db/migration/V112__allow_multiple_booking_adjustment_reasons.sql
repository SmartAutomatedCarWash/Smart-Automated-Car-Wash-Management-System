ALTER TABLE point_transactions
    DROP CONSTRAINT IF EXISTS uk_point_transactions_booking_type;

DROP INDEX IF EXISTS uk_point_transactions_booking_type;
DROP INDEX IF EXISTS uk_point_transactions_booking_adjust_reason;
DROP INDEX IF EXISTS uk_point_transactions_booking_earn;

CREATE UNIQUE INDEX IF NOT EXISTS uk_point_transactions_booking_earn
    ON point_transactions (booking_id, type)
    WHERE booking_id IS NOT NULL AND type = 'EARN';

CREATE UNIQUE INDEX IF NOT EXISTS uk_point_transactions_booking_adjust_reason
    ON point_transactions (booking_id, type, reason)
    WHERE booking_id IS NOT NULL AND type = 'ADJUST';
