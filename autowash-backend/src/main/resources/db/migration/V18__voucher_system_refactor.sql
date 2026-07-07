-- 1. Refactor bảng vouchers thành voucher_templates
ALTER TABLE vouchers RENAME TO voucher_templates;

-- Thêm các cột mới cho voucher_templates
ALTER TABLE voucher_templates ADD COLUMN required_points INT NOT NULL DEFAULT 0;
ALTER TABLE voucher_templates ADD COLUMN valid_days_after_claim INT NOT NULL DEFAULT 30;
ALTER TABLE voucher_templates ADD COLUMN description TEXT;

-- Rename constraint nếu cần (Optional but good practice)
-- Postgres thường tự update tên constraint đối với rename table, nhưng nếu cần thiết lập lại thì drop/create.

-- 2. Tạo bảng voucher_applicable_services (ràng buộc theo dịch vụ)
CREATE TABLE voucher_applicable_services (
                                             voucher_template_id UUID NOT NULL REFERENCES voucher_templates(id) ON DELETE CASCADE,
                                             service_id          UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
                                             PRIMARY KEY (voucher_template_id, service_id)
);

-- 3. Tạo bảng user_vouchers (Ví Voucher của khách)
CREATE TABLE user_vouchers (
                               id                   UUID PRIMARY KEY,
                               user_id              UUID NOT NULL REFERENCES users(id),
                               voucher_template_id  UUID NOT NULL REFERENCES voucher_templates(id),
                               status               VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
                               issued_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                               expired_at           TIMESTAMP WITH TIME ZONE NOT NULL,
                               used_at              TIMESTAMP WITH TIME ZONE,
                               booking_id           UUID REFERENCES bookings(id),
                               CONSTRAINT chk_user_voucher_status CHECK (status IN ('AVAILABLE','USED','EXPIRED'))
);

CREATE INDEX idx_user_vouchers_user_status ON user_vouchers(user_id, status);
CREATE INDEX idx_user_vouchers_expired ON user_vouchers(expired_at);

-- 4. Thêm trường ngày sinh & khóa sinh nhật vào users
ALTER TABLE users ADD COLUMN date_of_birth DATE;
ALTER TABLE users ADD COLUMN birthday_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. Rename FK ở bảng voucher_tiers
ALTER TABLE voucher_tiers RENAME COLUMN voucher_id TO voucher_template_id;
