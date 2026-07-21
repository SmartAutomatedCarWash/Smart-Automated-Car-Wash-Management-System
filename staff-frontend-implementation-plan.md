# Staff Frontend Implementation Plan

## 1. Goal

Build a Staff workspace that matches the AutoWash operation flow:

- Manager checks in customers, creates wash sessions, and assigns staff.
- Staff only focuses on assigned wash work.
- Staff can start, pause, complete, report issues, and request transfer for a session.
- Staff can view assigned/active/completed sessions by day in a compact calendar UI similar to Google Calendar.

The Staff UI should be cleaner and more action-focused than Manager pages.

## 2. Staff Navigation

Recommended Staff menu:

1. `My Sessions`
2. `Calendar`
3. `History`
4. `Profile`

Optional:

- `Issues` can be a separate page later, but for the first version it should stay inside session actions and session detail.

## 3. Main Flow

### Booking/Session Flow

```text
Manager check-in
  -> Manager creates wash session
  -> Manager assigns staff
  -> Staff sees session in My Sessions and Calendar
  -> Staff starts wash
  -> Booking/session status changes to washing
  -> Staff completes wash
  -> Booking/session status changes to successful/completed
```

### Transfer Request Flow

```text
Staff opens assigned session
  -> Staff clicks Request Transfer
  -> Staff enters reason and optional suggested replacement
  -> Request is sent to Manager
  -> Session shows Transfer Requested badge
  -> Manager approves/rejects
  -> Staff receives notification
```

Staff must not directly reassign a session. Only Manager can approve reassignment.

## 4. Page: My Sessions

### Purpose

This is the main working screen for Staff.

### Data Scope

Show only sessions assigned to the logged-in staff.

Do not show all staff sessions unless Manager grants permission in a later feature.

### UI Sections

Header summary cards:

- `Waiting`: sessions assigned but not started.
- `Washing`: sessions currently in progress.
- `Completed Today`: sessions completed today.
- `Issues`: sessions with reported issues.

Filters:

- Date picker.
- Search by plate/customer/service.
- Status chips:
  - `All`
  - `Assigned`
  - `Waiting`
  - `Washing`
  - `Completed`
  - `Issue`
  - `Transfer Requested`

Session list:

- Plate number.
- Customer name.
- Service name.
- Appointment time.
- Estimated duration.
- Status badge.
- Action button.

### Action Rules

For `Assigned` or `Waiting`:

- Primary action: `Start Wash`
- Secondary actions: `View Detail`, `Request Transfer`

For `Washing`:

- Primary action: `Complete`
- Secondary actions: `Pause`, `Report Issue`, `View Detail`

For `Completed`:

- Primary action: `View Detail`
- Show completed timestamp.

For `Issue`:

- Primary action: `View Issue`
- Secondary actions: `Add Note`

For `Transfer Requested`:

- Disable direct start/complete if business rules require Manager approval.
- Show request status: `Pending Manager Approval`.

## 5. Page: Session Detail

### Purpose

Provide just enough information for Staff to finish the wash correctly.

### Information Layout

Main information:

- Plate number.
- Vehicle type.
- Customer name.
- Service package.
- Add-on services.
- Appointment time.
- Estimated duration.
- Important notes.
- Assigned bay/area.
- Current status.

Checklist:

- Pre-wash inspection.
- Exterior rinse.
- Foam wash.
- Wheel/tire cleaning.
- Interior vacuum if included.
- Drying.
- Final inspection.

Issue notes:

- Issue type.
- Description.
- Photos if needed.

Media:

- Before photos.
- After photos.

### Sticky Action Bar

Keep a bottom action bar for quick work:

- `Start Wash`
- `Pause`
- `Complete`
- `Report Issue`
- `Request Transfer`

On mobile/tablet, these actions should be large and thumb-friendly.

## 6. Page: Staff Calendar

### Purpose

Show assigned and active sessions in a calendar layout, similar to Google Calendar.

### Views

First version:

- `Day view`
- `Week view`

Optional later:

- `Month view`
- `Agenda/List view`

### Day View Design

Structure:

- Left time column: `07:00`, `08:00`, `09:00`, etc.
- Main grid shows session blocks by time.
- Each session block is compact and clickable.

Session block content:

- Plate number.
- Service name.
- Time range.
- Status.

Example:

```text
51F-345.67
Quick Wash
08:15 - 08:40
Washing
```

### Week View Design

Structure:

- Columns: Monday to Sunday.
- Rows: time ranges.
- Session blocks placed in matching day/time.

### Calendar Filters

- Date picker.
- Today button.
- Previous/next day or week.
- Status filter.
- Service filter.
- Bay/area filter if available.

### Status Colors

- `Assigned`: blue.
- `Waiting`: cyan.
- `Washing`: orange.
- `Completed`: green.
- `Issue`: red.
- `Transfer Requested`: violet or slate.

### Click Behavior

Clicking a calendar block opens a quick detail popup.

Quick detail popup:

- Plate number.
- Customer name.
- Service.
- Time.
- Status.
- Staff actions:
  - `View Detail`
  - `Start`
  - `Complete`
  - `Report Issue`
  - `Request Transfer`

## 7. Page: History

### Purpose

Let Staff review completed work and KPI performance.

