ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS preferred_staff_ids varchar(500);

CREATE TABLE IF NOT EXISTS booking_staff_assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    staff_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sort_order integer NOT NULL,
    assigned_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT uk_booking_staff_assignments_booking_staff UNIQUE (booking_id, staff_id),
    CONSTRAINT uk_booking_staff_assignments_booking_order UNIQUE (booking_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_booking_staff_assignments_booking_id ON booking_staff_assignments (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_staff_assignments_staff_id ON booking_staff_assignments (staff_id);

CREATE TABLE IF NOT EXISTS wash_session_staff_assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES wash_sessions(id) ON DELETE CASCADE,
    staff_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sort_order integer NOT NULL,
    assigned_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT uk_wash_session_staff_assignments_session_staff UNIQUE (session_id, staff_id),
    CONSTRAINT uk_wash_session_staff_assignments_session_order UNIQUE (session_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_wash_session_staff_assignments_session_id ON wash_session_staff_assignments (session_id);
CREATE INDEX IF NOT EXISTS idx_wash_session_staff_assignments_staff_id ON wash_session_staff_assignments (staff_id);
