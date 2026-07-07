"use client";

import { useSearchParams } from "next/navigation";
import { AdminManagementTabs } from "@/features/management/components/admin-management-tabs";
import { AdminVouchersManagementPanel } from "@/features/management/components/admin-vouchers-management-panel";
import { AdminPromotionsPageContent } from "@/features/promotions/components/admin-promotions-page";
import { useLanguageStore, translate } from "@/shared/store/language.store";

export function AdminOffersManagementPage() {
  const { language } = useLanguageStore();

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.10),_transparent_24%),linear-gradient(180deg,_#fffdf9_0%,_#f8fafc_48%,_#f7f9fc_100%)] p-4 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminManagementTabs
          defaultTab="vouchers"
          tabs={[
            {
              value: "promotions",
              label: translate(language, "Khuyến mãi", "Promotions"),
              content: <AdminPromotionsPageContent />,
            },
            {
              value: "vouchers",
              label: "Vouchers",
              content: <AdminVouchersManagementPanel />,
            },
          ]}
        />
      </div>
    </div>
  );
}
