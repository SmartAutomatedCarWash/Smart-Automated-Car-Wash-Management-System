export {
  type AdminPromotionKind,
  listAdminPromotions,
  getAdminPromotionById,
  createAdminPromotion,
  updateAdminPromotion,
  deleteAdminPromotion,
} from "@/features/promotions/api/admin-promotions-service";

export {
  type AdminPromotionKind as ManagerPromotionKind,
  listAdminPromotions as listManagerPromotions,
  getAdminPromotionById as getManagerPromotionById,
  createAdminPromotion as createManagerPromotion,
  updateAdminPromotion as updateManagerPromotion,
  deleteAdminPromotion as deleteManagerPromotion,
} from "@/features/promotions/api/admin-promotions-service";
