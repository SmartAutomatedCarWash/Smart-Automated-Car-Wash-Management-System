# AutoWash Pro — Business Rules (Source of Truth)

> **Version:** 1.2 | **Last updated:** 2026-06-25
> **Scope:** Backend-enforced rules only. Frontend-only prototype behaviors are labelled `[Frontend]`.
> **Status legend:**
> - ✅ Implemented in backend
> - ⚠️ Designed, not yet implemented
> - 🔲 Frontend-only (no backend equivalent)
> - ❌ Spec error — corrected here

---

## Sources merged into this document

| Source | Role |
|---|---|
| `docs/List_BRs.md` | Original project spec (74 BRs, SU26SWP01) |
| `docs/specs/detail.md` | Frontend prototype spec (125 BRs) |
| `docs/BRs_and_database_current.md` | Codebase audit (reconciled, latest) |
| Backend codebase | Authoritative implementation |

---

## 1. Account Registration & Authentication

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-01 | Each customer must have a unique phone number. | ✅ | `users.phone UNIQUE`, `AuthServiceImpl` throws `DUPLICATE_PHONE` |
| BR-02 | One phone number cannot create multiple active accounts. | ✅ | `UserRepository.existsByPhone()` checked on register |
| BR-03 | Customer must provide full name, phone number, **email**, password, and confirm password. | ✅ | `RegisterRequest`: all five `@NotBlank` |
| BR-04 | Phone number must follow Vietnamese format `^0[0-9]{9}$`. | ✅ | `@Pattern` in `RegisterRequest`, `AuthServiceImpl.PHONE_PATTERN` |
| BR-05 | New customer starts at tier `BRONZE` with 0 points and `PENDING` status. | ✅ | `User` constructor, `LoyaltyAccount` constructor |
| BR-06 | Account activates only after OTP verification. | ✅ | `AuthServiceImpl.verifyRegistrationOtp()` → `user.activate()` |
| BR-07 | Password must be 8–128 characters with uppercase, lowercase, digit, and special character. | ✅ | `@Pattern` regex in `RegisterRequest` |
| BR-07a | Staff password must be 8–72 characters. | ✅ | `@Size(min=8, max=72)` in `ResetPasswordRequest` |
| BR-08 | OTP code must be exactly 6 digits. | ✅ | `@Pattern(^[0-9]{6}$)` in `VerifyOtpRequest` |
| BR-09 | OTP resend is rate-limited to 3 requests per hour per account. | ✅ | `AuthServiceImpl.enforceResendLimit()` |
| BR-10 | OTP has a configurable expiration window (default 10 min). | ✅ | `AuthServiceImpl.otpExpirationSeconds` from `application.properties` |
| BR-11 | Max OTP verification attempts enforced (configurable). | ✅ | `AuthServiceImpl.otpMaxAttempts` → `RATE_LIMIT_EXCEEDED` |
| BR-12 | Blocked account cannot log in. | ✅ | `AuthServiceImpl.login()` checks `UserStatus.BLOCKED` |
| BR-13 | Password reset requires active (non-blocked) account, email or phone lookup, and OTP verification. | ✅ | `AuthServiceImpl.requestForgotPassword()`, `resetForgotPassword()` |
| BR-14 | Confirm password must match password on reset. | ✅ | `AuthServiceImpl.resetForgotPassword()` |
| BR-15 | Refresh token expiry and revocation are enforced. | ✅ | `AuthServiceImpl.refresh()` checks `isRevoked()` and `expiresAt` |
| BR-16 | Login identifier can be phone or email; system auto-detects by format. | ✅ | `AuthServiceImpl.resolveLoginUser()` |
| BR-16a | Google OAuth login flow: exchange authorization code for user info, create or link account, return JWT. | ⚠️ | Config and `GoogleOAuthClientImpl` exist but end-to-end flow is unverified. See BR-S23. |
| BR-17 | User role home paths: customer → `/customer/home`, staff → `/staff/dashboard`, admin → `/admin/dashboard`. | 🔲 | Frontend routing only |
| BR-18 | Protected routes redirect unauthenticated users to login. | 🔲 | Frontend routing only |

---

## 2. User Profile Management

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-19 | Profile update requires non-empty full name (max 100 chars), optional valid email, and Vietnamese phone. | ✅ | `@NotBlank @Size @Pattern` in `UpdateUserProfileRequest` |
| BR-20 | Phone must be unique across all users when updated. | ✅ | `UserRepository.existsByPhoneAndIdNot()` in `UserProfileServiceImpl` |
| BR-21 | Email must be unique (case-insensitive) across all users when updated. | ✅ | `UserRepository.existsByEmailIgnoreCaseAndIdNot()` |
| BR-22 | Updating profile marks customer as no longer new (`isNewCustomer = false`). | ✅ | `UserProfileServiceImpl.updateProfile()` → `user.markNotNewCustomer()` |
| BR-23 | User preferences (language, theme, notifications) are stored per user. | ✅ | `user_preferences` table, `UserPreference` entity |
| BR-24 | Default preferences: language=`VI`, theme=`LIGHT`, notifications=`true`, SMS=`true`, email=`false`. | ✅ | `UserPreference` constructor defaults |

---

## 3. Vehicle Management

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-25 | Vehicle creation requires plate, type, brand, model, and year. Color is optional. | ✅ | `@NotBlank/@NotNull` in `CreateVehicleRequest` |
| BR-26 | Plate must match Vietnamese format `^[0-9]{2}[A-Z]-[0-9]{6}$` (e.g. `30H-123456`). | ✅ | `@Pattern` in `CreateVehicleRequest` |
| BR-27 | Plate is normalized to uppercase and trimmed before storage. | ✅ | `VehicleServiceImpl.normalizePlate()` |
| BR-28 | Plate must be globally unique. | ✅ | `vehicles.plate UNIQUE`, `VehicleServiceImpl` throws `DUPLICATE_PLATE` |
| BR-29 | Vehicle type must be one of: `CAR`, `SUV`, `TRUCK`, `MOTORBIKE`, `VAN`. | ✅ | `VehicleType` enum in `CreateVehicleRequest` |
| BR-30 | Vehicle year must be between 1900 and 2100. | ✅ | `@Min(1900) @Max(2100)` in `CreateVehicleRequest` and `UpdateVehicleRequest` |
| BR-31 | First vehicle added for a customer automatically becomes the primary vehicle. | ✅ | `VehicleServiceImpl.createVehicle()` counts active vehicles |
| BR-32 | Setting a vehicle as primary unsets the previous primary. | ✅ | `VehicleServiceImpl.setPrimaryVehicle()` |
| BR-33 | Soft-deleting the primary vehicle promotes the next oldest active vehicle to primary. | ✅ | `VehicleServiceImpl.deleteVehicle()` |
| BR-34 | Vehicles are soft-deleted (status → `DELETED`), never hard-deleted. | ✅ | `Vehicle.softDelete()` |
| BR-35 | Customer cannot delete their last remaining vehicle. | ⚠️ | Not enforced. See BR-S12 in Suggested BRs. |

---

