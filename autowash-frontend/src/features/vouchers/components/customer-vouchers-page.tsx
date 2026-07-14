"use client";

import { RefreshCcw, Ticket } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Badge } from "@/shared/ui/ui/badge";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { useCustomerVouchers } from "@/features/vouchers/hooks/use-customer-vouchers";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { formatTierLabel } from "@/features/loyalty/lib/customer-loyalty";

import { useState, useMemo } from "react";

export function CustomerVouchersPageContent() {
  const { language } = useLanguageStore();
  const vouchersQuery = useCustomerVouchers();
  const locale = language === "vi" ? "vi-VN" : "en-US";

  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");

  const formatDiscount = (type: string, value: number) => {
    if (type === "PERCENT") {
      return `${value}% OFF`;
    }
    return `${value.toLocaleString(locale)} VND`;
  };

  const filteredVouchers = useMemo(() => {
    let items = vouchersQuery.data?.items ?? [];

    if (tierFilter !== "ALL") {
      items = items.filter((v) => {
        if (v.targetTiers.length === 0) return true; // Applicable to all tiers
        return v.targetTiers.includes(tierFilter);
      });
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (v) => v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q)
      );
    }

    return items;
  }, [vouchersQuery.data, searchQuery, tierFilter]);

  return (
    <div className="relative min-h-screen px-4 py-8 sm:px-6 lg:px-8 bg-[#fdf7ff] dark:bg-[#05080d]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -right-24 top-10 h-96 w-96 rounded-full bg-[#0566D9]/5 blur-[100px]" />
        <div className="absolute bottom-10 -left-10 h-[28rem] w-[28rem] rounded-full bg-[#6750A4]/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8">
        <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0566D9]/10 dark:bg-slate-900/60 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#0566D9] dark:text-cyan-400">
              <Ticket className="h-3.5 w-3.5" />
              {translate(language, "Ví Voucher", "Voucher Wallet")}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
              {translate(language, "Đặc Quyền Của Bạn", "Your Privileges")}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              placeholder={translate(language, "Tìm voucher...", "Search vouchers...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">{translate(language, "Tất cả hạng xe", "All Tiers")}</option>
              <option value="MEMBER">MEMBER</option>
              <option value="BRONZE">BRONZE</option>
              <option value="SILVER">SILVER</option>
              <option value="GOLD">GOLD</option>
              <option value="DIAMOND">DIAMOND</option>
            </select>
            <Button 
              type="button" 
              onClick={() => vouchersQuery.refetch()}
              className="shrink-0 rounded-xl bg-white dark:bg-slate-900 border border-black/[0.04] dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 h-9 font-bold shadow-sm"
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5 text-[#0566D9]" />
              {translate(language, "Tải lại", "Refresh")}
            </Button>
          </div>
        </section>

        {vouchersQuery.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900" />
            ))}
          </div>
        ) : vouchersQuery.isError ? (
          <Card className="border-rose-200 dark:border-rose-950/50 bg-white dark:bg-[#071016]/80">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">{translate(language, "Không thể tải voucher", "Unable to load vouchers")}</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">{getDisplayErrorMessage(vouchersQuery.error)}</CardDescription>
            </CardHeader>
          </Card>
        ) : !vouchersQuery.data || vouchersQuery.data.items.length === 0 ? (
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071016]/80">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">{translate(language, "Chưa có voucher nào", "No vouchers available")}</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {translate(
                  language,
                  "Hiện chưa có voucher nào dành cho hạng thành viên của bạn.",
                  "There are no exclusive vouchers for your tier at the moment."
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : filteredVouchers.length === 0 ? (
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071016]/80">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">{translate(language, "Không tìm thấy kết quả", "No matching vouchers")}</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {translate(language, "Không tìm thấy voucher nào khớp với bộ lọc của bạn.", "No vouchers matched your search filters.")}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredVouchers.map((voucher) => (
              <Card key={voucher.code} className="relative overflow-hidden rounded-3xl border border-black/[0.04] dark:border-slate-800 bg-white dark:bg-[#071016]/90 shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="absolute left-0 top-0 h-full w-2 bg-gradient-to-b from-[#0566D9] to-[#6750A4]" />
                <CardContent className="space-y-4 p-6 pl-8">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-slate-100 line-clamp-2">{voucher.name}</div>
                      <div className="mt-1 text-2xl font-black text-[#0566D9] dark:text-sky-400">
                        {formatDiscount(voucher.discountType, voucher.discountValue)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed border-[#0566D9]/20 dark:border-sky-500/20 bg-[#0566D9]/5 dark:bg-sky-950/20 p-3 text-center transition-colors group-hover:bg-[#0566D9]/10 dark:group-hover:bg-sky-950/30">
                    <span className="font-mono text-lg font-bold tracking-widest text-[#0566D9] dark:text-sky-400">
                      {voucher.code}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {voucher.targetTiers.length > 0 ? (
                        voucher.targetTiers.map((tier) => (
                          <Badge key={tier} variant="outline" className="border-[#0566D9]/20 dark:border-[#0566D9]/40 bg-transparent text-[#0566D9] dark:text-sky-450 text-[9px] font-black uppercase tracking-wider rounded-full px-2">
                            {formatTierLabel(tier as any)}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="border-[#6750A4]/20 dark:border-[#6750A4]/40 bg-transparent text-[#6750A4] dark:text-purple-400 text-[9px] font-black uppercase tracking-wider rounded-full px-2">
                          {translate(language, "Tất cả hạng", "All Tiers")}
                        </Badge>
                      )}
                    </div>

                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {translate(language, "Đơn tối thiểu", "Min order")}:{" "}
                      <span className="text-slate-700 dark:text-slate-300">
                        {voucher.minOrderAmount > 0
                          ? `${voucher.minOrderAmount.toLocaleString(locale)} VND`
                          : translate(language, "Không yêu cầu", "None")}
                      </span>
                    </div>

                    {voucher.maxDiscountAmount && voucher.maxDiscountAmount > 0 && (
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {translate(language, "Giảm tối đa", "Max discount")}:{" "}
                        <span className="text-slate-700 dark:text-slate-300">{voucher.maxDiscountAmount.toLocaleString(locale)} VND</span>
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
