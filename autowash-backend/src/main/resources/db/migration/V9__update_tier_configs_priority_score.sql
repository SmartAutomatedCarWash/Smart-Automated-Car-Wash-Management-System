-- V8: Thay thế has_priority_queue bằng priority_score trong bảng tier_configs

-- 1. Thêm cột priority_score
ALTER TABLE tier_configs ADD COLUMN priority_score INT NOT NULL DEFAULT 0;

-- 2. Cập nhật dữ liệu cho các hạng có has_priority_queue = true
UPDATE tier_configs SET priority_score = 100 WHERE tier = 'DIAMOND';
UPDATE tier_configs SET priority_score = 80 WHERE tier = 'PLATINUM';
-- GOLD không còn priority_score (đã là 0 mặc định)

-- 3. Xóa cột has_priority_queue cũ
ALTER TABLE tier_configs DROP COLUMN has_priority_queue;
