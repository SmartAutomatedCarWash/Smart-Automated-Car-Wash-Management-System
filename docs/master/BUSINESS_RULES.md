# AutoWash Pro — Business Rules (Source of Truth)

> **Version:** 2.2 | **Last updated:** 2026-07-13
> **Scope:** Backend-enforced rules only. Frontend-only prototype behaviors are labelled `[Frontend]`.
> **Status legend:**
> - ✅ in backend
> - ⚠️ Designed, not yet implemented
> - 🔲 Frontend-only (no backend equivalent)
> - ❌ Spec error — corrected here


---

## 1. Account Registration & Authentication

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-001 | Each customer must have a unique phone number. | ✅ | `users.phone UNIQUE`, `AuthServiceImpl` throws `DUPLICATE_PHONE` |
| BR-002 | One phone number cannot create multiple active accounts. | ✅ | `UserRepository.existsByPhone()` checked on register |
| BR-004 | Phone number must follow Vietnamese format `^0[0-9]{9}$` when provided/updated. | ✅ | `@Pattern` in `UpdateUserProfileRequest`; registration currently uses email, full name, password, and confirm password only. |
| BR-005 | New customer starts at tier `BRONZE` with 0 points and `PENDING` status. | ✅ | `User` constructor, `LoyaltyAccount` constructor |
| BR-006 | Account activates only after OTP verification. | ✅ | `AuthServiceImpl.verifyRegistrationOtp()` → `user.activate()` |
| BR-007 | Password must be 8–128 characters with uppercase, lowercase, digit, and special character. | ✅ | `@Pattern` regex in `RegisterRequest` |
| BR-008 | Staff password must be 8–72 characters. | ✅ | `@Size(min=8, max=72)` in `ResetPasswordRequest` |
| BR-009 | OTP code must be exactly 6 digits. | ✅ | `@Pattern(^[0-9]{6}$)` in `VerifyOtpRequest` |
| BR-010 | OTP resend is rate-limited to 3 requests per hour per account. | ✅ | `AuthServiceImpl.enforceResendLimit()` |
| BR-011 | OTP has a configurable expiration window (default 10 min). | ✅ | `AuthServiceImpl.otpExpirationSeconds` from `application.properties` |
| BR-012 | Max OTP verification attempts enforced (configurable). | ✅ | `AuthServiceImpl.otpMaxAttempts` → `RATE_LIMIT_EXCEEDED` |
| BR-013 | Blocked account cannot log in. | ✅ | `AuthServiceImpl.login()` checks `UserStatus.BLOCKED` |
| BR-014 | Password reset requires active (non-blocked) account, email or phone lookup, and OTP verification. | ✅ | `AuthServiceImpl.requestForgotPassword()`, `resetForgotPassword()` |
| BR-015 | Confirm password must match password on reset. | ✅ | `AuthServiceImpl.resetForgotPassword()` |
| BR-016 | Refresh token expiry and revocation are enforced. | ✅ | `AuthServiceImpl.refresh()` checks `isRevoked()` and `expiresAt` |
| BR-017 | Login identifier can be phone or email; system auto-detects by format. | ✅ | `AuthServiceImpl.resolveLoginUser()` |
| BR-018 | Google OAuth login flow: exchange authorization code for user info, create or link account, return JWT. | ⚠️ | Config and `GoogleOAuthClientImpl` exist but end-to-end flow is unverified. See BR-S23. |
| BR-019 | User role home paths: customer → `/customer/home`, staff → `/staff/dashboard`, admin → `/admin/dashboard`. | 🔲 | Frontend routing only |
| BR-020 | Protected routes redirect unauthenticated users to login. | 🔲 | Frontend routing only |

---

## 2. User Profile Management

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-021 | Profile update requires non-empty full name (max 100 chars), optional valid email, and Vietnamese phone. | ✅ | `@NotBlank @Size @Pattern` in `UpdateUserProfileRequest` |
| BR-022 | Phone must be unique across all users when updated. | ✅ | `UserRepository.existsByPhoneAndIdNot()` in `UserProfileServiceImpl` |
| BR-023 | Email must be unique (case-insensitive) across all users when updated. | ✅ | `UserRepository.existsByEmailIgnoreCaseAndIdNot()` |
| BR-024 | Updating profile marks customer as no longer new (`isNewCustomer = false`). | ✅ | `UserProfileServiceImpl.updateProfile()` → `user.markNotNewCustomer()` |
| BR-025 | User preferences (language, theme, notifications) are stored per user. | ✅ | `user_preferences` table, `UserPreference` entity |
| BR-026 | Default preferences: language=`VI`, theme=`LIGHT`, notifications=`true`, SMS=`true`, email=`false`. | ✅ | `UserPreference` constructor defaults |

---

## 3. Vehicle Management

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-027 | Vehicle creation requires plate, type, brand, model, and year. Color is optional. | ✅ | `@NotBlank/@NotNull` in `CreateVehicleRequest` |
| BR-028 | Plate must match Vietnamese format `^[0-9]{2}[A-Z]-[0-9]{6}$` (e.g. `30H-123456`). | ✅ | `@Pattern` in `CreateVehicleRequest` |
| BR-029 | Plate is normalized to uppercase and trimmed before storage. | ✅ | `VehicleServiceImpl.normalizePlate()` |
| BR-030 | Plate must be globally unique. | ✅ | `vehicles.plate UNIQUE`, `VehicleServiceImpl` throws `DUPLICATE_PLATE` |
| BR-031 | Vehicle type must be one of: `CAR`, `SUV`, `TRUCK`, `MOTORBIKE`, `VAN`. | ✅ | `VehicleType` enum in `CreateVehicleRequest` |
| BR-032 | Vehicle year must be between 1900 and 2100. | ✅ | `@Min(1900) @Max(2100)` in `CreateVehicleRequest` and `UpdateVehicleRequest` |
| BR-033 | First vehicle added for a customer automatically becomes the primary vehicle. | ✅ | `VehicleServiceImpl.createVehicle()` counts active vehicles |
| BR-034 | Setting a vehicle as primary unsets the previous primary. | ✅ | `VehicleServiceImpl.setPrimaryVehicle()` |
| BR-035 | Soft-deleting the primary vehicle promotes the next oldest active vehicle to primary. | ✅ | `VehicleServiceImpl.deleteVehicle()` |
| BR-036 | Vehicles are soft-deleted (status → `DELETED`), never hard-deleted. | ✅ | `Vehicle.softDelete()` |

