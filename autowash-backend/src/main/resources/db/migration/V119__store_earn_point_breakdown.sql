ALTER TABLE point_transactions
    ADD COLUMN IF NOT EXISTS base_points integer,
    ADD COLUMN IF NOT EXISTS point_multiplier numeric(10, 2);

WITH earn_context AS (
    SELECT
        pt.id,
        pt.points,
        FLOOR(
            pricing.final_amount::numeric
            / NULLIF(settings.earn_points_unit_amount, 0)
        )::integer AS base_points
    FROM point_transactions pt
    JOIN booking_pricing pricing ON pricing.booking_id = pt.booking_id
    CROSS JOIN system_settings settings
    WHERE pt.type = 'EARN'
      AND settings.id = 1
      AND pt.base_points IS NULL
),
inferred_breakdown AS (
    SELECT
        context.id,
        context.base_points,
        COALESCE(
            matched_tier.point_multiplier,
            ROUND(context.points::numeric / NULLIF(context.base_points, 0), 2),
            1.00
        ) AS point_multiplier
    FROM earn_context context
    LEFT JOIN LATERAL (
        SELECT tier.point_multiplier
        FROM tier_configs tier
        WHERE FLOOR(context.base_points * tier.point_multiplier)::integer = context.points
        ORDER BY ABS(
            tier.point_multiplier
            - context.points::numeric / NULLIF(context.base_points, 0)
        )
        LIMIT 1
    ) matched_tier ON true
)
UPDATE point_transactions pt
SET
    base_points = breakdown.base_points,
    point_multiplier = breakdown.point_multiplier
FROM inferred_breakdown breakdown
WHERE pt.id = breakdown.id;
