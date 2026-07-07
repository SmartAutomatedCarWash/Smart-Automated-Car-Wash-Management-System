CREATE TABLE violation_records (
    id          UUID DEFAULT (gen_random_uuid()) PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id  UUID NOT NULL REFERENCES bookings(id),
    type        VARCHAR(30) NOT NULL CHECK (type IN ('NO_SHOW', 'LATE_CANCEL')),
    penalty_points INT NOT NULL DEFAULT 0,
    note        VARCHAR(500),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_violation_records_customer ON violation_records(customer_id, type, created_at);
