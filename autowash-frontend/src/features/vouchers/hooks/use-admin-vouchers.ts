"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAdminVoucherRedemptions, listAdminVouchers, createAdminVoucher, updateAdminVoucher, deleteAdminVoucher } from "@/features/vouchers/api/admin-vouchers-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { AdminVoucher, AdminVoucherRedemptionPage, AdminVoucherRequest } from "@/entities/vouchers";

function useAdminVoucherQueryContext() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;
  const enabled = Boolean(accessToken && userId && user?.role === "ADMIN");

  return { userId, enabled };
}

export function useAdminVouchers() {
  const { userId, enabled } = useAdminVoucherQueryContext();

  return useQuery<AdminVoucher[], ApiErrorResponse>({
    queryKey: ["admin-vouchers", userId, "catalog"],
    queryFn: listAdminVouchers,
    enabled,
  });
}

export function useAdminVoucherRedemptions(page = 1, limit = 20, searchQuery?: string) {
  const { userId, enabled } = useAdminVoucherQueryContext();

  return useQuery<AdminVoucherRedemptionPage, ApiErrorResponse>({
    queryKey: ["admin-vouchers", userId, "redemptions", page, limit, searchQuery ?? ""],
    queryFn: () => listAdminVoucherRedemptions({ page, limit, searchQuery }),
    enabled,
  });
}

export function useCreateAdminVoucher() {
  const queryClient = useQueryClient();
  const { userId } = useAdminVoucherQueryContext();

  return useMutation<AdminVoucher, ApiErrorResponse, AdminVoucherRequest>({
    mutationFn: createAdminVoucher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers", userId, "catalog"] });
    },
  });
}

export function useUpdateAdminVoucher() {
  const queryClient = useQueryClient();
  const { userId } = useAdminVoucherQueryContext();

  return useMutation<AdminVoucher, ApiErrorResponse, { code: string; payload: AdminVoucherRequest }>({
    mutationFn: ({ code, payload }) => updateAdminVoucher(code, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers", userId, "catalog"] });
    },
  });
}

export function useDeleteAdminVoucher() {
  const queryClient = useQueryClient();
  const { userId } = useAdminVoucherQueryContext();

  return useMutation<AdminVoucher, ApiErrorResponse, string>({
    mutationFn: deleteAdminVoucher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers", userId, "catalog"] });
    },
  });
}

