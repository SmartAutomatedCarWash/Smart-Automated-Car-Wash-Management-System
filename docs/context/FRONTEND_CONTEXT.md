# AutoWash Pro — Frontend Context & Scope Guide

> **Mục đích:** Tài liệu này là guide triển khai frontend cho AutoWash Pro. Khi có xung đột, dùng `docs/master/PROJECT.md` làm chuẩn cho UI route map và dùng `docs/context/BACKEND_CONTEXT.md` cùng `docs/specs/autowash_api_contracts.md` làm chuẩn cho API contract.

---

## 1. Tổng Quan Dự Án

**Tên sản phẩm:** AutoWash Pro / AURA CAR CARE  
**Loại:** Ứng dụng quản lý dịch vụ rửa xe (đặt lịch, vận hành, loyalty)  
**Backend:** Spring Boot + PostgreSQL (Modular Monolith)  
**Base API URL:** `https://api.autowash.local/api/v1`  
**Ngôn ngữ chính:** Tiếng Việt (VI), hỗ trợ thêm tiếng Anh (EN)  
**Đơn vị tiền tệ:** VND (không có số thập phân)

---

## 2. Ba Workspace (Giao Diện Riêng Biệt)

Frontend được chia thành **3 workspace độc lập**, mỗi cái phục vụ một nhóm người dùng khác nhau:

| Workspace | Người dùng | Role JWT | Prefix route |
|-----------|-----------|----------|--------------|
| **Customer Portal** | Khách hàng | `CUSTOMER` | `/customer/*` |
| **Staff Operations** | Nhân viên rửa xe | `STAFF` | `/staff/*` |
| **Admin Dashboard** | Quản trị viên | `ADMIN` | `/admin/*` |

> ⚠️ **Quy tắc bất biến:** Không bao giờ trộn lẫn UI/logic của 3 workspace này. Nếu một feature thuộc Customer Portal, không đặt nó vào Admin Dashboard và ngược lại.

---

## 3. Cấu Trúc Page Theo Workspace

### 3.1 Customer Portal (`/customer/*`)

```
/                          → Trang chủ công khai (GUEST)
/login                     → Đăng nhập
/register                  → Đăng ký tài khoản
/verify                    → Xác thực OTP
/forgot-password           → Quên mật khẩu

/customer/home             → Trang chủ khách hàng (sau đăng nhập)
/customer/profile          → Hồ sơ cá nhân
/customer/vehicles         → Danh sách xe
/customer/vehicles/add     → Thêm xe mới
/customer/vehicles/:id     → Chi tiết xe

/customer/bookings         → Lịch sử đặt lịch
/customer/bookings/new     → Đặt lịch mới (checkout flow)
/customer/bookings/:id     → Chi tiết booking

/customer/loyalty          → Trang loyalty & điểm thưởng
/customer/loyalty/redeem   → Đổi điểm lấy voucher
/customer/loyalty/history  → Lịch sử giao dịch điểm

/customer/promotions       → Khuyến mãi đang áp dụng
/customer/vouchers         → Voucher của tôi
/customer/combos           → Gói combo

/customer/notifications    → Trung tâm thông báo
/customer/settings         → Cài đặt (ngôn ngữ, theme, thông báo)
```

### 3.2 Staff Operations (`/staff/*`)

```
/staff/dashboard           → Dashboard nhân viên
/staff/operations          → Hàng đợi rửa xe (bảng Kanban chính)
/staff/sessions/:id        → Chi tiết phiên rửa
/staff/check-in            → Màn hình check-in biển số
```

### 3.3 Admin Dashboard (`/admin/*`)

```
/admin/login               → Đăng nhập admin
/admin/dashboard           → Tổng quan KPI
/admin/bookings            → Danh sách tất cả booking
/admin/bookings/:id        → Chi tiết booking (có assign staff)
/admin/customers           → Danh sách khách hàng
/admin/customers/:id       → Chi tiết khách hàng (có 6 tab)
/admin/staff               → Quản lý nhân viên
/admin/packages            → Quản lý gói dịch vụ
/admin/services             → Quản lý dịch vụ bổ sung
/admin/combos              → Quản lý gói combo
/admin/promotions          → Quản lý khuyến mãi
/admin/vouchers            → Quản lý voucher
/admin/operations          → Dashboard vận hành
/admin/reports             → Báo cáo & thống kê
/admin/settings            → Cài đặt hệ thống
```

