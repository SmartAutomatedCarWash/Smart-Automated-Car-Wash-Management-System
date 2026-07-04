ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS max_bookings_per_time_slot INT NOT NULL DEFAULT 3;

UPDATE system_settings
SET max_bookings_per_time_slot = max_bookings_per_slot
WHERE max_bookings_per_slot IS NOT NULL;
