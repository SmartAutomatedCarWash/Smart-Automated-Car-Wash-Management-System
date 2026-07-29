-- The Diamond voucher was seeded with a GOLD minimum tier and gold accent,
-- which made its name, eligibility, filter, and marketplace color disagree.
UPDATE tier_voucher_offers
SET min_tier = 'DIAMOND',
    title = 'Diamond 50K Voucher',
    points_cost = 500,
    voucher_value = 50000,
    badge = 'EXCLUSIVE',
    accent = 'diamond',
    updated_at = now()
WHERE id = '0f000001-0000-0000-0000-000000000001';

UPDATE discounts
SET name = 'Diamond 50K Voucher',
    description = 'Fifty thousand VND voucher exclusively for Diamond members.',
    targeting_mode = 'SPECIFIC_TIERS',
    required_points = 500,
    updated_at = now()
WHERE id = 'dc000001-0000-0000-0000-000000000002';

DELETE FROM discount_tiers
WHERE discount_id = 'dc000001-0000-0000-0000-000000000002'
  AND tier <> 'DIAMOND';

INSERT INTO discount_tiers (discount_id, tier)
SELECT 'dc000001-0000-0000-0000-000000000002', 'DIAMOND'
WHERE EXISTS (
    SELECT 1
    FROM discounts
    WHERE id = 'dc000001-0000-0000-0000-000000000002'
)
ON CONFLICT (discount_id, tier) DO NOTHING;
