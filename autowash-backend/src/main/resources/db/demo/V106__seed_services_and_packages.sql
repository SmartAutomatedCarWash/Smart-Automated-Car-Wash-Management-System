-- V106: Seed services, packages, combos with full English content
-- Uses fixed UUIDs compatible with uuid columns
-- Correct column names per schema: packages(base_price, status), combos(price, max_usages, duration_days)

-- ── Clean up old demo data from V100 (disabled for H2 compatibility) ───
-- DELETE FROM packages; -- Done automatically on fresh H2 memory boot


-- ── SERVICES ─────────────────────────────────────────────────────────────────
INSERT INTO services (id, name, description, price, duration_minutes, status) VALUES
('aa000001-0000-0000-0000-000000000001','Basic Exterior Wash',                 'High-pressure rinse, foam wash, and full-body hand dry',80000,15,'ACTIVE'),
('aa000001-0000-0000-0000-000000000002','Touchless Foam Wash',                 'High-pressure snow foam, no-touch wash to minimise paint swirls',120000,20,'ACTIVE'),
('aa000001-0000-0000-0000-000000000003','Undercarriage Rinse',                 'High-pressure rinse to remove mud and debris from under the vehicle',50000,10,'ACTIVE'),
('aa000001-0000-0000-0000-000000000004','Wheel & Tire Cleaning',               'Remove brake dust and road grime from rims and tires',40000,10,'ACTIVE'),
('aa000001-0000-0000-0000-000000000005','Tire Dressing',                       'Apply dressing for deep black finish and UV protection',30000,5,'ACTIVE'),
('aa000001-0000-0000-0000-000000000006','Bug & Tar Removal',                   'Solvent to dissolve road tar, tree sap, and insect residue',150000,20,'ACTIVE'),
('aa000001-0000-0000-0000-000000000007','Iron Decontamination',                'Chemical remover to dissolve embedded iron particles and brake dust',200000,25,'ACTIVE'),
('aa000001-0000-0000-0000-000000000008','Clay Bar Treatment',                  'Clay bar decontamination for smooth paint before polishing or coating',250000,30,'ACTIVE'),
('aa000001-0000-0000-0000-000000000009','Door Jamb Cleaning',                  'Detail clean of door jamb edges and weatherstrip areas',40000,10,'ACTIVE'),
('aa000001-0000-0000-0000-000000000010','Wheel Well Cleaning',                 'Deep clean of wheel arches to remove packed mud and road deposits',50000,10,'ACTIVE'),
('aa000001-0000-0000-0000-000000000011','Basic Interior Vacuum',               'Vacuum carpets, seats, and seat crevices',60000,15,'ACTIVE'),
('aa000001-0000-0000-0000-000000000012','Dashboard & Console Cleaning',        'Wipe down and lightly condition dashboard, console, and air vents',50000,10,'ACTIVE'),
('aa000001-0000-0000-0000-000000000013','Fabric Seat Cleaning',                'Machine-extract stains and dirt from fabric upholstery',150000,30,'ACTIVE'),
('aa000001-0000-0000-0000-000000000014','Leather Seat Cleaning',               'Remove dirt and body oils from leather seat surfaces',200000,30,'ACTIVE'),
('aa000001-0000-0000-0000-000000000015','Leather Conditioning',                'Apply conditioner to prevent cracking and maintain suppleness',150000,20,'ACTIVE'),
('aa000001-0000-0000-0000-000000000016','Floor Mat Shampoo',                   'Machine-wash removable floor mats with specialist shampoo',100000,20,'ACTIVE'),
('aa000001-0000-0000-0000-000000000017','Roof Lining Cleaning',                'Spot-clean headliner to remove stains and musty odours',200000,30,'ACTIVE'),
('aa000001-0000-0000-0000-000000000018','Ozone Odor Elimination',              'Ozone treatment to neutralise cigarette, mould, and pet odours',150000,20,'ACTIVE'),
('aa000001-0000-0000-0000-000000000019','AC Vent Cleaning',                    'Remove dust, mould, and bacteria from air-conditioning vents',80000,15,'ACTIVE'),
('aa000001-0000-0000-0000-000000000020','Interior Steam Sterilization',        'Hot-steam sanitisation of all interior surfaces',300000,40,'ACTIVE'),
('aa000001-0000-0000-0000-000000000021','Trunk Cleaning',                      'Vacuum and wipe down boot/cargo area',40000,10,'ACTIVE'),
('aa000001-0000-0000-0000-000000000022','Steering Wheel & Gear Shift Cleaning','Sanitise and detail high-touch contact surfaces',30000,5,'ACTIVE'),
('aa000001-0000-0000-0000-000000000023','Interior & Exterior Glass Cleaning',  'Streak-free clean of all glass surfaces inside and outside',50000,10,'ACTIVE'),
('aa000001-0000-0000-0000-000000000024','Windshield Water-Repellent Coating',  'Nano-coating for hydrophobic rain-beading effect on windshield',250000,20,'ACTIVE'),
('aa000001-0000-0000-0000-000000000025','Mirror Cleaning',                     'Clean and polish all interior and exterior mirrors',20000,5,'ACTIVE'),
('aa000001-0000-0000-0000-000000000026','Trim Restoration',                    'Restore faded plastic trim to original deep black',150000,20,'ACTIVE'),
('aa000001-0000-0000-0000-000000000027','Chrome Polish',                       'Polish chrome grille, handles, and trim accents to mirror finish',100000,15,'ACTIVE'),
('aa000001-0000-0000-0000-000000000028','Basic Engine Bay Cleaning',           'Wipe engine bay surfaces; high-pressure rinse avoiding electricals',150000,20,'ACTIVE'),
('aa000001-0000-0000-0000-000000000029','Deep Engine Bay Detailing',           'Thorough engine bay detailing with controlled steam and brushes',350000,40,'ACTIVE'),
('aa000001-0000-0000-0000-000000000030','Engine Bay Plastic Dressing',         'Apply dressing to engine bay plastics to prevent discolouration',100000,15,'ACTIVE'),
('aa000001-0000-0000-0000-000000000031','One-Step Paint Polish',               'Single-stage machine polish to remove light swirls and boost gloss',800000,90,'ACTIVE'),
('aa000001-0000-0000-0000-000000000032','Two-Step Paint Correction',           'Dual-stage polish for deep scratch removal and paint restoration',1800000,180,'ACTIVE'),
('aa000001-0000-0000-0000-000000000033','Carnauba Wax Application',            'Natural carnauba wax for deep gloss and short-term protection (1-2 months)',300000,30,'ACTIVE'),
('aa000001-0000-0000-0000-000000000034','Paint Sealant',                       'Synthetic sealant for durable paint protection (4-6 months)',500000,45,'ACTIVE'),
('aa000001-0000-0000-0000-000000000035','Basic Nano Coating',                  'Entry-level nano coating lasting 6-12 months',1500000,90,'ACTIVE'),
('aa000001-0000-0000-0000-000000000036','Ceramic Coating 9H (Small Car)',      '9H ceramic coating for sedans and hatchbacks; 2-year warranty',4500000,240,'ACTIVE'),
('aa000001-0000-0000-0000-000000000037','Ceramic Coating 9H (Medium/SUV)',     '9H ceramic coating for crossovers and SUVs; 2-year warranty',6000000,300,'ACTIVE'),
('aa000001-0000-0000-0000-000000000038','Ceramic Coating 9H (Large/7-Seat)',   '9H ceramic coating for large SUVs and 7-seat MPVs; 2-year warranty',8000000,360,'ACTIVE'),
('aa000001-0000-0000-0000-000000000039','Premium Graphene Ceramic Coating',    'Graphene 10H hardness coating with 5-year warranty',15000000,420,'ACTIVE'),
('aa000001-0000-0000-0000-000000000040','Wheel Ceramic Coating',               'Ceramic coating on wheels to repel brake dust',800000,60,'ACTIVE'),
('aa000001-0000-0000-0000-000000000041','Headlight Ceramic Coating',           'Ceramic protection on headlight lenses against UV yellowing',300000,30,'ACTIVE'),
('aa000001-0000-0000-0000-000000000042','Headlight Restoration',               'Polish and restore clarity to yellowed headlight lenses',400000,45,'ACTIVE'),
('aa000001-0000-0000-0000-000000000043','Undercarriage Anti-Rust Coating',     'Spray-on anti-rust and sound-deadening compound for undercarriage',2500000,120,'ACTIVE'),
('aa000001-0000-0000-0000-000000000044','Full-Car UV Sterilization',           'UV-C lamp sterilisation to eliminate bacteria in the cabin',200000,20,'ACTIVE'),
('aa000001-0000-0000-0000-000000000045','Anti-Bacterial Interior Spray',       'Spray antibacterial solution across all interior surfaces',100000,10,'ACTIVE'),
('aa000001-0000-0000-0000-000000000046','Battery Terminal Cleaning',           'Remove oxidation from battery terminals to improve electrical contact',30000,5,'ACTIVE'),
('aa000001-0000-0000-0000-000000000047','Sunroof Track Cleaning',              'Clean sunroof sliding tracks to prevent jamming and leaks',50000,10,'ACTIVE'),
('aa000001-0000-0000-0000-000000000048','Convertible Soft-Top Cleaning',       'Clean and protect convertible fabric hood against UV and moisture',300000,30,'ACTIVE'),
('aa000001-0000-0000-0000-000000000049','Paint Thickness Inspection',          'Gauge paint thickness to detect prior resprays or hidden damage',100000,15,'ACTIVE'),
('aa000001-0000-0000-0000-000000000050','Compressed Air Drying',               'Blow-dry entire vehicle to eliminate water spots',50000,10,'ACTIVE')
;

