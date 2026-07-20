CREATE TABLE IF NOT EXISTS discounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    type varchar(20) NOT NULL CHECK (type IN ('PROMOTION','VOUCHER')),
    code varchar(50),
    name varchar(120) NOT NULL,
    description text,
    discount_type varchar(30) NOT NULL CHECK (discount_type IN ('PERCENT','FIXED_AMOUNT','FREE_SERVICE','NONE')),
    discount_value bigint NOT NULL DEFAULT 0,
    min_order_amount bigint NOT NULL DEFAULT 0,
    max_discount_amount bigint,
    required_points integer NOT NULL DEFAULT 0,
    valid_days_after_claim integer,
    targeting_mode varchar(30) NOT NULL DEFAULT 'ALL_TIERS' CHECK (targeting_mode IN ('ALL_TIERS','SPECIFIC_TIERS')),
    new_customer_only boolean NOT NULL DEFAULT false,
    usage_limit integer,
    used_count integer NOT NULL DEFAULT 0,
    start_at timestamp(6) with time zone NOT NULL,
    end_at timestamp(6) with time zone NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    created_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_discounts_code ON discounts (code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discounts_type ON discounts (type);
CREATE INDEX IF NOT EXISTS idx_discounts_status ON discounts (status);
CREATE INDEX IF NOT EXISTS idx_discounts_start_end ON discounts (start_at, end_at);

CREATE TABLE IF NOT EXISTS discount_tiers (
    discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    tier varchar(50) NOT NULL REFERENCES tier_configs(tier),
    PRIMARY KEY (discount_id, tier)
);

CREATE TABLE IF NOT EXISTS discount_applicable_services (
    discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    service_id uuid NOT NULL REFERENCES services(id),
    PRIMARY KEY (discount_id, service_id)
);

CREATE TABLE IF NOT EXISTS user_discounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    discount_id uuid NOT NULL REFERENCES discounts(id),
    acquisition_method varchar(20) NOT NULL CHECK (acquisition_method IN ('ADMIN_GRANTED','AUTO_ELIGIBLE','POINT_REDEEMED')),
    points_spent integer NOT NULL DEFAULT 0,
    claimed_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    expires_at timestamp(6) with time zone,
    status varchar(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','USED','EXPIRED','FORFEITED')),
    used_at timestamp(6) with time zone,
    used_in_booking_id uuid,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_user_discounts_user_id ON user_discounts (user_id);
CREATE INDEX IF NOT EXISTS idx_user_discounts_discount_id ON user_discounts (discount_id);
CREATE INDEX IF NOT EXISTS idx_user_discounts_status ON user_discounts (status);
CREATE INDEX IF NOT EXISTS idx_user_discounts_used_booking ON user_discounts (used_in_booking_id);

CREATE TABLE IF NOT EXISTS tier_voucher_offers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    discount_id uuid NOT NULL REFERENCES discounts(id),
    points_cost integer NOT NULL,
    voucher_value integer NOT NULL,
    created_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    accent varchar(20) NOT NULL,
    badge varchar(20) NOT NULL,
    min_tier varchar(50) NOT NULL REFERENCES tier_configs(tier),
    title varchar(100) NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_tier_voucher_offers_discount_id ON tier_voucher_offers (discount_id);
CREATE INDEX IF NOT EXISTS idx_tier_voucher_offers_min_tier ON tier_voucher_offers (min_tier);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_discounts_booking'
    ) THEN
        ALTER TABLE user_discounts
            ADD CONSTRAINT fk_user_discounts_booking
            FOREIGN KEY (used_in_booking_id) REFERENCES bookings(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_discounts_updated_at'
          AND tgrelid = 'discounts'::regclass
    ) THEN
        CREATE TRIGGER trg_discounts_updated_at
        BEFORE UPDATE ON discounts
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_tier_voucher_offers_updated_at'
          AND tgrelid = 'tier_voucher_offers'::regclass
    ) THEN
        CREATE TRIGGER trg_tier_voucher_offers_updated_at
        BEFORE UPDATE ON tier_voucher_offers
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
