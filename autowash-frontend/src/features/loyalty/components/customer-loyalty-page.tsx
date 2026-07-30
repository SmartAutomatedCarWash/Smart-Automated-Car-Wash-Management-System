"use client";

import Link from "next/link";
import { createElement, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  CheckCircle2,
  Clock3,
  Coins,
  Crown,
  Gem,
  Gift,
  History,
  Loader2,
  Lock,
  Medal,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TicketPercent,
  Wallet,
} from "lucide-react";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";
import { Input } from "@/shared/ui/ui/input";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { useAuthStore } from "@/features/auth/store/auth.store";
import {
  buildLoyaltySummary,
  canRedeemTierOffer,
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
import { generateTierBadgeStyle, generateTierMetalStyle } from "@/shared/lib/tier-styles";
import { cn } from "@/shared/lib/utils";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { useCustomerDiscounts } from "@/features/discounts/hooks/use-customer-discounts";
import type { LoyaltyTransaction, TierVoucherOffer } from "@/entities/loyalty";
import type { UserDiscount } from "@/entities/discounts";
import type { TierConfig } from "@/features/settings/lib/admin-tiers-service";

type VoucherOfferState = TierVoucherOffer & {
  eligible: boolean;
  affordable: boolean;
};

type WalletVoucherItem = UserDiscount & {
  voucherCode?: string | null;
  expiresAt?: string | null;
  discount?: {
    name: string;
    discountType: string;
    discountValue: number;
  } | null;
};

const TIER_ORDER = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] as const;
const MARKET_FILTERS = ["ALL", "AVAILABLE", ...TIER_ORDER] as const;