-- ── PACKAGES ─────────────────────────────────────────────────────────────────
INSERT INTO packages (id, name, description, base_price, duration_minutes, status) VALUES
('bb000002-0000-0000-0000-000000000001','Express Wash',                    'Quick daily-driver wash completed in under 40 minutes',189000,40,'ACTIVE'),
('bb000002-0000-0000-0000-000000000002','Premium Touchless Wash',          'Snow-foam no-touch wash with wheel, glass, and tyre care',259000,55,'ACTIVE'),
('bb000002-0000-0000-0000-000000000003','Interior Care',                   'Deep-clean and deodorise the entire cabin',359000,75,'ACTIVE'),
('bb000002-0000-0000-0000-000000000004','Exterior Care',                   'Focused exterior clean and trim restoration',439000,75,'ACTIVE'),
('bb000002-0000-0000-0000-000000000005','Standard Wash',                   'Our most popular package — exterior and basic interior cleaning',219000,50,'ACTIVE'),
('bb000002-0000-0000-0000-000000000006','Full Detailing',                  'Comprehensive interior + exterior detailing, polish, and wax',1950000,270,'ACTIVE'),
('bb000002-0000-0000-0000-000000000007','Premium Leather Interior Care',   'Specialist leather clean, conditioning, steam and UV sanitation',839000,125,'ACTIVE'),
('bb000002-0000-0000-0000-000000000008','Paint Protection Package',        'Iron decon, clay bar, carnauba wax, and paint sealant',1120000,130,'ACTIVE'),
('bb000002-0000-0000-0000-000000000009','Deodorize & Sanitize Package',    'Ozone, steam sterilisation, UV sanitation, and antibacterial spray',675000,90,'ACTIVE'),
('bb000002-0000-0000-0000-000000000010','Engine Bay & Undercarriage Care', 'Undercarriage rinse, engine bay detail, plastic dressing, battery clean',609000,90,'ACTIVE')
;

