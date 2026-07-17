-- Add demo users (idempotent by email)
INSERT INTO "users" (id, full_name, phone, email, password_hash, role, status) VALUES
('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Admin User', '0901234567', 'admin@autowash.com', '$2b$12$0rC9hApQ6VhjWR.5pcH5.uHALN3FYhVARFevjQ1/zR4ny25HgVxvC', 'ADMIN', 'ACTIVE'),
('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Staff User', '0901234568', 'staff@autowash.com', '$2b$12$0rC9hApQ6VhjWR.5pcH5.uHALN3FYhVARFevjQ1/zR4ny25HgVxvC', 'STAFF', 'ACTIVE'),
('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Customer User', '0901234569', 'customer@autowash.com', '$2b$12$0rC9hApQ6VhjWR.5pcH5.uHALN3FYhVARFevjQ1/zR4ny25HgVxvC', 'CUSTOMER', 'ACTIVE')
ON CONFLICT DO NOTHING;

-- Loyalty Account
INSERT INTO loyalty_accounts (id, customer_id, current_points, total_earned_points, tier)
VALUES ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 150, 150, 'BRONZE')
ON CONFLICT DO NOTHING;

-- Vehicles
INSERT INTO vehicles (id, customer_id, plate, type, brand, model, vehicle_year, color, is_primary)
VALUES ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', '30A-999.99', 'CAR', 'Mazda', 'Mazda 3', 2022, 'Red', true)
ON CONFLICT DO NOTHING;
