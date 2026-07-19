# AutoWash Backend Task Breakdown

**System:** AutoWash Pro / AURA CAR CARE  
**Target Stack:** Spring Boot + PostgreSQL  
**Architecture:** Modular Monolith  
**Analysis Date:** May 2026

---

## 1. Domain Overview

### 1.1 Core Business Domains

The AutoWash Pro system operates across 6 major business domains:

1. **Authentication & Authorization** - User registration, login, OTP verification, role-based access control
2. **Customer Management** - Profiles, vehicles, booking history, personal preferences
3. **Booking & Operations** - Booking creation/lifecycle, wash session management, staff assignment, scheduling
4. **Loyalty & Rewards** - Points earning/redemption, tier management, membership benefits
5. **Admin & Governance** - Packages, promotions, vouchers, reporting, accounts directory, settings
6. **Notifications & Support** - Notification center, reminder delivery, customer support chat, unread counters

### 1.2 Key Entities

- **Users** - Customer, Staff, Admin (role-based)
- **Accounts Directory** - Admin-facing merged view of Customer, Staff, and Admin users
- **Customers** - Profiles with vehicles, loyalty points, tier membership
- **Vehicles** - Vehicle details with owner tracking and service history
- **Bookings** - Core transaction entity connecting customer → vehicles → packages → wash service
- **Wash Sessions** - Operational record of staff executing a booking
- **Live Wash Tracking** - Derived progress view from wash session status, start time, and service duration
- **Loyalty Points** - Point ledger with earning and redemption transactions
- **Packages** - Service offerings with pricing and services
- **Combos** - Time-based subscription packages
- **Promotions/Vouchers** - Discount codes and promotional mechanics
- **Staff Members** - Service workers with operational status and capacity
- **Notifications** - Reminders, alerts, and audit records
- **Support Threads & Messages** - Customer-created support conversations shared by staff/admin inbox

### 1.3 Key Integrations (Future)

- SMS/OTP Gateway (Twilio, AWS SNS)
- Payment Gateway (VNPay, Stripe, MoMo)
- Email Service (SendGrid, AWS SES)
- Push Notification Service (Firebase Cloud Messaging)
- WebSocket broker for support chat and wash tracking events
- Report Generation (Jasper, ReportLab)

### 1.4 Current Prototype Alignment

`README-final.md` documents the current repository as a frontend-only prototype. The backend described here is the production target that should normalize prototype behavior into durable APIs.

Important prototype facts to preserve during backend design:

- Staff UI currently uses `/staff/dashboard`, `/staff/operations`, and `/staff/check-in`; backend operation APIs should still live under `/api/v1/operations/*`.
- Admin customer management is now labeled `Accounts` and merges customer, staff, and admin records into one directory.
- Customer support chat, notification bell behavior, and live wash tracking are local-store simulations today and need backend persistence/events before production.
- Customer booking mock state and shared portal store are still split, so backend Task 12.1 remains a production-critical consolidation task.

---

## 2. Backend Structure

### 2.1 Package Structure (Package by Layer)