-- ── PACKAGE → SERVICE MAPPING ────────────────────────────────────────────────
INSERT INTO package_services (package_id, option_id, option_name, option_price, option_duration_minutes) VALUES
-- Express Wash
('bb000002-0000-0000-0000-000000000001','aa000001-0000-0000-0000-000000000001','Basic Exterior Wash',80000,15),
('bb000002-0000-0000-0000-000000000001','aa000001-0000-0000-0000-000000000005','Tire Dressing',30000,5),
('bb000002-0000-0000-0000-000000000001','aa000001-0000-0000-0000-000000000023','Interior & Exterior Glass Cleaning',50000,10),
('bb000002-0000-0000-0000-000000000001','aa000001-0000-0000-0000-000000000050','Compressed Air Drying',50000,10),
-- Premium Touchless Wash
('bb000002-0000-0000-0000-000000000002','aa000001-0000-0000-0000-000000000002','Touchless Foam Wash',120000,20),
('bb000002-0000-0000-0000-000000000002','aa000001-0000-0000-0000-000000000003','Undercarriage Rinse',50000,10),
('bb000002-0000-0000-0000-000000000002','aa000001-0000-0000-0000-000000000004','Wheel & Tire Cleaning',40000,10),
('bb000002-0000-0000-0000-000000000002','aa000001-0000-0000-0000-000000000005','Tire Dressing',30000,5),
('bb000002-0000-0000-0000-000000000002','aa000001-0000-0000-0000-000000000023','Interior & Exterior Glass Cleaning',50000,10),
-- Interior Care
('bb000002-0000-0000-0000-000000000003','aa000001-0000-0000-0000-000000000011','Basic Interior Vacuum',60000,15),
('bb000002-0000-0000-0000-000000000003','aa000001-0000-0000-0000-000000000012','Dashboard & Console Cleaning',50000,10),
('bb000002-0000-0000-0000-000000000003','aa000001-0000-0000-0000-000000000016','Floor Mat Shampoo',100000,20),
('bb000002-0000-0000-0000-000000000003','aa000001-0000-0000-0000-000000000018','Ozone Odor Elimination',150000,20),
('bb000002-0000-0000-0000-000000000003','aa000001-0000-0000-0000-000000000021','Trunk Cleaning',40000,10),
-- Exterior Care
('bb000002-0000-0000-0000-000000000004','aa000001-0000-0000-0000-000000000002','Touchless Foam Wash',120000,20),
('bb000002-0000-0000-0000-000000000004','aa000001-0000-0000-0000-000000000004','Wheel & Tire Cleaning',40000,10),
('bb000002-0000-0000-0000-000000000004','aa000001-0000-0000-0000-000000000005','Tire Dressing',30000,5),
('bb000002-0000-0000-0000-000000000004','aa000001-0000-0000-0000-000000000006','Bug & Tar Removal',150000,20),
('bb000002-0000-0000-0000-000000000004','aa000001-0000-0000-0000-000000000026','Trim Restoration',150000,20),
-- Standard Wash
('bb000002-0000-0000-0000-000000000005','aa000001-0000-0000-0000-000000000001','Basic Exterior Wash',80000,15),
('bb000002-0000-0000-0000-000000000005','aa000001-0000-0000-0000-000000000011','Basic Interior Vacuum',60000,15),
('bb000002-0000-0000-0000-000000000005','aa000001-0000-0000-0000-000000000012','Dashboard & Console Cleaning',50000,10),
('bb000002-0000-0000-0000-000000000005','aa000001-0000-0000-0000-000000000023','Interior & Exterior Glass Cleaning',50000,10),
-- Full Detailing
('bb000002-0000-0000-0000-000000000006','aa000001-0000-0000-0000-000000000002','Touchless Foam Wash',120000,20),
('bb000002-0000-0000-0000-000000000006','aa000001-0000-0000-0000-000000000008','Clay Bar Treatment',250000,30),
('bb000002-0000-0000-0000-000000000006','aa000001-0000-0000-0000-000000000014','Leather Seat Cleaning',200000,30),
('bb000002-0000-0000-0000-000000000006','aa000001-0000-0000-0000-000000000015','Leather Conditioning',150000,20),
('bb000002-0000-0000-0000-000000000006','aa000001-0000-0000-0000-000000000017','Roof Lining Cleaning',200000,30),
('bb000002-0000-0000-0000-000000000006','aa000001-0000-0000-0000-000000000028','Basic Engine Bay Cleaning',150000,20),
('bb000002-0000-0000-0000-000000000006','aa000001-0000-0000-0000-000000000031','One-Step Paint Polish',800000,90),
('bb000002-0000-0000-0000-000000000006','aa000001-0000-0000-0000-000000000033','Carnauba Wax Application',300000,30),
-- Premium Leather Interior Care
('bb000002-0000-0000-0000-000000000007','aa000001-0000-0000-0000-000000000014','Leather Seat Cleaning',200000,30),
('bb000002-0000-0000-0000-000000000007','aa000001-0000-0000-0000-000000000015','Leather Conditioning',150000,20),
('bb000002-0000-0000-0000-000000000007','aa000001-0000-0000-0000-000000000019','AC Vent Cleaning',80000,15),
('bb000002-0000-0000-0000-000000000007','aa000001-0000-0000-0000-000000000020','Interior Steam Sterilization',300000,40),
('bb000002-0000-0000-0000-000000000007','aa000001-0000-0000-0000-000000000044','Full-Car UV Sterilization',200000,20),
-- Paint Protection Package
('bb000002-0000-0000-0000-000000000008','aa000001-0000-0000-0000-000000000007','Iron Decontamination',200000,25),
('bb000002-0000-0000-0000-000000000008','aa000001-0000-0000-0000-000000000008','Clay Bar Treatment',250000,30),
('bb000002-0000-0000-0000-000000000008','aa000001-0000-0000-0000-000000000033','Carnauba Wax Application',300000,30),
('bb000002-0000-0000-0000-000000000008','aa000001-0000-0000-0000-000000000034','Paint Sealant',500000,45),
-- Deodorize & Sanitize Package
('bb000002-0000-0000-0000-000000000009','aa000001-0000-0000-0000-000000000018','Ozone Odor Elimination',150000,20),
('bb000002-0000-0000-0000-000000000009','aa000001-0000-0000-0000-000000000020','Interior Steam Sterilization',300000,40),
('bb000002-0000-0000-0000-000000000009','aa000001-0000-0000-0000-000000000044','Full-Car UV Sterilization',200000,20),
('bb000002-0000-0000-0000-000000000009','aa000001-0000-0000-0000-000000000045','Anti-Bacterial Interior Spray',100000,10),
-- Engine Bay & Undercarriage Care
('bb000002-0000-0000-0000-000000000010','aa000001-0000-0000-0000-000000000003','Undercarriage Rinse',50000,10),
('bb000002-0000-0000-0000-000000000010','aa000001-0000-0000-0000-000000000028','Basic Engine Bay Cleaning',150000,20),
('bb000002-0000-0000-0000-000000000010','aa000001-0000-0000-0000-000000000029','Deep Engine Bay Detailing',350000,40),
('bb000002-0000-0000-0000-000000000010','aa000001-0000-0000-0000-000000000030','Engine Bay Plastic Dressing',100000,15),
('bb000002-0000-0000-0000-000000000010','aa000001-0000-0000-0000-000000000046','Battery Terminal Cleaning',30000,5)
;

