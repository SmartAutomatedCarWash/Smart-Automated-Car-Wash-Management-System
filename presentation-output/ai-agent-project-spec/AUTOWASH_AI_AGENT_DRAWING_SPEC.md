# AUTO WASH PRO / AURA CAR CARE
## Complete Project Information and Visual-Flow Specification for an AI Drawing Agent

> Tài liệu này được tổng hợp từ mã nguồn hiện tại trong repository `SWP391`, bao gồm frontend, backend, database migrations và business rules. Mục tiêu là cung cấp đủ context để một AI Agent khác có thể vẽ slide flow giống mẫu: có actor, màn hình/biểu tượng, hành động ngắn, mũi tên nối liên tục và các nhánh quyết định quan trọng.

---

# 1. PRODUCT IDENTITY

## 1.1 Tên dự án

- Tên sản phẩm: **AutoWash Pro**.
- Tên thương hiệu hiển thị trên giao diện: **AURA CAR CARE**.
- Loại hệ thống: nền tảng web quản lý trung tâm rửa xe, đặt lịch, vận hành, thanh toán và loyalty.
- Bối cảnh: đồ án SWP391, FPT University HCMC, Summer 2026.
- Tiền tệ: **VND**, lưu và hiển thị dưới dạng số nguyên.
- Ngôn ngữ giao diện: hỗ trợ **Vietnamese** và **English**.

## 1.2 Mục tiêu sản phẩm

Hệ thống số hóa toàn bộ vòng đời dịch vụ rửa xe:

1. Khách hàng tạo tài khoản và quản lý phương tiện.
2. Khách xem gói dịch vụ, combo, khuyến mãi và ưu đãi loyalty.
3. Khách chọn phương tiện, ngày giờ và giữ chỗ tạm thời.
4. Hệ thống kiểm tra sức chứa của khung giờ.
5. Khách tạo booking, áp dụng voucher và chọn phương thức thanh toán.
6. Manager/Admin theo dõi booking và phân công nhân viên.
7. Staff check-in xe, đưa xe vào hàng chờ, bắt đầu và hoàn thành phiên rửa.
8. Khách theo dõi tiến trình rửa xe.
9. Sau khi hoàn thành, hệ thống cộng điểm, cập nhật tier và lưu lịch sử.
10. Khách đánh giá booking; Admin/Manager theo dõi chất lượng và hiệu suất.

## 1.3 Điểm nổi bật cần thể hiện khi vẽ

- Một hệ thống thống nhất cho **Customer, Staff, Manager và Admin**.
- Booking có **giới hạn sức chứa theo khung giờ**.
- Khung giờ được **hold 15 phút** trong lúc khách hoàn tất booking/payment.
- Mặc định tối đa **3 booking trong một khung giờ một tiếng**, có thể cấu hình.
- Hỗ trợ package, combo, dịch vụ bổ sung, voucher và điểm thưởng.
- Phân công staff theo trạng thái active, khả dụng và workload.
- Theo dõi wash session theo tiến trình thực tế.
- Loyalty có 5 tier và multiplier khác nhau.
- Hỗ trợ VNPay, SePay/bank transfer và thanh toán tại quầy.
- Có lịch sử booking, wash session, point transaction và tier history.
- Dashboard quản trị có KPI, doanh thu, staff performance, review và báo cáo.

---

# 2. ACTORS AND WORKSPACES

## 2.1 Guest

Guest chưa đăng nhập có thể:

- Xem trang giới thiệu công khai.
- Xem thông báo/announcement đang hoạt động.
- Xem catalog dịch vụ, package và combo công khai.
- Xem loyalty offers công khai.
- Đăng ký, đăng nhập, quên mật khẩu.
- Bắt đầu Google OAuth nếu cấu hình được bật.

## 2.2 Customer

Customer là người sở hữu phương tiện và tạo booking. Chức năng chính:

- Đăng ký tài khoản, xác thực OTP, đăng nhập và đăng xuất.
- Quản lý hồ sơ, avatar, password và preferences.
- Thêm, sửa, xóa mềm và chọn primary vehicle.
- Xem services, packages, combos và các ưu đãi.
- Mua combo và theo dõi số lần sử dụng còn lại.
- Xem khung giờ khả dụng, hold slot và tạo booking.
- Chọn package hoặc combo, vehicle, date, time và add-on options.
- Áp dụng voucher thuộc sở hữu của mình.
- Chọn payment method và hoàn tất payment.
- Xem danh sách booking, booking detail và status timeline.
- Hủy booking khi trạng thái cho phép.
- Theo dõi wash session đang hoạt động.
- Xem completion summary, lịch sử rửa xe và lịch sử điểm.
- Redeem điểm để nhận voucher.
- Xem tier hiện tại, điểm còn lại để lên tier và tier history.
- Gửi review 1-5 sao cho booking hoàn thành.
- Thêm comment, before image và after image vào review.
- Xem guides/blog, like và comment bài viết.
- Xem notification và đánh dấu đã đọc.

## 2.3 Staff

Staff trực tiếp thực hiện phiên rửa xe. Chức năng chính:

- Xem dashboard và các session được giao.
- Xem queue và danh sách booking/session hôm nay.
- Chỉ thao tác trên session được assign cho mình.
- Check-in xe.
- Chuyển session vào queue.
- Start car wash.
- Cập nhật tiến trình vận hành thông qua status của session.
- Complete car wash.
- Cancel session khi được phép và có lý do phù hợp.
- Xem active sessions và lịch sử session cá nhân.
- Xem profile cá nhân.
- Nhận cập nhật booking/session qua luồng realtime hiện có hoặc refresh/polling.

## 2.4 Manager

Manager điều phối hoạt động hằng ngày. Chức năng chính:

