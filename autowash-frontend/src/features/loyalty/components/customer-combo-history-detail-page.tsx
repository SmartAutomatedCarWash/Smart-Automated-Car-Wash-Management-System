"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  CreditCard,
  History,
  PackageCheck,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { useCustomerComboDetail } from "@/features/bookings/hooks/use-bookings";
import { formatBookingCurrency } from "@/features/bookings/lib/booking-format";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import {
  WorkspaceErrorState,
  WorkspaceLoadingState,
  WorkspacePage,
} from "@/shared/ui/workspace/workspace-page";

export function CustomerComboHistoryDetailPage({ customerComboId }: { customerComboId: string }) {
  const router = useRouter();
  const { language } = useLanguageStore();
  const comboQuery = useCustomerComboDetail(customerComboId);
  const locale = language === "vi" ? "vi-VN" : "en-US";

  if (comboQuery.isPending) {
    return (
      <WorkspaceLoadingState
        message={translate(language, "Đang tải chi tiết combo...", "Loading combo details...")}
      />
    );
  }

  if (comboQuery.isError || !comboQuery.data) {
    return (
      <WorkspacePage className="space-y-5">
        <Button type="button" variant="ghost" className="px-0" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {translate(language, "Quay lại lịch sử", "Back to history")}
        </Button>
        <WorkspaceErrorState
          title={translate(language, "Không tìm thấy combo", "Combo not found")}
          description={translate(
            language,
            "Combo không tồn tại hoặc không thuộc tài khoản của bạn.",
            "This combo does not exist or does not belong to your account.",
          )}
          retryLabel={translate(language, "Thử lại", "Try again")}
          onRetry={() => comboQuery.refetch()}
        />
      </WorkspacePage>
    );
  }

  const combo = comboQuery.data;
  const usedUsages = Math.max(0, combo.totalUsages - combo.remainingUsages);
  const remainingPercent =
    combo.totalUsages > 0 ? Math.min(100, (combo.remainingUsages / combo.totalUsages) * 100) : 0;
  const heroImage = combo.imageUrls?.[0];

  return (
    <WorkspacePage className="space-y-5">
      <Button type="button" variant="ghost" className="px-0 text-slate-600" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {translate(language, "Quay lại lịch sử combo", "Back to combo history")}
      </Button>

      <section className="relative overflow-hidden rounded-[28px] border border-cyan-200 bg-gradient-to-br from-[#0f2342] via-[#124c72] to-[#16a6c9] px-6 py-7 text-white shadow-[0_24px_60px_-32px_rgba(15,35,66,0.75)] sm:px-8">
        {heroImage ? (
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-luminosity"
          />
        ) : null}
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
              AURA COMBO
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{combo.comboName}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
              {combo.description ||
                translate(language, "Combo chăm sóc xe của bạn.", "Your vehicle care combo.")}
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-400/20 px-4 py-2 text-xs font-black text-emerald-100 ring-1 ring-emerald-200/30">
            <CheckCircle2 className="h-4 w-4" />
            {formatStatus(combo.status)}
          </span>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <Card className="rounded-[24px] border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-950">
                  {translate(language, "Lượt sử dụng", "Usage balance")}
                </h2>
                <p className="text-sm text-slate-500">
                  {combo.remainingUsages} / {combo.totalUsages}{" "}
                  {translate(language, "lượt còn lại", "uses remaining")}
                </p>
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                style={{ width: `${remainingPercent}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>{usedUsages} {translate(language, "đã dùng", "used")}</span>
              <span>{combo.remainingUsages} {translate(language, "còn lại", "remaining")}</span>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-[24px] border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-black text-slate-950">
                {translate(language, "Dịch vụ trong combo", "Included services")}
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {combo.services.length > 0 ? (
                combo.services.map((service) => (
                  <div key={service.serviceId} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{service.name}</p>
                      {service.description ? (
                        <p className="mt-1 text-xs text-slate-500">{service.description}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
                      ×{service.quantity}
                    </span>
                  </div>
                ))
              ) : (
                <p className="px-6 py-8 text-center text-sm text-slate-500">
                  {translate(language, "Chưa có dữ liệu dịch vụ.", "No service data available.")}
                </p>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden rounded-[24px] border-slate-200 bg-white">
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
              <History className="h-5 w-5 text-slate-700" />
              <h2 className="font-black text-slate-950">
                {translate(language, "Lịch sử sử dụng", "Usage history")}
              </h2>
            </div>
            {combo.usages.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {combo.usages.map((usage) => (
                  <Link
                    key={usage.usageId}
                    href={`/customer/bookings/${usage.bookingId}?from=history`}
                    className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Car className="h-4 w-4 text-cyan-600" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{usage.vehiclePlate}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(usage.bookingDate).toLocaleDateString(locale)}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-600">
                      {translate(language, "Xem booking", "View booking")}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-6 py-8 text-center text-sm text-slate-500">
                {translate(language, "Combo này chưa được sử dụng.", "This combo has not been used yet.")}
              </p>
            )}
          </Card>
        </div>

        <Card className="h-fit rounded-[24px] border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <ReceiptText className="h-5 w-5" />
            </div>
            <h2 className="font-black text-slate-950">
              {translate(language, "Thông tin mua combo", "Purchase information")}
            </h2>
          </div>
          <div className="mt-5 space-y-3">
            <DetailItem
              icon={CreditCard}
              label={translate(language, "Giá mua", "Purchase price")}
              value={formatBookingCurrency(combo.purchasePrice)}
            />
            <DetailItem
              icon={Sparkles}
              label={translate(language, "Trạng thái thanh toán", "Payment status")}
              value={formatStatus(combo.paymentStatus ?? "-")}
            />
            <DetailItem
              icon={CalendarDays}
              label={translate(language, "Ngày mua", "Purchased on")}
              value={formatDate(combo.createdAt, locale)}
            />
            <DetailItem
              icon={CalendarDays}
              label={translate(language, "Ngày kích hoạt", "Activated on")}
              value={formatDate(combo.activatedAt, locale)}
            />
            <DetailItem
              icon={Clock3}
              label={translate(language, "Ngày hết hạn", "Expires on")}
              value={formatDate(combo.expiresAt, locale)}
            />
            <DetailItem
              icon={ReceiptText}
              label={translate(language, "Mã giao dịch", "Transaction ref")}
              value={combo.transactionRef || "-"}
            />
          </div>
        </Card>
      </div>
    </WorkspacePage>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function formatDate(value: string | null | undefined, locale: string) {
  return value ? new Date(value).toLocaleDateString(locale) : "-";
}

function formatStatus(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
