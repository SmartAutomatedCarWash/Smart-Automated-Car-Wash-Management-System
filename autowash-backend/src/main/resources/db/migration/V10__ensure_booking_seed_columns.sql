CREATE TABLE IF NOT EXISTS bookings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES users(id),
    vehicle_id uuid NOT NULL REFERENCES vehicles(id),
    assigned_staff_id uuid REFERENCES users(id),
    scheduled_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    status varchar(30) NOT NULL DEFAULT 'PENDING',
    confirmation_email varchar(255),
    note varchar(1000),
    cancel_reason varchar(500),
    reminder_sent boolean NOT NULL DEFAULT false,
    created_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES vehicles(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_staff_id uuid REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS scheduled_at timestamp(6) with time zone NOT NULL DEFAULT now();
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status varchar(30) NOT NULL DEFAULT 'PENDING';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_email varchar(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS note varchar(1000);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason varchar(500);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at timestamp(6) with time zone NOT NULL DEFAULT now();
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at timestamp(6) with time zone NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON bookings (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_staff_id ON bookings (assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON bookings (scheduled_at);
