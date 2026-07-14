"use client";

import { BadgeCheck, Loader2, Percent, Plus, RefreshCcw, Search, Sparkles, Ticket, Edit2, Trash2, X } from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/ui/table";
import {
  useAdminVoucherRedemptions,
  useAdminVouchers,
  useCreateAdminVoucher,
  useUpdateAdminVoucher,
  useDeleteAdminVoucher,
} from "@/features/vouchers/hooks/use-admin-vouchers";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { WorkspaceEmptyState, WorkspaceErrorState } from "@/shared/ui/workspace/workspace-page";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { DynamicTierBadge } from "@/shared/ui/workspace/dynamic-tier-badge";
import type { AdminVoucher, AdminVoucherRequest } from "@/entities/vouchers";

const DISCOUNT_PERCENT_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70];

type VoucherFormState = {
  code: string; name: string; description: string;
  discountType: "PERCENT" | "FIXED_AMOUNT" | "FREE_SERVICE";
  discountValue: number; maxDiscountAmount: string;
  minOrderAmount: number; requiredPoints: number; validDaysAfterClaim: number;
  usageLimit: string; newCustomerOnly: boolean; status: "ACTIVE" | "INACTIVE";
  startAt: string; endAt: string; targetTiers: string[]; applicableServiceIds: string[];
};

function getDefaultForm(): VoucherFormState {
  return {
    code: "", name: "", description: "", discountType: "FIXED_AMOUNT", discountValue: 0,
    maxDiscountAmount: "", minOrderAmount: 0, requiredPoints: 0, validDaysAfterClaim: 30,
    usageLimit: "", newCustomerOnly: false, status: "ACTIVE", startAt: "", endAt: "",
    targetTiers: [], applicableServiceIds: [],
  };
}

function voucherToForm(v: AdminVoucher): VoucherFormState {
  return {
    code: v.code, name: v.name, description: v.description ?? "",
    discountType: v.discountType, discountValue: v.discountValue,
    maxDiscountAmount: v.maxDiscountAmount != null ? String(v.maxDiscountAmount) : "",
    minOrderAmount: v.minAmount, requiredPoints: v.requiredPoints,
    validDaysAfterClaim: v.validDaysAfterClaim,
    usageLimit: v.usageLimit != null ? String(v.usageLimit) : "",
    newCustomerOnly: v.newCustomerOnly, status: v.status,
    startAt: v.startAt ? new Date(v.startAt).toISOString().split("T")[0] : "",
    endAt: v.endAt ? new Date(v.endAt).toISOString().split("T")[0] : "",
    targetTiers: v.targetTiers ?? [], applicableServiceIds: v.applicableServiceIds ?? [],
  };
}

function formToRequest(form: VoucherFormState): AdminVoucherRequest {
  return {
    code: form.code.toUpperCase(), name: form.name, description: form.description,
    discountType: form.discountType, discountValue: Number(form.discountValue),
    maxDiscountAmount: form.maxDiscountAmount !== "" ? Number(form.maxDiscountAmount) : null,
    minOrderAmount: Number(form.minOrderAmount), requiredPoints: Number(form.requiredPoints),
    validDaysAfterClaim: Number(form.validDaysAfterClaim),
    usageLimit: form.usageLimit !== "" && Number(form.usageLimit) > 0 ? Number(form.usageLimit) : null,
    newCustomerOnly: form.newCustomerOnly,
    startAt: form.startAt ? new Date(form.startAt).toISOString() : "",
    endAt: form.endAt ? new Date(form.endAt).toISOString() : "",
    status: form.status, targetTiers: form.targetTiers, applicableServiceIds: form.applicableServiceIds,
  };
}