```text
com.autowash
|-- controller                    # REST controllers
|-- service                       # Business/application services
|-- repository                    # Spring Data JPA repositories
|-- entity                        # JPA entities and domain enums
|-- dto                           # Request/response DTOs
`-- shared                        # Cross-cutting config, security, exception, shared dto
```

Backend source code is organized by technical layer, not by feature package. Do not add
new packages such as `com.autowash.booking.service`, `com.autowash.auth.entity`,
`com.autowash.vehicle.repository`, or other `feature.layer` packages.

Business domains remain important, but they are represented by class names, endpoint
prefixes, database ownership, and service responsibilities:

- Authentication & Authorization: `AuthController`, `AuthService`, `JwtService`, `OtpService`, `AuthUserRepository`
- Customer Profile: `UserProfileController`, `UserProfileService`, `CurrentUserService`
- Vehicle Management: `VehicleController`, `VehicleService`, `CustomerVehicleRepository`
- Booking & Combos: `BookingController`, `BookingService`, `BookingOtpService`, `CustomerComboService`
- Catalog, Promotions, Vouchers: `CatalogController`, `AdminPromotionController`, `CatalogService`, `PromotionService`, `AdminVoucherService`
- Operations & Staff Workflow: `OperationsController`, `OperationsService`, `StaffAssignmentService`, `WashSessionLifecycle`
- Loyalty & Points: `LoyaltyController`, `CustomerLoyaltyController`, `LoyaltyService`
- Admin Reporting/Management: `AdminReportingController`, `AdminReportingService`, `AdminDashboardMetricsService`

Layer conventions for new backend code:

- Put REST endpoints in `src/main/java/com/autowash/controller`.
- Put business logic in `src/main/java/com/autowash/service`.
- Put JPA repositories in `src/main/java/com/autowash/repository`.
- Put entities and enums in `src/main/java/com/autowash/entity`.
- Put request/response DTOs in `src/main/java/com/autowash/dto`.
- Keep `src/main/java/com/autowash/shared` for config, security, exception handling, and shared response wrappers.

### 2.2 Database Schema Outline

**Core Tables by Module:**

- `auth.*` - User credentials, tokens, OTP records
- `user.*` - User profiles, status, preferences, tier membership
- `vehicle.*` - Vehicle registry, ownership, service history
- `booking.*` - Booking records, booking items (packages), status tracking
- `operation.*` - Wash sessions, staff assignments, operational logs
- `loyalty.*` - Loyalty accounts, point ledger, tier history
- `promotion.*` - Package catalog, combos, promotions, vouchers, redemptions
- `notification.*` - Notification templates, sent notifications, unread/read state, audit logs
- `support.*` - Support threads, support messages, participant read cursors

---

## 3. Epic Breakdown

---

## EPIC 1: Authentication & Access Control

### Task 1.1 - User Registration (Email/Phone + Password)

- **Name:** Implement User Registration Endpoint
- **Description:** Create user registration flow with phone/email, password validation, and account initialization
- **Input:**
  - Full name (required, 1-100 chars)
  - Phone number (required, Vietnamese format validation)
  - Email (optional, if supported)
  - Password (required, strength requirements: min 8 chars, mix of upper/lower/numbers)
  - Password confirmation
- **Output:**
  - POST `/api/v1/auth/register` endpoint
  - `users` table with record (`id`, `phone`, `email`, `fullName`, `passwordHash`, `status=PENDING`, `role=CUSTOMER`, `createdAt`)
  - User object response with userId
  - Transactional: fails atomically if phone already exists (unique constraint)
- **Business Rules:**
  - BR-11: Phone number must be unique
  - BR-12: Password must meet strength requirements
  - BR-13: Account starts in `PENDING` status (awaiting OTP verification)
  - BR-14: New customer is marked with `isNewCustomer=true`
- **Priority:** High
- **Dependency:** None

### Task 1.2 - OTP Generation & Verification

- **Name:** Implement OTP Flow (Generate & Verify)
- **Description:** Generate OTP code, send via SMS (mock initially), and verify customer identity
- **Input:**
  - User ID or phone number
  - OTP code (6 digits, user-provided)
  - OTP validity window (e.g., 5 minutes)
- **Output:**
  - POST `/api/v1/auth/otp/send` - Generate & send OTP
  - POST `/api/v1/auth/otp/verify` - Verify OTP code
  - `otp_records` table (`id`, `userId`, `code`, `expiresAt`, `attempts`, `verified`, `createdAt`)
  - On successful verification: update `users.status = ACTIVE`, return JWT token
  - OTP response with remaining validity time
- **Business Rules:**
  - BR-15: OTP is 6-digit code
  - BR-16: OTP expires after 5 minutes
  - BR-17: Maximum 3 failed attempts per OTP
  - BR-18: After verification, user account becomes `ACTIVE`
- **Priority:** High
- **Dependency:** Task 1.1

### Task 1.3 - Login with Phone/Email & Password

- **Name:** Implement Login Endpoint
- **Description:** Authenticate user by phone/email and password, return JWT token
- **Input:**
  - Phone number or email
  - Password (plain text, will be hashed and compared)
- **Output:**
  - POST `/api/v1/auth/login` endpoint
  - JWT token (Access Token + optional Refresh Token)
  - User object with role, status, tier
  - Refresh token stored in `auth_tokens` table if applicable
- **Business Rules:**
  - BR-06: Login uses phone OR email as identifier
  - BR-07: Password must match securely (bcrypt hash comparison)
  - BR-08: Blocked customers cannot login (status check)
  - BR-19: Login attempt logging (optional audit)
- **Priority:** High
- **Dependency:** Task 1.1

### Task 1.4 - JWT Token Management & Refresh

- **Name:** Implement Token Lifecycle Management
- **Description:** Issue, validate, refresh JWT tokens with standard expiry and refresh logic
- **Input:**
  - Access token (for validation)
  - Refresh token (for token renewal)
  - Token expiry configuration (e.g., 1 hour access, 30 days refresh)
- **Output:**
  - JWT validation filter/middleware in Spring Security
  - POST `/api/v1/auth/refresh` endpoint
  - `auth_tokens` table to store refresh tokens (`id`, `userId`, `token`, `expiresAt`, `revokedAt`)
  - Token response with new access token and optional refresh token
- **Business Rules:**
  - BR-09: Access token expires after 1 hour
  - BR-10: Refresh token expires after 30 days
  - Token revocation on logout
- **Priority:** High
- **Dependency:** Task 1.1, 1.3

### Task 1.5 - Logout & Token Revocation

- **Name:** Implement Logout Endpoint
- **Description:** Revoke user's current tokens and clear session
- **Input:**
  - User ID (from JWT)
  - Current access token (optional, for confirmation)
- **Output:**
  - POST `/api/v1/auth/logout` endpoint
  - Mark token as revoked in `auth_tokens` table (`revokedAt` timestamp)
  - Clear any server-side session state
  - Response: `{ status: "success" }`
- **Business Rules:**
  - Token becomes invalid immediately after logout
  - Refresh token cannot be used after logout
- **Priority:** Medium
- **Dependency:** Task 1.1, 1.4

### Task 1.6 - Role-Based Access Control (RBAC) Setup

- **Name:** Configure Spring Security with Role-Based Authorization
- **Description:** Implement role-based endpoint access control (Customer, Staff, Admin)
- **Input:**
  - User roles: `CUSTOMER`, `STAFF`, `ADMIN`
  - Endpoint mapping to roles (documented in Task definitions)
- **Output:**
  - Spring Security configuration with `@PreAuthorize` and custom authorization checks
  - Custom `UserDetails` implementation
  - Role-based endpoint filtering
  - Authorization failure response (403 Forbidden)
- **Business Rules:**
  - BR-79: Staff pages accessible only to `Staff` role
  - BR-* (various): Endpoint restrictions per role
- **Priority:** High
- **Dependency:** Task 1.3, 1.4

### Task 1.7 - Password Reset Flow

- **Name:** Implement Forgot Password & Reset
- **Description:** Allow users to reset forgotten passwords via OTP verification
- **Input:**
  - Phone number (lookup user)
  - New password (strength validated)
  - OTP verification (reuse OTP flow)
- **Output:**
  - POST `/api/v1/auth/forgot-password/request` - Request password reset
  - POST `/api/v1/auth/forgot-password/reset` - Verify OTP and reset password
  - Update `users.passwordHash` in database
  - Invalidate all active tokens for that user
- **Business Rules:**
  - BR-20: Password reset requires OTP verification
  - BR-21: New password must meet strength requirements
  - BR-22: All existing sessions/tokens invalidated after reset
- **Priority:** Medium
- **Dependency:** Task 1.1, 1.2

---

## EPIC 2: User Profile & Localization Management

### Task 2.1 - Customer Profile Retrieval

- **Name:** Implement Get Profile Endpoint
- **Description:** Retrieve authenticated user's profile details
- **Input:**
  - User ID (from JWT)
  - Include optional nested data (vehicles count, loyalty info)
- **Output:**
  - GET `/api/v1/users/profile` endpoint
  - Customer profile DTO: `{ id, fullName, phone, email, status, tier, loyaltyBalance, isNewCustomer, ... }`
  - HTTP 200 with full profile object
- **Business Rules:**
  - BR-23: User can view only their own profile (implicit from auth)
  - BR-24: Profile includes current loyalty tier
  - BR-25: Include `isNewCustomer` flag
- **Priority:** High
- **Dependency:** Task 1.3

### Task 2.2 - Customer Profile Update

- **Name:** Implement Update Profile Endpoint
- **Description:** Allow customer to edit profile details (name, phone, preferences)
- **Input:**
  - Full name (optional)
  - Email (optional)
  - Phone (optional, must validate unique if changed)
  - Language preference (EN, VI)
  - Theme preference (LIGHT, DARK)
  - Notification preferences (boolean flags)
- **Output:**
  - PUT `/api/v1/users/profile` endpoint
  - Updated `users` table record
  - Response: updated profile DTO
- **Business Rules:**
  - BR-23: User can edit only own profile
  - BR-02: Language and theme persist per user
  - Phone uniqueness constraint applies to updates
- **Priority:** Medium
- **Dependency:** Task 2.1

### Task 2.3 - Localization & Theme Preferences

- **Name:** Store & Retrieve Language/Theme Settings
- **Description:** Persist user's language and theme preferences
- **Input:**
  - Language: `EN`, `VI`
  - Theme: `LIGHT`, `DARK`
  - User ID
- **Output:**
  - `user_preferences` table: `( id, userId, language, theme, createdAt, updatedAt )`
  - GET `/api/v1/users/preferences` - Retrieve user's preferences
  - PUT `/api/v1/users/preferences` - Update preferences
  - Preferences included in profile response
- **Business Rules:**
  - BR-02: Language/theme persists per user across sessions
  - BR-04: Default language/theme for unauthenticated visitors (frontend-only, but support in backend)
- **Priority:** Medium
- **Dependency:** Task 2.1

### Task 2.4 - User Status Management (for Admin)

- **Name:** Implement User Status Update (Admin Only)
- **Description:** Allow admin to change customer status (Active, Blocked, Suspended)
- **Input:**
  - Customer ID
  - New status: `ACTIVE`, `BLOCKED`, `SUSPENDED`
  - Reason (optional)
  - Admin user ID
- **Output:**
  - PUT `/api/v1/admin/customers/{customerId}/status` endpoint
  - Update `users.status` field
  - Create audit record in `audit_logs` table
  - Response: updated user record with status
- **Business Rules:**
  - BR-118: Customer status changes persist from admin detail view
  - BR-08: Blocked customers cannot login
  - BR-125: Status changes are audit-tracked
- **Priority:** Medium
- **Dependency:** Task 1.6 (Admin RBAC)

---

## EPIC 3: Vehicle Management

### Task 3.1 - Create Vehicle

- **Name:** Implement Add Vehicle Endpoint
- **Description:** Customer creates a new vehicle record
- **Input:**
  - License plate (required, unique)
  - Vehicle type (Car, SUV, Truck, Motorbike, etc.)
  - Brand (make)
  - Model
  - Year (manufacturing year)
  - Color (optional)
  - Customer ID (from JWT)
- **Output:**
  - POST `/api/v1/customers/vehicles` endpoint
  - `vehicles` table: `( id, customerId, plate, type, brand, model, year, color, status=ACTIVE, createdAt, ... )`
  - Response: created vehicle DTO
  - Unique constraint on (customerId, plate)
- **Business Rules:**
  - BR-26: License plate must be unique per customer
  - BR-27: Vehicle type affects pricing/service options
  - BR-30: Only customer who owns vehicle can modify it
- **Priority:** High
- **Dependency:** Task 2.1

### Task 3.2 - List Customer Vehicles

- **Name:** Implement Get Vehicles Endpoint
- **Description:** Retrieve all vehicles for authenticated customer
- **Input:**
  - Customer ID (from JWT)
  - Optional filters: status, type
  - Pagination: limit, offset
- **Output:**
  - GET `/api/v1/customers/vehicles` endpoint
  - List of vehicle DTOs with pagination
  - Include vehicle status, creation date, last service date
- **Business Rules:**
  - BR-30: Customer sees only own vehicles
  - BR-31: Vehicles list includes primary vehicle indicator
- **Priority:** High
- **Dependency:** Task 3.1

### Task 3.3 - Get Vehicle Details

- **Name:** Implement Get Single Vehicle Endpoint
- **Description:** Retrieve detailed information for a specific vehicle
- **Input:**
  - Vehicle ID
  - Customer ID (from JWT, for ownership verification)
- **Output:**
  - GET `/api/v1/customers/vehicles/{vehicleId}` endpoint
  - Vehicle DTO with full details
  - Include: last service date, total services count, active bookings count
- **Business Rules:**
  - BR-30: Only owner can view vehicle details
  - BR-32: Vehicle details include service history metadata
- **Priority:** Medium
- **Dependency:** Task 3.2

### Task 3.4 - Update Vehicle Details

- **Name:** Implement Update Vehicle Endpoint
- **Description:** Allow customer to edit vehicle information
- **Input:**
  - Vehicle ID
  - Editable fields: brand, model, color, year (only non-plate fields)
  - Customer ID (ownership verification)
- **Output:**
  - PUT `/api/v1/customers/vehicles/{vehicleId}` endpoint
  - Updated `vehicles` table record
  - Response: updated vehicle DTO
- **Business Rules:**
  - BR-30: Only owner can update
  - BR-26: Plate cannot be changed (immutable)
  - BR-33: Active booking references prevent certain edits
- **Priority:** Medium
- **Dependency:** Task 3.2

### Task 3.5 - Delete/Deactivate Vehicle

- **Name:** Implement Deactivate Vehicle Endpoint
- **Description:** Allow customer to mark vehicle as inactive/deleted
- **Input:**
  - Vehicle ID
  - Customer ID (ownership verification)
  - Reason (optional)
- **Output:**
  - DELETE `/api/v1/customers/vehicles/{vehicleId}` endpoint
  - Soft delete: set `status = INACTIVE` (or `deletedAt` timestamp)
  - Cannot delete if active bookings exist
  - Response: `{ status: "deactivated" }`
- **Business Rules:**
  - BR-30: Only owner can delete
  - BR-34: Cannot delete vehicle with pending/active bookings
  - BR-35: Vehicle can be reactivated if needed
- **Priority:** Low
- **Dependency:** Task 3.4

### Task 3.6 - Set Primary Vehicle

- **Name:** Implement Primary Vehicle Selection
- **Description:** Allow customer to designate a primary vehicle for default bookings
- **Input:**
  - Vehicle ID
  - Customer ID
- **Output:**
  - POST `/api/v1/customers/vehicles/{vehicleId}/set-primary` endpoint
  - Update `vehicles.isPrimary` field
  - Ensure only one primary per customer (atomic update)
  - Response: updated vehicle
- **Business Rules:**
  - BR-31: Exactly one vehicle marked as primary per customer
  - BR-32: Primary vehicle suggested in booking flow
- **Priority:** Low
- **Dependency:** Task 3.1

### Task 3.7 - Vehicle Ownership Transfer (Admin)

- **Name:** Implement Vehicle Ownership Transfer
- **Description:** Admin can reassign vehicle from one customer to another
- **Input:**
  - Vehicle ID
  - Old customer ID
  - New customer ID
  - Admin user ID
- **Output:**
  - POST `/api/v1/admin/vehicles/{vehicleId}/transfer-ownership` endpoint
  - Update `vehicles.customerId` and `vehicles.ownershipTransferredAt`
  - Create audit record: `plate_transfer_audit` or within `audit_logs`
  - Response: updated vehicle with new owner
- **Business Rules:**
  - BR-36: Only admin can transfer vehicle ownership
  - BR-125: Transfer creates audit log record
  - Destination customer must have unique plate (same validation)
- **Priority:** Low
- **Dependency:** Task 1.6 (Admin RBAC)

---

## EPIC 4: Booking Management (Core Customer Flow)

### Task 4.1 - Package Catalog Management (Backend)

- **Name:** Implement Package CRUD Endpoints
- **Description:** Define service packages that customers can book
- **Input:**
  - Package name (e.g., "Basic Wash", "Premium Clean")
  - Description
  - Base price (in VND)
  - Duration (estimated minutes)
  - Features/services included (JSON array or separate entity)
  - Status (ACTIVE, INACTIVE)
  - Category (Basic, Premium, Deluxe, etc.)
- **Output:**
  - POST `/api/v1/admin/packages` - Create package (Admin only)
  - GET `/api/v1/packages` - List packages (public/customer accessible)
  - GET `/api/v1/packages/{packageId}` - Get package details
  - PUT `/api/v1/admin/packages/{packageId}` - Update package (Admin)
  - DELETE `/api/v1/admin/packages/{packageId}` - Deactivate package (Admin)
  - `packages` table: `( id, name, description, basePrice, duration, features, status, createdAt, ... )`
- **Business Rules:**
  - BR-40: Packages define base pricing for bookings
  - BR-109: Package status can be ACTIVE or INACTIVE
  - BR-41: Package list is filtered to ACTIVE only for customer checkout
  - BR-108: Package removal blocked if active booking references it
- **Priority:** High
- **Dependency:** None

### Task 4.2 - Package services Management

- **Name:** Implement services for Packages
- **Description:** Define optional service services that can be selected during booking
- **Input:**
  - service name (e.g., "Interior Cleaning", "Wax Coating")
  - Description
  - Price (additional cost)
  - Category
  - Applicable to packages (which packages support this service)
- **Output:**
  - POST `/api/v1/admin/services` - Create service
  - GET `/api/v1/services` - List available services
  - PUT `/api/v1/admin/services/{addonId}` - Update service
  - `add_ons` table: `( id, name, description, price, createdAt, ... )`
  - `package_add_ons` junction table: `( id, packageId, addonId )`
- **Business Rules:**
  - BR-42: services are optional, customer selects during checkout
  - BR-43: service pricing is cumulative with base package price
- **Priority:** Medium
- **Dependency:** Task 4.1

### Task 4.3 - Create Booking (Checkout Flow)

- **Name:** Implement Create Booking Endpoint
- **Description:** Customer creates a new booking with package, services, vehicle, and payment method selection
- **Input:**
  - Customer ID (from JWT)
  - Vehicle ID (customer's vehicle)
  - Package ID
  - service IDs (optional array)
  - Preferred date/time
  - Vehicle plate (verification)
  - Voucher code (optional)
  - Payment method: `BANK_TRANSFER`, `E_WALLET`, `CASH_AT_COUNTER`
  - Promotion/combo ID (if applicable)
- **Output:**
  - POST `/api/v1/customers/bookings` endpoint
  - `bookings` table: `( id, customerId, vehicleId, packageId, bookingDate, bookingTime, status=PENDING, createdAt, ... )`
  - `booking_items` junction table: `( id, bookingId, addonId, price )`
  - Calculated total price: basePrice + addons - voucher
  - Response: booking DTO with bookingId, totalPrice, status
  - Payment simulation logic (see Task 4.4)
- **Business Rules:**
  - BR-44: Booking requires active customer account
  - BR-45: Customer must select a vehicle they own
  - BR-46: Booking date must be in future and within acceptance window
  - BR-47: Plate verification before booking (plate == vehicle.plate)
  - BR-48: Voucher/promotion applied if valid
  - BR-49: New customer vouchers apply automatically if eligible
  - BR-50: Max 3 active bookings per customer (PENDING + CONFIRMED + CHECKED_IN)
- **Priority:** High
- **Dependency:** Task 3.1, Task 4.1, Task 4.2

### Task 4.4 - Booking Payment Simulation & Finalization

- **Name:** Implement Payment Processing (Mock)
- **Description:** Simulate payment based on selected method; update booking status and create transaction record
- **Input:**
  - Booking ID
  - Payment method: `BANK_TRANSFER`, `E_WALLET`, `CASH_AT_COUNTER`
  - (For real integration: payment gateway token, transaction ID)
- **Output:**
  - POST `/api/v1/customers/bookings/{bookingId}/pay` endpoint
  - `transactions` table: `( id, bookingId, customerId, amount, method, status=SUCCESS/PENDING, createdAt, ... )`
  - Update `bookings.status` from `PENDING` to `CONFIRMED` (if payment succeeds)
  - Response: transaction confirmation with receipt details
  - Earn loyalty points (see Task 7.1)
  - Trigger confirmation notification (see Task 11.2)
- **Business Rules:**
  - BR-51: Zero-amount bookings (e.g., combo) treated as prepaid
  - BR-52: Bank transfer and e-wallet are mocked as successful
  - BR-53: Cash at counter stored as `PENDING_PAYMENT` (pay-later)
  - BR-54: Payment failure returns booking to PENDING, customer can retry
  - BR-55: Loyalty points earned immediately on CONFIRMED status
  - BR-56: Transaction records persist for audit and reporting
- **Priority:** High
- **Dependency:** Task 4.3

### Task 4.5 - List Bookings (Customer)

- **Name:** Implement Get Bookings Endpoint
- **Description:** Retrieve customer's booking history with filters and pagination
- **Input:**
  - Customer ID (from JWT)
  - Filters: status, date range, vehicle
  - Pagination: limit, offset
  - Sort: by date (desc default)
- **Output:**
  - GET `/api/v1/customers/bookings` endpoint
  - List of booking DTOs with nested package, services, vehicle, status
  - Pagination metadata: total, page, limit
  - Include: bookingId, date, package name, total price, status, washStatus (if completed)
- **Business Rules:**
  - BR-57: Customer sees only own bookings
  - BR-60: Booking list shows current status (PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW)
- **Priority:** Medium
- **Dependency:** Task 4.3

### Task 4.6 - Get Booking Details

- **Name:** Implement Get Single Booking Endpoint
- **Description:** Retrieve full details of a specific booking
- **Input:**
  - Booking ID
  - Customer ID (from JWT, ownership verification)
- **Output:**
  - GET `/api/v1/customers/bookings/{bookingId}` endpoint
  - Full booking DTO: customer, vehicle, package, services, price breakdown, payment info, status, wash session details (if linked)
  - HTTP 404 if not found or not owned by user
- **Business Rules:**
  - BR-57: Only booking owner (customer) can view details
  - BR-60: Shows all relevant status and timestamps
  - BR-61: Shows linked wash session info if exists
- **Priority:** Medium
- **Dependency:** Task 4.5

### Task 4.7 - Cancel Booking

- **Name:** Implement Booking Cancellation
- **Description:** Allow customer to cancel a booking (with refund logic)
- **Input:**
  - Booking ID
  - Customer ID (ownership verification)
  - Cancellation reason (optional)
- **Output:**
  - POST `/api/v1/customers/bookings/{bookingId}/cancel` endpoint
  - Update `bookings.status = CANCELLED`, set `cancelledAt` timestamp
  - Process refund if payment already made (create refund transaction)
  - Create cancellation audit record
  - Response: cancellation confirmation
- **Business Rules:**
  - BR-62: Only customer who created booking can cancel
  - BR-63: Cancellation not allowed if booking IN_PROGRESS or already COMPLETED
  - BR-64: Cancellation creates refund transaction (reverse of payment)
  - BR-65: Repeated cancellations may trigger auto-ban (admin review)
- **Priority:** Medium
- **Dependency:** Task 4.6

### Task 4.8 - Voucher/Promotion Validation

- **Name:** Implement Voucher Code Validation
- **Description:** Validate and apply voucher codes during booking checkout
- **Input:**
  - Voucher/promotion code
  - Customer ID
  - Booking context (package, date, amount)
- **Output:**
  - POST `/api/v1/bookings/validate-voucher` endpoint
  - Response: `{ isValid, discountPercent, discountAmount, applicableAmount, message }`
  - Discount is calculated but not yet applied (applied in Task 4.3)
- **Business Rules:**
  - BR-48: Voucher must be active and within date range
  - BR-49: New customer vouchers only if `isNewCustomer=true`
  - BR-103: Promotions validated by active flag, date range, eligible tier
  - BR-99: Promotions treated as voucher-like discounts
  - Voucher can be used only once per booking
- **Priority:** High
- **Dependency:** Task 4.3, Task 8.1 (Promotion module)

---

## EPIC 5: Operational Management (Staff & Wash Sessions)

### Task 5.1 - Wash Session Creation (from Booking)

- **Name:** Implement Wash Session Creation
- **Description:** Operations manager creates a wash session from confirmed booking, assigns staff
- **Input:**
  - Booking ID
  - Staff member ID (to be assigned)
  - Preferred start time
  - Station/bay assignment (optional)
  - Admin/operations user ID
- **Output:**
  - POST `/api/v1/operations/wash-sessions` endpoint
  - `wash_sessions` table: `( id, bookingId, staffId, startTime, estimatedDuration, status=PENDING, createdAt, ... )`
  - Update linked `bookings.status` to `CHECKED_IN` (implicit)
  - Response: wash session DTO
- **Business Rules:**
  - BR-66: Wash session created from CONFIRMED booking only
  - BR-67: Staff assignment must be ACTIVE staff (BR-85)
  - BR-68: Assigned staff's capacity must allow it
  - BR-86: Busy staff cannot be assigned to another non-completed session
- **Priority:** High
- **Dependency:** Task 4.4, Task 6.1 (Staff members exist)

### Task 5.2 - Check-in: Plate Verification & Start Wash

- **Name:** Implement Check-in & Start Wash Flow
- **Description:** Staff verifies vehicle plate before starting wash service
- **Input:**
  - Wash session ID
  - Scanned plate (from barcode/manual entry)
  - Check-in timestamp
  - Staff ID (from JWT)
- **Output:**
  - POST `/api/v1/operations/wash-sessions/{sessionId}/check-in` endpoint
  - Verify plate against booking vehicle plate
  - Update `wash_sessions.checkedInAt` timestamp
  - Update linked `bookings.status = CHECKED_IN`
  - Response: session DTO with check-in confirmation
- **Business Rules:**
  - BR-82: Manual plate verification checkbox required before check-in
  - BR-69: Check-in requires plate match with booking
  - BR-70: Booking must be CONFIRMED before check-in
  - BR-71: Only assigned staff can check-in their own session
  - BR-77: No-show detected if check-in fails after cutoff time (20 minutes post-scheduled)
- **Priority:** High
- **Dependency:** Task 5.1

### Task 5.3 - Start Washing

- **Name:** Implement Start Wash Endpoint
- **Description:** Staff marks wash as in-progress
- **Input:**
  - Wash session ID
  - Staff ID (from JWT)
  - Start time (can be auto-populated as now)
- **Output:**
  - POST `/api/v1/operations/wash-sessions/{sessionId}/start` endpoint
  - Update `wash_sessions.status = IN_PROGRESS`, set `startedAt` timestamp
  - Update linked `bookings.status = IN_PROGRESS`
  - Response: session DTO with in-progress status
- **Business Rules:**
  - BR-83: Start washing enabled only when already checked-in
  - BR-71: Only assigned staff can start wash
  - BR-72: Estimated finish time calculated (base + services duration)
- **Priority:** High
- **Dependency:** Task 5.2

### Task 5.4 - Complete Wash

- **Name:** Implement Complete Wash Endpoint
- **Description:** Staff marks wash as completed, triggers payment/loyalty updates
- **Input:**
  - Wash session ID
  - Staff ID (from JWT)
  - Completion notes (optional)
  - Actual duration (auto-calculated from timestamps)
- **Output:**
  - POST `/api/v1/operations/wash-sessions/{sessionId}/complete` endpoint
  - Update `wash_sessions.status = COMPLETED`, set `completedAt` timestamp
  - Update linked `bookings.status = COMPLETED`
  - Trigger loyalty points posting (Task 7.1)
  - Trigger payment collection if cash at counter (Task 4.4)
  - Response: session completion DTO
- **Business Rules:**
  - BR-84: Complete wash enabled only when IN_PROGRESS
  - BR-73: Completion timestamp recorded automatically
  - BR-74: Customer can rate service post-completion (future: Task 11.3)
  - BR-75: Loyalty points finalized on completion (if not already posted)
- **Priority:** High
- **Dependency:** Task 5.3, Task 7.1

### Task 5.5 - Operations Dashboard / Queue List

- **Name:** Implement Staff Operations Queue Endpoint
- **Description:** Retrieve real-time list of wash sessions for operations board
- **Input:**
  - Filters: status, time bucket (today/tomorrow), hour, staff, free-text search
  - Pagination: limit, offset
  - Staff ID (if filtering by staff)
  - Sort: by scheduled time
- **Output:**
  - GET `/api/v1/operations/queue` endpoint
  - List of wash session DTOs with:
    - Booking code, customer name, plate, package, assigned staff
    - Scheduled time, check-in time, estimated finish, actual completion
    - Status, next action button
  - Pagination metadata
- **Business Rules:**
  - BR-80: Operations board displays booking code, customer, plate, service, staff, times, status, next action
  - BR-81: Queue supports filtering by status, time, hour, staff, search
  - BR-71: Only staff can see their own sessions; admin sees all
- **Priority:** Medium
- **Dependency:** Task 5.2, 5.3, 5.4

### Task 5.6 - Operations Dashboard (Admin View)

- **Name:** Implement Admin Operations Dashboard
- **Description:** Admin view of all wash sessions with operational metrics
- **Input:**
  - Filters: date, status, staff, station
  - Metrics aggregation (optional)
- **Output:**
  - GET `/api/v1/admin/operations/dashboard` endpoint
  - Summary metrics: total sessions today, in-progress count, completed count, pending count
  - List of sessions with operational details
  - Analytics: average wash time, utilization %, no-show rate (daily)
- **Business Rules:**
  - BR-80: Admin sees all operational data
  - BR-110: Dashboard KPI cards derived from live booking/transaction data
- **Priority:** Medium
- **Dependency:** Task 5.5

### Task 5.7 - Manual Wash Session Status Update (Admin Override)

- **Name:** Implement Manual Session Status Update
- **Description:** Admin can manually update wash session status if needed (e.g., system glitch recovery)
- **Input:**
  - Wash session ID
  - New status: PENDING, CHECKED_IN, IN_PROGRESS, COMPLETED
  - Reason (required for audit)
  - Admin user ID
- **Output:**
  - PUT `/api/v1/admin/operations/wash-sessions/{sessionId}/status` endpoint
  - Update `wash_sessions.status` field
  - Create audit record with reason
  - Update linked booking status accordingly
  - Response: updated session
- **Business Rules:**
  - BR-125: Manual status changes are audit-tracked
  - Admin-only operation
- **Priority:** Low
- **Dependency:** Task 5.1

---

## EPIC 6: Staff Management

### Task 6.1 - Create Staff Member

- **Name:** Implement Create Staff Endpoint
- **Description:** Admin creates new staff member record
- **Input:**
  - Full name
  - Phone number
  - Employee ID (optional, auto-generated)
  - Department/Role (Washer, Inspector, Manager, etc.)
  - Status: ACTIVE, INACTIVE, ON_LEAVE
  - Hire date
  - Max concurrent bookings capacity
- **Output:**
  - POST `/api/v1/admin/staff` endpoint
  - `staff_members` table: `( id, name, phone, employeeId, status, capacity, hireDate, createdAt, ... )`
  - Response: created staff DTO
- **Business Rules:**
  - BR-85: Only ACTIVE staff can be assigned to bookings
  - BR-86: Busy staff cannot be assigned to multiple concurrent sessions
  - Staff assignment based on capacity
- **Priority:** High
- **Dependency:** None

### Task 6.2 - List Staff Members

- **Name:** Implement Get Staff List Endpoint
- **Description:** Retrieve all staff members (admin view) with filters
- **Input:**
  - Filters: status, department, hire date range
  - Pagination: limit, offset
  - Search: name, employee ID
- **Output:**
  - GET `/api/v1/admin/staff` endpoint
  - List of staff DTOs with: name, employee ID, status, current workload, last assigned booking
  - Pagination metadata
- **Business Rules:**
  - BR-85: Admin sees only ACTIVE staff when assigning to bookings
- **Priority:** Medium
- **Dependency:** Task 6.1

### Task 6.3 - Update Staff Details

- **Name:** Implement Update Staff Endpoint
- **Description:** Admin updates staff information
- **Input:**
  - Staff ID
  - Editable fields: phone, department, capacity, hire date (not name/ID usually)
- **Output:**
  - PUT `/api/v1/admin/staff/{staffId}` endpoint
  - Update `staff_members` table
  - Response: updated staff DTO
- **Business Rules:**
  - Admin-only operation
- **Priority:** Low
- **Dependency:** Task 6.2

### Task 6.4 - Update Staff Status

- **Name:** Implement Update Staff Status Endpoint
- **Description:** Admin changes staff status (ACTIVE, INACTIVE, ON_LEAVE)
- **Input:**
  - Staff ID
  - New status
  - Reason (optional)
  - Effective date (for ON_LEAVE, if future)
- **Output:**
  - PUT `/api/v1/admin/staff/{staffId}/status` endpoint
  - Update `staff_members.status`
  - If ON_LEAVE: create `staff_leave_periods` record
  - Create audit record
  - Response: updated staff record
- **Business Rules:**
  - BR-85: Only ACTIVE staff available for assignment
  - Status change blocks or releases workload
- **Priority:** Medium
- **Dependency:** Task 6.2

### Task 6.5 - Staff Workload Tracking

- **Name:** Implement Staff Workload Query
- **Description:** Query current workload for a staff member (active sessions)
- **Input:**
  - Staff ID
  - Date (optional, default today)
- **Output:**
  - GET `/api/v1/admin/staff/{staffId}/workload` endpoint
  - Workload DTO: `{ staffId, currentLoad, capacity, availableSlots, activeSessions: [ ... ] }`
  - List of active wash sessions assigned to staff
- **Business Rules:**
  - BR-86: Used to determine if staff can accept new assignment
  - currentLoad = count of (PENDING + CHECKED_IN + IN_PROGRESS) sessions
  - availableSlots = capacity - currentLoad
- **Priority:** Medium
- **Dependency:** Task 5.1, 6.1

---

## EPIC 7: Loyalty & Points System

### Task 7.1 - Loyalty Points Earning (on Booking Completion)

- **Name:** Implement Points Posting on Booking Completion
- **Description:** Award loyalty points to customer when booking is completed
- **Input:**
  - Booking ID (completed)
  - Customer ID
  - Total payment amount (in VND)
  - Customer current tier
- **Output:**
  - POST `/api/v1/loyalty/earn-points` endpoint (triggered internally on booking completion)
  - `loyalty_accounts` table: `( id, customerId, totalPoints, currentBalance, currentTier, lastTierReviewDate, createdAt, ... )`
  - `point_ledger` table: `( id, customerId, transactionType=EARN, amount, reference=bookingId, createdAt, ... )`
  - Update customer's point balance: `pointBalance += earnedAmount`
  - Response: updated loyalty account with new balance
- **Business Rules:**
  - BR-94: Points earned = `floor(finalAmount / 10000) * tierMultiplier`
  - Tier multipliers: Member=1x, Silver=1.2x, Gold=1.5x, Platinum=2x
  - BR-55: Points posted immediately on booking COMPLETED status
  - BR-92: Combo upgrade awards fixed 250 point bonus
- **Priority:** High
- **Dependency:** Task 4.4, Task 5.4

### Task 7.2 - Loyalty Account Creation (on First Booking)

- **Name:** Implement Automatic Loyalty Account Creation
- **Description:** Create loyalty account on customer's first completed booking
- **Input:**
  - Customer ID
- **Output:**
  - `loyalty_accounts` table record created automatically
  - Initial tier: `Member`
  - Point balance: 0 (until first booking)
  - Response: new loyalty account DTO
- **Business Rules:**
  - BR-87: Customer booking module tiers: Silver, Gold, Diamond
  - BR-88: Shared portal store tiers: Member, Silver, Gold, Platinum
  - For implementation: use shared portal tiers (Member, Silver, Gold, Platinum)
  - Tier review scheduled for 1 month after account creation
- **Priority:** High
- **Dependency:** Task 7.1

### Task 7.3 - Points Redemption (Points → Voucher)

- **Name:** Implement Points-to-Voucher Redemption
- **Description:** Allow customer to redeem points for discount voucher
- **Input:**
  - Customer ID (from JWT)
  - Points amount to redeem (50-200)
- **Output:**
  - POST `/api/v1/loyalty/redeem-points` endpoint
  - Create redemption voucher: `voucher_redemptions` table
  - Update point balance: subtract redeemed points
  - Create ledger entry: `pointLedger.transactionType = REDEEM`
  - Response: created voucher DTO with code, value, expiry
- **Business Rules:**
  - BR-89: Redemption requires 50-200 points minimum
  - BR-90: Redemption rate = 1 point = 1,000 VND voucher value
  - BR-91: Customer can hold max 3 active redeemed vouchers simultaneously
  - BR-92: Ledger entry created immediately
  - BR-96: Redemption blocked if customer blocked or insufficient balance
- **Priority:** High
- **Dependency:** Task 7.1

### Task 7.4 - Loyalty Points Redemption (Points → Payment)

- **Name:** Implement Points Redemption at Checkout
- **Description:** Allow customer to use points to reduce payment at checkout
- **Input:**
  - Booking ID (during checkout)
  - Points to redeem (whole number only)
  - Customer ID
- **Output:**
  - POST `/api/v1/bookings/{bookingId}/apply-points` endpoint
  - Calculate: `pointValue = redeemedPoints * conversionRate` (1 point = X VND)
  - Verify: points available <= payable amount, points balance sufficient
  - Update booking: store `pointsApplied`, adjust `finalAmount`
  - Update ledger: `pointLedger.transactionType = REDEEMED_AT_CHECKOUT`
  - Response: updated booking with adjusted total price
- **Business Rules:**
  - BR-95: Redemption caps by customer balance and payable amount
  - BR-95: Only whole points redeemable
  - BR-96: Blocked customers cannot redeem
  - Conversion rate: TBD (suggest 1 point = 1,000 VND or same as redemption rate)
- **Priority:** High
- **Dependency:** Task 7.1

### Task 7.5 - Loyalty Tier Management (Monthly Review)

- **Name:** Implement Monthly Tier Review & Update
- **Description:** Batch job to recalculate customer tiers based on rolling 12-month points
- **Input:**
  - Review date (monthly, e.g., first day of month)
  - Tier thresholds: Member (0-X), Silver (X-Y), Gold (Y-Z), Platinum (Z+)
- **Output:**
  - Scheduled batch process (Spring @Scheduled)
  - `loyalty_tier_history` table: `( id, customerId, oldTier, newTier, reviewDate, pointsInPeriod, ... )`
  - Update `loyalty_accounts.currentTier` for customers whose points changed tier
  - Create notification for tier upgrade (Task 11.2)
  - Response: batch summary (X upgrades, Y downgrades, Z unchanged)
- **Business Rules:**
  - BR-97: Monthly tier review applies pending rule edits on next review date
  - BR-97: Tiers recalculated from rolling 12-month points
  - Tier threshold logic: based on total points earned in last 12 months
  - Tier downgrade possible if points fall below tier threshold
- **Priority:** Medium
- **Dependency:** Task 7.1, 7.2

### Task 7.6 - Loyalty Points Expiry Management

- **Name:** Implement Points Expiry & Expiry Warnings
- **Description:** Track point expiry (365 days) and trigger warning notifications
- **Input:**
  - Batch job date
  - Warning thresholds: 30 days before expiry, 7 days before expiry
- **Output:**
  - Scheduled batch process for expiry checks
  - `point_expiry_warnings` table (if tracking): `( id, customerId, expiringPoints, expiresAt, warningSentAt, ... )`
  - Query `point_ledger` for earned points with age >= 335 days (expiring soon)
  - Create notification: "X points expiring in 30/7 days"
  - On expiry date (365 days): deduct expired points from balance
  - Response: batch summary (X warnings sent, Y points expired)
- **Business Rules:**
  - BR-98: Earned points expire after 365 days
  - BR-98: Warning notifications at 30-day and 7-day thresholds
  - Expiry can be paused during certain promotional periods (future flag)
- **Priority:** Medium
- **Dependency:** Task 7.1

### Task 7.7 - Get Loyalty Account Details

- **Name:** Implement Get Loyalty Account Endpoint
- **Description:** Retrieve customer's loyalty account status and point balance
- **Input:**
  - Customer ID (from JWT)
- **Output:**
  - GET `/api/v1/loyalty/account` endpoint
  - Loyalty account DTO: `{ totalPoints, currentBalance, currentTier, nextTierThreshold, lastReviewDate, redeemVouchersCount, expiringPoints, ... }`
  - Include upcoming tier benefits
- **Business Rules:**
  - BR-87 & BR-88: Show current tier and benefits
  - BR-89-91: Show redemption availability
  - Show point expiry warnings
- **Priority:** Medium
- **Dependency:** Task 7.1

### Task 7.8 - Points Ledger & Transaction History

- **Name:** Implement Get Points Ledger Endpoint
- **Description:** Retrieve customer's point transaction history
- **Input:**
  - Customer ID (from JWT)
  - Filters: transaction type, date range
  - Pagination: limit, offset
- **Output:**
  - GET `/api/v1/loyalty/transactions` endpoint
  - List of point transaction DTOs: `{ transactionId, type, amount, reference, date, balance }`
  - Types: EARN, REDEEMED_AT_CHECKOUT, REDEEMED_FOR_VOUCHER, EXPIRED, ADMIN_ADJUSTMENT
  - Pagination metadata
- **Business Rules:**
  - BR-125: Transaction history is audit-trackable
  - Show all point movements for customer transparency
- **Priority:** Low
- **Dependency:** Task 7.1

---

## EPIC 8: Promotions, Vouchers & Combos

### Task 8.1 - Promotion Management (Create/Edit/Delete)

- **Name:** Implement Promotion CRUD Endpoints
- **Description:** Admin manages promotional campaigns with discount mechanics
- **Input:**
  - Promotion name
  - Discount type: PERCENT or FIXED_AMOUNT
  - Discount value (1-100 for %, or fixed VND)
  - Start date
  - End date
  - Targeting mode: ALL_MEMBERS, SELECTED_TIERS, NEW_CUSTOMERS_ONLY
  - Applicable tiers (if SELECTED_TIERS): array of tier names
  - Max usage per customer (optional)
  - Status: ACTIVE, INACTIVE
- **Output:**
  - POST `/api/v1/admin/promotions` - Create promotion
  - GET `/api/v1/admin/promotions` - List promotions (admin only)
  - GET `/api/v1/promotions` - List active promotions (customer-facing)
  - PUT `/api/v1/admin/promotions/{promoId}` - Update
  - DELETE `/api/v1/admin/promotions/{promoId}` - Deactivate
  - `promotions` table: `( id, name, discountType, discountValue, startDate, endDate, targetingMode, tiers, maxUsagePerCustomer, status, createdAt, ... )`
  - Response: promotion DTO
- **Business Rules:**
  - BR-103: Promotion validation by active flag, date range, eligible tier
  - BR-104: Admin form presents three targeting modes
  - BR-105: Form requires name, 1-100 discount %, start/end date, at least one tier when selected
  - BR-106: `new customers only` mode translated to Member tier targeting (or explicit flag)
  - BR-107: Validation: start date must be before end date
- **Priority:** High
- **Dependency:** Task 4.1

### Task 8.2 - Voucher Code Management

- **Name:** Implement Voucher Code CRUD
- **Description:** Admin creates and manages redeemable voucher codes
- **Input:**
  - Voucher code (unique string)
  - Voucher type: FIXED_DISCOUNT, PERCENTAGE_DISCOUNT, FREE_SERVICE
  - Value (discount amount or %)
  - Applicable packages (all or selected)
  - Applicable to new customers only (boolean)
  - Expiry date
  - Max redemptions (global)
  - Max redemptions per customer
  - Status: ACTIVE, INACTIVE
- **Output:**
  - POST `/api/v1/admin/vouchers` - Create voucher
  - GET `/api/v1/admin/vouchers` - List vouchers (admin)
  - GET `/api/v1/vouchers/available` - List available vouchers (customer, filtered)
  - PUT `/api/v1/admin/vouchers/{voucherId}` - Update
  - DELETE `/api/v1/admin/vouchers/{voucherId}` - Deactivate
  - `vouchers` table: `( id, code, voucherType, value, minAmount, maxAmount, expiryDate, maxRedemptions, maxPerCustomer, status, createdAt, ... )`
  - `voucher_redemptions` table: `( id, voucherId, customerId, bookingId, redeemedAt, ... )`
- **Business Rules:**
  - BR-100: New-customer vouchers usable only if `isNewCustomer=true`
  - BR-48: Voucher applied to booking if valid
  - Voucher uniqueness enforced
  - Expiry and usage limits enforced
- **Priority:** High
- **Dependency:** Task 4.1

### Task 8.3 - Combo Management (Subscription Packages)

- **Name:** Implement Combo CRUD Endpoints
- **Description:** Admin creates and manages time-based subscription combo packages
- **Input:**
  - Combo name (e.g., "Monthly Unlimited")
  - Description
  - Base price (monthly cost)
  - Duration (days, e.g., 30)
  - Included services/package ID
  - Max services per period
  - Benefits (description array or JSON)
  - Status: ACTIVE, INACTIVE
  - Tier requirements (optional)
- **Output:**
  - POST `/api/v1/admin/combos` - Create combo
  - GET `/api/v1/admin/combos` - List combos (admin)
  - GET `/api/v1/combos` - List active combos (customer-facing)
  - PUT `/api/v1/admin/combos/{comboId}` - Update combo
  - DELETE `/api/v1/admin/combos/{comboId}` - Deactivate combo
  - `combos` table: `( id, name, description, basePrice, durationDays, maxServices, benefits, status, createdAt, ... )`
- **Business Rules:**
  - BR-101: Combo upgrade allowed only if target combo more expensive than current
  - BR-102: Combo upgrade requires at least one known vehicle
  - BR-93: Combo upgrade awards fixed 250 point bonus
- **Priority:** Medium
- **Dependency:** Task 4.1

### Task 8.4 - Apply Combo to Customer

- **Name:** Implement Active Combo Selection
- **Description:** Allow customer to activate/switch to a combo package
- **Input:**
  - Customer ID (from JWT)
  - Combo ID
  - Linked vehicle ID
  - Payment method (if combo is paid)
- **Output:**
  - POST `/api/v1/customers/combos/{comboId}/activate` endpoint
  - `customer_active_combos` table: `( id, customerId, comboId, vehicleId, startDate, expiryDate, status=ACTIVE, ... )`
  - If upgrade: deduct points or charge payment
  - Create ledger entry for upgrade
  - Award upgrade bonus (250 points)
  - Response: activated combo DTO with expiry date
- **Business Rules:**
  - BR-101 & BR-102: Validation for upgrade eligibility
  - BR-93: Award 250 points on upgrade
  - Combo starts immediately, expires at startDate + durationDays
  - Customer can have only one active combo per vehicle (or globally)
- **Priority:** High
- **Dependency:** Task 8.3, Task 7.1, Task 3.1

### Task 8.5 - List Available Combos (Customer)

- **Name:** Implement Get Available Combos Endpoint
- **Description:** Retrieve active combos available for customer to purchase/upgrade
- **Input:**
  - Customer ID (optional, for personalization)
  - Filters: vehicle type, price range
- **Output:**
  - GET `/api/v1/combos/available` endpoint
  - List of combo DTOs with: name, price, duration, benefits, upgrade eligibility
  - Include current active combo info if exists
  - Pagination (if many combos)
- **Business Rules:**
  - BR-101: Show upgrade option only if combo more expensive than current
  - Show activation option if no current combo or cheaper combo
- **Priority:** Medium
- **Dependency:** Task 8.3

### Task 8.6 - Combo Usage Tracking

- **Name:** Implement Combo Usage Ledger
- **Description:** Track usage of included services within active combo
- **Input:**
  - Customer combo ID
  - Booking ID (consuming a combo service)
- **Output:**
  - `combo_usage_ledger` table: `( id, customerComboId, bookingId, usageDate, createdAt, ... )`
  - Query endpoint: GET `/api/v1/customers/combos/{comboId}/usage` - Get usage history
  - Remaining services count in active combo response
- **Business Rules:**
  - BR-102: Track services consumed from active combo
  - Enforce max services limit
  - Display remaining services to customer
- **Priority:** Low
- **Dependency:** Task 8.4

---

## EPIC 9: Admin Management & Reporting

### Task 9.1 - Admin Dashboard Metrics

- **Name:** Implement Dashboard KPI Endpoints
- **Description:** Provide real-time KPI metrics for admin dashboard
- **Input:**
  - Date range (optional, default today)
  - Metrics requested (or all)
- **Output:**
  - GET `/api/v1/admin/dashboard/metrics` endpoint
  - Response: `{ totalBookings, completedBookings, pendingBookings, totalRevenue, totalPoints, activePromos, ... }`
  - Calculated from live data: bookings, transactions, promotions
  - Metrics: daily/monthly revenue, booking volume, customer count, no-show rate, loyalty distribution
- **Business Rules:**
  - BR-110: KPI cards derived from live shared-store bookings, transactions, promotions
  - Metrics should be queryable by date range
  - Should reflect real-time operational state
- **Priority:** Medium
- **Dependency:** Task 4.3, 5.4, 8.1

### Task 9.2 - Admin Booking Management

- **Name:** Implement Admin Booking List & Filter
- **Description:** Admin view of all bookings with advanced filters
- **Input:**
  - Filters: status, date range, customer name, vehicle, package
  - Search: booking code, customer phone
  - Pagination: limit, offset
  - Sort: by date, status, customer
- **Output:**
  - GET `/api/v1/admin/bookings` endpoint
  - List of booking DTOs (admin view): customer, vehicle, package, price, status, wash status
  - Pagination metadata
  - "In Progress" status = combination of booking status `Checked-in` + wash status `In Progress`
- **Business Rules:**
  - BR-111: List can be filtered by date and paginated
  - BR-112: Supports filters for status, date, customer name
  - BR-113: Maps `In Progress` from shared booking status + wash status
- **Priority:** Medium
- **Dependency:** Task 4.3, 5.4

### Task 9.3 - Admin Booking Detail & Staff Assignment

- **Name:** Implement Admin Booking Detail View with Staff Edit
- **Description:** Admin can view full booking details and assign/reassign staff
- **Input:**
  - Booking ID
  - (If updating) New staff ID
  - Linked wash session status (if exists)
- **Output:**
  - GET `/api/v1/admin/bookings/{bookingId}` endpoint
  - Full booking detail DTO: customer, vehicle, package, services, price breakdown, wash session (if exists)
  - PUT `/api/v1/admin/bookings/{bookingId}/assign-staff` endpoint (if session exists and IN_PROGRESS)
  - Update `wash_sessions.staffId`
  - Response: updated booking with new staff
- **Business Rules:**
  - BR-115: Staff assignment editable only when wash session exists AND session status is In Progress
  - BR-114: Admin cannot manually set `IN_PROGRESS` status (operationally derived)
  - Validation: new staff must be ACTIVE and have capacity
- **Priority:** Medium
- **Dependency:** Task 9.2, Task 5.1

### Task 9.4 - Admin Accounts Directory

- **Name:** Implement Accounts Directory
- **Description:** Admin view of customer, staff, and admin accounts in one merged directory, matching the prototype page labeled `Accounts`
- **Input:**
  - Search: name, phone, email, employee ID
  - Filters: role, status, tier, department, registration date range
  - Pagination: limit, offset
  - Sort: by name, role, registration date, tier, status
- **Output:**
  - GET `/api/v1/admin/accounts` endpoint
  - Merged account DTOs with common fields: accountId, role, displayName, phone, email, status, createdAt
  - Customer-specific fields when applicable: tier, loyaltyBalance, lastBookingDate, totalBookings
  - Staff-specific fields when applicable: employeeId, department, currentLoad, capacity
  - Pagination metadata
- **Business Rules:**
  - BR-116: Accounts directory supports search, role filter, tier filter, status filter, and pagination
  - BR-117: Directory merges customer, staff, and admin records into one admin list
  - Non-customer records should not expose customer-only tabs
- **Priority:** Medium
- **Dependency:** Task 2.1

### Task 9.5 - Admin Customer Detail View

- **Name:** Implement Customer Detail Drilldown
- **Description:** Admin views detailed customer profile with tabbed information; non-customer accounts use a lighter account summary view
- **Input:**
  - Customer ID
  - Tab: Profile, Vehicles, Bookings, Wash History, Point Transactions, Tier History
- **Output:**
  - GET `/api/v1/admin/customers/{customerId}` endpoint
  - GET `/api/v1/admin/customers/{customerId}/vehicles`
  - GET `/api/v1/admin/customers/{customerId}/bookings`
  - GET `/api/v1/admin/customers/{customerId}/wash-sessions`
  - GET `/api/v1/admin/customers/{customerId}/point-transactions`
  - GET `/api/v1/admin/customers/{customerId}/tier-history`
  - Full customer DTO with nested data per tab
- **Business Rules:**
  - BR-118: Customer tabs are Profile, Vehicles, Bookings, Wash History, Point Transactions, Tier History
  - BR-119: Non-customer accounts open a lighter summary panel rather than the full customer detail view
  - BR-120: Customer status changes persist from admin detail view
  - BR-121: Customer role changes are presentation-only in the prototype and should be explicit if production supports role updates
- **Priority:** Medium
- **Dependency:** Task 9.4, Task 2.1, Task 3.1, Task 4.3, Task 5.4, Task 7.5, Task 6.1

### Task 9.6 - Admin Customer Status Update

- **Name:** Implement Customer Status Change (from Admin Detail)
- **Description:** Admin updates customer status (Active, Blocked, Suspended)
- **Input:**
  - Customer ID
  - New status: ACTIVE, BLOCKED, SUSPENDED
  - Reason (required)
  - Effective date (for suspensions)
- **Output:**
  - PUT `/api/v1/admin/customers/{customerId}/status` endpoint
  - Update `users.status` (same as Task 2.4)
  - Create audit record
  - Response: updated customer with new status
- **Business Rules:**
  - BR-120: Status changes persist from admin detail view
  - BR-08: Blocked customers cannot login
  - BR-140: Audit-tracked
- **Priority:** Medium
- **Dependency:** Task 2.4

### Task 9.7 - Admin Reports Generation

- **Name:** Implement Reporting Endpoints
- **Description:** Generate various analytical reports for business intelligence
- **Input:**
  - Report type: booking_trends, promotion_effectiveness, point_summaries, no_show_metrics, revenue, customer_acquisition, daily_staff_wash_counts
  - Date range: start date, end date
  - Grouping: daily, weekly, monthly
  - (Optional) filters: tier, status, customer segment
- **Output:**
  - GET `/api/v1/admin/reports/{reportType}` endpoint
  - Report data in structured format: array of data points with labels and values
  - Can be exported as JSON (and potentially CSV in future)
  - Metrics included:
    - Booking trends: volume, status distribution over time
    - Promotion effectiveness: promo usage count, discount amount, conversion rate
    - Point summaries: total issued, redeemed, expired
    - No-show metrics: no-show count, rate, by customer tier
    - Revenue: total, by package, by payment method
    - Customer acquisition: new customers, registration trends
    - Daily staff wash counts: completed wash count per staff per day, date filtered and paginated
- **Business Rules:**
  - BR-123: Reports computed from shared store / backend source of truth
  - BR-124: Daily staff wash counts support date filtering and pagination
- **Priority:** Low
- **Dependency:** Task 4.3, 5.4, 7.1, 8.1

### Task 9.8 - Admin Settings

- **Name:** Implement Admin Settings Management
- **Description:** Allow admin to configure system-wide settings
- **Input:**
  - Setting keys: business_name, business_phone, business_email, commission_rate, point_expiry_days, tier_thresholds, otp_validity_minutes, booking_cancellation_window_hours, etc.
  - Setting values (type-dependent: string, number, boolean, JSON)
- **Output:**
  - GET `/api/v1/admin/settings` endpoint
  - PUT `/api/v1/admin/settings/{settingKey}` endpoint
  - `admin_settings` table: `( id, settingKey, settingValue, dataType, description, createdAt, updatedAt, ... )`
  - Persist to localStorage (as mentioned in prototype)
  - Response: updated settings
- **Business Rules:**
  - BR-122: Prototype settings persist to browser localStorage on current device; production stores canonical settings in backend
  - Should support default values
  - Validation per setting type
- **Priority:** Low
- **Dependency:** None

---

## EPIC 10: Notifications, Support Chat & Live Tracking

### Task 10.1 - Notification Template Management

- **Name:** Implement Notification Templates
- **Description:** Admin manages notification templates for system alerts and reminders
- **Input:**
  - Template name (e.g., "Booking Confirmation", "Loyalty Point Expiry Warning")
  - Template type: SMS, EMAIL, PUSH, IN_APP
  - Content: subject (for email), message body with placeholders
  - Triggered by: event or action
  - Status: ACTIVE, INACTIVE
- **Output:**
  - POST `/api/v1/admin/notification-templates` - Create template
  - GET `/api/v1/admin/notification-templates` - List templates
  - PUT `/api/v1/admin/notification-templates/{templateId}` - Update template
  - `notification_templates` table: `( id, name, type, subject, content, triggeredBy, status, createdAt, ... )`
- **Business Rules:**
  - BR-122: Templates for various events
  - Support placeholders: {customerName}, {bookingId}, {pointsAmount}, etc.
- **Priority:** Medium
- **Dependency:** None

### Task 10.2 - Booking Confirmation Notification

- **Name:** Implement Booking Confirmation Notification
- **Description:** Send notification when booking is confirmed
- **Input:**
  - Booking ID (status changed to CONFIRMED)
  - Customer contact info (phone, email)
  - Booking details (date, package, price)
- **Output:**
  - Internal trigger on booking confirmation (Task 4.4)
  - `notifications` table: `( id, customerId, type, content, sentAt, channel, reference=bookingId, ... )`
  - SMS/Email sent (mocked initially, real integration later)
  - Notification record stored for history
- **Business Rules:**
  - BR-124: Booking confirmation pushes local notification items into store
  - Notification includes: booking code, scheduled date/time, package name, total price, payment method
- **Priority:** High
- **Dependency:** Task 4.4, Task 10.1

### Task 10.3 - Booking Reminder Notification

- **Name:** Implement Booking Reminder System
- **Description:** Send reminders for upcoming bookings (automated)
- **Input:**
  - Batch job timer (e.g., every 30 seconds, every 5 minutes)
  - Scheduled reminder times: 24 hours before, 1 hour before, 15 minutes before
- **Output:**
  - Scheduled task in Spring (e.g., `@Scheduled(fixedRate = 30000)`)
  - Query `bookings` with status PENDING/CONFIRMED and approaching scheduled time
  - `reminder_records` table: `( id, bookingId, reminderType, sentAt, channel, dismissed, ... )`
  - Send SMS/Email (mocked)
  - Store deduplication key in localStorage to avoid duplicate sends
  - Toast/browser notification triggered (for web client)
- **Business Rules:**
  - BR-125: Customer reminder watcher polls every 30 seconds in the prototype
  - BR-126: Reminders deduplicated via reminder keys in localStorage in the prototype; production should deduplicate server-side
  - BR-140: Audit-like records stored
  - Send reminders for PENDING or CONFIRMED bookings
- **Priority:** High
- **Dependency:** Task 4.3

### Task 10.4 - Payment Due Notification

- **Name:** Implement Payment Due/Overdue Notifications
- **Description:** Notify customer of pending cash payments
- **Input:**
  - Batch job to find unpaid bookings (status COMPLETED but paymentStatus PENDING)
  - Days overdue threshold (e.g., notify at 3 days, escalate at 7 days)
- **Output:**
  - Scheduled task querying unpaid bookings
  - `notifications` table entry
  - SMS/Email sent (mocked)
  - Response: batch summary (X notifications sent)
- **Business Rules:**
  - For cash-at-counter bookings that are completed but not paid
  - Escalation: friendly reminder → final notice
- **Priority:** Medium
- **Dependency:** Task 4.4

### Task 10.5 - Loyalty Points Expiry Warning

- **Name:** Implement Points Expiry Notifications
- **Description:** Send warnings when points are about to expire
- **Input:**
  - Batch job query points expiring soon
  - Warning thresholds: 30 days, 7 days before expiry
- **Output:**
  - Scheduled task (daily or 6-hourly)
  - `notifications` table entry for each customer with expiring points
  - `point_expiry_warnings` table: `( id, customerId, expiringPoints, expiresAt, warningSentAt, ... )`
  - SMS/Email sent (mocked)
- **Business Rules:**
  - BR-98: Warning at 30-day and 7-day thresholds
  - BR-124: Points expiry warnings push notification items into store
  - Show point value and expiry date in message
- **Priority:** Medium
- **Dependency:** Task 7.6

### Task 10.6 - Tier Change Notification

- **Name:** Implement Tier Upgrade/Downgrade Notifications
- **Description:** Notify customer of tier changes
- **Input:**
  - Tier change event (from Task 7.5 monthly review)
  - Customer contact info
  - Old tier, new tier, benefits summary
- **Output:**
  - Trigger on tier change (automatic from Task 7.5)
  - `notifications` table entry
  - SMS/Email sent (mocked)
  - Include: new tier name, new benefits, point threshold for next tier
- **Business Rules:**
  - Notifications for both upgrades and downgrades
  - Celebrate upgrades, encourage maintenance for downgrades
- **Priority:** Medium
- **Dependency:** Task 7.5

### Task 10.7 - In-App Notification Center

- **Name:** Implement Notification List & History
- **Description:** Allow customer to view all notifications sent to them
- **Input:**
  - Customer ID (from JWT)
  - Filters: type, date range, read/unread
  - Pagination: limit, offset
- **Output:**
  - GET `/api/v1/customers/notifications` endpoint
  - List of notification DTOs: content, sent date, type, read status, action link
  - Mark notification as read
- **Business Rules:**
  - BR-128: Customer shell shows a notification bell that opens a local notification list
  - BR-129: Customer notification entries navigate to customer history when selected
  - BR-140: Audit-like notification records
  - Show notification history for transparency
- **Priority:** Low
- **Dependency:** Task 10.2

### Task 10.8 - Support Chat Threads & Inbox

- **Name:** Implement Customer Support Chat
- **Description:** Persist customer support threads/messages and expose a shared staff/admin support inbox
- **Input:**
  - Customer ID for customer-created thread
  - Sender ID and role (`CUSTOMER`, `STAFF`, `ADMIN`)
  - Message body
  - Thread ID for replies
- **Output:**
  - POST `/api/v1/support/threads` - Create or ensure customer support thread
  - GET `/api/v1/support/threads/me` - Get current customer's thread
  - GET `/api/v1/admin/support/threads` - Staff/admin shared inbox
  - POST `/api/v1/support/threads/{threadId}/messages` - Send message
  - PUT `/api/v1/support/threads/{threadId}/read` - Mark thread as read for current actor
  - Tables: `support_threads`, `support_messages`, `support_thread_reads`
  - WebSocket event `support:message:received`
- **Business Rules:**
  - BR-130: Floating support chat button is shown in the shell for all roles
  - BR-131: Opening customer support chat ensures a thread exists for the current customer
  - BR-132: First customer support thread is seeded with a system greeting message
  - BR-133: Staff and admin share one support inbox listing all customer support threads
  - BR-134: Any staff or admin user can reply to any customer support thread in the prototype inbox
  - BR-135: Support messages update unread counts for the opposite side
  - BR-136: Prototype normalizes support threads on load and persists them in localStorage; production should persist in database
- **Priority:** Medium
- **Dependency:** Task 1.6, Task 2.1, Task 6.1

### Task 10.9 - Live Wash Progress Tracking

- **Name:** Implement Live Wash Progress View
- **Description:** Provide customer-facing wash progress data derived from active wash session status and timing
- **Input:**
  - Customer ID from JWT
  - Active booking or wash session ID
  - Wash session `startedAt`, status, package duration, service durations
- **Output:**
  - GET `/api/v1/customers/wash-tracking/active` - Return active tracked booking/session if any
  - GET `/api/v1/customers/wash-tracking/{washSessionId}` - Return current progress snapshot
  - Optional WebSocket event `wash-session:progress:updated` for status/timing changes
  - DTO includes: bookingId, washSessionId, status, startedAt, estimatedFinishAt, elapsedSeconds, estimatedDurationSeconds, progressPercent, stage
- **Business Rules:**
  - BR-137: Customer home renders live wash progress tracker only when there is an active tracked booking or wash session
  - BR-138: Tracker recalculates every second from session start time plus package/service durations
  - BR-139: Tracker derives stage presentation from wash session status and elapsed ratio, not a hardcoded value
- **Priority:** Medium
- **Dependency:** Task 5.1, Task 5.3, Task 5.4

---

## EPIC 11: Audit, Compliance & System Administration

### Task 11.1 - Audit Logging Framework

- **Name:** Implement Audit Log Infrastructure
- **Description:** Create audit logging for important business actions
- **Input:**
  - Event type: CREATE, UPDATE, DELETE, STATUS_CHANGE, PAYMENT, APPROVAL, etc.
  - Actor: user ID (who performed action)
  - Entity: entity type (Booking, Customer, Staff, etc.)
  - Entity ID: which record
  - Changes: old value → new value (JSON)
  - Timestamp
- **Output:**
  - AuditLog entity/table: `( id, eventType, actorId, entityType, entityId, changes, createdAt, ... )`
  - AuditLog listener/aspect (Spring AOP) to auto-log specified operations
  - Immutable audit records (no updates/deletes)
  - Response: audit entry created
- **Business Rules:**
  - BR-125: Vehicle ownership transfers, tier changes, ledger entries, adjustments stored as audit-like records
  - BR-125: Not immutable backend audit logs (prototype uses local records)
- **Priority:** Medium
- **Dependency:** None

### Task 11.2 - Booking & Operation Audit Events

- **Name:** Implement Specific Audit Events for Booking Workflow
- **Description:** Log all booking and wash session state changes
- **Input:**
  - Booking state changes: PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED
  - Wash session state changes
  - Staff assignment changes
  - Payment events
- **Output:**
  - Audit log entries created automatically on each state change
  - Query endpoint: GET `/api/v1/admin/audit-logs` with filters
  - Audit trail shows full booking lifecycle
- **Business Rules:**
  - BR-125: All state transitions audit-logged
- **Priority:** Medium
- **Dependency:** Task 11.1

### Task 11.3 - Manual Tier Adjustment (Admin)

- **Name:** Implement Admin Loyalty Tier Adjustment
- **Description:** Allow admin to manually adjust customer tier or loyalty balance
- **Input:**
  - Customer ID
  - Adjustment type: SET_TIER, ADD_POINTS, REMOVE_POINTS
  - Adjustment value
  - Reason (required)
  - Admin user ID
- **Output:**
  - POST `/api/v1/admin/customers/{customerId}/loyalty-adjustment` endpoint
  - Update `loyalty_accounts.currentTier` or point balance
  - Create ledger entry: `pointLedger.transactionType = ADMIN_ADJUSTMENT`
  - Create audit record with reason
  - Response: updated loyalty account
- **Business Rules:**
  - BR-125: Adjustments audit-tracked with reason
  - Admin-only operation
- **Priority:** Low
- **Dependency:** Task 7.1, Task 7.5

---

## EPIC 12: Data Integration & Synchronization

### Task 12.1 - Customer Booking & Admin Portal Synchronization

- **Name:** Unify Customer Booking State with Admin Portal State
- **Description:** Consolidate customer booking module state and admin/staff portal state into one shared domain model
- **Input:**
  - Current state from both modules (review Prototype Architecture Notes)
  - Target: single source of truth for bookings, packages, combos, vouchers
- **Output:**
  - Migrate customer booking mock data to shared booking domain
  - Package/combo/voucher state centralized in promotion module
  - Single booking entity used by customer, staff, and admin
  - Response: state consolidation completed
- **Business Rules:**
  - This is a refactoring task to resolve prototype architectural split
  - See Section 1 of this document: "customer booking pages and admin/staff pages are not fully synchronized"
- **Priority:** High (for production)
- **Dependency:** Task 4.3, Task 5.1, Task 8.1

### Task 12.2 - Tier System Unification

- **Name:** Unify Loyalty Tier Definitions
- **Description:** Resolve discrepancy between customer booking tiers (Silver, Gold, Diamond) and portal tiers (Member, Silver, Gold, Platinum)
- **Input:**
  - Current tier definitions from both modules
  - Target: single tier system
- **Output:**
  - Define unified tier set: Member, Silver, Gold, Platinum (recommended)
  - Update customer booking module to use shared tier system
  - Migrate historical tier data
  - Update all tier-based business logic references
- **Business Rules:**
  - BR-87 vs BR-88: Resolve tier discrepancy
  - Single tier system reduces confusion and enables consistent benefits
- **Priority:** High (for production)
- **Dependency:** Task 7.2, Task 7.5

### Task 12.3 - Transaction History Consolidation

- **Name:** Consolidate Transaction History Sources
- **Description:** Resolve split between module-local booking history and shared operational transactions
- **Input:**
  - Current history from customer booking module
  - Current history from shared portal store operations
- **Output:**
  - Single source for transaction/booking history queries
  - `/customer/bookings` and `/customer/transactions` read from same table
  - Consistent transaction timestamps and amounts
- **Business Rules:**
  - Prototype splits history across modules (see Section 7 of README)
  - For production: single transaction ledger
- **Priority:** Medium (for production)
- **Dependency:** Task 4.3, Task 5.4

---

## EPIC 13: Payment Gateway Integration (Future)

### Task 13.1 - Payment Gateway Adapter Pattern

- **Name:** Implement Payment Adapter Interface
- **Description:** Create abstraction for payment provider integration
- **Input:**
  - Payment provider: VNPay, Stripe, MoMo, etc.
  - Gateway credentials (from config)
- **Output:**
  - `PaymentGateway` interface with methods: `initiate()`, `verify()`, `refund()`
  - Implementation classes per provider (VNPayAdapter, StripeAdapter, etc.)
  - Payment response mapping to transaction entity
  - Webhook handling for payment confirmations
- **Business Rules:**
  - DR-52 & 53: Mock payment processing replaced with real gateway
  - Idempotency for payment operations
- **Priority:** Low (Future enhancement)
- **Dependency:** Task 4.4

### Task 13.2 - SMS/OTP Gateway Integration

- **Name:** Implement SMS Gateway Integration
- **Description:** Integrate real SMS provider for OTP and notifications
- **Input:**
  - SMS provider: Twilio, AWS SNS, local Vietnam provider
  - Gateway credentials
  - Message templates
- **Output:**
  - `SmsGateway` interface with method: `send()`
  - Implementation per provider
  - Delivery status tracking
  - Retry logic for failed sends
- **Business Rules:**
  - BR-15, BR-16, BR-17: Replace mock OTP with real SMS
  - BR-122, BR-123: Replace mock reminders with real SMS
- **Priority:** Low (Future enhancement)
- **Dependency:** Task 1.2, Task 10.3

---

## 4. Critical Path (Must-build first)

**Recommended implementation order to unblock dependent functionality:**

### Phase 1: Foundation (Weeks 1-2)
1. **Task 1.1** - User Registration
2. **Task 1.2** - OTP Generation & Verification
3. **Task 1.3** - Login Endpoint
4. **Task 1.4** - JWT Token Management
5. **Task 1.6** - RBAC Setup
6. **Task 2.1** - Customer Profile Retrieval
7. **Task 6.1** - Create Staff Member

**Output:** Basic auth framework, user registration, customer can login

### Phase 2: Core Booking (Weeks 3-4)
8. **Task 3.1** - Create Vehicle
9. **Task 3.2** - List Customer Vehicles
10. **Task 4.1** - Package Catalog Management
11. **Task 4.2** - Package services
12. **Task 4.3** - Create Booking
13. **Task 4.4** - Payment Simulation & Finalization

**Output:** Customer can register, create vehicle, and book a service

### Phase 3: Operations (Weeks 5-6)
14. **Task 5.1** - Wash Session Creation
15. **Task 5.2** - Check-in & Plate Verification
16. **Task 5.3** - Start Washing
17. **Task 5.4** - Complete Wash

**Output:** Staff can manage wash operations from start to finish

### Phase 4: Loyalty & Promotions (Week 7)
18. **Task 7.1** - Loyalty Points Earning
19. **Task 7.2** - Loyalty Account Creation
20. **Task 8.1** - Promotion Management
21. **Task 8.2** - Voucher Code Management

**Output:** Loyalty points system and promotions working

### Phase 5: Admin Management (Week 8)
22. **Task 9.1** - Admin Dashboard Metrics
23. **Task 9.2** - Admin Booking Management
24. **Task 9.4** - Admin Accounts Directory

**Output:** Admin can view dashboards, manage bookings, and search customer/staff/admin accounts

### Phase 6: Notifications (Week 9)
25. **Task 10.2** - Booking Confirmation Notification
26. **Task 10.3** - Booking Reminder System
27. **Task 10.8** - Support Chat Threads & Inbox
28. **Task 10.9** - Live Wash Progress Tracking

**Output:** Customers receive booking confirmations/reminders, support chat persists, and live wash tracking has backend data

### Phase 7: Refinement & Testing (Weeks 10-12)
29. Complete remaining medium/low priority tasks
30. **Task 12.1-12.3** - Data synchronization & unification
31. Integration testing, performance optimization, security hardening

---

## 5. Risk & Complexity Analysis

### 5.1 High-Risk Items

| Risk Item | Impact | Mitigation |
|-----------|--------|-----------|
| **Data Synchronization** (Task 12.1-12.3) | **HIGH** - Customer booking & admin portal currently use separate state models. This architectural split can cause data inconsistencies and customer confusion. | Prioritize consolidation early. Create unified booking, loyalty, and promotion models before production. Run data reconciliation scripts. |
| **Loyalty Tier Discrepancy** (Task 12.2) | **MEDIUM** - Two different tier systems (Silver/Gold/Diamond vs Member/Silver/Gold/Platinum) will confuse customers and staff. | Decide on unified tier system in design phase. Plan data migration for historical records. Test tier-based discount logic thoroughly. |
| **Payment Gateway Integration** (Task 13.1-13.2) | **HIGH** - Moving from mock to real payments requires PCI compliance, secure credential handling, and idempotency. | Use established payment SDKs. Implement webhook verification. Test with sandbox environment first. |
| **No-Show & Late-Arrival Logic** | **MEDIUM** - Prototype contains both 20-minute operational no-show handling and 15-minute late-arrival logic in legacy session code. Behavior undefined. | Clarify business rule (single no-show definition). Implement consistent logic. Test with real booking scenarios. |
| **Booking Capacity Constraints** | **MEDIUM** - Shared store enforces max 3 active bookings per customer & slot capacity, but customer booking module doesn't enforce. | Unified booking state (Task 12.1) must enforce all constraints. Validate on creation, not just UI. |
| **Promotion Targeting Semantics** (BR-106) | **MEDIUM** - Admin UI offers "new customers only" but logic currently implements as "Member tier". True new-customer eligibility check needed. | Define explicit `isNewCustomer` field. Populate during registration. Use in promotion validation (not tier proxy). |
| **Support Chat Persistence** (Task 10.8) | **MEDIUM** - Prototype stores support chat in localStorage and lets staff/admin share one broad inbox. Production needs durable storage, read cursors, moderation/audit behavior, and permission checks. | Persist threads/messages server-side, model participant read state explicitly, and keep staff/admin inbox access rules visible in RBAC tests. |
| **Live Wash Tracking Accuracy** (Task 10.9) | **MEDIUM** - Prototype derives progress from local timing. Production must derive from canonical wash session status, start time, and duration to avoid false progress. | Make operation service the source of truth and push only status/timing changes over WebSocket. Let the client calculate display progress from server snapshots. |

### 5.2 Complexity Items

| Component | Complexity | Notes |
|-----------|-----------|-------|
| **Booking Lifecycle** | **HIGH** | Multiple state transitions (PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED), multiple actors (customer, staff, admin), payment integration, refund logic, loyalty posting. Requires careful state machine design and transactional consistency. |
| **Loyalty Points System** | **HIGH** | Point earning (tiered), redemption (two modes: voucher & checkout), expiry (365 days), tier calculation (monthly rolling 12-month), warnings (30/7 days), admin adjustments, all with audit trails. Complex business logic and data modeling. |
| **Tier-Based Pricing & Benefits** | **HIGH** | Tiers affect: booking windows (BR-67), max active bookings (BR-50), loyalty earning rate (BR-94), promotion eligibility (BR-103), Platinum priority (BR-51). Audit tier history. Design requires careful tier dependency mapping. |
| **Staff Assignment & Workload** | **MEDIUM** | Concurrent session tracking, workload balancing, leave/on-leave status, busy-staff validation. Requires efficient querying of active staff capacity. Consider locking mechanisms for concurrent bookings. |
| **Notification System** | **MEDIUM** | Multiple notification types (SMS, email, push, in-app), deduplication, templates, scheduling, retry logic, delivery tracking. Event-driven architecture recommended (Spring Events or message queue). |
| **Batch Jobs & Scheduling** | **MEDIUM** | Monthly tier review (Task 7.5), point expiry sweep (Task 7.6), reminder polling (Task 10.3), payment due checks (Task 10.4). Use Spring Scheduler or Quartz. Monitor for job failures. |
| **Admin Reporting** | **MEDIUM** | Multiple report types (trends, effectiveness, summaries, metrics) with flexible date ranges and aggregations. Consider reporting library (Jasper, JimuReport) or analytics service. |

### 5.3 Testing Strategy

**Unit Testing:** Focus on business rule validation (BR-*), especially:
- Loyalty points calculation (BR-94, BR-93, BR-90)
- Tier thresholds and calculations (BR-97)
- Promotion and voucher eligibility (BR-103, BR-100, BR-49, BR-48)
- Booking constraints (BR-50, BR-67, BR-46, BR-45)

**Integration Testing:** Focus on multi-step workflows:
- End-to-end booking flow (registration → vehicle → booking → payment → points → loyalty tier)
- Wash session lifecycle (create → check-in → start → complete)
- Tier review & point expiry batch processes
- Admin management workflows

**Data Consistency Testing:** After Task 12.1-12.3:
- Reconcile customer booking state vs. admin portal state
- Verify single source of truth for all entities
- Load test concurrent bookings, staff assignments, payment processing

---

## APPENDIX A: Database Schema Outline

**Key Tables (Non-exhaustive):**

```
-- Authentication & Users
users (id, phone, email, fullName, passwordHash, status, role, createdAt, updatedAt)
auth_tokens (id, userId, token, expiresAt, revokedAt)
otp_records (id, userId, code, expiresAt, attempts, verified)
user_preferences (id, userId, language, theme, createdAt, updatedAt)

