"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminReportingScope,
  adminAccountsQueryKey,
  adminBookingsQueryKey,
  adminCustomerDetailQueryKey,
  adminCustomerPointTransactionsQueryKey,
  adminCustomerTierHistoryQueryKey,
  adminCustomerVehiclesQueryKey,
  adminCustomerWashHistoryQueryKey,
} from "@/features/reports/hooks/admin-reporting-query";
import {
  createAdminStaff,
  getAdminAccountDetail,
  getAdminCustomerDetail,
  listAdminAccounts,
  listAdminBookings,
  listAdminCustomerPointTransactions,
  listAdminCustomerTierHistory,
  listAdminCustomerVehicles,
  listAdminCustomerWashHistory,
  updateAdminCustomerRole,
  updateAdminCustomerStatus,
} from "@/features/reports/api/admin-reporting-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type {
  AdminAccountsFilters,
  AdminAccountsPage,
  AdminAccount,
  AdminBookingsFilters,
  AdminBookingsPage,
  AdminCustomerDetail,
  AdminCustomerVehiclesPage,
  AdminPointTransactionsPage,
  AdminTierHistoryPage,
  AdminWashHistoryPage,
  CreateAdminStaffPayload,
  UpdateAdminCustomerRolePayload,
  UpdateAdminCustomerRoleResult,
  UpdateAdminCustomerStatusPayload,
  UpdateAdminCustomerStatusResult,
} from "@/entities/reports";

function useAdminReportingContext() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;
  const enabled = Boolean(accessToken && userId && user?.role === "ADMIN");

  return { userId, enabled };
}

export function useAdminBookings(
  filters: AdminBookingsFilters,
  page = 1,
  limit = 20,
  options?: { enabled?: boolean },
) {
  const { userId, enabled } = useAdminReportingContext();

  return useQuery<AdminBookingsPage, ApiErrorResponse>({
    queryKey: adminBookingsQueryKey(userId, filters, page, limit),
    queryFn: () => listAdminBookings(filters, page, limit),
    enabled: enabled && (options?.enabled ?? true),
  });
}

export function useAdminAccounts(
  filters: AdminAccountsFilters,
  page = 1,
  limit = 20,
  options?: { enabled?: boolean },
) {
  const { userId, enabled } = useAdminReportingContext();

  return useQuery<AdminAccountsPage, ApiErrorResponse>({
    queryKey: adminAccountsQueryKey(userId, filters, page, limit),
    queryFn: () => listAdminAccounts(filters, page, limit),
    enabled: enabled && (options?.enabled ?? true),
  });
}

export function useAdminCustomerDetail(customerId: string, options?: { enabled?: boolean }) {
  const { userId, enabled } = useAdminReportingContext();

  return useQuery<AdminCustomerDetail, ApiErrorResponse>({
    queryKey: adminCustomerDetailQueryKey(userId, customerId),
    queryFn: () => getAdminCustomerDetail(customerId),
    enabled: enabled && customerId.length > 0 && (options?.enabled ?? true),
  });
}

export function useAdminCustomerWashHistory(
  customerId: string,
  params: { page?: number; limit?: number; dateFrom?: string; dateTo?: string },
  options?: { enabled?: boolean },
) {
  const { userId, enabled } = useAdminReportingContext();

  return useQuery<AdminWashHistoryPage, ApiErrorResponse>({
    queryKey: adminCustomerWashHistoryQueryKey(userId, customerId, params),
    queryFn: () => listAdminCustomerWashHistory(customerId, params),
    enabled: enabled && customerId.length > 0 && (options?.enabled ?? true),
  });
}

export function useAdminCustomerVehicles(
  customerId: string,
  params: { page?: number; limit?: number },
  options?: { enabled?: boolean },
) {
  const { userId, enabled } = useAdminReportingContext();

  return useQuery<AdminCustomerVehiclesPage, ApiErrorResponse>({
    queryKey: adminCustomerVehiclesQueryKey(userId, customerId, params),
    queryFn: () => listAdminCustomerVehicles(customerId, params),
    enabled: enabled && customerId.length > 0 && (options?.enabled ?? true),
  });
}

export function useAdminCustomerTierHistory(
  customerId: string,
  params: { page?: number; limit?: number },
  options?: { enabled?: boolean },
) {
  const { userId, enabled } = useAdminReportingContext();

  return useQuery<AdminTierHistoryPage, ApiErrorResponse>({
    queryKey: adminCustomerTierHistoryQueryKey(userId, customerId, params),
    queryFn: () => listAdminCustomerTierHistory(customerId, params),
    enabled: enabled && customerId.length > 0 && (options?.enabled ?? true),
  });
}

export function useAdminCustomerPointTransactions(
  customerId: string,
  params: { page?: number; limit?: number; type?: string; dateFrom?: string; dateTo?: string },
  options?: { enabled?: boolean },
) {
  const { userId, enabled } = useAdminReportingContext();

  return useQuery<AdminPointTransactionsPage, ApiErrorResponse>({
    queryKey: adminCustomerPointTransactionsQueryKey(userId, customerId, params),
    queryFn: () => listAdminCustomerPointTransactions(customerId, params),
    enabled: enabled && customerId.length > 0 && (options?.enabled ?? true),
  });
}

export function useUpdateAdminCustomerStatus(customerId: string) {
  return useMutation<UpdateAdminCustomerStatusResult, ApiErrorResponse, UpdateAdminCustomerStatusPayload>({
    mutationFn: (payload) => updateAdminCustomerStatus(customerId, payload),
  });
}

export function useAdminAccountDetail(accountId: string, options?: { enabled?: boolean }) {
  const { userId, enabled } = useAdminReportingContext();

  return useQuery<AdminAccount, ApiErrorResponse>({
    queryKey: [...adminReportingScope(userId), "account-detail", accountId] as const,
    queryFn: () => getAdminAccountDetail(accountId),
    enabled: enabled && accountId.length > 0 && (options?.enabled ?? true),
  });
}

export function useUpdateAdminCustomerRole(customerId: string) {
  const queryClient = useQueryClient();
  const { userId } = useAdminReportingContext();

  return useMutation<UpdateAdminCustomerRoleResult, ApiErrorResponse, UpdateAdminCustomerRolePayload>({
    mutationFn: (payload) => updateAdminCustomerRole(customerId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminReportingScope(userId) });
    },
  });
}

export function useUpdateAdminCustomerTier(customerId: string) {
  const queryClient = useQueryClient();
  const { userId } = useAdminReportingContext();

  return useMutation<
    import("@/entities/reports").UpdateAdminCustomerTierResult,
    ApiErrorResponse,
    import("@/entities/reports").UpdateAdminCustomerTierPayload
  >({
    mutationFn: (payload) => import("@/features/reports/api/admin-reporting-service").then(m => m.updateAdminCustomerTier(customerId, payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminReportingScope(userId) });
    },
  });
}

export function useCreateAdminStaff() {
  const queryClient = useQueryClient();
  const { userId } = useAdminReportingContext();

  return useMutation<AdminAccount, ApiErrorResponse, CreateAdminStaffPayload>({
    mutationFn: createAdminStaff,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminReportingScope(userId) });
    },
  });
}
