CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add demo users (idempotent by email)
INSERT INTO "users" (id, full_name, phone, email, password_hash, role, status) VALUES
(gen_random_uuid(), 'Admin User', '0901234567', 'admin@autowash.com', crypt('Password123@', gen_salt('bf', 10)), 'ADMIN', 'ACTIVE'),
(gen_random_uuid(), 'Staff User', '0901234568', 'staff@autowash.com', crypt('Password123@', gen_salt('bf', 10)), 'STAFF', 'ACTIVE'),
(gen_random_uuid(), 'Customer User', '0901234569', 'customer@autowash.com', crypt('Password123@', gen_salt('bf', 10)), 'CUSTOMER', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

-- Use DO block to handle data that depends on dynamic UUIDs
-- Guard: only insert if customer has no loyalty account yet (prevents duplicate on redeploy)
DO $$
DECLARE
    v_customer_id uuid;
    v_staff_id uuid;
    v_vehicle_id uuid;
    v_loyalty_account_id uuid;
    v_booking_1_id uuid;
    v_booking_2_id uuid;
BEGIN
    SELECT id INTO v_customer_id FROM users WHERE email = 'customer@autowash.com' LIMIT 1;
    SELECT id INTO v_staff_id FROM users WHERE email = 'staff@autowash.com' LIMIT 1;

    -- Skip if already seeded
    IF v_customer_id IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM loyalty_accounts WHERE customer_id = v_customer_id) THEN
        RETURN;
    END IF;

    -- Loyalty Account
    INSERT INTO loyalty_accounts (id, customer_id, current_points, total_earned_points, tier)
    VALUES (gen_random_uuid(), v_customer_id, 150, 150, 'BRONZE')
    RETURNING id INTO v_loyalty_account_id;

    -- Vehicles
    INSERT INTO vehicles (id, customer_id, plate, type, brand, model, vehicle_year, color, is_primary)
    VALUES (gen_random_uuid(), v_customer_id, '30A-999.99', 'CAR', 'Mazda', 'Mazda 3', 2022, 'Red', true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_vehicle_id;

    IF v_vehicle_id IS NULL THEN
        SELECT id INTO v_vehicle_id FROM vehicles WHERE customer_id = v_customer_id AND plate = '30A-999.99' LIMIT 1;
    END IF;

    -- Booking 1: Completed
    INSERT INTO bookings (id, customer_id, vehicle_id, booking_type, package_id, assigned_staff_id, status, scheduled_at, base_amount, final_amount, estimated_duration_minutes)
    VALUES (gen_random_uuid(), v_customer_id, v_vehicle_id, 'PACKAGE', 'PKG05', v_staff_id, 'COMPLETED', CURRENT_TIMESTAMP - INTERVAL '2 days', 219000, 219000, 50)
    RETURNING id INTO v_booking_1_id;

    INSERT INTO payments (booking_id, method, status, amount, paid_at)
    VALUES (v_booking_1_id, 'CASH_AT_COUNTER', 'PAID', 219000, CURRENT_TIMESTAMP - INTERVAL '2 days');

    INSERT INTO wash_sessions (booking_id, assigned_staff_id, status, fee_amount, started_at, completed_at)
    VALUES (v_booking_1_id, v_staff_id, 'COMPLETED', 219000, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '50 minutes');

    INSERT INTO point_transactions (loyalty_account_id, booking_id, type, points, balance_after, reason)
    VALUES (v_loyalty_account_id, v_booking_1_id, 'EARN', 150, 150, 'Earned from Standard Wash');

    -- Booking 2: Pending
    INSERT INTO bookings (id, customer_id, vehicle_id, booking_type, package_id, assigned_staff_id, status, scheduled_at, base_amount, final_amount, estimated_duration_minutes)
    VALUES (gen_random_uuid(), v_customer_id, v_vehicle_id, 'PACKAGE', 'PKG06', v_staff_id, 'PENDING', CURRENT_TIMESTAMP + INTERVAL '1 day', 1950000, 1950000, 270)
    RETURNING id INTO v_booking_2_id;

    INSERT INTO payments (booking_id, method, status, amount)
    VALUES (v_booking_2_id, 'BANK_TRANSFER', 'UNPAID', 1950000);

END $$;