-- Vehicles
vehicles (id, customerId, plate, type, brand, model, year, color, status, isPrimary, createdAt, updatedAt)

-- Bookings & Packages
packages (id, name, description, basePrice, duration, features, status, createdAt, updatedAt)
add_ons (id, name, description, price, createdAt, updatedAt)
package_add_ons (id, packageId, addonId)
bookings (id, customerId, vehicleId, packageId, bookingDate, bookingTime, status, totalPrice, cancelledAt, createdAt, updatedAt)
booking_items (id, bookingId, addonId, price)

-- Transactions & Payments
transactions (id, bookingId, customerId, amount, method, status, createdAt, updatedAt)

-- Operations
wash_sessions (id, bookingId, staffId, startTime, estimatedDuration, status, checkedInAt, startedAt, completedAt, createdAt)
staff_members (id, name, phone, employeeId, status, capacity, hireDate, createdAt, updatedAt)

-- Loyalty
loyalty_accounts (id, customerId, totalPoints, currentBalance, currentTier, lastTierReviewDate, createdAt, updatedAt)
point_ledger (id, customerId, transactionType, amount, reference, createdAt)
loyalty_tier_history (id, customerId, oldTier, newTier, reviewDate, pointsInPeriod)

-- Promotions & Vouchers
promotions (id, name, discountType, discountValue, startDate, endDate, targetingMode, tiers, maxUsagePerCustomer, status, createdAt)
vouchers (id, code, voucherType, value, minAmount, maxAmount, expiryDate, maxRedemptions, maxPerCustomer, status, createdAt)
voucher_redemptions (id, voucherId, customerId, bookingId, redeemedAt)
combos (id, name, description, basePrice, durationDays, maxServices, benefits, status, createdAt)
customer_active_combos (id, customerId, comboId, vehicleId, startDate, expiryDate, status)
combo_usage_ledger (id, customerComboId, bookingId, usageDate)

