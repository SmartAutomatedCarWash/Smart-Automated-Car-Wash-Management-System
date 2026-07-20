DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'bookings'
          AND column_name = 'booking_type'
    ) THEN
        ALTER TABLE bookings
            ALTER COLUMN booking_type SET DEFAULT 'PACKAGE';

        UPDATE bookings
        SET booking_type = 'PACKAGE'
        WHERE booking_type IS NULL;
    END IF;
END $$;