---

## 4. Booking Creation

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-037 | Booking requires a vehicle owned by the customer (status `ACTIVE`). | ✅ | `VehicleRepository.findByOwnerAndIdAndStatus()` in `BookingServiceImpl` |
| BR-038 | Booking must specify either a package or a combo, not both. | ✅ | `@AssertTrue hasPackageOrCombo()` in `CreateBookingRequest`; DB CHECK constraint |
| BR-039 | Only `ACTIVE` packages can be booked. | ✅ | `CatalogServiceImpl.requireActivePackage()` |
| BR-040 | Only `ACTIVE` combos can be booked. | ✅ | `CatalogServiceImpl.requireActiveCombo()` |
| BR-041 | Booking date must be today or in the future (not in the past). | ✅ | `@FutureOrPresent` on `CreateBookingRequest.bookingDate` |
| BR-042 | Booking time must be within configurable business hours (default 08:00–20:00). | ✅ | `BookingServiceImpl.validateBookingTime()` checks `operatingStartTime` / `operatingEndTime` from `SystemSettings` |
| BR-043 | Booking date must not exceed configurable max advance days from today (default 30 days). | ✅ | `BookingServiceImpl.validateBookingTime()` checks `maxAdvanceBookingDays` from `SystemSettings` |
| BR-044 | Booking time must be in `HH:mm` format. | ✅ | `@Pattern(^([01]\d\|2[0-3]):[0-5]\d$)` in `CreateBookingRequest` |
| BR-045 | Customer can hold at most 3 active bookings (CONFIRMED + CHECKED_IN + IN_PROGRESS). | ✅ | `BookingRepository.countByCustomerAndStatusIn() >= 3` → `MAX_ACTIVE_BOOKINGS_EXCEEDED` |
| BR-046 | A new booking is created with status `PENDING`. | ✅ | `Booking` constructor sets `BookingStatus.PENDING` |
| BR-047 | Booking creation is blocked for BLOCKED customers. | ⚠️ | `createBooking()` does not check `user.getStatus()`. See BR-S01. |
| BR-048 | Booking creation is blocked during active suspension. | ⚠️ | No suspension mechanism exists. See BR-S02. |
| BR-049 | Duplicate booking for same vehicle + date + time slot is blocked. | ⚠️ | No check exists. See BR-S04. |
| BR-050 | `scheduled_at` is stored using server local timezone (`Asia/Ho_Chi_Minh` / `ZoneId.systemDefault()`), not `ZoneOffset.UTC`. All booking creation and retrieval uses consistent timezone. | ✅ Fixed in V25 migration + `BookingServiceImpl` | `BookingServiceImpl.createBooking()`, `Booking.getBookingDate()`, `Booking.getBookingTime()` |
| BR-051 | After booking confirmation, customer is redirected directly to `/customer/bookings/{id}` (booking detail page), not an intermediate success page. | ✅ Frontend | `BookingConfirmPage.handleConfirm()` |

---

## 5. Booking Pricing, Voucher & Payment

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-052 | `final_amount = base_price + options_total - voucher_discount - points_discount`. All amounts ≥ 0. | ✅ | `Booking` constructor + DB CHECK constraints |
| BR-053 | Add-on service options must be active and belong to the selected package or combo. Duplicate options are rejected. | ✅ | `CatalogServiceImpl.requireActivePackageOptions()` / `requireActiveComboOptions()` |
| BR-054 | Estimated duration = base duration + sum of selected option durations. | ✅ | `BookingServiceImpl.createBooking()` |
| BR-055 | One voucher per booking. Customer selects from their active `UserVoucher` list (status `AVAILABLE`). | ✅ | `CreateBookingRequest` receives `voucherCode`; `VoucherRedemptionServiceImpl.getUserVoucherByCode()` resolves it. |
| BR-056 | Voucher must be: `AVAILABLE` status, not expired, min order met, tier-eligible, new-customer valid if flagged. | ✅ | `VoucherRedemptionServiceImpl.isVoucherApplicable()` |
| BR-057 | Voucher `new_customer_only = true` is blocked for customers who have at least one completed booking. When evaluating during a new booking creation, the new booking itself is skipped from the count. | ✅ | `VoucherRedemptionServiceImpl.isVoucherApplicable()` uses `skipNewCustomerCheck` |
| BR-058 | Customer redeems points for a Voucher Template to receive a User Voucher (`AVAILABLE`). Each User Voucher can be applied once. Points are deducted via `REDEEM` transaction. | ✅ | `VoucherRedemptionServiceImpl.redeemVoucher()` |
| BR-059 | Tier-restricted vouchers (`voucher_tiers`) are only redeemable/usable by customers whose loyalty tier is in the allowed tier set. | ✅ | `VoucherRedemptionServiceImpl.redeemVoucher()` + `isVoucherApplicable()` with `VoucherTier` lookup |
| BR-060 | Voucher restricted to specific services (`voucher_applicable_services`) is only applicable if the booking contains that service. `FREE_SERVICE` type uses this to determine which service to discount. | ✅ | `VoucherRedemptionServiceImpl.calculateDiscountAmount()` |
| BR-061 | Validate-voucher endpoint (`POST /customers/bookings/validate-voucher`) checks voucher eligibility and returns discount amount without applying it. | ✅ | `BookingController.validateVoucher()` → `BookingServiceImpl.validateVoucher()` |
| BR-062 | `UserVoucher` status transitions from `AVAILABLE` to `USED` via `markAsUsed(booking)`. If booking is cancelled, `release()` restores `AVAILABLE`. | ✅ | `VoucherRedemptionServiceImpl.applyVoucher()`, `UserVoucher.release()` |
| BR-063 | Payment method: `CASH_AT_COUNTER` → initial status `UNPAID`; `BANK_TRANSFER` / `E_WALLET` → `PENDING_PAYMENT`. | ✅ | `BookingServiceImpl.initialPaymentStatus()` |
| BR-064 | Paying a booking marks payment as `PAID` and transitions `PENDING` booking to `CONFIRMED`. | ✅ | `BookingServiceImpl.payBooking()` |
| BR-065 | Payment is blocked for `CANCELLED` or `NO_SHOW` bookings. | ✅ | `BookingServiceImpl.payBooking()` |
| BR-066 | Combo booking sets `base_amount = 0` when customer already owns an active combo. Options surcharges still apply. | ✅ | `BookingServiceImpl.createBooking()` |
| BR-067 | Active promotions for the customer's tier are linked to the booking at creation (`booking_promotions`). | ✅ | `PromotionServiceImpl.listActiveForCustomer()` |
| BR-068 | When a customer uses an already-purchased combo to book (not purchasing a new one), the booking confirm screen hides the payment method selector and shows a "Combo already paid" notice. | ✅ Frontend | `BookingConfirmPage` — `isComboBooking = draft.mode === 'COMBO' && Boolean(selectedCustomerCombo)` |

