-- V224: Apply DDL from V26-V29 that were not applied due to version ordering
-- These migrations came from the dev branch merge and contain schema changes

-- ── V26: Business rules fields ────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS booking_suspended_until TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_users_booking_suspended_until ON users (booking_suspended_until);
ALTER TABLE wash_sessions ADD COLUMN IF NOT EXISTS cancel_fault_type VARCHAR(20);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- ── V27: Notification campaigns ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_campaigns (
    id UUID PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    target_audience VARCHAR(50) NOT NULL,
    target_details TEXT,
    status VARCHAR(50) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    success_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES notification_campaigns(id) ON DELETE SET NULL;

-- ── V28: Discount on promotions ───────────────────────────────────────────────
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'NONE';
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS discount_value BIGINT DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promotion_discount BIGINT DEFAULT 0;

-- ── V29: Booking confirmation email ──────────────────────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_email VARCHAR(255);
UPDATE bookings
SET confirmation_email = (
    SELECT u.email FROM users u WHERE u.id = bookings.customer_id
)
WHERE bookings.confirmation_email IS NULL;
