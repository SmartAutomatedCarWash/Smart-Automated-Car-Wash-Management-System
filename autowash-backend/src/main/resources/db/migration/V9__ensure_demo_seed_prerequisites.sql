CREATE TABLE IF NOT EXISTS users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    full_name varchar(120) NOT NULL,
    phone varchar(20),
    email varchar(255) NOT NULL,
    password_hash varchar(255) NOT NULL,
    role varchar(20) NOT NULL DEFAULT 'CUSTOMER',
    status varchar(20) NOT NULL DEFAULT 'ACTIVE',
    avatar_url varchar(500),
    date_of_birth date,
    created_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name varchar(120) NOT NULL DEFAULT 'Demo User';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone varchar(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email varchar(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash varchar(255) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar(20) NOT NULL DEFAULT 'CUSTOMER';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url varchar(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamp(6) with time zone NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamp(6) with time zone NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (email);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language varchar(10) NOT NULL DEFAULT 'VI',
    theme varchar(20) NOT NULL DEFAULT 'LIGHT',
    notifications_enabled boolean NOT NULL DEFAULT true,
    email_notifications boolean NOT NULL DEFAULT true,
    sms_notifications boolean NOT NULL DEFAULT true,
    PRIMARY KEY (user_id)
);

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS language varchar(10) NOT NULL DEFAULT 'VI';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS theme varchar(20) NOT NULL DEFAULT 'LIGHT';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS sms_notifications boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS tier_configs (
    tier varchar(50) NOT NULL,
    display_name varchar(80) NOT NULL,
    min_points integer NOT NULL DEFAULT 0,
    point_multiplier numeric(5,2) NOT NULL DEFAULT 1.00,
    priority_score integer NOT NULL DEFAULT 0,
    rank_order integer NOT NULL DEFAULT 0,
    system_tier boolean NOT NULL DEFAULT true,
    active boolean NOT NULL DEFAULT true,
    image_url varchar(500),
    PRIMARY KEY (tier)
);

ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS display_name varchar(80) NOT NULL DEFAULT 'Tier';
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS min_points integer NOT NULL DEFAULT 0;
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS point_multiplier numeric(5,2) NOT NULL DEFAULT 1.00;
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS priority_score integer NOT NULL DEFAULT 0;
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS rank_order integer NOT NULL DEFAULT 0;
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS system_tier boolean NOT NULL DEFAULT true;
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS image_url varchar(500);

CREATE TABLE IF NOT EXISTS loyalty_accounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES users(id),
    tier varchar(50) NOT NULL REFERENCES tier_configs(tier),
    current_points integer NOT NULL DEFAULT 0,
    total_earned_points integer NOT NULL DEFAULT 0,
    created_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE loyalty_accounts ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES users(id);
ALTER TABLE loyalty_accounts ADD COLUMN IF NOT EXISTS tier varchar(50) REFERENCES tier_configs(tier);
ALTER TABLE loyalty_accounts ADD COLUMN IF NOT EXISTS current_points integer NOT NULL DEFAULT 0;
ALTER TABLE loyalty_accounts ADD COLUMN IF NOT EXISTS total_earned_points integer NOT NULL DEFAULT 0;
ALTER TABLE loyalty_accounts ADD COLUMN IF NOT EXISTS created_at timestamp(6) with time zone NOT NULL DEFAULT now();
ALTER TABLE loyalty_accounts ADD COLUMN IF NOT EXISTS updated_at timestamp(6) with time zone NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS uq_loyalty_accounts_customer_id ON loyalty_accounts (customer_id);

CREATE TABLE IF NOT EXISTS services (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name varchar(100) NOT NULL,
    description text,
    price bigint NOT NULL DEFAULT 0,
    duration_minutes integer NOT NULL DEFAULT 0,
    status varchar(20) NOT NULL DEFAULT 'ACTIVE',
    image_url varchar(500),
    created_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE services ADD COLUMN IF NOT EXISTS name varchar(100) NOT NULL DEFAULT 'Service';
ALTER TABLE services ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS price bigint NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url varchar(500);
ALTER TABLE services ADD COLUMN IF NOT EXISTS created_at timestamp(6) with time zone NOT NULL DEFAULT now();
ALTER TABLE services ADD COLUMN IF NOT EXISTS updated_at timestamp(6) with time zone NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS packages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name varchar(100) NOT NULL,
    description text,
    base_price bigint NOT NULL DEFAULT 0,
    duration_minutes integer NOT NULL DEFAULT 0,
    category varchar(50),
    status varchar(20) NOT NULL DEFAULT 'ACTIVE',
    image_url varchar(500),
    created_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE packages ADD COLUMN IF NOT EXISTS name varchar(100) NOT NULL DEFAULT 'Package';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS base_price bigint NOT NULL DEFAULT 0;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS category varchar(50);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_url varchar(500);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS created_at timestamp(6) with time zone NOT NULL DEFAULT now();
ALTER TABLE packages ADD COLUMN IF NOT EXISTS updated_at timestamp(6) with time zone NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS package_services (
    package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    option_id uuid NOT NULL REFERENCES services(id),
    option_name varchar(100) NOT NULL,
    option_description text,
    option_price bigint NOT NULL DEFAULT 0,
    option_duration_minutes integer NOT NULL DEFAULT 0,
    quantity integer NOT NULL DEFAULT 1,
    sort_order integer NOT NULL DEFAULT 0,
    PRIMARY KEY (option_id, package_id)
);

ALTER TABLE package_services ADD COLUMN IF NOT EXISTS option_name varchar(100) NOT NULL DEFAULT 'Package service';
ALTER TABLE package_services ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES packages(id) ON DELETE CASCADE;
ALTER TABLE package_services ADD COLUMN IF NOT EXISTS option_id uuid REFERENCES services(id);
ALTER TABLE package_services ADD COLUMN IF NOT EXISTS option_description text;
ALTER TABLE package_services ADD COLUMN IF NOT EXISTS option_price bigint NOT NULL DEFAULT 0;
ALTER TABLE package_services ADD COLUMN IF NOT EXISTS option_duration_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE package_services ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;
ALTER TABLE package_services ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_package_services_option_package ON package_services (option_id, package_id);

CREATE TABLE IF NOT EXISTS combos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name varchar(100) NOT NULL,
    description text,
    price bigint NOT NULL DEFAULT 0,
    original_price bigint NOT NULL DEFAULT 0,
    duration_minutes integer NOT NULL DEFAULT 0,
    duration_days integer NOT NULL DEFAULT 30,
    max_usages integer NOT NULL DEFAULT 1,
    status varchar(20) NOT NULL DEFAULT 'ACTIVE',
    image_url varchar(500),
    created_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE combos ADD COLUMN IF NOT EXISTS name varchar(100) NOT NULL DEFAULT 'Combo';
ALTER TABLE combos ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE combos ADD COLUMN IF NOT EXISTS price bigint NOT NULL DEFAULT 0;
ALTER TABLE combos ADD COLUMN IF NOT EXISTS original_price bigint NOT NULL DEFAULT 0;
ALTER TABLE combos ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE combos ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 30;
ALTER TABLE combos ADD COLUMN IF NOT EXISTS max_usages integer NOT NULL DEFAULT 1;
ALTER TABLE combos ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE combos ADD COLUMN IF NOT EXISTS image_url varchar(500);
ALTER TABLE combos ADD COLUMN IF NOT EXISTS created_at timestamp(6) with time zone NOT NULL DEFAULT now();
ALTER TABLE combos ADD COLUMN IF NOT EXISTS updated_at timestamp(6) with time zone NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS combo_services (
    combo_id uuid NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    option_id uuid NOT NULL REFERENCES services(id),
    option_name varchar(100) NOT NULL,
    option_description text,
    option_price bigint NOT NULL DEFAULT 0,
    option_duration_minutes integer NOT NULL DEFAULT 0,
    quantity integer NOT NULL DEFAULT 1,
    sort_order integer NOT NULL DEFAULT 0,
    PRIMARY KEY (option_id, combo_id)
);

ALTER TABLE combo_services ADD COLUMN IF NOT EXISTS option_name varchar(100) NOT NULL DEFAULT 'Combo service';
ALTER TABLE combo_services ADD COLUMN IF NOT EXISTS combo_id uuid REFERENCES combos(id) ON DELETE CASCADE;
ALTER TABLE combo_services ADD COLUMN IF NOT EXISTS option_id uuid REFERENCES services(id);
ALTER TABLE combo_services ADD COLUMN IF NOT EXISTS option_description text;
ALTER TABLE combo_services ADD COLUMN IF NOT EXISTS option_price bigint NOT NULL DEFAULT 0;
ALTER TABLE combo_services ADD COLUMN IF NOT EXISTS option_duration_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE combo_services ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;
ALTER TABLE combo_services ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_combo_services_option_combo ON combo_services (option_id, combo_id);

CREATE TABLE IF NOT EXISTS vehicles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES users(id),
    plate varchar(30) NOT NULL,
    type varchar(30) NOT NULL,
    brand varchar(80),
    model varchar(80),
    vehicle_year integer,
    color varchar(40),
    is_primary boolean NOT NULL DEFAULT false,
    status varchar(20) NOT NULL DEFAULT 'ACTIVE',
    created_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES users(id);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS plate varchar(30) NOT NULL DEFAULT 'DEMO';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS type varchar(30) NOT NULL DEFAULT 'CAR';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS brand varchar(80);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model varchar(80);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_year integer;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color varchar(40);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_at timestamp(6) with time zone NOT NULL DEFAULT now();
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at timestamp(6) with time zone NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS customer_combos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES users(id),
    combo_id uuid NOT NULL REFERENCES combos(id),
    total_usages integer NOT NULL DEFAULT 0,
    remaining_usages integer NOT NULL DEFAULT 0,
    activated_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    expires_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    status varchar(20) NOT NULL DEFAULT 'ACTIVE',
    created_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE customer_combos ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES users(id);
ALTER TABLE customer_combos ADD COLUMN IF NOT EXISTS combo_id uuid REFERENCES combos(id);
ALTER TABLE customer_combos ADD COLUMN IF NOT EXISTS total_usages integer NOT NULL DEFAULT 0;
ALTER TABLE customer_combos ADD COLUMN IF NOT EXISTS remaining_usages integer NOT NULL DEFAULT 0;
ALTER TABLE customer_combos ADD COLUMN IF NOT EXISTS activated_at timestamp(6) with time zone NOT NULL DEFAULT now();
ALTER TABLE customer_combos ADD COLUMN IF NOT EXISTS expires_at timestamp(6) with time zone NOT NULL DEFAULT now();
ALTER TABLE customer_combos ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE customer_combos ADD COLUMN IF NOT EXISTS created_at timestamp(6) with time zone NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS customer_combo_usages (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    customer_combo_id uuid NOT NULL REFERENCES customer_combos(id),
    booking_id uuid,
    used_at timestamp(6) with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE customer_combo_usages ADD COLUMN IF NOT EXISTS customer_combo_id uuid REFERENCES customer_combos(id);
ALTER TABLE customer_combo_usages ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE customer_combo_usages ADD COLUMN IF NOT EXISTS used_at timestamp(6) with time zone NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_combo_usages_booking_id ON customer_combo_usages (booking_id);
