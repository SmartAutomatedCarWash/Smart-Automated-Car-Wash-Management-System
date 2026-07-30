-- ============================================================
-- CARWASH BOOKING SYSTEM - SCHEMA V1 (HOÀN CHỈNH)
-- Đã áp dụng:
--   1. booking_details thay booking_options (polymorphic snapshot: PACKAGE/COMBO/ADDON)
--   2. booking_pricing tách riêng 1-1 với bookings (tổng hợp tài chính)
--   3. discounts gộp promotions + voucher_templates (discriminator: type)
--   4. user_discounts gộp user_vouchers + booking_promotions (ví voucher của khách)
--   5. discount_tiers gộp promotion_tiers + voucher_tiers
--   6. discount_applicable_services thay voucher_applicable_services
--   7. tier_voucher_offers giữ nguyên vai trò hiển thị UI, thêm FK discount_id
--   8. point_multiplier chuyển từ promotions sang tier_configs (đã có sẵn)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- PHẦN 1: USERS & AUTH
-- ============================================================

CREATE TABLE users (
    birthday_locked            boolean NOT NULL DEFAULT false,
    date_of_birth               date,
    booking_suspended_until     timestamp(6) with time zone,
    created_at                  timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at                  timestamp(6) with time zone NOT NULL DEFAULT now(),
    id                           uuid NOT NULL DEFAULT gen_random_uuid(),
    phone                        varchar(20) UNIQUE,
    full_name                   varchar(100) NOT NULL,
    avatar_url                  varchar(500),
    email                        varchar(255) UNIQUE,
    password_hash                varchar(255) NOT NULL,
    role                         varchar(20) NOT NULL CHECK (role IN ('CUSTOMER','STAFF','MANAGER','ADMIN')),
    status                       varchar(20) NOT NULL CHECK (status IN ('PENDING','ACTIVE','BLOCKED','SUSPENDED','INACTIVE')),
    PRIMARY KEY (id)
);

