-- V24 Demo: Seed blog categories, admin author, and initial articles (English only)

-- Seed admin user for blog authorship (if not exists)
INSERT INTO "users" ("id", "email", "phone", "full_name", "password_hash", "status", "role", "created_at", "updated_at")
SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@autowash.local', '0123456789', 'Admin Writer', '$2a$10$dummy', 'ACTIVE', 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE "email" = 'admin@autowash.local');

-- Blog Categories
INSERT INTO "blog_categories" ("id", "name", "slug", "description", "created_at") VALUES
('11111111-1111-1111-1111-111111111111', 'Washing Techniques', 'washing-techniques', 'Professional car washing methods and best practices', CURRENT_TIMESTAMP),
('22222222-2222-2222-2222-222222222222', 'Paint Protection', 'paint-protection', 'How to protect and maintain your car paint', CURRENT_TIMESTAMP),
('33333333-3333-3333-3333-333333333333', 'Seasonal Care', 'seasonal-care', 'Car care tips for each season', CURRENT_TIMESTAMP),
('44444444-4444-4444-4444-444444444444', 'Car Maintenance', 'car-maintenance', 'Regular maintenance guides and schedules', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE
  SET "name"        = EXCLUDED."name",
      "slug"        = EXCLUDED."slug",
      "description" = EXCLUDED."description";
