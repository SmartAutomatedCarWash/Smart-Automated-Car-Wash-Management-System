-- V108: Seed images for packages and services (multi-image support)
-- image_url stores comma-separated Pexels URLs (per V16 schema — TEXT column)
-- Images sourced from car-wash-image-bank.md (Pexels license — pexels.com/license)

-- ── PACKAGES (multiple images per package) ───────────────────────────────────

-- PKG01 — Express Wash
UPDATE packages SET image_url =
  'https://images.pexels.com/photos/6872591/pexels-photo-6872591.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/6872174/pexels-photo-6872174.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/32667420/pexels-photo-32667420.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/6003/man-hand-car-black.jpg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'bb000002-0000-0000-0000-000000000001';

-- PKG02 — Premium Touchless Wash
UPDATE packages SET image_url =
  'https://images.pexels.com/photos/6872171/pexels-photo-6872171.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/6872609/pexels-photo-6872609.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/6873181/pexels-photo-6873181.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/32667420/pexels-photo-32667420.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'bb000002-0000-0000-0000-000000000002';

-- PKG03 — Interior Care
UPDATE packages SET image_url =
  'https://images.pexels.com/photos/29504462/pexels-photo-29504462.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/5158160/pexels-photo-5158160.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/17029940/pexels-photo-17029940.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/20042048/pexels-photo-20042048.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'bb000002-0000-0000-0000-000000000003';

-- PKG04 — Exterior Care
UPDATE packages SET image_url =
  'https://images.pexels.com/photos/6872171/pexels-photo-6872171.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/7154632/pexels-photo-7154632.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/17623850/pexels-photo-17623850.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/36980566/pexels-photo-36980566.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'bb000002-0000-0000-0000-000000000004';

-- PKG05 — Standard Wash
UPDATE packages SET image_url =
  'https://images.pexels.com/photos/6872591/pexels-photo-6872591.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/29504462/pexels-photo-29504462.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/7192148/pexels-photo-7192148.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/6003/man-hand-car-black.jpg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'bb000002-0000-0000-0000-000000000005';

-- PKG06 — Full Detailing
UPDATE packages SET image_url =
  'https://images.pexels.com/photos/37809565/pexels-photo-37809565.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/29293845/pexels-photo-29293845.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/36980566/pexels-photo-36980566.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/32107428/pexels-photo-32107428.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/7154632/pexels-photo-7154632.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/17029940/pexels-photo-17029940.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'bb000002-0000-0000-0000-000000000006';

-- PKG07 — Premium Leather Interior Care
UPDATE packages SET image_url =
  'https://images.pexels.com/photos/29293845/pexels-photo-29293845.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/18372045/pexels-photo-18372045.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/5158160/pexels-photo-5158160.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/29504462/pexels-photo-29504462.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'bb000002-0000-0000-0000-000000000007';

-- PKG08 — Paint Protection Package
UPDATE packages SET image_url =
  'https://images.pexels.com/photos/7154632/pexels-photo-7154632.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/37809565/pexels-photo-37809565.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/20381587/pexels-photo-20381587.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/20042048/pexels-photo-20042048.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'bb000002-0000-0000-0000-000000000008';

-- PKG09 — Deodorize & Sanitize Package
UPDATE packages SET image_url =
  'https://images.pexels.com/photos/29504462/pexels-photo-29504462.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/20042048/pexels-photo-20042048.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/9145477/pexels-photo-9145477.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'bb000002-0000-0000-0000-000000000009';

-- PKG10 — Engine Bay & Undercarriage Care
UPDATE packages SET image_url =
  'https://images.pexels.com/photos/32107428/pexels-photo-32107428.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/6873181/pexels-photo-6873181.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/14021836/pexels-photo-14021836.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/20042048/pexels-photo-20042048.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'bb000002-0000-0000-0000-000000000010';

-- ── COMBOS (multiple images per combo) ──────────────────────────────────────

-- CB01 — Basic Exterior Wash Card 10 Uses
UPDATE combos SET image_url =
  'https://images.pexels.com/photos/6872591/pexels-photo-6872591.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/6872174/pexels-photo-6872174.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/32667420/pexels-photo-32667420.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'cc000003-0000-0000-0000-000000000001';

-- CB02 — Touchless Wash Card 10 Uses
UPDATE combos SET image_url =
  'https://images.pexels.com/photos/6872171/pexels-photo-6872171.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/6872609/pexels-photo-6872609.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/6873181/pexels-photo-6873181.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'cc000003-0000-0000-0000-000000000002';

-- CB03 — Interior Care Card 5 Uses
UPDATE combos SET image_url =
  'https://images.pexels.com/photos/29504462/pexels-photo-29504462.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/7192148/pexels-photo-7192148.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/20042048/pexels-photo-20042048.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'cc000003-0000-0000-0000-000000000003';

