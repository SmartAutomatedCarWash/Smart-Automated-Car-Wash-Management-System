-- V100: Consolidated demo seed data for V2 squashed schema.
-- Login password for all demo users: Password123@

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (id, full_name, phone, email, password_hash, role, status, avatar_url, date_of_birth)
VALUES
('00000000-0000-0000-0000-000000000001', 'System Admin', '0900000000', 'admin@autowash.com', crypt('Password123@', gen_salt('bf', 10)), 'ADMIN', 'ACTIVE', NULL, NULL),
('f23a1a29-b551-4021-af92-62e1906f2458', 'Manager Demo', '0960000001', 'manager@autowash.com', crypt('Password123@', gen_salt('bf', 10)), 'MANAGER', 'ACTIVE', NULL, NULL),
('ff000001-0000-0000-0000-000000000001', 'Staff Demo', '0960000002', 'staff@autowash.com', crypt('Password123@', gen_salt('bf', 10)), 'STAFF', 'ACTIVE', NULL, NULL),
('dd000001-0000-0000-0000-000000000000', 'Nguyen Minh Tuan', '0912345601', 'nguyen.minh.tuan@autowash.vn', crypt('Password123@', gen_salt('bf', 10)), 'STAFF', 'ACTIVE', NULL, NULL),
('dd000002-0000-0000-0000-000000000000', 'Tran Thi Huong', '0923456702', 'tran.thi.huong@autowash.vn', crypt('Password123@', gen_salt('bf', 10)), 'STAFF', 'ACTIVE', NULL, NULL),
('dd000003-0000-0000-0000-000000000000', 'Le Van Hai', '0934567803', 'le.van.hai@autowash.vn', crypt('Password123@', gen_salt('bf', 10)), 'STAFF', 'ACTIVE', NULL, NULL),
('dd000004-0000-0000-0000-000000000000', 'Pham Thi Lan', '0945678904', 'pham.thi.lan@autowash.vn', crypt('Password123@', gen_salt('bf', 10)), 'STAFF', 'ACTIVE', NULL, NULL),
('dd000005-0000-0000-0000-000000000000', 'Do Quang Nam', '0956789005', 'do.quang.nam@autowash.vn', crypt('Password123@', gen_salt('bf', 10)), 'STAFF', 'ACTIVE', NULL, NULL),
('ff000002-0000-0000-0000-000000000001', 'Customer Demo', '0960000003', 'customer@autowash.com', crypt('Password123@', gen_salt('bf', 10)), 'CUSTOMER', 'ACTIVE', NULL, '1992-01-15'),
('ee000001-0000-0000-0000-000000000000', 'Bui Thi Mai', '0901111201', 'bui.thi.mai.88@gmail.com', crypt('Password123@', gen_salt('bf', 10)), 'CUSTOMER', 'ACTIVE', NULL, '1988-03-12'),
('ee000002-0000-0000-0000-000000000000', 'Hoang Van Dung', '0902222302', 'hoang.van.dung@gmail.com', crypt('Password123@', gen_salt('bf', 10)), 'CUSTOMER', 'ACTIVE', NULL, '1990-07-25'),
('ee000003-0000-0000-0000-000000000000', 'Nguyen Thi Ha', '0903333403', 'nguyen.thi.ha.95@gmail.com', crypt('Password123@', gen_salt('bf', 10)), 'CUSTOMER', 'ACTIVE', NULL, '1995-11-08'),
('ee000004-0000-0000-0000-000000000000', 'Vu Minh Khoa', '0904444504', 'vu.minh.khoa@yahoo.com', crypt('Password123@', gen_salt('bf', 10)), 'CUSTOMER', 'ACTIVE', NULL, '1987-02-14')
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_preferences (user_id)
SELECT id FROM users
WHERE id IN (
    '00000000-0000-0000-0000-000000000001',
    'f23a1a29-b551-4021-af92-62e1906f2458',
    'ff000001-0000-0000-0000-000000000001',
    'dd000001-0000-0000-0000-000000000000',
    'dd000002-0000-0000-0000-000000000000',
    'dd000003-0000-0000-0000-000000000000',
    'dd000004-0000-0000-0000-000000000000',
    'dd000005-0000-0000-0000-000000000000',
    'ff000002-0000-0000-0000-000000000001',
    'ee000001-0000-0000-0000-000000000000',
    'ee000002-0000-0000-0000-000000000000',
    'ee000003-0000-0000-0000-000000000000',
    'ee000004-0000-0000-0000-000000000000'
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO tier_configs (tier, display_name, min_points, point_multiplier, priority_score, rank_order, system_tier, active, image_url)
VALUES
('BRONZE', 'Bronze', 0, 1.00, 10, 1, true, true, NULL),
('SILVER', 'Silver', 500, 1.10, 20, 2, true, true, NULL),
('GOLD', 'Gold', 1500, 1.25, 30, 3, true, true, NULL),
('PLATINUM', 'Platinum', 3000, 1.50, 35, 4, true, true, NULL),
('DIAMOND', 'Diamond', 6000, 2.00, 40, 5, true, true, NULL)
ON CONFLICT (tier) DO NOTHING;

INSERT INTO loyalty_accounts (id, customer_id, tier, current_points, total_earned_points)
SELECT seed.id, users.id, seed.tier, seed.current_points, seed.total_earned_points
FROM (
    VALUES
    ('1a000001-0000-0000-0000-000000000000'::uuid, 'bui.thi.mai.88@gmail.com', 'DIAMOND', 7200, 9800),
    ('1a000002-0000-0000-0000-000000000000'::uuid, 'hoang.van.dung@gmail.com', 'GOLD', 1850, 2400),
    ('1a000003-0000-0000-0000-000000000000'::uuid, 'nguyen.thi.ha.95@gmail.com', 'SILVER', 820, 960),
    ('1a000004-0000-0000-0000-000000000000'::uuid, 'vu.minh.khoa@yahoo.com', 'BRONZE', 120, 120),
    ('1a000005-0000-0000-0000-000000000000'::uuid, 'customer@autowash.com', 'BRONZE', 0, 0)
) AS seed(id, email, tier, current_points, total_earned_points)
JOIN users ON users.email = seed.email
ON CONFLICT (customer_id) DO NOTHING;

INSERT INTO services (id, name, description, price, duration_minutes, status, image_url)
VALUES
('cc000001-0000-0000-0000-000000000001', 'Exterior foam wash', 'Foam wash and rinse exterior body.', 89000, 20, 'ACTIVE', NULL),
('cc000001-0000-0000-0000-000000000002', 'Interior vacuum', 'Cabin vacuum and dashboard wipe.', 79000, 15, 'ACTIVE', NULL),
('cc000001-0000-0000-0000-000000000003', 'Tire shine', 'Clean and shine all tires.', 49000, 10, 'ACTIVE', NULL),
('cc000001-0000-0000-0000-000000000004', 'Wax protection', 'Quick wax protection layer.', 159000, 25, 'ACTIVE', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO packages (id, name, description, base_price, duration_minutes, category, status, image_url)
VALUES
('bb000002-0000-0000-0000-000000000001', 'Express Wash', 'Fast exterior wash for daily use.', 189000, 40, 'Standard', 'ACTIVE', NULL),
('bb000002-0000-0000-0000-000000000002', 'Premium Care', 'Exterior and interior care package.', 329000, 65, 'Premium', 'ACTIVE', NULL),
('bb000002-0000-0000-0000-000000000003', 'Ultimate Detail', 'Full care package with wax protection.', 499000, 95, 'Detailing', 'ACTIVE', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO package_services (package_id, option_id, option_name, option_description, option_price, option_duration_minutes, quantity, sort_order)
VALUES
('bb000002-0000-0000-0000-000000000001', 'cc000001-0000-0000-0000-000000000001', 'Exterior foam wash', 'Included exterior wash.', 0, 20, 1, 1),
('bb000002-0000-0000-0000-000000000001', 'cc000001-0000-0000-0000-000000000003', 'Tire shine', 'Included tire shine.', 0, 10, 1, 2),
('bb000002-0000-0000-0000-000000000002', 'cc000001-0000-0000-0000-000000000001', 'Exterior foam wash', 'Included exterior wash.', 0, 20, 1, 1),
('bb000002-0000-0000-0000-000000000002', 'cc000001-0000-0000-0000-000000000002', 'Interior vacuum', 'Included interior vacuum.', 0, 15, 1, 2),
('bb000002-0000-0000-0000-000000000003', 'cc000001-0000-0000-0000-000000000004', 'Wax protection', 'Included wax protection.', 0, 25, 1, 1)
ON CONFLICT (option_id, package_id) DO NOTHING;

INSERT INTO combos (id, name, description, price, original_price, duration_minutes, duration_days, max_usages, status, image_url)
VALUES
('cb000001-0000-0000-0000-000000000001', 'Monthly Express Pass', 'Four express washes valid for 30 days.', 599000, 756000, 160, 30, 4, 'ACTIVE', NULL),
('cb000001-0000-0000-0000-000000000002', 'Premium Trio', 'Three premium care visits.', 899000, 987000, 195, 45, 3, 'ACTIVE', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO combo_services (combo_id, option_id, option_name, option_description, option_price, option_duration_minutes, quantity, sort_order)
VALUES
('cb000001-0000-0000-0000-000000000001', 'cc000001-0000-0000-0000-000000000001', 'Exterior foam wash', 'Express exterior service visit.', 0, 20, 4, 1),
('cb000001-0000-0000-0000-000000000002', 'cc000001-0000-0000-0000-000000000002', 'Interior vacuum', 'Premium interior service visit.', 0, 15, 3, 1)
ON CONFLICT (option_id, combo_id) DO NOTHING;

INSERT INTO discounts (id, type, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, targeting_mode, new_customer_only, usage_limit, used_count, start_at, end_at, status)
VALUES
('dc000001-0000-0000-0000-000000000001', 'PROMOTION', 'SUMMER10', 'Summer 10%', 'Ten percent off for summer bookings.', 'PERCENT', 10, 150000, 50000, 0, NULL, 'ALL_TIERS', false, 500, 0, now() - interval '7 days', now() + interval '60 days', 'ACTIVE'),
('dc000001-0000-0000-0000-000000000002', 'VOUCHER', 'DIAMOND50', 'Diamond 50K Voucher', 'Fifty thousand VND voucher for high tier customers.', 'FIXED_AMOUNT', 50000, 200000, NULL, 500, 30, 'SPECIFIC_TIERS', false, NULL, 0, now() - interval '7 days', now() + interval '120 days', 'ACTIVE'),
('dc000001-0000-0000-0000-000000000003', 'VOUCHER', 'WELCOME30', 'Welcome 30K', 'Voucher for new customers.', 'FIXED_AMOUNT', 30000, 120000, NULL, 0, 14, 'ALL_TIERS', true, 1000, 0, now() - interval '7 days', now() + interval '90 days', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO discount_tiers (discount_id, tier)
VALUES
('dc000001-0000-0000-0000-000000000002', 'GOLD'),
('dc000001-0000-0000-0000-000000000002', 'PLATINUM'),
('dc000001-0000-0000-0000-000000000002', 'DIAMOND')
ON CONFLICT (discount_id, tier) DO NOTHING;

INSERT INTO discount_applicable_services (discount_id, service_id)
VALUES
('dc000001-0000-0000-0000-000000000001', 'cc000001-0000-0000-0000-000000000001'),
('dc000001-0000-0000-0000-000000000001', 'cc000001-0000-0000-0000-000000000002'),
('dc000001-0000-0000-0000-000000000002', 'cc000001-0000-0000-0000-000000000004')
ON CONFLICT (discount_id, service_id) DO NOTHING;

INSERT INTO tier_voucher_offers (id, discount_id, min_tier, title, points_cost, voucher_value, badge, accent)
VALUES
('0f000001-0000-0000-0000-000000000001', 'dc000001-0000-0000-0000-000000000002', 'GOLD', 'Redeem 50K Voucher', 500, 50000, 'POPULAR', 'gold'),
('0f000001-0000-0000-0000-000000000002', 'dc000001-0000-0000-0000-000000000003', 'BRONZE', 'Redeem Welcome Voucher', 300, 30000, 'NEW', 'green')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_discounts (id, user_id, discount_id, acquisition_method, points_spent, expires_at, status)
VALUES
('ed000001-0000-0000-0000-000000000001', 'ee000001-0000-0000-0000-000000000000', 'dc000001-0000-0000-0000-000000000002', 'POINT_REDEEMED', 500, now() + interval '30 days', 'AVAILABLE'),
('ed000001-0000-0000-0000-000000000002', 'ee000002-0000-0000-0000-000000000000', 'dc000001-0000-0000-0000-000000000001', 'AUTO_ELIGIBLE', 0, now() + interval '60 days', 'AVAILABLE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicles (id, customer_id, plate, type, brand, model, vehicle_year, color, is_primary, status)
SELECT seed.id, users.id, seed.plate, seed.type, seed.brand, seed.model, seed.vehicle_year, seed.color, seed.is_primary, seed.status
FROM (
    VALUES
    ('aa000001-0000-0000-0000-000000000000'::uuid, 'bui.thi.mai.88@gmail.com', '51A-732.76', 'CAR', 'Toyota', 'Vios', 2021, 'White', true, 'ACTIVE'),
    ('aa000002-0000-0000-0000-000000000000'::uuid, 'hoang.van.dung@gmail.com', '51G-982.10', 'SUV', 'Mazda', 'CX-5', 2022, 'Black', true, 'ACTIVE'),
    ('aa000003-0000-0000-0000-000000000000'::uuid, 'nguyen.thi.ha.95@gmail.com', '59V1-123.45', 'MOTORBIKE', 'Honda', 'SH', 2020, 'Red', true, 'ACTIVE'),
    ('aa000004-0000-0000-0000-000000000000'::uuid, 'vu.minh.khoa@yahoo.com', '51F-456.89', 'VAN', 'Ford', 'Transit', 2019, 'Silver', true, 'ACTIVE'),
    ('aa000005-0000-0000-0000-000000000000'::uuid, 'customer@autowash.com', '51D-000.01', 'CAR', 'Honda', 'City', 2023, 'Blue', true, 'ACTIVE')
) AS seed(id, email, plate, type, brand, model, vehicle_year, color, is_primary, status)
JOIN users ON users.email = seed.email
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_combos (id, customer_id, combo_id, total_usages, remaining_usages, activated_at, expires_at, status)
VALUES
('c0000001-0000-0000-0000-000000000001', 'ee000001-0000-0000-0000-000000000000', 'cb000001-0000-0000-0000-000000000001', 4, 3, now() - interval '5 days', now() + interval '25 days', 'ACTIVE'),
('c0000001-0000-0000-0000-000000000002', 'ee000002-0000-0000-0000-000000000000', 'cb000001-0000-0000-0000-000000000002', 3, 2, now() - interval '10 days', now() + interval '35 days', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO bookings (id, customer_id, vehicle_id, assigned_staff_id, scheduled_at, status, confirmation_email, note)
VALUES
('b0000001-0000-0000-0000-000000000001', 'ee000001-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000000', NULL, now() + interval '1 day' + interval '9 hours', 'PENDING', 'bui.thi.mai.88@gmail.com', 'Pending demo booking'),
('b0000001-0000-0000-0000-000000000002', 'ee000002-0000-0000-0000-000000000000', 'aa000002-0000-0000-0000-000000000000', 'dd000001-0000-0000-0000-000000000000', now() + interval '1 day' + interval '10 hours', 'CONFIRMED', 'hoang.van.dung@gmail.com', 'Confirmed demo booking'),
('b0000001-0000-0000-0000-000000000003', 'ee000003-0000-0000-0000-000000000000', 'aa000003-0000-0000-0000-000000000000', 'dd000002-0000-0000-0000-000000000000', now() - interval '1 hour', 'CHECKED_IN', 'nguyen.thi.ha.95@gmail.com', 'Checked in demo booking'),
('b0000001-0000-0000-0000-000000000004', 'ee000004-0000-0000-0000-000000000000', 'aa000004-0000-0000-0000-000000000000', 'dd000003-0000-0000-0000-000000000000', now() - interval '2 hours', 'IN_PROGRESS', 'vu.minh.khoa@yahoo.com', 'In progress demo booking'),
('b0000001-0000-0000-0000-000000000005', 'ee000001-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000000', 'dd000004-0000-0000-0000-000000000000', now() - interval '2 days', 'COMPLETED', 'bui.thi.mai.88@gmail.com', 'Completed demo booking'),
('b0000001-0000-0000-0000-000000000006', 'ee000002-0000-0000-0000-000000000000', 'aa000002-0000-0000-0000-000000000000', 'dd000005-0000-0000-0000-000000000000', now() - interval '3 days', 'CANCELLED', 'hoang.van.dung@gmail.com', 'Cancelled demo booking')
ON CONFLICT (id) DO NOTHING;

INSERT INTO booking_details (id, booking_id, item_type, ref_id, snapshot_name, snapshot_price, quantity, subtotal, duration_minutes, sort_order)
VALUES
('bd000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'PACKAGE', 'bb000002-0000-0000-0000-000000000001', 'Express Wash', 189000, 1, 189000, 40, 1),
('bd000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000002', 'PACKAGE', 'bb000002-0000-0000-0000-000000000002', 'Premium Care', 329000, 1, 329000, 65, 1),
('bd000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000003', 'PACKAGE', 'bb000002-0000-0000-0000-000000000001', 'Express Wash', 189000, 1, 189000, 40, 1),
('bd000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000004', 'PACKAGE', 'bb000002-0000-0000-0000-000000000003', 'Ultimate Detail', 499000, 1, 499000, 95, 1),
('bd000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000005', 'COMBO', 'cb000001-0000-0000-0000-000000000001', 'Monthly Express Pass', 0, 1, 0, 40, 1),
('bd000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000006', 'PACKAGE', 'bb000002-0000-0000-0000-000000000002', 'Premium Care', 329000, 1, 329000, 65, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO booking_pricing (booking_id, subtotal, estimated_duration_minutes, discount_type, discount_ref_id, discount_ref_snapshot, discount_amount, final_amount)
VALUES
('b0000001-0000-0000-0000-000000000001', 189000, 40, NULL, NULL, NULL, 0, 189000),
('b0000001-0000-0000-0000-000000000002', 329000, 65, 'PROMOTION', 'dc000001-0000-0000-0000-000000000001', 'Summer 10%', 32900, 296100),
('b0000001-0000-0000-0000-000000000003', 189000, 40, NULL, NULL, NULL, 0, 189000),
('b0000001-0000-0000-0000-000000000004', 499000, 95, 'VOUCHER', 'dc000001-0000-0000-0000-000000000002', 'Diamond 50K Voucher', 50000, 449000),
('b0000001-0000-0000-0000-000000000005', 0, 40, NULL, NULL, NULL, 0, 0),
('b0000001-0000-0000-0000-000000000006', 329000, 65, NULL, NULL, NULL, 0, 329000)
ON CONFLICT (booking_id) DO NOTHING;

INSERT INTO booking_status_histories (booking_id, changed_by, old_status, new_status, reason)
VALUES
('b0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'PENDING', 'CONFIRMED', 'Demo confirmation'),
('b0000001-0000-0000-0000-000000000003', 'dd000002-0000-0000-0000-000000000000', 'CONFIRMED', 'CHECKED_IN', 'Demo check-in'),
('b0000001-0000-0000-0000-000000000004', 'dd000003-0000-0000-0000-000000000000', 'CHECKED_IN', 'IN_PROGRESS', 'Demo start wash'),
('b0000001-0000-0000-0000-000000000005', 'dd000004-0000-0000-0000-000000000000', 'IN_PROGRESS', 'COMPLETED', 'Demo completed'),
('b0000001-0000-0000-0000-000000000006', 'dd000005-0000-0000-0000-000000000000', 'CONFIRMED', 'CANCELLED', 'Customer cancelled')
ON CONFLICT DO NOTHING;

INSERT INTO wash_sessions (id, booking_id, assigned_staff_id, status, fee_amount, projected_points, awarded_points, checked_in_at, started_at, completed_at, cancelled_at, cancel_reason, cancel_fault_type, notes, created_at)
VALUES
('55000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000002', 'dd000001-0000-0000-0000-000000000000', 'PENDING', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Pending operation session', now() - interval '30 minutes'),
('55000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000003', 'dd000002-0000-0000-0000-000000000000', 'CHECKED_IN', 189000, 18, NULL, now() - interval '50 minutes', NULL, NULL, NULL, NULL, NULL, 'Checked-in operation session', now() - interval '1 hour'),
('55000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000004', 'dd000003-0000-0000-0000-000000000000', 'IN_PROGRESS', 449000, 44, NULL, now() - interval '2 hours', now() - interval '90 minutes', NULL, NULL, NULL, NULL, 'In-progress operation session', now() - interval '2 hours'),
('55000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000005', 'dd000004-0000-0000-0000-000000000000', 'COMPLETED', 0, 0, 0, now() - interval '2 days', now() - interval '2 days' + interval '15 minutes', now() - interval '2 days' + interval '55 minutes', NULL, NULL, NULL, 'Completed combo session', now() - interval '2 days'),
('55000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000006', 'dd000005-0000-0000-0000-000000000000', 'CANCELLED', NULL, NULL, NULL, NULL, NULL, NULL, now() - interval '3 days', 'Customer requested cancellation', 'CUSTOMER_FAULT', 'Cancelled operation session', now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, booking_id, amount, method, status, transaction_ref, paid_at)
VALUES
('99000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 189000, 'CASH_AT_COUNTER', 'UNPAID', NULL, NULL),
('99000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000002', 296100, 'BANK_TRANSFER', 'PENDING_PAYMENT', 'DEMO-PENDING-001', NULL),
('99000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000003', 189000, 'CASH_AT_COUNTER', 'PAID', 'DEMO-PAID-003', now() - interval '45 minutes'),
('99000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000004', 449000, 'E_WALLET', 'PAID', 'DEMO-PAID-004', now() - interval '2 hours'),
('99000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000005', 0, 'CASH_AT_COUNTER', 'PAID', 'COMBO-USAGE-001', now() - interval '2 days'),
('99000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000006', 329000, 'BANK_TRANSFER', 'REFUNDED', 'DEMO-REFUND-006', now() - interval '3 days')
ON CONFLICT (booking_id) DO NOTHING;

INSERT INTO customer_combo_usages (customer_combo_id, booking_id, used_at)
VALUES
('c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000005', now() - interval '2 days')
ON CONFLICT (booking_id) DO NOTHING;

INSERT INTO point_transactions (loyalty_account_id, booking_id, type, points, balance_after, reason)
VALUES
('1a000001-0000-0000-0000-000000000000', 'b0000001-0000-0000-0000-000000000005', 'EARN', 0, 7200, 'Completed combo wash'),
('1a000002-0000-0000-0000-000000000000', NULL, 'REDEEM', -500, 1850, 'Redeemed demo voucher')
ON CONFLICT DO NOTHING;

INSERT INTO reviews (id, booking_id, customer_id, rating, comment, is_featured)
VALUES
('88000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000005', 'ee000001-0000-0000-0000-000000000000', 5, 'Fast service and clean car.', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO violation_records (id, booking_id, customer_id, type, penalty_points, note)
VALUES
('77000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000006', 'ee000002-0000-0000-0000-000000000000', 'LATE_CANCEL', 1, 'Cancelled too close to appointment time.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO blog_categories (id, name, slug, description)
VALUES
('bc000001-0000-0000-0000-000000000001', 'Car Care', 'car-care', 'Car wash and detailing guides.'),
('bc000001-0000-0000-0000-000000000002', 'Promotions', 'promotions', 'AutoWash news and offers.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_articles (id, category_id, author_id, title, slug, excerpt, content, thumbnail_url, status, published_at, view_count)
VALUES
('ba000001-0000-0000-0000-000000000001', 'bc000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'How often should you wash your car?', 'how-often-should-you-wash-your-car', 'Simple schedule for keeping your car clean.', 'Wash weekly during rainy season and every two weeks in normal conditions.', NULL, 'PUBLISHED', now() - interval '10 days', 128),
('ba000001-0000-0000-0000-000000000002', 'bc000001-0000-0000-0000-000000000002', 'f23a1a29-b551-4021-af92-62e1906f2458', 'Summer care offers are live', 'summer-care-offers-are-live', 'Save on selected packages this season.', 'Use SUMMER10 on eligible bookings while the campaign is active.', NULL, 'PUBLISHED', now() - interval '3 days', 86)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_comments (id, article_id, customer_id, content)
VALUES
('c1110001-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', 'ee000001-0000-0000-0000-000000000000', 'Useful guide, thanks.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO blog_likes (id, article_id, customer_id)
VALUES
('1eaf0001-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', 'ee000001-0000-0000-0000-000000000000'),
('1eaf0001-0000-0000-0000-000000000002', 'ba000001-0000-0000-0000-000000000002', 'ee000002-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (id, type, title, message, link_label, link_url, priority, active, expires_at)
VALUES
('a1000001-0000-0000-0000-000000000001', 'PROMOTION', 'Summer campaign', 'Use SUMMER10 for selected wash packages.', 'Book now', '/customer/booking', 10, true, now() + interval '60 days'),
('a1000001-0000-0000-0000-000000000002', 'SYSTEM', 'Extended weekend hours', 'AutoWash is open until 20:00 this weekend.', NULL, NULL, 5, true, now() + interval '14 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notification_campaigns (id, status, target_audience, type, title, message, scheduled_at, sent_at, success_count, failed_count)
VALUES
('ac000001-0000-0000-0000-000000000001', 'COMPLETED', 'ALL_CUSTOMERS', 'PROMOTION', 'Summer campaign', 'Use SUMMER10 for selected wash packages.', now() - interval '2 days', now() - interval '2 days', 4, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (id, user_id, campaign_id, type, title, message, is_read)
VALUES
('ad000001-0000-0000-0000-000000000001', 'ee000001-0000-0000-0000-000000000000', 'ac000001-0000-0000-0000-000000000001', 'PROMOTION', 'Summer campaign', 'Use SUMMER10 for your next booking.', false),
('ad000001-0000-0000-0000-000000000002', 'ee000002-0000-0000-0000-000000000000', NULL, 'BOOKING_CONFIRMED', 'Booking confirmed', 'Your Premium Care booking is confirmed.', false),
('ad000001-0000-0000-0000-000000000003', 'ee000001-0000-0000-0000-000000000000', NULL, 'WASH_COMPLETED', 'Wash completed', 'Your combo wash has been completed.', true)
ON CONFLICT (id) DO NOTHING;
