-- Remove Standard Wash package and its related data
-- Package ID: 22222222-2222-2222-2222-111111111111

-- Nullify references in bookings first (to avoid FK constraint violation)
UPDATE bookings SET package_id = NULL WHERE package_id = '22222222-2222-2222-2222-111111111111';

-- Remove package services (options)
DELETE FROM package_services WHERE package_id = '22222222-2222-2222-2222-111111111111';

-- Remove the package itself
DELETE FROM packages WHERE id = '22222222-2222-2222-2222-111111111111';
