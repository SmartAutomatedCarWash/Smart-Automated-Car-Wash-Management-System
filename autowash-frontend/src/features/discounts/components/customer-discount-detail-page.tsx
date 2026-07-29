"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Copy,
  Gift,
  Info,
  ReceiptText,
  Sparkles,
  TicketPercent,
} from "lucide-react";
import { useCustomerDiscount } from "@/features/discounts/hooks/use-customer-discounts";
import { usePublicTierConfigs, usePublicTierVoucherOffers } from "@/features/loyalty/hooks/use-customer-loyalty";
import { formatBookingCurrency } from "@/features/bookings/lib/booking-format";
import { generateTierBadgeStyle } from "@/shared/lib/tier-styles";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import {
  WorkspaceErrorState,
  WorkspaceLoadingState,
  WorkspacePage,
} from "@/shared/ui/workspace/workspace-page";
import type { UserDiscount } from "@/entities/discounts";

const TIER_FALLBACK_HEX: Record<string, string> = {
  BRONZE: "#B7793F",
  SILVER: "#94A3B8",
  GOLD: "#EAB308",
  PLATINUM: "#8B5CF6",
  DIAMOND: "#0EA5E9",
};

export function CustomerDiscountDetailPage({ userDiscountId }: { userDiscountId: string }) {
  const router = useRouter();
  const { language } = useLanguageStore();
  const voucherQuery = useCustomerDiscount(userDiscountId);
  const offersQuery = usePublicTierVoucherOffers();
  const tiersQuery = usePublicTierConfigs();
  const locale = language === "vi" ? "vi-VN" : "en-US";

  if (voucherQuery.isPending) {
    return (
      <WorkspaceLoadingState
        message={translate(language, "Đang tải chi tiết voucher...", "Loading voucher details...")}
      />
    );
  }

  if (voucherQuery.isError || !voucherQuery.data) {
    return (
      <WorkspacePage className="space-y-5">
        <Button type="button" variant="ghost" className="px-0" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {translate(language, "Quay lại voucher của tôi", "Back to my vouchers")}
        </Button>
        <WorkspaceErrorState
          title={translate(language, "Không tìm thấy voucher", "Voucher not found")}
          description={translate(
            language,
            "Voucher không tồn tại hoặc không thuộc tài khoản của bạn.",
            "This voucher does not exist or does not belong to your account.",
          )}
          retryLabel={translate(language, "Thử lại", "Try again")}
          onRetry={() => voucherQuery.refetch()}
        />
      </WorkspacePage>
    );
  }

  const voucher = voucherQuery.data;
  const matchedOffer = (offersQuery.data ?? []).find(
    (offer) => offer.title.trim().toLowerCase() === voucher.discount.name.trim().toLowerCase(),
  );
  const voucherTier =
    matchedOffer?.minTier ??
    voucher.discount.applicableTierIds?.[0] ??
    resolveVoucherTierFromName(voucher.discount.name) ??
    "BRONZE";
  const tierConfig = (tiersQuery.data ?? []).find((tier) => tier.tier === voucherTier);
  const tierHex = tierConfig?.imageUrl || TIER_FALLBACK_HEX[voucherTier] || TIER_FALLBACK_HEX.BRONZE;
  const tierBadge = generateTierBadgeStyle(tierHex);
  const status = getVoucherStatus(voucher, language);

  return (
    <WorkspacePage className="space-y-5">
      <Button type="button" variant="ghost" className="px-0 text-slate-600" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {translate(language, "Quay lại voucher của tôi", "Back to my vouchers")}
      </Button>

      <section
        className="relative overflow-hidden rounded-[28px] border px-6 py-7 text-white shadow-[0_24px_60px_-32px_rgba(15,35,66,0.7)] sm:px-8"
        style={{
          borderColor: `${tierHex}88`,
          background: `linear-gradient(135deg, ${tierHex} 0%, ${tierHex}cc 45%, #0f2342 100%)`,
        }}
      >
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2342]">
                AURA CARE
              </span>
              <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
                {voucherTier}
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{voucher.discount.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
              {voucher.discount.description ||
                translate(
                  language,
                  "Voucher đã được đổi từ điểm thành viên và lưu trong tài khoản của bạn.",
                  "This voucher was redeemed from membership points and saved to your account.",
                )}
            </p>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${status.className}`}>
            <status.icon className="h-4 w-4" />
            {status.label}
          </span>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden rounded-[24px] border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-950">
                  {translate(language, "Thông tin voucher", "Voucher information")}
                </h2>
                <p className="text-sm text-slate-500">
                  {translate(language, "Thông tin được đồng bộ từ hệ thống.", "Details synchronized from the system.")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-6 sm:grid-cols-2">
            <DetailItem
              icon={TicketPercent}
              label={translate(language, "Mã voucher", "Voucher code")}
              value={voucher.voucherCode || "-"}
              action={
                voucher.voucherCode ? (
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => void navigator.clipboard.writeText(voucher.voucherCode ?? "")}
                    aria-label={translate(language, "Sao chép mã voucher", "Copy voucher code")}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                ) : null
              }
            />
            <DetailItem
              icon={CircleDollarSign}
              label={translate(language, "Giá trị ưu đãi", "Discount value")}
              value={formatDiscountValue(voucher)}
            />
            <DetailItem
              icon={Sparkles}
              label={translate(language, "Điểm đã quy đổi", "Redeemed points")}
              value={`${voucher.pointsSpent.toLocaleString(locale)} pts`}
            />
            <DetailItem
              icon={Gift}
              label={translate(language, "Hình thức nhận", "Acquisition method")}
              value={formatAcquisitionMethod(voucher.acquisitionMethod, language)}
            />
            <DetailItem
              icon={CalendarDays}
              label={translate(language, "Ngày nhận", "Claimed on")}
              value={formatDateTime(voucher.claimedAt, locale)}
            />
            <DetailItem
              icon={Clock3}
              label={translate(language, "Hạn sử dụng", "Expires on")}
              value={
                voucher.expiresAt
                  ? formatDateTime(voucher.expiresAt, locale)
                  : translate(language, "Không giới hạn", "No expiry")
              }
            />
          </div>

          <div className="mx-6 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                {translate(language, "Hạng áp dụng", "Eligible tier")}
              </p>
              <span
                className="mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black"
                style={{
                  color: tierBadge.color,
                  borderColor: tierBadge.borderColor,
                  backgroundColor: tierBadge.backgroundColor,
                }}
              >
                {tierConfig?.name || voucherTier}
              </span>
            </div>
            {voucher.usedAt ? (
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  {translate(language, "Đã sử dụng lúc", "Used on")}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-700">{formatDateTime(voucher.usedAt, locale)}</p>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="h-fit rounded-[24px] border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Info className="h-5 w-5" />
            </div>
            <h2 className="font-black text-slate-950">
              {translate(language, "Điều kiện sử dụng", "Usage conditions")}
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            <ConditionRow
              label={translate(language, "Đơn hàng tối thiểu", "Minimum order")}
              value={
                voucher.discount.minOrderAmount > 0
                  ? formatBookingCurrency(voucher.discount.minOrderAmount)
                  : translate(language, "Không yêu cầu", "No minimum")
              }
            />
            <ConditionRow
              label={translate(language, "Giảm tối đa", "Maximum discount")}
              value={
                voucher.discount.maxDiscountAmount != null
                  ? formatBookingCurrency(voucher.discount.maxDiscountAmount)
                  : translate(language, "Theo giá trị voucher", "Voucher value")
              }
            />
            <ConditionRow
              label={translate(language, "Khách hàng mới", "New customers only")}
              value={
                voucher.discount.newCustomerOnly
                  ? translate(language, "Có", "Yes")
                  : translate(language, "Không", "No")
              }
            />
          </div>

          <div className="mt-6 space-y-3">
            {voucher.usedInBookingId ? (
              <Button asChild type="button" className="h-11 w-full rounded-xl bg-[#0f2342] text-white hover:bg-[#0b1b34]">
                <Link href={`/customer/bookings/${voucher.usedInBookingId}`}>
                  {translate(language, "Xem booking đã sử dụng", "View used booking")}
                </Link>
              </Button>
            ) : voucher.status === "AVAILABLE" ? (
              <Button asChild type="button" className="h-11 w-full rounded-xl bg-[#0f2342] text-white hover:bg-[#0b1b34]">
                <Link href="/customer/bookings/new">
                  {translate(language, "Đặt lịch để sử dụng", "Book to use voucher")}
                </Link>
              </Button>
            ) : null}
            <Button type="button" variant="outline" className="h-11 w-full rounded-xl" onClick={() => router.back()}>
              {translate(language, "Quay lại", "Back")}
            </Button>
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
  action,
}: {
  icon: typeof BadgeCheck;
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[84px] items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className="mt-1 break-all text-sm font-black text-slate-800">{value}</p>
      </div>
      {action}
    </div>
  );
}

function ConditionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3 text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="text-right font-bold text-slate-800">{value}</span>
      </div>
    </div>
  );
}

function formatDiscountValue(voucher: UserDiscount) {
  if (voucher.discount.discountType === "PERCENT") {
    return `${voucher.discount.discountValue}%`;
  }
  return formatBookingCurrency(voucher.discount.discountValue);
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAcquisitionMethod(method: string, language: string) {
  if (method === "POINT_REDEEMED") return translate(language, "Đổi bằng điểm", "Points redemption");
  if (method === "ADMIN_GRANTED") return translate(language, "Admin cấp", "Admin granted");
  return translate(language, "Tự động nhận", "Automatically granted");
}

function resolveVoucherTierFromName(name: string) {
  const normalizedName = name.toUpperCase();
  return Object.keys(TIER_FALLBACK_HEX).find((tier) => normalizedName.includes(tier)) ?? null;
}

function getVoucherStatus(voucher: UserDiscount, language: string) {
  if (voucher.status === "USED") {
    return {
      label: translate(language, "Đã sử dụng", "Used"),
      className: "bg-slate-950/75 text-white",
      icon: BadgeCheck,
    };
  }
  if (voucher.status === "EXPIRED") {
    return {
      label: translate(language, "Đã hết hạn", "Expired"),
      className: "bg-rose-100 text-rose-800",
      icon: Clock3,
    };
  }
  if (voucher.status === "FORFEITED") {
    return {
      label: translate(language, "Không còn hiệu lực", "Forfeited"),
      className: "bg-slate-200 text-slate-700",
      icon: Info,
    };
  }
  return {
    label: translate(language, "Có thể sử dụng", "Available"),
    className: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  };
}