---

## 4. Authentication & Token Management

### 4.1 Lưu token
- **Access Token:** HTTP-only cookie HOẶC in-memory (không dùng localStorage)
- **Refresh Token:** HTTP-only cookie
- **localStorage:** Chỉ cho data không nhạy cảm: `language`, `theme`, `reminderKeys`

### 4.2 Luồng token (bắt buộc implement)
```
Request → 401 (token expired)
         → Tự động gọi POST /auth/refresh
         → Lưu access token mới
         → Retry request gốc
         → Nếu refresh cũng fail → redirect /login
```

### 4.3 Redirect sau đăng nhập theo role
| Role | Redirect đến |
|------|-------------|
| `CUSTOMER` | `/customer/home` |
| `STAFF` | `/staff/dashboard` |
| `ADMIN` | `/admin/dashboard` |
| `GUEST` | `/` |

### 4.4 Các endpoint auth
| Action | Method | Endpoint |
|--------|--------|----------|
| Đăng ký | POST | `/auth/register` |
| Gửi OTP | POST | `/auth/otp/send` |
| Xác thực OTP | POST | `/auth/otp/verify` |
| Đăng nhập | POST | `/auth/login` |
| Refresh token | POST | `/auth/refresh` |
| Đăng xuất | POST | `/auth/logout` |
| Quên mật khẩu | POST | `/auth/forgot-password/request` |
| Đặt lại mật khẩu | POST | `/auth/forgot-password/reset` |

---

## 5. Base Response Structure (Luôn Nhớ)

**Tất cả response từ API đều wrap trong cấu trúc này:**

```json
// Success
{
  "success": true,
  "statusCode": 200,
  "message": "...",
  "data": { ... },
  "timestamp": "2026-05-23T10:30:00Z"
}

// List (có pagination)
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1, "limit": 20,
    "total": 150, "totalPages": 8, "hasMore": true
  }
}

// Error
{
  "success": false,
  "statusCode": 400,
  "message": "...",
  "errorCode": "VALIDATION_ERROR",
  "errors": [{ "field": "phone", "message": "...", "code": "..." }]
}
```

> Luôn đọc `response.data` (không phải `response` trực tiếp) để lấy payload. Luôn check `success === true` trước khi xử lý data.

---

## 6. Error Handling — Mapping UI

| HTTP Code | errorCode | Hành động UI |
|-----------|-----------|--------------|
| 400 | `VALIDATION_ERROR` | Hiển thị lỗi theo từng field |
| 401 | `TOKEN_EXPIRED` | Auto-refresh token, retry |
| 401 | `TOKEN_INVALID` | Redirect về login |
| 403 | `INSUFFICIENT_PERMISSION` | Show "Không có quyền truy cập" |
| 404 | `RESOURCE_NOT_FOUND` | Show empty state / 404 page |
| 409 | `DUPLICATE_PHONE` | "Số điện thoại đã được đăng ký" |
| 409 | `DUPLICATE_PLATE` | "Biển số xe đã tồn tại" |
| 422 | `MAX_ACTIVE_BOOKINGS_EXCEEDED` | "Bạn đã có 3 booking đang hoạt động" |
| 422 | `VOUCHER_EXPIRED` | "Voucher đã hết hạn" |
| 422 | `VOUCHER_ALREADY_USED` | "Voucher đã được sử dụng" |
| 422 | `INSUFFICIENT_POINTS` | "Không đủ điểm để đổi" |
| 422 | `RESOURCE_LOCKED` | "Không thể thực hiện, đang có booking liên quan" |
| 429 | `RATE_LIMIT_EXCEEDED` | "Vui lòng thử lại sau" |
| 500 | `INTERNAL_SERVER_ERROR` | Show toast lỗi chung |