## 4. Booking Creation

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-36 | Booking requires a vehicle owned by the customer (status `ACTIVE`). | ✅ | `VehicleRepository.findByOwnerAndIdAndStatus()` in `BookingServiceImpl` |
| BR-37 | Booking must specify either a package or a combo, not both. | ✅ | `@AssertTrue hasPackageOrCombo()` in `CreateBookingRequest`; DB CHECK constraint |
| BR-38 | Only `ACTIVE` packages can be booked. | ✅ | `CatalogServiceImpl.requireActivePackage()` |
| BR-39 | Only `ACTIVE` combos can be booked. | ✅ | `CatalogServiceImpl.requireActiveCombo()` |
| BR-40 | Booking date must be today or in the future (not in the past). | ✅ | `@FutureOrPresent` on `CreateBookingRequest.bookingDate` |
| BR-40a | Booking time must be within business hours: 08:00–20:00 inclusive. | ⚠️ | Not enforced. See BR-S16. |
| BR-40b | Booking date must not exceed 30 days from today. | ⚠️ | Not enforced. See BR-S17. |
| BR-41 | Booking time must be in `HH:mm` format. | ✅ | `@Pattern(^([01]\d\|2[0-3]):[0-5]\d$)` in `CreateBookingRequest` |
| BR-42 | Customer can hold at most 3 active bookings (CONFIRMED + CHECKED_IN + IN_PROGRESS). | ✅ | `BookingRepository.countByCustomerAndStatusIn() >= 3` → `MAX_ACTIVE_BOOKINGS_EXCEEDED` |
| BR-43 | A new booking is created with status `PENDING`. | ✅ | `Booking` constructor sets `BookingStatus.PENDING` |
| BR-44 | Booking creation is blocked for BLOCKED customers. | ⚠️ | `createBooking()` does not check `user.getStatus()`. See BR-S01. |
| BR-45 | Booking creation is blocked during active suspension. | ⚠️ | No suspension mechanism exists. See BR-S02. |
| BR-46 | Booking date window depends on customer tier (BRONZE shorter, DIAMOND longer). | ⚠️ | Not enforced. See BR-S03. |
| BR-47 | Duplicate booking for same vehicle + date + time slot is blocked. | ⚠️ | No check exists. See BR-S04. |
| BR-48 | Slot capacity per time slot is limited by shop configuration. | ⚠️ | Not enforced. See BR-S05. |
| BR-49 | Last open slot in a time slot is reserved for PLATINUM customers. | ⚠️ | Not enforced. See BR-S06. |

---

## 5. Booking Pricing, Voucher & Payment

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-50 | `final_amount = base_price + options_total - voucher_discount - points_discount`. All amounts ≥ 0. | ✅ | `Booking` constructor + DB CHECK constraints |
| BR-51 | Add-on service options must be active and belong to the selected package or combo. Duplicate options are rejected. | ✅ | `CatalogServiceImpl.requireActivePackageOptions()` / `requireActiveComboOptions()` |
| BR-52 | Estimated duration = base duration + sum of selected option durations. | ✅ | `BookingServiceImpl.createBooking()` |
| BR-53 | One voucher per booking. Voucher code must be uppercase alphanumeric (`^[A-Z0-9_-]+$`). | ✅ | `@AssertTrue isValidVoucherCode()` in `CreateBookingRequest` |
| BR-54 | Voucher must be: `ACTIVE` status, not expired, within usage limit, min order met, tier-eligible, new-customer valid if flagged. | ✅ | `CatalogServiceImpl.validateVoucherOrThrow()` |
| BR-54a | Voucher `new_customer_only = true` is blocked for customers who have at least one completed booking. | ✅ | `CatalogServiceImpl.validateVoucherOrThrow()` checks `countByCustomerAndStatus(COMPLETED) > 0` |
| BR-54b | Voucher `usage_limit` must not be exceeded (`used_count < usage_limit`). When `usage_limit` is null, unlimited use is allowed. | ✅ | `CatalogServiceImpl.validateVoucherOrThrow()` |
| BR-54c | Tier-restricted vouchers (`voucher_tiers`) are only usable by customers whose loyalty tier is in the allowed tier set. | ✅ | `CatalogServiceImpl.validateVoucherOrThrow()` with `VoucherTier` lookup |
| BR-54d | One customer can use one voucher code only once per lifetime (no repeat use of same code). | ⚠️ | Not enforced. See BR-S18. |
| BR-55 | Voucher `used_count` is incremented immediately on booking creation. | ✅ | `voucher.recordUse()` in `BookingServiceImpl` |
| BR-56 | Payment method: `CASH_AT_COUNTER` → initial status `UNPAID`; `BANK_TRANSFER` / `E_WALLET` → `PENDING_PAYMENT`. | ✅ | `BookingServiceImpl.initialPaymentStatus()` |
| BR-57 | Paying a booking marks payment as `PAID` and transitions `PENDING` booking to `CONFIRMED`. | ✅ | `BookingServiceImpl.payBooking()` |
| BR-58 | Payment is blocked for `CANCELLED` or `NO_SHOW` bookings. | ✅ | `BookingServiceImpl.payBooking()` |
| BR-59 | Combo booking sets `base_amount = 0` when customer already owns an active combo. Options surcharges still apply. | ✅ | `BookingServiceImpl.createBooking()` |
| BR-60 | Active promotions for the customer's tier are linked to the booking at creation (`booking_promotions`). | ✅ | `PromotionServiceImpl.listActiveForCustomer()` |

---

## 6. Booking Lifecycle & Cancellation

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-61 | Booking confirmation status is derived: `PENDING`→`PENDING`, `CONFIRMED/IN_PROGRESS/COMPLETED`→`VERIFIED`, `CANCELLED`→`CANCELLED`, `NO_SHOW`→`EXPIRED`. | ✅ | `Booking.getConfirmationStatus()` (transient) |
| BR-62 | Cancellation is only allowed from `PENDING` or `CONFIRMED` status. | ✅ | `CANCELLABLE_BOOKING_STATUSES` in `BookingServiceImpl` → `RESOURCE_LOCKED` |
| BR-63 | Cancellation is blocked when booking starts in less than 2 hours. | ⚠️ | Time check not implemented. See BR-S07. |
| BR-64 | Auto-block after repeated cancellations within rolling window. | ❌ | Out of scope per `LOYALTY_TIER_RESEARCH.md` (Bỏ logic tính phạt hủy lịch). |
| BR-65 | Points can only be applied to a booking in `CONFIRMED` status (before check-in). | ✅ | `BookingServiceImpl.applyPoints()` |
| BR-66 | Points can only be applied once per booking. | ✅ | Checks `pointsRedeemed > 0` → `POINTS_ALREADY_APPLIED` |
| BR-67 | Points discount cannot exceed booking final amount. | ✅ | `BookingServiceImpl.applyPoints()` |
| BR-68 | All booking status transitions are recorded in `booking_status_histories`. | ✅ | `BookingServiceImpl.recordStatusHistory()` |

---

## 7. Wash Session Lifecycle

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-69 | Wash session can only be created for a `CONFIRMED` booking. | ✅ | `OperationsServiceImpl.createSession()` |
| BR-70 | Only one active wash session per booking. | ✅ | `washSessionRepository.existsByBooking_IdAndStatusIn()` → `DUPLICATE_ACTIVE_SESSION` |
| BR-71 | New wash session is created with status `PENDING`. | ✅ | `WashSession.create()` sets `PENDING` |
| BR-72 | Valid wash session transitions: `PENDING`→`QUEUED`→`CHECKED_IN`→`IN_PROGRESS`→`COMPLETED`. Cancellation from any non-terminal state. | ✅ | `WashSessionLifecycle.validateTransition()` |
| BR-73 | Check-in records `checked_in_at`, `fee_amount`, and `projected_points`. Booking transitions to `CHECKED_IN`. | ✅ | `OperationsServiceImpl.checkInSession()` |
| BR-74 | Starting wash transitions session to `IN_PROGRESS` and booking to `IN_PROGRESS`. | ✅ | `OperationsServiceImpl.startSession()` |
| BR-75 | Completing wash transitions session to `COMPLETED`, booking to `COMPLETED`, records `awarded_points`, and triggers point-earn. | ✅ | `OperationsServiceImpl.completeSession()` |
| BR-76 | First wash completion marks customer as no longer new. | ✅ | `OperationsServiceImpl.markCustomerAsNotNew()` |
| BR-77 | Check-in past 20 minutes after scheduled time marks booking as `NO_SHOW`. | ⚠️ | No time threshold logic. See BR-S08. |
| BR-77a | When booking is marked `NO_SHOW`, the associated wash session (if any) is cancelled. | ⚠️ | Not enforced. See BR-S08. |
| BR-77b | After 2 NO_SHOW events within any rolling 30-day window, customer is automatically suspended for 14 days. | ⚠️ | Not enforced. See BR-S09. |
| BR-78 | Customer can track their active wash session in real time (status, staff, projected points, timestamps). | ✅ | `CustomerWashTrackingServiceImpl.getActiveSession()` |
| BR-78a | Staff or Admin can cancel an active wash session (from any non-terminal status) with a mandatory reason. Booking reverts to `CONFIRMED`. | ⚠️ | No cancel-session endpoint exists. See BR-S19. |

