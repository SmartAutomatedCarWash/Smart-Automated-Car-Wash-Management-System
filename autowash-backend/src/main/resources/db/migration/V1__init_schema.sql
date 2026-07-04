

CREATE TABLE "users" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "full_name" varchar(100) NOT NULL,
  "phone" varchar(20) UNIQUE,
  "email" varchar(255) UNIQUE,
  "password_hash" varchar(255),
  "role" varchar(20) NOT NULL CHECK ("role" IN ('CUSTOMER', 'STAFF', 'ADMIN')),
  "status" varchar(20) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'ACTIVE', 'BLOCKED', 'SUSPENDED', 'INACTIVE')),
  "avatar_url" varchar(500),
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "user_preferences" (
  "user_id" uuid PRIMARY KEY,
  "language" varchar(10) NOT NULL DEFAULT 'VI',
  "theme" varchar(20) NOT NULL DEFAULT 'LIGHT',
  "notifications_enabled" boolean NOT NULL DEFAULT true,
  "email_notifications" boolean NOT NULL DEFAULT false,
  "sms_notifications" boolean NOT NULL DEFAULT true
);

CREATE TABLE "refresh_tokens" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "token" varchar(255) UNIQUE NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "otp_verifications" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "user_id" uuid,
  "purpose" varchar(50) NOT NULL CHECK ("purpose" IN ('REGISTRATION', 'EMAIL_REGISTRATION', 'PASSWORD_RESET', 'BOOKING_CONFIRMATION')),
  "code_hash" varchar(255) NOT NULL,
  "delivery_address" varchar(255) NOT NULL,
  "attempts" int NOT NULL DEFAULT 0 CHECK ("attempts" >= 0),
  "expires_at" timestamp with time zone NOT NULL,
  "verified_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "user_oauth_accounts" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "provider" varchar(30) NOT NULL CHECK ("provider" IN ('GOOGLE')),
  "provider_user_id" varchar(255) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CONSTRAINT "uq_oauth_user_provider" UNIQUE ("user_id", "provider"),
  CONSTRAINT "uq_oauth_provider_uid" UNIQUE ("provider", "provider_user_id")
);

CREATE TABLE "google_auth_tickets" (
  "state" varchar(255) PRIMARY KEY,
  "status" varchar(30) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'LINK_REQUIRED', 'READY', 'CONSUMED', 'EXPIRED')),
  "provider_email" varchar(255),
  "provider_full_name" varchar(150),
  "provider_avatar_url" varchar(500),
  "provider_subject" varchar(255),
  "return_url" varchar(1000) NOT NULL,
  "user_id" uuid,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "consumed_at" timestamp with time zone
);

CREATE TABLE "vehicles" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "customer_id" uuid NOT NULL,
  "plate" varchar(20) UNIQUE NOT NULL,
  "type" varchar(30) NOT NULL,
  "brand" varchar(50) NOT NULL,
  "model" varchar(50) NOT NULL,
  "vehicle_year" int NOT NULL,
  "color" varchar(30),
  "is_primary" boolean NOT NULL DEFAULT false,
  "status" varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'DELETED')),
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "packages" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "base_price" bigint NOT NULL,
  "duration_minutes" int NOT NULL,
  "image_url" varchar(500),
  "status" varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK ("base_price" >= 0),
  CHECK ("duration_minutes" > 0)
);

CREATE TABLE "services" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "price" bigint NOT NULL,
  "duration_minutes" int NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK ("price" >= 0),
  CHECK ("duration_minutes" >= 0)
);

CREATE TABLE "package_services" (
  "package_id" uuid NOT NULL,
  "option_id" uuid NOT NULL,
  "option_name" varchar(100) NOT NULL,
  "option_description" varchar(500),
  "option_price" bigint NOT NULL,
  "option_duration_minutes" int NOT NULL,
  "quantity" int NOT NULL DEFAULT 1,
  "sort_order" int NOT NULL DEFAULT 0,
  CHECK ("option_price" >= 0),
  CHECK ("option_duration_minutes" >= 0),
  CHECK ("quantity" > 0),
  PRIMARY KEY ("package_id", "option_id")
);

