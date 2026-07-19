"use client";

import { AdminDiscountList } from "@/features/discounts/components/admin-discount-list";
import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";

export default function AdminDiscountsPage() {
  return (
    <WorkspacePage className="space-y-6">
      <section>
        <h1 className="text-2xl font-black text-slate-950">Khuyen mai</h1>
        <p className="mt-1 text-sm text-slate-500">
          Quan ly toan bo cac chuong trinh khuyen mai va voucher tren he thong.
        </p>
      </section>
      <AdminDiscountList />
    </WorkspacePage>
  );
}
