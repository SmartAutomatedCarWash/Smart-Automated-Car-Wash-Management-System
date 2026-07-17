-- V124: Fix wash_sessions fee_amount/points + add booking_options (add-ons) + REDEEM point transactions

-- ── 1. Update wash sessions: set fee_amount = booking.final_amount, realistic points ─────
UPDATE wash_sessions ws
SET
  fee_amount        = b.final_amount,
  projected_points  = GREATEST(1, b.final_amount / 10000),
  awarded_points    = GREATEST(1, b.final_amount / 10000)
FROM bookings b
WHERE ws.booking_id = b.id
  AND ws.status = 'COMPLETED'
  AND ws.fee_amount IS NULL;

-- ── 2. booking_options (add-on services) cho ~30% bookings đã COMPLETED ──────────────────
-- PKG01 Express Wash + SV05 Tire Dressing (30K) + SV25 Mirror Cleaning (20K)
INSERT INTO booking_options (booking_id, option_id, option_name, option_price) VALUES
('ff000007-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000005', 'Tire Dressing',              30000),
('ff000007-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000025', 'Mirror Cleaning',            20000),
-- PKG04 Exterior Care + SV27 Chrome Polish (100K) + SV10 Wheel Well Cleaning (50K)
('ff000009-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000027', 'Chrome Polish',             100000),
('ff000009-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000010', 'Wheel Well Cleaning',        50000),
-- PKG05 Standard Wash + SV18 Ozone Odor Elimination (150K)
('ff000011-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000018', 'Ozone Odor Elimination',    150000),
-- PKG03 Interior Care + SV15 Leather Conditioning (150K) + SV19 AC Vent Cleaning (80K)
('ff000019-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000015', 'Leather Conditioning',      150000),
('ff000019-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000019', 'AC Vent Cleaning',           80000),
-- PKG04 Exterior Care + SV06 Bug & Tar Removal (150K)
('ff000036-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000006', 'Bug & Tar Removal',         150000),
-- PKG04 + SV24 Windshield Water-Repellent Coating (250K)
('ff00003f-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000024', 'Windshield Water-Repellent Coating', 250000),
-- PKG06 Full Detailing + SV43 Undercarriage Anti-Rust Coating (2500K) — high value booking
('ff000052-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000043', 'Undercarriage Anti-Rust Coating', 2500000),
-- PKG05 Standard Wash + SV05 Tire Dressing (30K) + SV09 Door Jamb Cleaning (40K)
('ff00005f-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000005', 'Tire Dressing',              30000),
('ff00005f-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000009', 'Door Jamb Cleaning',          40000),
-- PKG04 Exterior Care + SV07 Iron Decontamination (200K) + SV08 Clay Bar Treatment (250K)
('ff00007c-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000007', 'Iron Decontamination',       200000),
('ff00007c-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000008', 'Clay Bar Treatment',         250000),
-- PKG06 Full Detailing + SV40 Wheel Ceramic Coating (800K)
('ff000078-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000040', 'Wheel Ceramic Coating',      800000),
-- PKG04 + SV26 Trim Restoration (150K) + SV03 Undercarriage Rinse (50K)
('ff000080-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000026', 'Trim Restoration',           150000),
('ff000080-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000003', 'Undercarriage Rinse',         50000),
-- PKG06 Full Detailing + SV42 Headlight Restoration (400K)
('ff00008a-0000-0000-0000-000000000000', 'aa000001-0000-0000-0000-000000000042', 'Headlight Restoration',      400000)
ON CONFLICT DO NOTHING;

-- ── 3. REDEEM point transactions (khách đổi điểm lấy voucher) ────────────────────────────
-- Bùi Thị Mai (DIAMOND, bb000001) đổi 500 pts lấy DIA200 voucher
INSERT INTO point_transactions (loyalty_account_id, booking_id, type, points, balance_after, reason, created_at)
VALUES
('bb000001-0000-0000-0000-000000000000', NULL, 'REDEEM', -500, 4917, 'Đổi điểm lấy voucher DIA200', '2026-06-01 09:00:00+07'),
-- Hoàng Văn Dũng (PLATINUM, bb000002) đổi 300 pts lấy PLAT100 voucher
('bb000002-0000-0000-0000-000000000000', NULL, 'REDEEM', -300, 3691, 'Đổi điểm lấy voucher PLAT100', '2026-03-25 09:00:00+07'),
-- Nguyễn Thị Hà (GOLD, bb000003) đổi 180 pts lấy GOLD50 voucher
('bb000003-0000-0000-0000-000000000000', NULL, 'REDEEM', -180, 2446, 'Đổi điểm lấy voucher GOLD50', '2026-03-28 11:00:00+07'),
-- Vũ Minh Khoa (GOLD, bb000004) đổi 400 pts lấy GOLD100 voucher
('bb000004-0000-0000-0000-000000000000', NULL, 'REDEEM', -400, 2056, 'Đổi điểm lấy voucher GOLD100', '2026-04-10 14:00:00+07'),
-- Lê Thị Ngọc (GOLD, bb000005) đổi 200 pts lấy SILVER50 voucher
('bb000005-0000-0000-0000-000000000000', NULL, 'REDEEM', -200, 2312, 'Đổi điểm lấy voucher SILVER50', '2026-04-01 09:00:00+07'),
-- Trần Văn Bình (SILVER, bb000006) đổi 200 pts lấy SILVER50 voucher
('bb000006-0000-0000-0000-000000000000', NULL, 'REDEEM', -200, 1209, 'Đổi điểm lấy voucher SILVER50', '2026-04-05 10:00:00+07'),
-- Phạm Thị Thanh (SILVER, bb000007) đổi 100 pts lấy BRONZE20 voucher
('bb000007-0000-0000-0000-000000000000', NULL, 'REDEEM', -100, 711, 'Đổi điểm lấy voucher BRONZE20', '2026-05-01 08:00:00+07')
ON CONFLICT DO NOTHING;

