-- Quick seed with correct column names matching actual schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert demo users
INSERT INTO users (id, full_name, phone, email, password_hash, role, status, avatar_url, date_of_birth)
VALUES
('00000000-0000-0000-0000-000000000001', 'System Admin', '0900000000', 'admin@autowash.com', crypt('Password123@', gen_salt('bf', 8)), 'ADMIN', 'ACTIVE', NULL, NULL),
('f23a1a29-b551-4021-af92-62e1906f2458', 'Manager Demo', '0960000001', 'manager@autowash.com', crypt('Password123@', gen_salt('bf', 8)), 'MANAGER', 'ACTIVE', NULL, NULL),
('ff000001-0000-0000-0000-000000000001', 'Staff Demo', '0960000002', 'staff@autowash.com', crypt('Password123@', gen_salt('bf', 8)), 'STAFF', 'ACTIVE', NULL, NULL),
('dd000001-0000-0000-0000-000000000000', 'Nguyen Minh Tuan', '0912345601', 'nguyen.minh.tuan@autowash.vn', crypt('Password123@', gen_salt('bf', 8)), 'STAFF', 'ACTIVE', NULL, NULL),
('dd000002-0000-0000-0000-000000000000', 'Tran Thi Huong', '0923456702', 'tran.thi.huong@autowash.vn', crypt('Password123@', gen_salt('bf', 8)), 'STAFF', 'ACTIVE', NULL, NULL),
('ff000002-0000-0000-0000-000000000001', 'Customer Demo', '0960000003', 'customer@autowash.com', crypt('Password123@', gen_salt('bf', 8)), 'CUSTOMER', 'ACTIVE', NULL, '1992-01-15'),
('ee000001-0000-0000-0000-000000000000', 'Bui Thi Mai', '0901111201', 'bui.thi.mai.88@gmail.com', crypt('Password123@', gen_salt('bf', 8)), 'CUSTOMER', 'ACTIVE', NULL, '1988-03-12'),
('ee000002-0000-0000-0000-000000000000', 'Hoang Van Dung', '0902222302', 'hoang.van.dung@gmail.com', crypt('Password123@', gen_salt('bf', 8)), 'CUSTOMER', 'ACTIVE', NULL, '1990-07-25')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_preferences (user_id)
SELECT id FROM users WHERE id IN (
    '00000000-0000-0000-0000-000000000001',
    'f23a1a29-b551-4021-af92-62e1906f2458',
    'ff000001-0000-0000-0000-000000000001',
    'dd000001-0000-0000-0000-000000000000',
    'dd000002-0000-0000-0000-000000000000',
    'ff000002-0000-0000-0000-000000000001',
    'ee000001-0000-0000-0000-000000000000',
    'ee000002-0000-0000-0000-000000000000'
)
ON CONFLICT (user_id) DO NOTHING;

-- Tier configs
INSERT INTO tier_configs (tier, display_name, min_points, point_multiplier, priority_score, rank_order, system_tier, active, image_url)
VALUES
('BRONZE', 'Bronze', 0, 1.00, 10, 1, true, true, NULL),
('SILVER', 'Silver', 500, 1.10, 20, 2, true, true, NULL),
('GOLD', 'Gold', 1500, 1.25, 30, 3, true, true, NULL),
('PLATINUM', 'Platinum', 3000, 1.50, 35, 4, true, true, NULL),
('DIAMOND', 'Diamond', 6000, 2.00, 40, 5, true, true, NULL)
ON CONFLICT (tier) DO NOTHING;

-- Loyalty accounts (correct columns: customer_id, current_points, total_earned_points)
INSERT INTO loyalty_accounts (customer_id, current_points, total_earned_points, tier)
VALUES
('00000000-0000-0000-0000-000000000001', 0, 0, 'BRONZE'),
('f23a1a29-b551-4021-af92-62e1906f2458', 0, 0, 'BRONZE'),
('ff000001-0000-0000-0000-000000000001', 0, 0, 'BRONZE'),
('ff000002-0000-0000-0000-000000000001', 1500, 1500, 'GOLD'),
('ee000001-0000-0000-0000-000000000000', 200, 200, 'BRONZE'),
('ee000002-0000-0000-0000-000000000000', 750, 750, 'SILVER')
ON CONFLICT (customer_id) DO NOTHING;

-- Services (correct columns: duration_minutes, no category column)
INSERT INTO services (id, name, description, price, duration_minutes, status)
VALUES
('10000001-0000-0000-0000-000000000001', 'Rửa Xe Cơ Bản', 'Rửa ngoài thân xe nhanh chóng', 80000, 30, 'ACTIVE'),
('10000002-0000-0000-0000-000000000002', 'Rửa Xe Tiêu Chuẩn', 'Rửa trong và ngoài tiêu chuẩn', 150000, 60, 'ACTIVE'),
('10000003-0000-0000-0000-000000000003', 'Rửa Xe Cao Cấp', 'Đánh bóng và vệ sinh toàn diện', 280000, 90, 'ACTIVE'),
('10000004-0000-0000-0000-000000000004', 'Vệ Sinh Nội Thất', 'Làm sạch nội thất chuyên sâu', 200000, 60, 'ACTIVE'),
('10000005-0000-0000-0000-000000000005', 'Vệ Sinh Động Cơ', 'Làm sạch khoang máy an toàn', 180000, 45, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- System settings (single row with id=1)
INSERT INTO system_settings (id, operating_start_time, operating_end_time, max_advance_booking_days,
    no_show_grace_minutes, currency, earn_points_unit_amount, max_bookings_per_slot,
    max_bookings_per_time_slot, redemption_voucher_expiration_days)
VALUES (1, '07:00', '20:00', 14, 15, 'VND', 10000, 5, 5, 30)
ON CONFLICT (id) DO UPDATE SET
    operating_start_time = EXCLUDED.operating_start_time,
    operating_end_time = EXCLUDED.operating_end_time;

SELECT 'Seed complete. Users: ' || (SELECT COUNT(*) FROM users) ||
       ', Services: ' || (SELECT COUNT(*) FROM services) ||
       ', Loyalty: ' || (SELECT COUNT(*) FROM loyalty_accounts) AS result;
