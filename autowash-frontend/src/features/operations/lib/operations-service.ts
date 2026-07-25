import { apiRequest } from "@/shared/lib/api";
import type {
  AdminSessionHistoryParams,
  CheckInWashSessionResponse,
  CompleteSessionRequest,
  CompleteSessionResponse,
  CompleteWashSessionResponse,
  CreateWashSessionResponse,
  EligibleSessionBooking,
  OperationsQueue,
  QueueWashSessionResponse,
  StaffDashboardSummary,
  StaffOption,
  StaffSessionHistoryParams,
  StaffSessionHistoryResponse,
  StaffTodayResponse,
  StartSessionRequest,
  StartSessionResponse,
  StartWashSessionResponse,
  CancelWashSessionResponse,
  TransferWashSessionResponse,
} from "@/entities/operations";

const SESSION_BASE_URL = "/operations/sessions";

export function createWashSession(bookingId: string, notes?: string) {
  return apiRequest<CreateWashSessionResponse, { bookingId: string; notes?: string }>({
    method: "POST",
    url: SESSION_BASE_URL,
    data: { bookingId, notes },
  });
}

export function managerCheckInBooking(bookingId: string) {
  return apiRequest<{ bookingId: string; sessionId: string; status: string; assignedStaffId: string | null; assignedStaffName: string | null; assignedBay: string | null; checkedInAt: string | null }>({
    method: "POST",
    url: `/manager/operations/bookings/${bookingId}/check-in`,
  });
}

export function getOperationsQueue() {
  return apiRequest<OperationsQueue>({
    method: "GET",
    url: "/operations/queue",
  });
}

export function getStaffDashboardSummary() {
  return apiRequest<StaffDashboardSummary>({
    method: "GET",
    url: "/operations/staff/summary",
  });
}

export function getActiveStaffOptions() {
  return apiRequest<StaffOption[]>({
    method: "GET",
    url: "/operations/staff/active",
  });
}

export function getEligibleSessionBookings(date?: string) {
  return apiRequest<EligibleSessionBooking[]>({
    method: "GET",
    url: "/operations/bookings/eligible-sessions",
    params: { limit: 5, ...(date ? { date } : {}) },
  });
}

export function queueWashSession(sessionId: string) {
  return apiRequest<QueueWashSessionResponse>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/queue`,
  });
}

export function checkInWashSession(sessionId: string) {
  return apiRequest<CheckInWashSessionResponse>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/check-in`,
  });
}

export function startWashSession(sessionId: string) {
  return apiRequest<StartWashSessionResponse>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/start`,
  });
}

export function completeWashSession(sessionId: string) {
  return apiRequest<CompleteWashSessionResponse>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/complete`,
  });
}

export function cancelWashSession(sessionId: string, reason: string, faultType?: string) {
  return apiRequest<CancelWashSessionResponse, { reason: string; faultType?: string }>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/cancel`,
    data: { reason, faultType },
  });
}

export function transferWashSession(sessionId: string, toStaffId: string, reason?: string) {
  return apiRequest<TransferWashSessionResponse, { toStaffId: string; reason?: string }>({
    method: "POST",
    url: `${SESSION_BASE_URL}/${sessionId}/transfer`,
    data: { toStaffId, reason },
  });
}

// â”€â”€â”€ Staff Today (My Sessions) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function getStaffSessionHistory(params: StaffSessionHistoryParams = {}) {
  return apiRequest<StaffSessionHistoryResponse>({
    method: "GET",
    url: "/operations/my-sessions/history",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 5,
      period: params.period ?? "ALL",
      ...(params.date && { date: params.date }),
      ...(params.servicePackage && { servicePackage: params.servicePackage }),
      rating: params.rating ?? "ALL",
      ...(params.search && { search: params.search }),
      sort: params.sort ?? "COMPLETED_DESC",
    },
  });
}

export function getManagerSessionHistory(params: StaffSessionHistoryParams = {}) {
  return apiRequest<StaffSessionHistoryResponse>({
    method: "GET",
    url: "/operations/manager/sessions/history",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 5,
      period: params.period ?? "ALL",
      ...(params.date && { date: params.date }),
      ...(params.servicePackage && { servicePackage: params.servicePackage }),
      rating: params.rating ?? "ALL",
      ...(params.search && { search: params.search }),
      sort: params.sort ?? "COMPLETED_DESC",
      ...(params.staffId && { staffId: params.staffId }),
    },
  });
}

export function getStaffTodaySessions(date?: string) {
  const params = date ? { date } : undefined;
  return apiRequest<StaffTodayResponse>({
    method: "GET",
    url: "/operations/my-sessions/today",
    params,
  });
}

export function startStaffSession(sessionId: string) {
  const payload: StartSessionRequest = { startedAt: new Date().toISOString() };
  return apiRequest<StartSessionResponse, StartSessionRequest>({
    method: "POST",
    url: `/operations/sessions/${sessionId}/start`,
    data: payload,
  });
}

export function completeStaffSession(sessionId: string, staffNote?: string) {
  const payload: CompleteSessionRequest = {
    completedAt: new Date().toISOString(),
    staffNote,
  };
  return apiRequest<CompleteSessionResponse, CompleteSessionRequest>({
    method: "POST",
    url: `/operations/sessions/${sessionId}/complete`,
    data: payload,
  });
}

export function getAdminSessionHistory(params: AdminSessionHistoryParams = {}) {
  return apiRequest<StaffSessionHistoryResponse>({
    method: "GET",
    url: "/operations/admin/session-history",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      period: params.period ?? "ALL",
      ...(params.staffId && params.staffId !== "ALL" && { staffId: params.staffId }),
      rating: params.rating ?? "ALL",
      ...(params.search && { search: params.search }),
      sort: params.sort ?? "COMPLETED_DESC",
    },
  });
}

export function sendOperationsNotice(payload: { recipient: string; noticeType: string; priority: string; message: string }) {
  return apiRequest<void, typeof payload>({
    method: "POST",
    url: "/manager/operations/notices",
    data: payload,
  });
}

export function exportManagerReport(format: string = "xlsx") {
  return apiRequest<{ format: string; message: string }>({
    method: "GET",
    url: "/manager/reports/export",
    params: { format },
  });
}

export function sendManagerReport(email: string, format: string = "xlsx") {
  return apiRequest<{ format: string; message: string }, { email: string; format: string }>({
    method: "POST",
    url: "/manager/reports/send",
    data: { email, format },
  });
}

export function getManagerReportsDashboard(params: {
  rangeType: string;
  fromDate?: string;
  toDate?: string;
  comparePrevious?: boolean;
  staffId?: string;
  serviceId?: string;
}) {
  return apiRequest<any>({
    method: "GET",
    url: "/manager/reports/dashboard",
    params,
  });
}
