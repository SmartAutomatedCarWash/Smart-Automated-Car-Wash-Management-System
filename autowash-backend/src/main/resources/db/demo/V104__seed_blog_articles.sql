-- V27 Demo: Seed blog articles with rich HTML content (English only)
-- Replaces old Vietnamese content. Categories seeded in V24 demo.

-- Delete any previously seeded articles to allow clean re-seed
DELETE FROM "blog_articles" WHERE "id" IN (
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  'aaaaaaaa-bbbb-1111-1111-111111111111',
  'bbbbbbbb-aaaa-2222-2222-222222222222',
  'cccccccc-aaaa-3333-3333-333333333333',
  'dddddddd-aaaa-4444-4444-444444444444'
);

-- ── Category: Washing Techniques (11111111-...) ───────────────────────────────

INSERT INTO "blog_articles" (
  "id", "category_id", "author_id", "title", "slug",
  "thumbnail_url", "excerpt", "content",
  "status", "view_count", "published_at", "created_at", "updated_at"
) VALUES (
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'How to Wash Your Car Without Scratching the Paint',
  'how-to-wash-car-without-scratching-paint',
  'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?w=800',
  'Most car owners unknowingly scratch their paint every time they wash. Learn the two-bucket method and proper technique used by professional detailers.',
  $$<h2>Why Washing Technique Matters</h2>
<p>The paint surface on your car is more delicate than it looks. Incorrect washing introduces micro-scratches that accumulate over time, dulling the finish. Using the right tools and technique is the first step to preserving your paint.</p>
<img src="https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=700" alt="Professional car wash" style="width:100%;border-radius:12px;margin:12px 0;" />
<h2>The Two-Bucket Method</h2>
<p>The two-bucket method is the gold standard in the detailing world. Here is how it works:</p>
<ul>
<li><strong>Bucket 1:</strong> Clean soapy water — dip your wash mitt here before touching the car</li>
<li><strong>Bucket 2:</strong> Clean rinse water — rinse your mitt here before reloading with soap</li>
<li>Place a <strong>grit guard</strong> at the bottom of each bucket to trap dirt below the waterline</li>
</ul>
<h2>Choosing the Right Products</h2>
<p>Never use dish soap or household cleaners on your car. Always choose a <strong>pH-neutral car shampoo</strong> formulated specifically for automotive paint. Use a <strong>microfiber wash mitt</strong> — never a sponge, which holds grit against the paint surface.</p>$$,
  'PUBLISHED', 156, NOW() - INTERVAL '45' DAY, NOW() - INTERVAL '45' DAY, NOW() - INTERVAL '45' DAY
);

INSERT INTO "blog_articles" (
  "id", "category_id", "author_id", "title", "slug",
  "thumbnail_url", "excerpt", "content",
  "status", "view_count", "published_at", "created_at", "updated_at"
) VALUES (
  'aaaaaaaa-bbbb-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Hand Washing vs Pressure Washing: Which Is Better for Your Car?',
  'hand-washing-vs-pressure-washing',
  'https://images.pexels.com/photos/6873086/pexels-photo-6873086.jpeg?w=800',
  'Pressure washers are convenient, but they are not always the best option for your paint. Compare the two methods to find the right approach for your car.',
  $$<h2>Pressure Washer: Speed with Trade-offs</h2>
<p>Pressure washing removes heavy dirt quickly and saves water. However, directing high-pressure water at rubber seals, window trim, or gaps can cause damage. Always keep the nozzle at least 30 cm from the surface and use a wide-angle tip.</p>
<img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700" alt="Pressure washing a car" style="width:100%;border-radius:12px;margin:12px 0;" />
<h2>Hand Washing: Full Control</h2>
<p>Hand washing allows you to control every pass across the paint. You can feel contamination before it causes damage and work safely around delicate areas. Professional detailers prefer hand washing for thorough results.</p>
<ul>
<li>Pre-rinse with pressure to remove loose debris before touching the paint</li>
<li>Never spray high pressure directly at glass edges or door seals</li>
<li>Combine both: pressure rinse first, then hand wash for the best outcome</li>
</ul>
<h2>Recommendation</h2>
<p>Use a pressure washer for the initial rinse to remove heavy mud and brake dust, then finish with a proper hand wash using the two-bucket method for a scratch-free result.</p>$$,
  'PUBLISHED', 89, NOW() - INTERVAL '30' DAY, NOW() - INTERVAL '30' DAY, NOW() - INTERVAL '30' DAY
);

