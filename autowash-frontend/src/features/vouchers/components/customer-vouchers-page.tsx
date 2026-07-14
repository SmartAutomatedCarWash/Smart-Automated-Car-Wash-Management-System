"use client";

import { RefreshCcw, Ticket } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Badge } from "@/shared/ui/ui/badge";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { useCustomerVouchers } from "@/features/vouchers/hooks/use-customer-vouchers";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { formatTierLabel } from "@/features/loyalty/lib/customer-loyalty";

export function CustomerVouchersPageContent() {
  const { language } = useLanguageStore();
  const vouchersQuery = useCustomerVouchers();
  const locale = language === "vi" ? "vi-VN" : "en-US";

  const formatDiscount = (type: string, value: number) => {
    if (type === "PERCENT") {
      return `${value}% OFF`;
    }
    return `${value.toLocaleString(locale)} VND`;
  };

  return (
    <div className="relative min-h-screen px-4 py-8 sm:px-6 lg:px-8 bg-[#fdf7ff]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -right-24 top-10 h-96 w-96 rounded-full bg-[#0566D9]/5 blur-[100px]" />
        <div className="absolute bottom-10 -left-10 h-[28rem] w-[28rem] rounded-full bg-[#6750A4]/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8">
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0566D9]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#0566D9]">
              <Ticket className="h-3.5 w-3.5" />
              {translate(language, "Ví Voucher", "Voucher Wallet")}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {translate(language, "Đặc Quyền Của Bạn", "Your Privileges")}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
              {translate(
                language,
                "Danh sách các voucher giảm giá đặc biệt được cấp tự động dựa trên hạng thành viên hiện tại của bạn.",
                "List of special discount vouchers automatically granted based on your current tier."
              )}
            </p>
          </div>
          <Button 
            type="button" 
            onClick={() => vouchersQuery.refetch()}
            className="shrink-0 rounded-xl bg-white border border-black/[0.04] text-slate-700 hover:bg-slate-50 px-5 py-2.5 font-bold shadow-sm"
          >
            <RefreshCcw className="mr-2 h-4 w-4 text-[#0566D9]" />
            {translate(language, "Tải lại", "Refresh")}
          </Button>
        </section>

        {vouchersQuery.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-3xl bg-slate-100" />
            ))}
          </div>
        ) : vouchersQuery.isError ? (
          <Card className="border-rose-200 bg-white">
            <CardHeader>
              <CardTitle>{translate(language, "Không thể tải voucher", "Unable to load vouchers")}</CardTitle>
              <CardDescription>{getDisplayErrorMessage(vouchersQuery.error)}</CardDescription>
            </CardHeader>
          </Card>
        ) : !vouchersQuery.data || vouchersQuery.data.items.length === 0 ? (
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{translate(language, "Chưa có voucher nào", "No vouchers available")}</CardTitle>
              <CardDescription>
                {translate(
                  language,
                  "Hiện chưa có voucher nào dành cho hạng thành viên của bạn.",
                  "There are no exclusive vouchers for your tier at the moment."
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {vouchersQuery.data.items.map((voucher) => (
              <Card key={voucher.code} className="relative overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="absolute left-0 top-0 h-full w-2 bg-gradient-to-b from-[#0566D9] to-[#6750A4]" />
                <CardContent className="space-y-4 p-6 pl-8">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-900 line-clamp-2">{voucher.name}</div>
                      <div className="mt-1 text-2xl font-black text-[#0566D9]">
                        {formatDiscount(voucher.discountType, voucher.discountValue)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed border-[#0566D9]/20 bg-[#0566D9]/5 p-3 text-center transition-colors group-hover:bg-[#0566D9]/10">
                    <span className="font-mono text-lg font-bold tracking-widest text-[#0566D9]">
                      {voucher.code}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {voucher.targetTiers.length > 0 ? (
                        voucher.targetTiers.map((tier) => (
                          <Badge key={tier} variant="outline" className="border-[#0566D9]/20 bg-transparent text-[#0566D9] text-[9px] font-black uppercase tracking-wider rounded-full px-2">
                            {formatTierLabel(tier as any)}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="border-[#6750A4]/20 bg-transparent text-[#6750A4] text-[9px] font-black uppercase tracking-wider rounded-full px-2">
                          {translate(language, "Tất cả hạng", "All Tiers")}
                        </Badge>
                      )}
                    </div>

                    <div className="text-[11px] font-semibold text-slate-500">
                      {translate(language, "Đơn tối thiểu", "Min order")}:{" "}
                      <span className="text-slate-700">
                        {voucher.minOrderAmount > 0
                          ? `${voucher.minOrderAmount.toLocaleString(locale)} VND`
                          : translate(language, "Không yêu cầu", "None")}
                      </span>
                    </div>

                    {voucher.maxDiscountAmount && voucher.maxDiscountAmount > 0 && (
                      <div className="text-[11px] font-semibold text-slate-500">
                        {translate(language, "Giảm tối đa", "Max discount")}:{" "}
                        <span className="text-slate-700">{voucher.maxDiscountAmount.toLocaleString(locale)} VND</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(locale);
}