---

## 8. Staff Operations

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-79 | Only users with role `STAFF` can access staff pages and operations. | ✅ | `@PreAuthorize("hasRole('STAFF')")` on controllers |
| BR-80 | Staff can only view and operate wash sessions assigned to them. | ✅ | `OperationsServiceImpl.requireSessionForCurrentUser()` |
| BR-81 | Staff assignment uses only `ACTIVE` staff members. | ✅ | `StaffAssignmentServiceImpl.pickLeastLoadedActiveStaff()` |
| BR-82 | Auto-assignment picks the staff with the fewest active bookings (least-loaded). | ✅ | `StaffAssignmentServiceImpl` sorts by active booking count |
| BR-83 | Staff KPI target revenue is 5,000,000 VND per period. | ✅ | `OperationsServiceImpl.getStaffSummary()` hardcoded constant |
| BR-84 | Staff cannot modify loyalty points directly. | ✅ | No staff-accessible endpoint to `ADJUST` point transactions |
| BR-85 | Eligible session bookings list is capped at 50 per query. | ✅ | `OperationsServiceImpl.listEligibleSessionBookings()` `Math.min(limit, 50)` |
| BR-85a | Eligible session list displays Priority Queue badges: GOLD, PLATINUM, DIAMOND. | ⚠️ | Not implemented. See `LOYALTY_TIER_RESEARCH.md` |

---

## 9. Loyalty Points & Tier

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-86 | Points are earned only after wash session `COMPLETED`. | ✅ | `LoyaltyServiceImpl.postEarnTransaction()` checks `WashSessionStatus.COMPLETED` |
| BR-87 | Points formula: `floor(finalAmount / 10,000) × tier_multiplier × promotion_multiplier`. | ✅ | `LoyaltyServiceImpl.calculateEarnPoints()`, `LoyaltyRules` |
| BR-88 | Tier multipliers: `BRONZE`=1.0x, `SILVER`=1.2x, `GOLD`=1.5x, `PLATINUM`=2.0x, `DIAMOND`=2.5x. | ✅ | `LoyaltyRules.tierMultiplier()` |
| BR-89 | Promotion multiplier applied: highest multiplier among all linked booking promotions wins. | ✅ | `LoyaltyServiceImpl.bookingPromotionMultiplier()` |
| BR-90 | Only one EARN transaction per booking (idempotent). | ✅ | `UNIQUE INDEX uk_point_transactions_booking_type` on `(booking_id, type)` |
| BR-91 | Point balance cannot be negative. | ✅ | `loyalty_accounts.current_points >= 0` DB CHECK |
| BR-92 | Redemption requires 50–200 points per operation. | ✅ | `LoyaltyRules.MIN/MAX_REDEMPTION_POINTS`, `validateRedemptionAmount()`, `@Min/@Max` in `ApplyPointsRequest` |
| BR-93 | Redemption rate: 1 point = 1,000 VND. | ✅ | `LoyaltyRules.VND_PER_POINT = 1_000` |
| BR-94 | Redemption blocked when insufficient points. | ✅ | `LoyaltyServiceImpl` throws `INSUFFICIENT_POINTS` |
| BR-95 | Redemption blocked for BLOCKED customers. | ⚠️ | `redeemPoints()` does not check `user.getStatus()`. See BR-S11. |
| BR-96 | Customer can hold at most 3 active redemption vouchers. | ⚠️ | Not enforced. See BR-S14. |
| BR-97 | Tier thresholds: `BRONZE`=0pts, `SILVER`=500pts, `GOLD`=1,500pts, `PLATINUM`=4,000pts, `DIAMOND`=10,000pts. | ✅ | `LoyaltyRules.TIER_THRESHOLDS` |
| BR-98 | Tier is upgraded on every point-earn event when lifetime EARN total crosses a threshold. | ✅ | `LoyaltyServiceImpl.evaluateTierUpgrade()` using lifetime EARN sum |
| BR-99 | Tier upgrade is recorded in `tier_histories`. | ✅ | `TierHistoryRepository.save()` in `evaluateTierUpgrade()` |
| BR-100 | Tier recalculation uses **lifetime total EARN points** (not rolling 12-month). | ⚠️ | Diverges from original spec which described rolling 12-month. Decision required. See BR-S10. |
| BR-101 | Loyalty account is auto-created on customer registration. | ✅ | `AuthServiceImpl.ensureDefaultCustomerRecords()` |
| BR-101a | Admin can manually adjust a customer's point balance (add or subtract) with a mandatory reason; recorded as `ADJUST` transaction. | ⚠️ | `ADJUST` type exists in `point_transaction_type` but no admin endpoint exists. See BR-S24. |

---

## 10. Combo Management

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-102 | If customer already owns an active non-expired combo, booking uses it (base_amount = 0). | ✅ | `CustomerComboServiceImpl.findActiveOwnedCombo()` |
| BR-103 | If customer has no active combo, system auto-purchases one at booking time. | ✅ | `BookingServiceImpl.createBooking()` → `customerComboService.createOwnedCombo()` |
| BR-104 | Combo expiration = `activated_at + duration_days × 86400s`. Default duration is 30 days. | ✅ | `CustomerComboServiceImpl.expiresAt()` |
| BR-105 | Expired combo is soft-marked `EXPIRED` on first access attempt. | ✅ | `CustomerComboServiceImpl.findActiveOwnedCombo()` → `combo.markExpired()` |
| BR-106 | Combo with `remaining_usages = 0` is soft-marked `USED_UP`. | ✅ | `CustomerCombo.consumeUsage()` |
| BR-107 | Each booking usage is recorded in `customer_combo_usages` (idempotent by `booking_id`). | ✅ | `CustomerComboServiceImpl.recordUsage()` with `existsByBookingId()` guard |
| BR-108 | `remaining_usages` constraint: `0 ≤ remaining_usages ≤ total_usages`. | ✅ | DB CHECK constraint in `customer_combos` |
| BR-109 | Combo options must be active, belong to the combo, and have no duplicates. | ✅ | `CatalogServiceImpl.requireActiveComboOptions()` |
| BR-110 | Admin can deactivate a combo (soft-delete → `INACTIVE`). | ✅ | `AdminComboServiceImpl.deleteCombo()` → `combo.deactivate()` |
| BR-111 | Duplicate service options in a combo definition are rejected. | ✅ | `AdminComboServiceImpl.replaceOptions()` with `LinkedHashSet` dedup |

---

## 11. Promotions

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-112 | Promotion requires name (max 120 chars, uppercase `^[A-Z0-9_-]+$`), point multiplier, start date, end date, and targeting mode. | ✅ | `@NotBlank @Size @Pattern` in `PromotionRequest`; `PromotionServiceImpl.validate()` |
| BR-113 | Promotion `end_date` must be after `start_date`. | ✅ | `PromotionServiceImpl.validate()` → `VALIDATION_ERROR` |
| BR-114 | Promotion point multiplier must be between 0.0 and 99.99. | ✅ | `PromotionServiceImpl.validate()` |
| BR-115 | `SPECIFIC_TIERS` targeting mode requires at least one tier specified. | ✅ | `PromotionServiceImpl.validate()` |
| BR-116 | `ALL_TIERS` targeting applies the promotion to all loyalty tiers. | ✅ | `PromotionRepository.findActiveForTier()` with `ALL_TIERS` condition |
| BR-117 | Only `ADMIN` role can create, update, or delete promotions. | ✅ | `@PreAuthorize("hasRole('ADMIN')")` on `AdminPromotionController` |
| BR-118 | Promotions are linked to a booking at creation time via `booking_promotions`. | ✅ | `BookingServiceImpl.createBooking()` → `promotionService.listActiveForCustomer()` |
| BR-119 | At point-earn time, the highest promotion multiplier among all linked promotions is used. | ✅ | `LoyaltyServiceImpl.bookingPromotionMultiplier()` using `max(BigDecimal)` |

---