---

## 7. Enums & Constants (Dùng Cho UI)

### Booking Status → Badge màu
```
PENDING      → Màu vàng   "Chờ thanh toán"
CONFIRMED    → Màu xanh   "Đã xác nhận"
CHECKED_IN   → Màu tím    "Đã check-in"
IN_PROGRESS  → Màu cam    "Đang rửa"
COMPLETED    → Màu lá     "Hoàn thành"
CANCELLED    → Màu đỏ     "Đã hủy"
NO_SHOW      → Màu xám    "Không đến"
```

### Loyalty Tier → Badge + màu chủ đề
```
MEMBER    → Màu xám    "Thành viên"
SILVER    → Màu bạc    "Bạc"
GOLD      → Màu vàng   "Vàng"
PLATINUM  → Màu tím    "Bạch kim"
```

### Payment Method → Label hiển thị
```
BANK_TRANSFER    → "Chuyển khoản ngân hàng"
E_WALLET         → "Ví điện tử"
CASH_AT_COUNTER  → "Tiền mặt tại quầy"
```

### Vehicle Type → Icon + label
```
CAR       → 🚗 "Xe ô tô"
SUV       → 🚙 "SUV"
TRUCK     → 🚛 "Xe tải"
MOTORBIKE → 🏍️ "Xe máy"
VAN       → 🚐 "Van"
```

### Point Transaction Type → Màu + label
```
EARN                    → Màu xanh lá  "+X điểm"
REDEEMED_AT_CHECKOUT    → Màu đỏ       "-X điểm (dùng khi đặt lịch)"
REDEEMED_FOR_VOUCHER    → Màu đỏ       "-X điểm (đổi voucher)"
EXPIRED                 → Màu xám      "-X điểm (hết hạn)"
ADMIN_ADJUSTMENT        → Màu tím      "±X điểm (điều chỉnh)"
```

---

## 8. Validation Rules (Phải Validate Phía Client)

| Field | Rule | Regex/Pattern |
|-------|------|---------------|
| `phone` | 10 chữ số, bắt đầu bằng 0 | `/^0[0-9]{9}$/` |
| `email` | Email hợp lệ (optional) | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| `password` | Min 8 ký tự, có hoa, thường, số, ký tự đặc biệt | Custom |
| `plate` | Định dạng biển số Việt Nam | `30H-123456`, `51B-456789` |
| `otp` | Đúng 6 chữ số | `/^[0-9]{6}$/` |
| `fullName` | 1–100 ký tự | — |
| `amount` | VND, số nguyên, không âm | — |
| `date` | ISO 8601: `YYYY-MM-DD` | — |
| `time` | `HH:mm` | `/^([01]\d|2[0-3]):[0-5]\d$/` |

---

## 9. Checkout Flow — Đặt Lịch Mới (7 Bước)

Đây là flow quan trọng nhất của Customer Portal. Phải implement đúng thứ tự:

```
Bước 1: Chọn xe (vehicleId)
        ↓  [GET /customers/vehicles]
Bước 2: Chọn gói dịch vụ (packageId) hoặc Combo (comboId)
        ↓  [GET /packages] [GET /combos/available]
Bước 3: Chọn dịch vụ bổ sung (addons[])
        ↓  [GET /services] — filter theo packageId
Bước 4: Chọn ngày và giờ (bookingDate, bookingTime)
        ↓  Validate: ngày phải trong tương lai
Bước 5: Nhập voucher code (voucherCode)
        ↓  [POST /bookings/validate-voucher] — validate realtime
Bước 6: Chọn phương thức thanh toán (paymentMethod)
        ↓  BANK_TRANSFER | E_WALLET | CASH_AT_COUNTER
Bước 7: Review & Xác nhận
        ↓  [POST /customers/bookings]
        ✓  Hiển thị màn hình xác nhận với bookingId
```

