-- Adds new columns for Business Rules updates (BR-71, BR-97, BR-186)

-- BR-71: Add booking suspension tracking to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS booking_suspended_until TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_users_booking_suspended_until ON users (booking_suspended_until);

-- BR-97: Add fault attribution for cancelled wash sessions
ALTER TABLE "wash_sessions" ADD COLUMN IF NOT EXISTS "cancel_fault_type" VARCHAR(20);

-- BR-186: Add reminder sent flag for bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;