-- ── COMBOS ───────────────────────────────────────────────────────────────────
-- combos schema: price (not base_price), max_usages (not usage_limit), duration_days (not valid_days)
INSERT INTO combos (id, name, description, price, duration_minutes, max_usages, duration_days, status) VALUES
('cc000003-0000-0000-0000-000000000001','Basic Exterior Wash Card — 10 Uses',       'Prepaid card for 10 basic exterior washes; ideal for weekly use',900000,20,10,60,'ACTIVE'),
('cc000003-0000-0000-0000-000000000002','Touchless Wash Card — 10 Uses',            'Prepaid card for 10 touchless foam washes; better paint protection',1870000,40,10,60,'ACTIVE'),
('cc000003-0000-0000-0000-000000000003','Interior Care Card — 5 Uses',              'Prepaid card for 5 interior detailing sessions',1150000,45,5,90,'ACTIVE'),
('cc000003-0000-0000-0000-000000000004','Engine Bay Clean Card — 5 Uses',           'Prepaid card for 5 basic engine bay cleaning sessions',650000,20,5,90,'ACTIVE'),
('cc000003-0000-0000-0000-000000000005','Wheel & Tire Care Card — 10 Uses',         'Prepaid card for 10 wheel and tyre cleaning sessions',600000,15,10,60,'ACTIVE'),
('cc000003-0000-0000-0000-000000000006','Deodorize & Sanitize Card — 6 Uses',       'Prepaid card for 6 cabin deodorisation and sanitisation sessions',1290000,30,6,90,'ACTIVE'),
('cc000003-0000-0000-0000-000000000007','Annual Wash Card — 30 Uses',               'Prepaid card for 30 basic exterior washes valid for one full year',1890000,15,30,365,'ACTIVE'),
('cc000003-0000-0000-0000-000000000008','Premium Leather Care Card — 5 Uses',       'Prepaid card for 5 leather cleaning and conditioning sessions',1550000,50,5,120,'ACTIVE'),
('cc000003-0000-0000-0000-000000000009','Floor Mat & Roof Lining Card — 5 Uses',    'Prepaid card for 5 floor mat shampoo and roof lining sessions',1300000,50,5,120,'ACTIVE'),
('cc000003-0000-0000-0000-000000000010','Quarterly Full-Service Card — 4 Uses',     'Prepaid card for 4 comprehensive maintenance sessions per quarter',980000,55,4,90,'ACTIVE')
;

