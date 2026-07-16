ALTER TABLE promotions ADD COLUMN discount_type VARCHAR(20) DEFAULT 'NONE';
ALTER TABLE promotions ADD COLUMN discount_value BIGINT DEFAULT 0;
ALTER TABLE bookings ADD COLUMN promotion_discount BIGINT DEFAULT 0;