-- ── Category: Paint Protection (22222222-...) ──────────────────────────────────

INSERT INTO "blog_articles" (
  "id", "category_id", "author_id", "title", "slug",
  "thumbnail_url", "excerpt", "content",
  "status", "view_count", "published_at", "created_at", "updated_at"
) VALUES (
  '77777777-7777-7777-7777-777777777777',
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Why Ceramic Coating Is Worth the Investment',
  'why-ceramic-coating-worth-investment',
  'https://images.pexels.com/photos/5835359/pexels-photo-5835359.jpeg?w=800',
  'Ceramic coating is the most advanced paint protection technology available today. Learn how it works, its real-world benefits, and what to expect from the application process.',
  $$<h2>What Is Ceramic Coating?</h2>
<p>Ceramic coating is a liquid polymer (primarily SiO2) that chemically bonds with your car paint, forming a semi-permanent hard layer. Unlike wax, it does not wash off — it becomes part of the surface.</p>
<img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=700" alt="Ceramic coating application" style="width:100%;border-radius:12px;margin:12px 0;" />
<h2>Key Benefits</h2>
<ul>
<li><strong>UV Protection:</strong> Prevents paint oxidation and color fading from direct sunlight</li>
<li><strong>Hydrophobic Effect:</strong> Water, mud, and bird droppings bead and roll off effortlessly</li>
<li><strong>Easier Cleaning:</strong> Contaminants cannot bond as strongly — washing takes less time and effort</li>
<li><strong>Long-term Durability:</strong> Lasts 2 to 5 years depending on the product and maintenance</li>
</ul>
<h2>Before Application: Paint Correction Is Essential</h2>
<p>Any scratches, swirl marks, or paint defects must be corrected before applying ceramic coating. The coating seals the surface permanently — any imperfection underneath will be locked in for years. Professional paint correction before coating is strongly recommended.</p>$$,
  'PUBLISHED', 178, NOW() - INTERVAL '60' DAY, NOW() - INTERVAL '60' DAY, NOW() - INTERVAL '60' DAY
);

INSERT INTO "blog_articles" (
  "id", "category_id", "author_id", "title", "slug",
  "thumbnail_url", "excerpt", "content",
  "status", "view_count", "published_at", "created_at", "updated_at"
) VALUES (
  'bbbbbbbb-aaaa-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'PPF vs Ceramic Coating: Which Protects Your Paint Better?',
  'ppf-vs-ceramic-coating-comparison',
  'https://images.pexels.com/photos/120049/pexels-photo-120049.jpeg?w=800',
  'PPF and ceramic coating both protect your paint, but in very different ways. This guide breaks down the pros, cons, and ideal use cases for each solution.',
  $$<h2>Paint Protection Film (PPF)</h2>
<p>PPF is a transparent polyurethane film applied directly over the paint. Its standout feature is <strong>self-healing</strong>: minor scratches disappear when the surface is exposed to heat. It provides strong physical protection against rock chips and road debris.</p>
<img src="https://images.unsplash.com/photo-1486006920555-c77dcf18193c?w=700" alt="Paint protection film" style="width:100%;border-radius:12px;margin:12px 0;" />
<h2>Side-by-Side Comparison</h2>
<ul>
<li><strong>Impact resistance:</strong> PPF wins — it absorbs physical impacts that coating cannot handle</li>
<li><strong>Hydrophobics:</strong> Ceramic coating edges ahead due to its harder, smoother surface</li>
<li><strong>Cost:</strong> PPF is significantly more expensive, typically 3 to 5 times the cost of ceramic coating</li>
<li><strong>Longevity:</strong> PPF lasts 7 to 10 years; ceramic coating lasts 2 to 5 years</li>
</ul>
<h2>Our Recommendation</h2>
<p>If you frequently drive on highways or mountain roads with loose gravel, apply PPF to the front bumper, hood, and mirrors. Add ceramic coating over the entire vehicle for the best combination of protection and ease of maintenance at an optimized cost.</p>$$,
  'PUBLISHED', 134, NOW() - INTERVAL '20' DAY, NOW() - INTERVAL '20' DAY, NOW() - INTERVAL '20' DAY
);

