"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ComponentType, CSSProperties, FormEvent } from "react";
import {
  CheckCircle2,
  Crown,
  Gift,
  History,
  Loader2,
  ShieldCheck,
  Sparkles,
  TicketPercent,
  Wallet,
  Lock,
} from "lucide-react";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { LuxuryVoucherCard } from "@/shared/ui/ui/luxury-voucher-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import {
  buildLoyaltySummary,
  formatLoyaltyPoints,
  formatLoyaltyTransactionType,
  formatTierLabel,
} from "@/features/loyalty/lib/customer-loyalty";
import {
  useCustomerLoyaltyAccount,
  useCustomerLoyaltyTransactions,
  useCustomerRedeemPoints,
  usePublicTierConfigs,
  usePublicTierVoucherOffers,
} from "@/features/loyalty/hooks/use-customer-loyalty";
import { useCustomerVouchers } from "@/features/vouchers/hooks/use-customer-vouchers";
import { cn } from "@/shared/lib/utils";
import type { RedeemPointsResponse, TierVoucherOffer } from "@/entities/loyalty";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { getCustomerTierMetalStyle } from "@/shared/ui/customer/customer-experience";

type VoucherOfferState = TierVoucherOffer & {
  eligible: boolean;
  affordable: boolean;
};

const TIER_ORDER: readonly string[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];


