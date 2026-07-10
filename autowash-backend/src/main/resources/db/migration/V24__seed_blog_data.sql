-- Seed Blog Categories
INSERT INTO "blog_categories" ("id", "name", "slug", "description", "created_at") VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Car Maintenance', 'car-maintenance', 'Tips and tricks for maintaining your vehicle', CURRENT_TIMESTAMP),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Washing Techniques', 'washing-techniques', 'Professional car washing methods', CURRENT_TIMESTAMP),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'Paint Protection', 'paint-protection', 'How to protect your car paint', CURRENT_TIMESTAMP),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'Seasonal Care', 'seasonal-care', 'Seasonal car care guide', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Get admin user ID (assuming first admin exists, or use hardcoded UUID)
-- If no admin exists, create one for demo
INSERT INTO "users" ("id", "email", "phone", "full_name", "password_hash", "status", "role", "created_at", "updated_at")
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'admin@autowash.local', '0123456789', 'Admin Writer', '$2a$10$dummy', 'ACTIVE', 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO NOTHING;

-- Seed Blog Articles
INSERT INTO "blog_articles" ("id", "category_id", "author_id", "title", "slug", "thumbnail_url", "excerpt", "content", "status", "view_count", "published_at", "created_at", "updated_at") VALUES
  (
    '55555555-5555-5555-5555-555555555555'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'Essential Car Maintenance Tips for 2026',
    'essential-car-maintenance-tips-2026',
    'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=800',
    'Learn the essential maintenance tips every car owner should know to keep their vehicle in top condition.',
    'Regular car maintenance is crucial for keeping your vehicle running smoothly and avoiding costly repairs down the road.

Here are the essential maintenance tips every car owner should follow:

1. **Regular Oil Changes**
   Oil is the lifeblood of your engine. Change your oil every 5,000-7,500 km or as recommended by your vehicle manual. Fresh oil keeps your engine lubricated and clean.

2. **Check Your Tire Pressure**
   Proper tire pressure improves fuel efficiency and extends tire life. Check your tires at least monthly and before long trips.

3. **Brake System Inspection**
   Your brakes are critical for safety. Have them inspected regularly and replace brake pads when they wear thin.

4. **Battery Maintenance**
   Clean corroded battery terminals and ensure your battery is securely fastened. A healthy battery is essential for reliable starts.

5. **Fluid Levels**
   Check coolant, transmission fluid, brake fluid, and power steering fluid regularly. Top them up as needed.

By following these maintenance tips, you can extend your vehicle''s lifespan and ensure it runs reliably for years to come.',
    'PUBLISHED',
    42,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '66666666-6666-6666-6666-666666666666'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'The Complete Guide to Professional Car Washing',
    'complete-guide-professional-car-washing',
    'https://images.unsplash.com/photo-1590362891990-f776e74a5a95?w=800',
    'Master the art of car washing with professional techniques that will make your vehicle shine like new.',
    'Professional car washing goes beyond just spraying water on your car. Learn the techniques used by detailing professionals.

**Pre-Wash Preparation**
Before you start washing, gather all your supplies: two buckets (one for soap, one for rinsing), wash mitt, microfiber towels, and quality car wash soap.

**The Two-Bucket Method**
This is the gold standard for safe car washing:
- Use one bucket with soapy water for washing
- Use another bucket with clean water for rinsing your mitt
- This prevents dirt from being reintroduced to your paint

**Washing Technique**
Start from the top of the vehicle and work your way down. Wash in straight lines or circles, applying gentle pressure. Don''t use circular motions on the paint as they can cause swirl marks.

**Rinsing Thoroughly**
Rinse all soap residue completely. Any remaining soap can leave streaks and spots. Use a final rinse with distilled water for spotless results.

**Drying**
Use soft, microfiber towels to dry your vehicle. Pat gently rather than wiping to avoid scratches.

With these professional techniques, your car will look showroom fresh every time!',
    'PUBLISHED',
    28,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '77777777-7777-7777-7777-777777777777'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'Protecting Your Car Paint: Why Ceramic Coating Matters',
    'protecting-car-paint-ceramic-coating',
    'https://images.unsplash.com/photo-1605559424843-9e4c3ca4b7f7?w=800',
    'Discover how ceramic coatings can protect your car paint from environmental damage and keep it looking pristine.',
    'Your car''s paint is constantly exposed to harsh environmental factors. Learn how to protect it effectively.

**Understanding Paint Damage**
Common threats to your car paint include:
- UV rays that cause fading and oxidation
- Bird droppings and tree sap that etch the paint
- Industrial pollutants and acid rain
- Salt from roads that causes corrosion

**What is Ceramic Coating?**
Ceramic coating is a liquid polymer applied to the exterior of your vehicle. It creates a protective layer that:
- Repels water and contaminants
- Provides UV protection
- Makes cleaning easier
- Enhances paint depth and gloss

**Benefits of Ceramic Coating**
1. **Long-lasting Protection** - Lasts 2-5 years with proper maintenance
2. **Hydrophobic Properties** - Water beads off, reducing water spots
3. **Enhanced Appearance** - Gives your paint a deep, glossy finish
4. **Easier Maintenance** - Contaminants don''t bond as easily to the surface

**Application Process**
Professional application involves:
- Paint correction (if needed)
- Surface preparation
- Application of ceramic coating
- Curing time

Invest in ceramic coating to keep your car paint protected and looking beautiful for years.',
    'PUBLISHED',
    35,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '88888888-8888-8888-8888-888888888888'::uuid,
    '44444444-4444-4444-4444-444444444444'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'Summer Car Care: Preparing Your Vehicle for Hot Weather',
    'summer-car-care-hot-weather',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    'Get your car ready for summer with essential maintenance and care tips for hot weather conditions.',
    'Summer brings unique challenges for your vehicle. Prepare your car for hot weather with these important tips.

**Cooling System Check**
Your radiator works harder in summer heat. Ensure your coolant level is adequate and consider a cooling system flush if recommended by your manufacturer.

**Tire Pressure Management**
Heat causes air to expand. Check tire pressure regularly as underinflated tires can fail in extreme heat. Maintain the pressure recommended in your owner''s manual.

**Battery Care**
High temperatures can reduce battery performance. Clean battery terminals of corrosion and ensure your battery is in good condition.

**Air Conditioning System**
If your A/C isn''t cooling properly, have it serviced before summer heat peaks. A well-maintained A/C system is essential for comfort and safety.

**Fluid Levels**
Heat increases fluid evaporation. Check oil, coolant, brake fluid, and windshield washer fluid regularly.

**Paint and Wax Protection**
Summer sun can damage your paint. Apply a fresh coat of wax before summer for UV protection and enhanced shine.

**Interior Protection**
Use sunshades and park in shade when possible. Heat can damage your dashboard and interior upholstery.

With proper summer maintenance, your vehicle will stay cool, reliable, and protected throughout the hot season.',
    'PUBLISHED',
    19,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- Seed some sample blog likes
INSERT INTO "blog_likes" ("id", "article_id", "customer_id", "created_at") VALUES
  ('99999999-9999-9999-9999-999999999991'::uuid, '55555555-5555-5555-5555-555555555555'::uuid, (SELECT "id" FROM "users" WHERE "role" = 'CUSTOMER' LIMIT 1), CURRENT_TIMESTAMP),
  ('99999999-9999-9999-9999-999999999992'::uuid, '55555555-5555-5555-5555-555555555555'::uuid, (SELECT "id" FROM "users" WHERE "role" = 'CUSTOMER' LIMIT 1), CURRENT_TIMESTAMP),
  ('99999999-9999-9999-9999-999999999993'::uuid, '66666666-6666-6666-6666-666666666666'::uuid, (SELECT "id" FROM "users" WHERE "role" = 'CUSTOMER' LIMIT 1), CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Seed some sample blog comments
INSERT INTO "blog_comments" ("id", "article_id", "customer_id", "content", "created_at", "updated_at") VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeee01'::uuid, '55555555-5555-5555-5555-555555555555'::uuid, (SELECT "id" FROM "users" WHERE "role" = 'CUSTOMER' LIMIT 1), 'Great tips! This really helped me understand car maintenance better.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeee02'::uuid, '55555555-5555-5555-5555-555555555555'::uuid, (SELECT "id" FROM "users" WHERE "role" = 'CUSTOMER' LIMIT 1), 'Thanks for the detailed guide. Very informative!', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeee03'::uuid, '66666666-6666-6666-6666-666666666666'::uuid, (SELECT "id" FROM "users" WHERE "role" = 'CUSTOMER' LIMIT 1), 'Professional techniques explained perfectly. Will try these methods!', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