### UI Sections

Summary cards:

- Total completed sessions.
- Total working time.
- Average wash duration.
- Reported issues.
- Customer rating if available.

KPI card:

- Daily KPI target.
- Completed sessions.
- Progress bar.
- Status:
  - `On Track`
  - `Behind`
  - `Completed`

History table/list:

- Plate number.
- Service.
- Completed time.
- Duration.
- Rating.
- Issue status.

Filters:

- Date.
- Week.
- Month.
- Service.
- Status.

## 8. Page: Profile

### Purpose

Show Staff personal work information.

### Content

- Staff name.
- Role.
- Phone.
- Assigned shift today.
- Assigned bay/area.
- KPI target.
- Completed sessions today.
- Current active session.
- Rating.
- Weekly schedule.

### Actions

- View weekly schedule.
- Submit leave request.
- Submit issue report to Manager/Admin if needed.

## 9. Transfer Request Modal

### Trigger

Available from:

- My Sessions row/card.
- Session Detail.
- Calendar quick popup.

### Fields

- Current session summary.
- Reason:
  - `Health issue`
  - `Overloaded`
  - `Need special skill`
  - `Equipment issue`
  - `Other`
- Suggested replacement staff.
- Message to Manager.

### Buttons

- `Cancel`
- `Send Request`

### Success State

Show toast/popup:

```text
Transfer request sent to Manager.
```

### Failure State

Show toast/popup:

```text
Could not send transfer request. Please try again.
```

## 10. Report Issue Modal

### Trigger

Available from:

- My Sessions.
- Session Detail.
- Calendar quick popup.

### Fields

- Issue type:
  - `Vehicle damage`
  - `Customer note`
  - `Equipment issue`
  - `Late session`
  - `Other`
- Description.
- Photo upload.
- Mark as urgent.

### Result

- Sends issue to Manager.
- Adds issue badge to session.
- Adds notification for Manager.
- Shows success/failure toast for Staff.

## 11. Staff Notifications

### Header Bell

Staff header should include a notification bell like Manager.

Notification types:

- New assigned session.
- Session updated by Manager.
- Transfer request approved.
- Transfer request rejected.
- Priority vehicle alert.
- Shift changed.
- Manager note.

### Popup Behavior

Click bell:

- Open notification list.
- Show unread badge.
- Clicking a notification opens detail popup or navigates to session.

### Toast Behavior

Show toast after actions:

- Start wash success/failure.
- Complete success/failure.
- Report issue success/failure.
- Transfer request success/failure.

## 12. Shared Components To Reuse

Use existing project patterns:

- `RoleWorkspaceShell`
- `workspace-nav`
- `workspace-header-meta`
- shared date picker component
- operations demo data
- operations service layer
- Zustand store pattern for manager/staff notifications
- Tailwind cards/buttons/badges from current Manager pages

Create or extend:

- `staff-calendar-page.tsx`
- `staff-session-calendar.tsx`
- `staff-session-card.tsx`
- `staff-session-action-bar.tsx`
- `staff-transfer-request-modal.tsx`
- `staff-issue-report-modal.tsx`
- `staff-notification.store.ts`

## 13. Suggested Routes

```text
/staff/my-sessions
/staff/calendar
/staff/sessions/[id]
/staff/sessions/history
/staff/profile
```

Keep existing routes working if already used:

```text
/staff/dashboard
/staff/operations
/staff/check-in
```

These can redirect to the new Staff flow later if no longer needed.

## 14. API Integration Plan

First version can use demo/local data if backend endpoints are incomplete.

Expected endpoints later:

```text
GET /api/staff/me/sessions?date=YYYY-MM-DD&status=
GET /api/staff/me/sessions/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/staff/me/sessions/{id}
PATCH /api/staff/me/sessions/{id}/start
PATCH /api/staff/me/sessions/{id}/pause
PATCH /api/staff/me/sessions/{id}/complete
POST /api/staff/me/sessions/{id}/issues
POST /api/staff/me/sessions/{id}/transfer-requests
GET /api/staff/me/notifications
PATCH /api/staff/me/notifications/{id}/read
```

## 15. Implementation Order

1. Update Staff navigation and header metadata.
2. Create shared Staff session data model for UI.
3. Redesign `My Sessions`.
4. Add Staff calendar page with day/week view.
5. Add session quick detail popup from calendar.
6. Add transfer request modal.
7. Add issue report modal.
8. Build session detail page with checklist and sticky action bar.
9. Add Staff notification store and header bell integration.
10. Update History page with KPI and filters.
11. Update Profile page with shift/KPI/schedule.
12. Run frontend tests.
13. Run frontend build when dev server is stopped.

## 16. Acceptance Criteria

- Staff can view only their assigned sessions.
- Staff can filter sessions by date and status.
- Staff can view sessions in a Google Calendar-like day/week UI.
- Staff can start, pause, complete, and report issue for valid sessions.
- Staff can request transfer instead of directly changing assignee.
- Calendar session blocks are small, clear, and clickable.
- Staff receives clear notifications and toast feedback.
- UI is compact, clean, responsive, and consistent with Manager pages.
- Existing Manager pages are not broken.
- Frontend tests pass.
- Frontend build passes before PR-ready push.

