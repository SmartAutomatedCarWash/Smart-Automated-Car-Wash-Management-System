"use client";

import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";

export default function AdminTierVoucherOffersPage() {
  return (
    <WorkspacePage className="space-y-6">
      <section>
        <h1 className="text-2xl font-black text-slate-950">Uu dai theo hang</h1>
        <p className="mt-1 text-sm text-slate-500">
          Quan ly cac goi uu dai voucher danh cho cac hang thanh vien.
        </p>
      </section>
      <div className="rounded-lg bg-white p-6 text-center text-gray-500 shadow">
        Tinh nang dang duoc cap nhat
      </div>
    </WorkspacePage>
  );
}