- Xem manager dashboard và command center.
- Xem operational summary, metrics và board.
- Xem check-in candidates.
- Xem interventions cần xử lý.
- Xem staff workload và staff availability.
- Phân công một hoặc nhiều staff cho booking/session.
- Theo dõi queue, active session, delayed session và completed session.
- Check-in booking từ khu vực vận hành.
- Xem session detail và transfer options.
- Repository hiện có chức năng chuyển session giữa staff; khi vẽ main flow chỉ nên thể hiện như một nhánh can thiệp phụ, không phải luồng chính.
- Quản lý staff cơ bản, trạng thái, hiệu suất, active bookings và reviews liên quan.
- Xem reports: overview, funnel, trend và service quality.
- Xuất hoặc gửi báo cáo.
- Quản lý operation settings và xem audit logs.

## 2.5 Admin

Admin quản trị toàn hệ thống. Chức năng chính:

- Xem dashboard KPI và full dashboard.
- Quản lý accounts, customer, staff, role và status.
- Xem customer detail: vehicles, bookings, wash history, points và tier history.
- Điều chỉnh point balance với lý do bắt buộc.
- Thiết lập tier thủ công khi cần.
- Quản lý bookings và xem booking detail đầy đủ.
- Xem vehicle detail và vehicle booking history.
- Confirm booking, cập nhật booking status và assign staff.
- CRUD services, packages, combos, discounts và promotions.
- Quản lý tier configuration và tier voucher offers.
- Quản lý reviews, review statistics và featured reviews.
- Quản lý blog categories, articles và comments.
- Quản lý announcements và notification campaigns.
- Quản lý system settings.
- Xem business health, service quality, revenue, customer insight và staff KPI.

---

# 3. CURRENT SYSTEM ARCHITECTURE

## 3.1 Architectural style

- Kiến trúc backend: **Modular Monolith / Layered Spring Boot application**.
- Không phải microservices.
- Tất cả business modules chạy trong một Spring Boot backend.
- Frontend là một Next.js web application với route theo role.
- Database dùng một PostgreSQL database.

## 3.2 Frontend

- Next.js 14 App Router.
- React 18.
- TypeScript.
- Tailwind CSS.
- Radix UI / Shadcn-style components.
- TanStack Query cho server state.
- Zustand cho client state.
- Axios cho REST API.
- React Hook Form cho form.
- Recharts cho chart/dashboard.
- next-intl cho Vietnamese/English.
- lucide-react cho icons.
- STOMP + SockJS cho booking/session update ở một số màn hình.

## 3.3 Backend

- Java 21.
- Spring Boot 3.3.5.
- Spring Web MVC.
- Spring Security.
- Spring Data JPA.
- PostgreSQL driver.
- Flyway migrations.
- JWT access/refresh token.
- MapStruct.
- Lombok.
- Spring WebSocket/STOMP.
- SpringDoc OpenAPI và Swagger UI.

## 3.4 External integrations

- **VNPay**: online checkout, return, IPN, query và refund.
- **SePay**: bank transfer webhook.
- **Resend**: OTP và booking/reminder email.
- **S3-compatible storage**: avatar/image storage khi được bật.
- **Local upload**: fallback cho review images và avatar.
- **Google OAuth**: code path đã có nhưng cần xác minh cấu hình end-to-end.

## 3.5 Main runtime URLs

- Frontend local: `http://localhost:3000`.
- Backend local: `http://localhost:8080`.
- API base: `/api/v1`.
- Swagger UI: `http://localhost:8080/swagger-ui.html`.
- OpenAPI JSON: `/v3/api-docs`.
- WebSocket endpoint: `/ws`.
- Booking topic: `/topic/bookings`.

---

# 4. CORE BUSINESS ENTITIES

## 4.1 Identity and access

- `User`: account, role, status, tier and customer/staff identity.
- `UserPreference`: language, theme and notification preferences.
- `RefreshToken`: refresh token lifecycle and revocation.
- `OtpVerification`: OTP purpose, code, expiration and attempts.
- `UserOAuthAccount`: external OAuth account mapping.
- `GoogleAuthTicket`: temporary Google OAuth exchange ticket.

## 4.2 Vehicle

- `Vehicle`: owner, license plate, type, brand, model, year, color, primary flag and status.
- Vehicle types: `CAR`, `SUV`, `TRUCK`, `MOTORBIKE`, `VAN`.
- Vehicle status includes active/deleted lifecycle.

## 4.3 Catalog

- `Service`: add-on or component service.
- `Package`: wash package that contains service options.
- `PackageService`: join table between package and service.
- `Combo`: multi-use offer composed of service options.
- `ComboService`: join table between combo and service.

Important modeling rule:

- Customer books either a **Package** or a **Combo**.
- Service records are components/add-ons of packages or combos.
- Do not draw a flow where a raw Service is always booked independently unless the UI explicitly treats it as an option.

## 4.4 Booking and pricing

- `Booking`: customer, vehicle, scheduled time, item type, status and references.
- `BookingDetail`: selected package/combo options.
- `BookingPricing`: base amount, option amount, discount, points and final amount.
- `BookingStatusHistory`: audit trail of every booking status transition.
- `BookingStaffAssignment`: one or more staff assigned to a booking.
- `SlotHold`: temporary hold for a selected time slot.
- `ViolationRecord`: late cancellation/no-show record.

## 4.5 Payment

- `Payment`: payment method, payment status, transaction data and refund state.
- Payment methods:
  - `CASH_AT_COUNTER`
  - `BANK_TRANSFER`
  - `E_WALLET`
- Payment statuses:
  - `UNPAID`
  - `PENDING`
  - `PENDING_PAYMENT`
  - `PAID`
  - `FAILED`
  - `CANCELLED`
  - `REFUND_PENDING`
  - `PARTIALLY_REFUNDED`
  - `REFUND_FAILED`
  - `REFUNDED`

## 4.6 Operations

- `WashSession`: operational session attached to a booking.
- `WashSessionStaffAssignment`: one or more staff assigned to the session.
- `ManagerOperationSettings`: auto assignment, workload capacity, priority and alerts.
- `ManagerSettingAuditLog`: history of settings changes.
- `ManagerNotificationTemplate`: manager notification templates.

## 4.7 Loyalty and offers

