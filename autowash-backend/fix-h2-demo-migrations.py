import os
import re

db_demo_dir = r"e:\SU26\SWP391\autowash-backend\src\main\resources\db\demo"

def fix_intervals(content):
    # Replaces: INTERVAL '45 days' with INTERVAL '45' DAY
    # Replaces: INTERVAL '45 minutes' with INTERVAL '45' MINUTE
    content = re.sub(r"INTERVAL\s+'(\d+)\s+days?'", r"INTERVAL '\1' DAY", content, flags=re.IGNORECASE)
    content = re.sub(r"INTERVAL\s+'(\d+)\s+minutes?'", r"INTERVAL '\1' MINUTE", content, flags=re.IGNORECASE)
    return content

def fix_v101():
    filepath = os.path.join(db_demo_dir, "V101__seed_promotions_and_notifications.sql")
    if not os.path.exists(filepath):
        print("V101 not found")
        return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check if delete block is already there
    if "DELETE FROM promotions" not in content:
        delete_block = """-- Clean up promotions and notifications
DELETE FROM promotion_tiers WHERE promotion_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM promotions WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM notifications WHERE title IN ('Welcome to Aura Car Care!', 'Summer Sale is here');

"""
        content = delete_block + content

    # Replace ON CONFLICT DO NOTHING;
    content = content.replace("ON CONFLICT DO NOTHING;", ";")
    content = fix_intervals(content)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed V101")

def fix_v102():
    filepath = os.path.join(db_demo_dir, "V102__seed_vouchers.sql")
    if not os.path.exists(filepath):
        print("V102 not found")
        return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Check if delete block is already there
    if "DELETE FROM voucher_templates" not in content:
        # Collect UUIDs
        uuids = re.findall(r"VALUES\s*\(\s*'([^']+)'", content)
        uuids_str = ", ".join(f"'{u}'" for u in uuids)
        delete_block = f"""-- Clean up vouchers
DELETE FROM voucher_tiers WHERE voucher_template_id IN ({uuids_str});
DELETE FROM voucher_templates WHERE id IN ({uuids_str});

"""
        content = delete_block + content

    content = content.replace("ON CONFLICT DO NOTHING;", ";")
    content = fix_intervals(content)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed V102")

def fix_v103():
    filepath = os.path.join(db_demo_dir, "V103__seed_blog_categories.sql")
    if not os.path.exists(filepath):
        print("V103 not found")
        return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if "DELETE FROM blog_categories" not in content:
        delete_block = """-- Clean up blog categories
DELETE FROM blog_categories WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444');

"""
        content = delete_block + content

    content = re.sub(r'ON CONFLICT\s*\(\s*"id"\s*\)\s*DO\s*UPDATE[^;]*;', ';', content, flags=re.DOTALL | re.IGNORECASE)
    content = fix_intervals(content)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed V103")

def fix_v104():
    filepath = os.path.join(db_demo_dir, "V104__seed_blog_articles.sql")
    if not os.path.exists(filepath):
        print("V104 not found")
        return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    content = fix_intervals(content)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed V104")

def fix_v105():
    filepath = os.path.join(db_demo_dir, "V105__seed_announcements.sql")
    if not os.path.exists(filepath):
        print("V105 not found")
        return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    content = fix_intervals(content)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed V105")

def fix_v106():
    filepath = os.path.join(db_demo_dir, "V106__seed_services_and_packages.sql")
    if not os.path.exists(filepath):
        print("V106 not found")
        return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace("ON CONFLICT (id) DO NOTHING;", ";")
    content = content.replace("ON CONFLICT DO NOTHING;", ";")
    content = fix_intervals(content)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed V106")

def fix_v100():
    filepath = os.path.join(db_demo_dir, "V100__add_demo_data.sql")
    if not os.path.exists(filepath):
        print("V100 not found")
        return
    
    h2_compatible_sql = """-- Add demo users (idempotent by email)
INSERT INTO "users" (id, full_name, phone, email, password_hash, role, status) VALUES
('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Admin User', '0901234567', 'admin@autowash.com', '$2b$12$0rC9hApQ6VhjWR.5pcH5.uHALN3FYhVARFevjQ1/zR4ny25HgVxvC', 'ADMIN', 'ACTIVE'),
('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Staff User', '0901234568', 'staff@autowash.com', '$2b$12$0rC9hApQ6VhjWR.5pcH5.uHALN3FYhVARFevjQ1/zR4ny25HgVxvC', 'STAFF', 'ACTIVE'),
('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Customer User', '0901234569', 'customer@autowash.com', '$2b$12$0rC9hApQ6VhjWR.5pcH5.uHALN3FYhVARFevjQ1/zR4ny25HgVxvC', 'CUSTOMER', 'ACTIVE')
ON CONFLICT DO NOTHING;

-- Loyalty Account
INSERT INTO loyalty_accounts (id, customer_id, current_points, total_earned_points, tier)
VALUES ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 150, 150, 'BRONZE')
ON CONFLICT DO NOTHING;

-- Vehicles
INSERT INTO vehicles (id, customer_id, plate, type, brand, model, vehicle_year, color, is_primary)
VALUES ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', '30A-999.99', 'CAR', 'Mazda', 'Mazda 3', 2022, 'Red', true)
ON CONFLICT DO NOTHING;
"""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(h2_compatible_sql)
    print("Fixed V100 with H2 compatible SQL")

if __name__ == "__main__":
    fix_v100()
    fix_v101()
    fix_v102()
    fix_v103()
    fix_v104()
    fix_v105()
    fix_v106()
    print("All demo migrations fixed including intervals!")