---

## 6. Booking Lifecycle & Cancellation

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-069 | Booking confirmation status is derived: `PENDING`→`PENDING`, `CONFIRMED/IN_PROGRESS/COMPLETED`→`VERIFIED`, `CANCELLED`→`CANCELLED`, `NO_SHOW`→`EXPIRED`. | ✅ | `Booking.getConfirmationStatus()` (transient) |
| BR-070 | Cancellation is only allowed from `PENDING` or `CONFIRMED` status. Cancellation policy never deducts loyalty points; it only applies voucher refund/forfeit and violation recording. | ✅ | `CANCELLABLE_BOOKING_STATUSES` and voucher-only cancellation handling in `BookingServiceImpl` |
| BR-071 | Cancellation is blocked when booking starts in less than 2 hours. | ⚠️ | Time check not implemented. See BR-S07. |
| BR-072 | Late cancellation does not deduct loyalty points. It applies voucher policy by time before appointment and records `ViolationRecord` for late cancellation. | ✅ | `BookingServiceImpl.cancelBooking()` calls `releaseVoucherForBooking()` or `forfeitVoucherForBooking()` and records `LATE_CANCEL` |
| BR-073 | Cancellation > 24h before appointment returns applied voucher to `AVAILABLE` and records no violation. | ✅ | `BookingServiceImpl.cancelBooking()` → `voucherRedemptionService.releaseVoucherForBooking()` |
| BR-074 | Cancellation 6-24h before appointment forfeits applied voucher and records `ViolationRecord` type `LATE_CANCEL`. | ✅ | `BookingServiceImpl.cancelBooking()` → `forfeitVoucherForBooking()` + `ViolationRecord` |
| BR-075 | Cancellation 1-6h before appointment forfeits applied voucher and records `ViolationRecord` type `LATE_CANCEL`. | ✅ | `BookingServiceImpl.cancelBooking()` → `forfeitVoucherForBooking()` + `ViolationRecord` |
| BR-076 | Cancellation < 1h before appointment forfeits applied voucher and records `ViolationRecord` type `LATE_CANCEL`. | ✅ | `BookingServiceImpl.cancelBooking()` → `forfeitVoucherForBooking()` + `ViolationRecord` |
| BR-077 | Points can only be applied to a booking in `CONFIRMED` status (before check-in). | ✅ | `BookingServiceImpl.applyPoints()` |
| BR-078 | Points can only be applied once per booking. | ✅ | Checks `pointsRedeemed > 0` → `POINTS_ALREADY_APPLIED` |
| BR-079 | Points discount cannot exceed booking final amount. | ✅ | `BookingServiceImpl.applyPoints()` |
| BR-080 | All booking status transitions are recorded in `booking_status_histories`. | ✅ | `BookingServiceImpl.recordStatusHistory()` |
| BR-081 | Customer booking history page (`/customer/bookings`) displays three sections: (1) Active bookings with 5-step status timeline and countdown to appointment; (2) Owned combos with progress bar; (3) Completed/cancelled booking history. | ✅ Frontend | `CustomerBookingListPage` |
| BR-082 | Booking detail page (`/customer/bookings/{id}`) shows a 5-step progress timeline (Pending → Confirmed → Checked In → In Progress → Completed) with current step highlighted and countdown to appointment. Review popup auto-appears when booking reaches COMPLETED and no review exists. | ✅ Frontend | `CustomerBookingDetailPage` — `BookingTimelineStrip`, `CountdownBadge`, auto review hook |

---

