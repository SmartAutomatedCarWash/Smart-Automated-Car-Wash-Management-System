const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const APPLY = process.argv.includes("--apply");
const ROOT = path.resolve(__dirname, "..");
const BACKEND_ENV = path.join(ROOT, "autowash-backend", ".env");
const DEFAULT_PASSWORD = process.env.AUTOWASH_SHOWCASE_PASSWORD || "Password123@";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseJdbcUrl(jdbcUrl) {
  const raw = jdbcUrl.replace(/^jdbc:/, "");
  const url = new URL(raw);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    database: url.pathname.replace(/^\//, ""),
  };
}

function dbConfig() {
  loadEnvFile(BACKEND_ENV);

  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: isLocalHost(url.hostname) ? false : { rejectUnauthorized: false },
    };
  }

  if (!process.env.AUTOWASH_DB_URL) {
    throw new Error("Missing AUTOWASH_DB_URL or DATABASE_URL.");
  }

  const parsed = parseJdbcUrl(process.env.AUTOWASH_DB_URL);
  const sslOverride = process.env.AUTOWASH_DB_SSL;
  const ssl = sslOverride == null
    ? !isLocalHost(parsed.host)
    : ["1", "true", "yes"].includes(sslOverride.toLowerCase());

  return {
    ...parsed,
    user: process.env.AUTOWASH_DB_USERNAME,
    password: process.env.AUTOWASH_DB_PASSWORD,
    ssl: ssl ? { rejectUnauthorized: false } : false,
  };
}

function isLocalHost(host) {
  return ["localhost", "127.0.0.1", "::1"].includes(host);
}

const tiers = [
  { tier: "BRONZE", displayName: "Bronze", minPoints: 0, multiplier: 1.0, priority: 10, rank: 0 },
  { tier: "SILVER", displayName: "Silver", minPoints: 500, multiplier: 1.1, priority: 20, rank: 1 },
  { tier: "GOLD", displayName: "Gold", minPoints: 1500, multiplier: 1.25, priority: 30, rank: 2 },
  { tier: "PLATINUM", displayName: "Platinum", minPoints: 4000, multiplier: 1.5, priority: 40, rank: 3 },
  { tier: "DIAMOND", displayName: "Diamond", minPoints: 10000, multiplier: 1.75, priority: 50, rank: 4 },
];

const staff = [
  ["82000000-0000-0000-0000-000000000001", "Nguyen Minh Quan", "0977000101", "staff.quan@auracarwash.site", "ACTIVE"],
  ["82000000-0000-0000-0000-000000000002", "Tran Bao Nhi", "0977000102", "staff.nhi@auracarwash.site", "ACTIVE"],
  ["82000000-0000-0000-0000-000000000003", "Le Hoang Phuc", "0977000103", "staff.phuc@auracarwash.site", "ACTIVE"],
  ["82000000-0000-0000-0000-000000000004", "Pham Gia Han", "0977000104", "staff.han@auracarwash.site", "ACTIVE"],
  ["82000000-0000-0000-0000-000000000005", "Vo Anh Kiet", "0977000105", "staff.kiet@auracarwash.site", "ACTIVE"],
  ["82000000-0000-0000-0000-000000000006", "Dang Thanh Lam", "0977000106", "staff.lam.locked@auracarwash.site", "BLOCKED"],
];

