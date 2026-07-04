import { apiClient } from "@/shared/lib/api";
import type { ApiPaginatedResponse } from "@/shared/types/api.types";

export type CustomerVoucherResponse = {
  code: string;
  name: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  endAt: string;
  targetTiers: string[];
};

export async function listActiveCustomerVouchers(page = 1, limit = 20) {
  const response = await apiClient.get<ApiPaginatedResponse<CustomerVoucherResponse>>(
    "/vouchers/active",
    { params: { page, limit } }
  );

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}