-- ── Category: Seasonal Care (33333333-...) ─────────────────────────────────────

INSERT INTO "blog_articles" (
  "id", "category_id", "author_id", "title", "slug",
  "thumbnail_url", "excerpt", "content",
  "status", "view_count", "published_at", "created_at", "updated_at"
) VALUES (
  '88888888-8888-8888-8888-888888888888',
  '33333333-3333-3333-3333-333333333333',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Protecting Your Car During Rainy Season',
  'protecting-car-during-rainy-season',
  'https://images.pexels.com/photos/3807386/pexels-photo-3807386.jpeg?w=800',
  'Rainwater is not pure water — it carries acids and dissolved pollutants that can etch your car paint if left to dry on the surface. Here is how to protect your vehicle during the wet season.',
  $$<h2>Why Rainwater Damages Car Paint</h2>
<p>Rainwater contains sulfuric acid, mineral salts, and industrial pollutants absorbed from the atmosphere. When rainwater evaporates on your car surface, these contaminants remain behind as white etch marks that are very difficult to remove.</p>
<img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700" alt="Car in the rain" style="width:100%;border-radius:12px;margin:12px 0;" />
<h2>Essential Rainy Season Checklist</h2>
<ul>
<li>Rinse the car immediately after rain — do not let rainwater dry naturally on the paint</li>
<li>Clear the drainage channels on door frames to prevent water buildup inside panels</li>
<li>Apply a wax or paint sealant for an extra hydrophobic barrier before the rainy season starts</li>
<li>Clean the undercarriage regularly to prevent rust accumulation in wheel arches and chassis</li>
<li>Inspect door seals for cracks to prevent water leaking into the interior</li>
</ul>
<h2>Quick Post-Rain Clean</h2>
<p>If you cannot do a full wash immediately after rain, at minimum use a damp microfiber towel to wipe the exterior surfaces before parking. This simple step prevents mineral deposits from bonding to the paint overnight.</p>$$,
  'PUBLISHED', 201, NOW() - INTERVAL '15' DAY, NOW() - INTERVAL '15' DAY, NOW() - INTERVAL '15' DAY
);

INSERT INTO "blog_articles" (
  "id", "category_id", "author_id", "title", "slug",
  "thumbnail_url", "excerpt", "content",
  "status", "view_count", "published_at", "created_at", "updated_at"
) VALUES (
  'cccccccc-aaaa-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Summer Car Care: Protecting Your Vehicle in the Heat',
  'summer-car-care-protecting-vehicle-heat',
  'https://images.pexels.com/photos/3807386/pexels-photo-3807386.jpeg?w=800',
  'Extreme summer heat and UV radiation are among the biggest threats to your car paint and interior. This comprehensive guide covers everything you need to keep your vehicle protected during the hottest months.',
  $$<h2>How Heat and UV Damage Your Car</h2>
<p>UV rays cause paint oxidation, fading, and chalking over time. Interior surfaces — leather, plastic trim, and the dashboard — become brittle and crack when repeatedly exposed to intense heat. Even tire pressure increases in hot weather, creating a blowout risk.</p>
<img src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=700" alt="Car parked in summer sun" style="width:100%;border-radius:12px;margin:12px 0;" />
<h2>Exterior Protection Tips</h2>
<ul>
<li>Park in shade or a covered garage whenever possible</li>
<li>Use a car cover for extended outdoor parking during the day</li>
<li>Apply ceramic coating or wax with UV inhibitors to shield the paint</li>
<li>Wash more frequently in summer as bird droppings and insects bond to hot paint faster</li>
</ul>
<h2>Interior and Tire Care</h2>
<p>Use a windshield sun shade and rear window sun shade to reduce cabin temperature significantly. Apply a UV-protectant conditioner to all leather and plastic surfaces every three months. Check tire pressure at least once a week in summer — heat increases pressure inside the tire and can cause a sudden blowout at highway speeds.</p>$$,
  'PUBLISHED', 167, NOW() - INTERVAL '90' DAY, NOW() - INTERVAL '90' DAY, NOW() - INTERVAL '90' DAY
);

-- ── Category: Car Maintenance (44444444-...) ──────────────────────────────────

