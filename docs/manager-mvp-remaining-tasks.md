# Manager MVP Remaining Tasks

This document summarizes the remaining work from the four Manager task files after the current Manager MVP implementation.

## Current MVP Status

The current implementation supports the main demo flow:

- Manager Operations Queue with check-in, start wash, complete, transfer staff, cancel, workload overview, and polling refresh.
- Manager Staff workload/list UI with staff rating formatting fixes.
- Manager Reports dashboard MVP with auto refresh and operational summary sections.
- Manager Settings UI with real database persistence through Flyway migration `V102`, API read/update, notification template storage, reset/save behavior, and audit log.

## Remaining From `manager-operations.txt`

- Build the full right-side session detail panel that stays visible while the board is used.
- Add full filters for bay, staff, search, and focus mode.
- Add a dedicated intervention section for issues that need manager action.
- Expand the board to the full requested pipeline:
  - Waiting check-in
  - Checked-in
  - Waiting start
  - In progress
  - Waiting inspection
  - Completed
- Add detailed session information:
  - Customer phone
  - Bay
  - Service duration
  - Timeline
  - Auto assignment monitor
- Add assignment audit/reason display.
- Add smart transfer suggestions and transfer option scoring.
- Add dedicated manager operations endpoints such as:
  - `/api/v1/manager/operations/command-center`
  - `/api/v1/manager/operations/interventions`
  - `/api/v1/manager/operations/metrics`
  - `/api/v1/manager/operations/board`
  - `/api/v1/manager/operations/sessions/{sessionId}/transfer-options`

## Remaining From `manager-settings.txt`

- Add impact preview before save.
- Add confirm modal for reset and high-impact save actions.
- Add more assignment rules:
  - Prioritize low KPI staff
  - Respect customer requested staff
  - Block low-rated staff for premium services
  - Premium service minimum rating
- Add operation permission settings:
  - Can transfer staff
  - Can override auto assignment
  - Can mark priority
  - Can cancel session
  - Require transfer reason
- Add a real operational notification sender for staff.
- Add priority booking/session marking tool.
- Add incident report/admin request form.
- Expand notification templates to full CRUD:
  - Create custom template
  - Edit template metadata
  - Delete custom template
  - Protect default templates from deletion
- Connect saved notification templates to actual backend notification events.
- Add audit log filters by type and date range.
- Add dedicated settings endpoints if the team wants the exact task contract:
  - `/api/v1/manager/settings/operations`
  - `/api/v1/manager/settings/operations/reset-default`
  - `/api/v1/manager/settings/operations/preview-impact`
  - `/api/v1/manager/settings/operations/audit-logs`

## Remaining From `manager-staff.txt`

- Add full staff CRUD:
  - Create staff
  - Edit staff
  - Suspend/reactivate account
  - Reset password
- Add staff export report.
- Add team performance chart by day/week/month.
- Add full staff table with pagination, search, status filter, and role filter.
- Add a right-side staff quick detail panel.
- Add active bookings per staff.
- Add staff rating summary and recent reviews.
- Add staff detail drawer/page.
- Add dedicated manager staff endpoints such as:
  - `/api/v1/manager/staff`
  - `/api/v1/manager/staff/summary`
  - `/api/v1/manager/staff/performance`
  - `/api/v1/manager/staff/{staffId}/quick-detail`
  - `/api/v1/manager/staff/{staffId}/active-bookings`
  - `/api/v1/manager/staff/{staffId}/rating-summary`
  - `/api/v1/manager/staff/{staffId}/reviews`

## Remaining From `managerreports.txt`

- Add Excel export.
- Add PDF export.
- Add send report flow.
- Add full report filters:
  - Range type
  - From date
  - To date
  - Compare previous period
  - Bay
  - Staff
  - Service
- Add full operations funnel.
- Add revenue and booking trend with previous-period comparison.
- Add service quality section with sort by booking count or revenue.
- Add drill-down behavior from insight cards.
- Add dedicated manager report endpoints such as:
  - `/api/v1/manager/reports/dashboard`
  - `/api/v1/manager/reports/export`
  - `/api/v1/manager/reports/send`
  - `/api/v1/manager/reports/funnel`
  - `/api/v1/manager/reports/trend`
  - `/api/v1/manager/reports/service-quality`

## Recommended Next Order

1. Finish Manager Staff CRUD because it is visible and easy for reviewers to test.
2. Add Operations session detail panel and timeline because it strengthens the core MVP flow.
3. Connect notification templates to real notification events.
4. Add report export/send after the dashboard data is stable.
5. Add advanced suggestions, assignment audit, and preview-impact rules last.