-- Notifications & Audit
notification_templates (id, name, type, subject, content, triggeredBy, status, createdAt)
notifications (id, customerId, type, content, sentAt, channel, reference, createdAt)
reminder_records (id, bookingId, reminderType, sentAt, channel, dismissed)
audit_logs (id, eventType, actorId, entityType, entityId, changes, createdAt)

-- Support Chat
support_threads (id, customerId, status, lastMessageAt, createdAt, updatedAt)
support_messages (id, threadId, senderId, senderRole, body, createdAt)
support_thread_reads (id, threadId, actorId, actorRole, lastReadAt)

-- Admin Settings
admin_settings (id, settingKey, settingValue, dataType, description, createdAt, updatedAt)
admin_accounts_view (accountId, role, displayName, phone, email, status, tier, department, createdAt)
```

---

## APPENDIX B: Key Business Rules Index

| BR ID | Rule | Task(s) |
|-------|------|---------|
| BR-01 to BR-05 | Public homepage, guest routing, language/theme | 2.3 |
| BR-06 to BR-10 | Login, role routing, token management | 1.3, 1.4, 1.6 |
| BR-11 to BR-25 | Registration, OTP, profile | 1.1, 1.2, 2.1, 2.2 |
| BR-26 to BR-39 | Vehicle management | 3.1-3.7 |
| BR-40 to BR-56 | Booking checkout flow | 4.1-4.8 |
| BR-57 to BR-77 | Booking lifecycle & operations | 5.1-5.7 |
| BR-78 to BR-86 | Staff operations & workflow | 5.5, 6.1, 6.5 |
| BR-87 to BR-98 | Loyalty, points, tier, expiry | 7.1-7.8 |
| BR-99 to BR-109 | Promotions, vouchers, combos, packages | 8.1-8.6, 4.1 |
| BR-110 to BR-124 | Admin accounts, management, dashboards, reports | 9.1-9.8 |
| BR-125 to BR-140 | Notifications, support chat, live tracking, audit records | 10.1-10.9, 11.1-11.3 |

---

## APPENDIX C: Glossary

- **RBAC:** Role-Based Access Control (Customer, Staff, Admin)
- **JWT:** JSON Web Token (stateless auth)
- **OTP:** One-Time Password (SMS verification)
- **KPI:** Key Performance Indicator
- **Tier:** Customer loyalty membership tier (Member, Silver, Gold, Platinum)
- **Combo:** Time-based subscription package (e.g., monthly unlimited)
- **Voucher:** Discount code or point-redemption coucher
- **Promotion:** Campaign offering discount to eligible customers
- **Wash Session:** Operational record of a staff member executing a booking
- **Support Thread:** Customer support conversation shared by customer and staff/admin responders
- **Live Wash Tracking:** Customer-facing progress snapshot derived from a wash session's status and timing
- **No-Show:** Booking where customer didn't arrive within cutoff window
- **Audit Log:** Immutable record of business action (who, what, when, why)
- **Batch Job:** Scheduled background task (e.g., monthly tier review)

---

**End of Backend Task Breakdown Document**

Generated for AutoWash Pro Backend Development  
Stack: Spring Boot + PostgreSQL (Modular Monolith)  
Analysis: May 2026

---

## APPENDIX C: Backend Error Contract for Frontend i18n

Frontend error display is translated by `next-intl`; backend must return stable machine-readable `errorCode` values and must not rely on localized backend messages for UI copy.

Required error response shape:

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Incorrect password",
  "errorCode": "INCORRECT_PASSWORD",
  "timestamp": "2026-07-19T03:35:55.305Z"
}
```