- `LoyaltyAccount`: current points and total earned points.
- `PointTransaction`: immutable EARN, REDEEM, EXPIRE or ADJUST transaction.
- `TierConfig`: tier threshold and point multiplier.
- `TierHistory`: tier changes over time.
- `Discount`: voucher/discount template or promotional discount definition.
- `DiscountTier`: eligible tiers.
- `DiscountApplicableService`: eligible services.
- `UserDiscount`: personal voucher/discount instance owned by one customer.
- `TierVoucherOffer`: voucher offer configured for tier/points redemption.
- `CustomerCombo`: customer-owned combo, expiration and remaining usage.
- `CustomerComboUsage`: records each booking that consumes a combo usage.

## 4.8 Engagement and content

- `Review`: one review per booking, rating, comment, images and featured flag.
- `Notification`: per-user notification and read status.
- `NotificationCampaign`: admin-created campaign.
- `Announcement`: public announcement/ticker.
- `BlogCategory`, `BlogArticle`, `BlogLike`, `BlogComment`.

---

# 5. STATE MACHINES

## 5.1 Booking lifecycle

Main booking states:

```text
PENDING
  -> CONFIRMED
  -> CHECKED_IN
  -> IN_PROGRESS
  -> COMPLETED
```

Terminal/exception states:

```text
PENDING or CONFIRMED -> CANCELLED
PENDING or CONFIRMED -> NO_SHOW
```

Meaning:

- `PENDING`: booking created but confirmation/payment may still be incomplete.
- `CONFIRMED`: booking accepted and ready for operation.
- `CHECKED_IN`: vehicle arrived and was checked in.
- `IN_PROGRESS`: car wash started.
- `COMPLETED`: service finished.
- `CANCELLED`: booking cancelled by customer or operation.
- `NO_SHOW`: customer did not check in within the grace period.

## 5.2 Wash session lifecycle

```text
PENDING
  -> QUEUED
  -> CHECKED_IN
  -> IN_PROGRESS
  -> COMPLETED
```

`CANCELLED` can be reached from a non-terminal state when cancellation is allowed.

## 5.3 Customer combo lifecycle

```text
PENDING_PAYMENT -> ACTIVE -> USED_UP
                         -> EXPIRED
PENDING_PAYMENT/ACTIVE -> CANCELLED
```

## 5.4 Loyalty point transaction types

- `EARN`: points earned after completed wash or bonus event.
- `REDEEM`: points exchanged for a voucher/reward.
- `EXPIRE`: expired points when such processing applies.
- `ADJUST`: manual Admin adjustment with reason.

## 5.5 Loyalty tiers

Default thresholds:

| Tier | Lifetime earned points | Default point multiplier |
|---|---:|---:|
| BRONZE | 0 | 1.0x |
| SILVER | 500 | 1.2x |
| GOLD | 1,500 | 1.5x |
| PLATINUM | 4,000 | 2.0x |
| DIAMOND | 10,000 | 2.5x |

Thresholds and multipliers are configurable by Admin.

---

# 6. IMPORTANT BUSINESS RULES

## 6.1 Registration and authentication

- Customer phone and email must be unique when provided.
- Password must contain uppercase, lowercase, digit and special character.
- Registration creates a pending account.
- Account becomes active after OTP verification.
- OTP is 6 digits.
- OTP expiration is configurable; current application default is 5 minutes.
- OTP attempts and resend frequency are limited.
- Login accepts phone or email.
- Blocked accounts cannot log in.
- Access and refresh token lifetime are configurable.

## 6.2 Vehicle rules

- Required: plate, type, brand, model and year.
- Plate format: Vietnamese format such as `30H-123456`.
- Plate is normalized to uppercase and trimmed.
- Plate must be globally unique.
- First active vehicle becomes primary automatically.
- Setting a new primary unsets the previous primary.
- Deleting the primary vehicle promotes the next oldest active vehicle.
- Delete is soft delete.

## 6.3 Slot and booking rules

- Operating hours default: 08:00-20:00.
- Maximum advance booking window default: 30 days.
- Capacity default: 3 bookings per one-hour time slot.
- Slot availability counts existing bookings and active slot holds.
- Full slots are closed and cannot be selected.
- Hold duration: 15 minutes.
- Expired slot holds are cleaned every minute.
- Customer can hold at most 3 active bookings in the relevant active states.
- Same vehicle and same time slot duplicate booking is rejected.
- Booking requires an active vehicle owned by the customer.
- Booking selects either package or combo, not both.
- New booking starts as `PENDING`.

## 6.4 Pricing rules

```text
finalAmount
= basePrice
+ selectedOptionsTotal
- voucherDiscount
- pointsDiscount
```

- All monetary components must remain non-negative.
- Estimated duration = base duration + selected option durations.
- Combo already owned by the customer can make base amount zero.
- Option surcharge still applies when using an owned combo.
- One voucher per booking.
- Voucher must belong to the customer and be AVAILABLE.
- Voucher eligibility can depend on date, tier, minimum order and applicable service.
- Points discount cannot exceed final amount.

## 6.5 Payment rules

- `CASH_AT_COUNTER` starts as `UNPAID`.
- `BANK_TRANSFER` and `E_WALLET` start as `PENDING_PAYMENT`.
- Successful payment changes payment to `PAID` and booking from `PENDING` to `CONFIRMED`.
- Pending online booking/payment expires after 15 minutes.
- Expired pending booking is cancelled and capacity is released.
- Payment is blocked for cancelled and no-show bookings.
- VNPay handles checkout, return, IPN, query and refund.
- SePay handles bank-transfer webhook confirmation.

## 6.6 Cancellation and no-show rules

- Customer cancellation is only available for PENDING or CONFIRMED booking.
- More than 24 hours before appointment: voucher is returned and no violation is recorded.
- Within 24 hours: voucher may be forfeited and late-cancel violation recorded.
- Cancellation behavior does not directly deduct loyalty points.
- No-show grace period default: 15 minutes.
- No-show cancels the active wash session if one exists.
- Applied voucher is forfeited for no-show.
- A violation record and warning notification are created.