CREATE TABLE "combos" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "price" bigint NOT NULL,
  "original_price" bigint,
  "duration_minutes" int NOT NULL,
  "duration_days" int,
  "max_usages" int,
  "image_url" varchar(500),
  "status" varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK ("price" >= 0),
  CHECK ("original_price" IS NULL OR "original_price" >= 0),
  CHECK ("duration_minutes" > 0),
  CHECK ("duration_days" IS NULL OR "duration_days" > 0),
  CHECK ("max_usages" IS NULL OR "max_usages" > 0)
);

CREATE TABLE "combo_services" (
  "combo_id" uuid NOT NULL,
  "option_id" uuid NOT NULL,
  "option_name" varchar(100) NOT NULL,
  "option_description" varchar(500),
  "option_price" bigint NOT NULL,
  "option_duration_minutes" int NOT NULL,
  "quantity" int NOT NULL DEFAULT 1,
  "sort_order" int NOT NULL DEFAULT 0,
  CHECK ("option_price" >= 0),
  CHECK ("option_duration_minutes" >= 0),
  CHECK ("quantity" > 0),
  PRIMARY KEY ("combo_id", "option_id")
);

CREATE TABLE "vouchers" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "code" varchar(50) UNIQUE NOT NULL,
  "name" varchar(120) NOT NULL,
  "discount_type" varchar(20) NOT NULL CHECK ("discount_type" IN ('PERCENT', 'FIXED_AMOUNT')),
  "discount_value" bigint NOT NULL,
  "min_order_amount" bigint NOT NULL DEFAULT 0,
  "max_discount_amount" bigint,
  "usage_limit" int,
  "used_count" int NOT NULL DEFAULT 0,
  "new_customer_only" boolean NOT NULL DEFAULT false,
  "start_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
  CHECK ("end_at" > "start_at"),
  CHECK ("discount_value" > 0),
  CHECK ("min_order_amount" >= 0),
  CHECK ("max_discount_amount" IS NULL OR "max_discount_amount" >= 0),
  CHECK ("usage_limit" IS NULL OR "usage_limit" > 0),
  CHECK ("used_count" >= 0)
);

CREATE TABLE "voucher_tiers" (
  "voucher_id" uuid NOT NULL,
  "tier" varchar(20) NOT NULL CONSTRAINT voucher_tiers_tier_check CHECK ("tier" IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')),
  PRIMARY KEY ("voucher_id", "tier")
);

CREATE TABLE "promotions" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "name" varchar(120) NOT NULL,
  "description" varchar(500),
  "point_multiplier" numeric(4,2) NOT NULL DEFAULT 1,
  "targeting_mode" varchar(30) NOT NULL DEFAULT 'ALL_TIERS' CHECK ("targeting_mode" IN ('ALL_TIERS', 'SPECIFIC_TIERS')),
  "start_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK ("end_at" > "start_at"),
  CHECK ("point_multiplier" > 0)
);

CREATE TABLE "promotion_tiers" (
  "promotion_id" uuid NOT NULL,
  "tier" varchar(20) NOT NULL CONSTRAINT promotion_tiers_tier_check CHECK ("tier" IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')),
  PRIMARY KEY ("promotion_id", "tier")
);

CREATE TABLE "bookings" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "customer_id" uuid NOT NULL,
  "vehicle_id" uuid NOT NULL,
  "booking_type" varchar(30) NOT NULL CHECK ("booking_type" IN ('PACKAGE', 'COMBO')),
  "package_id" uuid,
  "combo_id" uuid,
  "voucher_id" uuid,
  "assigned_staff_id" uuid,
  "status" varchar(30) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  "scheduled_at" timestamp with time zone NOT NULL,
  "base_amount" bigint NOT NULL DEFAULT 0,
  "options_amount" bigint NOT NULL DEFAULT 0,
  "discount_amount" bigint NOT NULL DEFAULT 0,
  "final_amount" bigint NOT NULL DEFAULT 0,
  "estimated_duration_minutes" int NOT NULL DEFAULT 0,
  "points_redeemed" int NOT NULL DEFAULT 0,
  "points_discount" bigint NOT NULL DEFAULT 0,
  "note" text,
  "cancel_reason" varchar(500),
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK (
    ("booking_type" = 'PACKAGE' AND "combo_id" IS NULL)
    OR ("booking_type" = 'COMBO' AND "package_id" IS NULL)
  ),
  CHECK ("base_amount" >= 0),
  CHECK ("options_amount" >= 0),
  CHECK ("discount_amount" >= 0),
  CHECK ("final_amount" >= 0),
  CHECK ("estimated_duration_minutes" >= 0),
  CHECK ("points_redeemed" >= 0),
  CHECK ("points_discount" >= 0)
);