## 12. Vouchers

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-120 | Voucher requires code (max 50 chars, uppercase `^[A-Z0-9_-]+$`), name, discount type, discount value ≥ 1, start date, end date. | ✅ | `@Pattern @Min @NotBlank` in `AdminVoucherRequest` |
| BR-121 | Voucher `end_at` must be after `start_at`. | ✅ | `AdminVoucherServiceImpl.validateRequest()` → `VALIDATION_ERROR` |
| BR-122 | If discount type is `PERCENT`, discount value must be ≤ 100. | ✅ | `AdminVoucherServiceImpl.validateRequest()` |
| BR-123 | Voucher code must be globally unique. | ✅ | `vouchers.code UNIQUE`; `existsByCode()` check on create |
| BR-124 | Voucher code cannot be changed after creation. | ✅ | `AdminVoucherServiceImpl.updateVoucher()` rejects code mismatch |
| BR-125 | Discount calculation: PERCENT → `min(amount × rate / 100, max_discount, amount)`; FIXED → `min(value, max_discount, amount)`. | ✅ | `CatalogServiceImpl.calculateDiscountAmount()` |
| BR-126 | New-customer-only vouchers are blocked for customers with at least one completed booking. | ✅ | `CatalogServiceImpl.validateVoucherOrThrow()` checks `countByCustomerAndStatus(COMPLETED) > 0` |
| BR-127 | Tier-restricted vouchers are blocked for customers not in the allowed tier set. | ✅ | `CatalogServiceImpl.validateVoucherOrThrow()` with `VoucherTier` lookup |
| BR-128 | Voucher deactivation is a soft-delete (sets status to `INACTIVE`). | ✅ | `AdminVoucherServiceImpl.deleteVoucher()` → `voucher.deactivate()` |
| BR-129 | Customer can hold at most 3 active point-redemption vouchers. | ⚠️ | Not enforced. See BR-S14. |
| BR-129a | One customer can use the same voucher code only once (per-user usage limit). | ⚠️ | No `voucher_usages` table exists; only global `used_count` tracked. See BR-S18. |
| BR-129b | Voucher status is auto-set to `INACTIVE` when `end_at` is reached (lazy or scheduled). | ⚠️ | No scheduled job exists. Expiry is currently only checked at validation time. See BR-S25. |

---

## 13. Admin Operations

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-130 | Only `ADMIN` role can access admin endpoints. | ✅ | `@PreAuthorize("hasRole('ADMIN')")` on all admin controllers |
| BR-131 | Admin dashboard KPI cards: total bookings, total revenue (CONFIRMED bookings), total customers, active promotions. | ✅ | `AdminDashboardMetricsServiceImpl.getMetrics()` from live DB |
| BR-132 | Admin can search and filter bookings by status, date range, customer ID, and free-text. | ✅ | `AdminReportingServiceImpl.listBookings()` with `bookingRepository.searchAdmin()` |
| BR-133 | Admin can view full booking detail including wash session, payment, and assigned staff. | ✅ | `AdminReportingServiceImpl.getBookingDetail()` |
| BR-134 | Admin can create staff accounts with unique phone and email; password stored hashed. | ✅ | `AdminReportingServiceImpl.createStaff()` |
| BR-135 | Admin can update staff profile, status, and soft-delete (status → `INACTIVE`). | ✅ | `AdminReportingServiceImpl.updateStaff()`, `updateStaffStatus()`, `deleteStaff()` |
| BR-136 | Admin can update customer status (e.g., BLOCKED, ACTIVE). Change is persisted to DB. | ✅ | `AdminReportingServiceImpl.updateCustomerStatus()` |
| BR-137 | Admin can update customer role. Change is persisted to DB. | ✅ | `AdminReportingServiceImpl.updateCustomerRole()` |
| BR-138 | Admin customer detail includes: profile, loyalty summary, booking counts, revenue, point totals. | ✅ | `AdminReportingServiceImpl.getCustomerDetail()` |
| BR-139 | Admin customer detail tabs: vehicles, bookings, wash history, point transactions, tier history. | ✅ | Separate endpoints in `AdminCustomerController` |
| BR-140 | Admin business health report is computed from live DB: revenue trends, service breakdowns, cancellation rate, promotion attribution. | ✅ | `AdminReportingServiceImpl.getBusinessHealthReport()` |
| BR-141 | Admin can filter accounts by role, status, and free-text search. | ✅ | `AdminReportingServiceImpl.listAccounts()` with `UserRepository.searchAccounts()` |
| BR-141a | Admin can create, update, and deactivate/reactivate `Package` (wash packages). | ⚠️ | No Admin Package management endpoint exists. See BR-S26. |
| BR-141b | Admin can create, update, and deactivate/reactivate `Service` (add-on services). | ⚠️ | No Admin Service management endpoint exists. See BR-S27. |
| BR-141c | Admin can manually adjust a customer's loyalty point balance with a mandatory reason. | ⚠️ | No endpoint exists. Duplicate reference to BR-101a / BR-S24 for traceability. |

---

## 14. Notifications

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-142 | Backend stores notifications per user in the `notifications` table. | ✅ | `Notification` entity, `NotificationRepository` |
| BR-143 | Customer can retrieve their notifications (most recent first, capped at 100). | ✅ | `NotificationServiceImpl.listMyNotifications()` |
| BR-144 | Customer can mark a notification as read. Ownership is verified before update. | ✅ | `NotificationServiceImpl.markAsRead()` |
| BR-144a | A notification is created and stored when a booking is successfully created. | ⚠️ | `notifications` table not auto-populated on booking events. See BR-S20. |
| BR-144b | A notification is created and stored when a booking is confirmed (payment received). | ⚠️ | Not implemented. See BR-S20. |
| BR-144c | A notification is created and stored when staff checks in or completes a wash session. | ⚠️ | Not implemented. See BR-S20. |
| BR-144d | A reminder notification (email) is sent 24 hours before the scheduled booking time. | ⚠️ | Not implemented. Requires scheduled job. See BR-S21. |
| BR-144e | Notification `type` must be one of a defined enum set (e.g. `BOOKING_CREATED`, `BOOKING_CONFIRMED`, `WASH_CHECKED_IN`, `WASH_COMPLETED`, `BOOKING_REMINDER`). Free-form string is not allowed. | ⚠️ | `type VARCHAR(50)` in DB with no constraint. See BR-S28. |
| BR-144f | Real-time or push delivery of notifications (WebSocket or SSE) is not supported. Client polls `GET /api/v1/notifications` every 30 seconds. Poll must pause when browser tab is hidden (`visibilitychange`). After key actions (create booking, payment), frontend calls notification API immediately without waiting for the next cycle. | ✅ | Accepted limitation — pull-only model by design. `idx_notifications_user_id` index exists to ensure fast poll queries. |
| BR-145 | Frontend and backend collaborate on notifications. **Frontend:** poll every 30s, pause on tab hidden, call immediately after key actions, render badge/toast/reminder UI. **Backend:** write to `notifications` table on booking events (see BR-S20), write loyalty-expiry warning via scheduled job (see BR-S21). | ⚠️ | Backend write-on-event and scheduled job not yet implemented. See BR-S20, BR-S21. |

---

## 15. Authorization & Data Access

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-146 | Customers can only access their own data (bookings, vehicles, loyalty, sessions). | ✅ | All customer services use `CurrentUserService.getCurrentUser()` as filter |
| BR-147 | Staff can only access wash sessions assigned to them. | ✅ | `OperationsServiceImpl.requireSessionForCurrentUser()` |
| BR-148 | Staff cannot modify loyalty points. | ✅ | No staff-accessible loyalty write endpoint exists |
| BR-149 | Manual point adjustments via admin require an `ADJUST` transaction record (immutable ledger). | ✅ | `point_transaction_type` includes `ADJUST`; `TierHistory` captures changes |
| BR-150 | Admin can access all customer and booking data. | ✅ | `@PreAuthorize("hasRole('ADMIN')")` grants full access |


---

## 16. Booking Review & Rating

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-151 | Customer can submit a rating (1–5 stars) and optional comment for a booking after it reaches `COMPLETED` status. | ⚠️ | No `reviews` table or endpoint exists. See BR-S22. |
| BR-152 | A customer can only submit one review per booking. | ⚠️ | Not enforced. See BR-S22. |
| BR-153 | Only the customer who owns the booking can submit a review for it. | ⚠️ | Not enforced. See BR-S22. |