const customers = [
  ["83000000-0000-0000-0000-000000000001", "Nguyen An Phuong", "0988000101", "customer.bronze.phuong@auracarwash.site", "BRONZE", 120, 120],
  ["83000000-0000-0000-0000-000000000002", "Tran Gia Bao", "0988000102", "customer.boundary.silver@auracarwash.site", "BRONZE", 490, 490],
  ["83000000-0000-0000-0000-000000000003", "Le Minh Chau", "0988000103", "customer.silver.chau@auracarwash.site", "SILVER", 350, 760],
  ["83000000-0000-0000-0000-000000000004", "Pham Hoang Long", "0988000104", "customer.boundary.gold@auracarwash.site", "SILVER", 1180, 1490],
  ["83000000-0000-0000-0000-000000000005", "Vo Khanh Linh", "0988000105", "customer.silver.linh@auracarwash.site", "SILVER", 900, 1080],
  ["83000000-0000-0000-0000-000000000006", "Dang Quoc Huy", "0988000106", "customer.gold.huy@auracarwash.site", "GOLD", 410, 1600],
  ["83000000-0000-0000-0000-000000000007", "Bui Thu Trang", "0988000107", "customer.boundary.platinum@auracarwash.site", "GOLD", 1450, 3990],
  ["83000000-0000-0000-0000-000000000008", "Do Nhat Minh", "0988000108", "customer.gold.minh@auracarwash.site", "GOLD", 780, 2350],
  ["83000000-0000-0000-0000-000000000009", "Hoang Mai Anh", "0988000109", "customer.platinum.anh@auracarwash.site", "PLATINUM", 1500, 4100],
  ["83000000-0000-0000-0000-000000000010", "Phan Duc Thinh", "0988000110", "customer.platinum.thinh@auracarwash.site", "PLATINUM", 2200, 7200],
  ["83000000-0000-0000-0000-000000000011", "Ngo Thanh Son", "0988000111", "customer.boundary.diamond@auracarwash.site", "PLATINUM", 2600, 9990],
  ["83000000-0000-0000-0000-000000000012", "Mai Khanh Vy", "0988000112", "customer.diamond.vy@auracarwash.site", "DIAMOND", 3600, 12000],
];

const services = [
  ["84000000-0000-0000-0000-000000000001", "Foam Exterior Wash", "High-pressure foam wash for daily city driving dust.", 90000, 25, "ACTIVE", "/images/catalog/foam-exterior-wash.jpg"],
  ["84000000-0000-0000-0000-000000000002", "Interior Vacuum", "Cabin vacuum, mats, dashboard wipe, and quick deodorizing.", 70000, 20, "ACTIVE", "/images/catalog/interior-vacuum.jpg"],
  ["84000000-0000-0000-0000-000000000003", "Tire Shine", "Tire and wheel cleaning with gloss protection.", 45000, 10, "ACTIVE", "/images/catalog/tire-shine.jpg"],
  ["84000000-0000-0000-0000-000000000004", "Ceramic Wax Coat", "Short-term ceramic wax protection for paint gloss.", 180000, 35, "ACTIVE", "/images/catalog/ceramic-wax-coat.jpg"],
  ["84000000-0000-0000-0000-000000000005", "Engine Bay Clean", "Careful engine bay dust removal and wipe-down.", 160000, 30, "ACTIVE", "/images/catalog/engine-bay-clean.jpg"],
  ["84000000-0000-0000-0000-000000000006", "Ozone Odor Treatment", "Deep odor neutralization for cabin air refresh.", 220000, 40, "INACTIVE", "/images/catalog/ozone-odor-treatment.jpg"],
];

const packages = [
  {
    id: "85000000-0000-0000-0000-000000000001",
    name: "City Wash",
    description: "Balanced exterior and cabin care for weekly use.",
    basePrice: 150000,
    duration: 50,
    category: "Daily Care",
    status: "ACTIVE",
    imageUrls: ["/images/catalog/city-wash.jpg", "/images/catalog/foam-exterior-wash.jpg", "/images/catalog/interior-vacuum.jpg"],
    serviceIds: [services[0][0], services[1][0], services[2][0]],
  },
  {
    id: "85000000-0000-0000-0000-000000000002",
    name: "Premium Detail",
    description: "Full wash with wax finish and detailed wheel care.",
    basePrice: 320000,
    duration: 90,
    category: "Detailing",
    status: "ACTIVE",
    imageUrls: ["/images/catalog/premium-detail.jpg", "/images/catalog/ceramic-wax-coat.jpg", "/images/catalog/tire-shine.jpg"],
    serviceIds: [services[0][0], services[1][0], services[2][0], services[3][0]],
  },
  {
    id: "85000000-0000-0000-0000-000000000003",
    name: "Engine Refresh",
    description: "Exterior wash plus engine bay cleaning.",
    basePrice: 280000,
    duration: 75,
    category: "Maintenance",
    status: "ACTIVE",
    imageUrls: ["/images/catalog/engine-refresh.jpg", "/images/catalog/engine-bay-clean.jpg", "/images/catalog/foam-exterior-wash.jpg"],
    serviceIds: [services[0][0], services[4][0]],
  },
];