export function AdminVouchersManagementPanel() {
  const { language } = useLanguageStore();
  const t = (vi: string, en: string) => translate(language, vi, en);
  const [draftSearch, setDraftSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const vouchersQuery = useAdminVouchers();
  const redemptionsQuery = useAdminVoucherRedemptions(1, 20, searchQuery);
  const createMutation = useCreateAdminVoucher();
  const updateMutation = useUpdateAdminVoucher();
  const deleteMutation = useDeleteAdminVoucher();
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<VoucherFormState>(getDefaultForm());

  const filteredVouchers = useMemo(() => {
    const all = vouchersQuery.data ?? [];
    return all.filter((v) => {
      const matchSearch = !draftSearch ||
        v.code.toLowerCase().includes(draftSearch.toLowerCase()) ||
        v.name.toLowerCase().includes(draftSearch.toLowerCase());
      const matchStatus = statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && v.active) ||
        (statusFilter === "INACTIVE" && !v.active);
      return matchSearch && matchStatus;
    });
  }, [vouchersQuery.data, draftSearch, statusFilter]);

  const handleOpenCreate = () => { setEditingCode(null); setForm(getDefaultForm()); setShowModal(true); };
  const handleOpenEdit = (v: AdminVoucher) => { setEditingCode(v.code); setForm(voucherToForm(v)); setShowModal(true); };
  const handleCloseModal = () => { setShowModal(false); setEditingCode(null); };
  const handleDelete = (code: string) => {
    if (confirm(t(`Xóa voucher "${code}"?`, `Delete voucher "${code}"?`)))
      deleteMutation.mutate(code);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = formToRequest(form);
    if (editingCode) updateMutation.mutate({ code: editingCode, payload }, { onSuccess: handleCloseModal });
    else createMutation.mutate(payload, { onSuccess: handleCloseModal });
  };
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const vouchers = vouchersQuery.data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/* ── Hero header ── */}
      <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid gap-8 px-6 py-7 md:px-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-teal-700">
              Admin Growth Console
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-white shadow-[0_18px_38px_rgba(20,184,166,0.35)]">
                <Ticket className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl pt-1">Vouchers</h1>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              className="h-11 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-5 text-sm font-semibold shadow-[0_16px_38px_rgba(37,99,235,0.28)] hover:from-blue-500 hover:to-blue-400"
              onClick={handleOpenCreate}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("Tạo Voucher", "Create voucher")}
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-full border-slate-200 bg-white/90 px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50" onClick={() => vouchersQuery.refetch()} disabled={vouchersQuery.isFetching}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${vouchersQuery.isFetching ? "animate-spin" : ""}`} />
              {t("Tải lại", "Refresh")}
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        {!vouchersQuery.isPending && vouchers.length > 0 && (
          <div className="grid gap-4 border-t border-slate-100/80 bg-slate-50/55 px-6 py-5 md:grid-cols-2 md:px-8 xl:grid-cols-4">
            {[
              { label: t("Tổng voucher", "Total vouchers"), value: vouchers.length, desc: t("Trong danh mục hiện tại", "In the current catalogue"), icon: Ticket, tone: "from-slate-900 via-slate-800 to-slate-700" },
              { label: t("Đang hoạt động", "Active"), value: vouchers.filter(v => v.active).length, desc: t("Sẵn sàng áp dụng", "Ready to be applied"), icon: BadgeCheck, tone: "from-emerald-500 via-teal-500 to-cyan-500" },
              { label: t("Giảm theo %", "Percent off"), value: vouchers.filter(v => v.discountType === "PERCENT").length, desc: t("Voucher giảm phần trăm", "Percentage-based"), icon: Percent, tone: "from-orange-500 via-amber-500 to-yellow-400" },
              { label: t("Chỉ khách mới", "New only"), value: vouchers.filter(v => v.newCustomerOnly).length, desc: t("Dành cho khách đăng ký mới", "For new sign-ups only"), icon: Sparkles, tone: "from-violet-500 via-purple-500 to-fuchsia-500" },
            ].map(({ label, value, desc, icon: Icon, tone }) => (
              <div key={label} className={`rounded-2xl bg-gradient-to-br ${tone} p-3.5 text-white shadow-md`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/90">{label}</p>
                    <p className="mt-1 text-2xl font-black tracking-tight">{value}</p>
                    <p className="mt-1.5 text-[11px] leading-snug text-white/80 line-clamp-2">{desc}</p>
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Filter bar ── */}
      <Card className="rounded-[26px] border border-white/70 bg-white/85 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.07)] backdrop-blur md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="min-w-0 flex-[1.8] space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{t("Tìm kiếm", "Search voucher")}</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)} placeholder={t("Mã, tên voucher...", "Code, name...")} className="h-11 rounded-2xl border-slate-200 bg-slate-50/80 pl-10 shadow-inner focus:bg-white" />
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{t("Trạng thái", "Status")}</p>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-3 text-sm outline-none focus:bg-white">
              <option value="ALL">{t("Tất cả", "All status")}</option>
              <option value="ACTIVE">{t("Hoạt động", "Active")}</option>
              <option value="INACTIVE">{t("Tắt", "Inactive")}</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <Button type="button" variant="outline" onClick={() => { setDraftSearch(""); setStatusFilter("ALL"); }} disabled={!draftSearch && statusFilter === "ALL"} className="h-11 rounded-full border-slate-200 bg-white px-4 font-semibold text-slate-600">
              <X className="mr-1.5 h-3.5 w-3.5" />{t("Đặt lại", "Reset")}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Voucher table ── */}
      <Card className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
        <CardHeader className="border-b border-slate-100 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.95))] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl font-black tracking-tight text-slate-950">{t("Danh mục voucher", "Voucher catalogue")}</CardTitle>
            {!vouchersQuery.isPending && <span className="text-sm font-semibold text-slate-500">{filteredVouchers.length} {t("voucher", "vouchers")}</span>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {vouchersQuery.isPending ? (
            <div className="space-y-2 p-6">{Array.from({length:4}).map((_,i)=><div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100"/>)}</div>
          ) : vouchersQuery.isError ? (
            <div className="p-6"><WorkspaceErrorState title={t("Không thể tải", "Unable to load vouchers")} description={getDisplayErrorMessage(vouchersQuery.error)} onRetry={() => vouchersQuery.refetch()} /></div>
          ) : filteredVouchers.length === 0 ? (
            <div className="p-6"><WorkspaceEmptyState title={t("Không có voucher", "No vouchers found")} description={t("Tạo voucher mới hoặc thay đổi bộ lọc.", "Create a voucher or adjust filters.")} /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/60">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Mã / Tên", "Code / Name")}</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Giảm giá", "Discount")}</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Đối tượng", "Audience")}</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Hạn dùng", "Expires")}</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Trạng thái", "Status")}</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Thao tác", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers.map((voucher) => (
                  <TableRow key={voucher.code} className="border-slate-100 hover:bg-slate-50/60 transition-colors">
                    <TableCell>
                      <div className="font-black text-slate-900 tracking-wide">{voucher.code}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{voucher.name}</div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-sm font-black text-teal-700">
                        {voucher.discountType === "PERCENT" ? `${voucher.discountValue}%` : formatCurrency(voucher.discountValue, language)}
                      </span>
                      {voucher.minAmount > 0 && <div className="mt-1 text-[11px] text-slate-400">{t("Tối thiểu","Min")} {formatCurrency(voucher.minAmount, language)}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {voucher.newCustomerOnly && <Badge variant="outline" className="text-[10px] rounded-full">{t("Khách mới","New only")}</Badge>}
                        {voucher.targetTiers.length > 0
                          ? voucher.targetTiers.map(tier => <DynamicTierBadge key={tier} tier={tier}>{tier}</DynamicTierBadge>)
                          : <Badge variant="outline" className="text-[10px] rounded-full">{t("Tất cả","All tiers")}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{formatDate(voucher.expiresAt, language)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide ${voucher.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {voucher.active ? t("Hoạt động","Active") : t("Tắt","Inactive")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenEdit(voucher)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-teal-300 hover:text-teal-700 transition">
                          <Edit2 className="h-3 w-3" />{t("Sửa","Edit")}
                        </button>
                        <button onClick={() => handleDelete(voucher.code)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Redemption History ── */}
      <Card className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
        <CardHeader className="border-b border-slate-100 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.95))] px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <CardTitle className="text-xl font-black tracking-tight text-slate-950">{t("Lịch sử đổi điểm","Redemption history")}</CardTitle>
            <div className="flex w-full gap-2 lg:w-auto">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)} placeholder={t("Tìm voucher, tên, SĐT","Search voucher, name, phone")} className="h-10 rounded-2xl pl-9" />
              </div>
              <Button type="button" variant="outline" className="h-10 rounded-2xl" onClick={() => setSearchQuery(draftSearch.trim())}>{t("Tìm","Search")}</Button>
              <Button type="button" variant="outline" className="h-10 rounded-2xl" onClick={() => redemptionsQuery.refetch()}><RefreshCcw className="mr-2 h-4 w-4" />{t("Tải lại","Refresh")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {redemptionsQuery.isPending ? (
            <div className="space-y-2 p-6">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100"/>)}</div>
          ) : redemptionsQuery.isError ? (
            <div className="p-6"><WorkspaceErrorState title={t("Không thể tải","Unable to load")} description={getDisplayErrorMessage(redemptionsQuery.error)} onRetry={() => redemptionsQuery.refetch()} /></div>
          ) : !redemptionsQuery.data || redemptionsQuery.data.items.length === 0 ? (
            <div className="p-6"><WorkspaceEmptyState title={t("Chưa có lịch sử","No redemption history")} description={t("Sẽ hiển thị khi khách hàng đổi điểm.","Will appear after customers redeem points.")} /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/60">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Khách hàng","Customer")}</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Voucher","Voucher")}</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Điểm","Points")}</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Số dư sau","Balance after")}</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("Thời gian","Time")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptionsQuery.data.items.map((item) => (
                  <TableRow key={item.transactionId} className="border-slate-100 hover:bg-slate-50/60 transition-colors">
                    <TableCell><div className="font-semibold text-slate-900">{item.customerName}</div><div className="text-xs text-slate-500">{item.customerPhone}</div></TableCell>
                    <TableCell><Badge variant="outline" className="rounded-full font-bold">{item.voucherCode}</Badge></TableCell>
                    <TableCell className="text-right font-bold text-slate-900">{item.pointsRedeemed.toLocaleString(language === "vi" ? "vi-VN" : "en-US")}</TableCell>
                    <TableCell className="text-right text-slate-500">{item.balanceAfter.toLocaleString(language === "vi" ? "vi-VN" : "en-US")}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{formatDateTime(item.redeemedAt, language)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-[28px] bg-white p-6 shadow-xl relative">
            <button onClick={handleCloseModal} className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400"><X className="h-4 w-4" /></button>
            <h2 className="text-xl font-black text-slate-800 mb-4">{editingCode ? t("Chỉnh sửa Voucher","Edit Voucher") : t("Tạo Voucher mới","Create Voucher")}</h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-slate-600">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label>{t("Mã voucher","Code")}</label>
                  <Input value={form.code} onChange={(e) => setForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="SUMMER20" required disabled={!!editingCode} className="rounded-xl text-xs" />
                </div>
                <div className="space-y-1">
                  <label>{t("Tên voucher","Name")}</label>
                  <Input value={form.name} onChange={(e) => setForm(f=>({...f,name:e.target.value}))} required className="rounded-xl text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <label>{t("Mô tả","Description (optional)")}</label>
                <VoucherDescriptionField value={form.description} onChange={(v) => setForm(f=>({...f,description:v}))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label>{t("Loại giảm giá","Discount Type")}</label>
                  <select value={form.discountType} onChange={(e) => setForm(f=>({...f,discountType:e.target.value as any,discountValue:e.target.value==="PERCENT"?5:0,maxDiscountAmount:""}))} className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold" required>
                    <option value="FIXED_AMOUNT">FIXED_AMOUNT</option>
                    <option value="PERCENT">PERCENT</option>
                    <option value="FREE_SERVICE">FREE_SERVICE</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label>{t("Giá trị","Discount Value")}</label>
                  {form.discountType === "PERCENT" ? (
                    <select value={form.discountValue} onChange={(e) => setForm(f=>({...f,discountValue:Number(e.target.value)}))} className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold" required>
                      {DISCOUNT_PERCENT_OPTIONS.map(pct => <option key={pct} value={pct}>{pct}%</option>)}
                    </select>
                  ) : (
                    <Input type="number" min={0} value={form.discountValue} onChange={(e) => setForm(f=>({...f,discountValue:Number(e.target.value)}))} placeholder="VND" required className="rounded-xl text-xs" />
                  )}
                </div>
              </div>
              {form.discountType === "PERCENT" && (
                <div className="space-y-1">
                  <label>{t("Giảm tối đa (VND)","Max Discount (VND)")}</label>
                  <Input type="number" min={0} value={form.maxDiscountAmount} onChange={(e) => setForm(f=>({...f,maxDiscountAmount:e.target.value}))} placeholder={t("Không giới hạn","No cap")} className="rounded-xl text-xs" />
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1"><label>{t("Đơn tối thiểu (VND)","Min Order (VND)")}</label><Input type="number" min={0} value={form.minOrderAmount} onChange={(e) => setForm(f=>({...f,minOrderAmount:Number(e.target.value)}))} required className="rounded-xl text-xs" /></div>
                <div className="space-y-1"><label>{t("Điểm yêu cầu","Required Points")}</label><Input type="number" min={0} value={form.requiredPoints} onChange={(e) => setForm(f=>({...f,requiredPoints:Number(e.target.value)}))} required className="rounded-xl text-xs" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1"><label>{t("Ngày hiệu lực sau đổi","Valid Days After Claim")}</label><Input type="number" min={1} value={form.validDaysAfterClaim} onChange={(e) => setForm(f=>({...f,validDaysAfterClaim:Number(e.target.value)}))} required className="rounded-xl text-xs" /></div>
                <div className="space-y-1"><label>{t("Giới hạn sử dụng","Usage Limit")}</label><Input type="number" min={0} value={form.usageLimit} onChange={(e) => setForm(f=>({...f,usageLimit:e.target.value}))} placeholder={t("Không giới hạn","Unlimited")} className="rounded-xl text-xs" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1"><label>{t("Ngày bắt đầu","Start Date")}</label><Input type="date" value={form.startAt} onChange={(e) => setForm(f=>({...f,startAt:e.target.value}))} required className="rounded-xl text-xs" /></div>
                <div className="space-y-1"><label>{t("Ngày kết thúc","End Date")}</label><Input type="date" value={form.endAt} onChange={(e) => setForm(f=>({...f,endAt:e.target.value}))} required className="rounded-xl text-xs" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label>{t("Trạng thái","Status")}</label>
                  <select value={form.status} onChange={(e) => setForm(f=>({...f,status:e.target.value as any}))} className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold" required>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input id="newCustomerOnly" type="checkbox" checked={form.newCustomerOnly} onChange={(e) => setForm(f=>({...f,newCustomerOnly:e.target.checked}))} className="h-4 w-4 rounded accent-teal-600" />
                  <label htmlFor="newCustomerOnly" className="cursor-pointer">{t("Chỉ khách hàng mới","New customer only")}</label>
                </div>
              </div>
              <div className="space-y-2">
                <label>{t("Hạng áp dụng","Target Tiers")} <span className="text-slate-400 font-normal">({t("trống = tất cả","empty = all")})</span></label>
                <div className="flex flex-wrap gap-2">
                  {(["BRONZE","SILVER","GOLD","PLATINUM","DIAMOND"] as const).map(tier => {
                    const checked = form.targetTiers.includes(tier);
                    return (
                      <label key={tier} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer transition ${checked?"bg-teal-50 border-teal-300 text-teal-700":"bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}>
                        <input type="checkbox" className="hidden" checked={checked} onChange={() => setForm(f=>({...f,targetTiers:checked?f.targetTiers.filter(t=>t!==tier):[...f.targetTiers,tier]}))} />{tier}
                      </label>
                    );
                  })}
                </div>
              </div>
              {(createMutation.isError || updateMutation.isError) && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {getDisplayErrorMessage((createMutation.error || updateMutation.error) as any)}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={handleCloseModal} className="rounded-full font-bold text-xs px-5">{t("Hủy","Cancel")}</Button>
                <Button type="submit" disabled={isSaving} className="rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-xs px-5 gap-1.5">
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingCode ? t("Cập nhật","Update") : t("Tạo Voucher","Create")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

function VoucherDescriptionField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function ins(open: string, close: string) {
    const el = ref.current; if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd, sel = value.slice(s, e);
    const next = value.slice(0, s) + open + sel + close + value.slice(e);
    onChange(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + open.length, s + open.length + sel.length); }, 0);
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1 border border-slate-200 border-b-0 rounded-t-xl bg-slate-50 px-2 py-1">
        <button type="button" onClick={() => ins("<strong>","</strong>")} className="px-1.5 py-0.5 text-xs font-black hover:bg-white rounded">B</button>
        <button type="button" onClick={() => ins("<em>","</em>")} className="px-1.5 py-0.5 text-xs italic hover:bg-white rounded">I</button>
        <button type="button" onClick={() => ins("<p>","</p>")} className="px-1.5 py-0.5 text-xs hover:bg-white rounded">P</button>
        <button type="button" onClick={() => ins("<ul><li>","</li></ul>")} className="px-1.5 py-0.5 text-xs hover:bg-white rounded">• List</button>
      </div>
      <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-b-xl border border-slate-200 p-3 outline-none min-h-[70px] text-xs font-medium font-mono" placeholder="<p>Mô tả voucher...</p>" />
    </div>
  );
}

function formatCurrency(value: number, language: "vi" | "en") {
  return `${value.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} VND`;
}
function formatDate(value: string, language: "vi" | "en") {
  return new Date(value).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US");
}
function formatDateTime(value: string, language: "vi" | "en") {
  return new Date(value).toLocaleString(language === "vi" ? "vi-VN" : "en-US");
}