## 7. Wash Session Lifecycle

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-083 | Wash session can only be created for a `CONFIRMED` or `PENDING` booking. | ✅ | `OperationsServiceImpl.createSession()` — `ELIGIBLE_BOOKING_STATUSES = {PENDING, CONFIRMED}` |
| BR-084 | Only one active wash session per booking. | ✅ | `washSessionRepository.existsByBooking_IdAndStatusIn()` → `DUPLICATE_ACTIVE_SESSION` |
| BR-085 | New wash session is created with status `PENDING`. | ✅ | `WashSession.create()` sets `PENDING` |
| BR-086 | Valid wash session transitions: `PENDING`→`QUEUED`→`CHECKED_IN`→`IN_PROGRESS`→`COMPLETED`. Cancellation from any non-terminal state. | ✅ | `WashSessionLifecycle.validateTransition()` |
| BR-087 | Check-in records `checked_in_at`, `fee_amount`, and `projected_points`. Booking transitions to `CHECKED_IN`. | ✅ | `OperationsServiceImpl.checkInSession()` |
| BR-088 | Starting wash transitions session to `IN_PROGRESS` and booking to `IN_PROGRESS`. | ✅ | `OperationsServiceImpl.startSession()` |
| BR-089 | Completing wash transitions session to `COMPLETED`, booking to `COMPLETED`, records `awarded_points`, and triggers point-earn. | ✅ | `OperationsServiceImpl.completeSession()` |
| BR-090 | First wash completion marks customer as no longer new. | ✅ | `OperationsServiceImpl.markCustomerAsNotNew()` |
| BR-091 | Check-in past the configured no-show grace window marks booking as `NO_SHOW`; no-show forfeits applied voucher, records `ViolationRecord` type `NO_SHOW`, and sends customer warning notification. Applies to both `CONFIRMED` and `PENDING` bookings. | ✅ | `NoShowDetectionJob` → `BookingNoShowServiceImpl.markOverdueBookingsNoShow()` — `statuses = {CONFIRMED, PENDING}` |
| BR-092 | When booking is marked `NO_SHOW`, the associated wash session (if any) is cancelled. | ✅ | `BookingNoShowServiceImpl.cancelNotCheckedInSessions()` |
| BR-093 | When booking is marked `NO_SHOW`, any applied voucher is forfeited (`FORFEITED`) and never refunded. | ✅ | `voucherRedemptionService.forfeitVoucherForBooking()` |
| BR-094 | When booking is marked `NO_SHOW`, system creates a `ViolationRecord` type `NO_SHOW` for the customer. | ✅ | `BookingNoShowServiceImpl` |
| BR-095 | When booking is marked `NO_SHOW`, system sends a customer warning notification. | ✅ | `NotificationRepository.save()` in `BookingNoShowServiceImpl` |
| BR-096 | Customer can track their active wash session in real time (status, staff, projected points, timestamps). | ✅ | `CustomerWashTrackingServiceImpl.getActiveSession()` |
| BR-097 | Staff or Admin can cancel an active wash session with a mandatory reason and fault type. If session is `PENDING`/`QUEUED`: Booking reverts to `CONFIRMED`. If `CHECKED_IN`/`IN_PROGRESS`: If Customer Fault -> Booking `CANCELLED` & `LATE_CANCEL` penalty; If CarWash Fault -> Booking `CANCELLED` (pending resolution). | ⚠️ | Designed |
| BR-098 | Staff can check-in a booking directly from `PENDING` status without a separate "approve" step. The system auto-queues then checks in in one atomic call. | ✅ | `OperationsServiceImpl` / `staff-operations-flow.tsx` `runAction("check-in")` |
| BR-099 | Eligible session bookings list includes both `PENDING` and `CONFIRMED` bookings (previously only `CONFIRMED`), allowing staff to create sessions for bookings awaiting OTP confirmation. | ✅ | `OperationsServiceImpl.listEligibleSessionBookings()` — `ELIGIBLE_BOOKING_STATUSES = {PENDING, CONFIRMED}` |

---

## 8. Staff Operations

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-100 | Only users with role `STAFF` can access staff pages and operations. | ✅ | `@PreAuthorize("hasRole('STAFF')")` on controllers |
| BR-101 | Staff can only view and operate wash sessions assigned to them. | ✅ | `OperationsServiceImpl.requireSessionForCurrentUser()` |
| BR-102 | Staff assignment uses only `ACTIVE` staff members. | ✅ | `StaffAssignmentServiceImpl.pickLeastLoadedActiveStaff()` |
| BR-103 | Auto-assignment picks the staff with the fewest active bookings (least-loaded). | ✅ | `StaffAssignmentServiceImpl` sorts by active booking count |
| BR-104 | Staff KPI target revenue is 5,000,000 VND per period (TODAY/WEEK/MONTH). Admin can view KPI per staff via `GET /admin/staff/kpi?range=TODAY\|WEEK\|MONTH`: completed bookings count, revenue in range, active sessions, progress % vs target. | ✅ | `AdminReportingServiceImpl.listStaffKpi()` + `StaffKpiItem` DTO. Staff with ≥2 active sessions flagged as overloaded. |
| BR-105 | Staff cannot modify loyalty points directly. | ✅ | No staff-accessible endpoint to `ADJUST` point transactions |
| BR-106 | Eligible session bookings list is capped at 50 per query. | ✅ | `OperationsServiceImpl.listEligibleSessionBookings()` `Math.min(limit, 50)` |
| BR-107 | Eligible session list displays Priority Queue badges: GOLD, PLATINUM, DIAMOND. | ⚠️ | Not implemented. See `LOYALTY_TIER_RESEARCH.md` |

---

