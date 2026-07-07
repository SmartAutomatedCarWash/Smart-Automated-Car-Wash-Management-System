CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add demo users
INSERT INTO "users" (id, full_name, phone, email, password_hash, role, status) VALUES
(gen_random_uuid(), 'Admin User', '0901234567', 'admin@autowash.com', crypt('Password123@', gen_salt('bf', 10)), 'ADMIN', 'ACTIVE'),
(gen_random_uuid(), 'Staff User', '0901234568', 'staff@autowash.com', crypt('Password123@', gen_salt('bf', 10)), 'STAFF', 'ACTIVE'),
(gen_random_uuid(), 'Customer User', '0901234569', 'customer@autowash.com', crypt('Password123@', gen_salt('bf', 10)), 'CUSTOMER', 'ACTIVE');

-- Add demo services
INSERT INTO services (id, name, description, price, duration_minutes)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Exterior Wash', 'Basic exterior wash', 100000, 30),
('11111111-1111-1111-1111-222222222222', 'Interior Vacuum', 'Interior vacuum cleaning', 50000, 20),
('11111111-1111-1111-1111-333333333333', 'Engine Detailing', 'Deep cleaning for engine compartment', 300000, 60);

-- Add demo packages
INSERT INTO packages (id, name, description, base_price, duration_minutes)
VALUES 
('22222222-2222-2222-2222-111111111111', 'Standard Wash', 'Exterior and interior cleaning', 150000, 50),
('22222222-2222-2222-2222-222222222222', 'Premium Detailing', 'Full detailing including engine', 450000, 110);

-- Add package services
INSERT INTO package_services (package_id, option_id, option_name, option_price, option_duration_minutes)
VALUES 
('22222222-2222-2222-2222-111111111111', '11111111-1111-1111-1111-111111111111', 'Exterior Wash', 100000, 30),
('22222222-2222-2222-2222-111111111111', '11111111-1111-1111-1111-222222222222', 'Interior Vacuum', 50000, 20),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Exterior Wash', 100000, 30),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-222222222222', 'Interior Vacuum', 50000, 20),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-333333333333', 'Engine Detailing', 300000, 60);

-- Use DO block to handle data that depends on dynamic UUIDs
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

    -- Loyalty Account
    INSERT INTO loyalty_accounts (id, customer_id, current_points, total_earned_points, tier)
    VALUES (gen_random_uuid(), v_customer_id, 150, 150, 'BRONZE')
    RETURNING id INTO v_loyalty_account_id;

    -- Vehicles
    INSERT INTO vehicles (id, customer_id, plate, type, brand, model, vehicle_year, color, is_primary)
    VALUES (gen_random_uuid(), v_customer_id, '30A-999.99', 'CAR', 'Mazda', 'Mazda 3', 2022, 'Red', true)
    RETURNING id INTO v_vehicle_id;

    -- Booking 1: Completed
    INSERT INTO bookings (id, customer_id, vehicle_id, booking_type, package_id, assigned_staff_id, status, scheduled_at, base_amount, final_amount, estimated_duration_minutes)
    VALUES (gen_random_uuid(), v_customer_id, v_vehicle_id, 'PACKAGE', '22222222-2222-2222-2222-111111111111', v_staff_id, 'COMPLETED', CURRENT_TIMESTAMP - INTERVAL '2 days', 150000, 150000, 50)
    RETURNING id INTO v_booking_1_id;

    INSERT INTO payments (booking_id, method, status, amount, paid_at)
    VALUES (v_booking_1_id, 'CASH_AT_COUNTER', 'PAID', 150000, CURRENT_TIMESTAMP - INTERVAL '2 days');

    INSERT INTO wash_sessions (booking_id, assigned_staff_id, status, fee_amount, started_at, completed_at)
    VALUES (v_booking_1_id, v_staff_id, 'COMPLETED', 150000, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '50 minutes');

    INSERT INTO point_transactions (loyalty_account_id, booking_id, type, points, balance_after, reason)
    VALUES (v_loyalty_account_id, v_booking_1_id, 'EARN', 150, 150, 'Earned from Standard Wash');

    -- Booking 2: Pending
    INSERT INTO bookings (id, customer_id, vehicle_id, booking_type, package_id, assigned_staff_id, status, scheduled_at, base_amount, final_amount, estimated_duration_minutes)
    VALUES (gen_random_uuid(), v_customer_id, v_vehicle_id, 'PACKAGE', '22222222-2222-2222-2222-222222222222', v_staff_id, 'PENDING', CURRENT_TIMESTAMP + INTERVAL '1 day', 450000, 450000, 110)
    RETURNING id INTO v_booking_2_id;

    INSERT INTO payments (booking_id, method, status, amount)
    VALUES (v_booking_2_id, 'BANK_TRANSFER', 'UNPAID', 450000);

END $$;
