import { useQuery } from "@tanstack/react-query";
import { getActiveStaffOptions } from "@/features/operations/lib/operations-service";

export function useAdminStaffList() {
  return useQuery({
    queryKey: ["admin", "staff", "active"],
    queryFn: getActiveStaffOptions,
    staleTime: 60_000,
  });
}