-- ── 4. Fix booking.options_amount cho các booking đã thêm add-on ──────────────────────────
UPDATE bookings SET options_amount = 50000,  final_amount = final_amount + 50000  WHERE id = 'ff000007-0000-0000-0000-000000000000';
UPDATE bookings SET options_amount = 150000, final_amount = final_amount + 150000 WHERE id = 'ff000009-0000-0000-0000-000000000000';
UPDATE bookings SET options_amount = 150000, final_amount = final_amount + 150000 WHERE id = 'ff000011-0000-0000-0000-000000000000';
UPDATE bookings SET options_amount = 230000, final_amount = final_amount + 230000 WHERE id = 'ff000019-0000-0000-0000-000000000000';
UPDATE bookings SET options_amount = 150000, final_amount = final_amount + 150000 WHERE id = 'ff000036-0000-0000-0000-000000000000';
UPDATE bookings SET options_amount = 250000, final_amount = final_amount + 250000 WHERE id = 'ff00003f-0000-0000-0000-000000000000';
UPDATE bookings SET options_amount = 2500000,final_amount = final_amount + 2500000 WHERE id = 'ff000052-0000-0000-0000-000000000000';
UPDATE bookings SET options_amount = 70000,  final_amount = final_amount + 70000  WHERE id = 'ff00005f-0000-0000-0000-000000000000';
UPDATE bookings SET options_amount = 450000, final_amount = final_amount + 450000 WHERE id = 'ff00007c-0000-0000-0000-000000000000';
UPDATE bookings SET options_amount = 800000, final_amount = final_amount + 800000 WHERE id = 'ff000078-0000-0000-0000-000000000000';
UPDATE bookings SET options_amount = 200000, final_amount = final_amount + 200000 WHERE id = 'ff000080-0000-0000-0000-000000000000';
UPDATE bookings SET options_amount = 400000, final_amount = final_amount + 400000 WHERE id = 'ff00008a-0000-0000-0000-000000000000';

-- ── 5. Fix booking.discount_amount + final_amount cho bookings đã dùng voucher ──────────
-- Bùi Thị Mai dùng DIA200 (giảm 200K) cho ff000007
UPDATE bookings SET discount_amount = 200000, final_amount = GREATEST(0, final_amount - 200000) WHERE id = 'ff000007-0000-0000-0000-000000000000';
-- Hoàng Văn Dũng dùng PLAT100 (giảm 100K) cho ff000028
UPDATE bookings SET discount_amount = 100000, final_amount = GREATEST(0, final_amount - 100000) WHERE id = 'ff000028-0000-0000-0000-000000000000';
-- Nguyễn Thị Hà dùng GOLD50 (giảm 50K) cho ff00002e
UPDATE bookings SET discount_amount = 50000,  final_amount = GREATEST(0, final_amount - 50000)  WHERE id = 'ff00002e-0000-0000-0000-000000000000';
-- Vũ Minh Khoa dùng GOLD100 (giảm 100K) cho ff000066
UPDATE bookings SET discount_amount = 100000, final_amount = GREATEST(0, final_amount - 100000) WHERE id = 'ff000066-0000-0000-0000-000000000000';
-- Lê Thị Ngọc dùng SILVER50 (giảm 50K) cho ff00004f
UPDATE bookings SET discount_amount = 50000,  final_amount = GREATEST(0, final_amount - 50000)  WHERE id = 'ff00004f-0000-0000-0000-000000000000';
-- Trần Văn Bình dùng SILVER50 (giảm 50K) cho ff000059
UPDATE bookings SET discount_amount = 50000,  final_amount = GREATEST(0, final_amount - 50000)  WHERE id = 'ff000059-0000-0000-0000-000000000000';
-- Phạm Thị Thanh dùng BRONZE20 (giảm 20K) cho ff000070
UPDATE bookings SET discount_amount = 20000,  final_amount = GREATEST(0, final_amount - 20000)  WHERE id = 'ff000070-0000-0000-0000-000000000000';

-- ── 6. Update payments để khớp final_amount mới ──────────────────────────────────────────
UPDATE payments p
SET amount = b.final_amount
FROM bookings b
WHERE p.booking_id = b.id
  AND p.amount != b.final_amount;

-- ── 7. Fix balance_after cho toàn bộ transactions (running balance, không âm) ────────────
WITH ranked AS (
  SELECT
    pt.id,
    SUM(pt.points) OVER (
      PARTITION BY pt.loyalty_account_id
      ORDER BY pt.created_at, pt.id
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_balance
  FROM point_transactions pt
)
UPDATE point_transactions pt
SET balance_after = GREATEST(0, r.running_balance)
FROM ranked r
WHERE pt.id = r.id
  AND pt.balance_after = 0;