-- ── COMBO → SERVICE MAPPING ───────────────────────────────────────────────────
INSERT INTO combo_services (combo_id, option_id, option_name, option_price, option_duration_minutes) VALUES
-- Basic Exterior Wash Card
('cc000003-0000-0000-0000-000000000001','aa000001-0000-0000-0000-000000000001','Basic Exterior Wash',80000,15),
('cc000003-0000-0000-0000-000000000001','aa000001-0000-0000-0000-000000000005','Tire Dressing',30000,5),
-- Touchless Wash Card
('cc000003-0000-0000-0000-000000000002','aa000001-0000-0000-0000-000000000002','Touchless Foam Wash',120000,20),
('cc000003-0000-0000-0000-000000000002','aa000001-0000-0000-0000-000000000003','Undercarriage Rinse',50000,10),
('cc000003-0000-0000-0000-000000000002','aa000001-0000-0000-0000-000000000023','Interior & Exterior Glass Cleaning',50000,10),
-- Interior Care Card
('cc000003-0000-0000-0000-000000000003','aa000001-0000-0000-0000-000000000011','Basic Interior Vacuum',60000,15),
('cc000003-0000-0000-0000-000000000003','aa000001-0000-0000-0000-000000000012','Dashboard & Console Cleaning',50000,10),
('cc000003-0000-0000-0000-000000000003','aa000001-0000-0000-0000-000000000018','Ozone Odor Elimination',150000,20),
-- Engine Bay Clean Card
('cc000003-0000-0000-0000-000000000004','aa000001-0000-0000-0000-000000000028','Basic Engine Bay Cleaning',150000,20),
-- Wheel & Tire Care Card
('cc000003-0000-0000-0000-000000000005','aa000001-0000-0000-0000-000000000004','Wheel & Tire Cleaning',40000,10),
('cc000003-0000-0000-0000-000000000005','aa000001-0000-0000-0000-000000000005','Tire Dressing',30000,5),
-- Deodorize & Sanitize Card
('cc000003-0000-0000-0000-000000000006','aa000001-0000-0000-0000-000000000018','Ozone Odor Elimination',150000,20),
('cc000003-0000-0000-0000-000000000006','aa000001-0000-0000-0000-000000000045','Anti-Bacterial Interior Spray',100000,10),
-- Annual Wash Card
('cc000003-0000-0000-0000-000000000007','aa000001-0000-0000-0000-000000000001','Basic Exterior Wash',80000,15),
-- Premium Leather Care Card
('cc000003-0000-0000-0000-000000000008','aa000001-0000-0000-0000-000000000014','Leather Seat Cleaning',200000,30),
('cc000003-0000-0000-0000-000000000008','aa000001-0000-0000-0000-000000000015','Leather Conditioning',150000,20),
-- Floor Mat & Roof Lining Card
('cc000003-0000-0000-0000-000000000009','aa000001-0000-0000-0000-000000000016','Floor Mat Shampoo',100000,20),
('cc000003-0000-0000-0000-000000000009','aa000001-0000-0000-0000-000000000017','Roof Lining Cleaning',200000,30),
-- Quarterly Full-Service Card
('cc000003-0000-0000-0000-000000000010','aa000001-0000-0000-0000-000000000002','Touchless Foam Wash',120000,20),
('cc000003-0000-0000-0000-000000000010','aa000001-0000-0000-0000-000000000011','Basic Interior Vacuum',60000,15),
('cc000003-0000-0000-0000-000000000010','aa000001-0000-0000-0000-000000000012','Dashboard & Console Cleaning',50000,10),
('cc000003-0000-0000-0000-000000000010','aa000001-0000-0000-0000-000000000023','Interior & Exterior Glass Cleaning',50000,10)
;
