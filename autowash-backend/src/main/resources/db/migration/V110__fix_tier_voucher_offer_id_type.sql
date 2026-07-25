ALTER TABLE tier_voucher_offers
    ALTER COLUMN id TYPE uuid USING (
        CASE
            WHEN id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                THEN id::text::uuid
            ELSE gen_random_uuid()
        END
    );
