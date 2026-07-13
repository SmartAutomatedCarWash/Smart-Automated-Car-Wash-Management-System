-- V28 Demo: Seed initial announcement banner for customer-facing sticky FAB

INSERT INTO "announcements" ("title", "type", "active", "priority", "expires_at")
VALUES (
  'Limited time offer: Save 15% on Ceramic Coating services this week!',
  'PROMO', true, 10, NOW() + INTERVAL '7 days'
);