const combos = [
  {
    id: "86000000-0000-0000-0000-000000000001",
    name: "Monthly Shine Pass",
    description: "Four wash usages for customers who wash every week.",
    price: 520000,
    originalPrice: 600000,
    durationMinutes: 50,
    durationDays: 30,
    maxUsages: 4,
    status: "ACTIVE",
    imageUrls: ["/images/catalog/monthly-shine-pass.jpg", "/images/catalog/city-wash.jpg", "/images/catalog/foam-exterior-wash.jpg"],
    serviceIds: [services[0][0], services[1][0], services[2][0]],
  },
  {
    id: "86000000-0000-0000-0000-000000000002",
    name: "Quarterly Detail Pass",
    description: "Eight usages for regular detailing and paint protection.",
    price: 1850000,
    originalPrice: 2300000,
    durationMinutes: 90,
    durationDays: 90,
    maxUsages: 8,
    status: "ACTIVE",
    imageUrls: ["/images/catalog/quarterly-detail-pass.jpg", "/images/catalog/premium-detail.jpg", "/images/catalog/ceramic-wax-coat.jpg"],
    serviceIds: [services[0][0], services[1][0], services[2][0], services[3][0]],
  },
];

const discounts = [
  {
    id: "87000000-0000-0000-0000-000000000001",
    type: "PROMOTION",
    code: "AUR10",
    name: "Aura Weekday 10%",
    description: "10% discount for weekday bookings.",
    discountType: "PERCENT",
    discountValue: 10,
    minOrderAmount: 100000,
    maxDiscountAmount: 50000,
    requiredPoints: 0,
    targetingMode: "ALL_TIERS",
    tiers: [],
    daysFromNow: [ -7, 60 ],
    status: "ACTIVE",
    services: [services[0][0], services[1][0], services[2][0], services[3][0]],
  },
  {
    id: "87000000-0000-0000-0000-000000000002",
    type: "PROMOTION",
    code: "SILVER50",
    name: "Silver Care 50K",
    description: "50,000 VND discount for Silver tier and above.",
    discountType: "FIXED_AMOUNT",
    discountValue: 50000,
    minOrderAmount: 220000,
    maxDiscountAmount: null,
    requiredPoints: 0,
    targetingMode: "SPECIFIC_TIERS",
    tiers: ["SILVER", "GOLD", "PLATINUM", "DIAMOND"],
    daysFromNow: [ -3, 45 ],
    status: "ACTIVE",
    services: [services[3][0], services[4][0]],
  },
  {
    id: "87000000-0000-0000-0000-000000000003",
    type: "VOUCHER",
    code: "WELCOME30",
    name: "Welcome 30K Voucher",
    description: "30,000 VND voucher for Bronze and above.",
    discountType: "FIXED_AMOUNT",
    discountValue: 30000,
    minOrderAmount: 120000,
    maxDiscountAmount: null,
    requiredPoints: 300,
    targetingMode: "SPECIFIC_TIERS",
    tiers: ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"],
    daysFromNow: [ -5, 90 ],
    status: "ACTIVE",
    services: [services[0][0], services[1][0], services[2][0]],
  },
  {
    id: "87000000-0000-0000-0000-000000000004",
    type: "VOUCHER",
    code: "GOLD70",
    name: "Gold 70K Voucher",
    description: "70,000 VND voucher for Gold tier and above.",
    discountType: "FIXED_AMOUNT",
    discountValue: 70000,
    minOrderAmount: 250000,
    maxDiscountAmount: null,
    requiredPoints: 700,
    targetingMode: "SPECIFIC_TIERS",
    tiers: ["GOLD", "PLATINUM", "DIAMOND"],
    daysFromNow: [ -5, 90 ],
    status: "ACTIVE",
    services: [services[3][0], services[4][0]],
  },
  {
    id: "87000000-0000-0000-0000-000000000005",
    type: "VOUCHER",
    code: "PLATINUM120",
    name: "Platinum 120K Voucher",
    description: "120,000 VND voucher for Platinum tier and above.",
    discountType: "FIXED_AMOUNT",
    discountValue: 120000,
    minOrderAmount: 350000,
    maxDiscountAmount: null,
    requiredPoints: 1200,
    targetingMode: "SPECIFIC_TIERS",
    tiers: ["PLATINUM", "DIAMOND"],
    daysFromNow: [ -5, 90 ],
    status: "ACTIVE",
    services: [services[3][0], services[4][0], services[5][0]],
  },
  {
    id: "87000000-0000-0000-0000-000000000006",
    type: "PROMOTION",
    code: "OLDCARE15",
    name: "Expired Care 15%",
    description: "Expired promotion used to test inactive/expired display.",
    discountType: "PERCENT",
    discountValue: 15,
    minOrderAmount: 100000,
    maxDiscountAmount: 70000,
    requiredPoints: 0,
    targetingMode: "ALL_TIERS",
    tiers: [],
    daysFromNow: [ -90, -10 ],
    status: "INACTIVE",
    services: [],
  },
];