---

## 17. Suggested BRs — Not Yet Implemented

These rules are **designed intent** documented in specs but **not enforced** in the current backend. Each is an implementation candidate.

| ID | Rule | Scope | Depends On |
|---|---|---|---|
| BR-S01 | Block booking creation for BLOCKED customers | `BookingServiceImpl.createBooking()` | — |
| BR-S02 | Block booking creation during active suspension | `BookingServiceImpl.createBooking()` + new `suspended_until` field or table | — |
| BR-S03 | Booking window limit by tier (BRONZE=7d, SILVER=14d, GOLD=21d, PLATINUM=30d, DIAMOND=45d) | `BookingServiceImpl.createBooking()` | — |
| BR-S04 | Prevent duplicate booking for same (vehicle, date, time) | `BookingServiceImpl.createBooking()` + partial unique index | — |
| BR-S05 | Enforce shop slot capacity per time slot (configurable) | `BookingServiceImpl.createBooking()` | — |
| BR-S06 | Reserve last slot per time slot for PLATINUM and DIAMOND customers | `BookingServiceImpl.createBooking()` | BR-S05 |
| BR-S07 | Block cancellation within 2 hours of scheduled time | `BookingServiceImpl.cancelBooking()` | — |
| BR-S08 | Mark booking `NO_SHOW` when check-in is more than 20 min late (triggered by scheduled job or at check-in attempt) | `OperationsServiceImpl.checkInSession()` or scheduled job | — |
| BR-S09 | Auto-suspend customer after 2 no-shows in 30 days (14-day suspension) | Triggered after BR-S08 | BR-S02, BR-S08 |
| BR-S10 | Align tier recalculation: decide between lifetime points (current) vs rolling 12-month (spec intent) | `LoyaltyServiceImpl.evaluateTierUpgrade()` | — |
| BR-S11 | Block points redemption for BLOCKED customers | `LoyaltyServiceImpl.redeemPoints()`, `applyPointsToBooking()` | — |
| BR-S12 | Prevent deletion of last remaining vehicle | `VehicleServiceImpl.deleteVehicle()` | — |
| BR-S13 | ~~Validate plate format~~ **Resolved** — already enforced via `@Pattern` in `CreateVehicleRequest` | — | — |
| BR-S14 | Cap active redemption vouchers at 3 per customer | `LoyaltyServiceImpl.redeemPoints()` | — |
| BR-S15 | Auto-block customer after N cancellations in 30 days (configurable threshold) | ❌ Out of Scope | `LOYALTY_TIER_RESEARCH.md` |
| BR-S16 | Validate booking time within business hours 08:00–20:00 (configurable) | `BookingServiceImpl.createBooking()` | — |
| BR-S17 | Validate booking date does not exceed 30 days from today (configurable) | `BookingServiceImpl.createBooking()` | — |
| BR-S18 | One customer can use one voucher code only once per lifetime | `CatalogServiceImpl.validateVoucherOrThrow()` + new `voucher_usages` table or unique index | — |
| BR-S19 | Staff or Admin can cancel an active wash session with mandatory reason; booking reverts to `CONFIRMED` | New `DELETE /api/v1/operations/sessions/{id}` endpoint + `OperationsServiceImpl` | — |
| BR-S20 | Auto-create in-app notification on booking events: `BOOKING_CREATED` (booking created), `BOOKING_CONFIRMED` (payment received), `WASH_CHECKED_IN` (staff check-in), `WASH_COMPLETED` (wash done). `notifications` table must have `idx_notifications_user_id` index to ensure fast poll queries. | `BookingServiceImpl`, `OperationsServiceImpl` call `NotificationService.push()` at each event point | BR-S28 |
| BR-S21 | `@Scheduled` job runs hourly: (1) scans bookings with `scheduled_at` within next 24h and sends reminder email via `BookingEmailDeliveryService`; (2) writes `BOOKING_REMINDER` notification to `notifications` table for each affected booking. Loyalty-expiry warning notifications (points expiring soon) are also written by this job — separate from BR-145 frontend logic. | New `BookingReminderJob` (`@Scheduled`) + `BookingEmailDeliveryService` | BR-S20 |
| BR-S22 | Customer can submit 1–5 star rating with optional comment after booking `COMPLETED`; one review per booking | New `reviews` table + `ReviewService` + `POST /api/v1/customers/bookings/{id}/review` | — |
| BR-S23 | Google OAuth end-to-end flow: verify authorization code with Google, create or link account, return JWT pair | `GoogleOAuthClientImpl` + `AuthServiceImpl` OAuth handler; full flow needs verification test | — |
| BR-S24 | Admin can manually adjust a customer's point balance (positive or negative) with a mandatory reason; creates `ADJUST` transaction | New `POST /api/v1/admin/customers/{id}/points/adjust` endpoint + `LoyaltyService.adjustPoints()` | — |
| BR-S25 | Voucher `end_at` reached: status auto-set to `INACTIVE` via scheduled job (nightly) | New `@Scheduled` job in `VoucherExpiryJob` | — |
| BR-S26 | Admin can create, update, and deactivate/reactivate Packages (wash package catalog) | New `AdminPackageController` + `AdminPackageService` + `AdminPackageServiceImpl` | — |
| BR-S27 | Admin can create, update, and deactivate/reactivate Services (add-on service catalog) | New `AdminServiceController` + `AdminServiceService` + `AdminServiceServiceImpl` | — |
| BR-S28 | `notifications.type` must match a controlled enum (`BOOKING_CREATED`, `BOOKING_CONFIRMED`, `WASH_CHECKED_IN`, `WASH_COMPLETED`, `BOOKING_REMINDER`); enforced at application layer | New `NotificationType` enum + DB CHECK constraint via migration | BR-S20 |

---

## 18. Database Schema

> Source of truth: `V1__init_schema.sql` (Flyway migration). PostgreSQL dialect.

---

### 18.1 Identity & Auth

#### `users`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `full_name` | varchar(100) | NOT NULL |
| `phone` | varchar(20) | UNIQUE NOT NULL |
| `email` | varchar(255) | UNIQUE (nullable) |
| `password_hash` | varchar(255) | NOT NULL |
| `role` | varchar(20) | NOT NULL, CHECK IN ('CUSTOMER','STAFF','ADMIN') |
| `status` | varchar(20) | NOT NULL DEFAULT 'PENDING', CHECK IN ('PENDING','ACTIVE','BLOCKED','SUSPENDED','INACTIVE') |
| `avatar_url` | varchar(500) | nullable |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_users_role`, `idx_users_status`

#### `user_preferences`
| Column | Type | Constraints |
|---|---|---|
| `user_id` | uuid | PK, FK → users(id) ON DELETE CASCADE |
| `language` | varchar(10) | NOT NULL DEFAULT 'VI' |
| `theme` | varchar(20) | NOT NULL DEFAULT 'LIGHT' |
| `notifications_enabled` | boolean | NOT NULL DEFAULT true |
| `email_notifications` | boolean | NOT NULL DEFAULT false |
| `sms_notifications` | boolean | NOT NULL DEFAULT true |

#### `refresh_tokens`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `user_id` | uuid | NOT NULL, FK → users(id) ON DELETE CASCADE |
| `token` | varchar(255) | UNIQUE NOT NULL |
| `expires_at` | timestamptz | NOT NULL |
| `revoked_at` | timestamptz | nullable |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_refresh_tokens_user_id`

