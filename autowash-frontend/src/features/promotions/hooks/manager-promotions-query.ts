import type { ManagerPromotionKind } from "@/features/promotions/api/manager-promotions-service";

export function managerPromotionsQueryScope(userId?: string | null, kind?: ManagerPromotionKind) {
  return ["manager-promotions", userId ?? "anonymous", kind ?? "all"] as const;
}

export function managerPromotionsQueryKey(
  userId?: string | null,
  page = 1,
  limit = 20,
  kind: ManagerPromotionKind = "PROMOTION",
) {
  return [...managerPromotionsQueryScope(userId, kind), page, limit] as const;
}