## 6.7 Wash operation rules

- One active wash session per booking.
- Session can be created for PENDING or CONFIRMED booking.
- Check-in records check-in time, fee amount and projected points.
- Check-in changes booking to CHECKED_IN.
- Start changes session and booking to IN_PROGRESS.
- Complete changes session and booking to COMPLETED.
- Completion records awarded points and triggers loyalty earning.
- Staff can only operate sessions assigned to them.

## 6.8 Staff assignment rules

- Only ACTIVE staff can be assigned.
- Auto-assignment can choose the least-loaded staff.
- Manager settings can enforce staff capacity.
- Default maximum active sessions per staff: 4.
- Workload alerts can mark staff overloaded.
- Admin KPI separately flags staff with at least 2 active sessions as overloaded in that KPI view.
- Multiple staff assignments are supported by booking/session assignment tables.
- Manager can review availability, workload, active bookings and staff performance.

## 6.9 Loyalty rules

Points are earned only after completed wash session.

```text
earnedPoints
= floor(finalAmount / earnPointsUnitAmount)
* tierMultiplier
* highestApplicablePromotionMultiplier
```

- Default earn unit: 10,000 VND.
- Only one EARN transaction per booking.
- Current point balance cannot be negative.
- First completed booking can earn +30 bonus points.
- Submitting a valid review earns +10 bonus points.
- Tier is evaluated after earning points.
- Tier calculation uses lifetime earned points.
- Tier upgrade is recorded in tier history and sends a notification.
- Customer redeems points to receive a personal voucher.
- Insufficient points block redemption.
- Admin can adjust points with a mandatory reason.

## 6.10 Combo rules

- Combo consists of service options.
- Customer can purchase a combo.
- Active combo has total usage, remaining usage and expiration.
- Default combo duration: 30 days unless configured otherwise.
- Remaining usage cannot be negative or exceed total usage.
- Each booking consumes combo usage once.
- When remaining usage reaches zero, status becomes USED_UP.
- Expired combo becomes EXPIRED.
- Booking with an already-paid active combo hides unnecessary payment selection for the combo base price.

## 6.11 Promotion and voucher rules

- Promotion can target all tiers or selected tiers.
- Active promotions are linked to booking at creation.
- Highest linked promotion multiplier is used for point earning.
- Voucher discount types include percentage, fixed amount and free service behavior.
- Voucher can require minimum order, tier, service and new-customer eligibility.
- Customer receives an individual user voucher after redemption/claim.
- A customer cannot use another customer's voucher.
- User voucher can expire.
- Booking cancellation may release or forfeit the voucher depending on policy.

## 6.12 Review rules

- Booking must be COMPLETED.
- Only booking owner can review.
- One review per booking.
- Rating is an integer from 1 to 5.
- Comment is optional.
- Before and after images are optional.
- Review cannot be edited or deleted by the customer after submission.
- Review is linked to booking; assigned staff can be identified through booking/session staff assignments.
- Admin can view review list, aggregate rating and star distribution.
- Admin can mark selected reviews as featured.

---

# 7. COMPLETE FLOWS FOR DRAWING

The visible words below are deliberately short and presentation-friendly. Use them as labels above arrows or below icons. Do not put API paths on visual slides.

## Scenario 1 - Overall End-to-End Service Journey

### Goal

Show the entire platform in one business journey.

### Main path

1. **Create Account**
2. **Add a Vehicle**
3. **Explore Packages, Combos & Offers**
4. **Choose Date & Time**
5. **Hold the Selected Slot**
6. **Create Booking**
7. **Apply Voucher / Choose Payment**
8. **Confirm Booking**
9. **Assign Staff**
10. **Check-in the Vehicle**
11. **Start the Car Wash**
12. **Track Wash Progress**
13. **Complete the Service**
14. **Earn Points & Update Tier**
15. **Leave a Review**
16. **View History & Return**

### Main arrows

```text
Customer -> Account -> Vehicle -> Catalog -> Schedule -> Slot Hold
-> Booking -> Payment -> Confirmed Booking -> Staff Assignment
-> Check-in -> Wash Progress -> Completion -> Loyalty -> Review -> History
```

### Important decision branches

- Slot full -> Choose another time.
- Payment failed/expired -> Retry, change method or cancel booking.
- No staff available -> Select another available employee or wait.
- Customer does not arrive -> Mark no-show after grace period.
- Customer does not review -> End after completion/loyalty.

### Suggested visual assets

Customer avatar, account screen, vehicle card, package catalog, calendar, clock/hold icon, booking form, payment phone, staff avatars, check-in icon, car wash icon, progress screen, loyalty star/gift, review stars and history screen.

---

## Scenario 2 - Registration, Authentication & Profile Flow

### Main path

1. Open Registration.
2. Enter full name, contact and password.
3. Validate information.
4. Create pending account.
5. Send OTP.
6. Enter 6-digit OTP.
7. Verify OTP.
8. Activate account.
9. Sign in with phone/email and password.
10. Redirect to the correct workspace by role.
11. Complete profile and preferences.

### Decisions

- Duplicate email/phone -> Correct account information.
- Invalid password -> Show specific requirements.
- OTP incorrect -> Retry while attempts remain.
- OTP expired -> Request a new OTP.
- Blocked account -> Reject login.
- Forgot password -> Send OTP, verify and reset password.
- Google OAuth available -> Start Google login, callback, ticket exchange, account link/create.

### Outputs

- Active customer account.
- JWT session.
- Default loyalty account with BRONZE tier and 0 points.
- Default preferences.

---

## Scenario 3 - Vehicle Management Flow

### Main path

1. Open All Vehicles.
2. Choose Add Vehicle.
3. Enter plate, type, brand, model, year and optional color.
4. Validate vehicle information.
5. Check global plate uniqueness.
6. Save vehicle.
7. Set as primary if it is the first vehicle.
8. Display vehicle list.
9. Edit vehicle when needed.
10. Set another vehicle as primary.
11. Soft-delete vehicle.