#### `otp_verifications`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `user_id` | uuid | nullable, FK → users(id) ON DELETE CASCADE |
| `purpose` | varchar(50) | NOT NULL, CHECK IN ('REGISTRATION','EMAIL_REGISTRATION','PASSWORD_RESET','BOOKING_CONFIRMATION') |
| `code_hash` | varchar(255) | NOT NULL |
| `delivery_address` | varchar(255) | NOT NULL |
| `attempts` | int | NOT NULL DEFAULT 0, CHECK >= 0 |
| `expires_at` | timestamptz | NOT NULL |
| `verified_at` | timestamptz | nullable |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_otp_verifications_user_id`

---

### 18.2 Vehicles

#### `vehicles`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `customer_id` | uuid | NOT NULL, FK → users(id) ON DELETE CASCADE |
| `plate` | varchar(20) | UNIQUE NOT NULL |
| `type` | varchar(30) | NOT NULL |
| `brand` | varchar(50) | NOT NULL |
| `model` | varchar(50) | NOT NULL |
| `vehicle_year` | int | NOT NULL |
| `color` | varchar(30) | nullable |
| `is_primary` | boolean | NOT NULL DEFAULT false |
| `status` | varchar(20) | NOT NULL DEFAULT 'ACTIVE', CHECK IN ('ACTIVE','INACTIVE','DELETED') |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_vehicles_customer_id`

---

### 18.3 Catalog

#### `packages`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `name` | varchar(100) | NOT NULL |
| `description` | varchar(500) | nullable |
| `base_price` | bigint | NOT NULL, CHECK >= 0 |
| `duration_minutes` | int | NOT NULL, CHECK > 0 |
| `image_url` | varchar(500) | nullable |
| `status` | varchar(20) | NOT NULL DEFAULT 'ACTIVE', CHECK IN ('ACTIVE','INACTIVE') |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

#### `services`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `name` | varchar(100) | NOT NULL |
| `description` | varchar(500) | nullable |
| `price` | bigint | NOT NULL, CHECK >= 0 |
| `duration_minutes` | int | NOT NULL, CHECK >= 0 |
| `status` | varchar(20) | NOT NULL DEFAULT 'ACTIVE', CHECK IN ('ACTIVE','INACTIVE') |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

#### `package_services`
| Column | Type | Constraints |
|---|---|---|
| `package_id` | uuid | PK, FK → packages(id) ON DELETE CASCADE |
| `option_id` | uuid | PK, FK → services(id) |
| `option_name` | varchar(100) | NOT NULL |
| `option_description` | varchar(500) | nullable |
| `option_price` | bigint | NOT NULL, CHECK >= 0 |
| `option_duration_minutes` | int | NOT NULL, CHECK >= 0 |
| `quantity` | int | NOT NULL DEFAULT 1, CHECK > 0 |
| `sort_order` | int | NOT NULL DEFAULT 0 |

**Indexes:** `idx_package_services_package_id`, `idx_package_services_option_id`

#### `combos`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `name` | varchar(100) | NOT NULL |
| `description` | varchar(500) | nullable |
| `price` | bigint | NOT NULL, CHECK >= 0 |
| `original_price` | bigint | nullable, CHECK >= 0 if not null |
| `duration_minutes` | int | NOT NULL, CHECK > 0 |
| `duration_days` | int | nullable, CHECK > 0 if not null |
| `max_usages` | int | nullable, CHECK > 0 if not null |
| `image_url` | varchar(500) | nullable |
| `status` | varchar(20) | NOT NULL DEFAULT 'ACTIVE', CHECK IN ('ACTIVE','INACTIVE') |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

#### `combo_services`
| Column | Type | Constraints |
|---|---|---|
| `combo_id` | uuid | PK, FK → combos(id) ON DELETE CASCADE |
| `option_id` | uuid | PK, FK → services(id) |
| `option_name` | varchar(100) | NOT NULL |
| `option_description` | varchar(500) | nullable |
| `option_price` | bigint | NOT NULL, CHECK >= 0 |
| `option_duration_minutes` | int | NOT NULL, CHECK >= 0 |
| `quantity` | int | NOT NULL DEFAULT 1, CHECK > 0 |
| `sort_order` | int | NOT NULL DEFAULT 0 |

**Indexes:** `idx_combo_services_combo_id`, `idx_combo_services_option_id`

---

### 18.4 Vouchers & Promotions

#### `vouchers`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `code` | varchar(50) | UNIQUE NOT NULL |
| `name` | varchar(120) | NOT NULL |
| `discount_type` | varchar(20) | NOT NULL, CHECK IN ('PERCENT','FIXED_AMOUNT') |
| `discount_value` | bigint | NOT NULL, CHECK > 0 |
| `min_order_amount` | bigint | NOT NULL DEFAULT 0, CHECK >= 0 |
| `max_discount_amount` | bigint | nullable, CHECK >= 0 if not null |
| `usage_limit` | int | nullable, CHECK > 0 if not null |
| `used_count` | int | NOT NULL DEFAULT 0, CHECK >= 0 |
| `new_customer_only` | boolean | NOT NULL DEFAULT false |
| `start_at` | timestamptz | NOT NULL |
| `end_at` | timestamptz | NOT NULL, CHECK > start_at |
| `status` | varchar(20) | NOT NULL DEFAULT 'ACTIVE', CHECK IN ('ACTIVE','INACTIVE') |

#### `voucher_tiers`
| Column | Type | Constraints |
|---|---|---|
| `voucher_id` | uuid | PK, FK → vouchers(id) ON DELETE CASCADE |
| `tier` | varchar(20) | PK, CHECK IN ('BRONZE','SILVER','GOLD','PLATINUM','DIAMOND') |

**Indexes:** `idx_voucher_tiers_voucher_id`

#### `promotions`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `name` | varchar(120) | NOT NULL |
| `description` | varchar(500) | nullable |
| `point_multiplier` | numeric(4,2) | NOT NULL DEFAULT 1, CHECK > 0 |
| `targeting_mode` | varchar(30) | NOT NULL DEFAULT 'ALL_TIERS', CHECK IN ('ALL_TIERS','SPECIFIC_TIERS') |
| `start_at` | timestamptz | NOT NULL |
| `end_at` | timestamptz | NOT NULL, CHECK > start_at |
| `status` | varchar(20) | NOT NULL DEFAULT 'ACTIVE', CHECK IN ('ACTIVE','INACTIVE') |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

#### `promotion_tiers`
| Column | Type | Constraints |
|---|---|---|
| `promotion_id` | uuid | PK, FK → promotions(id) ON DELETE CASCADE |
| `tier` | varchar(20) | PK, CHECK IN ('BRONZE','SILVER','GOLD','PLATINUM','DIAMOND') |

**Indexes:** `idx_promotion_tiers_promotion_id`

---

### 18.5 Bookings & Payments

#### `bookings`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `customer_id` | uuid | NOT NULL, FK → users(id) |
| `vehicle_id` | uuid | NOT NULL, FK → vehicles(id) |
| `booking_type` | varchar(30) | NOT NULL, CHECK IN ('PACKAGE','COMBO') |
| `package_id` | uuid | nullable, FK → packages(id) |
| `combo_id` | uuid | nullable, FK → combos(id) |
| `voucher_id` | uuid | nullable, FK → vouchers(id) |
| `assigned_staff_id` | uuid | nullable, FK → users(id) |
| `status` | varchar(30) | NOT NULL DEFAULT 'PENDING', CHECK IN ('PENDING','CONFIRMED','CHECKED_IN','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW') |
| `scheduled_at` | timestamptz | NOT NULL |
| `base_amount` | bigint | NOT NULL DEFAULT 0, CHECK >= 0 |
| `options_amount` | bigint | NOT NULL DEFAULT 0, CHECK >= 0 |
| `discount_amount` | bigint | NOT NULL DEFAULT 0, CHECK >= 0 |
| `final_amount` | bigint | NOT NULL DEFAULT 0, CHECK >= 0 |
| `estimated_duration_minutes` | int | NOT NULL DEFAULT 0, CHECK >= 0 |
| `points_redeemed` | int | NOT NULL DEFAULT 0, CHECK >= 0 |
| `points_discount` | bigint | NOT NULL DEFAULT 0, CHECK >= 0 |
| `note` | text | nullable |
| `cancel_reason` | varchar(500) | nullable |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**CHECK:** `(booking_type='PACKAGE' AND combo_id IS NULL) OR (booking_type='COMBO' AND package_id IS NULL)`

**Indexes:** `idx_bookings_customer_id`, `idx_bookings_vehicle_id`, `idx_bookings_status`, `idx_bookings_scheduled_at`, `idx_bookings_booking_type`, `idx_bookings_package_id`, `idx_bookings_combo_id`, `idx_bookings_voucher_id`