CREATE TABLE "booking_options" (
  "booking_id" uuid NOT NULL,
  "option_id" uuid NOT NULL,
  "option_name" varchar(100) NOT NULL,
  "option_price" bigint NOT NULL,
  CHECK ("option_price" >= 0),
  PRIMARY KEY ("booking_id", "option_id")
);

CREATE TABLE "booking_promotions" (
  "booking_id" uuid NOT NULL,
  "promotion_id" uuid NOT NULL,
  "point_multiplier" numeric(4,2) NOT NULL,
  CHECK ("point_multiplier" > 0),
  PRIMARY KEY ("booking_id", "promotion_id")
);

CREATE TABLE "booking_status_histories" (
  "id" BIGSERIAL PRIMARY KEY,
  "booking_id" uuid NOT NULL,
  "old_status" varchar(30),
  "new_status" varchar(30) NOT NULL,
  "changed_by" uuid,
  "reason" text,
  "changed_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "payments" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "booking_id" uuid UNIQUE NOT NULL,
  "method" varchar(30) NOT NULL CHECK ("method" IN ('CASH_AT_COUNTER', 'BANK_TRANSFER', 'E_WALLET')),
  "status" varchar(30) NOT NULL DEFAULT 'UNPAID' CHECK ("status" IN ('UNPAID', 'PENDING_PAYMENT', 'PAID', 'FAILED', 'REFUNDED')),
  "amount" bigint NOT NULL,
  "transaction_ref" varchar(120),
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK ("amount" >= 0)
);

CREATE TABLE "wash_sessions" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "booking_id" uuid NOT NULL,
  "assigned_staff_id" uuid,
  "status" varchar(30) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'QUEUED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  "fee_amount" bigint,
  "projected_points" int,
  "awarded_points" int,
  "checked_in_at" timestamp with time zone,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "cancel_reason" varchar(500),
  "notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK ("fee_amount" IS NULL OR "fee_amount" >= 0),
  CHECK ("projected_points" IS NULL OR "projected_points" >= 0),
  CHECK ("awarded_points" IS NULL OR "awarded_points" >= 0)
);

CREATE TABLE "loyalty_accounts" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "customer_id" uuid UNIQUE NOT NULL,
  "current_points" int NOT NULL DEFAULT 0,
  "total_earned_points" int NOT NULL DEFAULT 0,
  "tier" varchar(20) NOT NULL DEFAULT 'BRONZE' CONSTRAINT loyalty_accounts_tier_check CHECK ("tier" IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')),
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK ("current_points" >= 0),
  CHECK ("total_earned_points" >= 0)
);

CREATE TABLE "point_transactions" (
  "id" BIGSERIAL PRIMARY KEY,
  "loyalty_account_id" uuid NOT NULL,
  "booking_id" uuid,
  "type" varchar(20) NOT NULL CHECK ("type" IN ('EARN', 'REDEEM', 'EXPIRE', 'ADJUST')),
  "points" int NOT NULL,
  "balance_after" int NOT NULL,
  "reason" varchar(255) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK ("balance_after" >= 0)
);

CREATE TABLE "tier_histories" (
  "id" BIGSERIAL PRIMARY KEY,
  "loyalty_account_id" uuid NOT NULL,
  "old_tier" varchar(20),
  "new_tier" varchar(20) NOT NULL CONSTRAINT tier_histories_new_tier_check CHECK ("new_tier" IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')),
  "total_points_at_change" int NOT NULL,
  "changed_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK ("total_points_at_change" >= 0)
);

CREATE TABLE "customer_combos" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "customer_id" uuid NOT NULL,
  "combo_id" uuid NOT NULL,
  "total_usages" int NOT NULL,
  "remaining_usages" int NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'EXPIRED', 'USED_UP', 'CANCELLED')),
  "activated_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CHECK ("total_usages" > 0),
  CHECK ("remaining_usages" >= 0),
  CHECK ("remaining_usages" <= "total_usages")
);