**Tính giá realtime:**
- Mỗi khi user thêm/bỏ service → cập nhật tổng tiền
- Khi voucher valid → hiển thị giảm giá và giá cuối
- Công thức: `finalAmount = basePrice + addonsTotal - voucherDiscount`

---

## 10. Staff Operations — Luồng Vận Hành

Quy trình cho nhân viên trên trang Operations, theo đúng thứ tự state:

```
[Admin tạo wash session từ booking]
POST /operations/wash-sessions

       ↓ status: PENDING

[Nhân viên check-in biển số]
POST /operations/wash-sessions/:id/check-in
  → Xác nhận biển số khớp → bật nút "Bắt đầu rửa"

       ↓ status: CHECKED_IN

[Nhân viên bắt đầu rửa]
POST /operations/wash-sessions/:id/start
  → Hiển thị đồng hồ đếm ngược

       ↓ status: IN_PROGRESS

[Nhân viên hoàn thành]
POST /operations/wash-sessions/:id/complete
  → Hiển thị điểm thưởng đã tích lũy cho khách

       ↓ status: COMPLETED
```

**Bảng Kanban (Operations Queue):**
- 4 cột: Pending | Checked-In | In Progress | Completed
- Tự động refresh mỗi 30 giây: `GET /operations/queue`
- Màu sắc ưu tiên: 🔴 Trễ | 🟡 Sắp đến | 🟢 Bình thường
- WebSocket event `operations:queue:updated` để cập nhật realtime

---

## 11. Admin Dashboard — Các Tab Khách Hàng

Khi xem chi tiết khách hàng, Admin thấy **6 tab**:

| Tab | Endpoint |
|-----|---------|
| Hồ sơ | `GET /admin/customers/:id` |
| Xe | `GET /admin/customers/:id/vehicles` |
| Booking | `GET /admin/customers/:id/bookings` |
| Lịch sử rửa | `GET /admin/customers/:id/wash-sessions` |
| Giao dịch điểm | `GET /admin/customers/:id/point-transactions` |
| Lịch sử tier | `GET /admin/customers/:id/tier-history` |

---

## 12. Loyalty System — Quy Tắc UI

### Tích điểm
- Điểm được cộng ngay khi booking `COMPLETED`
- Công thức hiển thị: `1 điểm mỗi 10,000 VND` (nhân với hệ số tier)
- Hệ số: Member 1x | Silver 1.2x | Gold 1.5x | Platinum 2x

### Đổi điểm
- Phạm vi: **50 – 200 điểm** mỗi lần
- Tỷ lệ: `1 điểm = 1,000 VND voucher`
- Giới hạn: Tối đa 3 voucher active cùng lúc
- UI: Slider từ 50–200, hiển thị giá trị VND tương ứng realtime

### Dùng điểm khi checkout
- Endpoint: `POST /bookings/:bookingId/apply-points`
- Hiển thị slider, cập nhật giá cuối realtime
- Validate: điểm dùng ≤ số dư và ≤ giá trị đơn hàng

### Điểm sắp hết hạn
- Hiển thị warning nếu có điểm hết hạn trong 30 ngày
- Data từ field `expiringPointsWarnings[]` trong `GET /loyalty/account`

---

## 13. WebSocket & Realtime

**URL:** `wss://api.autowash.local/ws`  
**Auth:** Header `Authorization: Bearer {accessToken}`

| Event | Ai nghe | Xử lý |
|-------|---------|-------|
| `operations:queue:updated` | Staff | Refresh bảng Kanban |
| `booking:status:changed` | Customer | Cập nhật status badge |
| `notification:received` | Customer | Hiện toast + badge |
| `loyalty:points:updated` | Customer | Cập nhật số dư điểm |

---

### 13.1 Live Wash Tracking — Customer

- Active tracker: `GET /customers/wash-tracking/active`
- Progress snapshot: `GET /customers/wash-tracking/:washSessionId`
- UI route chính: `/customer/home`
- Empty state: không có phiên rửa đang hoạt động thì ẩn tracker hoặc hiển thị trạng thái không có phiên hiện tại.
- Loading/error: skeleton nhỏ trong dashboard khách hàng, retry được nếu request lỗi.