#### `booking_options`
| Column | Type | Constraints |
|---|---|---|
| `booking_id` | uuid | PK, FK → bookings(id) ON DELETE CASCADE |
| `option_id` | uuid | PK, FK → services(id) |
| `option_name` | varchar(100) | NOT NULL |
| `option_price` | bigint | NOT NULL, CHECK >= 0 |

**Indexes:** `idx_booking_options_option_id`

#### `booking_promotions`
| Column | Type | Constraints |
|---|---|---|
| `booking_id` | uuid | PK, FK → bookings(id) ON DELETE CASCADE |
| `promotion_id` | uuid | PK, FK → promotions(id) |
| `point_multiplier` | numeric(4,2) | NOT NULL, CHECK > 0 |

**Indexes:** `idx_booking_promotions_booking_id`, `idx_booking_promotions_promotion_id`

#### `booking_status_histories`
| Column | Type | Constraints |
|---|---|---|
| `id` | bigserial | PK |
| `booking_id` | uuid | NOT NULL, FK → bookings(id) ON DELETE CASCADE |
| `old_status` | varchar(30) | nullable |
| `new_status` | varchar(30) | NOT NULL |
| `changed_by` | uuid | nullable, FK → users(id) |
| `reason` | text | nullable |
| `changed_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_booking_status_histories_booking_id`

#### `payments`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `booking_id` | uuid | UNIQUE NOT NULL, FK → bookings(id) ON DELETE CASCADE |
| `method` | varchar(30) | NOT NULL, CHECK IN ('CASH_AT_COUNTER','BANK_TRANSFER','E_WALLET') |
| `status` | varchar(30) | NOT NULL DEFAULT 'UNPAID', CHECK IN ('UNPAID','PENDING_PAYMENT','PAID','FAILED','REFUNDED') |
| `amount` | bigint | NOT NULL, CHECK >= 0 |
| `transaction_ref` | varchar(120) | nullable |
| `paid_at` | timestamptz | nullable |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_payments_booking_id`

#### `wash_sessions`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `booking_id` | uuid | UNIQUE NOT NULL, FK → bookings(id) ON DELETE CASCADE |
| `assigned_staff_id` | uuid | nullable, FK → users(id) |
| `status` | varchar(30) | NOT NULL DEFAULT 'PENDING', CHECK IN ('PENDING','QUEUED','CHECKED_IN','IN_PROGRESS','COMPLETED','CANCELLED') |
| `fee_amount` | bigint | nullable, CHECK >= 0 if not null |
| `projected_points` | int | nullable, CHECK >= 0 if not null |
| `awarded_points` | int | nullable, CHECK >= 0 if not null |
| `checked_in_at` | timestamptz | nullable |
| `started_at` | timestamptz | nullable |
| `completed_at` | timestamptz | nullable |
| `notes` | text | nullable |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_wash_sessions_booking_id`, `idx_wash_sessions_staff_id`

---

### 18.6 Loyalty & Tiers

#### `loyalty_accounts`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `customer_id` | uuid | UNIQUE NOT NULL, FK → users(id) ON DELETE CASCADE |
| `current_points` | int | NOT NULL DEFAULT 0, CHECK >= 0 |
| `total_earned_points` | int | NOT NULL DEFAULT 0, CHECK >= 0 |
| `tier` | varchar(20) | NOT NULL DEFAULT 'BRONZE', CHECK IN ('BRONZE','SILVER','GOLD','PLATINUM','DIAMOND') |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_loyalty_accounts_customer_id`

#### `point_transactions`
| Column | Type | Constraints |
|---|---|---|
| `id` | bigserial | PK |
| `loyalty_account_id` | uuid | NOT NULL, FK → loyalty_accounts(id) ON DELETE CASCADE |
| `booking_id` | uuid | nullable, FK → bookings(id) ON DELETE SET NULL |
| `type` | varchar(20) | NOT NULL, CHECK IN ('EARN','REDEEM','EXPIRE','ADJUST') |
| `points` | int | NOT NULL |
| `balance_after` | int | NOT NULL, CHECK >= 0 |
| `reason` | varchar(255) | NOT NULL |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_point_transactions_loyalty_account_id`, `idx_point_transactions_booking_id`

**Unique index:** `uk_point_transactions_booking_type` ON `(booking_id, type)` — prevents duplicate EARN per booking

#### `tier_histories`
| Column | Type | Constraints |
|---|---|---|
| `id` | bigserial | PK |
| `loyalty_account_id` | uuid | NOT NULL, FK → loyalty_accounts(id) ON DELETE CASCADE |
| `old_tier` | varchar(20) | nullable |
| `new_tier` | varchar(20) | NOT NULL, CHECK IN ('BRONZE','SILVER','GOLD','PLATINUM','DIAMOND') |
| `total_points_at_change` | int | NOT NULL, CHECK >= 0 |
| `changed_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_tier_histories_loyalty_account_id`

---

### 18.7 Combos (Customer-owned)

#### `customer_combos`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `customer_id` | uuid | NOT NULL, FK → users(id) ON DELETE CASCADE |
| `combo_id` | uuid | NOT NULL, FK → combos(id) |
| `total_usages` | int | NOT NULL, CHECK > 0 |
| `remaining_usages` | int | NOT NULL, CHECK >= 0, CHECK <= total_usages |
| `status` | varchar(20) | NOT NULL DEFAULT 'ACTIVE', CHECK IN ('ACTIVE','EXPIRED','USED_UP','CANCELLED') |
| `activated_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| `expires_at` | timestamptz | NOT NULL |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_customer_combos_customer_id`, `idx_customer_combos_combo_id`

#### `customer_combo_usages`
| Column | Type | Constraints |
|---|---|---|
| `id` | bigserial | PK |
| `customer_combo_id` | uuid | NOT NULL, FK → customer_combos(id) ON DELETE CASCADE |
| `booking_id` | uuid | UNIQUE NOT NULL, FK → bookings(id) ON DELETE CASCADE |
| `used_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_customer_combo_usages_customer_combo_id`

---

### 18.8 Notifications

