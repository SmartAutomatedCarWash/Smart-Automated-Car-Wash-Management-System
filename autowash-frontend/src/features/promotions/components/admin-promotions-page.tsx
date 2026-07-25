"use client";


import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Calendar as CalendarIcon,
  Clock3,
  Flame,
  Layers3,
  Loader2,
  Megaphone,
  Pencil,
  Percent,
  Plus,
  RefreshCcw,
  Search,
  Ticket,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Calendar } from "@/shared/ui/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Checkbox } from "@/shared/ui/ui/checkbox";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/ui/table";
import { Badge } from "@/shared/ui/ui/badge";
import { cn } from "@/shared/lib/utils";
import { discountNameFormatMessage, getVoucherCodeFormatError, sanitizeDiscountNameInput, sanitizeVoucherCodeInput } from "@/shared/lib/validators";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";
import { getApiErrorFallbackMessage, getFirstFieldErrorMessage } from "@/shared/lib/api-errors";
import {
  useAdminPromotion,
  useAdminPromotions,
  useCreateAdminPromotion,
  useUpdateAdminPromotion,
} from "@/features/promotions/hooks/use-admin-promotions";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type {
  Promotion,
  PromotionDiscountType,
  PromotionRequest,
  PromotionStatus,
  PromotionTargetingMode,
} from "@/entities/promotions";
import type { LoyaltyTier } from "@/entities/loyalty";
import { useTierConfigs } from "@/features/settings/hooks/use-admin-tiers";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { useTierStore } from "@/shared/store/tier.store";
import { DynamicTierBadge } from "@/shared/ui/workspace/dynamic-tier-badge";
import type { AdminPromotionKind } from "@/features/promotions/api/admin-promotions-service";
import { useTierStyle } from "@/shared/lib/tier-styles";

type PromotionFormValues = {
  code: string;
  name: string;
  description?: string;
  discountType: PromotionDiscountType;
  discountValue: string;
  startDate: string;
  endDate: string;
  targetingMode: PromotionTargetingMode;
  applicableTiers: LoyaltyTier[];
  maxUsagePerCustomer: string;
  pointMultiplier?: string;
  status: PromotionStatus;
};

type PromotionFormErrors = Partial<Record<keyof PromotionFormValues, string>>;

const PAGE_LIMIT = 10;
const FETCH_LIMIT = 100;
const FALLBACK_TIERS: LoyaltyTier[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];
const promotionNameFormatMessage = discountNameFormatMessage;
const sanitizePromotionNameInput = sanitizeDiscountNameInput;

function getDisplayErrorMessage(error: unknown) {
  return getFirstFieldErrorMessage(error) ?? getApiErrorFallbackMessage(error) ?? "Unable to complete request.";
}

type PromotionFilters = {
  name: string;
  status: "ALL" | PromotionStatus;
  date: string;
};

const EMPTY_FORM: PromotionFormValues = {
  code: "",
  name: "",
  description: "",
  discountType: "NONE",
  discountValue: "",
  startDate: "",
  endDate: "",
  targetingMode: "ALL_TIERS",
  applicableTiers: [],
  maxUsagePerCustomer: "",
  pointMultiplier: "1",
  status: "ACTIVE",
};