---

## 14. Notification System — Frontend

### Reminder (chạy ngầm)
- Polling mỗi 30 giây: kiểm tra booking sắp đến
- Deduplicate bằng key trong localStorage: `reminderSent_{bookingId}_{reminderType}`
- Thời điểm gửi: 24 giờ trước | 1 giờ trước | 15 phút trước

### In-App Notification Center
- Endpoint: `GET /customers/notifications` — load danh sách
- Đánh dấu đọc: `PUT /customers/notifications/:notificationId/read`
- Badge số lượng chưa đọc trên icon chuông

---

## 15. Pagination & Filter — Chuẩn Chung

**Query params mặc định cho list endpoint:**
```
?page=1&limit=20&sort=createdAt&order=desc
```

**Filters thường gặp:**
```
&status=CONFIRMED          (booking status)
&dateFrom=2026-01-01       (ISO date)
&dateTo=2026-12-31
&searchQuery=biểnsốhoặctên
&tier=SILVER,GOLD          (comma-separated)
```

---

## 16. Pricing & Currency — Quy Tắc Hiển Thị

- Tất cả giá tiền là **số nguyên VND**
- Format hiển thị: `150.000 đ` hoặc `150,000 VND`
- Không hiển thị số thập phân
- Màu xanh lá cho giảm giá/tiết kiệm
- Màu đỏ cho tổng cần trả

---

## 17. Scope Boundaries — Những Gì KHÔNG Thuộc Frontend

Frontend chỉ **gọi API**, không tự tính toán:
- ❌ Tự tính điểm thưởng (backend tính)
- ❌ Tự tính hệ số tier (backend tính)
- ❌ Tự validate voucher eligibility phức tạp (gọi `POST /bookings/validate-voucher`)
- ❌ Tự xử lý payment gateway (backend mock/real)
- ❌ Tự batch job tier review (backend Spring Scheduler)

Frontend **chịu trách nhiệm:**
- ✅ Real-time validation cơ bản (phone format, password strength, plate format)
- ✅ Optimistic updates (mark read, set primary vehicle)
- ✅ Token refresh tự động
- ✅ Reminder polling mỗi 30 giây
- ✅ Cache profile data, không gọi lại khi không cần thiết
- ✅ Loading states, error toasts, empty states

---

## 18. Các Feature Chưa Implement (Không Code Vội)

Các feature này được đề cập trong tài liệu nhưng là **future scope**, chưa có API:
- Rating/Review dịch vụ sau khi hoàn thành
- Đăng nhập sinh trắc học (biometric login)
- Payment gateway thực (VNPay, MoMo, Stripe)
- SMS gateway thực (hiện tại mock)
- Export báo cáo CSV/PDF
- Offline queue cho critical operations

---

## 19. Tech Stack Frontend

Frontend production dùng Next.js 14 App Router. Không dùng Vite/TanStack Router làm runtime chính.

| Hạng mục | Gợi ý |
|----------|-------|
| Framework | Next.js 14 App Router |
| Styling | Tailwind CSS |
| State | Zustand hoặc React Query |
| HTTP Client | Axios (với interceptor tự động refresh token) |
| Forms | React Hook Form + Zod validation |
| WebSocket | native WebSocket API |
| Date | date-fns hoặc dayjs |
| Charts (Admin) | Recharts hoặc Chart.js |

### 19.1 Frontend Source Structure

Frontend runtime hiện dùng cấu trúc **feature-first + shared layer**:

- `src/app`: Next.js App Router routes/layouts only.
- `src/features`: code theo nghiệp vụ/role (`auth`, `customer`, `staff`, `admin`, `public`, `support`).
- `src/shared`: code dùng chung (`components`, `lib`, `store`, `types`, `legacy`).
- Import mới phải đi qua `@/features/...` hoặc `@/shared/...`; không tạo mới runtime code dưới `src/components`, `src/hooks`, `src/lib`, `src/store`, `src/types`.

