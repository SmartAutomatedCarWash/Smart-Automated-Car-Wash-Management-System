import { useQuery } from "@tanstack/react-query";
import { listActiveCustomerVouchers } from "@/features/vouchers/api/customer-vouchers-service";

export function useCustomerVouchers(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["customer-vouchers", { page, limit }],
    queryFn: () => listActiveCustomerVouchers(page, limit),
  });
}
