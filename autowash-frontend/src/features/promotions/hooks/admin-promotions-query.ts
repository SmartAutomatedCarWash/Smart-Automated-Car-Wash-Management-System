import type { AdminPromotionKind } from "@/features/promotions/api/admin-promotions-service";

export function adminPromotionsQueryScope(userId?: string | null, kind?: AdminPromotionKind) {
  return ["admin-promotions", userId ?? "anonymous", kind ?? "all"] as const;
}

export function adminPromotionsQueryKey(
  userId?: string | null,
  page = 1,
  limit = 20,
  kind: AdminPromotionKind = "PROMOTION",
) {
  return [...adminPromotionsQueryScope(userId, kind), page, limit] as const;
}