## 9. Loyalty Points & Tier

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-108 | Points are earned only after wash session `COMPLETED`. | ✅ | `LoyaltyServiceImpl.postEarnTransaction()` checks `WashSessionStatus.COMPLETED` |
| BR-109 | Points formula: `floor(finalAmount / earnPointsUnitAmount) × tier_multiplier × promotion_multiplier`. `earnPointsUnitAmount` is configurable via `SystemSettings` (default 10,000). | ✅ | `LoyaltyServiceImpl.calculateEarnPoints()`, `TierConfigService.getPointMultiplier()` |
| BR-110 | Tier multipliers are stored in `tier_configs` table and configurable by Admin. Defaults: `BRONZE`=1.0x, `SILVER`=1.2x, `GOLD`=1.5x, `PLATINUM`=2.0x, `DIAMOND`=2.5x. | ✅ | `TierConfigServiceImpl.getPointMultiplier()` reads from `tier_configs` |
| BR-111 | Promotion multiplier applied: highest multiplier among all linked booking promotions wins. | ✅ | `LoyaltyServiceImpl.bookingPromotionMultiplier()` |
| BR-112 | Only one EARN transaction per booking (idempotent). | ✅ | `UNIQUE INDEX uk_point_transactions_booking_type` on `(booking_id, type)` |
| BR-113 | Point balance cannot be negative. | ✅ | `loyalty_accounts.current_points >= 0` DB CHECK |
| BR-114 | Voucher redemption requires `requiredPoints` (configured per VoucherTemplate). | ✅ | `VoucherRedemptionServiceImpl.redeemVoucher()` checks `loyaltyAccount.getCurrentPoints() < template.getRequiredPoints()` |
| BR-115 | Points are deducted via `REDEEM` transaction when customer exchanges points for a voucher. | ✅ | `LoyaltyServiceImpl.redeemPoints()` creates `REDEEM` PointTransaction |
| BR-116 | Redemption blocked when insufficient points. | ✅ | `LoyaltyServiceImpl.redeemPoints()` throws `INSUFFICIENT_POINTS` |
| BR-117 | Redemption blocked for BLOCKED customers. | ⚠️ | `redeemPoints()` does not check `user.getStatus()`. See BR-S11. |
| BR-118 | Tier thresholds stored in `tier_configs.min_points`. Defaults: `BRONZE`=0, `SILVER`=500, `GOLD`=1,500, `PLATINUM`=4,000, `DIAMOND`=10,000. Configurable by Admin. | ✅ | `TierConfigServiceImpl.calculateTierForPoints()` reads from `tier_configs` |
| BR-119 | Tier is upgraded on every point-earn event when lifetime EARN total crosses a threshold. Upgrade only (no downgrade). | ✅ | `LoyaltyServiceImpl.evaluateTierUpgrade()` using `totalEarnedPoints` |
| BR-120 | Tier upgrade is recorded in `tier_histories`. A notification is sent to the customer. | ✅ | `TierHistoryRepository.save()` + `notificationRepository.save()` in `evaluateTierUpgrade()` |
| BR-121 | Tier recalculation uses **lifetime total EARN points** (not rolling 12-month). **Resolved**: lifetime approach chosen per `LOYALTY_TIER_RESEARCH.md`. | ✅ | `LoyaltyServiceImpl.evaluateTierUpgrade()` uses `account.getTotalEarnedPoints()` |
| BR-122 | Loyalty account is auto-created on customer registration. | ✅ | `AuthServiceImpl.ensureDefaultCustomerRecords()` |
| BR-123 | Admin can manually adjust a customer's point balance (add or subtract) with a mandatory reason; recorded as `ADJUST` transaction. | ✅ | `LoyaltyServiceImpl.postBonusTransaction()` / `adjustActivePoints()` called from `AdminCustomerController` |
| BR-124 | Customer earns +30 bonus points on their first completed booking. | ✅ | `BookingServiceImpl.createBooking()` |
| BR-125 | Customer earns +10 bonus points when submitting a review. | ✅ | `ReviewServiceImpl.submitReview()` |
| BR-126 | Admin can manually set a customer's tier via the Admin panel. | ✅ | `LoyaltyServiceImpl.updateCustomerTierByAdmin()` |

---

## 10. Combo Management

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-127 | If customer already owns an active non-expired combo, booking uses it (base_amount = 0). | ✅ | `CustomerComboServiceImpl.findActiveOwnedCombo()` |
| BR-128 | Package and Combo are both composed from Service records through join tables (`package_services`, `combo_services`). Service is not booked directly. | ✅ | `CatalogServiceImpl.requireActivePackageOptions()` / `requireActiveComboOptions()`; frontend maps `/services` only as selectable add-ons/options |
| BR-129 | Customer can directly purchase a combo via `POST /customers/combos/{id}/purchase`. System creates `CustomerCombo` with status `ACTIVE` immediately — no payment gateway required for demo. If customer has no active combo at booking time, booking is blocked. | ✅ | `CustomerComboServiceImpl.purchaseCombo()` — implemented 2026-07-13. Previously threw `PAYMENT_VERIFICATION_REQUIRED`. |
| BR-130 | Combo expiration = `activated_at + duration_days × 86400s`. Default duration is 30 days. | ✅ | `CustomerComboServiceImpl.expiresAt()` |
| BR-131 | Expired combo is soft-marked `EXPIRED` on first access attempt. | ✅ | `CustomerComboServiceImpl.findActiveOwnedCombo()` → `combo.markExpired()` |
| BR-132 | Combo with `remaining_usages = 0` is soft-marked `USED_UP`. | ✅ | `CustomerCombo.consumeUsage()` |
| BR-133 | Each booking usage is recorded in `customer_combo_usages` (idempotent by `booking_id`). | ✅ | `CustomerComboServiceImpl.recordUsage()` with `existsByBookingId()` guard |
| BR-134 | `remaining_usages` constraint: `0 ≤ remaining_usages ≤ total_usages`. | ✅ | DB CHECK constraint in `customer_combos` |
| BR-135 | Combo options must be active, belong to the combo, and have no duplicates. | ✅ | `CatalogServiceImpl.requireActiveComboOptions()` |
| BR-136 | `options[].optionId` in package/combo admin payloads must reference an existing active Service ID; join rows store that Service FK in `package_services` or `combo_services`. | ✅ | `AdminCatalogManagementServiceImpl` and `AdminComboServiceImpl.replaceOptions()` validate active services before persisting join rows |
| BR-137 | Admin can deactivate a combo (soft-delete → `INACTIVE`). | ✅ | `AdminComboServiceImpl.deleteCombo()` → `combo.deactivate()` |
| BR-138 | Duplicate service options in a combo definition are rejected. | ✅ | `AdminComboServiceImpl.replaceOptions()` with `LinkedHashSet` dedup |
| BR-139 | Combo checkout page (`/customer/combos/{id}/checkout`) displays an auto-advancing image slideshow (interval 3s) with manual prev/next navigation and dot indicators. | ✅ Frontend | `CustomerComboCheckoutPage` — `comboImages`, `slideIndex`, `setInterval` |

