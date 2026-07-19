import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserDiscount, Discount } from "@/entities/discounts";
import { apiClient } from "@/shared/lib/api";
import type { ApiPaginatedResponse, ApiSuccessResponse } from "@/shared/types/api.types";

const customerDiscountsQueryKey = ["customer-discounts"] as const;
type CustomerDiscount = UserDiscount & { discount: Discount };

export function useCustomerDiscounts() {
  return useQuery({
    queryKey: customerDiscountsQueryKey,
    queryFn: async () => {
      const response = await apiClient.get<ApiPaginatedResponse<CustomerDiscount>>(
        "/customer/discounts/my-discounts",
      );

      return {
        items: response.data.data,
        pagination: response.data.pagination,
      };
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
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerDiscountsQueryKey });
    },
  });
}
