-- Insert Demo Promotions using fixed UUIDs to avoid procedural blocks
INSERT INTO promotions (id, name, description, point_multiplier, targeting_mode, start_at, end_at, status)
VALUES 
('11111111-1111-1111-1111-111111111111', 'SUMMER SALE 2026', 'X2 points for all washes this summer', 2.00, 'ALL_TIERS', CURRENT_TIMESTAMP - INTERVAL '1' DAY, CURRENT_TIMESTAMP + INTERVAL '30' DAY, 'ACTIVE'),
('22222222-2222-2222-2222-222222222222', 'GOLD EXCLUSIVE', 'X3 points exclusively for Gold and Platinum members', 3.00, 'SPECIFIC_TIERS', CURRENT_TIMESTAMP - INTERVAL '5' DAY, CURRENT_TIMESTAMP + INTERVAL '15' DAY, 'ACTIVE');

-- Insert Promotion Tiers
INSERT INTO promotion_tiers (promotion_id, tier) VALUES
('22222222-2222-2222-2222-222222222222', 'GOLD'),
('22222222-2222-2222-2222-222222222222', 'PLATINUM');

-- Insert Notifications for the customer using INSERT ... SELECT
INSERT INTO notifications (user_id, title, message, type, is_read)
SELECT id, 'Welcome to Aura Car Care!', 'We are thrilled to have you as a member.', 'SYSTEM', false
FROM users WHERE email = 'customer@autowash.com'
LIMIT 1;

INSERT INTO notifications (user_id, title, message, type, is_read)
SELECT id, 'Summer Sale is here', 'Check out our new promotions for summer 2026.', 'PROMOTION', false
FROM users WHERE email = 'customer@autowash.com'
LIMIT 1;