CREATE TABLE user_oauth_accounts (
    created_at          timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at          timestamp(6) with time zone NOT NULL DEFAULT now(),
    id                   uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id              uuid NOT NULL REFERENCES users(id),
    provider             varchar(30) NOT NULL CHECK (provider IN ('GOOGLE','FACEBOOK','APPLE')),
    provider_user_id     varchar(255) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE user_preferences (
    email_notifications     boolean NOT NULL DEFAULT true,
    notifications_enabled   boolean NOT NULL DEFAULT true,
    sms_notifications       boolean NOT NULL DEFAULT true,
    language                varchar(10) NOT NULL DEFAULT 'VI' CHECK (language IN ('VI','EN')),
    user_id                 uuid NOT NULL REFERENCES users(id),
    theme                   varchar(20) NOT NULL DEFAULT 'LIGHT' CHECK (theme IN ('LIGHT','DARK')),
    PRIMARY KEY (user_id)
);

CREATE TABLE refresh_tokens (
    created_at    timestamp(6) with time zone NOT NULL DEFAULT now(),
    expires_at    timestamp(6) with time zone NOT NULL,
    revoked_at    timestamp(6) with time zone,
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES users(id),
    token          varchar(255) NOT NULL UNIQUE,
    PRIMARY KEY (id)
);

CREATE TABLE otp_verifications (
    attempts             integer NOT NULL DEFAULT 0,
    created_at            timestamp(6) with time zone NOT NULL DEFAULT now(),
    expires_at            timestamp(6) with time zone NOT NULL,
    verified_at           timestamp(6) with time zone,
    id                     uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id                uuid NOT NULL REFERENCES users(id),
    purpose                varchar(50) NOT NULL CHECK (purpose IN ('REGISTRATION','EMAIL_REGISTRATION','PASSWORD_RESET','BOOKING_CONFIRMATION')),
    code_hash               varchar(255) NOT NULL,
    delivery_address        varchar(255) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE google_auth_tickets (
    consumed_at            timestamp(6) with time zone,
    created_at              timestamp(6) with time zone NOT NULL DEFAULT now(),
    expires_at              timestamp(6) with time zone NOT NULL,
    updated_at              timestamp(6) with time zone NOT NULL DEFAULT now(),
    user_id                  uuid,
    status                   varchar(30) NOT NULL CHECK (status IN ('PENDING','LINK_REQUIRED','READY','CONSUMED','EXPIRED')),
    provider_full_name       varchar(150),
    provider_avatar_url      varchar(500),
    return_url               varchar(1000) NOT NULL,
    provider_email           varchar(255),
    provider_subject         varchar(255),
    state                    varchar(255) NOT NULL,
    PRIMARY KEY (state)
);

CREATE TABLE vehicles (
    is_primary       boolean NOT NULL DEFAULT false,
    vehicle_year     integer NOT NULL,
    created_at        timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at        timestamp(6) with time zone NOT NULL DEFAULT now(),
    customer_id       uuid NOT NULL REFERENCES users(id),
    id                 uuid NOT NULL DEFAULT gen_random_uuid(),
    plate              varchar(20) NOT NULL UNIQUE,
    type               varchar(20) NOT NULL CHECK (type IN ('CAR','SUV','TRUCK','MOTORBIKE','VAN')),
    color              varchar(30),
    brand              varchar(50) NOT NULL,
    model              varchar(50) NOT NULL,
    status             varchar(20) NOT NULL CHECK (status IN ('ACTIVE','INACTIVE','DELETED')),
    PRIMARY KEY (id)
);

CREATE INDEX idx_vehicles_customer_id ON vehicles (customer_id);


-- ============================================================
-- PHẦN 2: LOYALTY / TIER
-- ============================================================

CREATE TABLE tier_configs (
    active              boolean NOT NULL DEFAULT true,
    min_points          integer NOT NULL DEFAULT 0,
    point_multiplier    numeric(38,2) NOT NULL DEFAULT 1.0,
    priority_score      integer NOT NULL DEFAULT 0,
    rank_order          integer NOT NULL,
    advance_booking_days integer NOT NULL DEFAULT 30,
    system_tier         boolean NOT NULL DEFAULT false,
    updated_at          timestamp(6) with time zone NOT NULL DEFAULT now(),
    tier                varchar(50) NOT NULL,
    display_name        varchar(100) NOT NULL,
    image_url           varchar(500),
    PRIMARY KEY (tier),
    CONSTRAINT chk_tier_advance_booking_days_positive CHECK (advance_booking_days >= 1)
);

CREATE TABLE loyalty_accounts (
    current_points          integer NOT NULL DEFAULT 0,
    total_earned_points     integer NOT NULL DEFAULT 0,
    created_at               timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at               timestamp(6) with time zone NOT NULL DEFAULT now(),
    customer_id              uuid NOT NULL UNIQUE REFERENCES users(id),
    id                        uuid NOT NULL DEFAULT gen_random_uuid(),
    tier                      varchar(50) NOT NULL REFERENCES tier_configs(tier),
    PRIMARY KEY (id)
);

CREATE TABLE tier_histories (
    total_points_at_change     integer NOT NULL,
    changed_at                  timestamp(6) with time zone NOT NULL DEFAULT now(),
    id                            bigint GENERATED BY DEFAULT AS IDENTITY,
    loyalty_account_id            uuid NOT NULL REFERENCES loyalty_accounts(id),
    new_tier                      varchar(50) NOT NULL,
    old_tier                      varchar(50),
    PRIMARY KEY (id)
);

-- ============================================================
-- PHẦN 3: CATALOG - PACKAGES / COMBOS / SERVICES
-- ============================================================

CREATE TABLE services (
    duration_minutes    integer NOT NULL,
    created_at            timestamp(6) with time zone NOT NULL DEFAULT now(),
    price                 bigint NOT NULL,
    updated_at            timestamp(6) with time zone NOT NULL DEFAULT now(),
    id                     uuid NOT NULL DEFAULT gen_random_uuid(),
    name                   varchar(100) NOT NULL,
    description            varchar(500),
    image_url              text,
    status                 varchar(20) NOT NULL CHECK (status IN ('ACTIVE','INACTIVE')),
    PRIMARY KEY (id)
);

CREATE TABLE packages (
    duration_minutes    integer NOT NULL,
    base_price           bigint NOT NULL,
    created_at            timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at            timestamp(6) with time zone NOT NULL DEFAULT now(),
    id                     uuid NOT NULL DEFAULT gen_random_uuid(),
    category               varchar(100),
    name                   varchar(100) NOT NULL,
    description            varchar(500),
    image_url              text,
    status                 varchar(20) NOT NULL CHECK (status IN ('ACTIVE','INACTIVE')),
    PRIMARY KEY (id)
);

CREATE TABLE package_services (
    option_duration_minutes    integer NOT NULL,
    quantity                    integer NOT NULL DEFAULT 1,
    sort_order                  integer NOT NULL DEFAULT 0,
    option_price                 bigint NOT NULL,
    option_id                    uuid NOT NULL REFERENCES services(id),
    package_id                   uuid NOT NULL REFERENCES packages(id),
    option_name                  varchar(100) NOT NULL,
    option_description           varchar(500),
    PRIMARY KEY (option_id, package_id)
);

CREATE TABLE combos (
    duration_days       integer,
    duration_minutes     integer NOT NULL,
    max_usages            integer,
    created_at             timestamp(6) with time zone NOT NULL DEFAULT now(),
    original_price         bigint,
    price                   bigint NOT NULL,
    updated_at              timestamp(6) with time zone NOT NULL DEFAULT now(),
    id                       uuid NOT NULL DEFAULT gen_random_uuid(),
    name                     varchar(100) NOT NULL,
    description              varchar(500),
    image_url                text,
    status                   varchar(20) NOT NULL CHECK (status IN ('ACTIVE','INACTIVE')),
    PRIMARY KEY (id)
);

CREATE TABLE combo_services (
    option_duration_minutes    integer NOT NULL,
    quantity                    integer NOT NULL DEFAULT 1,
    sort_order                  integer NOT NULL DEFAULT 0,
    option_price                 bigint NOT NULL,
    combo_id                     uuid NOT NULL REFERENCES combos(id),
    option_id                    uuid NOT NULL REFERENCES services(id),
    option_name                  varchar(100) NOT NULL,
    option_description           varchar(500),
    PRIMARY KEY (combo_id, option_id)
);

CREATE TABLE customer_combos (
    remaining_usages     integer NOT NULL,
    total_usages          integer NOT NULL,
    activated_at           timestamp(6) with time zone NOT NULL DEFAULT now(),
    created_at              timestamp(6) with time zone NOT NULL DEFAULT now(),
    expires_at              timestamp(6) with time zone NOT NULL,
    combo_id                uuid NOT NULL REFERENCES combos(id),
    customer_id              uuid NOT NULL REFERENCES users(id),
    id                        uuid NOT NULL DEFAULT gen_random_uuid(),
    status                    varchar(20) NOT NULL CHECK (status IN ('ACTIVE','EXPIRED','USED_UP','CANCELLED')),
    PRIMARY KEY (id)
);

-- ============================================================
-- PHẦN 4: DISCOUNTS - GỘP PROMOTION + VOUCHER
-- ============================================================

CREATE TABLE discounts (
    id                       uuid NOT NULL DEFAULT gen_random_uuid(),
    type                      varchar(20) NOT NULL CHECK (type IN ('PROMOTION','VOUCHER')),

    code                      varchar(50) UNIQUE,
    name                      varchar(120) NOT NULL,
    description                text,

    discount_type              varchar(30) NOT NULL CHECK (discount_type IN ('PERCENT','FIXED_AMOUNT','FREE_SERVICE','NONE')),
    discount_value              bigint NOT NULL DEFAULT 0,
    min_order_amount            bigint NOT NULL DEFAULT 0,
    max_discount_amount          bigint,

    required_points              integer NOT NULL DEFAULT 0,
    valid_days_after_claim        integer,

    targeting_mode                varchar(30) NOT NULL DEFAULT 'ALL_TIERS' CHECK (targeting_mode IN ('ALL_TIERS','SPECIFIC_TIERS')),
    new_customer_only              boolean NOT NULL DEFAULT false,

    usage_limit                    integer,
    used_count                      integer NOT NULL DEFAULT 0,

    start_at                        timestamp(6) with time zone NOT NULL,
    end_at                          timestamp(6) with time zone NOT NULL,
    status                          varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),

    created_at                      timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at                      timestamp(6) with time zone NOT NULL DEFAULT now(),

    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uq_discounts_code ON discounts (code) WHERE code IS NOT NULL;
CREATE INDEX idx_discounts_type ON discounts (type);
CREATE INDEX idx_discounts_status ON discounts (status);
CREATE INDEX idx_discounts_start_end ON discounts (start_at, end_at);

CREATE TABLE discount_tiers (
    discount_id   uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    tier           varchar(50) NOT NULL REFERENCES tier_configs(tier),
    PRIMARY KEY (discount_id, tier)
);

CREATE TABLE discount_applicable_services (
    discount_id   uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    service_id     uuid NOT NULL REFERENCES services(id),
    PRIMARY KEY (discount_id, service_id)
);

-- Bảng hiển thị UI "đổi voucher theo tier"
CREATE TABLE tier_voucher_offers (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    discount_id        uuid NOT NULL REFERENCES discounts(id),

    points_cost         integer NOT NULL CHECK (points_cost >= 0),
    voucher_value        integer NOT NULL CHECK (voucher_value > 0),
    created_at            timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at            timestamp(6) with time zone NOT NULL DEFAULT now(),
    accent                varchar(20) NOT NULL,
    badge                 varchar(20) NOT NULL,
    min_tier               varchar(50) NOT NULL REFERENCES tier_configs(tier),
    title                   varchar(100) NOT NULL,

    PRIMARY KEY (id)
);

CREATE INDEX idx_tier_voucher_offers_discount_id ON tier_voucher_offers (discount_id);
CREATE INDEX idx_tier_voucher_offers_min_tier ON tier_voucher_offers (min_tier);


-- ============================================================
-- PHẦN 5: BOOKINGS
-- ============================================================

CREATE TABLE bookings (
    reminder_sent         boolean NOT NULL DEFAULT false,
    created_at              timestamp(6) with time zone NOT NULL DEFAULT now(),
    scheduled_at             timestamp(6) with time zone NOT NULL,
    updated_at               timestamp(6) with time zone NOT NULL DEFAULT now(),
    assigned_staff_id         uuid REFERENCES users(id),
    customer_id                uuid NOT NULL REFERENCES users(id),
    id                           uuid NOT NULL DEFAULT gen_random_uuid(),
    vehicle_id                   uuid NOT NULL REFERENCES vehicles(id),
    cancel_reason                 varchar(500),
    confirmation_email             varchar(255),
    note                           varchar(1000),
    status                          varchar(30) NOT NULL CHECK (status IN ('PENDING','CONFIRMED','CHECKED_IN','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW')),
    booking_type                    varchar(30) NOT NULL DEFAULT 'PACKAGE',
    PRIMARY KEY (id)
);

CREATE INDEX idx_bookings_customer_id ON bookings (customer_id);
CREATE INDEX idx_bookings_vehicle_id ON bookings (vehicle_id);
CREATE INDEX idx_bookings_assigned_staff_id ON bookings (assigned_staff_id);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_scheduled_at ON bookings (scheduled_at);

CREATE TABLE point_transactions (
    balance_after       integer NOT NULL,
    points               integer NOT NULL,
    created_at            timestamp(6) with time zone NOT NULL DEFAULT now(),
    id                     bigint GENERATED BY DEFAULT AS IDENTITY,
    booking_id             uuid REFERENCES bookings(id),
    loyalty_account_id     uuid NOT NULL REFERENCES loyalty_accounts(id),
    reason                 varchar(255) NOT NULL,
    type                   varchar(20) NOT NULL CHECK (type IN ('EARN','REDEEM','EXPIRE','ADJUST')),
    PRIMARY KEY (id)
);

CREATE INDEX idx_point_transactions_loyalty_account_id ON point_transactions (loyalty_account_id);
CREATE INDEX idx_point_transactions_booking_id ON point_transactions (booking_id);

CREATE TABLE customer_combo_usages (
    id                    bigint GENERATED BY DEFAULT AS IDENTITY,
    used_at                timestamp(6) with time zone NOT NULL DEFAULT now(),
    booking_id              uuid NOT NULL UNIQUE REFERENCES bookings(id),
    customer_combo_id       uuid NOT NULL REFERENCES customer_combos(id),
    PRIMARY KEY (id)
);

-- "Ví" voucher/promotion của từng khách hàng (thay user_vouchers + booking_promotions)
CREATE TABLE user_discounts (
    id                     uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES users(id),
    discount_id              uuid NOT NULL REFERENCES discounts(id),

    acquisition_method        varchar(20) NOT NULL CHECK (acquisition_method IN ('ADMIN_GRANTED','AUTO_ELIGIBLE','POINT_REDEEMED')),
    points_spent               integer NOT NULL DEFAULT 0,

    claimed_at                  timestamp(6) with time zone NOT NULL DEFAULT now(),
    expires_at                   timestamp(6) with time zone,
    status                       varchar(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','USED','EXPIRED','FORFEITED')),

    used_at                       timestamp(6) with time zone,
    used_in_booking_id             uuid REFERENCES bookings(id),

    PRIMARY KEY (id)
);

CREATE INDEX idx_user_discounts_user_id ON user_discounts (user_id);
CREATE INDEX idx_user_discounts_discount_id ON user_discounts (discount_id);
CREATE INDEX idx_user_discounts_status ON user_discounts (status);
CREATE INDEX idx_user_discounts_used_booking ON user_discounts (used_in_booking_id);

-- Danh sách dịch vụ được đặt (thay booking_options), polymorphic: PACKAGE/COMBO/ADDON, có snapshot
CREATE TABLE booking_details (
    id                    uuid NOT NULL DEFAULT gen_random_uuid(),
    booking_id             uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

    item_type                varchar(20) NOT NULL CHECK (item_type IN ('PACKAGE','COMBO','ADDON')),
    ref_id                    uuid NOT NULL,

    snapshot_name              varchar(100) NOT NULL,
    snapshot_price               bigint NOT NULL CHECK (snapshot_price >= 0),

    quantity                      integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    subtotal                        bigint NOT NULL CHECK (subtotal >= 0) CHECK (subtotal = snapshot_price * quantity),

    duration_minutes                 integer NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    sort_order                        integer NOT NULL DEFAULT 0,

    created_at                          timestamp(6) with time zone NOT NULL DEFAULT now(),

    PRIMARY KEY (id)
);

CREATE INDEX idx_booking_details_booking_id ON booking_details (booking_id);
CREATE INDEX idx_booking_details_ref_id ON booking_details (ref_id);
CREATE INDEX idx_booking_details_item_type ON booking_details (item_type);

-- Mỗi booking chỉ tối đa 1 dòng PACKAGE hoặc COMBO; ADDON không giới hạn số dòng
CREATE UNIQUE INDEX uq_one_primary_item_per_booking
ON booking_details (booking_id)
WHERE item_type IN ('PACKAGE', 'COMBO');

-- Tổng hợp tài chính - quan hệ 1-1 với bookings
CREATE TABLE booking_pricing (
    booking_id                     uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

    subtotal                         bigint NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    estimated_duration_minutes         integer NOT NULL DEFAULT 0 CHECK (estimated_duration_minutes >= 0),

    discount_type                       varchar(20) CHECK (discount_type IN ('VOUCHER','PROMOTION')),
    discount_ref_id                       uuid,
    discount_ref_snapshot                  varchar(255),
    discount_amount                          bigint NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),

    final_amount                               bigint NOT NULL DEFAULT 0 CHECK (final_amount >= 0) CHECK (final_amount = subtotal - discount_amount),

    updated_at                                   timestamp(6) with time zone NOT NULL DEFAULT now(),

    CHECK (
        (discount_type IS NULL AND discount_ref_id IS NULL)
        OR
        (discount_type IS NOT NULL AND discount_ref_id IS NOT NULL)
    ),

    PRIMARY KEY (booking_id)
);

CREATE TABLE booking_status_histories (
    changed_at    timestamp(6) with time zone NOT NULL DEFAULT now(),
    id             bigint GENERATED BY DEFAULT AS IDENTITY,
    booking_id      uuid NOT NULL REFERENCES bookings(id),
    changed_by       uuid REFERENCES users(id),
    new_status         varchar(30) NOT NULL,
    old_status          varchar(30),
    reason               varchar(255),
    PRIMARY KEY (id)
);

CREATE INDEX idx_booking_status_histories_booking_id ON booking_status_histories (booking_id);

CREATE TABLE wash_sessions (
    id                     uuid NOT NULL DEFAULT gen_random_uuid(),
    booking_id              uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    assigned_staff_id        uuid REFERENCES users(id) ON DELETE SET NULL,
    fee_amount                bigint,
    projected_points           integer,
    awarded_points              integer,
    checked_in_at                timestamp(6) with time zone,
    started_at                    timestamp(6) with time zone,
    completed_at                    timestamp(6) with time zone,
    cancelled_at                     timestamp(6) with time zone,
    created_at                        timestamp(6) with time zone NOT NULL DEFAULT now(),
    cancel_fault_type                 varchar(30) CHECK (cancel_fault_type IN ('CARWASH_FAULT','CUSTOMER_FAULT')),
    cancel_reason                       varchar(500),
    notes                                text,
    status                                varchar(20) NOT NULL CHECK (status IN ('PENDING','QUEUED','CHECKED_IN','IN_PROGRESS','COMPLETED','CANCELLED')),
    PRIMARY KEY (id)
);

CREATE INDEX idx_wash_sessions_booking_id ON wash_sessions (booking_id);
CREATE INDEX idx_wash_sessions_assigned_staff_id ON wash_sessions (assigned_staff_id);
CREATE INDEX idx_wash_sessions_status ON wash_sessions (status);

CREATE TABLE payments (
    amount              bigint NOT NULL,
    created_at            timestamp(6) with time zone NOT NULL DEFAULT now(),
    paid_at                timestamp(6) with time zone,
    booking_id               uuid NOT NULL UNIQUE REFERENCES bookings(id),
    id                         uuid NOT NULL DEFAULT gen_random_uuid(),
    transaction_ref              varchar(120),
    method                          varchar(30) NOT NULL CHECK (method IN ('CASH_AT_COUNTER','BANK_TRANSFER','E_WALLET')),
    status                           varchar(20) NOT NULL CHECK (status IN ('UNPAID','PENDING','PENDING_PAYMENT','PAID','FAILED','CANCELLED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUND_FAILED','REFUNDED')),
    PRIMARY KEY (id)
);

CREATE TABLE reviews (
    is_featured       boolean NOT NULL DEFAULT false,
    rating              integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at            timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at              timestamp(6) with time zone NOT NULL DEFAULT now(),
    booking_id                uuid NOT NULL UNIQUE REFERENCES bookings(id),
    customer_id                 uuid NOT NULL REFERENCES users(id),
    id                            uuid NOT NULL DEFAULT gen_random_uuid(),
    after_image_url                 varchar(500),
    before_image_url                  varchar(500),
    comment                             text,
    PRIMARY KEY (id)
);

CREATE TABLE violation_records (
    penalty_points     integer NOT NULL DEFAULT 0,
    created_at            timestamp(6) with time zone NOT NULL DEFAULT now(),
    booking_id              uuid NOT NULL REFERENCES bookings(id),
    customer_id               uuid NOT NULL REFERENCES users(id),
    id                          uuid NOT NULL DEFAULT gen_random_uuid(),
    type                          varchar(30) NOT NULL,
    note                            varchar(500),
    PRIMARY KEY (id)
);

CREATE TABLE slot_holds (
    created_at     timestamp(6) with time zone NOT NULL DEFAULT now(),
    expires_at       timestamp(6) with time zone NOT NULL,
    slot_time          timestamp(6) with time zone NOT NULL,
    customer_id           uuid NOT NULL REFERENCES users(id),
    id                      uuid NOT NULL DEFAULT gen_random_uuid(),
    PRIMARY KEY (id)
);


-- ============================================================
-- PHẦN 6: BLOG
-- ============================================================

CREATE TABLE blog_categories (
    created_at     timestamp(6) with time zone NOT NULL DEFAULT now(),
    id               uuid NOT NULL DEFAULT gen_random_uuid(),
    name               varchar(100) NOT NULL,
    slug                 varchar(100) NOT NULL UNIQUE,
    description             varchar(500),
    PRIMARY KEY (id)
);

CREATE TABLE blog_articles (
    view_count       integer NOT NULL DEFAULT 0,
    created_at         timestamp(6) with time zone NOT NULL DEFAULT now(),
    published_at         timestamp(6) with time zone,
    updated_at              timestamp(6) with time zone NOT NULL DEFAULT now(),
    author_id                 uuid NOT NULL REFERENCES users(id),
    category_id                 uuid NOT NULL REFERENCES blog_categories(id),
    id                             uuid NOT NULL DEFAULT gen_random_uuid(),
    status                           varchar(20) NOT NULL CHECK (status IN ('DRAFT','PUBLISHED','HIDDEN')),
    excerpt                            varchar(500),
    thumbnail_url                        varchar(500),
    content                                 text NOT NULL,
    slug                                     varchar(255) NOT NULL UNIQUE,
    title                                      varchar(255) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE blog_comments (
    created_at     timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at       timestamp(6) with time zone NOT NULL DEFAULT now(),
    article_id         uuid NOT NULL REFERENCES blog_articles(id),
    customer_id           uuid NOT NULL REFERENCES users(id),
    id                      uuid NOT NULL DEFAULT gen_random_uuid(),
    content                   text NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE blog_likes (
    created_at     timestamp(6) with time zone NOT NULL DEFAULT now(),
    article_id       uuid NOT NULL REFERENCES blog_articles(id),
    customer_id         uuid NOT NULL REFERENCES users(id),
    id                    uuid NOT NULL DEFAULT gen_random_uuid(),
    PRIMARY KEY (id)
);


-- ============================================================
-- PHẦN 7: NOTIFICATIONS & SYSTEM
-- ============================================================

CREATE TABLE announcements (
    active         boolean NOT NULL DEFAULT true,
    priority         integer NOT NULL DEFAULT 0,
    created_at         timestamp(6) with time zone NOT NULL DEFAULT now(),
    expires_at           timestamp(6) with time zone,
    updated_at             timestamp(6) with time zone NOT NULL DEFAULT now(),
    id                       uuid NOT NULL DEFAULT gen_random_uuid(),
    type                       varchar(30) NOT NULL,
    link_label                   varchar(100),
    link_url                       varchar(500),
    message                          text,
    title                              varchar(255) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE notification_campaigns (
    failed_count       integer NOT NULL DEFAULT 0,
    success_count         integer NOT NULL DEFAULT 0,
    created_at               timestamp(6) with time zone NOT NULL DEFAULT now(),
    scheduled_at                timestamp(6) with time zone,
    sent_at                        timestamp(6) with time zone,
    updated_at                       timestamp(6) with time zone NOT NULL DEFAULT now(),
    id                                  uuid NOT NULL DEFAULT gen_random_uuid(),
    status                                varchar(20) NOT NULL CHECK (status IN ('DRAFT','SCHEDULED','SENDING','COMPLETED','FAILED')),
    target_audience                         varchar(30) NOT NULL CHECK (target_audience IN ('ALL_CUSTOMERS','TIER_BRONZE','TIER_SILVER','TIER_GOLD','TIER_PLATINUM','TIER_DIAMOND','INDIVIDUALS')),
    type                                       varchar(30) NOT NULL CHECK (type IN ('BOOKING_CREATED','BOOKING_CONFIRMED','WASH_CHECKED_IN','WASH_COMPLETED','BOOKING_REMINDER','NO_SHOW','LOYALTY','VOUCHER_EXPIRY','SYSTEM','PROMOTION')),
    title                                        varchar(150) NOT NULL,
    message                                        text NOT NULL,
    target_details                                   text,
    PRIMARY KEY (id)
);

CREATE TABLE notifications (
    is_read       boolean NOT NULL DEFAULT false,
    created_at       timestamp(6) with time zone NOT NULL DEFAULT now(),
    campaign_id         uuid REFERENCES notification_campaigns(id),
    id                     uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id                  uuid NOT NULL REFERENCES users(id),
    type                       varchar(30) NOT NULL CHECK (type IN ('BOOKING_CREATED','BOOKING_CONFIRMED','WASH_CHECKED_IN','WASH_COMPLETED','BOOKING_REMINDER','NO_SHOW','LOYALTY','VOUCHER_EXPIRY','SYSTEM','PROMOTION')),
    title                       varchar(150) NOT NULL,
    message                       varchar(255) NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX idx_notifications_user_id ON notifications (user_id);

CREATE TABLE system_settings (
    earn_points_unit_amount        integer NOT NULL,
    id                                integer NOT NULL,
    max_advance_booking_days           integer NOT NULL,
    max_bookings_per_time_slot           integer NOT NULL,
    no_show_grace_minutes                  integer NOT NULL,
    redemption_voucher_expiration_days       integer NOT NULL,
    operating_end_time                         varchar(5) NOT NULL,
    operating_start_time                         varchar(5) NOT NULL,
    updated_at                                     timestamp(6) with time zone NOT NULL DEFAULT now(),
    currency                                         varchar(10) NOT NULL,
    PRIMARY KEY (id)
);

INSERT INTO system_settings (
    id,
    operating_start_time,
    operating_end_time,
    max_advance_booking_days,
    no_show_grace_minutes,
    max_bookings_per_time_slot,
    currency,
    earn_points_unit_amount,
    redemption_voucher_expiration_days
) VALUES (
    1,
    '08:00',
    '20:00',
    30,
    15,
    3,
    'VND',
    10000,
    30
) ON CONFLICT (id) DO NOTHING;

CREATE TABLE manager_operation_settings (
    id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    auto_assign_enabled boolean NOT NULL DEFAULT true,
    least_busy_staff_first boolean NOT NULL DEFAULT true,
    respect_staff_capacity boolean NOT NULL DEFAULT true,
    max_active_sessions_per_staff integer NOT NULL DEFAULT 4 CHECK (max_active_sessions_per_staff BETWEEN 1 AND 12),
    weekly_staff_kpi_target integer NOT NULL DEFAULT 40 CHECK (weekly_staff_kpi_target BETWEEN 1 AND 200),
    paid_booking_priority boolean NOT NULL DEFAULT true,
    tier_priority_enabled boolean NOT NULL DEFAULT true,
    primary_vehicle_priority boolean NOT NULL DEFAULT true,
    early_check_in_minutes integer NOT NULL DEFAULT 15 CHECK (early_check_in_minutes BETWEEN 0 AND 180),
    late_grace_minutes integer NOT NULL DEFAULT 20 CHECK (late_grace_minutes BETWEEN 0 AND 180),
    waiting_alert_minutes integer NOT NULL DEFAULT 12 CHECK (waiting_alert_minutes BETWEEN 1 AND 120),
    delay_alert_minutes integer NOT NULL DEFAULT 25 CHECK (delay_alert_minutes BETWEEN 1 AND 180),
    overload_alert_sessions integer NOT NULL DEFAULT 4 CHECK (overload_alert_sessions BETWEEN 1 AND 12),
    cancellation_rate_alert integer NOT NULL DEFAULT 18 CHECK (cancellation_rate_alert BETWEEN 1 AND 100),
    notify_new_booking boolean NOT NULL DEFAULT true,
    notify_delayed_session boolean NOT NULL DEFAULT true,
    notify_staff_transfer boolean NOT NULL DEFAULT true,
    notify_completion boolean NOT NULL DEFAULT false,
    created_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(6) with time zone NOT NULL DEFAULT now()
);

INSERT INTO manager_operation_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE manager_notification_templates (
    template_key varchar(50) PRIMARY KEY,
    display_name varchar(100) NOT NULL,
    description varchar(255) NOT NULL,
    message text NOT NULL,
    preview text NOT NULL,
    created_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(6) with time zone NOT NULL DEFAULT now()
);

INSERT INTO manager_notification_templates (template_key, display_name, description, message, preview)
VALUES
    (
        'newBooking',
        'New booking',
        'Sent when a booking is waiting for manager intake.',
        'A new booking is waiting for manager intake. Please review the queue and create a wash session.',
        'Example: Vehicle 51F-456.89 - Ultimate Detail is waiting for intake.'
    ),
    (
        'delay',
        'Delayed session',
        'Sent when a wash session exceeds the configured delay threshold.',
        'A wash session is taking longer than expected. Please review bay progress and update the customer if needed.',
        'Example: Vehicle 51F-456.89 is taking longer than expected.'
    ),
    (
        'transfer',
        'Staff transfer',
        'Sent when a manager transfers a wash session to another staff member.',
        'A wash session has been reassigned to another staff member. Please continue tracking the handover.',
        'Example: Vehicle 51F-456.89 has been reassigned to Le Van Hai.'
    )
ON CONFLICT (template_key) DO NOTHING;

CREATE TABLE manager_setting_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
    title varchar(150) NOT NULL,
    detail text NOT NULL,
    created_at timestamp(6) with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_manager_setting_audit_logs_actor_id ON manager_setting_audit_logs (actor_id);
CREATE INDEX idx_manager_setting_audit_logs_created_at ON manager_setting_audit_logs (created_at DESC);


-- ============================================================
-- PHẦN 8: TRIGGERS - Tự động cập nhật updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_booking_pricing_updated_at BEFORE UPDATE ON booking_pricing FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_discounts_updated_at BEFORE UPDATE ON discounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tier_voucher_offers_updated_at BEFORE UPDATE ON tier_voucher_offers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_combos_updated_at BEFORE UPDATE ON combos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_blog_articles_updated_at BEFORE UPDATE ON blog_articles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_loyalty_accounts_updated_at BEFORE UPDATE ON loyalty_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_manager_operation_settings_updated_at BEFORE UPDATE ON manager_operation_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_manager_notification_templates_updated_at BEFORE UPDATE ON manager_notification_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- HẾT FILE
-- ============================================================