Optional field errors should use the existing `errors` array:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "errors": [
    { "field": "email", "message": "Email must be valid", "code": "INVALID_EMAIL" }
  ]
}
```

Frontend behavior depends on these rules:

- `errorCode` must be stable and uppercase snake case.
- Field errors, when present, are displayed before generic translated messages.
- Backend `message` is a fallback/debug string, not the primary localized UI copy.
- Keep auth/booking/combo errors mapped to explicit codes instead of generic 500s.

Important error codes currently verified or expected by frontend:

| errorCode | Backend scenario | Frontend expected VI | Frontend expected EN |
|-----------|------------------|----------------------|----------------------|
| `INCORRECT_PASSWORD` | Login with existing email and wrong password | `Mật khẩu không đúng.` | `The password is incorrect.` |
| `BOOKING_SLOT_FULL` | Booking slot has reached capacity | `Khung giờ này đã hết chỗ.` | `This booking slot is full.` |
| `VALIDATION_ERROR` | Request body/field validation failed | From `messages/vi.json` | From `messages/en.json` |
| `TOKEN_EXPIRED` | Expired access token | From `messages/vi.json` | From `messages/en.json` |
| `TOKEN_INVALID` | Invalid access token/session | From `messages/vi.json` | From `messages/en.json` |
| `INTERNAL_SERVER_ERROR` | Unexpected backend failure | From `messages/vi.json` | From `messages/en.json` |

Manual QA rerun on local ports:

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:3000`

