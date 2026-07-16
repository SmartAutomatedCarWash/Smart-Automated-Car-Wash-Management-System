"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { formatBookingCurrency } from "@/features/bookings/lib/booking-format";
import { useBookingCombos } from "@/features/bookings/hooks/use-bookings";
import type { BookingCombo } from "@/entities/bookings";

function ComboCard({ combo }: { combo: BookingCombo }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-sky-200 bg-[linear-gradient(180deg,rgba(239,246,255,0.96)_0%,rgba(255,255,255,0.98)_58%,rgba(248,250,252,0.99)_100%)] p-5 shadow-[0_16px_40px_rgba(14,165,233,0.12)] transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-sm shadow-sky-600/20">
            <Sparkles className="h-3.5 w-3.5" />
            Combo
          </div>
          <h3 className="mt-3 text-lg font-black text-slate-900">{combo.name}</h3>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {combo.maxServices} services
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">{combo.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {combo.benefits.slice(0, 4).map((benefit) => (
          <span
            key={benefit}
            className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm"
          >
            {benefit}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-5">
        <div className="rounded-2xl border border-sky-100 bg-white/80 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Giá gốc
              </div>
              <div className="text-sm font-semibold text-slate-400 line-through">
                {formatBookingCurrency(combo.upgradePriceFrom || combo.basePrice)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Giá giảm
              </div>
              <div className="text-2xl font-black text-sky-700">
                {formatBookingCurrency(combo.basePrice)}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs font-semibold text-emerald-700">
              Tiết kiệm ngay khi chọn combo
            </div>
            <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Ưu đãi giới hạn
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Button
            asChild
            className="h-11 w-full rounded-full bg-slate-900 text-white hover:bg-slate-800"
          >
            <Link href={`/customer/combos/${combo.comboId}/checkout`}>Đặt combo</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerCombosPage() {
  const combosQuery = useBookingCombos();

  const sortedCombos = useMemo(() => {
    return [...(combosQuery.data ?? [])].sort((left, right) => {
      const leftSavings = (left.upgradePriceFrom || left.basePrice) - left.basePrice;
      const rightSavings = (right.upgradePriceFrom || right.basePrice) - right.basePrice;
      return rightSavings - leftSavings;
    });
  }, [combosQuery.data]);

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_25%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200/70 bg-gradient-to-r from-sky-50 via-white to-slate-50 px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Combo packages
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Gói combo nổi bật cho khách hàng thân thiết
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  Chọn combo phù hợp để tiết kiệm chi phí, giữ lịch rửa xe đều đặn và đi thẳng vào
                  flow đặt lịch.
                </p>
              </div>

              <Button asChild variant="outline" className="rounded-full">
                <Link href="/customer/home">
                  Quay lại trang chủ
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {combosQuery.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    className="min-h-[320px] animate-pulse rounded-[1.5rem] border border-slate-200 bg-slate-100"
                  />
                ))}
              </div>
            ) : sortedCombos.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sortedCombos.map((combo) => (
                  <ComboCard key={combo.comboId} combo={combo} />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <div className="text-lg font-bold text-slate-900">Hiện chưa có combo khả dụng</div>
                <p className="mt-2 text-sm text-slate-600">
                  Danh sách combo sẽ hiển thị tại đây khi hệ thống có dữ liệu.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}