ALTER TABLE customer_combos
    ADD COLUMN IF NOT EXISTS payment_method varchar(20),
    ADD COLUMN IF NOT EXISTS payment_status varchar(20),
    ADD COLUMN IF NOT EXISTS transaction_ref varchar(120),
    ADD COLUMN IF NOT EXISTS qr_url text,
    ADD COLUMN IF NOT EXISTS bank_code varchar(50),
    ADD COLUMN IF NOT EXISTS account_number varchar(100),
    ADD COLUMN IF NOT EXISTS account_name varchar(255),
    ADD COLUMN IF NOT EXISTS transfer_description varchar(255);

ALTER TABLE customer_combos
    ALTER COLUMN activated_at DROP NOT NULL;
