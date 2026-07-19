"use client";

import React from "react";
import { Button } from "@/shared/ui/ui/button";

export function AdminDiscountList() {
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Danh sách Khuyến Mãi / Voucher</h2>
        <Button>+ Tạo mới</Button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
        Tính năng đang được cập nhật
      </div>
    </div>
  );
}
