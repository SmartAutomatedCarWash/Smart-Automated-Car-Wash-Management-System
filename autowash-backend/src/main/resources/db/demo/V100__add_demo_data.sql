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

END $$;
