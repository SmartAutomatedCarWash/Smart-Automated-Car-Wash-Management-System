-- Clean up vouchers
DELETE FROM voucher_tiers WHERE voucher_template_id IN ('7790a5fe-8145-4810-8c7d-876cc52bc3c9', '7790a5fe-8145-4810-8c7d-876cc52bc3c9', '7790a5fe-8145-4810-8c7d-876cc52bc3c9', '7790a5fe-8145-4810-8c7d-876cc52bc3c9', '7790a5fe-8145-4810-8c7d-876cc52bc3c9', '7790a5fe-8145-4810-8c7d-876cc52bc3c9', 'd82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'd82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'd82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'd82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'd82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'd82d2a8b-b6bb-4d60-b137-4c1e8244106d', '257ca040-2b0f-48ad-b8e4-c57883226e83', '257ca040-2b0f-48ad-b8e4-c57883226e83', '257ca040-2b0f-48ad-b8e4-c57883226e83', '257ca040-2b0f-48ad-b8e4-c57883226e83', '257ca040-2b0f-48ad-b8e4-c57883226e83', 'e8857f53-f324-4782-8b9b-78ff29b3d654', 'e8857f53-f324-4782-8b9b-78ff29b3d654', 'e8857f53-f324-4782-8b9b-78ff29b3d654', 'e8857f53-f324-4782-8b9b-78ff29b3d654', 'e8857f53-f324-4782-8b9b-78ff29b3d654', '35eb7431-8a51-4a3b-93bd-40695816cc77', '35eb7431-8a51-4a3b-93bd-40695816cc77', '35eb7431-8a51-4a3b-93bd-40695816cc77', '35eb7431-8a51-4a3b-93bd-40695816cc77', '35eb7431-8a51-4a3b-93bd-40695816cc77', '2907b4d3-5097-4fef-a1f8-4d1346c78e37', '2907b4d3-5097-4fef-a1f8-4d1346c78e37', '2907b4d3-5097-4fef-a1f8-4d1346c78e37', '2907b4d3-5097-4fef-a1f8-4d1346c78e37', '48b09135-f382-4b39-88e7-ae2fc99c6659', '48b09135-f382-4b39-88e7-ae2fc99c6659', '48b09135-f382-4b39-88e7-ae2fc99c6659', '48b09135-f382-4b39-88e7-ae2fc99c6659', '89f61497-18ef-4838-ad1d-66d906362829', '89f61497-18ef-4838-ad1d-66d906362829', '89f61497-18ef-4838-ad1d-66d906362829', '89f61497-18ef-4838-ad1d-66d906362829', 'cd31c724-75f8-4997-961a-bad69f74167b', 'cd31c724-75f8-4997-961a-bad69f74167b', 'cd31c724-75f8-4997-961a-bad69f74167b', '5305d936-4ddb-4523-95ed-096b49c32f43', '5305d936-4ddb-4523-95ed-096b49c32f43', '5305d936-4ddb-4523-95ed-096b49c32f43', '996d45d2-81b3-4e43-9de1-317c49cf9ee9', '996d45d2-81b3-4e43-9de1-317c49cf9ee9', '996d45d2-81b3-4e43-9de1-317c49cf9ee9', '08d91cac-122b-42cf-a958-405258a198af', '08d91cac-122b-42cf-a958-405258a198af', '8acabb4f-601d-4cd7-b9d7-c126a13a6b86', '8acabb4f-601d-4cd7-b9d7-c126a13a6b86', '06d8e794-7dfb-4e0f-a948-d99991f8a07c', '06d8e794-7dfb-4e0f-a948-d99991f8a07c', '106bd3e5-8836-4a83-b27a-2f1e4b751a10', '106bd3e5-8836-4a83-b27a-2f1e4b751a10');
DELETE FROM voucher_templates WHERE id IN ('7790a5fe-8145-4810-8c7d-876cc52bc3c9', '7790a5fe-8145-4810-8c7d-876cc52bc3c9', '7790a5fe-8145-4810-8c7d-876cc52bc3c9', '7790a5fe-8145-4810-8c7d-876cc52bc3c9', '7790a5fe-8145-4810-8c7d-876cc52bc3c9', '7790a5fe-8145-4810-8c7d-876cc52bc3c9', 'd82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'd82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'd82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'd82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'd82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'd82d2a8b-b6bb-4d60-b137-4c1e8244106d', '257ca040-2b0f-48ad-b8e4-c57883226e83', '257ca040-2b0f-48ad-b8e4-c57883226e83', '257ca040-2b0f-48ad-b8e4-c57883226e83', '257ca040-2b0f-48ad-b8e4-c57883226e83', '257ca040-2b0f-48ad-b8e4-c57883226e83', 'e8857f53-f324-4782-8b9b-78ff29b3d654', 'e8857f53-f324-4782-8b9b-78ff29b3d654', 'e8857f53-f324-4782-8b9b-78ff29b3d654', 'e8857f53-f324-4782-8b9b-78ff29b3d654', 'e8857f53-f324-4782-8b9b-78ff29b3d654', '35eb7431-8a51-4a3b-93bd-40695816cc77', '35eb7431-8a51-4a3b-93bd-40695816cc77', '35eb7431-8a51-4a3b-93bd-40695816cc77', '35eb7431-8a51-4a3b-93bd-40695816cc77', '35eb7431-8a51-4a3b-93bd-40695816cc77', '2907b4d3-5097-4fef-a1f8-4d1346c78e37', '2907b4d3-5097-4fef-a1f8-4d1346c78e37', '2907b4d3-5097-4fef-a1f8-4d1346c78e37', '2907b4d3-5097-4fef-a1f8-4d1346c78e37', '48b09135-f382-4b39-88e7-ae2fc99c6659', '48b09135-f382-4b39-88e7-ae2fc99c6659', '48b09135-f382-4b39-88e7-ae2fc99c6659', '48b09135-f382-4b39-88e7-ae2fc99c6659', '89f61497-18ef-4838-ad1d-66d906362829', '89f61497-18ef-4838-ad1d-66d906362829', '89f61497-18ef-4838-ad1d-66d906362829', '89f61497-18ef-4838-ad1d-66d906362829', 'cd31c724-75f8-4997-961a-bad69f74167b', 'cd31c724-75f8-4997-961a-bad69f74167b', 'cd31c724-75f8-4997-961a-bad69f74167b', '5305d936-4ddb-4523-95ed-096b49c32f43', '5305d936-4ddb-4523-95ed-096b49c32f43', '5305d936-4ddb-4523-95ed-096b49c32f43', '996d45d2-81b3-4e43-9de1-317c49cf9ee9', '996d45d2-81b3-4e43-9de1-317c49cf9ee9', '996d45d2-81b3-4e43-9de1-317c49cf9ee9', '08d91cac-122b-42cf-a958-405258a198af', '08d91cac-122b-42cf-a958-405258a198af', '8acabb4f-601d-4cd7-b9d7-c126a13a6b86', '8acabb4f-601d-4cd7-b9d7-c126a13a6b86', '06d8e794-7dfb-4e0f-a948-d99991f8a07c', '06d8e794-7dfb-4e0f-a948-d99991f8a07c', '106bd3e5-8836-4a83-b27a-2f1e4b751a10', '106bd3e5-8836-4a83-b27a-2f1e4b751a10');

-- Seed default loyalty vouchers

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('7790a5fe-8145-4810-8c7d-876cc52bc3c9', 'BRONZE20', '20,000 VND Off', 'Bronze Member Exclusive', 'FIXED_AMOUNT', 20000, 0, NULL, 100, 30, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('7790a5fe-8145-4810-8c7d-876cc52bc3c9', 'BRONZE') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('7790a5fe-8145-4810-8c7d-876cc52bc3c9', 'SILVER') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('7790a5fe-8145-4810-8c7d-876cc52bc3c9', 'GOLD') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('7790a5fe-8145-4810-8c7d-876cc52bc3c9', 'PLATINUM') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('7790a5fe-8145-4810-8c7d-876cc52bc3c9', 'DIAMOND') ;

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('d82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'BRONZE50', '50,000 VND Off', 'Bronze Member Exclusive', 'FIXED_AMOUNT', 50000, 0, NULL, 250, 30, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('d82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'BRONZE') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('d82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'SILVER') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('d82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'GOLD') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('d82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'PLATINUM') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('d82d2a8b-b6bb-4d60-b137-4c1e8244106d', 'DIAMOND') ;

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('257ca040-2b0f-48ad-b8e4-c57883226e83', 'SILVER50', '50,000 VND Off', 'Silver Member Exclusive', 'FIXED_AMOUNT', 50000, 0, NULL, 200, 45, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('257ca040-2b0f-48ad-b8e4-c57883226e83', 'SILVER') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('257ca040-2b0f-48ad-b8e4-c57883226e83', 'GOLD') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('257ca040-2b0f-48ad-b8e4-c57883226e83', 'PLATINUM') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('257ca040-2b0f-48ad-b8e4-c57883226e83', 'DIAMOND') ;

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('e8857f53-f324-4782-8b9b-78ff29b3d654', 'SILVER100', '100,000 VND Off', 'Silver Member Exclusive', 'FIXED_AMOUNT', 100000, 0, NULL, 450, 45, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('e8857f53-f324-4782-8b9b-78ff29b3d654', 'SILVER') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('e8857f53-f324-4782-8b9b-78ff29b3d654', 'GOLD') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('e8857f53-f324-4782-8b9b-78ff29b3d654', 'PLATINUM') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('e8857f53-f324-4782-8b9b-78ff29b3d654', 'DIAMOND') ;

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('35eb7431-8a51-4a3b-93bd-40695816cc77', 'SILVER10', '10% Off', 'Silver Member Exclusive', 'PERCENT', 10, 0, 100000, 300, 45, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('35eb7431-8a51-4a3b-93bd-40695816cc77', 'SILVER') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('35eb7431-8a51-4a3b-93bd-40695816cc77', 'GOLD') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('35eb7431-8a51-4a3b-93bd-40695816cc77', 'PLATINUM') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('35eb7431-8a51-4a3b-93bd-40695816cc77', 'DIAMOND') ;

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('2907b4d3-5097-4fef-a1f8-4d1346c78e37', 'GOLD50', '50,000 VND Off', 'Gold Member Exclusive', 'FIXED_AMOUNT', 50000, 0, NULL, 180, 60, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('2907b4d3-5097-4fef-a1f8-4d1346c78e37', 'GOLD') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('2907b4d3-5097-4fef-a1f8-4d1346c78e37', 'PLATINUM') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('2907b4d3-5097-4fef-a1f8-4d1346c78e37', 'DIAMOND') ;

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('48b09135-f382-4b39-88e7-ae2fc99c6659', 'GOLD100', '100,000 VND Off', 'Gold Member Exclusive', 'FIXED_AMOUNT', 100000, 0, NULL, 400, 60, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('48b09135-f382-4b39-88e7-ae2fc99c6659', 'GOLD') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('48b09135-f382-4b39-88e7-ae2fc99c6659', 'PLATINUM') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('48b09135-f382-4b39-88e7-ae2fc99c6659', 'DIAMOND') ;

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('89f61497-18ef-4838-ad1d-66d906362829', 'GOLD10', '10% Off', 'Gold Member Exclusive', 'PERCENT', 10, 0, 150000, 250, 60, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('89f61497-18ef-4838-ad1d-66d906362829', 'GOLD') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('89f61497-18ef-4838-ad1d-66d906362829', 'PLATINUM') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('89f61497-18ef-4838-ad1d-66d906362829', 'DIAMOND') ;

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('cd31c724-75f8-4997-961a-bad69f74167b', 'PLAT100', '100,000 VND Off', 'Platinum Exclusive', 'FIXED_AMOUNT', 100000, 0, NULL, 300, 90, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('cd31c724-75f8-4997-961a-bad69f74167b', 'PLATINUM') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('cd31c724-75f8-4997-961a-bad69f74167b', 'DIAMOND') ;

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('5305d936-4ddb-4523-95ed-096b49c32f43', 'PLAT200', '200,000 VND Off', 'Platinum Exclusive', 'FIXED_AMOUNT', 200000, 0, NULL, 700, 90, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('5305d936-4ddb-4523-95ed-096b49c32f43', 'PLATINUM') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('5305d936-4ddb-4523-95ed-096b49c32f43', 'DIAMOND') ;

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('996d45d2-81b3-4e43-9de1-317c49cf9ee9', 'PLAT15', '15% Off', 'Platinum Exclusive', 'PERCENT', 15, 0, 250000, 400, 90, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('996d45d2-81b3-4e43-9de1-317c49cf9ee9', 'PLATINUM') ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('996d45d2-81b3-4e43-9de1-317c49cf9ee9', 'DIAMOND') ;

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('08d91cac-122b-42cf-a958-405258a198af', 'DIA100', '100,000 VND Off', 'Diamond Exclusive', 'FIXED_AMOUNT', 100000, 0, NULL, 250, 120, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('08d91cac-122b-42cf-a958-405258a198af', 'DIAMOND') ;

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('8acabb4f-601d-4cd7-b9d7-c126a13a6b86', 'DIA200', '200,000 VND Off', 'Diamond Exclusive', 'FIXED_AMOUNT', 200000, 0, NULL, 500, 120, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('8acabb4f-601d-4cd7-b9d7-c126a13a6b86', 'DIAMOND') ;

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('06d8e794-7dfb-4e0f-a948-d99991f8a07c', 'DIA20P', '20% Off', 'Diamond Exclusive', 'PERCENT', 20, 0, 300000, 600, 120, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('06d8e794-7dfb-4e0f-a948-d99991f8a07c', 'DIAMOND') ;

INSERT INTO voucher_templates (id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, required_points, valid_days_after_claim, new_customer_only, start_at, end_at, status, used_count)
VALUES ('106bd3e5-8836-4a83-b27a-2f1e4b751a10', 'DIA30', '30% Off', 'Diamond Exclusive', 'PERCENT', 30, 0, 300000, 1500, 120, false, CURRENT_TIMESTAMP, '2030-12-31 23:59:59', 'ACTIVE', 0) ;
INSERT INTO voucher_tiers (voucher_template_id, tier) VALUES ('106bd3e5-8836-4a83-b27a-2f1e4b751a10', 'DIAMOND') ;
