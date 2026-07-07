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
  Trash2,
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
import { promotionNameFormatMessage, sanitizePromotionNameInput } from "@/shared/lib/validators";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import {
  useAdminPromotion,
  useAdminPromotions,
  useCreateAdminPromotion,
  useDeleteAdminPromotion,
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

type PromotionFormValues = {
  name: string;
  discountType: PromotionDiscountType;
  discountValue: string;
  startDate: string;
  endDate: string;
  targetingMode: PromotionTargetingMode;
  applicableTiers: LoyaltyTier[];
  maxUsagePerCustomer: string;
  status: PromotionStatus;
};

type PromotionFormErrors = Partial<Record<keyof PromotionFormValues, string>>;

const PAGE_LIMIT = 10;
const FETCH_LIMIT = 100;
const FALLBACK_TIERS: LoyaltyTier[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];

type PromotionFilters = {
  name: string;
  status: "ALL" | PromotionStatus;
  date: string;
};

const EMPTY_FORM: PromotionFormValues = {
  name: "",
  discountType: "PERCENT",
  discountValue: "",
  startDate: "",
  endDate: "",
  targetingMode: "ALL_TIERS",
  applicableTiers: [],
  maxUsagePerCustomer: "",
  status: "ACTIVE",
};

export function AdminPromotionsPageContent() {
  const { language } = useLanguageStore();
  const { fetchTiers } = useTierStore();
  
  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  const [displayPage, setDisplayPage] = useState(1);
  const [filters, setFilters] = useState<PromotionFilters>({ name: "", status: "ALL", date: "" });
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionFormValues>(EMPTY_FORM);
  const [showValidation, setShowValidation] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const promotionsQuery = useAdminPromotions(1, FETCH_LIMIT);
  const tiersQuery = useTierConfigs();
  const promotionDetailQuery = useAdminPromotion(editingPromotionId);
  const createMutation = useCreateAdminPromotion();
  const updateMutation = useUpdateAdminPromotion();
  const tierOptions = tiersQuery.data?.map((tier) => tier.tier) ?? FALLBACK_TIERS;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const activeMutationError = (createMutation.error ?? updateMutation.error) as ApiErrorResponse | null;
  const clientErrors = useMemo(() => validatePromotionForm(form, language), [form, language]);
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
  }, [filters]);

  useEffect(() => {
    if (promotionDetailQuery.data) {
      setEditingPromotion(promotionDetailQuery.data);
      setForm(toFormValues(promotionDetailQuery.data));
    }
  }, [promotionDetailQuery.data]);

  const summaryCards = [
    {
      label: translate(language, "Tổng chiến dịch", "Total campaigns"),
      value: filteredPromotions.length,
      description: translate(language, "Hiển thị trong chế độ xem hiện tại", "Visible in the current view"),
      icon: Layers3,
      tone: "from-slate-900 via-slate-800 to-slate-700 text-white shadow-slate-900/20",
    },
    {
      label: translate(language, "Đang chạy", "Running now"),
      value: runningPromotions.length,
      description: translate(language, "Đang hoạt động và trong khoảng thời gian hiện tại", "Active and currently in date range"),
      icon: Flame,
      tone: "from-orange-500 via-amber-500 to-yellow-400 text-white shadow-orange-500/25",
    },
    {
      label: translate(language, "Đang hoạt động", "Active"),
      value: activePromotions.length,
      description: translate(language, "Sẵn sàng áp dụng cho khách hàng", "Ready to be applied by customers"),
      icon: BadgeCheck,
      tone: "from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-emerald-500/25",
    },
    {
      label: translate(language, "Sắp kết thúc", "Ending soon"),
      value: expiringSoonPromotions.length,
      description: translate(language, "Cần xem xét nhanh trong tuần này", "Need a quick review this week"),
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
        toast.success(translate(language, "Đã cập nhật chương trình khuyến mãi.", "Promotion updated."));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(translate(language, "Đã tạo chương trình khuyến mãi.", "Promotion created."));
      }
      handleResetForm();
      setIsModalOpen(false);
    } catch {
      toast.error(translate(language, "Không thể lưu chương trình khuyến mãi.", "Unable to save promotion."));
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-8 px-6 py-7 md:px-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-orange-700">
                Admin Growth Console
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 text-white shadow-[0_18px_38px_rgba(249,115,22,0.35)]">
                  <Megaphone className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                    {translate(language, "Khuyến mãi", "Promotions")}
                  </h1>
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
                {translate(language, "Tạo khuyến mãi", "Create promotion")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full border-slate-200 bg-white/90 px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={() => promotionsQuery.refetch()}
                disabled={promotionsQuery.isFetching}
              >
                <RefreshCcw className={cn("mr-2 h-4 w-4", promotionsQuery.isFetching && "animate-spin")} />
                {translate(language, "Tải lại", "Refresh")}
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
                {translate(language, "Tìm kiếm chiến dịch", "Search campaign")}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="filter-name"
                  value={filters.name}
                  onChange={(event) => setFilters((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder={translate(language, "Tìm theo tên khuyến mãi...", "Search by promotion name...")}
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50/80 pl-10 shadow-inner shadow-slate-100/70 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <Label
                htmlFor="filter-status"
                className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500"
              >
                {translate(language, "Trạng thái", "Status")}
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
                  <SelectValue placeholder={translate(language, "Tất cả trạng thái", "All status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{translate(language, "Tất cả trạng thái", "All status")}</SelectItem>
                  <SelectItem value="ACTIVE">{translate(language, "Đang hoạt động", "Active")}</SelectItem>
                  <SelectItem value="INACTIVE">{translate(language, "Không hoạt động", "Inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                {translate(language, "Hoạt động vào ngày", "Active on date")}
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
                    {filters.date ? formatFilterDate(filters.date, language) : translate(language, "Chọn ngày", "Pick a date")}
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
                {translate(language, "Đặt lại", "Reset")}
              </Button>
            </div>
          </div>
        </Card>

        <Dialog
          open={isModalOpen}
          onOpenChange={(open: boolean) => {
            setIsModalOpen(open);
            if (!open) handleResetForm();
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[28px] border border-white/70 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,0.16)]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-950">
                {isEditing
                  ? translate(language, "Chỉnh sửa khuyến mãi", "Edit promotion")
                  : translate(language, "Tạo khuyến mãi", "Create promotion")}
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-500">
                {translate(
                  language,
                  "Thiết lập thông tin giảm giá, ngày áp dụng và đối tượng mục tiêu trước khi đăng.",
                  "Set discount details, active dates, and tier targeting before publishing.",
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              {promotionDetailQuery.isFetching && editingPromotionId ? (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {translate(language, "Đang tải chi tiết khuyến mãi...", "Loading latest promotion details...")}
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
                  {translate(language, "Thông tin cơ bản", "Basic Information")}
                </p>
                <FormField label={translate(language, "Tên", "Name")} error={displayErrors.name}>
                  <Input
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: sanitizePromotionNameInput(event.target.value) }))
                    }
                    placeholder="VD: SUMMER2026"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    className="h-11 rounded-2xl border-slate-200 bg-white font-semibold tracking-wide"
                  />
                  <p className="text-xs text-slate-500">{promotionNameFormatMessage}</p>
                </FormField>
              </div>

              <div className="grid gap-5 rounded-[24px] border border-slate-100 bg-slate-50/75 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  {translate(language, "Cài đặt giảm giá", "Discount Setup")}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={translate(language, "Loại giảm giá", "Discount type")} error={displayErrors.discountType}>
                    <select
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                      value={form.discountType}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, discountType: event.target.value as PromotionDiscountType }))
                      }
                    >
                      <option value="PERCENT">{translate(language, "Phần trăm", "Percent")}</option>
                      <option value="FIXED">{translate(language, "Cố định", "Fixed")}</option>
                    </select>
                  </FormField>

                  <FormField label={translate(language, "Giá trị giảm giá", "Discount value")} error={displayErrors.discountValue}>
                    <Input
                      type="number"
                      min={1}
                      value={form.discountValue}
                      onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
                      placeholder={form.discountType === "PERCENT" ? "1 - 100" : translate(language, "Số tiền VND", "VND amount")}
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </FormField>
                </div>
              </div>

              <div className="grid gap-5 rounded-[24px] border border-slate-100 bg-slate-50/75 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  {translate(language, "Thời gian áp dụng", "Availability")}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={translate(language, "Ngày bắt đầu", "Start date")} error={displayErrors.startDate}>
                    <Input
                      type="datetime-local"
                      value={form.startDate}
                      onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </FormField>

                  <FormField label={translate(language, "Ngày kết thúc", "End date")} error={displayErrors.endDate}>
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
                  {translate(language, "Đối tượng mục tiêu", "Audience Targeting")}
                </p>
                <FormField label={translate(language, "Chế độ nhắm mục tiêu", "Targeting mode")} error={displayErrors.targetingMode}>
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
                    <option value="ALL_TIERS">{translate(language, "Tất cả các hạng", "All tiers")}</option>
                    <option value="SELECTED_TIERS">{translate(language, "Hạng được chọn", "Selected tiers")}</option>
                  </select>
                </FormField>

                {form.targetingMode === "SELECTED_TIERS" ? (
                  <FormField label={translate(language, "Các hạng được áp dụng", "Applicable tiers")} error={displayErrors.applicableTiers}>
                    <div className="grid grid-cols-2 gap-2">
                      {tierOptions.map((tier) => (
                        <label
                          key={tier}
                          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700"
                        >
                          <Checkbox
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
                          {tier}
                        </label>
                      ))}
                    </div>
                  </FormField>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={translate(language, "Số lần dùng tối đa / khách", "Max usage / customer")} error={displayErrors.maxUsagePerCustomer}>
                    <Input
                      type="number"
                      min={1}
                      value={form.maxUsagePerCustomer}
                      onChange={(event) => setForm((prev) => ({ ...prev, maxUsagePerCustomer: event.target.value }))}
                      placeholder={translate(language, "Tuỳ chọn", "Optional")}
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </FormField>

                  <FormField label={translate(language, "Trạng thái", "Status")} error={displayErrors.status}>
                    <select
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                      value={form.status}
                      onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as PromotionStatus }))}
                    >
                      <option value="ACTIVE">{translate(language, "Đang hoạt động", "Active")}</option>
                      <option value="INACTIVE">{translate(language, "Không hoạt động", "Inactive")}</option>
                    </select>
                  </FormField>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-full px-5" onClick={() => setIsModalOpen(false)}>
                  {translate(language, "Huỷ", "Cancel")}
                </Button>
                <Button
                  type="button"
                  className="rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-5 shadow-[0_16px_30px_rgba(37,99,235,0.24)]"
                  onClick={handleSubmit}
                  disabled={isSubmitting || promotionDetailQuery.isFetching}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing
                    ? translate(language, "Lưu thay đổi", "Save changes")
                    : translate(language, "Tạo khuyến mãi", "Create promotion")}
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
                  {translate(language, "Danh sách khuyến mãi", "Promotion list")}
                </CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasActiveFilters ? (
                  <Badge variant="outline" className="rounded-full border-orange-200 bg-orange-50 px-3 py-1 text-orange-700">
                    {translate(language, "Đang lọc", "Filters applied")}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                  {activePromotions.length} {translate(language, "đang hoạt động", "active")}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {promotionsQuery.isPending ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                {translate(language, "Đang tải khuyến mãi...", "Loading promotions...")}
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
                    ? translate(language, "Không có khuyến mãi nào khớp với bộ lọc.", "No promotions match your filters.")
                    : translate(language, "Chưa có khuyến mãi nào.", "No promotions yet.")}
                </p>
                <p className="text-xs text-slate-400">
                  {hasActiveFilters
                    ? translate(language, "Thử điều chỉnh tiêu chí tìm kiếm hoặc bộ lọc.", "Try adjusting search or filter criteria.")
                    : translate(language, "Tạo chiến dịch đầu tiên để bắt đầu.", "Create your first campaign to get started.")}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/90">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                          {translate(language, "Chiến dịch", "Campaign")}
                        </TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                          {translate(language, "Giảm giá", "Discount")}
                        </TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                          {translate(language, "Đối tượng", "Audience")}
                        </TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                          {translate(language, "Lịch trình", "Schedule")}
                        </TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                          {translate(language, "Trạng thái", "Status")}
                        </TableHead>
                        <TableHead className="pr-6 text-right text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                          {translate(language, "Hành động", "Actions")}
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
                            </TableCell>
                            <TableCell>
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
                            </TableCell>
                            <TableCell>
                              {promotion.targetingMode === "ALL_TIERS" ? (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-slate-200 bg-slate-100 px-3 py-1 text-slate-700"
                                >
                                  {translate(language, "Tất cả các hạng", "All tiers")}
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
                                          {translate(language, "Hạng áp dụng", "Applicable tiers")}
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
                                    ? translate(language, "Hoạt động", "Active")
                                    : translate(language, "Không hoạt động", "Inactive")}
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
                                  {translate(language, "Sửa", "Edit")}
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
                        {translate(language, "Trước", "Previous")}
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
                        {translate(language, "Tiếp", "Next")}
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

function validatePromotionForm(form: PromotionFormValues, language: "vi" | "en"): PromotionFormErrors {
  const errors: PromotionFormErrors = {};
  const discountValue = Number(form.discountValue);
  const maxUsage = form.maxUsagePerCustomer ? Number(form.maxUsagePerCustomer) : null;

  if (!form.name.trim()) {
    errors.name = translate(language, "Tên là bắt buộc.", "Name is required.");
  }
  if (!form.discountValue || Number.isNaN(discountValue) || discountValue < 1) {
    errors.discountValue = translate(language, "Giá trị giảm giá phải ít nhất là 1.", "Discount value must be at least 1.");
  } else if (form.discountType === "PERCENT" && discountValue > 100) {
    errors.discountValue = translate(language, "Giảm giá theo % phải từ 1 đến 100.", "Percent discount must be between 1 and 100.");
  }

  if (!form.startDate) errors.startDate = translate(language, "Ngày bắt đầu là bắt buộc.", "Start date is required.");
  if (!form.endDate) errors.endDate = translate(language, "Ngày kết thúc là bắt buộc.", "End date is required.");

  if (form.startDate && form.endDate) {
    const start = new Date(form.startDate).getTime();
    const end = new Date(form.endDate).getTime();
    if (start > end) errors.startDate = translate(language, "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.", "Start date must be before or equal to end date.");
  }

  if (form.targetingMode === "SELECTED_TIERS" && form.applicableTiers.length === 0) {
    errors.applicableTiers = translate(language, "Chọn ít nhất một hạng.", "Select at least one tier.");
  }

  if (maxUsage !== null && (!Number.isInteger(maxUsage) || maxUsage < 1)) {
    errors.maxUsagePerCustomer = translate(language, "Số lần dùng tối đa phải là số nguyên lớn hơn 0.", "Max usage must be an integer greater than 0.");
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
  const discountValue = Number(form.discountValue);
  const maxUsage = form.maxUsagePerCustomer ? Number(form.maxUsagePerCustomer) : null;
  const startDate = new Date(form.startDate);
  const endDate = new Date(form.endDate);

  if (Number.isNaN(discountValue) || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return {
    name: sanitizePromotionNameInput(form.name.trim()),
    description: null,
    discountType: form.discountType,
    discountValue,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    targetingMode: form.targetingMode,
    applicableTiers: form.targetingMode === "SELECTED_TIERS" ? form.applicableTiers : null,
    maxUsagePerCustomer: maxUsage,
    status: form.status,
  };
}

function toFormValues(promotion: Promotion): PromotionFormValues {
  return {
    name: sanitizePromotionNameInput(promotion.name),
    discountType: promotion.discountType || "PERCENT",
    discountValue: String(promotion.discountValue),
    startDate: toLocalDateTimeInputValue(promotion.startDate),
    endDate: toLocalDateTimeInputValue(promotion.endDate),
    targetingMode: promotion.targetingMode,
    applicableTiers: promotion.applicableTiers,
    maxUsagePerCustomer: promotion.maxUsagePerCustomer ? String(promotion.maxUsagePerCustomer) : "",
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
    Paused: ["Tạm dừng", "Paused"],
    Upcoming: ["Sắp diễn ra", "Upcoming"],
    Expired: ["Đã hết hạn", "Expired"],
    Running: ["Đang chạy", "Running"],
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