#### `notifications`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `user_id` | uuid | NOT NULL, FK → users(id) ON DELETE CASCADE |
| `title` | varchar(150) | NOT NULL |
| `message` | text | NOT NULL |
| `type` | varchar(50) | NOT NULL ⚠️ no CHECK constraint — free-form string (see BR-S28) |
| `is_read` | boolean | NOT NULL DEFAULT false |
| `created_at` | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_notifications_user_id`

---

### 18.9 Schema Gap — Pending Migrations

These columns/tables are referenced by `⚠️` BRs but **do not yet exist** in the DB:

| Missing | Required By | Notes |
|---|---|---|
| `voucher_usages(voucher_id, customer_id)` table | BR-S18 | Per-user voucher usage tracking |
| `notifications.type` CHECK constraint | BR-S28 | Enforce `NotificationType` enum values |
| `reviews` table | BR-S22 | Customer ratings after completed booking |


---

## 19. BR Summary by Status

| Status | Count | Description |
|---|---:|---|
| ✅ Implemented | 116 | Enforced in backend code or DB constraints (added BR-144f) |
| ⚠️ Not yet implemented | 44 | BR-S01–BR-S28 + sub-BRs (BR-16a, BR-40a,b, BR-54a–d, BR-77a,b, BR-78a, BR-101a, BR-129a,b, BR-141a–c, BR-144a–e, BR-145, BR-151–153) |
| 🔲 Frontend-only / accepted limitation | 2 | BR-17, BR-18 |
| **Total** | **162+** | |

---

## 20. BR Count by Domain

| Domain | BR Range | ✅ | ⚠️ | 🔲 |
|---|---|---:|---:|---:|
| Account Registration & Auth | BR-01 to BR-18 + BR-16a | 16 | 1 | 2 |
| User Profile | BR-19 to BR-24 | 6 | 0 | 0 |
| Vehicle Management | BR-25 to BR-35 | 10 | 1 | 0 |
| Booking Creation | BR-36 to BR-49 + BR-40a,b | 7 | 9 | 0 |
| Pricing, Voucher & Payment | BR-50 to BR-60 + BR-54a–d | 13 | 1 | 0 |
| Booking Lifecycle & Cancellation | BR-61 to BR-68 | 6 | 2 | 0 |
| Wash Session | BR-69 to BR-78 + BR-77a,b + BR-78a | 9 | 4 | 0 |
| Staff Operations | BR-79 to BR-85 | 7 | 0 | 0 |
| Loyalty Points & Tier | BR-86 to BR-101 + BR-101a | 13 | 4 | 0 |
| Combo Management | BR-102 to BR-111 | 10 | 0 | 0 |
| Promotions | BR-112 to BR-119 | 8 | 0 | 0 |
| Vouchers | BR-120 to BR-129 + BR-129a,b | 9 | 3 | 0 |
| Admin Operations | BR-130 to BR-141 + BR-141a–c | 12 | 3 | 0 |
| Notifications | BR-142 to BR-145 + BR-144a–f | 4 | 6 | 0 |
| Authorization & Data Access | BR-146 to BR-150 | 5 | 0 | 0 |
| Booking Review & Rating | BR-151 to BR-153 | 0 | 3 | 0 |
| Suggested (not yet impl.) | BR-S01 to BR-S28 | 0 | 28 | 0 |
| **Total** | | **134** | **64** | **4** |

---

## 21. Cross-Reference: List_BRs.md → This Document

| `List_BRs.md` | This Document |
|---|---|
| BR-01 (unique phone) | BR-01 |
| BR-02 (no multi-account) | BR-02 |
| BR-03 (required fields) | BR-03 |
| BR-04 (phone format) | BR-04 |
| BR-05 (BRONZE tier on create) | BR-05 |
| BR-06 (OTP activation) | BR-06 |
| BR-07 (phone change OTP) | BR-23 (profile update phone uniqueness) |
| BR-08 (account status) | BR-12, BR-136 |
| BR-09 (blocked cannot book/redeem) | BR-S01, BR-S11 |
| BR-10 (at least one vehicle) | BR-35 |
| BR-11 (plate required) | BR-25 |
| BR-12 (plate format) | BR-26 |
| BR-13 (plate normalization) | BR-27 |
| BR-14 (plate uniqueness) | BR-28 |
| BR-15 (ownership history) | BR-107 (combo usage tracking); vehicle ownership history: ⚠️ not yet in backend |
| BR-16 (tier booking window) | BR-S03 |
| BR-17 (window days by tier) | BR-S03 |
| BR-18 (no duplicate slot) | BR-S04 |
| BR-19 (max 3 active bookings) | BR-42 |
| BR-20 (slot capacity) | BR-S05 |
| BR-21 (slot availability) | BR-S05 |
| BR-22 (booking statuses) | BR-61 |
| BR-23 (cancel from PENDING/CONFIRMED) | BR-62 |
| BR-24 (cancel 2h before) | BR-S07 |
| BR-25 (completed booking immutable) | BR-62 |
| BR-26 (createdAt timestamp) | BR-68 (status history) |
| BR-27 (2 no-shows → suspend) | BR-S09 |
| BR-28 (cancelled cannot check-in) | BR-69 |
| BR-29 (15 min late → no-show) | BR-S08 |
| BR-30 (Platinum/Diamond priority) | BR-S06 |
| BR-31 (session needs customerID) | BR-69 |
| BR-32 (session needs staffID) | BR-70, BR-81 |
| BR-33 (session data requirements) | BR-73 |
| BR-34 (completed booking has session) | BR-75 |
| BR-35 (service in admin list) | BR-39, BR-51 |
| BR-36 (completed session not deletable) | BR-34 (soft-delete only) |
| BR-37 (amount ≥ 0) | BR-50 |
| BR-38 (expired promo blocked) | BR-116 |
| BR-39 (one promo per session) | BR-53, BR-60 |
| BR-40 (one promo per session) | BR-53 |
| BR-41 (points after completion) | BR-86 |
| BR-42 (formula configurable) | BR-87 |
| BR-43 (tier multipliers) | BR-88 — *Note: spec says SILVER=1.5x, GOLD=2x, PLATINUM=3x; backend uses SILVER=1.2x, GOLD=1.5x, PLATINUM=2.0x, DIAMOND=2.5x. Values differ.* |
| BR-44 (points added post-completion) | BR-86 |
| BR-45 (cancelled/no-show no points) | BR-86 (COMPLETED check) |
| BR-46 (balance ≥ 0) | BR-91 |
| BR-47 (points expire 12 months) | BR-S10 (not implemented) |
| BR-48 (refund/reversal flow) | ⚠️ REFUND payment status exists but no auto-reversal service |
| BR-49 (enough points to redeem) | BR-94 |
| BR-50 (blocked cannot redeem) | BR-S11 |
| BR-51 (redemption validity guard) | BR-92 |
| BR-52 (reward types defined) | BR-93, BR-125 |
| BR-53 (redemption history in ledger) | BR-99, BR-149 |
| BR-54 (monthly tier review) | BR-S10 |
| BR-55 (tier thresholds match spec) | BR-97 — *Note: multipliers differ from List_BRs.md BR-43* |
| BR-56 (12-month rolling downgrade) | BR-S10 |
| BR-57 (valid tiers) | BR-97 |
| BR-58 (tier config fields) | BR-97, BR-88 |
| BR-59 (new rules next cycle) | BR-S10 |
| BR-60 (tier change history stored) | BR-99 |
| BR-61 (promotion start/end) | BR-112 |
| BR-62 (start before end) | BR-113 |
| BR-63 (targeted by tier) | BR-115, BR-116 |
| BR-64 (Silver+ hidden from Bronze) | BR-116, BR-127 |
| BR-65 (admin manages promotions) | BR-117, BR-130 |
| BR-66 (expiry notification) | 🔲 Frontend-only |
| BR-67 (booking reminder) | 🔲 Frontend-only |
| BR-68 (booking confirmation notify) | 🔲 Frontend-only |
| BR-69 (staff manages wash session) | BR-79, BR-147 |
| BR-70 (staff cannot modify points) | BR-84, BR-148 |
| BR-71 (adjustment audit log) | BR-149 |
| BR-72 (staff sees checkout data only) | BR-80, BR-147 |
| BR-73 (customer sees own data only) | BR-146 |
| BR-74 (admin sees all) | BR-150 |


---

## 22. Known Spec vs Implementation Divergences

These are cases where the original `List_BRs.md` spec and current backend implementation **intentionally or inadvertently differ**. A decision is needed for each.

| # | Spec (List_BRs.md) | Implementation | Decision Needed |
|---|---|---|---|
| 1 | Tier multipliers: SILVER=1.5x, GOLD=2x, PLATINUM=3x | Backend `LoyaltyRules`: SILVER=1.2x, GOLD=1.5x, PLATINUM=2.0x, DIAMOND=2.5x | **Resolved**: Aligned with `LOYALTY_TIER_RESEARCH.md`. Spec updated. |
| 2 | Tier recalculation uses rolling 12-month points | Backend uses lifetime EARN total | **Resolved**: Option A (lifetime, simpler) chosen per `LOYALTY_TIER_RESEARCH.md`. |
| 3 | Booking window: BRONZE=7d, SILVER=10d, GOLD=12d, PLATINUM=14d, DIAMOND=30d | Not implemented in backend | Implement BR-S03 or adjust spec |
| 4 | `blocked` customer cannot book or redeem points | Neither check enforced in backend | Implement BR-S01 and BR-S11 |
| 5 | Password minimum 6 characters | Backend enforces 8–128 chars + complexity pattern | Spec is outdated — update `List_BRs.md` |
| 6 | Registration does not collect email | Backend requires email (`@NotBlank @Email`) | Spec is outdated — update `List_BRs.md` |
| 7 | Points expire after 12 months | No expiry logic in backend | Implement scheduled expiry job or remove from spec |
| 8 | 2 no-shows in 30 days → 14-day suspension | Not implemented | Implement BR-S08 + BR-S09 or deprioritize |

---

*This file is the **single source of truth** for AutoWash Pro business rules.*
*For implementation work: refer to backend codebase + `V1__init_schema.sql`.*
*For spec decisions: update this file and `docs/List_BRs.md` together.*
