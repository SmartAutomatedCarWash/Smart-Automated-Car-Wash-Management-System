-- V29__seed_package_reviews.sql

-- V27__seed_package_reviews.sql (Standard SQL)

-- Ensure the first customer has a vehicle
INSERT INTO vehicles (id, customer_id, brand, model, plate, type, vehicle_year)
SELECT gen_random_uuid(), id, 'Honda', 'Civic', '29A-12345', 'SEDAN', 2022
FROM users WHERE role = 'CUSTOMER'
  AND NOT EXISTS (SELECT 1 FROM vehicles WHERE customer_id = users.id)
LIMIT 1;

-- Create 3 bookings for each active package for the first customer
WITH nums(n) AS (
    SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
),
customer_vehicle AS (
    SELECT u.id AS customer_id, v.id AS vehicle_id
    FROM users u
    JOIN vehicles v ON v.customer_id = u.id
    WHERE u.role = 'CUSTOMER'
    LIMIT 1
)
INSERT INTO bookings (id, customer_id, vehicle_id, booking_type, package_id, status, scheduled_at)
SELECT gen_random_uuid(), cv.customer_id, cv.vehicle_id, 'PACKAGE', p.id, 'COMPLETED', CURRENT_TIMESTAMP
FROM packages p
CROSS JOIN nums
CROSS JOIN customer_vehicle cv
WHERE p.status = 'ACTIVE';

-- Insert reviews for those new completed bookings
INSERT INTO reviews (id, customer_id, booking_id, rating, comment, is_featured)
SELECT gen_random_uuid(), b.customer_id, b.id, 5, 'Tuyệt vời, dịch vụ tốt!', true
FROM bookings b
WHERE b.status = 'COMPLETED'
  AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id);
