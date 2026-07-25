WITH ranked_primary_vehicles AS (
    SELECT
        id,
        row_number() OVER (
            PARTITION BY customer_id
            ORDER BY updated_at DESC, created_at DESC, id DESC
        ) AS primary_rank
    FROM vehicles
    WHERE status = 'ACTIVE'
      AND is_primary = true
)
UPDATE vehicles
SET is_primary = false
WHERE id IN (
    SELECT id
    FROM ranked_primary_vehicles
    WHERE primary_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_primary_vehicle_per_customer
ON vehicles (customer_id)
WHERE status = 'ACTIVE'
  AND is_primary = true;
