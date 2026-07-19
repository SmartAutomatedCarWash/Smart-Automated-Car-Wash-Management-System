"use client";

import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";

export default function CustomerDiscountsPage() {
  return (
    <WorkspacePage className="space-y-6">
      <section>
        <h1 className="text-2xl font-black text-slate-950">Khuyen mai</h1>
        <p className="mt-1 text-sm text-slate-500">
          Quan ly cac voucher va uu dai cua ban.
        </p>
      </section>
      <div className="rounded-lg bg-white p-6 text-center text-gray-500 shadow">
        Tinh nang dang duoc cap nhat
      </div>
    </WorkspacePage>
  );
}