---

## 11. Promotions

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-140 | Promotion requires name (max 120 chars, uppercase `^[A-Z0-9_-]+$`), point multiplier, start date, end date, and targeting mode. | ✅ | `@NotBlank @Size @Pattern` in `PromotionRequest`; `PromotionServiceImpl.validate()` |
| BR-141 | Promotion `end_date` must be after `start_date`. | ✅ | `PromotionServiceImpl.validate()` → `VALIDATION_ERROR` |
| BR-142 | Promotion point multiplier must be between 0.0 and 99.99. | ✅ | `PromotionServiceImpl.validate()` |
| BR-143 | `SPECIFIC_TIERS` targeting mode requires at least one tier specified. | ✅ | `PromotionServiceImpl.validate()` |
| BR-144 | `ALL_TIERS` targeting applies the promotion to all loyalty tiers. | ✅ | `PromotionRepository.findActiveForTier()` with `ALL_TIERS` condition |
| BR-145 | Only `ADMIN` role can create, update, or delete promotions. | ✅ | `@PreAuthorize("hasRole('ADMIN')")` on `AdminPromotionController` |
| BR-146 | Promotions are linked to a booking at creation time via `booking_promotions`. | ✅ | `BookingServiceImpl.createBooking()` → `promotionService.listActiveForCustomer()` |
| BR-147 | At point-earn time, the highest promotion multiplier among all linked promotions is used. | ✅ | `LoyaltyServiceImpl.bookingPromotionMultiplier()` using `max(BigDecimal)` |

---

## 12. Vouchers (Refactored — Template + UserVoucher Model)

> **Architecture:** The old `vouchers` table has been renamed to `voucher_templates`. Customers no longer use vouchers directly — they first **redeem points** to receive a personal `UserVoucher` (stored in `user_vouchers`), then apply that `UserVoucher` to a booking.

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-148 | VoucherTemplate requires code (max 50 chars, uppercase `^[A-Z0-9_-]+$`), name, discount type (`PERCENT`/`FIXED_AMOUNT`/`FREE_SERVICE`), discount value ≥ 1, start date, end date. | ✅ | `@Pattern @Min @NotBlank` in `AdminVoucherRequest` |
| BR-149 | VoucherTemplate `end_at` must be after `start_at`. | ✅ | `AdminVoucherServiceImpl.validateRequest()` → `VALIDATION_ERROR` |
| BR-150 | If discount type is `PERCENT`, discount value must be ≤ 100. Admin UI allows configuring `maxDiscountAmount` and `minOrderAmount`. | ✅ | `AdminVoucherServiceImpl.validateRequest()` |
| BR-151 | Voucher code must be globally unique. | ✅ | `voucher_templates.code UNIQUE`; `existsByCode()` check on create |
| BR-152 | Voucher code cannot be changed after creation. | ✅ | `AdminVoucherServiceImpl.updateVoucher()` rejects code mismatch |
| BR-153 | Discount calculation: `PERCENT` → `min(amount × rate / 100, maxDiscountAmount)`; `FIXED_AMOUNT` → `min(value, amount)`; `FREE_SERVICE` → `min(amount, highest applicable service price)`. | ✅ | `VoucherRedemptionServiceImpl.calculateDiscountAmount()` |
| BR-154 | New-customer-only vouchers are blocked for customers with at least one completed booking. | ✅ | `VoucherRedemptionServiceImpl.redeemVoucher()` + `isVoucherApplicable()` |
| BR-155 | Tier-restricted vouchers (via `voucher_tiers`) are blocked for customers not in the allowed tier set. | ✅ | `VoucherRedemptionServiceImpl.redeemVoucher()` + `isVoucherApplicable()` |
| BR-156 | VoucherTemplate deactivation is a soft-delete (sets status to `INACTIVE`). | ✅ | `AdminVoucherServiceImpl.deleteVoucher()` → `voucher.deactivate()` |
| BR-157 | `FREE_SERVICE` vouchers require `voucher_applicable_services` mapping. Discount equals the price of the highest-priced applicable service selected in the booking. | ✅ | `VoucherRedemptionServiceImpl.calculateDiscountAmount()` |
| BR-158 | Each `UserVoucher` is a unique instance — two customers redeeming the same VoucherTemplate code get separate UserVouchers. A customer cannot use another customer's voucher. | ✅ | `UserVoucher` has `user_id` FK; `getUserVoucherByCode()` filters by user |
| BR-159 | `UserVoucher` expiration is based on `expiredAt = issuedAt + validDaysAfterClaim`. Expired vouchers are auto-marked `EXPIRED` by `VoucherExpirationJob`. | ✅ | `UserVoucher.expire()`, `VoucherExpiryNotificationJob` |
| BR-160 | UserVoucher `validDaysAfterClaim` is defined on the VoucherTemplate. Default 30 days, configurable per template via Admin UI. | ✅ | `VoucherRedemptionServiceImpl.redeemVoucher()` uses `template.getValidDaysAfterClaim()` |
| BR-161 | When a booking is cancelled, the applied UserVoucher is released back to `AVAILABLE` status and the VoucherTemplate's `usedCount` is decremented. | ✅ | `UserVoucher.release()`, `VoucherTemplate.undoUse()` |
| BR-162 | VoucherTemplate `usageLimit` controls global redemption cap. `usedCount` is incremented on each redemption and checked against `usageLimit`. | ✅ | `VoucherTemplate.isUsageLimitReached()`, `recordUse()` |