-- CB04 — Engine Bay Clean Card 5 Uses
UPDATE combos SET image_url =
  'https://images.pexels.com/photos/32107428/pexels-photo-32107428.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/14021836/pexels-photo-14021836.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'cc000003-0000-0000-0000-000000000004';

-- CB05 — Wheel & Tire Care Card 10 Uses
UPDATE combos SET image_url =
  'https://images.pexels.com/photos/17623850/pexels-photo-17623850.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/32667420/pexels-photo-32667420.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'cc000003-0000-0000-0000-000000000005';

-- CB06 — Deodorize & Sanitize Card 6 Uses
UPDATE combos SET image_url =
  'https://images.pexels.com/photos/20042048/pexels-photo-20042048.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/29504462/pexels-photo-29504462.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/9145477/pexels-photo-9145477.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'cc000003-0000-0000-0000-000000000006';

-- CB07 — Annual Wash Card 30 Uses
UPDATE combos SET image_url =
  'https://images.pexels.com/photos/6872591/pexels-photo-6872591.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/30564616/pexels-photo-30564616.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/6872577/pexels-photo-6872577.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'cc000003-0000-0000-0000-000000000007';

-- CB08 — Premium Leather Care Card 5 Uses
UPDATE combos SET image_url =
  'https://images.pexels.com/photos/29293845/pexels-photo-29293845.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/18372045/pexels-photo-18372045.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/3778766/pexels-photo-3778766.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'cc000003-0000-0000-0000-000000000008';

-- CB09 — Floor Mat & Roof Lining Card 5 Uses
UPDATE combos SET image_url =
  'https://images.pexels.com/photos/29504462/pexels-photo-29504462.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/17029940/pexels-photo-17029940.jpeg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'cc000003-0000-0000-0000-000000000009';

-- CB10 — Quarterly Full-Service Card 4 Uses
UPDATE combos SET image_url =
  'https://images.pexels.com/photos/6872171/pexels-photo-6872171.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/29504462/pexels-photo-29504462.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/7192148/pexels-photo-7192148.jpeg?auto=compress&cs=tinysrgb&w=800,'
  'https://images.pexels.com/photos/6003/man-hand-car-black.jpg?auto=compress&cs=tinysrgb&w=800'
WHERE id = 'cc000003-0000-0000-0000-000000000010';