const tierOffers = [
  ["88000000-0000-0000-0000-000000000001", discounts[2].id, "BRONZE", "Redeem Welcome Voucher", 300, 30000, "WELCOME", "bronze"],
  ["88000000-0000-0000-0000-000000000002", discounts[3].id, "GOLD", "Redeem Gold Detail Voucher", 700, 70000, "POPULAR", "gold"],
  ["88000000-0000-0000-0000-000000000003", discounts[4].id, "PLATINUM", "Redeem Platinum Premium Voucher", 1200, 120000, "PREMIUM", "platinum"],
];

const vehicles = customers.map((customer, index) => [
  `89000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
  customer[0],
  `${String(30 + index).padStart(2, "0")}H-${String(120001 + index).padStart(6, "0")}`,
  index % 3 === 0 ? "SUV" : "CAR",
  ["Toyota", "Hyundai", "Honda", "Mazda"][index % 4],
  ["Corolla Cross", "Ioniq", "Civic", "CX-5"][index % 4],
  2020 + (index % 5),
  ["White", "Black", "Silver", "Blue"][index % 4],
]);

function addDays(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

async function ensureUser(client, user) {
  const [id, fullName, phone, email, role, status, dateOfBirth] = user;
  const result = await client.query(
    `
      INSERT INTO users (id, full_name, phone, email, password_hash, role, status, date_of_birth)
      VALUES ($1, $2, $3, $4, crypt($5, gen_salt('bf', 10)), $6, $7, $8)
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        date_of_birth = EXCLUDED.date_of_birth,
        updated_at = now()
      RETURNING id
    `,
    [id, fullName, phone, email, DEFAULT_PASSWORD, role, status, dateOfBirth || null],
  );
  await client.query("INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [result.rows[0].id]);
  return result.rows[0].id;
}

async function main() {
  if (!APPLY) {
    printPlan();
    console.log("\nDry run only. Add --apply to write data.");
    return;
  }

  const client = new Client(dbConfig());
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

    for (const item of tiers) {
      await client.query(
        `
          INSERT INTO tier_configs (tier, display_name, min_points, point_multiplier, priority_score, rank_order, system_tier, active)
          VALUES ($1, $2, $3, $4, $5, $6, true, true)
          ON CONFLICT (tier) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            min_points = EXCLUDED.min_points,
            point_multiplier = EXCLUDED.point_multiplier,
            priority_score = EXCLUDED.priority_score,
            rank_order = EXCLUDED.rank_order,
            active = true,
            updated_at = now()
        `,
        [item.tier, item.displayName, item.minPoints, item.multiplier, item.priority, item.rank],
      );
    }

    for (const row of staff) {
      await ensureUser(client, [row[0], row[1], row[2], row[3], "STAFF", row[4], null]);
    }

    for (const row of customers) {
      const [id, fullName, phone, email, tier, currentPoints, totalEarnedPoints] = row;
      const userId = await ensureUser(client, [id, fullName, phone, email, "CUSTOMER", "ACTIVE", "1995-01-01"]);
      const loyalty = await client.query(
        `
          INSERT INTO loyalty_accounts (customer_id, tier, current_points, total_earned_points)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (customer_id) DO UPDATE SET
            tier = EXCLUDED.tier,
            current_points = EXCLUDED.current_points,
            total_earned_points = EXCLUDED.total_earned_points,
            updated_at = now()
          RETURNING id
        `,
        [userId, tier, currentPoints, totalEarnedPoints],
      );
      const loyaltyId = loyalty.rows[0].id;
      await client.query(
        `
          INSERT INTO tier_histories (loyalty_account_id, old_tier, new_tier, total_points_at_change)
          SELECT $1::uuid, NULL::varchar, $2::varchar, $3::integer
          WHERE NOT EXISTS (
            SELECT 1 FROM tier_histories
            WHERE loyalty_account_id = $1::uuid AND new_tier = $2::varchar AND total_points_at_change = $3::integer
          )
        `,
        [loyaltyId, tier, totalEarnedPoints],
      );
      await client.query(
        `
          INSERT INTO point_transactions (loyalty_account_id, booking_id, type, points, balance_after, reason)
          SELECT $1::uuid, NULL::uuid, 'ADJUST'::varchar, $2::integer, $3::integer, $4::varchar
          WHERE NOT EXISTS (
            SELECT 1 FROM point_transactions
            WHERE loyalty_account_id = $1::uuid AND type = 'ADJUST' AND reason = $4::varchar
          )
        `,
        [loyaltyId, currentPoints, currentPoints, "Showcase initial loyalty balance"],
      );
    }

    for (const row of services) {
      await client.query(
        `
          INSERT INTO services (id, name, description, price, duration_minutes, status, image_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            duration_minutes = EXCLUDED.duration_minutes,
            status = EXCLUDED.status,
            image_url = EXCLUDED.image_url,
            updated_at = now()
        `,
        row,
      );
    }

    for (const pkg of packages) {
      await client.query(
        `
          INSERT INTO packages (id, name, description, base_price, duration_minutes, category, status, image_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            base_price = EXCLUDED.base_price,
            duration_minutes = EXCLUDED.duration_minutes,
            category = EXCLUDED.category,
            status = EXCLUDED.status,
            image_url = EXCLUDED.image_url,
            updated_at = now()
        `,
        [pkg.id, pkg.name, pkg.description, pkg.basePrice, pkg.duration, pkg.category, pkg.status, pkg.imageUrls.join(",")],
      );
      await client.query("DELETE FROM package_services WHERE package_id = $1", [pkg.id]);
      for (const [index, serviceId] of pkg.serviceIds.entries()) {
        const service = services.find((item) => item[0] === serviceId);
        await client.query(
          `
            INSERT INTO package_services (
              package_id, option_id, option_name, option_description,
              option_price, option_duration_minutes, quantity, sort_order
            )
            VALUES ($1, $2, $3, $4, $5, $6, 1, $7)
          `,
          [pkg.id, serviceId, service[1], service[2], service[3], service[4], index + 1],
        );
      }
    }

    for (const combo of combos) {
      await client.query(
        `
          INSERT INTO combos (id, name, description, price, original_price, duration_minutes, duration_days, max_usages, status, image_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            original_price = EXCLUDED.original_price,
            duration_minutes = EXCLUDED.duration_minutes,
            duration_days = EXCLUDED.duration_days,
            max_usages = EXCLUDED.max_usages,
            status = EXCLUDED.status,
            image_url = EXCLUDED.image_url,
            updated_at = now()
        `,
        [combo.id, combo.name, combo.description, combo.price, combo.originalPrice, combo.durationMinutes, combo.durationDays, combo.maxUsages, combo.status, combo.imageUrls.join(",")],
      );
      await client.query("DELETE FROM combo_services WHERE combo_id = $1", [combo.id]);
      for (const [index, serviceId] of combo.serviceIds.entries()) {
        const service = services.find((item) => item[0] === serviceId);
        await client.query(
          `
            INSERT INTO combo_services (
              combo_id, option_id, option_name, option_description,
              option_price, option_duration_minutes, quantity, sort_order
            )
            VALUES ($1, $2, $3, $4, $5, $6, 1, $7)
          `,
          [combo.id, serviceId, service[1], service[2], service[3], service[4], index + 1],
        );
      }
    }

    for (const discount of discounts) {
      await client.query(
        `
          INSERT INTO discounts (
            id, type, code, name, description, discount_type, discount_value,
            min_order_amount, max_discount_amount, required_points, valid_days_after_claim,
            targeting_mode, new_customer_only, usage_limit, start_at, end_at, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 30, $11, false, $12, $13, $14, $15)
          ON CONFLICT (id) DO UPDATE SET
            type = EXCLUDED.type,
            code = EXCLUDED.code,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            discount_type = EXCLUDED.discount_type,
            discount_value = EXCLUDED.discount_value,
            min_order_amount = EXCLUDED.min_order_amount,
            max_discount_amount = EXCLUDED.max_discount_amount,
            required_points = EXCLUDED.required_points,
            targeting_mode = EXCLUDED.targeting_mode,
            usage_limit = EXCLUDED.usage_limit,
            start_at = EXCLUDED.start_at,
            end_at = EXCLUDED.end_at,
            status = EXCLUDED.status,
            updated_at = now()
        `,
        [
          discount.id,
          discount.type,
          discount.code,
          discount.name,
          discount.description,
          discount.discountType,
          discount.discountValue,
          discount.minOrderAmount,
          discount.maxDiscountAmount,
          discount.requiredPoints,
          discount.targetingMode,
          300,
          addDays(discount.daysFromNow[0]),
          addDays(discount.daysFromNow[1]),
          discount.status,
        ],
      );
      await client.query("DELETE FROM discount_tiers WHERE discount_id = $1", [discount.id]);
      for (const tier of discount.tiers) {
        await client.query("INSERT INTO discount_tiers (discount_id, tier) VALUES ($1, $2) ON CONFLICT DO NOTHING", [discount.id, tier]);
      }
      await client.query("DELETE FROM discount_applicable_services WHERE discount_id = $1", [discount.id]);
      for (const serviceId of discount.services) {
        await client.query("INSERT INTO discount_applicable_services (discount_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [discount.id, serviceId]);
      }
    }

    for (const offer of tierOffers) {
      await client.query(
        `
          INSERT INTO tier_voucher_offers (id, discount_id, min_tier, title, points_cost, voucher_value, badge, accent)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            discount_id = EXCLUDED.discount_id,
            min_tier = EXCLUDED.min_tier,
            title = EXCLUDED.title,
            points_cost = EXCLUDED.points_cost,
            voucher_value = EXCLUDED.voucher_value,
            badge = EXCLUDED.badge,
            accent = EXCLUDED.accent,
            updated_at = now()
        `,
        offer,
      );
    }

    for (const vehicle of vehicles) {
      await client.query(
        `
          INSERT INTO vehicles (id, customer_id, plate, type, brand, model, vehicle_year, color, is_primary, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 'ACTIVE')
          ON CONFLICT (plate) DO UPDATE SET
            customer_id = EXCLUDED.customer_id,
            type = EXCLUDED.type,
            brand = EXCLUDED.brand,
            model = EXCLUDED.model,
            vehicle_year = EXCLUDED.vehicle_year,
            color = EXCLUDED.color,
            status = 'ACTIVE',
            updated_at = now()
        `,
        vehicle,
      );
    }

    await client.query("COMMIT");
    printPlan();
    console.log("\nShowcase data was written successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

function printPlan() {
  console.log("Will upsert showcase data:");
  console.log(`- ${staff.length} staff accounts (${staff.filter((item) => item[4] === "ACTIVE").length} active, ${staff.filter((item) => item[4] !== "ACTIVE").length} locked)`);
  console.log(`- ${customers.length} customer accounts with Bronze/Silver/Gold/Platinum and boundary cases`);
  console.log(`- ${services.length} catalog services`);
  console.log(`- ${packages.length} packages`);
  console.log(`- ${combos.length} combos`);
  console.log(`- ${discounts.length} promotions/vouchers`);
  console.log(`- ${tierOffers.length} loyalty voucher offers`);
  console.log("\nCustomer login accounts:");
  for (const customer of customers) {
    console.log(`- ${customer[3]} / ${DEFAULT_PASSWORD} / ${customer[4]} / current=${customer[5]} / lifetime=${customer[6]}`);
  }
  console.log("\nStaff login accounts:");
  for (const item of staff) {
    console.log(`- ${item[3]} / ${DEFAULT_PASSWORD} / ${item[4]}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