---

## 13. Admin Operations

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-163 | Only `ADMIN` role can access admin endpoints. | ✅ | `@PreAuthorize("hasRole('ADMIN')")` on all admin controllers |
| BR-164 | Admin dashboard KPI cards: total bookings, total revenue (COMPLETED bookings), total customers, active promotions. Full dashboard (`/admin/dashboard/full`) includes booking trend, status distribution, peak hours, live ops, loyalty tier distribution, voucher stats, top services, customer insights, no-show alerts, recent bookings, review summary, and **staff performance KPI section**. | ✅ | `AdminDashboardMetricsServiceImpl.getMetrics()`, `AdminDashboardFullServiceImpl.getDashboardFull()`, `AdminReportingServiceImpl.listStaffKpi()` |
| BR-165 | Admin can search and filter bookings by status, date range, customer ID, and free-text. | ✅ | `AdminReportingServiceImpl.listBookings()` with `bookingRepository.searchAdmin()` |
| BR-166 | Admin can view full booking detail including wash session, payment, and assigned staff. | ✅ | `AdminReportingServiceImpl.getBookingDetail()` |
| BR-167 | Admin can create staff accounts with unique phone and email; password stored hashed. | ✅ | `AdminReportingServiceImpl.createStaff()` |
| BR-168 | Admin can update staff profile, status, and soft-delete (status → `INACTIVE`). | ✅ | `AdminReportingServiceImpl.updateStaff()`, `updateStaffStatus()`, `deleteStaff()` |
| BR-169 | Admin can update customer status (e.g., BLOCKED, ACTIVE). Change is persisted to DB. | ✅ | `AdminReportingServiceImpl.updateCustomerStatus()` |
| BR-170 | Admin can update customer role. Change is persisted to DB. | ✅ | `AdminReportingServiceImpl.updateCustomerRole()` |
| BR-171 | Admin customer detail includes: profile, loyalty summary, booking counts, revenue, point totals. | ✅ | `AdminReportingServiceImpl.getCustomerDetail()` |
| BR-172 | Admin customer detail tabs: vehicles, bookings, wash history, point transactions, tier history. | ✅ | Separate endpoints in `AdminCustomerController` |
| BR-173 | Admin business health report is computed from live DB: revenue trends, service breakdowns, cancellation rate, promotion attribution. | ✅ | `AdminReportingServiceImpl.getBusinessHealthReport()` |
| BR-174 | Admin can filter accounts by role, status, and free-text search. | ✅ | `AdminReportingServiceImpl.listAccounts()` with `UserRepository.searchAccounts()` |
| BR-175 | Admin can create, update, and deactivate/reactivate `Package` (wash packages). | ✅ | `AdminCatalogManagementController` + `AdminServiceManagementServiceImpl`. Fully implemented with image upload. |
| BR-176 | Admin can create, update, and deactivate/reactivate `Service` (add-on services). | ✅ | `AdminCatalogManagementController` + `AdminServiceManagementServiceImpl`. Fully implemented. |
| BR-177 | Admin can manually adjust a customer's loyalty point balance with a mandatory reason. | ✅ | `PUT /admin/customers/{id}/points` → `LoyaltyServiceImpl.adjustActivePoints()`. See BR-123. |
| BR-178 | Admin dashboard includes a Staff Performance section with per-staff KPI: completed bookings, revenue, active sessions, KPI progress bar (5M VND target per period). Staff with >=2 active sessions flagged as overloaded. Top 3 staff by completions shown with 🥇🥈🥉 medals. | ✅ | `GET /api/v1/admin/staff/kpi?range=TODAY\|WEEK\|MONTH` → `AdminReportingServiceImpl.listStaffKpi()` |
| BR-179 | Package and combo catalog items support multiple images (comma-separated URLs in `image_url` TEXT column, per V16 migration). Each package has 3–6 images, each combo has 2–4 images, all sourced from Pexels. | ✅ | V108 demo migration seeds image URLs. `BookingPackage.imageUrls`, `BookingCombo.imageUrls` |

---