export function CustomerLoyaltyPageContent() {
  const { language } = useLanguageStore();
  const currentUserTier = useAuthStore((state) => state.user?.tier ?? "MEMBER");
  const getErrorMessage = useErrorMessage();

  const accountQuery = useCustomerLoyaltyAccount();
  const tiersQuery = usePublicTierConfigs();
  const offersQuery = usePublicTierVoucherOffers();
  const transactionsQuery = useCustomerLoyaltyTransactions(1, 50);
  const discountsQuery = useCustomerDiscounts();
  const redeemMutation = useCustomerRedeemPoints();

  const [selectedOffer, setSelectedOffer] = useState<VoucherOfferState | null>(null);
  const [previewOffer, setPreviewOffer] = useState<VoucherOfferState | null>(null);
  const [isSuccessVoucher, setIsSuccessVoucher] = useState(false);
  const [infoDialog, setInfoDialog] = useState<"BENEFITS" | "EARN" | null>(null);
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState<(typeof MARKET_FILTERS)[number]>("ALL");
  const [voucherSection, setVoucherSection] = useState<"MARKETPLACE" | "WALLET">("MARKETPLACE");

  const summary = useMemo(
    () => (accountQuery.data && tiersQuery.data ? buildLoyaltySummary(accountQuery.data, tiersQuery.data) : null),
    [accountQuery.data, tiersQuery.data],
  );

  const sortedTiers = useMemo(
    () => [...(tiersQuery.data ?? [])].sort((a, b) => a.rankOrder - b.rankOrder),
    [tiersQuery.data],
  );

  const locale = language === "vi" ? "vi-VN" : "en-US";
  const activeTier = summary?.tier ?? (currentUserTier as string);
  const currentTierIndex = Math.max(sortedTiers.findIndex((tier) => tier.tier === activeTier), 0);
  const currentTierConfig = sortedTiers[currentTierIndex];
  const nextTierConfig = sortedTiers[currentTierIndex + 1] ?? null;
  const displayedPoints = summary?.availablePoints ?? 0;
  const displayedLifetimePoints = summary?.lifetimePoints ?? 0;
  const displayedProgress = summary?.progress ?? {
    nextTier: null,
    pointsToNextTier: 0,
    progressPercent: 0,
  };
  const heroIcon = getTierIcon(activeTier);
  const currentBenefits = useMemo(
    () => buildCurrentBenefits(currentTierConfig, language),
    [currentTierConfig, language],
  );
  const nextTierBenefits = useMemo(
    () => buildNextTierBenefits(nextTierConfig, language),
    [language, nextTierConfig],
  );
  const pointsGuide = useMemo(
    () => buildHowToEarnPoints(language, currentTierConfig),
    [currentTierConfig, language],
  );
  const tierTrackProgressPercent = useMemo(() => {
    if (sortedTiers.length <= 1) return 100;

    const segmentCount = sortedTiers.length - 1;
    const safeTierIndex = Math.max(currentTierIndex, 0);

    if (safeTierIndex >= segmentCount) {
      return 100;
    }

    return (safeTierIndex / segmentCount) * 100;
  }, [currentTierIndex, sortedTiers.length]);
  const currentHex = currentTierConfig?.imageUrl || tierFallbackHex[activeTier] || tierFallbackHex.BRONZE;
  const tierMetal = generateTierMetalStyle(currentHex);

  const walletVouchers = useMemo(
    () => ((discountsQuery.data?.items ?? []) as WalletVoucherItem[]).filter((item) => Boolean(item.voucherCode)),
    [discountsQuery.data?.items],
  );

  const recentTransactions: LoyaltyTransaction[] = transactionsQuery.data?.items.slice(0, 5) ?? [];

  const voucherOffers = useMemo(() => {
    if (!tiersQuery.data || !offersQuery.data) return [];
    const tier = (summary?.tier ?? currentUserTier) as any;

    return offersQuery.data.map((offer) => ({
      ...offer,
      voucherValue: normalizeMoneyValue(offer.voucherValue),
      eligible: canRedeemTierOffer(tier, offer, tiersQuery.data),
      affordable: (summary?.availablePoints ?? 0) >= offer.pointsCost,
    }));
  }, [currentUserTier, offersQuery.data, summary?.availablePoints, summary?.tier, tiersQuery.data]);

  const filteredOffers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return voucherOffers.filter((offer) => {
      if (keyword.length > 0 && !offer.title.toLowerCase().includes(keyword)) return false;
      if (marketFilter === "ALL") return offer.eligible;
      if (marketFilter === "AVAILABLE") return offer.eligible && offer.affordable;
      return offer.eligible && offer.minTier === marketFilter;
    });
  }, [marketFilter, search, voucherOffers]);

  const expiringSoonCount = useMemo(() => {
    const now = new Date("2026-07-27T00:00:00+07:00").getTime();
    const twoWeeks = 14 * 24 * 60 * 60 * 1000;
    return walletVouchers.filter((item) => {
      if (!item.expiresAt) return false;
      const expiry = new Date(item.expiresAt).getTime();
      return Number.isFinite(expiry) && expiry >= now && expiry - now <= twoWeeks;
    }).length;
  }, [walletVouchers]);

  const handleRedeem = () => {
    if (!selectedOffer) return;
    redeemMutation.mutate(
      { offerId: selectedOffer.id },
      {
        onSuccess: () => {
          setIsSuccessVoucher(true);
          setSelectedOffer(null);
        },
      },
    );
  };

  if (accountQuery.isPending || tiersQuery.isLoading || offersQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tiersQuery.isError || offersQuery.isError) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-[30px] border-rose-200 bg-white">
          <CardHeader>
            <CardTitle>{translate(language, "Khong the tai loyalty", "Unable to load loyalty account")}</CardTitle>
            <CardDescription>{getErrorMessage(tiersQuery.error || offersQuery.error)}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[linear-gradient(180deg,#fffdf8_0%,#fbf8f2_35%,#f5f6fb_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8 font-['Be_Vietnam_Pro','Inter',sans-serif]">
      <div className="mx-auto max-w-[1320px] space-y-5">
        <section className="relative overflow-hidden rounded-[28px] border border-[#f0ddc4] bg-white shadow-[0_28px_60px_-40px_rgba(130,92,35,0.4)]">
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes light-sweep {
              0% { left: -150%; }
              50% { left: 150%; }
              100% { left: 150%; }
            }
            .animate-light-sweep {
              position: absolute;
              top: 0;
              height: 100%;
              width: 250px;
              background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.55), transparent);
              transform: skewX(-20deg);
              animation: light-sweep 6s infinite ease-in-out;
            }
          `}} />
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
            <div className="animate-light-sweep" />
          </div>
          <div
            className="relative grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.85fr_0.85fr]"
            style={{ background: `linear-gradient(135deg, #fff9ef 0%, ${currentHex}26 55%, #fff4df 100%)` }}
          >
            <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-[radial-gradient(circle_at_center,rgba(193,145,73,0.18),transparent_65%)]" />
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] border text-white shadow-[inset_0_2px_10px_rgba(255,255,255,0.25)]"
                  style={{
                    borderColor: `${currentHex}44`,
                    background: `linear-gradient(180deg, ${currentHex}, ${currentHex}cc)`,
                  }}
                >
                  {createElement(heroIcon, { className: "h-9 w-9" })}
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.24em]" style={{ color: tierMetal.text }}>
                    {formatTierLabel(activeTier as any, tiersQuery.data)} {translate(language, "Member", "Member")}
                  </div>
                  <div className="mt-1 text-[44px] font-black leading-none" style={{ color: tierMetal.text }}>{displayedLifetimePoints.toLocaleString(locale)} pts</div>
                  <p className="mt-2 text-sm text-slate-700">
                    {translate(language, "Welcome back, Customer User!", "Welcome back, Customer User!")}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>
                    {displayedProgress.nextTier
                      ? `${displayedProgress.pointsToNextTier.toLocaleString(locale)} pts left to reach ${formatTierLabel(displayedProgress.nextTier, tiersQuery.data)}`
                      : translate(language, "You are at the highest tier", "You are at the highest tier")}
                  </span>
                  <span>{displayedProgress.progressPercent}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/80 shadow-inner">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#c88a3f_0%,#e7c182_55%,#f1dbb4_100%)]" style={{ width: `${displayedProgress.progressPercent}%` }} />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => setInfoDialog("BENEFITS")}
                  className="h-10 rounded-xl bg-[#b97533] px-5 text-white hover:bg-[#a46528]"
                >
                  {translate(language, "View Benefits", "View Benefits")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInfoDialog("EARN")}
                  className="h-10 rounded-xl border-[#d8b180] bg-white/80 px-5 text-[#94612f] hover:bg-white"
                >
                  {translate(language, "How to Earn Points", "How to Earn Points")}
                </Button>
              </div>
            </div>

            <BenefitColumn
              title={translate(language, `Your Benefits (${formatTierLabel(activeTier as any, tiersQuery.data)})`, `Your Benefits (${formatTierLabel(activeTier as any, tiersQuery.data)})`)}
              items={currentBenefits}
            />

            <BenefitColumn
              title={
                nextTierConfig
                  ? translate(language, `Next Tier Benefits (${formatTierLabel(nextTierConfig.tier, tiersQuery.data)})`, `Next Tier Benefits (${formatTierLabel(nextTierConfig.tier, tiersQuery.data)})`)
                  : translate(language, "Top Tier Benefits", "Top Tier Benefits")
              }
              items={nextTierBenefits}
              faded
            />
          </div>
        </section>

        <section className="relative rounded-[24px] border border-[#ece8df] bg-white px-4 py-4 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.35)]">
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes progress-dot {
              0% {
                left: 0%;
                border-radius: 50% 50% 50% 50%;
                transform: translate(-50%, -50%) scale(0.9);
              }
              30% {
                border-radius: 60% 40% 50% 50%;
                transform: translate(-50%, -50%) scale(1.15) skewX(-6deg);
              }
              50% {
                border-radius: 40% 60% 45% 55%;
                transform: translate(-50%, -50%) scale(0.95) skewX(6deg);
              }
              70% {
                border-radius: 50% 45% 55% 50%;
                transform: translate(-50%, -50%) scale(1.1) skewX(-3deg);
              }
              100% {
                left: 100%;
                border-radius: 50% 50% 50% 50%;
                transform: translate(-50%, -50%) scale(0.9);
              }
            }
            .animate-progress-dot {
              position: absolute;
              top: 50%;
              height: 8px;
              width: 8px;
              background: linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%);
              box-shadow: 
                0 0 10px 2px rgba(56, 189, 248, 0.75), 
                0 0 4px 1px rgba(255, 255, 255, 0.8),
                inset -1px -1px 2px rgba(14, 165, 233, 0.3),
                inset 1px 1px 2px rgba(255, 255, 255, 1);
              animation: progress-dot 3.2s infinite ease-in-out;
            }
          `}} />
          <div className="relative">
            <div
              className="absolute left-[22px] top-5 hidden h-[2px] rounded-full bg-slate-200 lg:block"
              style={{
                width:
                  sortedTiers.length > 0
                    ? `${((sortedTiers.length - 1) / sortedTiers.length) * 100}%`
                    : "0px",
              }}
            />
            <div
              className="absolute left-[22px] top-5 hidden h-[2px] rounded-full bg-[linear-gradient(90deg,#b67a39_0%,#d9b171_40%,#8ed0ff_100%)] transition-all duration-700 lg:block"
              style={{
                width:
                  sortedTiers.length > 0
                    ? `${((sortedTiers.length - 1) / sortedTiers.length) *
                    Math.max(0, Math.min(tierTrackProgressPercent, 100))
                    }%`
                    : "0px",
              }}
            >
              <div className="animate-progress-dot" />
            </div>
            <div className="relative grid grid-cols-2 gap-4 lg:grid-cols-5 lg:gap-0">
              {sortedTiers.map((tier, index) => (
                <TierStep
                  key={tier.tier}
                  tier={tier}
                  isCurrent={tier.tier === activeTier}
                  isUnlocked={index <= currentTierIndex}
                  tiers={tiersQuery.data ?? []}
                  isLast={index === sortedTiers.length - 1}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiniStatCard icon={Wallet} label={translate(language, "Available Points", "Available Points")} value={`${displayedPoints.toLocaleString(locale)} pts`} />
          <MiniStatCard icon={Medal} label={translate(language, "Lifetime Points", "Lifetime Points")} value={`${displayedLifetimePoints.toLocaleString(locale)} pts`} />
          <MiniStatCard icon={Gift} label={translate(language, "Redeemed Vouchers", "Redeemed Vouchers")} value={`${walletVouchers.length} vouchers`} />
          <MiniStatCard icon={Clock3} label={translate(language, "Expiring Soon", "Expiring Soon")} value={`${expiringSoonCount} vouchers`} />
        </section>

        <section>
          <Card className="rounded-[28px] border-[#ece8df] bg-white shadow-[0_20px_55px_-42px_rgba(15,23,42,0.38)]">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-lg font-black text-slate-950">
                  {translate(language, "Voucher Marketplace", "Voucher Marketplace")}
                </CardTitle>
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setVoucherSection("MARKETPLACE")}
                    className={cn(
                      "inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-bold transition",
                      voucherSection === "MARKETPLACE" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800",
                    )}
                  >
                    {translate(language, "Voucher exchange", "Voucher exchange")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherSection("WALLET")}
                    className={cn(
                      "inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-bold transition",
                      voucherSection === "WALLET" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800",
                    )}
                  >
                    {translate(language, "My vouchers", "My vouchers")}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {voucherSection === "MARKETPLACE" ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={translate(language, "Search voucher...", "Search voucher...")}
                        className="h-11 rounded-2xl border-slate-200 pl-11"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {MARKET_FILTERS.map((filter) => (
                        <Button
                          key={filter}
                          type="button"
                          variant="outline"
                          onClick={() => setMarketFilter(filter)}
                          className={cn(
                            "h-9 rounded-full border px-4 text-xs font-bold uppercase tracking-wide",
                            marketFilter === filter
                              ? "border-[#0f2342] bg-[#0f2342] text-white hover:bg-[#0b1b34]"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                          )}
                        >
                          {renderMarketFilterLabel(filter)}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    {translate(
                      language,
                      "Nhung voucher ban da doi se hien thi tai day de theo doi va su dung.",
                      "Your redeemed vouchers are shown here for tracking and use.",
                    )}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {voucherSection === "MARKETPLACE" ? (
                filteredOffers.length === 0 ? (
                  <div className="col-span-full rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                    {translate(language, "No voucher matches the current filter.", "No voucher matches the current filter.")}
                  </div>
                ) : (
                  filteredOffers.slice(0, 8).map((offer) => (
                    <RewardVoucherCard
                      key={offer.id}
                      offer={offer}
                      locale={locale}
                      language={language}
                      isPending={redeemMutation.isPending}
                      onSelect={setSelectedOffer}
                      onViewDetails={setPreviewOffer}
                      tierConfigs={tiersQuery.data ?? []}
                    />
                  ))
                )
              ) : walletVouchers.length === 0 ? (
                <div className="col-span-full rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  {translate(language, "You have not redeemed any voucher yet.", "You have not redeemed any voucher yet.")}
                </div>
              ) : (
                walletVouchers.map((voucher) => (
                  <RedeemedVoucherCard
                    key={voucher.id}
                    voucher={voucher}
                    locale={locale}
                    language={language}
                    voucherOffers={voucherOffers}
                    tierConfigs={tiersQuery.data ?? []}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </section>

      </div>

      <Dialog open={Boolean(selectedOffer)} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{translate(language, "Confirm voucher redemption?", "Confirm voucher redemption?")}</DialogTitle>
            <DialogDescription>
              {selectedOffer
                ? `You will spend ${selectedOffer.pointsCost.toLocaleString(locale)} points to redeem ${selectedOffer.title}.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedOffer ? (
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <RuleRow label="Available points" value={`${displayedPoints.toLocaleString(locale)} pts`} />
              <RuleRow label="Points used" value={`${selectedOffer.pointsCost.toLocaleString(locale)} pts`} />
              <RuleRow label="Balance after redemption" value={`${Math.max(displayedPoints - selectedOffer.pointsCost, 0).toLocaleString(locale)} pts`} />
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedOffer(null)} disabled={redeemMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleRedeem} disabled={redeemMutation.isPending} className="bg-[#0f2342] text-white hover:bg-[#0b1b34]">
              {redeemMutation.isPending ? <Loader2 className="animate-spin" /> : <Gift />}
              Redeem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewOffer)} onOpenChange={(open) => !open && setPreviewOffer(null)}>
        <DialogContent className="overflow-hidden rounded-[28px] border-slate-200 p-0 sm:max-w-2xl">
          {previewOffer ? (
            <VoucherOfferDetails
              offer={previewOffer}
              locale={locale}
              language={language}
              tierConfigs={tiersQuery.data ?? []}
              isPending={redeemMutation.isPending}
              onClose={() => setPreviewOffer(null)}
              onRedeem={() => {
                setPreviewOffer(null);
                setSelectedOffer(previewOffer);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={infoDialog === "BENEFITS"} onOpenChange={(open) => !open && setInfoDialog(null)}>
        <DialogContent className="rounded-[28px] border-[#eadfce] bg-[linear-gradient(180deg,#fffdf7_0%,#fff9f0_100%)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-950">
              {translate(language, "Membership benefits", "Membership benefits")}
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {translate(
                language,
                "Thong tin quyen loi hien tai va cap ke tiep de ban de dang theo doi.",
                "Your current tier benefits and the next tier advantages in one place.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-[#efdac0] bg-white p-5 shadow-[0_18px_40px_-35px_rgba(122,88,40,0.35)]">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#9a6a1f]">
                {translate(language, "Current tier", "Current tier")}
              </div>
              <div className="mt-2 text-2xl font-black text-slate-950">
                {formatTierLabel(activeTier as any, tiersQuery.data)}
              </div>
              <div className="mt-4 space-y-3">
                {currentBenefits.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#95612d]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-35px_rgba(15,23,42,0.2)]">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                {nextTierConfig
                  ? translate(language, "Next tier", "Next tier")
                  : translate(language, "Top tier", "Top tier")}
              </div>
              <div className="mt-2 text-2xl font-black text-slate-950">
                {nextTierConfig
                  ? formatTierLabel(nextTierConfig.tier, tiersQuery.data)
                  : translate(language, "Highest level reached", "Highest level reached")}
              </div>
              <div className="mt-4 space-y-3">
                {nextTierBenefits.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#b97533]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" className="bg-[#0f2342] text-white hover:bg-[#0b1b34]" onClick={() => setInfoDialog(null)}>
              {translate(language, "Close", "Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={infoDialog === "EARN"} onOpenChange={(open) => !open && setInfoDialog(null)}>
        <DialogContent className="rounded-[28px] border-[#eadfce] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-950">
              {translate(language, "How to earn points", "How to earn points")}
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {translate(
                language,
                "Day la cac cach tich diem loyalty trong he thong hien tai.",
                "These are the available ways to collect loyalty points in the current system.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            {pointsGuide.map((item) => (
              <div key={item.title} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.28)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#4068b2]">
                    {createElement(item.icon, { className: "h-5 w-5" })}
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-950">{item.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{item.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" className="bg-[#0f2342] text-white hover:bg-[#0b1b34]" onClick={() => setInfoDialog(null)}>
              {translate(language, "Got it", "Got it")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSuccessVoucher} onOpenChange={setIsSuccessVoucher}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center">Redemption successful</DialogTitle>
            <DialogDescription className="text-center">The voucher has been added to your wallet.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button type="button" className="bg-[#0f2342] text-white hover:bg-[#0b1b34]" onClick={() => setIsSuccessVoucher(false)}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BenefitColumn({ title, items, faded = false }: { title: string; items: string[]; faded?: boolean }) {
  return (
    <div className={cn("relative rounded-[24px] border border-white/40 bg-white/35 p-5 backdrop-blur", faded ? "overflow-hidden" : "")}>
      {faded ? <Crown className="pointer-events-none absolute -bottom-4 right-0 h-28 w-28 text-[#d9b98d]/35" /> : null}
      <div className="text-sm font-black text-slate-900">{title}</div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#95612d]" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TierStep({
  tier,
  isCurrent,
  isUnlocked,
  tiers,
  isLast,
}: {
  tier: TierConfig;
  isCurrent: boolean;
  isUnlocked: boolean;
  tiers: TierConfig[];
  isLast?: boolean;
}) {
  const hex = tier.imageUrl || tierFallbackHex[tier.tier] || tierFallbackHex.BRONZE;
  const TierIcon = getTierIcon(tier.tier);
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black shadow-sm transition-all",
          isUnlocked ? "text-white" : "text-slate-400",
          isLast && "ring-4 ring-cyan-100/80 shadow-[0_8px_22px_-8px_rgba(14,165,233,0.75)]",
        )}
        style={{
          background: isUnlocked ? `linear-gradient(180deg, ${hex}, ${hex}cc)` : "#f8fafc",
          borderColor: isCurrent ? "#0f2342" : `${hex}55`,
        }}
      >
        <TierIcon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <div
          className={cn(
            "text-xs font-black uppercase tracking-wide text-slate-900",
            isLast && "text-sky-800",
          )}
        >
          {formatTierLabel(tier.tier, tiers)}
        </div>
        <div className="text-xs text-slate-500">{tier.minPoints.toLocaleString("en-US")} pts</div>
      </div>
    </div>
  );
}

function getTierIcon(tier: string): ComponentType<{ className?: string }> {
  switch (tier) {
    case "BRONZE":
      return Medal;
    case "SILVER":
      return ShieldCheck;
    case "GOLD":
      return Coins;
    case "PLATINUM":
      return Crown;
    case "DIAMOND":
      return Gem;
    default:
      return Star;
  }
}

function MiniStatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#ece8df] bg-white px-5 py-4 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.35)]">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4f7fb] text-[#6a7b99]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
          <div className="mt-1 text-[26px] font-black leading-none text-slate-950">{value}</div>
        </div>
      </div>
    </div>
  );
}

function RewardVoucherCard({
  offer,
  locale,
  language,
  isPending,
  onSelect,
  onViewDetails,
  tierConfigs,
}: {
  offer: VoucherOfferState;
  locale: string;
  language: string;
  isPending: boolean;
  onSelect: (offer: VoucherOfferState) => void;
  onViewDetails: (offer: VoucherOfferState) => void;
  tierConfigs: TierConfig[];
}) {
  const disabled = !offer.eligible || !offer.affordable || isPending;
  const hex = tierConfigs.find((item) => item.tier === offer.minTier)?.imageUrl || tierFallbackHex[offer.minTier] || tierFallbackHex.BRONZE;
  const availabilityLabel = !offer.eligible
    ? translate(language, "Tier locked", "Tier locked")
    : offer.affordable
      ? translate(language, "Ready to redeem", "Ready to redeem")
      : translate(language, "Not enough points", "Not enough points");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onViewDetails(offer)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onViewDetails(offer);
        }
      }}
      className="group flex h-full min-h-[390px] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white text-left shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_26px_56px_-34px_rgba(15,23,42,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a3c9]/40 focus-visible:ring-offset-2"
      aria-label={`${translate(language, "View detail", "View detail")}: ${offer.title}`}
    >
      <div
        className="relative h-[104px] overflow-hidden px-4 py-3"
        style={{ background: `linear-gradient(135deg, ${hex} 0%, ${hex}cc 48%, #0f2342 100%)` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_35%)]" />
        <div className="absolute bottom-0 right-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-900 shadow-sm">
          {formatTierLabel(offer.minTier, tierConfigs)}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="min-h-[126px]">
          <div className="line-clamp-2 text-xl font-black leading-tight text-slate-950">{offer.title}</div>
          <div className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
            {offer.minTier} tier voucher for members who want more premium rewards.
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-4 border-t border-slate-100 pt-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Redeem points</div>
            <div className="mt-2 grid gap-2">
              <div className="text-[30px] font-black leading-none text-[#16a3c9]">
                {offer.pointsCost.toLocaleString(locale)}
                <span className="ml-1 text-sm font-black text-[#16a3c9]/80">pts</span>
              </div>
              <span
                className={cn(
                  "inline-flex w-fit max-w-full items-center rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em]",
                  offer.eligible && offer.affordable
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {availabilityLabel}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Button
              type="button"
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(offer);
              }}
              className={cn(
                "h-11 rounded-xl px-4 font-black",
                disabled
                  ? "bg-slate-100 text-slate-400 hover:bg-slate-100"
                  : "bg-[#0f2342] text-white hover:bg-[#0b1b34]",
              )}
            >
              {translate(language, "Redeem", "Redeem")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoucherOfferDetails({
  offer,
  locale,
  language,
  tierConfigs,
  isPending,
  onClose,
  onRedeem,
}: {
  offer: VoucherOfferState;
  locale: string;
  language: string;
  tierConfigs: TierConfig[];
  isPending: boolean;
  onClose: () => void;
  onRedeem: () => void;
}) {
  const hex =
    tierConfigs.find((item) => item.tier === offer.minTier)?.imageUrl ||
    tierFallbackHex[offer.minTier] ||
    tierFallbackHex.BRONZE;
  const badge = generateTierBadgeStyle(hex);
  const canRedeem = offer.eligible && offer.affordable && !isPending;
  const redeemStatus = !offer.eligible
    ? translate(language, "Your tier is not eligible", "Your tier is not eligible")
    : offer.affordable
      ? translate(language, "Ready to redeem", "Ready to redeem")
      : translate(language, "Not enough points", "Not enough points");
  const voucherValue =
    offer.discountType === "PERCENT"
      ? `${offer.voucherValue}%`
      : `${offer.voucherValue.toLocaleString("vi-VN")} ₫`;

  return (
    <div>
      <div
        className="relative overflow-hidden px-6 py-7 text-white"
        style={{ background: `linear-gradient(135deg, ${hex} 0%, ${hex}cc 48%, #0f2342 100%)` }}
      >
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2342]">
              AURA CARE
            </span>
            <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
              {offer.badge || "VOUCHER"}
            </span>
          </div>
          <DialogHeader className="mt-5 text-left">
            <DialogTitle className="text-3xl font-black text-white">{offer.title}</DialogTitle>
            <DialogDescription className="text-sm leading-6 text-white/80">
              {offer.description ||
                `${formatTierLabel(offer.minTier, tierConfigs)} tier voucher for members who want more premium rewards.`}
            </DialogDescription>
          </DialogHeader>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <RuleRow label={translate(language, "Redeem points", "Redeem points")} value={`${offer.pointsCost.toLocaleString(locale)} pts`} />
          <RuleRow label={translate(language, "Voucher value", "Voucher value")} value={voucherValue} />
          <RuleRow
            label={translate(language, "Required tier", "Required tier")}
            value={formatTierLabel(offer.minTier, tierConfigs)}
          />
        </div>

        <div className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
          <RuleRow
            label={translate(language, "Minimum order", "Minimum order")}
            value={
              (offer.minOrderAmount ?? 0) > 0
                ? `${(offer.minOrderAmount ?? 0).toLocaleString("vi-VN")} ₫`
                : translate(language, "No minimum", "No minimum")
            }
          />
          <RuleRow
            label={translate(language, "Maximum discount", "Maximum discount")}
            value={
              offer.maxDiscountAmount != null
                ? `${offer.maxDiscountAmount.toLocaleString("vi-VN")} ₫`
                : translate(language, "Based on voucher value", "Based on voucher value")
            }
          />
          <RuleRow
            label={translate(language, "Valid after redemption", "Valid after redemption")}
            value={
              offer.validDaysAfterClaim != null
                ? `${offer.validDaysAfterClaim} ${translate(language, "days", "days")}`
                : translate(language, "Until the campaign ends", "Until the campaign ends")
            }
          />
          <RuleRow
            label={translate(language, "New customers only", "New customers only")}
            value={offer.newCustomerOnly ? translate(language, "Yes", "Yes") : translate(language, "No", "No")}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className="rounded-full px-3 py-1.5 text-xs font-black"
            style={{ color: badge.color, backgroundColor: badge.backgroundColor }}
          >
            {formatTierLabel(offer.minTier, tierConfigs)}
          </span>
          <span className={cn("text-sm font-bold", canRedeem ? "text-emerald-600" : "text-rose-500")}>
            {redeemStatus}
          </span>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {translate(language, "Close", "Close")}
          </Button>
          <Button
            type="button"
            disabled={!canRedeem}
            onClick={onRedeem}
            className="bg-[#0f2342] text-white hover:bg-[#0b1b34]"
          >
            <Gift className="h-4 w-4" />
            {translate(language, "Redeem voucher", "Redeem voucher")}
          </Button>
        </DialogFooter>
      </div>
    </div>
  );
}

function RedeemedVoucherCard({
  voucher,
  locale,
  language,
  voucherOffers,
  tierConfigs,
}: {
  voucher: WalletVoucherItem;
  locale: string;
  language: string;
  voucherOffers: VoucherOfferState[];
  tierConfigs: TierConfig[];
}) {
  const matchedOffer = resolveVoucherOfferPresentation(voucher, voucherOffers);
  const voucherTier = matchedOffer?.minTier ?? resolveVoucherTierFromName(voucher.discount?.name);
  const hex = tierConfigs.find((item) => item.tier === voucherTier)?.imageUrl || tierFallbackHex[voucherTier ?? "BRONZE"] || tierFallbackHex.BRONZE;
  const badge = generateTierBadgeStyle(hex);
  const voucherName = voucher.discount?.name || voucher.voucherCode || "Voucher";
  const voucherPoints = normalizeMoneyValue(voucher.pointsSpent);
  const statusLabel =
    voucher.status === "USED"
      ? translate(language, "Used", "Used")
      : voucher.status === "EXPIRED"
        ? translate(language, "Expired", "Expired")
        : translate(language, "Available", "Available");

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:shadow-[0_26px_48px_-32px_rgba(15,23,42,0.42)]">
      <div className="relative h-[118px] overflow-hidden bg-[linear-gradient(135deg,#0f2342_0%,#1f4b7a_55%,#5ca9d6_100%)] px-4 py-3">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${hex} 0%, ${hex}cc 48%, #0f2342 100%)` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_35%)]" />
        <div className="absolute bottom-0 right-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex h-full items-start justify-between">
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#0f2342]">
            AURA CARE
          </span>
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-700">
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <div className="text-xl font-black text-slate-950">{voucherName}</div>
          <div className="mt-2 text-sm leading-6 text-slate-500">
            {voucherTier
              ? `${formatTierLabel(voucherTier, tierConfigs)} ${translate(
                language,
                "tier voucher for members who want more premium rewards.",
                "tier voucher for members who want more premium rewards.",
              )}`
              : translate(
                language,
                "Voucher da duoc doi tu loyalty points va luu trong tai khoan cua ban.",
                "This voucher has been redeemed from loyalty points and saved in your account.",
              )}
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm">
          <RuleRow label={translate(language, "Voucher code", "Voucher code")} value={voucher.voucherCode || "-"} />
          <RuleRow
            label={translate(language, "Redeem points", "Redeem points")}
            value={`${voucherPoints.toLocaleString(locale)} pts`}
          />
          <RuleRow
            label={translate(language, "Expires at", "Expires at")}
            value={voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString(locale) : "-"}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="rounded-full px-2.5 py-1 font-bold" style={{ color: badge.color, backgroundColor: badge.backgroundColor }}>
            {voucherTier ? formatTierLabel(voucherTier, tierConfigs) : translate(language, "Voucher", "Voucher")}
          </span>
          <span className="font-bold text-slate-500">
            {voucher.usedAt
              ? `${translate(language, "Used on", "Used on")} ${new Date(voucher.usedAt).toLocaleDateString(locale)}`
              : `${translate(language, "Claimed on", "Claimed on")} ${new Date(voucher.claimedAt).toLocaleDateString(locale)}`}
          </span>
        </div>

        <div className="flex items-center justify-end">
          <Button asChild type="button" className="h-10 rounded-xl bg-[#0f2342] px-4 text-white hover:bg-[#0b1b34]">
            <Link href={`/customer/discounts/${voucher.id}`}>
              {translate(language, "View detail", "View detail")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function TierComparisonTable({ tiers }: { tiers: TierConfig[] }) {
  const rows = [
    {
      label: "Earn Points Per $1",
      render: (tier: TierConfig) => `${tier.pointMultiplier}x`,
    },
    {
      label: "Priority Booking",
      render: (tier: TierConfig) => (tier.priorityScore > 0 ? "Yes" : "No"),
    },
    {
      label: "Free Wash",
      render: (tier: TierConfig) => (tier.rankOrder >= 2 ? "Yes" : "-"),
    },
    {
      label: "Birthday Gift",
      render: (tier: TierConfig) => (tier.rankOrder >= 1 ? "Yes" : "-"),
    },
    {
      label: "Exclusive Offers",
      render: (tier: TierConfig) => (tier.rankOrder >= 1 ? "Yes" : "-"),
    },
    {
      label: "Support Level",
      render: (tier: TierConfig) => supportLabel(tier.rankOrder),
    },
  ];

  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-200">
      <div className="grid grid-cols-[1.2fr_repeat(5,minmax(0,1fr))] bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
        <div className="px-3 py-3">Benefits</div>
        {tiers.slice(0, 5).map((tier) => (
          <div key={tier.tier} className="px-2 py-3 text-center">
            {tier.tier}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[1.2fr_repeat(5,minmax(0,1fr))] border-t border-slate-200 text-sm">
          <div className="px-3 py-3 font-semibold text-slate-700">{row.label}</div>
          {tiers.slice(0, 5).map((tier) => (
            <div key={`${row.label}-${tier.tier}`} className="px-2 py-3 text-center text-slate-600">
              {row.render(tier)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function buildCurrentBenefits(tier: TierConfig | undefined, language: string) {
  if (!tier) {
    return [
      translate(language, "Earn points on every spend", "Earn points on every spend"),
      translate(language, "Access to member-only offers", "Access to member-only offers"),
      translate(language, "Basic support and booking", "Basic support and booking"),
    ];
  }

  return [
    `${tier.pointMultiplier}x ${translate(language, "points for every spend", "points for every spend")}`,
    translate(language, "Access to member-only offers", "Access to member-only offers"),
    tier.priorityScore > 0 ? translate(language, "Priority booking support", "Priority booking support") : translate(language, "Basic support and booking", "Basic support and booking"),
  ];
}

function buildNextTierBenefits(tier: TierConfig | null, language: string) {
  if (!tier) {
    return [
      translate(language, "Highest points multiplier active", "Highest points multiplier active"),
      translate(language, "Top priority support", "Top priority support"),
      translate(language, "Best exclusive offers unlocked", "Best exclusive offers unlocked"),
    ];
  }

  return [
    `${tier.pointMultiplier}x ${translate(language, "points for every spend", "points for every spend")}`,
    tier.priorityScore > 0 ? translate(language, "Priority booking support", "Priority booking support") : translate(language, "Standard booking support", "Standard booking support"),
    translate(language, "Exclusive tier member offers", "Exclusive tier member offers"),
  ];
}

function buildHowToEarnPoints(language: string, tier: TierConfig | undefined) {
  return [
    {
      icon: Wallet,
      title: translate(language, "Complete a paid booking", "Complete a paid booking"),
      description: tier
        ? translate(
          language,
          `Moi giao dich hoan tat se nhan diem theo he so ${tier.pointMultiplier}x cua hang hien tai.`,
          `Each completed purchase earns points using your current ${tier.pointMultiplier}x tier multiplier.`,
        )
        : translate(
          language,
          "Each completed purchase earns points based on your current membership tier.",
          "Each completed purchase earns points based on your current membership tier.",
        ),
    },
    {
      icon: Star,
      title: translate(language, "Submit a review", "Submit a review"),
      description: translate(
        language,
        "Sau khi hoan tat booking, danh gia dich vu de nhan them diem thuong neu he thong co ap dung.",
        "After a completed booking, leave a review to receive bonus points when the program applies.",
      ),
    },
    {
      icon: Sparkles,
      title: translate(language, "Reach a higher tier", "Reach a higher tier"),
      description: translate(
        language,
        "Lifetime points cang cao thi he so tich diem cang tot va quyen loi loyalty cang nhieu.",
        "Higher lifetime points unlock better multipliers and more loyalty benefits.",
      ),
    },
  ];
}

function renderMarketFilterLabel(filter: (typeof MARKET_FILTERS)[number]) {
  switch (filter) {
    case "ALL":
      return "All";
    case "AVAILABLE":
      return "Available";
    default:
      return filter;
  }
}

function formatRelativeDay(value: string) {
  const today = new Date("2026-07-27T00:00:00+07:00");
  const target = new Date(value);
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function supportLabel(rankOrder: number) {
  switch (rankOrder) {
    case 0:
      return "Normal";
    case 1:
      return "Priority";
    case 2:
      return "Priority+";
    case 3:
      return "VIP";
    default:
      return "VIP+";
  }
}

function normalizeMoneyValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveVoucherOfferPresentation(voucher: WalletVoucherItem, voucherOffers: VoucherOfferState[]) {
  const voucherName = voucher.discount?.name?.trim().toLowerCase();
  return (
    voucherOffers.find((offer) => offer.title.trim().toLowerCase() === voucherName) ??
    voucherOffers.find((offer) => offer.pointsCost === voucher.pointsSpent)
  );
}

function resolveVoucherTierFromName(name: string | undefined) {
  const normalized = name?.toUpperCase() ?? "";
  if (normalized.includes("DIAMOND")) return "DIAMOND";
  if (normalized.includes("PLATINUM")) return "PLATINUM";
  if (normalized.includes("GOLD")) return "GOLD";
  if (normalized.includes("SILVER")) return "SILVER";
  if (normalized.includes("BRONZE")) return "BRONZE";
  return null;
}

const tierFallbackHex: Record<string, string> = {
  BRONZE: "#B07D4B",
  SILVER: "#94A3B8",
  GOLD: "#EAB308",
  PLATINUM: "#7C5CE0",
  DIAMOND: "#2CB7F5",
};
