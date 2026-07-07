import { apiClient, apiRequest } from "@/shared/lib/api";
import type { ApiPaginatedResponse, ApiSuccessResponse } from "@/shared/types/api.types";
import type {
  AdminVoucher,
  AdminVoucherRedemptionPage,
} from "@/entities/vouchers";

export async function listAdminVouchers(): Promise<AdminVoucher[]> {
  const response = await apiClient.get<ApiSuccessResponse<AdminVoucher[]>>("/admin/vouchers");
  return response.data.data;
}

export async function listAdminVoucherRedemptions(params?: {
  page?: number;
  limit?: number;
  searchQuery?: string;
}): Promise<AdminVoucherRedemptionPage> {
  const response = await apiClient.get<ApiPaginatedResponse<AdminVoucherRedemptionPage["items"][number]>>(
    "/admin/vouchers/redemptions",
    {
      params,
    },
  );

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}

export function createAdminVoucher(payload: import("@/entities/vouchers").AdminVoucherRequest) {
  return apiRequest<AdminVoucher, import("@/entities/vouchers").AdminVoucherRequest>({
    method: "POST",
    url: "/admin/vouchers",
    data: payload,
  });
}

export function updateAdminVoucher(code: string, payload: import("@/entities/vouchers").AdminVoucherRequest) {
  return apiRequest<AdminVoucher, import("@/entities/vouchers").AdminVoucherRequest>({
    method: "PUT",
    url: `/admin/vouchers/${code}`,
    data: payload,
  });
}

export function deleteAdminVoucher(code: string) {
  return apiRequest<AdminVoucher>({
    method: "DELETE",
    url: `/admin/vouchers/${code}`,
  });
}

