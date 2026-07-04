import { apiClient, apiRequest } from "@/shared/lib/api";
import type { ApiPaginatedResponse, ApiSuccessResponse } from "@/shared/types/api.types";
import type {
  AdminAccount,
  AdminAccountsFilters,
  AdminAccountsPage,
  AdminBooking,
  AdminBookingsFilters,
  AdminBookingsPage,
  AdminBusinessHealthReport,
  AdminCustomerDetail,
  AdminCustomerVehicle,
  AdminCustomerVehiclesPage,
  AdminPointTransaction,
  AdminPointTransactionsPage,
  AdminTierHistoryItem,
  AdminTierHistoryPage,
  AdminWashHistoryItem,
  AdminWashHistoryPage,
  CreateAdminStaffPayload,
  ReportAnalysisGroup,
  ReportRangeKey,
  UpdateAdminCustomerRolePayload,
  UpdateAdminCustomerRoleResult,
  UpdateAdminCustomerStatusPayload,
  UpdateAdminCustomerStatusResult,
} from "@/entities/reports";
import type { BookingDetail } from "@/entities/bookings";

export async function listAdminAccounts(
  filters: AdminAccountsFilters,
  page = 1,
  limit = 20,
): Promise<AdminAccountsPage> {
  const response = await apiClient.get<ApiPaginatedResponse<AdminAccount>>("/admin/accounts", {
    params: {
      ...filters,
      page,
      limit,
    },
  });

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function listAdminBookings(
  filters: AdminBookingsFilters,
  page = 1,
  limit = 20,
): Promise<AdminBookingsPage> {
  const response = await apiClient.get<ApiPaginatedResponse<AdminBooking>>("/admin/bookings", {
    params: {
      ...filters,
      page,
      limit,
    },
  });

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getAdminBookingDetail(id: string): Promise<BookingDetail> {
  const response = await apiClient.get<ApiSuccessResponse<BookingDetail>>(`/admin/bookings/${id}`);
  return response.data.data;
}

export async function getAdminBusinessHealthReport(params: {
  range: ReportRangeKey;
  analysisGroup: ReportAnalysisGroup;
}): Promise<AdminBusinessHealthReport> {
  const response = await apiClient.get<ApiSuccessResponse<AdminBusinessHealthReport>>(
    "/admin/reports/business-health",
    {
      params,
    },
  );
  return response.data.data;
}

export async function getAdminCustomerDetail(customerId: string): Promise<AdminCustomerDetail> {
  const response = await apiClient.get<ApiSuccessResponse<AdminCustomerDetail>>(`/admin/customers/${customerId}`);
  return response.data.data;
}

export async function getAdminAccountDetail(accountId: string): Promise<AdminAccount> {
  const response = await apiClient.get<ApiSuccessResponse<AdminAccount>>(`/admin/accounts/${accountId}`);
  return response.data.data;
}

export async function listAdminCustomerVehicles(
  customerId: string,
  params: { page?: number; limit?: number } = {},
): Promise<AdminCustomerVehiclesPage> {
  const response = await apiClient.get<ApiPaginatedResponse<AdminCustomerVehicle>>(
    `/admin/customers/${customerId}/vehicles`,
    {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
    },
  );

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function listAdminCustomerTierHistory(
  customerId: string,
  params: { page?: number; limit?: number } = {},
): Promise<AdminTierHistoryPage> {
  const response = await apiClient.get<ApiPaginatedResponse<AdminTierHistoryItem>>(
    `/admin/customers/${customerId}/tier-history`,
    {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
    },
  );

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function listAdminCustomerWashHistory(
  customerId: string,
  params: {
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
  } = {},
): Promise<AdminWashHistoryPage> {
  try {
    return await requestAdminCustomerWashHistory(customerId, "wash-sessions", params);
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      return requestAdminCustomerWashHistory(customerId, "wash-history", params);
    }

    throw error;
  }
}

export async function listAdminCustomerPointTransactions(
  customerId: string,
  params: {
    page?: number;
    limit?: number;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {},
): Promise<AdminPointTransactionsPage> {
  const response = await apiClient.get<ApiPaginatedResponse<AdminPointTransaction>>(
    `/admin/customers/${customerId}/point-transactions`,
    {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        type: params.type,
        dateFrom: normalizeDateTimeParam(params.dateFrom),
        dateTo: normalizeDateTimeParam(params.dateTo),
      },
    },
  );

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}

export function updateAdminCustomerStatus(
  customerId: string,
  payload: UpdateAdminCustomerStatusPayload,
) {
  return apiRequest<UpdateAdminCustomerStatusResult, UpdateAdminCustomerStatusPayload>({
    method: "PUT",
    url: `/admin/customers/${customerId}/status`,
    data: payload,
  });
}

export function updateAdminCustomerRole(
  customerId: string,
  payload: UpdateAdminCustomerRolePayload,
) {
  return apiRequest<UpdateAdminCustomerRoleResult, UpdateAdminCustomerRolePayload>({
    method: "PUT",
    url: `/admin/customers/${customerId}/role`,
    data: payload,
  });
}

export function updateAdminCustomerTier(customerId: string, payload: { tier: string }) {
  return apiRequest<{ customerId: string; tier: string; updatedAt: string }, { tier: string }>({
    method: "PUT",
    url: `/admin/customers/${customerId}/tier`,
    data: payload,
  });
}

export function createAdminStaff(payload: CreateAdminStaffPayload) {
  return apiRequest<AdminAccount, CreateAdminStaffPayload>({
    method: "POST",
    url: "/admin/staff",
    data: payload,
  });
}

function normalizeDateTimeParam(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
}

async function requestAdminCustomerWashHistory(
  customerId: string,
  path: "wash-sessions" | "wash-history",
  params: {
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
  },
): Promise<AdminWashHistoryPage> {
  const response = await apiClient.get<ApiPaginatedResponse<AdminWashHistoryItem>>(
    `/admin/customers/${customerId}/${path}`,
    {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        dateFrom: normalizeDateTimeParam(params.dateFrom),
        dateTo: normalizeDateTimeParam(params.dateTo),
      },
    },
  );

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}

function isEndpointUnavailable(error: unknown) {
  if (!error || typeof error !== "object" || !("statusCode" in error)) {
    return false;
  }

  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return statusCode === 404 || statusCode === 405;
}