### Decisions

- Invalid plate format -> Show exact plate error.
- Duplicate plate -> Show duplicate license plate error.
- Delete non-primary -> Remove from active list.
- Delete primary -> Promote the next oldest active vehicle.

### Outputs

- Active vehicle list.
- Exactly one primary vehicle when active vehicles exist.
- Vehicle becomes selectable during booking.

---

## Scenario 4 - Service Discovery & Offer Selection Flow

### Main path

1. Open Services/Catalog.
2. Browse active packages.
3. Browse available combos.
4. View service/package/combo detail.
5. Review included service options, price, images and duration.
6. View active promotions and discounts.
7. Check tier eligibility.
8. Choose Package or Combo.
9. Continue to booking or combo checkout.

### Decisions

- Package inactive -> Hide or block selection.
- Combo inactive/expired -> Hide or block selection.
- Customer owns active combo -> Use existing combo benefit.
- Customer does not own required combo -> Purchase combo first.
- Offer not eligible for tier -> Show another available offer.

### Important modeling note

Package and Combo are composed of Service options. The visible selection should be Package or Combo, while Service acts as included/add-on content.

---

## Scenario 5 - Slot Availability & Slot Hold Flow

### Main path

1. Select vehicle.
2. Select booking date.
3. Request available time slots.
4. Check operating hours.
5. Check maximum advance booking date.
6. Count existing bookings in the one-hour slot.
7. Count active holds in the same slot.
8. Calculate remaining capacity.
9. Display available/full state.
10. Customer selects an available slot.
11. Hold slot for 15 minutes.
12. Continue to booking confirmation.

### Decision formula

```text
remainingCapacity
= maxBookingsPerTimeSlot
- existingBookings
- activeSlotHolds
```

### Decisions

- Outside 08:00-20:00 -> Slot unavailable.
- Beyond 30-day advance window -> Date unavailable.
- Capacity reaches 0 -> Close slot.
- Hold expires -> Release capacity and ask customer to select again.
- Customer changes time -> Release old hold and create a new hold.

### Default visible rule

Maximum 3 cars per one-hour slot, configurable by Admin.

---

## Scenario 6 - Booking Creation, Pricing & Payment Flow

### Main path

1. Start from selected Package or Combo.
2. Select owned vehicle.
3. Confirm date and held time slot.
4. Select valid add-on service options.
5. Select staff preference/available staff option when offered.
6. Apply an owned voucher.
7. Validate voucher eligibility.
8. Calculate base price and option total.
9. Calculate voucher discount.
10. Optionally apply eligible points after confirmation according to the current rule.
11. Calculate final amount and estimated duration.
12. Create PENDING booking.
13. Choose payment method.
14. Pay online or choose cash at counter.
15. Verify payment.
16. Confirm booking.
17. Open booking detail.

### Payment branches

```text
CASH_AT_COUNTER -> Payment UNPAID -> Booking follows counter-payment operation
BANK_TRANSFER   -> Payment PENDING_PAYMENT -> Verify transfer -> PAID
E_WALLET/VNPay  -> Checkout -> Return/IPN -> Verify -> PAID
```

### Decisions

- Vehicle not owned/active -> Reject booking.
- Both package and combo selected -> Reject booking.
- Neither package nor combo selected -> Reject booking.
- Duplicate vehicle + slot -> Reject booking.
- More than 3 active bookings -> Reject booking.
- Voucher invalid -> Remove voucher or select another voucher.
- Online payment succeeds -> Booking CONFIRMED.
- Online payment fails -> Retry or change payment method.
- Online payment remains pending for 15 minutes -> Cancel expired booking and release slot.
- Existing active combo covers base item -> Base price becomes zero; options may still cost money.

---

## Scenario 7 - Booking Cancellation, Payment Expiry & No-show Flow

### Cancellation path

1. Customer opens active booking.
2. Choose Cancel Booking.
3. Check booking status.
4. Check time remaining before appointment.
5. Apply voucher return/forfeit policy.
6. Record violation if cancellation is late.
7. Change booking to CANCELLED.
8. Cancel/release related resources.
9. Show cancellation result.

### No-show path

1. Scheduled time passes.
2. Wait no-show grace period.
3. Check whether vehicle was checked in.
4. Mark booking NO_SHOW.
5. Cancel non-checked-in wash session.
6. Forfeit applied voucher.
7. Record NO_SHOW violation.
8. Send customer warning notification.

### Payment expiry path

1. Booking remains PENDING_PAYMENT.
2. Fifteen-minute window expires.
3. Cleanup job detects expired payment.
4. Cancel booking/payment.
5. Release slot capacity.

---

## Scenario 8 - Manager Staff Assignment & Operational Command Flow

### Main path

1. Open Manager Command Center.
2. Load booking/session summary.
3. View check-in candidates.
4. View staff availability and workload.
5. Prioritize paid booking/tier/primary vehicle when settings enable these priorities.
6. Select active staff.
7. Respect maximum active-session capacity.
8. Assign one or multiple staff.
9. Display booking in operational board.
10. Monitor waiting and delay alerts.
11. Intervene when a session is delayed or staff is overloaded.

### Decisions

- Auto-assign enabled -> Pick least-loaded active staff.
- No eligible staff -> Wait, adjust assignment or select another active staff.
- Staff reaches capacity -> Do not add another active session when capacity enforcement is enabled.
- Session delayed -> Show intervention alert.
- Staff transfer required -> Open transfer options and reassign; treat as secondary intervention flow.

### Default manager operation settings

- Auto assign: enabled.
- Least busy staff first: enabled.
- Respect staff capacity: enabled.
- Max active sessions per staff: 4.
- Paid booking priority: enabled.
- Tier priority: enabled.
- Primary vehicle priority: enabled.
- Early check-in: 15 minutes.
- Late grace: 20 minutes.
- Waiting alert: 12 minutes.
- Delay alert: 25 minutes.

---

## Scenario 9 - Staff Check-in & Car Wash Execution Flow