export function CustomerLoyaltyPageContent() {
  const { language } = useLanguageStore();
  const accountQuery = useCustomerLoyaltyAccount();
  const tiersQuery = usePublicTierConfigs();
  const offersQuery = usePublicTierVoucherOffers();
  const transactionsQuery = useCustomerLoyaltyTransactions(1, 50);
  const redeemMutation = useCustomerRedeemPoints();
  const [selectedOffer, setSelectedOffer] = useState<VoucherOfferState | null>(null);
  const [successVoucher, setSuccessVoucher] = useState<RedeemPointsResponse | null>(null);

  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [activeTab, setActiveTab] = useState<"exchange" | "my-vouchers" | "history">("exchange");
  const [exchangeFilter, setExchangeFilter] = useState<"all" | "available" | "exclusive">("all");

  const summary = useMemo(
    () =>
      accountQuery.data && tiersQuery.data && offersQuery.data
        ? buildLoyaltySummary(accountQuery.data, tiersQuery.data, offersQuery.data)
        : null,
    [accountQuery.data, tiersQuery.data, offersQuery.data],
  );

  const currentTierConfig = useMemo(
    () => tiersQuery.data?.find((t) => t.tier === summary?.tier),
    [tiersQuery.data, summary?.tier]
  );

  const locale = language === "vi" ? "vi-VN" : "en-US";

  const handleRedeem = () => {
    if (!selectedOffer || !summary) {
      return;
    }

    setSuccessVoucher(null);
    redeemMutation.mutate(
      {
        pointsToRedeem: selectedOffer.pointsCost,
        referenceId: selectedOffer.id,
      },
      {
        onSuccess: (response) => {
          setSuccessVoucher(response);
          setSelectedOffer(null);
        },
      },
    );
  };



  if (accountQuery.isLoading || tiersQuery.isLoading || offersQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accountQuery.isError || tiersQuery.isError || offersQuery.isError) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-lg border-rose-200 bg-white">
          <CardHeader>
            <CardTitle>{translate(language, "Không thể tải tài khoản tích điểm", "Unable to load loyalty account")}</CardTitle>
            <CardDescription>{getDisplayErrorMessage(accountQuery.error)}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const currentTierIndex = TIER_ORDER.indexOf(summary.tier);
  const tierMetal = getCustomerTierMetalStyle(summary.tier);
  const selectedRemainingPoints = selectedOffer
    ? Math.max(summary.availablePoints - selectedOffer.pointsCost, 0)
    : summary.availablePoints;



  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#F8FAFC] px-4 py-12 text-slate-950 sm:px-6 lg:px-8 relative font-['Be_Vietnam_Pro','Inter',sans-serif]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -right-24 top-10 h-96 w-96 rounded-full bg-teal-900/5 blur-[100px]" />
        <div className="absolute bottom-10 -left-10 h-[28rem] w-[28rem] rounded-full bg-blue-900/5 blur-[100px]" />
      </div>
      <div className="mx-auto flex max-w-7xl flex-col relative">
        <div className="flex justify-end mb-4">
          <div className="z-20 flex items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow-md border border-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 border border-slate-100">
              <Wallet className="h-5 w-5 text-[#007A78]" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {translate(language, "Điểm khả dụng", "Available points")}
              </div>
              <div className="text-xl font-black text-slate-950">
                {summary.availablePoints.toLocaleString(locale)} pts
              </div>
            </div>
          </div>
        </div>

        <section className="relative w-full max-w-5xl mx-auto mb-10 mt-2">

          {/* Main Lifetime Progress Card */}
          <div className={cn(
              "relative overflow-hidden rounded-[32px] p-8 shadow-xl border border-white/20",
              tierMetal.surface
            )}>
            <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.44)_0%,rgba(255,255,255,0.12)_42%,rgba(67,40,23,0.12)_100%)]" />
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/80" />
            
            <div className="relative z-10 flex items-start justify-between">
              <div className="space-y-6">
                <div className={cn("text-xs font-black uppercase tracking-[0.2em]", tierMetal.softText)}>
                  {translate(language, "Tiến trình nâng hạng", "Lifetime tier progress")}
                </div>
                <div className={cn("text-3xl sm:text-4xl font-black tracking-tight", tierMetal.text)}>
                  {summary.progress.nextTier ? (
                    `${summary.lifetimePoints.toLocaleString(locale)} / ${(summary.lifetimePoints + summary.progress.pointsToNextTier).toLocaleString(locale)} lifetime pts`
                  ) : (
                    `${summary.lifetimePoints.toLocaleString(locale)} lifetime pts`
                  )}
                </div>

                {/* Perks section */}
                <div className="flex flex-col gap-3 pt-2">
                  {currentTierConfig && (
                    <div className={cn("flex items-center gap-2 text-sm font-semibold", tierMetal.text)}>
                      <Sparkles className="h-5 w-5" />
                      {translate(
                        language, 
                        `Tích lũy ${currentTierConfig.pointMultiplier}x điểm thưởng`, 
                        `${currentTierConfig.pointMultiplier}x Points Multiplier`
                      )}
                    </div>
                  )}
                  {currentTierConfig?.priorityScore !== undefined && currentTierConfig.priorityScore > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full bg-[#007A78]/10 px-3 py-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#007A78]" />
                      <span className="text-xs font-semibold text-[#007A78]">
                        {translate(language, "Check-in Ưu tiên: ", "Priority Check-in: ")}
                        {currentTierConfig.priorityScore === 30 ? translate(language, "Cao", "High") : 
                         currentTierConfig.priorityScore === 20 ? translate(language, "Trung bình", "Medium") : 
                         currentTierConfig.priorityScore === 10 ? translate(language, "Bình thường", "Normal") : 
                         translate(language, "Không", "None")}
                      </span>
                    </div>
                  )}</div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className={cn("flex h-[72px] w-[72px] items-center justify-center rounded-2xl shadow-lg border-transparent text-white", tierMetal.surface, tierMetal.border, tierMetal.text)}>
                  <Crown className="h-8 w-8" />
                </div>
                <div className={cn("rounded-full border bg-white/58 px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur", tierMetal.border, tierMetal.text)}>
                  {summary.progress.nextTier
                    ? `${formatTierLabel(summary.progress.nextTier)} ${translate(language, "tiếp theo", "next")}`
                    : translate(language, "Hạng tối đa", "Max tier")}
                </div>
              </div>
            </div>

            {summary.progress.nextTier && (
              <div className="relative z-10 mt-10 flex h-14 items-center overflow-hidden rounded-full bg-white p-1.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.06)]">
                <div
                  className={cn("relative h-full overflow-hidden rounded-full shadow-sm transition-all duration-1000 ease-out", tierMetal.progress)}
                  style={{ width: `${summary.progress.progressPercent}%` }}
                >
                  <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),transparent_54%,rgba(0,0,0,0.08))]" />
                  <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.30),transparent)] animate-[customerShimmer_3s_infinite_ease-in-out]" />
                </div>
                <div className={cn("pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold tracking-tight text-slate-900")}>
                  {summary.lifetimePoints.toLocaleString(locale)} / {(summary.lifetimePoints + summary.progress.pointsToNextTier).toLocaleString(locale)} lifetime pts
                </div>
              </div>
            )}
          </div>
        </section>

        {successVoucher ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm animate-in fade-in zoom-in duration-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/confetti.png')] opacity-20 animate-[pulse_3s_ease-in-out_infinite]" />
            <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {translate(language, "Đổi điểm thành công", "Redemption successful")}
                </div>
                <div className="mt-2 text-2xl font-black tracking-tight">{successVoucher.voucherCode}</div>
                <p className="mt-1 text-sm text-emerald-800">
                  {translate(language, "Voucher của bạn sẵn sàng sử dụng cho lần đặt tiếp theo.", "Your voucher is ready to use on a future booking.")}
                </p>
              </div>
              <Badge className="w-fit border-emerald-200 bg-white text-emerald-700" variant="outline">
                {successVoucher.status}
              </Badge>
            </div>
            <div className="relative z-10 mt-4 grid gap-3 sm:grid-cols-3">
              <SuccessVoucherMetric label={translate(language, "Điểm đã đổi", "Points redeemed")} value={`${successVoucher.pointsRedeemed.toLocaleString(locale)} pts`} />
              <SuccessVoucherMetric label={translate(language, "Giá trị voucher", "Voucher value")} value={`${successVoucher.voucherValue.toLocaleString(locale)} VND`} />
              <SuccessVoucherMetric label={translate(language, "Hết hạn", "Expires")} value={new Date(successVoucher.expiresAt).toLocaleDateString(locale)} />
            </div>
          </div>
        ) : null}

        {redeemMutation.isError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {getDisplayErrorMessage(redeemMutation.error)}
          </div>
        ) : null}


        <section className="space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-4 pb-4">
              <div className="shrink-0 hidden sm:flex">
                <Button type="button" onClick={() => setActiveTab("history")} variant={activeTab === "history" ? "default" : "outline"} size="icon" className={cn("h-12 w-12 rounded-full shadow-sm transition-all", activeTab === "history" ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-white text-slate-500 hover:text-slate-900 border-slate-200 hover:bg-slate-50")} title={translate(language, "Lịch sử điểm", "Point history")}>
                  <History className="h-6 w-6" />
                </Button>
              </div>
              <div className="inline-flex items-center justify-center rounded-xl bg-slate-100 p-1.5 text-slate-500 w-full sm:w-auto shrink-0">
                <Button type="button" variant="ghost" onClick={() => setActiveTab("exchange")} className={cn("h-11 px-8 text-base font-bold hover:bg-white rounded-lg transition-all", activeTab === "exchange" ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-950")}>
                  {translate(language, "Đổi voucher", "Voucher exchange")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setActiveTab("my-vouchers")} className={cn("h-11 px-8 text-base font-bold hover:bg-white rounded-lg transition-all", activeTab === "my-vouchers" ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-950")}>
                  {translate(language, "Ví Voucher của tôi", "My Vouchers")}
                </Button>
              </div>
            </div>

            {activeTab === "exchange" ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant={exchangeFilter === "all" ? "default" : "outline"} onClick={() => setExchangeFilter("all")} className={cn("rounded-full border-slate-200 transition-all font-semibold", exchangeFilter === "all" ? "bg-[#007A78] text-white hover:bg-[#00605E] border-transparent shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}>
                    {translate(language, "Tất cả ưu đãi", "All Offers")}
                  </Button>
                  <Button variant={exchangeFilter === "available" ? "default" : "outline"} onClick={() => setExchangeFilter("available")} className={cn("rounded-full border-slate-200 transition-all font-semibold", exchangeFilter === "available" ? "bg-[#007A78] text-white hover:bg-[#00605E] border-transparent shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}>
                    {translate(language, "Khả dụng", "Available")}
                  </Button>
                  <Button variant={exchangeFilter === "exclusive" ? "default" : "outline"} onClick={() => setExchangeFilter("exclusive")} className={cn("rounded-full border-slate-200 transition-all font-semibold", exchangeFilter === "exclusive" ? "bg-[#007A78] text-white hover:bg-[#00605E] border-transparent shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}>
                    {translate(language, "Độc quyền theo hạng", "Exclusive to your tier")}
                  </Button>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {summary.voucherOffers
                    .filter(offer => {
                      if (exchangeFilter === "all") return true;
                      if (exchangeFilter === "available") return offer.eligible && offer.affordable;
                      if (exchangeFilter === "exclusive") return offer.minTier === summary.tier;
                      return true;
                    })
                    .map((offer) => (
                      <ExchangeVoucherCard
                        key={offer.id}
                        offer={offer}
                        locale={locale}
                        language={language}
                        availablePoints={summary.availablePoints}
                        isPending={redeemMutation.isPending}
                        onSelect={setSelectedOffer}
                      />
                  ))}
                </div>
              </div>
            ) : activeTab === "my-vouchers" ? (
              <MyVouchersList language={language} locale={locale} />
            ) : (
              <div className="mx-auto max-w-3xl space-y-4">
                {transactionsQuery.isPending ? (
                  <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
                ) : transactionsQuery.isError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {getDisplayErrorMessage(transactionsQuery.error)}
                  </div>
                ) : !transactionsQuery.data || transactionsQuery.data.items.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-600 shadow-sm">
                    {translate(language, "Chưa có giao dịch điểm nào.", "No point transactions yet.")}
                  </div>
                ) : (
                  transactionsQuery.data.items.map((item) => (
                    <div key={item.transactionId} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-base font-bold text-slate-900">{formatLoyaltyTransactionType(item.type)}</div>
                        <div className={item.points >= 0 ? "text-base font-black text-emerald-700" : "text-base font-black text-rose-700"}>
                          {formatLoyaltyPoints(item.points)}
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{item.description}</div>
                      <div className="mt-3 text-xs font-semibold text-slate-400">{new Date(item.createdAt).toLocaleString(locale)}</div>
                    </div>
                  ))
                )}
              </div>
            )}


          </div>
        </section>


      </div>

      <Dialog open={Boolean(selectedOffer)} onOpenChange={(open: boolean) => !open && setSelectedOffer(null)}>
        <DialogContent className="rounded-lg">
          <DialogHeader>
            <DialogTitle>{translate(language, "Xác nhận đổi voucher?", "Confirm voucher redemption?")}</DialogTitle>
            <DialogDescription>
              {selectedOffer
                ? translate(
                    language,
                    `Bạn sẽ dùng ${selectedOffer.pointsCost.toLocaleString("vi-VN")} điểm để đổi ${selectedOffer.title}, trị giá ${selectedOffer.voucherValue.toLocaleString("vi-VN")} VND.`,
                    `You will spend ${selectedOffer.pointsCost.toLocaleString("en-US")} points to redeem ${selectedOffer.title}, worth ${selectedOffer.voucherValue.toLocaleString("en-US")} VND.`,
                  )
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedOffer ? (
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <RuleRow label={translate(language, "Điểm khả dụng", "Available points")} value={`${summary.availablePoints.toLocaleString(locale)} pts`} />
              <RuleRow label={translate(language, "Điểm sử dụng", "Points used")} value={`${selectedOffer.pointsCost.toLocaleString(locale)} pts`} />
              <RuleRow label={translate(language, "Số dư sau đổi", "Balance after redemption")} value={`${selectedRemainingPoints.toLocaleString(locale)} pts`} />
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedOffer(null)} disabled={redeemMutation.isPending}>
              {translate(language, "Huỷ", "Cancel")}
            </Button>
            <Button type="button" onClick={handleRedeem} disabled={redeemMutation.isPending} className="bg-[#007A78] text-white hover:bg-[#00605E]">
              {redeemMutation.isPending ? <Loader2 className="animate-spin" /> : <Gift />}
              {translate(language, "Xác nhận đổi điểm", "Confirm redemption")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExchangeVoucherCard({
  offer,
  locale,
  language,
  availablePoints,
  isPending,
  onSelect,
}: {
  offer: VoucherOfferState;
  locale: string;
  language: string;
  availablePoints: number;
  isPending: boolean;
  onSelect: (offer: VoucherOfferState) => void;
}) {
  const disabled = !offer.eligible || !offer.affordable || isPending;

  const tierStyles: Record<string, { bg: string; border: string; glow: string }> = {
    BRONZE: {
      bg: "bg-[#FCF9F6]",
      border: "border-[#D4A373]/30",
      glow: "shadow-sm",
    },
    SILVER: {
      bg: "bg-gradient-to-br from-slate-50 to-slate-200",
      border: "border-slate-300",
      glow: "shadow-md",
    },
    GOLD: {
      bg: "bg-gradient-to-br from-[#FDFBF1] to-[#F3E7C3]",
      border: "border-[#E8D190]",
      glow: "shadow-lg shadow-amber-200/40",
    },
    PLATINUM: {
      bg: "bg-gradient-to-br from-slate-50 to-pink-50",
      border: "border-slate-200",
      glow: "shadow-xl shadow-slate-300/40",
    },
    DIAMOND: {
      bg: "bg-[linear-gradient(135deg,#e0f2fe_0%,#e8dbfa_50%,#fce7f3_100%)] relative overflow-hidden",
      border: "border-transparent",
      glow: "shadow-2xl shadow-purple-200/50",
    },
  };

  const style = tierStyles[offer.minTier] || tierStyles["BRONZE"];

  return (
    <div
      className={cn(
        "group flex min-h-[230px] flex-col rounded-2xl border p-5 transition-all duration-300 ease-out relative",
        style.bg,
        style.border,
        offer.eligible 
          ? "hover:-translate-y-1 hover:scale-[1.02] " + style.glow 
          : "opacity-[0.85] grayscale-[20%]"
      )}
    >
      {!offer.eligible && (
        <div className="absolute inset-0 z-0 bg-white/20 backdrop-blur-[2px] rounded-2xl pointer-events-none" />
      )}
      
      {offer.minTier === "DIAMOND" && (
         <div className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)] animate-[customerShimmer_3s_infinite_ease-in-out]" />
      )}
      
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 shadow-sm backdrop-blur-sm text-slate-700">
          <TicketPercent className="h-5 w-5" />
        </div>
        <Badge variant="outline" className="border-white/40 bg-white/60 px-3 py-1 font-bold text-slate-700 backdrop-blur-md">
          {formatTierLabel(offer.minTier)}
        </Badge>
      </div>

      <div className="relative z-10 mt-5 flex-1">
        <h3 className="text-[17px] font-black text-slate-900 leading-tight">{offer.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {offer.voucherValue.toLocaleString(locale)} VND voucher {translate(language, "cho thành viên", "for")} <span className="font-bold">{formatTierLabel(offer.minTier)}</span> {translate(language, "trở lên", "and above")}.
        </p>
      </div>

      <div className="relative z-10 mt-5 flex items-end justify-between gap-3 border-t border-black/5 pt-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">{translate(language, "Chi phí", "Cost")}</div>
          <div className="text-xl font-black text-slate-900">{offer.pointsCost} <span className="text-sm font-bold text-slate-600">pts</span></div>
        </div>
        <Button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(offer)}
          className={cn(
            "rounded-xl font-bold transition-all duration-300",
            !offer.eligible 
              ? "bg-slate-200 text-slate-600 opacity-90 shadow-none border border-slate-300" 
              : !offer.affordable
                ? "bg-slate-200 text-slate-500 opacity-90 shadow-none"
                : "bg-[#007A78] text-white hover:bg-[#00605E] hover:shadow-[0_0_15px_rgba(0,122,120,0.4)]"
          )}
        >
          {!offer.eligible
            ? <span className="flex items-center gap-1.5"><Lock className="w-4 h-4" /> {translate(language, `Lên hạng ${formatTierLabel(offer.minTier)}`, `Reach ${formatTierLabel(offer.minTier)}`)}</span>
            : !offer.affordable
              ? translate(language, `Cần thêm ${offer.pointsCost - availablePoints} pts`, `Need ${offer.pointsCost - availablePoints} pts`)
              : translate(language, "Đổi ngay", "Redeem")}
        </Button>
      </div>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
          <div className="text-lg font-black text-slate-950">{value}</div>
        </div>
      </div>
    </div>
  );
}

function SuccessVoucherMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
      <div className="text-xs font-semibold uppercase text-emerald-700">{label}</div>
      <div className="mt-1 text-sm font-black text-slate-950">{value}</div>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-3 py-2">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function MyVouchersList({ language, locale }: { language: string, locale: string }) {
  const vouchersQuery = useCustomerVouchers();

  if (vouchersQuery.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-48 animate-pulse rounded-3xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (vouchersQuery.isError) {
    return (
      <Card className="border-rose-200 bg-white">
        <CardHeader>
          <CardTitle>{translate(language as any, "Không thể tải voucher", "Unable to load vouchers")}</CardTitle>
          <CardDescription>{getDisplayErrorMessage(vouchersQuery.error)}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!vouchersQuery.data || vouchersQuery.data.items.length === 0) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>{translate(language as any, "Chưa có voucher nào", "No vouchers available")}</CardTitle>
          <CardDescription>
            {translate(
              language as any,
              "Hiện chưa có voucher nào dành cho hạng thành viên của bạn.",
              "There are no exclusive vouchers for your tier at the moment."
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2 items-start">
      {vouchersQuery.data.items.map((voucher) => (
        <LuxuryVoucherCard
          key={voucher.code}
          title={voucher.name}
          amountText={voucher.discountType === "PERCENT" ? `${voucher.discountValue}` : `${voucher.discountValue.toLocaleString(locale)}`}
          unitText={voucher.discountType === "PERCENT" ? "% OFF" : "VND"}
          code={voucher.code}
          tier={
            voucher.targetTiers.length > 0
              ? voucher.targetTiers.map(t => formatTierLabel(t as any)).join(", ")
              : translate(language as any, "Tất cả hạng", "All Tiers")
          }
          validUntil={voucher.endAt ? new Date(voucher.endAt).toLocaleDateString(locale) : "Không giới hạn"}
          minOrder={
            voucher.minOrderAmount > 0
              ? `${voucher.minOrderAmount.toLocaleString(locale)} VND`
              : translate(language as any, "Không yêu cầu", "None")
          }
        />
      ))}
    </div>
  );
}