CREATE TABLE "customer_combo_usages" (
  "id" BIGSERIAL PRIMARY KEY,
  "customer_combo_id" uuid NOT NULL,
  "booking_id" uuid UNIQUE NOT NULL,
  "used_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "notifications" (
  "id" uuid DEFAULT (gen_random_uuid()) PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "title" varchar(150) NOT NULL,
  "message" text NOT NULL,
  "type" varchar(50) NOT NULL,
  "is_read" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX "idx_users_role" ON "users" ("role");

CREATE INDEX "idx_users_status" ON "users" ("status");

CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");

CREATE INDEX "idx_otp_verifications_user_id" ON "otp_verifications" ("user_id");

CREATE INDEX "idx_oauth_user_id" ON "user_oauth_accounts" ("user_id");

CREATE INDEX "idx_google_tickets_user_id" ON "google_auth_tickets" ("user_id");

CREATE INDEX "idx_google_tickets_expires" ON "google_auth_tickets" ("expires_at");

CREATE INDEX "idx_vehicles_customer_id" ON "vehicles" ("customer_id");

CREATE INDEX "idx_package_services_package_id" ON "package_services" ("package_id");

CREATE INDEX "idx_package_services_option_id" ON "package_services" ("option_id");

CREATE INDEX "idx_combo_services_combo_id" ON "combo_services" ("combo_id");

CREATE INDEX "idx_combo_services_option_id" ON "combo_services" ("option_id");

CREATE INDEX "idx_voucher_tiers_voucher_id" ON "voucher_tiers" ("voucher_id");

CREATE INDEX "idx_promotion_tiers_promotion_id" ON "promotion_tiers" ("promotion_id");

CREATE INDEX "idx_bookings_customer_id" ON "bookings" ("customer_id");

CREATE INDEX "idx_bookings_vehicle_id" ON "bookings" ("vehicle_id");

CREATE INDEX "idx_bookings_status" ON "bookings" ("status");

CREATE INDEX "idx_bookings_scheduled_at" ON "bookings" ("scheduled_at");

CREATE INDEX "idx_bookings_booking_type" ON "bookings" ("booking_type");

CREATE INDEX "idx_bookings_package_id" ON "bookings" ("package_id");

CREATE INDEX "idx_bookings_combo_id" ON "bookings" ("combo_id");

CREATE INDEX "idx_bookings_voucher_id" ON "bookings" ("voucher_id");

CREATE UNIQUE INDEX "uk_bookings_customer_voucher" ON "bookings" ("customer_id", "voucher_id");

CREATE INDEX "idx_booking_options_option_id" ON "booking_options" ("option_id");

CREATE INDEX "idx_booking_promotions_booking_id" ON "booking_promotions" ("booking_id");

CREATE INDEX "idx_booking_promotions_promotion_id" ON "booking_promotions" ("promotion_id");

CREATE INDEX "idx_booking_status_histories_booking_id" ON "booking_status_histories" ("booking_id");

CREATE INDEX "idx_payments_booking_id" ON "payments" ("booking_id");

CREATE INDEX "idx_wash_sessions_booking_id" ON "wash_sessions" ("booking_id");

CREATE INDEX "idx_wash_sessions_staff_id" ON "wash_sessions" ("assigned_staff_id");

CREATE INDEX "idx_loyalty_accounts_customer_id" ON "loyalty_accounts" ("customer_id");

CREATE INDEX "idx_point_transactions_loyalty_account_id" ON "point_transactions" ("loyalty_account_id");

CREATE INDEX "idx_point_transactions_booking_id" ON "point_transactions" ("booking_id");

CREATE UNIQUE INDEX uk_point_transactions_booking_type ON point_transactions (booking_id, type);

CREATE INDEX "idx_tier_histories_loyalty_account_id" ON "tier_histories" ("loyalty_account_id");

CREATE INDEX "idx_customer_combos_customer_id" ON "customer_combos" ("customer_id");

CREATE INDEX "idx_customer_combos_combo_id" ON "customer_combos" ("combo_id");

CREATE INDEX "idx_customer_combo_usages_customer_combo_id" ON "customer_combo_usages" ("customer_combo_id");

CREATE INDEX "idx_notifications_user_id" ON "notifications" ("user_id");

ALTER TABLE "user_preferences" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ;

ALTER TABLE "refresh_tokens" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ;

ALTER TABLE "otp_verifications" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ;

ALTER TABLE "user_oauth_accounts" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ;

ALTER TABLE "google_auth_tickets" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ;

ALTER TABLE "vehicles" ADD FOREIGN KEY ("customer_id") REFERENCES "users" ("id") ON DELETE CASCADE ;

ALTER TABLE "package_services" ADD FOREIGN KEY ("package_id") REFERENCES "packages" ("id") ON DELETE CASCADE ;

ALTER TABLE "package_services" ADD FOREIGN KEY ("option_id") REFERENCES "services" ("id") ;

ALTER TABLE "combo_services" ADD FOREIGN KEY ("combo_id") REFERENCES "combos" ("id") ON DELETE CASCADE ;

ALTER TABLE "combo_services" ADD FOREIGN KEY ("option_id") REFERENCES "services" ("id") ;

ALTER TABLE "voucher_tiers" ADD FOREIGN KEY ("voucher_id") REFERENCES "vouchers" ("id") ON DELETE CASCADE ;

ALTER TABLE "promotion_tiers" ADD FOREIGN KEY ("promotion_id") REFERENCES "promotions" ("id") ON DELETE CASCADE ;

ALTER TABLE "bookings" ADD FOREIGN KEY ("customer_id") REFERENCES "users" ("id") ;

ALTER TABLE "bookings" ADD FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ;

ALTER TABLE "bookings" ADD FOREIGN KEY ("package_id") REFERENCES "packages" ("id") ;

ALTER TABLE "bookings" ADD FOREIGN KEY ("combo_id") REFERENCES "combos" ("id") ;

ALTER TABLE "bookings" ADD FOREIGN KEY ("voucher_id") REFERENCES "vouchers" ("id") ;

ALTER TABLE "bookings" ADD FOREIGN KEY ("assigned_staff_id") REFERENCES "users" ("id") ;

ALTER TABLE "booking_options" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE CASCADE ;

ALTER TABLE "booking_options" ADD FOREIGN KEY ("option_id") REFERENCES "services" ("id") ;

ALTER TABLE "booking_promotions" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE CASCADE ;

ALTER TABLE "booking_promotions" ADD FOREIGN KEY ("promotion_id") REFERENCES "promotions" ("id") ;

ALTER TABLE "booking_status_histories" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE CASCADE ;

ALTER TABLE "booking_status_histories" ADD FOREIGN KEY ("changed_by") REFERENCES "users" ("id") ;

ALTER TABLE "payments" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE CASCADE ;

ALTER TABLE "wash_sessions" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE CASCADE ;

ALTER TABLE "wash_sessions" ADD FOREIGN KEY ("assigned_staff_id") REFERENCES "users" ("id") ;

ALTER TABLE "loyalty_accounts" ADD FOREIGN KEY ("customer_id") REFERENCES "users" ("id") ON DELETE CASCADE ;

ALTER TABLE "point_transactions" ADD FOREIGN KEY ("loyalty_account_id") REFERENCES "loyalty_accounts" ("id") ON DELETE CASCADE ;

ALTER TABLE "point_transactions" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE SET NULL ;

ALTER TABLE "tier_histories" ADD FOREIGN KEY ("loyalty_account_id") REFERENCES "loyalty_accounts" ("id") ON DELETE CASCADE ;

ALTER TABLE "customer_combos" ADD FOREIGN KEY ("customer_id") REFERENCES "users" ("id") ON DELETE CASCADE ;

ALTER TABLE "customer_combos" ADD FOREIGN KEY ("combo_id") REFERENCES "combos" ("id") ;

ALTER TABLE "customer_combo_usages" ADD FOREIGN KEY ("customer_combo_id") REFERENCES "customer_combos" ("id") ON DELETE CASCADE ;

ALTER TABLE "customer_combo_usages" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE CASCADE ;

ALTER TABLE "notifications" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ;