### Main path

1. Staff opens My Sessions/Operations.
2. View assigned eligible booking/session.
3. Open session detail.
4. Queue the session when required.
5. Check in the vehicle.
6. Record fee amount and projected points.
7. Booking becomes CHECKED_IN.
8. Start the car wash.
9. Booking/session become IN_PROGRESS.
10. Perform the service stages.
11. Update the latest session state.
12. Complete the car wash.
13. Booking/session become COMPLETED.
14. Record awarded points.
15. Notify customer and refresh management views.

### Decisions

- Session not assigned to staff -> Block access/action.
- Invalid status transition -> Block action and keep current status.
- Customer has not arrived -> Keep queued or wait; later no-show processing may apply.
- Operational cancellation -> Require reason/fault information according to operation policy.

### Progress bar labels for visual slide

```text
Pending -> Queued -> Checked In -> In Progress -> Completed
```

---

## Scenario 10 - Customer Live Tracking & Completion Flow

### Main path

1. Customer opens active booking or Wash Tracking.
2. Load active wash session.
3. Display current status.
4. Display assigned staff.
5. Display check-in/start timestamps.
6. Display fee and projected points.
7. Receive booking/session update.
8. Refresh the progress timeline.
9. When completed, show completion summary.
10. Show final amount and awarded points.
11. Continue to booking detail, history or review.

### Update behavior

- Repository contains STOMP/SockJS booking update flow on `/topic/bookings`.
- Selected Admin, Manager and Staff screens subscribe to this topic.
- Customer tracking can also refresh through data fetching/polling.
- For presentation, call this **Live Service Progress**, not an IoT or AI tracking system.

---

## Scenario 11 - Loyalty, Tier & Point Redemption Flow

### Earn path

1. Wash session reaches COMPLETED.
2. Load final booking amount.
3. Load customer tier multiplier.
4. Load linked active promotions.
5. Choose highest promotion multiplier.
6. Calculate earned points.
7. Create one EARN transaction.
8. Update current and lifetime points.
9. Recalculate tier from lifetime points.
10. Upgrade tier if threshold is reached.
11. Save tier history.
12. Send tier-up notification.

### Redeem path

1. Customer opens Loyalty/Redeem.
2. Browse tier voucher offers.
3. Choose a reward.
4. Check tier requirement.
5. Check required points.
6. Deduct points with REDEEM transaction.
7. Issue personal User Discount/Voucher.
8. Display voucher as AVAILABLE.
9. Use voucher in a future booking.

### Bonus paths

- First completed booking -> +30 bonus points.
- Valid booking review -> +10 bonus points.
- Admin adjustment -> ADJUST transaction with mandatory reason.

---

## Scenario 12 - Combo Purchase & Usage Flow

### Purchase path

1. Browse available combos.
2. Open combo detail/checkout.
3. Review images, services, total usage, price and duration.
4. Choose Purchase.
5. Create pending purchase or direct demo purchase according to selected endpoint.
6. Complete payment when payment flow is used.
7. Activate customer combo.
8. Set expiration date and remaining usage.

### Usage path

1. Customer starts a booking.
2. Select Combo mode.
3. Find active, non-expired owned combo.
4. Select allowed service options.
5. Set base amount to zero.
6. Charge selected option surcharge if applicable.
7. Confirm booking.
8. On use, create CustomerComboUsage record.
9. Decrease remaining usage.
10. If remaining usage reaches zero, mark USED_UP.
11. If expiration passes, mark EXPIRED.

---

## Scenario 13 - Promotion, Discount & Voucher Flow

### Admin offer setup

1. Admin opens Promotions/Discounts/Tier Voucher Offers.
2. Create offer name/code and active period.
3. Select ALL_TIERS or SPECIFIC_TIERS.
4. Configure multiplier or discount value.
5. Configure minimum order and usage limit.
6. Configure applicable services when needed.
7. Activate the offer.

### Customer acquisition

1. Customer views available offers.
2. Check tier and point requirement.
3. Claim discount or redeem points.
4. Receive a personal voucher instance.
5. Voucher remains AVAILABLE until used or expired.

### Booking application

1. Customer enters/selects voucher.
2. Validate ownership and AVAILABLE status.
3. Validate dates, tier and minimum order.
4. Validate service applicability.
5. Calculate discount.
6. Apply to booking.
7. Mark voucher USED.
8. On eligible cancellation, release voucher; otherwise forfeit it.

---

## Scenario 14 - Review, Rating & Service History Flow

### Review path

1. Booking reaches COMPLETED.
2. Customer opens booking detail.
3. Check whether review already exists.
4. Enter integer rating from 1 to 5.
5. Enter optional comment.
6. Upload optional before image.
7. Upload optional after image.
8. Submit review.
9. Validate ownership and completed state.
10. Save review.
11. Award +10 review bonus points.
12. Show saved review as read-only.

### History path

Customer can review:

- Active bookings and progress timeline.
- Completed and cancelled bookings.
- Wash session history.
- Owned combos and remaining usage.
- Point transactions.
- Tier history.
- Review status and previous review content.

### Admin/Manager quality path

- View all reviews.
- View average rating and star distribution.
- Link review to booking/customer.
- Identify assigned staff through booking/session assignments.
- View per-staff rating summary and review list in manager staff views.
- Feature selected reviews for public display.

---

## Scenario 15 - Blog, Announcement & Notification Flow

### Blog flow

1. Admin creates categories.
2. Admin creates article with title, content and optional image.
3. Publish active article.
4. Customer opens Guides.
5. Browse article list.
6. Open article detail.
7. Like/unlike article.
8. Add comment.
9. Display like and comment counts.
10. Admin can moderate/delete content.

### Announcement flow

1. Admin creates announcement.
2. Define active period/content.
3. Public area retrieves active announcement.
4. Display ticker/banner.

### Notification flow

1. System or Admin creates notification/campaign.
2. Store notification per user.
3. Customer notification center loads newest items.
4. Display unread count.
5. Customer opens item.
6. Mark item as read.

