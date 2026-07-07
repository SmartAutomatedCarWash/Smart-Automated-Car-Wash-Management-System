import { apiClient } from "@/shared/lib/api";
import type { ApiPaginatedResponse } from "@/shared/types/api.types";

export type CustomerVoucherResponse = {
  code: string;
  name: string;
  discountType: "PERCENT" | "FIXED_AMOUNT" | "FREE_SERVICE";
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

export type MyVoucherResponse = {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: "PERCENT" | "FIXED_AMOUNT" | "FREE_SERVICE";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  issuedAt: string;
  expiredAt: string;
  status: string;
  targetTiers: string[];
};

export async function listMyVouchers(page = 1, limit = 20) {
  const response = await apiClient.get<ApiPaginatedResponse<MyVoucherResponse>>(
    "/vouchers/my",
    { params: { page, limit } }
  );

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}
