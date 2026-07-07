CREATE TABLE slot_holds (
    id          UUID DEFAULT (gen_random_uuid()) PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_time   TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (customer_id, slot_time)
);
CREATE INDEX idx_slot_holds_slot_time ON slot_holds(slot_time);
CREATE INDEX idx_slot_holds_expires_at ON slot_holds(expires_at);