### Scheduled notification events

- Booking reminder around 24 hours before appointment.
- Tier upgrade notification.
- Voucher expiration warning.
- No-show warning.

---

## Scenario 16 - Admin Management & Reporting Flow

### Main management areas

1. Dashboard.
2. Bookings.
3. Accounts/Customers.
4. Staff.
5. Services/Add-ons.
6. Packages.
7. Combos.
8. Promotions/Discounts/Tier Offers.
9. Operations.
10. Reviews.
11. Blog and Content.
12. Reports.
13. Settings.

### Main path

1. Admin opens Dashboard.
2. Review current KPIs.
3. Select a management area.
4. Search and filter records.
5. Open record detail.
6. Create/update/status-change/deactivate when allowed.
7. Validate change.
8. Save change.
9. Refresh data and reports.

### Dashboard and report content

- Total bookings.
- Today's bookings.
- Completed bookings.
- Revenue from completed bookings.
- Active customers.
- Active promotions.
- No-show and cancellation insight.
- Booking trend.
- Booking status distribution.
- Peak hours.
- Live operations.
- Loyalty tier distribution.
- Voucher statistics.
- Top services/packages.
- Customer insights.
- Review summary.
- Staff completed-booking count.
- Staff revenue.
- Staff active sessions.
- Staff KPI progress and overload flag.
- Business health and service quality.

---

# 8. FRONTEND SCREEN INVENTORY

## Customer screens

- Home.
- Profile.
- Settings.
- Notifications.
- Services/Catalog.
- Guides list and guide detail.
- All Vehicles, Add Vehicle and Vehicle Detail/Edit.
- New Booking.
- Booking Confirm.
- Booking Success/Detail.
- Booking List/Manager Booking view.
- History.
- Wash Tracking.
- Combos and Combo Checkout.
- Discounts.
- Loyalty Overview, Redeem and Loyalty History.
- VNPay Return.

## Staff screens

- Dashboard.
- Operations.
- Check-in.
- My Sessions.
- Session Detail.
- Session History.
- Profile.

## Manager screens

- Dashboard.
- Operations Command Center.
- Staff.
- Reports.
- History.
- Promotions view.
- Settings.
- Profile.

## Admin screens

- Dashboard.
- Bookings and Booking Detail.
- Accounts and Account Detail.
- Customers and Customer Detail.
- Staff.
- Services.
- Add-ons.
- Packages.
- Combos.
- Promotions.
- Discounts.
- Tier Voucher Offers.
- Operations.
- Reviews.
- Blog.
- Reports.
- Settings.
- Profile.

---

# 9. BACKGROUND AUTOMATIONS

These are invisible system actions and should appear as small system/job icons or side annotations, not as primary actors.

## Slot Hold Cleanup Job

- Runs every minute.
- Deletes expired 15-minute slot holds.

## Pending Online Payment Cleanup Job

- Runs every minute.
- Finds pending online payments older than 15 minutes.
- Cancels expired booking/payment and releases capacity.

## No-show Detection Job

- Scans overdue PENDING/CONFIRMED bookings.
- Applies configured no-show grace period.
- Marks booking NO_SHOW and performs voucher/violation/notification handling.

## Booking Reminder Job

- Runs hourly by default.
- Finds bookings approaching the reminder window.
- Creates in-app reminder and sends email when configured.

---

# 10. IMPLEMENTATION STATUS AND LIMITATIONS

The drawing agent must distinguish implemented features from planned/incomplete behavior.

## Implemented and safe to show as current project features

- Four-role web portals.
- JWT authentication and OTP flows.
- Vehicle CRUD, duplicate plate validation and primary vehicle handling.
- Package/combo catalog and options.
- Slot availability, capacity and 15-minute hold.
- Booking create/list/detail/cancel/status history.
- VNPay checkout/query/refund endpoints and SePay webhook integration.
- Wash session lifecycle and staff assignment.
- Manager operations, staff workload and reports.
- Customer wash tracking endpoints.
- Loyalty account, points, tier history and redemption.
- Combo ownership and usage.
- Promotions/discounts/tier offers.
- Reviews with optional images.
- Blog/guides, likes and comments.
- Notifications, announcements and campaigns.
- Admin dashboard, reports and settings.
- Swagger/OpenAPI.

## Features that exist in code but require deployment/config verification

- Google OAuth end-to-end.
- Resend email delivery.
- S3-compatible storage.
- VNPay production credentials and return/IPN URLs.
- SePay webhook secret/account configuration.
- WebSocket behavior behind production reverse proxy.

## Known gaps or partially enforced rules from current business-rule audit

- Some notification events are not guaranteed to be written automatically for every booking status change.
- Notification type database enforcement is not fully constrained.
- Certain blocked-customer checks are not consistently enforced in every customer operation.
- Some cancellation timing rules are documented more strictly than they are currently enforced.
- Google OAuth is not fully verified end-to-end.
- Advanced priority queue badge behavior may not be complete.
- Some frontend and documentation files retain historical/prototype assumptions; current code and controllers take priority.

## Avoid presenting these as completed core features

- AI-powered service search.
- Computer vision or license-plate recognition.
- QR scanner hardware.
- IoT gate/barrier control.
- Camera validation.
- Native mobile application.
- GPS/maps/location-based discovery.
- Kafka, Redis or microservices.
- MongoDB.
- Automated physical car-wash machinery control.

---

# 11. VISUAL DRAWING INSTRUCTIONS FOR THE AI AGENT

## 11.1 Match the reference slide style

- Canvas: 16:9, white main panel on a very light gray background.
- Title format: `6. Flows | Scenario N: Flow Name`.
- `6. Flows` in bold black.
- Scenario title in strong orange or the selected accent color.
- Use real project screenshots where possible.
- Use clean illustrated icons when a screenshot is unavailable.
- Place 7-12 nodes on each slide.
- Use a snake/zigzag route to fit the flow.
- Put a short numbered action above each arrow.
- Keep node labels short and business-oriented.
- Arrow must touch the source and destination visual.
- Use black solid arrows for the main flow.
- Use red arrows for failure/cancellation branches.
- Use green arrows for success/reward branches.
- Use dashed arrows only for asynchronous updates, background jobs or notifications.
- Do not show code, class names or API paths on presentation slides.

