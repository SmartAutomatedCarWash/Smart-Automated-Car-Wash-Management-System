ALTER TABLE users
    ADD COLUMN IF NOT EXISTS booking_suspended_until TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_booking_suspended_until
    ON users (booking_suspended_until);
