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
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { useAuthStore } from "@/features/auth/store/auth.store";
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
import { useCustomerDiscounts, useClaimCustomerDiscount } from "@/features/discounts/hooks/use-customer-discounts";
import { cn } from "@/shared/lib/utils";
import type { RedeemPointsResponse, TierVoucherOffer } from "@/entities/loyalty";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { generateTierMetalStyle, generateTierBadgeStyle } from "@/shared/lib/tier-styles";
import { canRedeemTierOffer } from "@/features/loyalty/lib/customer-loyalty";

type VoucherOfferState = TierVoucherOffer & {
  eligible: boolean;
  affordable: boolean;
};

const TIER_ORDER: readonly string[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];


export function CustomerLoyaltyPageContent() {
  const { language } = useLanguageStore();
  const currentUserTier = useAuthStore((state) => state.user?.tier ?? "MEMBER");
  const getErrorMessage = useErrorMessage();
  const accountQuery = useCustomerLoyaltyAccount();
  const tiersQuery = usePublicTierConfigs();
  const offersQuery = usePublicTierVoucherOffers();
  const transactionsQuery = useCustomerLoyaltyTransactions(1, 50);
  const redeemMutation = useClaimCustomerDiscount();
  const [selectedOffer, setSelectedOffer] = useState<VoucherOfferState | null>(null);
  const [isSuccessVoucher, setIsSuccessVoucher] = useState(false);

  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [activeTab, setActiveTab] = useState<"exchange" | "my-vouchers" | "history">("exchange");
  const [exchangeFilter, setExchangeFilter] = useState<"all" | "available" | "exclusive">("all");

  const summary = useMemo(
    () => (accountQuery.data && tiersQuery.data ? buildLoyaltySummary(accountQuery.data, tiersQuery.data) : null),
    [accountQuery.data, tiersQuery.data],
  );

  const voucherOffers = useMemo(() => {
    if (!tiersQuery.data || !offersQuery.data) return [];
    return offersQuery.data.map((offer) => ({
      ...offer,
      voucherValue: normalizeMoneyValue(offer.voucherValue),
      eligible: canRedeemTierOffer((summary?.tier ?? currentUserTier) as any, offer, tiersQuery.data),
      affordable: (summary?.availablePoints ?? 0) >= offer.pointsCost,
    }));
  }, [currentUserTier, offersQuery.data, summary?.availablePoints, summary?.tier, tiersQuery.data]);

  const currentTierConfig = useMemo(
    () => tiersQuery.data?.find((t) => t.tier === (summary?.tier ?? currentUserTier)),
    [currentUserTier, summary?.tier, tiersQuery.data]
  );

  const locale = language === "vi" ? "vi-VN" : "en-US";

  const handleRedeem = () => {
    if (!selectedOffer) {
      return;
    }

    setIsSuccessVoucher(false);
    redeemMutation.mutate(
      selectedOffer.id,
      {
        onSuccess: () => {
          setIsSuccessVoucher(true);
          setSelectedOffer(null);
        },
      },
    );
  };



  if (tiersQuery.isLoading || offersQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tiersQuery.isError || offersQuery.isError) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-lg border-rose-200 bg-white">
          <CardHeader>
            <CardTitle>{translate(language, "KhÃ´ng thá»ƒ táº£i tÃ i khoáº£n tÃ­ch Ä‘iá»ƒm", "Unable to load loyalty account")}</CardTitle>
            <CardDescription>{getErrorMessage(tiersQuery.error || offersQuery.error)}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  const fallbackHex: Record<string, string> = {
    BRONZE: "#B07D4B",
    SILVER: "#94A3B8",
    GOLD: "#EAB308",
    PLATINUM: "#64748B",
    DIAMOND: "#A855F7",
  };
  const activeTier = summary?.tier ?? (currentUserTier as string);
  const currentHex = currentTierConfig?.imageUrl || fallbackHex[activeTier] || undefined;
  const tierMetal = generateTierMetalStyle(currentHex);

  const currentTierIndex = TIER_ORDER.indexOf(activeTier);
  const displayedPoints = summary?.availablePoints ?? 0;
  const displayedLifetimePoints = summary?.lifetimePoints ?? 0;
  const selectedRemainingPoints = selectedOffer ? Math.max(displayedPoints - selectedOffer.pointsCost, 0) : displayedPoints;
  const hasAccountError = accountQuery.isError;
  const displayedProgress = summary?.progress ?? {
    nextTier: null,
    pointsToNextTier: 0,
    progressPercent: 0,
  };



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
                {translate(language, "Äiá»ƒm kháº£ dá»¥ng", "Available points")}
              </div>
                <div className="text-xl font-black text-slate-950">
                {displayedPoints.toLocaleString(locale)} pts
              </div>
            </div>
          </div>
        </div>

        {hasAccountError ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {translate(
              language,
              "KhÃ´ng táº£i Ä‘Æ°á»£c tÃ i khoáº£n tÃ­ch Ä‘iá»ƒm, nhÆ°ng váº«n cÃ³ thá»ƒ xem voucher theo tier hiá»‡n táº¡i.",
              "Failed to load loyalty account, but vouchers are still available for the current tier.",
            )}
          </div>
        ) : null}

        <section className="relative w-full max-w-5xl mx-auto mb-10 mt-2">

          {/* Main Lifetime Progress Card */}
          <div className={cn(
              "relative overflow-hidden rounded-[32px] p-8 shadow-xl border border-white/20"
            )}
            style={{ background: tierMetal.surface }}>
            <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.44)_0%,rgba(255,255,255,0.12)_42%,rgba(67,40,23,0.12)_100%)]" />
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/80" />
            
            <div className="relative z-10 flex items-start justify-between">
              <div className="space-y-6">
                <div className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: tierMetal.softText }}>
                  {translate(language, "Tiáº¿n trÃ¬nh nÃ¢ng háº¡ng", "Lifetime tier progress")}
                </div>
                <div className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: tierMetal.text }}>
                  {displayedProgress.nextTier ? (
                    `${displayedLifetimePoints.toLocaleString(locale)} / ${(displayedLifetimePoints + displayedProgress.pointsToNextTier).toLocaleString(locale)} lifetime pts`
                  ) : (
                    `${displayedLifetimePoints.toLocaleString(locale)} lifetime pts`
                  )}
                </div>

                {/* Perks section */}
                <div className="flex flex-col gap-3 pt-2">
                  {currentTierConfig && (
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: tierMetal.text }}>
                      <Sparkles className="h-5 w-5" />
                      {translate(
                        language, 
                        `TÃ­ch lÅ©y ${currentTierConfig.pointMultiplier}x Ä‘iá»ƒm thÆ°á»Ÿng`, 
                        `${currentTierConfig.pointMultiplier}x Points Multiplier`
                      )}
                    </div>
                  )}
                  {currentTierConfig?.priorityScore !== undefined && currentTierConfig.priorityScore > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full bg-[#007A78]/10 px-3 py-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#007A78]" />
                      <span className="text-xs font-semibold text-[#007A78]">
                        {translate(language, "Check-in Æ¯u tiÃªn: ", "Priority Check-in: ")}
                        {currentTierConfig.priorityScore === 30 ? translate(language, "Cao", "High") : 
                         currentTierConfig.priorityScore === 20 ? translate(language, "Trung bÃ¬nh", "Medium") : 
                         currentTierConfig.priorityScore === 10 ? translate(language, "BÃ¬nh thÆ°á»ng", "Normal") : 
                         translate(language, "KhÃ´ng", "None")}
                      </span>
                    </div>
                  )}</div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl shadow-lg border-transparent text-white" style={{ background: tierMetal.surface, borderColor: tierMetal.border, color: tierMetal.text }}>
                  <Crown className="h-8 w-8" />
                </div>
                <div className="rounded-full border bg-white/58 px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur" style={{ borderColor: tierMetal.border, color: tierMetal.text }}>
                  {displayedProgress.nextTier
                    ? `${formatTierLabel(displayedProgress.nextTier, tiersQuery.data)} ${translate(language, "tiáº¿p theo", "next")}`
                    : translate(language, "Háº¡ng tá»‘i Ä‘a", "Max tier")}
                </div>
              </div>
            </div>

            {displayedProgress.nextTier && (
              <div className="relative z-10 mt-10 flex h-14 items-center overflow-hidden rounded-full bg-white p-1.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.06)]">
                <div
                  className="relative h-full overflow-hidden rounded-full shadow-sm transition-all duration-1000 ease-out"
                  style={{ width: `${displayedProgress.progressPercent}%`, background: tierMetal.progress }}
                >
                  <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),transparent_54%,rgba(0,0,0,0.08))]" />
                  <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.30),transparent)] animate-[customerShimmer_3s_infinite_ease-in-out]" />
                </div>
                <div className={cn("pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold tracking-tight text-slate-900")}>
                  {displayedLifetimePoints.toLocaleString(locale)} / {(displayedLifetimePoints + displayedProgress.pointsToNextTier).toLocaleString(locale)} lifetime pts
                </div>
              </div>
            )}
          </div>
        </section>

        {isSuccessVoucher ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm animate-in fade-in zoom-in duration-500 flex items-center justify-center">
            <div className="flex items-center gap-2 text-base font-bold uppercase tracking-[0.14em] text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              {translate(language, "Äá»•i voucher thÃ nh cÃ´ng", "Redemption successful")}
            </div>
          </div>
        ) : null}

        {redeemMutation.isError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {getErrorMessage(redeemMutation.error)}
          </div>
        ) : null}


        <section className="space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-4 pb-4">
              <div className="shrink-0 hidden sm:flex">
                <Button type="button" onClick={() => setActiveTab("history")} variant={activeTab === "history" ? "default" : "outline"} size="icon" className={cn("h-12 w-12 rounded-full shadow-sm transition-all", activeTab === "history" ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-white text-slate-500 hover:text-slate-900 border-slate-200 hover:bg-slate-50")} title={translate(language, "Lá»‹ch sá»­ Ä‘iá»ƒm", "Point history")}>
                  <History className="h-6 w-6" />
                </Button>
              </div>
              <div className="inline-flex items-center justify-center rounded-xl bg-slate-100 p-1.5 text-slate-500 w-full sm:w-auto shrink-0">
                <Button type="button" variant="ghost" onClick={() => setActiveTab("exchange")} className={cn("h-11 px-8 text-base font-bold hover:bg-white rounded-lg transition-all", activeTab === "exchange" ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-950")}>
                  {translate(language, "Äá»•i voucher", "Voucher exchange")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setActiveTab("my-vouchers")} className={cn("h-11 px-8 text-base font-bold hover:bg-white rounded-lg transition-all", activeTab === "my-vouchers" ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-950")}>
                  {translate(language, "VÃ­ Voucher cá»§a tÃ´i", "My Vouchers")}
                </Button>
              </div>
            </div>

            {activeTab === "exchange" ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant={exchangeFilter === "all" ? "default" : "outline"} onClick={() => setExchangeFilter("all")} className={cn("rounded-full border-slate-200 transition-all font-semibold", exchangeFilter === "all" ? "bg-[#007A78] text-white hover:bg-[#00605E] border-transparent shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}>
                    {translate(language, "Táº¥t cáº£ Æ°u Ä‘Ã£i", "All Offers")}
                  </Button>
                  <Button variant={exchangeFilter === "available" ? "default" : "outline"} onClick={() => setExchangeFilter("available")} className={cn("rounded-full border-slate-200 transition-all font-semibold", exchangeFilter === "available" ? "bg-[#007A78] text-white hover:bg-[#00605E] border-transparent shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}>
                    {translate(language, "Kháº£ dá»¥ng", "Available")}
                  </Button>

                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {voucherOffers
                    .filter(offer => {
                      if (!offer.eligible) return false;
                      if (exchangeFilter === "all") return true;
                      if (exchangeFilter === "available") return offer.affordable;

                      return true;
                    })
                    .map((offer) => (
                      <ExchangeVoucherCard
                        key={offer.id}
                        offer={offer}
                        locale={locale}
                        language={language}
                        availablePoints={displayedPoints}
                        isPending={redeemMutation.isPending}
                        onSelect={setSelectedOffer}
                        tierConfigs={tiersQuery.data}
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
                    {getErrorMessage(transactionsQuery.error)}
                  </div>
                ) : !transactionsQuery.data || transactionsQuery.data.items.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-600 shadow-sm">
                    {translate(language, "ChÆ°a cÃ³ giao dá»‹ch Ä‘iá»ƒm nÃ o.", "No point transactions yet.")}
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
            <DialogTitle>{translate(language, "XÃ¡c nháº­n Ä‘á»•i voucher?", "Confirm voucher redemption?")}</DialogTitle>
            <DialogDescription>
              {selectedOffer
                ? translate(
                    language,
                    `Báº¡n sáº½ dÃ¹ng ${selectedOffer.pointsCost.toLocaleString("vi-VN")} Ä‘iá»ƒm Ä‘á»ƒ Ä‘á»•i ${selectedOffer.title}, trá»‹ giÃ¡ ${selectedOffer.voucherValue.toLocaleString("vi-VN")} VND.`,
                    `You will spend ${selectedOffer.pointsCost.toLocaleString("en-US")} points to redeem ${selectedOffer.title}, worth ${selectedOffer.voucherValue.toLocaleString("en-US")} VND.`,
                  )
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedOffer ? (
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <RuleRow label={translate(language, "Äiá»ƒm kháº£ dá»¥ng", "Available points")} value={`${displayedPoints.toLocaleString(locale)} pts`} />
              <RuleRow label={translate(language, "Äiá»ƒm sá»­ dá»¥ng", "Points used")} value={`${selectedOffer.pointsCost.toLocaleString(locale)} pts`} />
              <RuleRow label={translate(language, "Sá»‘ dÆ° sau Ä‘á»•i", "Balance after redemption")} value={`${selectedRemainingPoints.toLocaleString(locale)} pts`} />
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedOffer(null)} disabled={redeemMutation.isPending}>
              {translate(language, "Huá»·", "Cancel")}
            </Button>
            <Button type="button" onClick={handleRedeem} disabled={redeemMutation.isPending} className="bg-[#007A78] text-white hover:bg-[#00605E]">
              {redeemMutation.isPending ? <Loader2 className="animate-spin" /> : <Gift />}
              {translate(language, "XÃ¡c nháº­n Ä‘á»•i Ä‘iá»ƒm", "Confirm redemption")}
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
  tierConfigs,
}: {
  offer: VoucherOfferState;
  locale: string;
  language: string;
  availablePoints: number;
  isPending: boolean;
  onSelect: (offer: VoucherOfferState) => void;
  tierConfigs?: any[]; // using any for simplicity, or TierConfig
}) {
  const disabled = !offer.eligible || !offer.affordable || isPending;

  const tierConfig = tierConfigs?.find((c) => c.tier === offer.minTier);
  const fallbackHex: Record<string, string> = {
    BRONZE: "#B07D4B",
    SILVER: "#94A3B8",
    GOLD: "#EAB308",
    PLATINUM: "#64748B",
    DIAMOND: "#A855F7",
  };
  const hexCode = tierConfig?.imageUrl || fallbackHex[offer.minTier] || undefined;
  const metal = generateTierMetalStyle(hexCode);
  const badge = generateTierBadgeStyle(hexCode);

  return (
    <div
      className={cn(
        "group flex min-h-[230px] flex-col rounded-2xl border p-5 transition-all duration-300 ease-out relative",
        offer.eligible 
          ? "hover:-translate-y-1 hover:scale-[1.02] shadow-sm" 
          : "opacity-[0.85] grayscale-[20%]"
      )}
      style={{
        background: metal.surface,
        borderColor: metal.border,
      }}
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
        <Badge variant="outline" className="border-white/40 bg-white/60 px-3 py-1 font-bold backdrop-blur-md" style={{ color: metal.text }}>
          {formatTierLabel(offer.minTier, tierConfigs)}
        </Badge>
      </div>

      <div className="relative z-10 mt-5 flex-1">
        <h3 className="text-[17px] font-black text-slate-900 leading-tight">{offer.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {normalizeMoneyValue(offer.voucherValue).toLocaleString(locale)} VND voucher {translate(language, "cho thÃ nh viÃªn", "for")} <span className="font-bold" style={{ color: metal.text }}>{formatTierLabel(offer.minTier, tierConfigs)}</span> {translate(language, "trá»Ÿ lÃªn", "and above")}.
        </p>
      </div>

      <div className="relative z-10 mt-5 flex items-end justify-between gap-3 border-t border-black/5 pt-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">{translate(language, "Chi phÃ­", "Cost")}</div>
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
            ? <span className="flex items-center gap-1.5"><Lock className="w-4 h-4" /> {translate(language, `LÃªn háº¡ng ${formatTierLabel(offer.minTier)}`, `Reach ${formatTierLabel(offer.minTier)}`)}</span>
            : !offer.affordable
              ? translate(language, `Cáº§n thÃªm ${offer.pointsCost - availablePoints} pts`, `Need ${offer.pointsCost - availablePoints} pts`)
              : translate(language, "Äá»•i ngay", "Redeem")}
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

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-3 py-2">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function MyVouchersList({ language, locale }: { language: string, locale: string }) {
  const getErrorMessage = useErrorMessage();
  const vouchersQuery = useCustomerDiscounts();

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
          <CardTitle>{translate(language as any, "KhÃ´ng thá»ƒ táº£i voucher", "Unable to load vouchers")}</CardTitle>
          <CardDescription>{getErrorMessage(vouchersQuery.error)}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!vouchersQuery.data || vouchersQuery.data.items.length === 0) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>{translate(language as any, "ChÆ°a cÃ³ voucher nÃ o", "No vouchers available")}</CardTitle>
          <CardDescription>
            {translate(
              language as any,
              "Hiá»‡n chÆ°a cÃ³ voucher nÃ o dÃ nh cho háº¡ng thÃ nh viÃªn cá»§a báº¡n.",
              "There are no exclusive vouchers for your tier at the moment."
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2 items-start">
      {vouchersQuery.data.items.map((item) => {
        const voucher = item.discount;
        if (!voucher) return null;
        return (
        <LuxuryVoucherCard
          key={voucher.code ?? item.id}
          title={voucher.name}
          amountText={voucher.discountType === "PERCENTAGE" ? `${voucher.discountValue}` : `${voucher.discountValue.toLocaleString(locale)}`}
          unitText={voucher.discountType === "PERCENTAGE" ? "% OFF" : "VND"}
          code={voucher.code ?? "NO CODE"}
          tier={
            voucher.applicableTierIds && voucher.applicableTierIds.length > 0
              ? voucher.applicableTierIds.map(t => formatTierLabel(t as any)).join(", ")
              : translate(language as any, "Táº¥t cáº£ háº¡ng", "All Tiers")
          }
          validUntil={voucher.endAt ? new Date(voucher.endAt).toLocaleDateString(locale) : "KhÃ´ng giá»›i háº¡n"}
          minOrder={
            voucher.minOrderAmount && voucher.minOrderAmount > 0
              ? `${voucher.minOrderAmount.toLocaleString(locale)} VND`
              : translate(language as any, "KhÃ´ng yÃªu cáº§u", "None")
          }
        />
      )})}
    </div>
  );
}





function normalizeMoneyValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