## 11.2 Recommended icon vocabulary

- Guest/Customer: person or driver avatar.
- Account: profile card.
- OTP: phone with six-digit code.
- Vehicle: car icon or vehicle card screenshot.
- Catalog: service/package tiles.
- Slot: calendar and clock.
- Hold: timer/countdown.
- Booking: form or booking confirmation screen.
- Payment: mobile payment/card/bank icon.
- Manager: operations dashboard.
- Staff: employee avatar/team icon.
- Queue: multiple cars/waiting lane.
- Check-in: check mark with vehicle.
- Wash: water drop/car wash icon.
- Progress: horizontal timeline.
- Completion: green check.
- Loyalty: star, medal or tier badge.
- Voucher: ticket/coupon.
- Review: 1-5 stars and comment bubble.
- History: clock/list.
- Report: chart/dashboard.
- Notification: bell/email.
- Background job: small gear/clock.

## 11.3 Recommended slide set

Create the following presentation flow section:

1. Overall End-to-End Service Journey.
2. Registration, OTP & Profile.
3. Vehicle Management.
4. Service, Package, Combo & Offer Discovery.
5. Slot Availability & Slot Hold.
6. Booking, Pricing & Payment.
7. Cancellation, Expiry & No-show.
8. Manager Staff Assignment & Command Center.
9. Staff Check-in & Car Wash Execution.
10. Customer Live Tracking & Completion.
11. Loyalty, Tier & Point Redemption.
12. Combo Purchase & Usage.
13. Promotion, Discount & Voucher.
14. Review, Rating & History.
15. Blog, Announcement & Notification.
16. Admin Management & Reporting.

## 11.4 Density rule

- Main overview slide: maximum 12-16 high-level nodes.
- Supporting flow slide: 7-10 nodes.
- Maximum 2 important decision branches per slide.
- Move detailed exception logic to a separate slide.
- Use 1-2 short lines per arrow label.
- Never use paragraphs inside the diagram.

---

# 12. READY-TO-USE MASTER PROMPT FOR ANOTHER AI AGENT

```text
Create a professional 16:9 PowerPoint flow section for the project “AutoWash Pro / AURA CAR CARE”.

Visual style:
- Match the supplied reference slide.
- White presentation panel on a light gray background.
- Title format: “6. Flows | Scenario N: [Flow Name]”.
- “6. Flows” must be bold black; scenario name must be bold orange.
- Use a connected snake/zigzag flow with illustrated icons and real AutoWash screenshots.
- Every numbered action must sit above its arrow.
- Every arrow must touch the source and destination visual.
- Main path uses solid dark arrows.
- Success/reward branches use green arrows.
- Failure/cancellation branches use red arrows.
- Asynchronous notifications/background jobs use dashed arrows.
- Use short business language, not code/API language.
- Do not use generic circles/cards as the main visual if a screenshot or meaningful icon can be used.

Project constraints:
- Web system only; no native mobile app.
- Roles: Customer, Staff, Manager, Admin.
- Architecture is Next.js + Spring Boot modular monolith + PostgreSQL.
- Do not add AI search, maps, GPS discovery, OCR, cameras, QR scanners, IoT barriers, Kafka, Redis, MongoDB or microservices.
- Core journey: account -> vehicle -> package/combo -> slot -> hold -> booking -> voucher/payment -> staff assignment -> check-in -> queue -> wash -> completion -> loyalty -> review -> history.
- Booking capacity defaults to 3 cars per one-hour slot.
- Slot hold and pending online payment window are 15 minutes.
- Booking statuses: PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW.
- Wash session statuses: PENDING, QUEUED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED.
- Loyalty tiers: BRONZE, SILVER, GOLD, PLATINUM, DIAMOND.
- Payment options: cash at counter, bank transfer/SePay and e-wallet/VNPay.
- Staff assignment considers active status, availability, workload and capacity.
- Customer can track wash progress and review one completed booking once.
- Admin manages accounts, bookings, staff, services, packages, combos, promotions, discounts, reviews, blog, reports and settings.

Create these scenario slides:
1. Overall End-to-End Service Journey.
2. Registration, OTP & Profile.
3. Vehicle Management.
4. Service, Package, Combo & Offer Discovery.
5. Slot Availability & Slot Hold.
6. Booking, Pricing & Payment.
7. Cancellation, Expiry & No-show.
8. Manager Staff Assignment & Command Center.
9. Staff Check-in & Car Wash Execution.
10. Customer Live Tracking & Completion.
11. Loyalty, Tier & Point Redemption.
12. Combo Purchase & Usage.
13. Promotion, Discount & Voucher.
14. Review, Rating & History.
15. Blog, Announcement & Notification.
16. Admin Management & Reporting.

For each slide:
- Use 7-10 primary nodes.
- Add no more than 2 decision branches.
- Show the actor at the start.
- End with a meaningful business result.
- Use the detailed project specification supplied after this prompt as the source of truth.
```

---

# 13. SOURCE-OF-TRUTH FILES USED

- `README.md`
- `docs/master/PROJECT.md`
- `docs/master/BUSINESS_RULES.md`
- `autowash-frontend/package.json`
- `autowash-frontend/src/app/**/page.tsx`
- `autowash-frontend/src/features/**`
- `autowash-backend/pom.xml`
- `autowash-backend/src/main/resources/application.properties`
- `autowash-backend/src/main/resources/db/migration/*.sql`
- `autowash-backend/src/main/java/com/autowash/controller/**`
- `autowash-backend/src/main/java/com/autowash/service/**`
- `autowash-backend/src/main/java/com/autowash/entity/**`
- `autowash-backend/src/main/java/com/autowash/job/**`

When documents and current code disagree, prefer the current controllers, services, entities, migrations and route files.