-- ── SERVICES (single primary image per service) ───────────────────────────────
-- SV01 — Basic Exterior Wash
UPDATE services SET image_url = 'https://images.pexels.com/photos/6872591/pexels-photo-6872591.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000001';
-- SV02 — Touchless Foam Wash
UPDATE services SET image_url = 'https://images.pexels.com/photos/6872171/pexels-photo-6872171.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000002';
-- SV03 — Undercarriage Rinse
UPDATE services SET image_url = 'https://images.pexels.com/photos/6873181/pexels-photo-6873181.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000003';
-- SV04 — Wheel & Tire Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/17623850/pexels-photo-17623850.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000004';
-- SV05 — Tire Dressing
UPDATE services SET image_url = 'https://images.pexels.com/photos/32667420/pexels-photo-32667420.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000005';
-- SV06 — Bug & Tar Removal
UPDATE services SET image_url = 'https://images.pexels.com/photos/7154632/pexels-photo-7154632.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000006';
-- SV07 — Iron Decontamination
UPDATE services SET image_url = 'https://images.pexels.com/photos/20042048/pexels-photo-20042048.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000007';
-- SV08 — Clay Bar Treatment
UPDATE services SET image_url = 'https://images.pexels.com/photos/7154632/pexels-photo-7154632.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000008';
-- SV09 — Door Jamb Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/6873008/pexels-photo-6873008.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000009';
-- SV10 — Wheel Well Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/6873181/pexels-photo-6873181.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000010';
-- SV11 — Basic Interior Vacuum
UPDATE services SET image_url = 'https://images.pexels.com/photos/29504462/pexels-photo-29504462.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000011';
-- SV12 — Dashboard & Console Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/5158160/pexels-photo-5158160.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000012';
-- SV13 — Fabric Seat Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/29504462/pexels-photo-29504462.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000013';
-- SV14 — Leather Seat Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/29293845/pexels-photo-29293845.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000014';
-- SV15 — Leather Conditioning
UPDATE services SET image_url = 'https://images.pexels.com/photos/3778766/pexels-photo-3778766.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000015';
-- SV16 — Floor Mat Shampoo
UPDATE services SET image_url = 'https://images.pexels.com/photos/17029940/pexels-photo-17029940.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000016';
-- SV17 — Roof Lining Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/9145477/pexels-photo-9145477.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000017';
-- SV18 — Ozone Odor Elimination
UPDATE services SET image_url = 'https://images.pexels.com/photos/20042048/pexels-photo-20042048.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000018';
-- SV19 — AC Vent Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/5158160/pexels-photo-5158160.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000019';
-- SV20 — Interior Steam Sterilization
UPDATE services SET image_url = 'https://images.pexels.com/photos/29504462/pexels-photo-29504462.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000020';
-- SV21 — Trunk Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/17029940/pexels-photo-17029940.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000021';
-- SV22 — Steering Wheel & Gear Shift Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/5158160/pexels-photo-5158160.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000022';
-- SV23 — Interior & Exterior Glass Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/12397895/pexels-photo-12397895.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000023';
-- SV24 — Windshield Water-Repellent Coating
UPDATE services SET image_url = 'https://images.pexels.com/photos/20381587/pexels-photo-20381587.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000024';
-- SV25 — Mirror Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/6872162/pexels-photo-6872162.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000025';
-- SV26 — Trim Restoration
UPDATE services SET image_url = 'https://images.pexels.com/photos/7154632/pexels-photo-7154632.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000026';
-- SV27 — Chrome Polish
UPDATE services SET image_url = 'https://images.pexels.com/photos/35828149/pexels-photo-35828149.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000027';
-- SV28 — Basic Engine Bay Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/32107428/pexels-photo-32107428.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000028';
-- SV29 — Deep Engine Bay Detailing
UPDATE services SET image_url = 'https://images.pexels.com/photos/14021836/pexels-photo-14021836.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000029';
-- SV30 — Engine Bay Plastic Dressing
UPDATE services SET image_url = 'https://images.pexels.com/photos/7154632/pexels-photo-7154632.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000030';
-- SV31 — One-Step Paint Polish
UPDATE services SET image_url = 'https://images.pexels.com/photos/37809565/pexels-photo-37809565.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000031';
-- SV32 — Two-Step Paint Correction
UPDATE services SET image_url = 'https://images.pexels.com/photos/37809565/pexels-photo-37809565.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000032';
-- SV33 — Carnauba Wax Application
UPDATE services SET image_url = 'https://images.pexels.com/photos/36980566/pexels-photo-36980566.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000033';
-- SV34 — Paint Sealant
UPDATE services SET image_url = 'https://images.pexels.com/photos/20381587/pexels-photo-20381587.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000034';
-- SV35 — Basic Nano Coating
UPDATE services SET image_url = 'https://images.pexels.com/photos/20381587/pexels-photo-20381587.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000035';
-- SV36 — Ceramic Coating 9H (Small Car)
UPDATE services SET image_url = 'https://images.pexels.com/photos/29717775/pexels-photo-29717775.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000036';
-- SV37 — Ceramic Coating 9H (Medium/SUV)
UPDATE services SET image_url = 'https://images.pexels.com/photos/36980566/pexels-photo-36980566.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000037';
-- SV38 — Ceramic Coating 9H (Large/7-Seat)
UPDATE services SET image_url = 'https://images.pexels.com/photos/20381587/pexels-photo-20381587.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000038';
-- SV39 — Premium Graphene Ceramic Coating
UPDATE services SET image_url = 'https://images.pexels.com/photos/37809565/pexels-photo-37809565.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000039';
-- SV40 — Wheel Ceramic Coating
UPDATE services SET image_url = 'https://images.pexels.com/photos/32667420/pexels-photo-32667420.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000040';
-- SV41 — Headlight Ceramic Coating
UPDATE services SET image_url = 'https://images.pexels.com/photos/35828149/pexels-photo-35828149.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000041';
-- SV42 — Headlight Restoration
UPDATE services SET image_url = 'https://images.pexels.com/photos/30767229/pexels-photo-30767229.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000042';
-- SV43 — Undercarriage Anti-Rust Coating
UPDATE services SET image_url = 'https://images.pexels.com/photos/6873181/pexels-photo-6873181.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000043';
-- SV44 — Full-Car UV Sterilization
UPDATE services SET image_url = 'https://images.pexels.com/photos/9145477/pexels-photo-9145477.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000044';
-- SV45 — Anti-Bacterial Interior Spray
UPDATE services SET image_url = 'https://images.pexels.com/photos/20042048/pexels-photo-20042048.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000045';
-- SV46 — Battery Terminal Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/32107428/pexels-photo-32107428.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000046';
-- SV47 — Sunroof Track Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/7192148/pexels-photo-7192148.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000047';
-- SV48 — Convertible Soft-Top Cleaning
UPDATE services SET image_url = 'https://images.pexels.com/photos/6872591/pexels-photo-6872591.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000048';
-- SV49 — Paint Thickness Inspection
UPDATE services SET image_url = 'https://images.pexels.com/photos/3892898/pexels-photo-3892898.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000049';
-- SV50 — Compressed Air Drying
UPDATE services SET image_url = 'https://images.pexels.com/photos/6872174/pexels-photo-6872174.jpeg?auto=compress&cs=tinysrgb&w=800' WHERE id = 'aa000001-0000-0000-0000-000000000050';
