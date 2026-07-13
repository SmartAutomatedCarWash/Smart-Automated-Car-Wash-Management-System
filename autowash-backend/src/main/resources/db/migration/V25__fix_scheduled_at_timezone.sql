-- V25: Fix scheduled_at timezone offset.
-- Bookings were stored as "local time treated as UTC" instead of "local time in Asia/Ho_Chi_Minh".
-- Subtracts 7 hours (25200 seconds) from PENDING/CONFIRMED bookings created with
-- the wrong ZoneOffset.UTC that were scheduled in the near future.
-- DATEADD is H2-compatible; PostgreSQL also accepts it in MODE=PostgreSQL.

UPDATE bookings
SET scheduled_at = DATEADD('HOUR', -7, scheduled_at)
WHERE status IN ('PENDING', 'CONFIRMED')
  AND scheduled_at > CURRENT_TIMESTAMP
  AND scheduled_at < DATEADD('DAY', 90, CURRENT_TIMESTAMP);
