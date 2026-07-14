-- V28: Add announcements table for sticky FAB banners displayed on customer-facing pages

CREATE TABLE "announcements" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "title" varchar(255) NOT NULL,
  "message" text,
  "link_url" varchar(500),
  "link_label" varchar(100),
  "type" varchar(30) NOT NULL DEFAULT 'PROMO',
  "active" boolean NOT NULL DEFAULT true,
  "priority" int NOT NULL DEFAULT 0,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
