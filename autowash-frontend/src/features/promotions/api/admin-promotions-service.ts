import { apiClient } from "@/shared/lib/api";
import type { Promotion, PromotionListPage, PromotionRequest } from "@/entities/promotions";

export type AdminPromotionKind = "PROMOTION" | "VOUCHER";

type DiscountResponse = {
  id: string;
  type: AdminPromotionKind;
  code: string | null;
  name: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED_AMOUNT" | "FREE_SERVICE" | "NONE";
  discountValue: number;
  requiredPoints: number;
  targetingMode: Promotion["targetingMode"];
  usageLimit: number | null;
  startAt: string;
  endAt: string;
  status: Promotion["status"];
  createdAt: string;
  updatedAt: string;
  applicableTierIds: string[] | null;
};

type DiscountRequest = {
  type: AdminPromotionKind;
  code: string | null;
  name: string;
  description: string | null;
  discountType: NonNullable<Promotion["discountType"]>;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  requiredPoints: number;
  validDaysAfterClaim: number | null;
  targetingMode: "ALL_TIERS" | "SPECIFIC_TIERS";
  newCustomerOnly: boolean;
  usageLimit: number | null;
  startAt: string;
  endAt: string;
  status: Promotion["status"];
  applicableTierIds: string[];
  applicableServiceIds: string[];
};

type SpringPageResponse<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export async function listAdminPromotions(
  page = 1,
  limit = 20,
  kind: AdminPromotionKind = "PROMOTION",
): Promise<PromotionListPage> {
  const response = await apiClient.get<SpringPageResponse<DiscountResponse>>("/admin/discounts", {
    params: { page: Math.max(0, page - 1), size: limit, type: kind },
  });

  return {
    items: response.data.content.map(toPromotion),
    pagination: {
      page: response.data.number + 1,
      limit: response.data.size,
      total: response.data.totalElements,
      totalPages: response.data.totalPages,
      hasMore: !response.data.last,
    },
  };
}

export async function getAdminPromotionById(promotionId: string): Promise<Promotion> {
  const response = await apiClient.get<DiscountResponse>(`/admin/discounts/${promotionId}`);
  return toPromotion(response.data);
}

export async function createAdminPromotion(payload: PromotionRequest, kind: AdminPromotionKind = "PROMOTION") {
  const response = await apiClient.post<DiscountResponse>("/admin/discounts", toDiscountRequest(payload, kind));
  return toPromotion(response.data);
}

export async function updateAdminPromotion(
  promotionId: string,
  payload: PromotionRequest,
  kind: AdminPromotionKind = "PROMOTION",
) {
  const response = await apiClient.put<DiscountResponse>(
    `/admin/discounts/${promotionId}`,
    toDiscountRequest(payload, kind),
  );
  return toPromotion(response.data);
}

export async function deleteAdminPromotion(promotionId: string) {
  await apiClient.delete(`/admin/discounts/${promotionId}`);
  return { promotionId } as Promotion;
}

function toPromotion(discount: DiscountResponse): Promotion {
  return {
    promotionId: discount.id,
    code: discount.code,
    name: discount.name,
    description: discount.description,
    discountType: discount.discountType === "FREE_SERVICE" ? "NONE" : discount.discountType,
    discountValue: discount.discountValue,
    pointMultiplier: discount.requiredPoints > 0 ? discount.requiredPoints : null,
    startDate: discount.startAt,
    endDate: discount.endAt,
    targetingMode: discount.targetingMode,
    applicableTiers: (discount.applicableTierIds ?? []) as Promotion["applicableTiers"],
    maxUsagePerCustomer: discount.usageLimit,
    status: discount.status,
    createdAt: discount.createdAt,
    updatedAt: discount.updatedAt,
  };
}

function toDiscountRequest(payload: PromotionRequest, kind: AdminPromotionKind): DiscountRequest {
  return {
    type: kind,
    code: kind === "PROMOTION" ? payload.code ?? null : null,
    name: payload.name,
    description: payload.description,
    discountType: payload.discountType ?? "NONE",
    discountValue: payload.discountValue,
    minOrderAmount: 0,
    maxDiscountAmount: null,
    requiredPoints: payload.pointMultiplier,
    validDaysAfterClaim: null,
    targetingMode: payload.targetingMode,
    newCustomerOnly: false,
    usageLimit: payload.maxUsagePerCustomer,
    startAt: payload.startDate,
    endAt: payload.endDate,
    status: payload.status,
    applicableTierIds: payload.applicableTiers ?? [],
    applicableServiceIds: [],
  };
}

