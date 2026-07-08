INSERT INTO "packages" ("id", "name", "description", "base_price", "duration_minutes", "status") VALUES
('12345678-1234-1234-1234-123456789012', 'Basic Wash', 'Standard exterior and interior wash', 150000, 45, 'ACTIVE'),
('87654321-4321-4321-4321-210987654321', 'Premium Wash', 'Full detail wash', 300000, 90, 'ACTIVE');

INSERT INTO "services" ("id", "name", "description", "price", "duration_minutes", "status") VALUES
('33333333-1234-1234-1234-123456789012', 'Waxing', 'Apply carnauba wax', 50000, 15, 'ACTIVE'),
('44444444-1234-1234-1234-123456789012', 'Interior Detailing', 'Deep clean interior', 100000, 30, 'ACTIVE');

INSERT INTO "combos" ("id", "name", "description", "price", "duration_minutes", "max_usages", "status") VALUES
('55555555-1234-1234-1234-123456789012', 'Monthly Basic Combo', '5 Basic Washes', 600000, 45, 5, 'ACTIVE');

INSERT INTO "voucher_templates" ("id", "code", "name", "discount_type", "discount_value", "max_discount_amount", "min_order_amount", "usage_limit", "used_count", "start_at", "end_at", "status", "required_points", "valid_days_after_claim") VALUES
('66666666-1234-1234-1234-123456789012', 'WELCOME20', '20% off for new customers', 'PERCENT', 20, 50000, 100000, 100, 0, CURRENT_TIMESTAMP, DATEADD('DAY',30,CURRENT_TIMESTAMP), 'ACTIVE', 0, 30),
('77777777-1234-1234-1234-123456789012', 'ADMINVOUCHER50', '50k off', 'FIXED_AMOUNT', 50000, 50000, 100000, 100, 0, CURRENT_TIMESTAMP, DATEADD('DAY',30,CURRENT_TIMESTAMP), 'ACTIVE', 100, 30),
('aaaaaaaa-1234-1234-1234-123456789012', 'TESTVOUCHER0', 'Test 0 points', 'FIXED_AMOUNT', 10000, 10000, 0, 100, 0, CURRENT_TIMESTAMP, DATEADD('DAY',30,CURRENT_TIMESTAMP), 'ACTIVE', 0, 30);

UPDATE "voucher_templates" SET "new_customer_only" = true WHERE "code" = 'WELCOME20';

INSERT INTO "promotions" ("id", "name", "description", "targeting_mode", "point_multiplier", "start_at", "end_at", "status") VALUES
('88888888-1234-1234-1234-123456789012', 'All 10% Off', '10% off for all', 'ALL_TIERS', 1.0, CURRENT_TIMESTAMP, DATEADD('DAY',30,CURRENT_TIMESTAMP), 'ACTIVE'),
('88888888-1234-1234-1234-000000000001', 'Bronze Welcome Bonus', 'Bonus for Bronze members', 'SPECIFIC_TIERS', 1.2, CURRENT_TIMESTAMP, DATEADD('DAY',30,CURRENT_TIMESTAMP), 'ACTIVE'),
('88888888-1234-1234-1234-000000000002', 'Gold Loyalty Boost', 'Boost for Gold members', 'SPECIFIC_TIERS', 1.5, CURRENT_TIMESTAMP, DATEADD('DAY',30,CURRENT_TIMESTAMP), 'ACTIVE');

INSERT INTO "promotion_tiers" ("promotion_id", "tier") VALUES
('88888888-1234-1234-1234-000000000001', 'BRONZE'),
('88888888-1234-1234-1234-000000000002', 'GOLD');

INSERT INTO "package_services" ("package_id", "option_id", "option_name", "option_description", "option_price", "option_duration_minutes") VALUES ('12345678-1234-1234-1234-123456789012', '33333333-1234-1234-1234-123456789012', 'Waxing', 'Apply carnauba wax', 50000, 15);

INSERT INTO "voucher_templates" ("id", "code", "name", "discount_type", "discount_value", "max_discount_amount", "min_order_amount", "usage_limit", "used_count", "start_at", "end_at", "status", "required_points", "valid_days_after_claim") VALUES ('99999999-1234-1234-1234-123456789012', 'OLD10', 'Expired 10% off', 'PERCENT', 10, 50000, 100000, 100, 0, DATEADD('DAY', -60, CURRENT_TIMESTAMP), DATEADD('DAY', -30, CURRENT_TIMESTAMP), 'ACTIVE', 0, 30);

UPDATE "system_settings" SET "max_bookings_per_time_slot" = 100 WHERE "id" = 1;