export function AdminPromotionsPageContent({ workspaceLabel = "Admin Growth Console" }: { workspaceLabel?: string }) {
  const { language } = useLanguageStore();
  const { fetchTiers } = useTierStore();
  
  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  const [activeKind, setActiveKind] = useState<AdminPromotionKind>("PROMOTION");
  const [displayPage, setDisplayPage] = useState(1);
  const [filters, setFilters] = useState<PromotionFilters>({ name: "", status: "ALL", date: "" });
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionFormValues>(EMPTY_FORM);
  const [showValidation, setShowValidation] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const promotionsQuery = useAdminPromotions(1, FETCH_LIMIT, activeKind);
  const tiersQuery = useTierConfigs();
  const promotionDetailQuery = useAdminPromotion(editingPromotionId);
  const createMutation = useCreateAdminPromotion(activeKind);
  const updateMutation = useUpdateAdminPromotion(activeKind);
  const tierOptions = tiersQuery.data?.map((tier) => tier.tier) ?? FALLBACK_TIERS;
  const isVoucherView = activeKind === "VOUCHER";
  const itemLabelPlural = isVoucherView
    ? translate(language, "voucher", "vouchers")
    : translate(language, "khuyáº¿n mÃ£i", "promotions");

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const activeMutationError = (createMutation.error ?? updateMutation.error) as ApiErrorResponse | null;
  const clientErrors = useMemo(() => validatePromotionForm(form, language, isVoucherView), [form, language, isVoucherView]);
  const displayErrors = mergeFormErrors(clientErrors, activeMutationError, showValidation);

  const filteredPromotions = useMemo(
    () => filterPromotions(promotionsQuery.data?.items ?? [], filters),
    [promotionsQuery.data?.items, filters],
  );

  const totalDisplayPages = Math.max(1, Math.ceil(filteredPromotions.length / PAGE_LIMIT));
  const paginatedPromotions = useMemo(() => {
    const start = (displayPage - 1) * PAGE_LIMIT;
    return filteredPromotions.slice(start, start + PAGE_LIMIT);
  }, [filteredPromotions, displayPage]);

  const isEditing = Boolean(editingPromotion);
  const canGoPrev = displayPage > 1;
  const canGoNext = displayPage < totalDisplayPages;
  const hasActiveFilters = Boolean(filters.name || filters.status !== "ALL" || filters.date);

  const activePromotions = filteredPromotions.filter((promotion) => promotion.status === "ACTIVE");
  const runningPromotions = activePromotions.filter((promotion) => getPromotionPhase(promotion) === "Running");
  const expiringSoonPromotions = activePromotions.filter((promotion) => isPromotionExpiringSoon(promotion));

  useEffect(() => {
    setDisplayPage(1);
  }, [filters, activeKind]);

  useEffect(() => {
    handleResetForm();
    setFilters({ name: "", status: "ALL", date: "" });
  }, [activeKind]);

  useEffect(() => {
    if (promotionDetailQuery.data) {
      setEditingPromotion(promotionDetailQuery.data);
      setForm(toFormValues(promotionDetailQuery.data));
      setIsModalOpen(true);
    }
  }, [promotionDetailQuery.data]);

  const summaryCards = [
    {
      label: translate(language, "Tá»•ng chiáº¿n dá»‹ch", "Total campaigns"),
      value: filteredPromotions.length,
      description: translate(language, "Hiá»ƒn thá»‹ trong cháº¿ Ä‘á»™ xem hiá»‡n táº¡i", "Visible in the current view"),
      icon: Layers3,
      tone: "from-slate-900 via-slate-800 to-slate-700 text-white shadow-slate-900/20",
    },
    {
      label: translate(language, "Äang cháº¡y", "Running now"),
      value: runningPromotions.length,
      description: translate(language, "Äang hoáº¡t Ä‘á»™ng vÃ  trong khoáº£ng thá»i gian hiá»‡n táº¡i", "Active and currently in date range"),
      icon: Flame,
      tone: "from-orange-500 via-amber-500 to-yellow-400 text-white shadow-orange-500/25",
    },
    {
      label: translate(language, "Äang hoáº¡t Ä‘á»™ng", "Active"),
      value: activePromotions.length,
      description: translate(language, "Sáºµn sÃ ng Ã¡p dá»¥ng cho khÃ¡ch hÃ ng", "Ready to be applied by customers"),
      icon: BadgeCheck,
      tone: "from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-emerald-500/25",
    },
    {
      label: translate(language, "Sáº¯p káº¿t thÃºc", "Ending soon"),
      value: expiringSoonPromotions.length,
      description: translate(language, "Cáº§n xem xÃ©t nhanh trong tuáº§n nÃ y", "Need a quick review this week"),
      icon: Clock3,
      tone: "from-rose-500 via-pink-500 to-fuchsia-500 text-white shadow-rose-500/25",
    },
  ];

  const handleResetFilters = () => {
    setFilters({ name: "", status: "ALL", date: "" });
  };

  const handleResetForm = () => {
    setEditingPromotion(null);
    setEditingPromotionId(null);
    setForm(EMPTY_FORM);
    setShowValidation(false);
    createMutation.reset();
    updateMutation.reset();
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setEditingPromotionId(promotion.promotionId);
    setForm(toFormValues(promotion));
    setShowValidation(false);
    createMutation.reset();
    updateMutation.reset();
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    setShowValidation(true);
    if (Object.keys(clientErrors).length > 0) return;

    const payload = toRequestPayload(form);
    if (!payload) return;

    try {
      if (editingPromotion) {
        await updateMutation.mutateAsync({ promotionId: editingPromotion.promotionId, payload });
        toast.success(
          isVoucherView
            ? translate(language, "ÄÃ£ cáº­p nháº­t voucher.", "Voucher updated.")
            : translate(language, "ÄÃ£ cáº­p nháº­t chÆ°Æ¡ng trÃ¬nh khuyáº¿n mÃ£i.", "Promotion updated."),
        );
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(
          isVoucherView
            ? translate(language, "ÄÃ£ táº¡o voucher.", "Voucher created.")
            : translate(language, "ÄÃ£ táº¡o chÆ°Æ¡ng trÃ¬nh khuyáº¿n mÃ£i.", "Promotion created."),
        );
      }
      handleResetForm();
      setIsModalOpen(false);
    } catch {
      toast.error(
        isVoucherView
          ? translate(language, "KhÃ´ng thá»ƒ lÆ°u voucher.", "Unable to save voucher.")
          : translate(language, "KhÃ´ng thá»ƒ lÆ°u chÆ°Æ¡ng trÃ¬nh khuyáº¿n mÃ£i.", "Unable to save promotion."),
      );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-8 px-6 py-7 md:px-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-orange-700">
                {workspaceLabel}
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 text-white shadow-[0_18px_38px_rgba(249,115,22,0.35)]">
                  <Megaphone className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                    {isVoucherView
                      ? translate(language, "Voucher", "Vouchers")
                      : translate(language, "Khuyáº¿n mÃ£i", "Promotions")}
                  </h1>
                  <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-9 rounded-full px-4 text-xs font-bold",
                        activeKind === "PROMOTION"
                          ? "bg-orange-500 text-white shadow-sm hover:bg-orange-500 hover:text-white"
                          : "text-slate-600 hover:bg-slate-50",
                      )}
                      onClick={() => setActiveKind("PROMOTION")}
                    >
                      <Megaphone className="mr-2 h-3.5 w-3.5" />
                      {translate(language, "Promotions", "Promotions")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-9 rounded-full px-4 text-xs font-bold",
                        activeKind === "VOUCHER"
                          ? "bg-cyan-600 text-white shadow-sm hover:bg-cyan-600 hover:text-white"
                          : "text-slate-600 hover:bg-slate-50",
                      )}
                      onClick={() => setActiveKind("VOUCHER")}
                    >
                      <Ticket className="mr-2 h-3.5 w-3.5" />
                      {translate(language, "Voucher", "Vouchers")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                className="h-11 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-5 text-sm font-semibold shadow-[0_16px_38px_rgba(37,99,235,0.28)] hover:from-blue-500 hover:to-blue-400"
                onClick={() => {
                  handleResetForm();
                  setIsModalOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {isVoucherView
                  ? translate(language, "Táº¡o voucher", "Create voucher")
                  : translate(language, "Táº¡o khuyáº¿n mÃ£i", "Create promotion")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full border-slate-200 bg-white/90 px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={() => promotionsQuery.refetch()}
                disabled={promotionsQuery.isFetching}
              >
                <RefreshCcw className={cn("mr-2 h-4 w-4", promotionsQuery.isFetching && "animate-spin")} />
                {translate(language, "Táº£i láº¡i", "Refresh")}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 border-t border-slate-100/80 bg-slate-50/55 px-6 py-5 md:grid-cols-2 md:px-8 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className={cn(
                    "rounded-2xl bg-gradient-to-br p-3.5 shadow-md",
                    card.tone,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                        {card.label}
                      </p>
                      <p className="mt-1 text-2xl font-black tracking-tight">{card.value}</p>
                      <p className="mt-1.5 text-[11px] leading-snug text-white/80 line-clamp-2">{card.description}</p>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <Card className="rounded-[26px] border border-white/70 bg-white/85 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.07)] backdrop-blur md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="min-w-0 flex-[1.8] space-y-1.5">
              <Label
                htmlFor="filter-name"
                className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500"
              >
                {translate(language, "TÃ¬m kiáº¿m chiáº¿n dá»‹ch", "Search campaign")}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="filter-name"
                  value={filters.name}
                  onChange={(event) => setFilters((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder={
                    isVoucherView
                      ? translate(language, "TÃ¬m theo tÃªn voucher...", "Search by voucher name...")
                      : translate(language, "TÃ¬m theo tÃªn khuyáº¿n mÃ£i...", "Search by promotion name...")
                  }
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50/80 pl-10 shadow-inner shadow-slate-100/70 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <Label
                htmlFor="filter-status"
                className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500"
              >
                {translate(language, "Tráº¡ng thÃ¡i", "Status")}
              </Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value as PromotionFilters["status"] }))
                }
              >
                <SelectTrigger
                  id="filter-status"
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50/80 shadow-inner shadow-slate-100/70"
                >
                  <SelectValue placeholder={translate(language, "Táº¥t cáº£ tráº¡ng thÃ¡i", "All status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{translate(language, "Táº¥t cáº£ tráº¡ng thÃ¡i", "All status")}</SelectItem>
                  <SelectItem value="ACTIVE">{translate(language, "Äang hoáº¡t Ä‘á»™ng", "Active")}</SelectItem>
                  <SelectItem value="INACTIVE">{translate(language, "KhÃ´ng hoáº¡t Ä‘á»™ng", "Inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                {translate(language, "Hoáº¡t Ä‘á»™ng vÃ o ngÃ y", "Active on date")}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-11 w-full justify-start rounded-2xl border-slate-200 bg-slate-50/80 px-4 text-left font-medium text-slate-700 shadow-inner shadow-slate-100/70",
                      !filters.date && "text-slate-400",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.date ? formatFilterDate(filters.date, language) : translate(language, "Chá»n ngÃ y", "Pick a date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.date ? new Date(filters.date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, "0");
                        const day = String(date.getDate()).padStart(2, "0");
                        setFilters((prev) => ({ ...prev, date: `${year}-${month}-${day}` }));
                      } else {
                        setFilters((prev) => ({ ...prev, date: "" }));
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2 pb-0.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
                className="h-11 rounded-full border-slate-200 bg-white px-4 font-semibold text-slate-600"
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                {translate(language, "Äáº·t láº¡i", "Reset")}
              </Button>
            </div>
          </div>
        </Card>

        <Dialog
          open={isModalOpen}
          onOpenChange={(open: boolean) => {
            setIsModalOpen(open);
            if (!open) {
              handleResetForm();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[28px] border border-white/70 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,0.16)]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-950">
                {isEditing
                  ? isVoucherView
                    ? translate(language, "Chá»‰nh sá»­a voucher", "Edit voucher")
                    : translate(language, "Chá»‰nh sá»­a khuyáº¿n mÃ£i", "Edit promotion")
                  : isVoucherView
                    ? translate(language, "Táº¡o voucher", "Create voucher")
                    : translate(language, "Táº¡o khuyáº¿n mÃ£i", "Create promotion")}
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-500">
                {translate(
                  language,
                  "Thiáº¿t láº­p thÃ´ng tin giáº£m giÃ¡, ngÃ y Ã¡p dá»¥ng vÃ  Ä‘á»‘i tÆ°á»£ng má»¥c tiÃªu trÆ°á»›c khi Ä‘Äƒng.",
                  "Set discount details, active dates, and tier targeting before publishing.",
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              {promotionDetailQuery.isFetching && editingPromotionId ? (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isVoucherView
                    ? translate(language, "Äang táº£i chi tiáº¿t voucher...", "Loading latest voucher details...")
                    : translate(language, "Äang táº£i chi tiáº¿t khuyáº¿n mÃ£i...", "Loading latest promotion details...")}
                </div>
              ) : null}

              {promotionDetailQuery.isError && editingPromotionId ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {getDisplayErrorMessage(promotionDetailQuery.error)}
                </p>
              ) : null}

              {activeMutationError ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {getDisplayErrorMessage(activeMutationError)}
                </p>
              ) : null}

              <div className="grid gap-5 rounded-[24px] border border-slate-100 bg-slate-50/75 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  {translate(language, "ThÃ´ng tin cÆ¡ báº£n", "Basic Information")}
                </p>
                <FormField label={translate(language, "TÃªn", "Name")} error={displayErrors.name}>
                  <Input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder={
                      isVoucherView
                        ? translate(language, "TÃªn voucher", "Voucher name")
                        : translate(language, "TÃªn chÆ°Æ¡ng trÃ¬nh khuyáº¿n mÃ£i", "Promotion name")
                    }
                    className="h-11 rounded-2xl border-slate-200 bg-white"
                  />
                  <p className="text-xs text-slate-500">{promotionNameFormatMessage}</p>
                </FormField>

                {!isVoucherView ? (
                  <FormField label={translate(language, "MÃ£ khuyáº¿n mÃ£i", "Promotion code")} error={displayErrors.code}>
                    <Input
                      value={form.code}
                      onChange={(event) => setForm((prev) => ({ ...prev, code: sanitizeVoucherCodeInput(event.target.value) }))}
                      placeholder="SUMMER30"
                    />
                  </FormField>
                ) : null}

                {isVoucherView ? (
                  <FormField label={translate(language, "Số điểm đổi voucher", "Voucher points")} error={displayErrors.pointMultiplier}>
                    <Input
                      type="number"
                      min={1}
                      value={form.pointMultiplier}
                      onChange={(event) => setForm((prev) => ({ ...prev, pointMultiplier: event.target.value }))}
                      placeholder={translate(language, "Nhập số điểm cần đổi", "Enter redeem points")}
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </FormField>
                ) : null}
              </div>

              <div className="grid gap-5 rounded-[24px] border border-slate-100 bg-slate-50/75 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  {translate(language, "CÃ i Ä‘áº·t giáº£m giÃ¡", "Discount Setup")}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={translate(language, "Loáº¡i giáº£m giÃ¡", "Discount type")} error={displayErrors.discountType}>
                    <select
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                      value={form.discountType}
                      onChange={(event) =>
                        setForm((prev) => ({ 
                          ...prev, 
                          discountType: event.target.value as PromotionDiscountType,
                          discountValue: "" 
                        }))
                      }
                    >
                      <option value="NONE">{translate(language, "KhÃ´ng chá»n", "None")}</option>
                      <option value="PERCENT">{translate(language, "Pháº§n trÄƒm", "Percent")}</option>
                      <option value="FIXED_AMOUNT">{translate(language, "Cá»‘ Ä‘á»‹nh", "Fixed")}</option>
                    </select>
                  </FormField>

                  {form.discountType !== "NONE" ? (
                    <FormField label={translate(language, "GiÃ¡ trá»‹ giáº£m giÃ¡", "Discount value")} error={displayErrors.discountValue}>
                      {form.discountType === "PERCENT" ? (
                        <select
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                          value={form.discountValue}
                          onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
                        >
                          <option value="">{translate(language, "Chá»n má»©c giáº£m", "Select discount")}</option>
                          <option value="5">5%</option>
                          <option value="10">10%</option>
                          <option value="15">15%</option>
                          <option value="20">20%</option>
                          <option value="25">25%</option>
                          <option value="30">30%</option>
                          <option value="40">40%</option>
                          <option value="50">50%</option>
                        </select>
                      ) : (
                        <Input
                          type="number"
                          min={1}
                          value={form.discountValue}
                          onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
                          placeholder={translate(language, "Sá»‘ tiá»n VND", "VND amount")}
                          className="h-11 rounded-2xl border-slate-200 bg-white"
                        />
                      )}
                    </FormField>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-5 rounded-[24px] border border-slate-100 bg-slate-50/75 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  {translate(language, "Thá»i gian Ã¡p dá»¥ng", "Availability")}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={translate(language, "NgÃ y báº¯t Ä‘áº§u", "Start date")} error={displayErrors.startDate}>
                    <Input
                      type="datetime-local"
                      value={form.startDate}
                      onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </FormField>

                  <FormField label={translate(language, "NgÃ y káº¿t thÃºc", "End date")} error={displayErrors.endDate}>
                    <Input
                      type="datetime-local"
                      value={form.endDate}
                      onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </FormField>
                </div>
              </div>

              <div className="grid gap-5 rounded-[24px] border border-slate-100 bg-slate-50/75 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  {translate(language, "Äá»‘i tÆ°á»£ng má»¥c tiÃªu", "Audience Targeting")}
                </p>
                <FormField label={translate(language, "Cháº¿ Ä‘á»™ nháº¯m má»¥c tiÃªu", "Targeting mode")} error={displayErrors.targetingMode}>
                  <select
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                    value={form.targetingMode}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        targetingMode: event.target.value as PromotionTargetingMode,
                        applicableTiers: event.target.value === "ALL_TIERS" ? [] : prev.applicableTiers,
                      }))
                    }
                  >
                    <option value="ALL_TIERS">{translate(language, "Táº¥t cáº£ cÃ¡c háº¡ng", "All tiers")}</option>
                    <option value="SELECTED_TIERS">{translate(language, "Háº¡ng Ä‘Æ°á»£c chá»n", "Selected tiers")}</option>
                  </select>
                </FormField>

                {form.targetingMode === "SELECTED_TIERS" ? (
                  <FormField label={translate(language, "CÃ¡c háº¡ng Ä‘Æ°á»£c Ã¡p dá»¥ng", "Applicable tiers")} error={displayErrors.applicableTiers}>
                    <div className="grid grid-cols-2 gap-2">
                      {tierOptions.map((tier) => (
                        <TierSelectionOption
                          key={tier}
                          tier={tier}
                          checked={form.applicableTiers.includes(tier)}
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({
                              ...prev,
                              applicableTiers: checked === true
                                ? [...prev.applicableTiers, tier]
                                : prev.applicableTiers.filter((value) => value !== tier),
                            }))
                          }
                        />
                      ))}
                    </div>
                  </FormField>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={translate(language, "Sá»‘ láº§n dÃ¹ng tá»‘i Ä‘a / khÃ¡ch", "Max usage / customer")} error={displayErrors.maxUsagePerCustomer}>
                    <Input
                      type="number"
                      min={1}
                      value={form.maxUsagePerCustomer}
                      onChange={(event) => setForm((prev) => ({ ...prev, maxUsagePerCustomer: event.target.value }))}
                      placeholder={translate(language, "Tuá»³ chá»n", "Optional")}
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </FormField>

                  <FormField label={translate(language, "Tráº¡ng thÃ¡i", "Status")} error={displayErrors.status}>
                    <select
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                      value={form.status}
                      onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as PromotionStatus }))}
                    >
                      <option value="ACTIVE">{translate(language, "Äang hoáº¡t Ä‘á»™ng", "Active")}</option>
                      <option value="INACTIVE">{translate(language, "KhÃ´ng hoáº¡t Ä‘á»™ng", "Inactive")}</option>
                    </select>
                  </FormField>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-full px-5" onClick={() => setIsModalOpen(false)}>
                  {translate(language, "Huá»·", "Cancel")}
                </Button>
                <Button
                  type="button"
                  className="rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-5 shadow-[0_16px_30px_rgba(37,99,235,0.24)]"
                  onClick={handleSubmit}
                  disabled={isSubmitting || promotionDetailQuery.isFetching}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing
                    ? translate(language, "LÆ°u thay Ä‘á»•i", "Save changes")
                    : isVoucherView
                      ? translate(language, "Táº¡o voucher", "Create voucher")
                      : translate(language, "Táº¡o khuyáº¿n mÃ£i", "Create promotion")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <CardHeader className="border-b border-slate-100 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.95))] px-6 py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle className="text-xl font-black tracking-tight text-slate-950">
                  {isVoucherView
                    ? translate(language, "Danh sÃ¡ch voucher", "Voucher list")
                    : translate(language, "Danh sÃ¡ch khuyáº¿n mÃ£i", "Promotion list")}
                </CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasActiveFilters ? (
                  <Badge variant="outline" className="rounded-full border-orange-200 bg-orange-50 px-3 py-1 text-orange-700">
                    {translate(language, "Äang lá»c", "Filters applied")}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                  {activePromotions.length} {translate(language, "Ä‘ang hoáº¡t Ä‘á»™ng", "active")}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {promotionsQuery.isPending ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                {isVoucherView
                  ? translate(language, "Äang táº£i voucher...", "Loading vouchers...")
                  : translate(language, "Äang táº£i khuyáº¿n mÃ£i...", "Loading promotions...")}
              </div>
            ) : promotionsQuery.isError ? (
              <div className="m-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {getDisplayErrorMessage(promotionsQuery.error)}
              </div>
            ) : filteredPromotions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
                <Megaphone className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">
                  {hasActiveFilters
                    ? translate(
                        language,
                        `KhÃ´ng cÃ³ ${itemLabelPlural} nÃ o khá»›p vá»›i bá»™ lá»c.`,
                        `No ${itemLabelPlural} match your filters.`,
                      )
                    : translate(language, `ChÆ°a cÃ³ ${itemLabelPlural} nÃ o.`, `No ${itemLabelPlural} yet.`)}
                </p>
                <p className="text-xs text-slate-400">
                  {hasActiveFilters
                    ? translate(language, "Thá»­ Ä‘iá»u chá»‰nh tiÃªu chÃ­ tÃ¬m kiáº¿m hoáº·c bá»™ lá»c.", "Try adjusting search or filter criteria.")
                    : translate(language, "Táº¡o chiáº¿n dá»‹ch Ä‘áº§u tiÃªn Ä‘á»ƒ báº¯t Ä‘áº§u.", "Create your first campaign to get started.")}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/90">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                          {translate(language, "Chiáº¿n dá»‹ch", "Campaign")}
                        </TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                          {translate(language, "Giáº£m giÃ¡", "Discount")}
                        </TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                          {translate(language, "Äá»‘i tÆ°á»£ng", "Audience")}
                        </TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                          {translate(language, "Lá»‹ch trÃ¬nh", "Schedule")}
                        </TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                          {translate(language, "Tráº¡ng thÃ¡i", "Status")}
                        </TableHead>
                        <TableHead className="pr-6 text-right text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                          {translate(language, "HÃ nh Ä‘á»™ng", "Actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPromotions.map((promotion) => {
                        const phase = getPromotionPhase(promotion);
                        const phaseLabel = translatePhase(phase, language);
                        return (
                          <TableRow key={promotion.promotionId} className="group border-slate-100 hover:bg-orange-50/35">
                            <TableCell className="pl-6 py-4">
                              <div className="font-semibold text-slate-900">{promotion.name}</div>
                              {!isVoucherView && promotion.code ? (
                                <div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                                  {promotion.code}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              {promotion.discountType === "NONE" ? (
                                <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-bold text-slate-500">
                                  {translate(language, "KhÃ´ng Ã¡p dá»¥ng", "N/A")}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "rounded-full border-0 px-3 py-1 font-bold shadow-sm",
                                    promotion.discountType === "PERCENT"
                                      ? "bg-sky-100 text-sky-700"
                                      : "bg-teal-100 text-teal-700",
                                  )}
                                >
                                  {promotion.discountType === "PERCENT" ? (
                                    <Percent className="mr-1 inline h-3 w-3" />
                                  ) : null}
                                  {formatDiscount(promotion.discountType || "PERCENT", promotion.discountValue, language)}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {promotion.targetingMode === "ALL_TIERS" ? (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-slate-200 bg-slate-100 px-3 py-1 text-slate-700"
                                >
                                  {translate(language, "Táº¥t cáº£ cÃ¡c háº¡ng", "All tiers")}
                                </Badge>
                              ) : (
                                <div className="flex max-w-[220px] flex-wrap gap-1.5 items-center">
                                  {(promotion.applicableTiers || []).slice(0, 2).map((tier) => (
                                    <DynamicTierBadge key={tier} tier={tier} />
                                  ))}
                                  {(promotion.applicableTiers?.length || 0) > 2 ? (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Badge
                                          variant="outline"
                                          className="cursor-pointer rounded-full border-amber-200 bg-amber-50 px-2 py-1 hover:bg-amber-100 text-[11px] font-bold text-amber-800 transition-colors"
                                        >
                                          <Plus className="h-3 w-3 inline-block" />
                                          {(promotion.applicableTiers?.length || 0) - 2}
                                        </Badge>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-3" align="start">
                                        <p className="mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                          {translate(language, "Háº¡ng Ã¡p dá»¥ng", "Applicable tiers")}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                          {(promotion.applicableTiers || []).map((tier) => (
                                            <DynamicTierBadge key={tier} tier={tier} />
                                          ))}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  ) : null}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-700">
                                  {formatDate(promotion.startDate, language)}
                                </div>
                                <div className="inline-flex items-center gap-1 text-xs text-slate-400">
                                  <ArrowRight className="h-3 w-3" />
                                  {formatDate(promotion.endDate, language)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "rounded-full border-0 px-3 py-1 font-bold",
                                    promotion.status === "ACTIVE"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-100 text-slate-500",
                                  )}
                                >
                                  {promotion.status === "ACTIVE"
                                    ? translate(language, "Hoáº¡t Ä‘á»™ng", "Active")
                                    : translate(language, "KhÃ´ng hoáº¡t Ä‘á»™ng", "Inactive")}
                                </Badge>
                                <div className="text-xs font-medium text-slate-400">{phaseLabel}</div>
                              </div>
                            </TableCell>
                            <TableCell className="pr-6">
                              <div className="flex justify-end gap-2 opacity-95 transition-opacity group-hover:opacity-100">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-9 rounded-full border-slate-200 bg-white px-3.5 text-slate-700"
                                  onClick={() => handleEdit(promotion)}
                                >
                                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                  {translate(language, "Sá»­a", "Edit")}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {totalDisplayPages > 1 ? (
                  <div className="flex justify-center border-t border-slate-100 py-5">
                    <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-2 shadow-sm">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-full px-5 text-sm font-semibold"
                        disabled={!canGoPrev}
                        onClick={() => setDisplayPage((value) => Math.max(1, value - 1))}
                      >
                        {translate(language, "TrÆ°á»›c", "Previous")}
                      </Button>
                      <span className="min-w-[96px] px-2 text-center text-sm font-semibold text-slate-600">
                        {translate(language, "Trang", "Page")} {displayPage} / {totalDisplayPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-full px-5 text-sm font-semibold"
                        disabled={!canGoNext}
                        onClick={() => setDisplayPage((value) => Math.min(totalDisplayPages, value + 1))}
                      >
                        {translate(language, "Tiáº¿p", "Next")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-slate-800">{label}</Label>
      {children}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function TierSelectionOption({
  tier,
  checked,
  onCheckedChange,
}: {
  tier: LoyaltyTier;
  checked: boolean;
  onCheckedChange: (checked: boolean | "indeterminate") => void;
}) {
  const { hex, badge } = useTierStyle(tier);
  const tierColor = hex ?? "#64748b";

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-bold transition-all",
        checked ? "shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50",
      )}
      style={
        checked
          ? {
              borderColor: tierColor,
              backgroundColor: `${tierColor}14`,
              color: tierColor,
            }
          : {
              borderColor: `${tierColor}55`,
            }
      }
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="rounded-full"
        style={{
          borderColor: tierColor,
          backgroundColor: checked ? tierColor : "transparent",
          color: checked ? "#ffffff" : tierColor,
        }}
      />
      <span
        className="inline-flex min-w-0 items-center gap-2 truncate"
        style={checked ? undefined : { color: badge.color }}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tierColor }} />
        <span className="truncate">{tier}</span>
      </span>
    </label>
  );
}

function validatePromotionForm(form: PromotionFormValues, language: "vi" | "en", isVoucherView = false): PromotionFormErrors {
  const errors: PromotionFormErrors = {};
  const discountValue = Number(form.discountValue);
  const maxUsage = form.maxUsagePerCustomer ? Number(form.maxUsagePerCustomer) : null;

  if (!form.name.trim()) {
    errors.name = translate(language, "TÃªn lÃ  báº¯t buá»™c.", "Name is required.");
  }
  if (!isVoucherView) {
    const codeError = getVoucherCodeFormatError(form.code);
    if (!form.code.trim()) {
      errors.code = translate(language, "MÃ£ khuyáº¿n mÃ£i lÃ  báº¯t buá»™c.", "Promotion code is required.");
    } else if (codeError) {
      errors.code = codeError;
    }
  }
  if (form.discountType !== "NONE" && (!form.discountValue || Number.isNaN(discountValue) || discountValue < 1)) {
    errors.discountValue = translate(language, "GiÃ¡ trá»‹ giáº£m giÃ¡ pháº£i Ã­t nháº¥t lÃ  1.", "Discount value must be at least 1.");
  } else if (form.discountType === "PERCENT" && discountValue > 100) {
    errors.discountValue = translate(language, "Giáº£m giÃ¡ theo % pháº£i tá»« 1 Ä‘áº¿n 100.", "Percent discount must be between 1 and 100.");
  }

  if (!form.startDate) errors.startDate = translate(language, "NgÃ y báº¯t Ä‘áº§u lÃ  báº¯t buá»™c.", "Start date is required.");
  if (!form.endDate) errors.endDate = translate(language, "NgÃ y káº¿t thÃºc lÃ  báº¯t buá»™c.", "End date is required.");

  if (form.startDate && form.endDate) {
    const start = new Date(form.startDate).getTime();
    const end = new Date(form.endDate).getTime();
    if (start > end) errors.startDate = translate(language, "NgÃ y báº¯t Ä‘áº§u pháº£i trÆ°á»›c hoáº·c báº±ng ngÃ y káº¿t thÃºc.", "Start date must be before or equal to end date.");
  }

  if (isVoucherView && (!form.pointMultiplier || Number.isNaN(Number(form.pointMultiplier)) || Number(form.pointMultiplier) < 1)) {
    errors.pointMultiplier = translate(language, "Số điểm đổi voucher phải lớn hơn 0.", "Voucher points must be greater than 0.");
  }

  if (form.targetingMode === "SELECTED_TIERS" && form.applicableTiers.length === 0) {
    errors.applicableTiers = translate(language, "Chá»n Ã­t nháº¥t má»™t háº¡ng.", "Select at least one tier.");
  }

  if (maxUsage !== null && (!Number.isInteger(maxUsage) || maxUsage < 1)) {
    errors.maxUsagePerCustomer = translate(language, "Sá»‘ láº§n dÃ¹ng tá»‘i Ä‘a pháº£i lÃ  sá»‘ nguyÃªn lá»›n hÆ¡n 0.", "Max usage must be an integer greater than 0.");
  }

  return errors;
}

function mergeFormErrors(
  clientErrors: PromotionFormErrors,
  serverError: ApiErrorResponse | null,
  showValidation: boolean,
): PromotionFormErrors {
  const merged: PromotionFormErrors = {};
  const fields = Object.keys(EMPTY_FORM) as (keyof PromotionFormValues)[];
  for (const field of fields) {
    if (showValidation && clientErrors[field]) {
      merged[field] = clientErrors[field];
      continue;
    }
    const fromServer = readServerFieldError(serverError, field);
    if (fromServer) merged[field] = fromServer;
  }
  return merged;
}

function readServerFieldError(
  error: ApiErrorResponse | null,
  field: keyof PromotionFormValues,
): string | null {
  if (!error) return null;
  const fromList = error.errors?.find((item) => item.field === field)?.message ?? null;
  if (fromList) return fromList;

  const errorPayload = (error as ApiErrorResponse & { error?: { field?: string; message?: string } }).error;
  if (errorPayload?.field === field && errorPayload.message) {
    return errorPayload.message;
  }

  return null;
}

function toRequestPayload(form: PromotionFormValues): PromotionRequest | null {
  const discountValue = form.discountType === "NONE" ? 0 : Number(form.discountValue);
  const maxUsage = form.maxUsagePerCustomer ? Number(form.maxUsagePerCustomer) : null;
  const startDate = new Date(form.startDate);
  const endDate = new Date(form.endDate);

  if (form.discountType !== "NONE" && (Number.isNaN(discountValue) || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))) {
    return null;
  }

  return {
    code: form.code.trim() ? sanitizeVoucherCodeInput(form.code.trim()) : null,
    name: sanitizePromotionNameInput(form.name.trim()),
    description: form.description || null,
    discountType: form.discountType,
    discountValue,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    targetingMode: form.targetingMode === "SELECTED_TIERS" ? "SPECIFIC_TIERS" : "ALL_TIERS",
    applicableTiers: form.targetingMode === "SELECTED_TIERS" ? form.applicableTiers : null,
    maxUsagePerCustomer: maxUsage,
    pointMultiplier: Number(form.pointMultiplier) || 1,
    status: form.status,
  };
}

function toFormValues(promotion: Promotion): PromotionFormValues {
  return {
    code: promotion.code ?? "",
    name: sanitizePromotionNameInput(promotion.name),
    description: promotion.description || "",
    discountType: promotion.discountType || "PERCENT",
    discountValue: String(promotion.discountValue),
    startDate: toLocalDateTimeInputValue(promotion.startDate),
    endDate: toLocalDateTimeInputValue(promotion.endDate),
    targetingMode: promotion.targetingMode === "SPECIFIC_TIERS" ? "SELECTED_TIERS" : "ALL_TIERS",
    applicableTiers: promotion.applicableTiers,
    maxUsagePerCustomer: promotion.maxUsagePerCustomer ? String(promotion.maxUsagePerCustomer) : "",
    pointMultiplier: promotion.pointMultiplier ? String(promotion.pointMultiplier) : "1",
    status: promotion.status,
  };
}

function toLocalDateTimeInputValue(value: string) {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function formatDate(value: string, language: "vi" | "en") {
  const date = new Date(value);
  return date.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatFilterDate(value: string, language: "vi" | "en") {
  try {
    return new Date(value).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function filterPromotions(items: Promotion[], filters: PromotionFilters): Promotion[] {
  const nameQuery = filters.name.trim().toLowerCase();

  return items.filter((promotion) => {
    if (nameQuery && !promotion.name.toLowerCase().includes(nameQuery)) {
      return false;
    }

    if (filters.status !== "ALL" && promotion.status !== filters.status) {
      return false;
    }

    if (filters.date) {
      const selected = new Date(filters.date);
      selected.setHours(0, 0, 0, 0);
      const start = new Date(promotion.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(promotion.endDate);
      end.setHours(23, 59, 59, 999);

      if (selected < start || selected > end) {
        return false;
      }
    }

    return true;
  });
}

function formatDiscount(type: PromotionDiscountType, value: number | undefined | null, language: "vi" | "en") {
  if (value == null) return "0";
  return type === "PERCENT"
    ? `${value}%`
    : `${value.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} VND`;
}

function getPromotionPhase(promotion: Promotion) {
  const now = new Date();
  const startDate = new Date(promotion.startDate);
  const endDate = new Date(promotion.endDate);

  if (promotion.status !== "ACTIVE") {
    return "Paused";
  }
  if (now < startDate) {
    return "Upcoming";
  }
  if (now > endDate) {
    return "Expired";
  }
  return "Running";
}

function translatePhase(phase: string, language: "vi" | "en"): string {
  const map: Record<string, [string, string]> = {
    Paused: ["Táº¡m dá»«ng", "Paused"],
    Upcoming: ["Sáº¯p diá»…n ra", "Upcoming"],
    Expired: ["ÄÃ£ háº¿t háº¡n", "Expired"],
    Running: ["Äang cháº¡y", "Running"],
  };
  const entry = map[phase];
  if (!entry) return phase;
  return language === "vi" ? entry[0] : entry[1];
}

function isPromotionExpiringSoon(promotion: Promotion) {
  if (promotion.status !== "ACTIVE") {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = new Date(promotion.endDate);
  const endOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
  const daysLeft = (endOfDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  return daysLeft >= 0 && daysLeft <= 7;
}