## 14. Notifications

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-180 | Backend stores notifications per user in the `notifications` table. | ✅ | `Notification` entity, `NotificationRepository` |
| BR-181 | Customer can retrieve their notifications (most recent first, capped at 100). | ✅ | `NotificationServiceImpl.listMyNotifications()` |
| BR-182 | Customer can mark a notification as read. Ownership is verified before update. | ✅ | `NotificationServiceImpl.markAsRead()` |
| BR-183 | A notification is created and stored when a booking is successfully created. | ⚠️ | `notifications` table not auto-populated on booking events. See BR-S20. |
| BR-184 | A notification is created and stored when a booking is confirmed (payment received). | ⚠️ | Not implemented. See BR-S20. |
| BR-185 | A notification is created and stored when staff checks in or completes a wash session. | ⚠️ | Not implemented. See BR-S20. |
| BR-186 | A reminder notification (email) is sent 24 hours before the scheduled booking time. | ✅ | `BookingReminderJob` creates in-app notification and sends email via `BookingEmailDeliveryService`. Duplicate prevention via `reminder_sent`. |
| BR-187 | Notification `type` must be one of a defined enum set (e.g. `BOOKING_CREATED`, `BOOKING_CONFIRMED`, `WASH_CHECKED_IN`, `WASH_COMPLETED`, `BOOKING_REMINDER`). Free-form string is not allowed. | ⚠️ | `type VARCHAR(50)` in DB with no constraint. See BR-S28. |
| BR-188 | Real-time or push delivery of notifications (WebSocket or SSE) is not supported. Client polls `GET /api/v1/notifications` every 30 seconds. Poll must pause when browser tab is hidden (`visibilitychange`). After key actions (create booking, payment), frontend calls notification API immediately without waiting for the next cycle. | ✅ | Accepted limitation — pull-only model by design. `idx_notifications_user_id` index exists to ensure fast poll queries. |
| BR-189 | Frontend and backend collaborate on notifications. **Frontend:** poll every 30s, pause on tab hidden, call immediately after key actions, render badge/toast/reminder UI. **Backend:** write to `notifications` table on booking events (see BR-S20), write loyalty-expiry warning via scheduled job (see BR-S21). | ⚠️ | Backend write-on-event and scheduled job not yet implemented. See BR-S20, BR-S21. |
| BR-190 | Backend sends a notification when a customer's loyalty tier is upgraded. | ✅ | `LoyaltyServiceImpl.evaluateTierUpgrade()` |
| BR-191 | Backend runs a daily scheduled job to send notifications for vouchers expiring in 3 days. | ✅ | `VoucherExpiryNotificationJob` |

---

## 15. Authorization & Data Access

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-192 | Customers can only access their own data (bookings, vehicles, loyalty, sessions). | ✅ | All customer services use `CurrentUserService.getCurrentUser()` as filter |
| BR-193 | Staff can only access wash sessions assigned to them. | ✅ | `OperationsServiceImpl.requireSessionForCurrentUser()` |
| BR-194 | Staff cannot modify loyalty points. | ✅ | No staff-accessible loyalty write endpoint exists |
| BR-195 | Manual point adjustments via admin require an `ADJUST` transaction record (immutable ledger). | ✅ | `point_transaction_type` includes `ADJUST`; `TierHistory` captures changes |
| BR-196 | Admin can access all customer and booking data. | ✅ | `@PreAuthorize("hasRole('ADMIN')")` grants full access |


---

## 16. Booking Review & Rating

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-197 | Customer can submit a rating (1–5 stars) and optional comment for a booking after it reaches `COMPLETED` status. | ✅ | `ReviewServiceImpl.submitReview()` validates `BookingStatus.COMPLETED`; `POST /api/v1/customers/bookings/{id}/review` |
| BR-198 | A customer can only submit one review per booking. | ✅ | `ReviewRepository.existsByBookingId()` check in `ReviewServiceImpl.submitReview()` → `DUPLICATE_REVIEW` |
| BR-199 | Only the customer who owns the booking can submit a review for it. | ✅ | `BookingRepository.findByIdAndCustomerId()` ownership check in `ReviewServiceImpl` |
| BR-200 | Review rating must be an integer between 1 and 5 inclusive. | ✅ | `@Min(1) @Max(5)` in `ReviewRequest` DTO |
| BR-201 | Customer earns +10 bonus loyalty points when submitting a review. | ✅ | `ReviewServiceImpl.submitReview()` calls `LoyaltyServiceImpl.postBonusTransaction()` |
| BR-202 | Admin can view aggregated review statistics: average rating, total count, and per-star distribution. | ✅ | `GET /api/v1/admin/reviews/stats` → `ReviewServiceImpl.getReviewStats()` |
| BR-203 | Admin can view paginated list of all reviews with customer and booking details. | ✅ | `GET /api/v1/admin/reviews` with `page`, `size`, `sort` params → `ReviewRepository.findAllWithDetails()` |
| BR-204 | Customer can check whether a specific booking has already been reviewed. | ✅ | `GET /api/v1/customers/bookings/{id}/review/status` → `ReviewServiceImpl.hasReviewedBooking()` |
| BR-205 | Reviews are read-only after submission — customers cannot edit or delete reviews. | ✅ | No PUT/DELETE endpoint exists for reviews |

---

## 16a. Blog Guides System

> **New in v2.1**: Blog guides provide car care tips and washing advice to customers, with social engagement features (likes, comments).

| BR | Rule | Status | Implementation |
|---|---|---|---|
| BR-206 | Blog posts are created and managed by Admin. Each blog has a title, content, optional image, author, and timestamps. | ✅ | `Blog` entity + `AdminBlogController` CRUD endpoints |
| BR-207 | Customers can like a blog post. Each customer can only like a blog once (toggle like/unlike). | ✅ | `BlogLike` entity with `UNIQUE(blog_id, user_id)` constraint; `BlogServiceImpl.toggleLike()` |
| BR-208 | Customers can comment on a blog post. Comments require non-empty content (max 1000 chars). | ✅ | `BlogComment` entity + `POST /api/v1/blogs/{id}/comments`; `@NotBlank @Size(max=1000)` |
| BR-209 | Blog listing displays like count and comment count per blog. These counts are computed from `blog_likes` and `blog_comments` tables. | ✅ | `BlogRepository.countLikes()`, `BlogRepository.countComments()` |
| BR-210 | Admin can soft-delete (deactivate) a blog post. Deactivated blogs are hidden from customer listing but remain in the database. | ✅ | `AdminBlogController.deleteBlog()` → `blog.deactivate()` |
| BR-211 | Blog comments display commenter name and creation timestamp. Customers can only delete their own comments. | ✅ | `BlogCommentResponse` includes `userName`, `createdAt`; ownership check on delete |

---

