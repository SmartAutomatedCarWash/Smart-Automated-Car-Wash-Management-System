import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserDiscount, Discount } from "@/entities/discounts";
import { apiClient } from "@/shared/lib/api";
import type { ApiPaginatedResponse, ApiSuccessResponse } from "@/shared/types/api.types";

const customerDiscountsQueryKey = ["customer-discounts"] as const;
type CustomerDiscount = UserDiscount & { discount: Discount };
type SpringPageResponse<T> = {
  content?: T[];
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  last?: boolean;
};

function normalizeDiscountPage(payload: ApiPaginatedResponse<CustomerDiscount> | SpringPageResponse<CustomerDiscount>) {
  if ("data" in payload) {
    return {
      items: payload.data ?? [],
      pagination: payload.pagination,
    };
  }

  return {
    items: payload.content ?? [],
    pagination: {
      page: payload.number ?? 0,
      limit: payload.size ?? 20,
      total: payload.totalElements ?? payload.content?.length ?? 0,
      totalPages: payload.totalPages ?? 1,
      hasMore: payload.last === undefined ? false : !payload.last,
    },
  };
}

export function useCustomerDiscounts() {
  return useQuery({
    queryKey: customerDiscountsQueryKey,
    queryFn: async () => {
      const response = await apiClient.get<ApiPaginatedResponse<CustomerDiscount> | SpringPageResponse<CustomerDiscount>>(
        "/customer/discounts/my-discounts",
      );

      return normalizeDiscountPage(response.data);
    },
  });
}

export function useClaimCustomerDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (discountId: string) => {
      const response = await apiClient.post<ApiSuccessResponse<CustomerDiscount>>(
        `/customer/discounts/${discountId}/claim`,
      );
      return "data" in response.data ? response.data.data : response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerDiscountsQueryKey });
    },
  });
}