---

## 20. Checklist Trước Khi Bắt Đầu Mỗi Task

Trước khi code bất kỳ page/component nào, AI phải xác định:

- [ ] **Workspace nào?** Customer / Staff / Admin
- [ ] **Role nào được truy cập?** (`CUSTOMER` | `STAFF` | `ADMIN`)
- [ ] **API endpoint nào cần gọi?** (tham chiếu Section 3–12)
- [ ] **State nào cần quản lý?** (local state, global state, server cache)
- [ ] **Error cases nào cần handle?** (tham chiếu Section 6)
- [ ] **Enum/constant nào hiển thị?** (tham chiếu Section 7)
- [ ] **Validation nào phía client?** (tham chiếu Section 8)
- [ ] **Feature này có trong scope hiện tại không?** (tham chiếu Section 18)

---

*Tài liệu này được tạo từ `autowash_api_contracts.md` và `autowash_backend_tasks.md`.*  
*Cập nhật lần cuối: May 2026*

---

## 21. i18n Error Handling Context

Frontend error messages are now handled through `next-intl` without locale prefixes in the URL. Locale is read from the `locale` cookie by `src/i18n/request.ts`; do not add `/vi` or `/en` route segments for the current dashboard app.

Architecture:

- `messages/vi.json` and `messages/en.json` own the `errors` namespace.
- `src/shared/lib/api-errors.ts` parses and normalizes errors only; it must not contain localized UI strings.
- `src/shared/hooks/use-error-message.ts` maps parsed backend errors to translated messages at the UI boundary.
- `src/shared/hooks/use-notify-error.ts` is the toast-only wrapper for translated errors.
- `notify.ts` receives a ready display string from callers and does not translate backend errors internally.
- `useLanguageStore.setLanguage()` currently also updates the `locale` cookie as a transition bridge. Remove this only after all UI text moves to `next-intl`.

Do not reintroduce `ERROR_MESSAGES`, `getDisplayErrorMessage()`, or `getApiErrorDisplayMessage()`.

Standard component pattern:

```tsx
const getErrorMessage = useErrorMessage();

const mutation = useMutation({
  mutationFn: submit,
  onError: (error) => toast.error(getErrorMessage(error)),
});
```

Toast-only pattern:

```tsx
const notifyError = useNotifyError();
const mutation = useMutation({ mutationFn: submit, onError: notifyError });
```

Important translated expectations:

| errorCode | Expected VI | Expected EN |
|-----------|-------------|-------------|
| `INCORRECT_PASSWORD` | `Mật khẩu không đúng.` | `The password is incorrect.` |
| `BOOKING_SLOT_FULL` | `Khung giờ này đã hết chỗ.` | `This booking slot is full.` |

Manual QA snapshot, rerun with backend `http://localhost:8080` and frontend `http://localhost:3000`:

| Item | Result | Notes |
|------|--------|-------|
| Language switch | Pass | VI/EN changes persist after refresh. URL stays unprefixed. |
| Login error | Pass | Backend returns `errorCode: INCORRECT_PASSWORD`; VI shows `Mật khẩu không đúng.` and EN shows `The password is incorrect.` |
| Booking flow | Pass partial | Form renders real backend data, local validation works, and a real booking was created. `BOOKING_SLOT_FULL` was not reproduced because test slots still had capacity. |
| Combo checkout | Pass | `/customer/combos/{comboId}/checkout` renders and combo purchase succeeds without UI crash. |
| Google OAuth callback | Pass partial | Invalid callback state/code shows an error page/message, no blank screen, no raw backend object. Successful real OAuth still needs staging credentials. |

Pending outside this i18n scope:

- Test `BOOKING_SLOT_FULL` with seeded full-slot data.
- Test successful Google OAuth on staging with real credentials.
- Run `npm audit fix` separately for `next`, `form-data`, and `postcss`; do not use `--force`, because it can jump to Next 16.
- Remove `useLanguageStore` after all UI text, not only error messages, moves to `next-intl`.