INSERT INTO users (id, full_name, phone, email, password_hash, role, status, avatar_url, date_of_birth)
VALUES (
    'f23a1a29-b551-4021-af92-62e1906f2458',
    'Manager Demo',
    '0960000001',
    'manager@autowash.com',
    crypt('Password123@', gen_salt('bf', 10)),
    'MANAGER',
    'ACTIVE',
    NULL,
    NULL
)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = now();

INSERT INTO user_preferences (user_id, language, theme, notifications_enabled, email_notifications, sms_notifications)
VALUES ('f23a1a29-b551-4021-af92-62e1906f2458', 'VI', 'LIGHT', true, true, true)
ON CONFLICT (user_id) DO NOTHING;
