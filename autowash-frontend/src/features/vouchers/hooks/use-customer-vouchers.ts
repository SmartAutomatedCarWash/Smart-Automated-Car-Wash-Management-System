import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyVouchers } from "@/features/vouchers/api/customer-vouchers-service";
import { claimCustomerVoucher } from "@/features/loyalty/lib/customer-loyalty-service";

export function useCustomerVouchers(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["customer-vouchers", { page, limit }],
    queryFn: () => listMyVouchers(page, limit),
  });
}

export function useClaimCustomerVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (voucherTemplateId: string) => claimCustomerVoucher(voucherTemplateId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customer-vouchers"] });
      await queryClient.invalidateQueries({ queryKey: ["customer-loyalty"] });
    }
  });
}
