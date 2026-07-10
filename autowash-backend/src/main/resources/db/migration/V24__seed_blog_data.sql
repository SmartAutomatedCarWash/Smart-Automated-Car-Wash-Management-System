-- Seed Blog Categories
INSERT INTO "blog_categories" ("id", "name", "slug", "description", "created_at")
SELECT '11111111-1111-1111-1111-111111111111', 'Car Maintenance', 'car-maintenance', 'Tips and tricks for maintaining your vehicle', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "blog_categories" WHERE "id" = '11111111-1111-1111-1111-111111111111');

INSERT INTO "blog_categories" ("id", "name", "slug", "description", "created_at")
SELECT '22222222-2222-2222-2222-222222222222', 'Washing Techniques', 'washing-techniques', 'Professional car washing methods', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "blog_categories" WHERE "id" = '22222222-2222-2222-2222-222222222222');

INSERT INTO "blog_categories" ("id", "name", "slug", "description", "created_at")
SELECT '33333333-3333-3333-3333-333333333333', 'Paint Protection', 'paint-protection', 'How to protect your car paint', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "blog_categories" WHERE "id" = '33333333-3333-3333-3333-333333333333');

INSERT INTO "blog_categories" ("id", "name", "slug", "description", "created_at")
SELECT '44444444-4444-4444-4444-444444444444', 'Seasonal Care', 'seasonal-care', 'Seasonal car care guide', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "blog_categories" WHERE "id" = '44444444-4444-4444-4444-444444444444');

-- Seed admin user for blog authorship (if not exists)
INSERT INTO "users" ("id", "email", "phone", "full_name", "password_hash", "status", "role", "created_at", "updated_at")
SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@autowash.local', '0123456789', 'Admin Writer', '$2a$10$dummy', 'ACTIVE', 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE "email" = 'admin@autowash.local');

-- Seed Blog Articles
INSERT INTO "blog_articles" ("id", "category_id", "author_id", "title", "slug", "thumbnail_url", "excerpt", "content", "status", "view_count", "published_at", "created_at", "updated_at")
SELECT
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Essential Car Maintenance Tips for 2026',
  'essential-car-maintenance-tips-2026',
  'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=800',
  'Learn the essential maintenance tips every car owner should know to keep their vehicle in top condition.',
  'Regular car maintenance is crucial for keeping your vehicle running smoothly and avoiding costly repairs down the road.',
  'PUBLISHED',
  42,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "blog_articles" WHERE "id" = '55555555-5555-5555-5555-555555555555');

INSERT INTO "blog_articles" ("id", "category_id", "author_id", "title", "slug", "thumbnail_url", "excerpt", "content", "status", "view_count", "published_at", "created_at", "updated_at")
SELECT
  '66666666-6666-6666-6666-666666666666',
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'The Complete Guide to Professional Car Washing',
  'complete-guide-professional-car-washing',
  'https://images.unsplash.com/photo-1590362891990-f776e74a5a95?w=800',
  'Master the art of car washing with professional techniques that will make your vehicle shine like new.',
  'Professional car washing goes beyond just spraying water on your car. Learn the techniques used by detailing professionals.',
  'PUBLISHED',
  28,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "blog_articles" WHERE "id" = '66666666-6666-6666-6666-666666666666');

INSERT INTO "blog_articles" ("id", "category_id", "author_id", "title", "slug", "thumbnail_url", "excerpt", "content", "status", "view_count", "published_at", "created_at", "updated_at")
SELECT
  '77777777-7777-7777-7777-777777777777',
  '33333333-3333-3333-3333-333333333333',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Protecting Your Car Paint: Why Ceramic Coating Matters',
  'protecting-car-paint-ceramic-coating',
  'https://images.unsplash.com/photo-1605559424843-9e4c3ca4b7f7?w=800',
  'Discover how ceramic coatings can protect your car paint from environmental damage and keep it looking pristine.',
  'Your car paint is constantly exposed to harsh environmental factors. Learn how to protect it effectively.',
  'PUBLISHED',
  35,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "blog_articles" WHERE "id" = '77777777-7777-7777-7777-777777777777');

INSERT INTO "blog_articles" ("id", "category_id", "author_id", "title", "slug", "thumbnail_url", "excerpt", "content", "status", "view_count", "published_at", "created_at", "updated_at")
SELECT
  '88888888-8888-8888-8888-888888888888',
  '44444444-4444-4444-4444-444444444444',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Summer Car Care: Preparing Your Vehicle for Hot Weather',
  'summer-car-care-hot-weather',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  'Get your car ready for summer with essential maintenance and care tips for hot weather conditions.',
  'Summer brings unique challenges for your vehicle. Prepare your car for hot weather with these important tips.',
  'PUBLISHED',
  19,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "blog_articles" WHERE "id" = '88888888-8888-8888-8888-888888888888');