INSERT INTO "blog_articles" (
  "id", "category_id", "author_id", "title", "slug",
  "thumbnail_url", "excerpt", "content",
  "status", "view_count", "published_at", "created_at", "updated_at"
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'The Complete Car Maintenance Schedule: Key Milestones',
  'complete-car-maintenance-schedule-key-milestones',
  'https://images.pexels.com/photos/4489749/pexels-photo-4489749.jpeg?w=800',
  'Staying on top of your maintenance schedule prevents expensive breakdowns and keeps your car safe on the road. Here is a practical guide covering all the key service intervals.',
  $$<h2>Why Regular Maintenance Saves Money</h2>
<p>Like a regular health check-up, your car needs scheduled maintenance to run safely and efficiently. Skipping service intervals leads to accelerated wear, unexpected breakdowns, and repair costs that far exceed the cost of preventive maintenance.</p>
<img src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=700" alt="Car maintenance" style="width:100%;border-radius:12px;margin:12px 0;" />
<h2>Maintenance Schedule by Mileage</h2>
<ul>
<li><strong>Every 5,000 km:</strong> Engine oil change, tire pressure and tread check, brake inspection</li>
<li><strong>Every 10,000 km:</strong> Oil filter replacement, air filter check, coolant level top-up</li>
<li><strong>Every 20,000 km:</strong> Spark plug replacement (petrol engines), drive belt inspection</li>
<li><strong>Every 40,000 km:</strong> Transmission fluid replacement, full suspension inspection</li>
<li><strong>Every 60,000 km:</strong> Timing belt replacement, full brake system overhaul</li>
</ul>
<h2>Simple Way to Track Your Schedule</h2>
<p>Record the mileage and date of every service in a phone app or on a sticker inside the engine bay. This simple habit ensures you never miss a critical milestone and helps maintain resale value when it is time to sell the car.</p>$$,
  'PUBLISHED', 145, NOW() - INTERVAL '120' DAY, NOW() - INTERVAL '120' DAY, NOW() - INTERVAL '120' DAY
);

INSERT INTO "blog_articles" (
  "id", "category_id", "author_id", "title", "slug",
  "thumbnail_url", "excerpt", "content",
  "status", "view_count", "published_at", "created_at", "updated_at"
) VALUES (
  'dddddddd-aaaa-4444-4444-444444444444',
  '44444444-4444-4444-4444-444444444444',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'How to Deep Clean Your Car Interior Like a Professional',
  'deep-clean-car-interior-like-professional',
  'https://images.pexels.com/photos/3807388/pexels-photo-3807388.jpeg?w=800',
  'A clean interior is not just about aesthetics — it prevents bacteria, mold, and odors from taking hold. Follow this professional-grade step-by-step process to restore your cabin to showroom condition.',
  $$<h2>Tools You Will Need</h2>
<ul>
<li>Handheld vacuum with crevice and brush attachments</li>
<li>Multiple microfiber towels (dedicate separate towels for different surfaces)</li>
<li>All-purpose cleaner (APC) diluted according to the manufacturer ratio</li>
<li>Soft detailing brush for dashboard vents and hard brush for floor mats</li>
<li>UV-protectant leather and plastic conditioner</li>
</ul>
<img src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=700" alt="Car interior detailing" style="width:100%;border-radius:12px;margin:12px 0;" />
<h2>Step-by-Step Interior Detail</h2>
<p><strong>Step 1 — Full Vacuum:</strong> Remove floor mats and vacuum all surfaces including seats, headliner, and the gap between the seat and center console. Use the crevice tool to reach every corner.</p>
<p><strong>Step 2 — Hard Surfaces:</strong> Spray diluted APC onto a microfiber towel (never directly onto screens) and wipe the dashboard, door cards, and center console. Use a detailing brush to clean air vents and button gaps.</p>
<p><strong>Step 3 — Fabric Seats and Mats:</strong> Apply enzyme-based cleaner, agitate with a brush, then extract with a wet-dry vacuum or allow to air dry completely before replacing mats.</p>
<h2>Conditioning Leather and Plastics</h2>
<p>Apply a UV-protective conditioner to all leather and plastic trim surfaces every three months. Products containing UV inhibitors keep surfaces supple and prevent cracking or discolouration caused by prolonged sun exposure.</p>$$,
  'PUBLISHED', 112, NOW() - INTERVAL '75' DAY, NOW() - INTERVAL '75' DAY, NOW() - INTERVAL '75' DAY
);