Verified backend/API facts:

- `POST /api/v1/auth/login` with `customer@autowash.com` and wrong password returns `401` with `errorCode: INCORRECT_PASSWORD`.
- `POST /api/v1/auth/login` with `customer@autowash.com` and seeded password succeeds.
- `GET /api/v1/packages` returns package data for booking form.
- `GET /api/v1/services` returns active services/add-ons.
- `GET /api/v1/combos/available` returns combo data for checkout.
- `GET /api/v1/customers/vehicles` returns customer vehicle data when authenticated.
- `GET /api/v1/settings/public` returns operating hours and slot capacity settings.

Frontend smoke results dependent on backend:

| Item | Result | Backend note |
|------|--------|--------------|
| Login error | Pass | `INCORRECT_PASSWORD` returned correctly. |
| Booking flow | Pass partial | Booking form rendered real backend data; a booking was created successfully. `BOOKING_SLOT_FULL` still needs seeded full-slot data. |
| Combo checkout | Pass | Combo checkout rendered real backend data and purchase succeeded. |
| Google OAuth callback | Pass partial | Invalid callback state/code surfaces an error page; successful OAuth still needs staging credentials. |

Pending backend/data support for final QA:

- Seed or prepare a full booking slot to reproduce `BOOKING_SLOT_FULL` deterministically.
- Provide staging Google OAuth credentials/environment for successful OAuth callback testing.