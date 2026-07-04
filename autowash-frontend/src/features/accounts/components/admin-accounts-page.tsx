"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Plus, RefreshCcw, Search, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent } from "@/shared/ui/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/ui/table";
import { useAdminAccounts, useCreateAdminStaff } from "@/features/reports/hooks/use-admin-reporting";
import { getDisplayErrorMessage, getFieldErrorMessage } from "@/shared/lib/api-errors";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type {
  AdminAccount,
  AdminAccountRole,
  AdminAccountStatus,
  AdminAccountsFilters,
  CreateAdminStaffPayload,
} from "@/entities/reports";
import { useLanguageStore, translate } from "@/shared/store/language.store";

const PAGE_LIMIT = 20;
const ROLE_OPTIONS: AdminAccountRole[] = ["CUSTOMER", "STAFF", "ADMIN", "GUEST"];
const STAFF_ROLE_OPTIONS: AdminAccountRole[] = ["STAFF", "ADMIN"];
const STATUS_OPTIONS: AdminAccountStatus[] = ["PENDING", "ACTIVE", "BLOCKED", "SUSPENDED", "DELETED"];
const EMPTY_STAFF_FORM: CreateAdminStaffPayload = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  role: "STAFF",
};

function translateRole(role: string, lang: "vi" | "en") {
  const map: Record<string, { vi: string; en: string }> = {
    CUSTOMER: { vi: "Khách hàng", en: "Customer" },
    STAFF: { vi: "Nhân viên", en: "Staff" },
    ADMIN: { vi: "Quản trị viên", en: "Admin" },
    GUEST: { vi: "Khách vãng lai", en: "Guest" },
  };
  return map[role]?.[lang] || role;
}

function translateStatus(status: string, lang: "vi" | "en") {
  const map: Record<string, { vi: string; en: string }> = {
    PENDING: { vi: "Chờ duyệt", en: "Pending" },
    ACTIVE: { vi: "Hoạt động", en: "Active" },
    BLOCKED: { vi: "Đã khóa", en: "Blocked" },
    SUSPENDED: { vi: "Tạm ngưng", en: "Suspended" },
    DELETED: { vi: "Đã xóa", en: "Deleted" },
  };
  return map[status]?.[lang] || status;
}

function translateTier(tier: string, lang: "vi" | "en") {
  const map: Record<string, { vi: string; en: string }> = {
    BRONZE: { vi: "Đồng", en: "Bronze" },
    SILVER: { vi: "Bạc", en: "Silver" },
    GOLD: { vi: "Vàng", en: "Gold" },
    PLATINUM: { vi: "Bạch kim", en: "Platinum" },
    DIAMOND: { vi: "Kim cương", en: "Diamond" },
  };
  return map[tier]?.[lang] || tier;
}

export function AdminAccountsPageContent() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const [activeTab, setActiveTab] = useState<"customers" | "staff_admin">("customers");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AdminAccountsFilters>({});
  const [draftFilters, setDraftFilters] = useState({
    searchQuery: "",
    role: "",
    status: "",
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdminStaffPayload>(EMPTY_STAFF_FORM);
  const createStaffMutation = useCreateAdminStaff();

  const handleTabChange = (tab: "customers" | "staff_admin") => {
    setActiveTab(tab);
    setPage(1);
    setFilters({});
    setDraftFilters({ searchQuery: "", role: "", status: "" });
  };

  const normalizedFilters = useMemo<AdminAccountsFilters>(
    () => {
      if (activeTab === "customers") {
        return {
          searchQuery: filters.searchQuery || undefined,
          role: "CUSTOMER",
          status: filters.status,
        };
      } else {
        return {
          searchQuery: filters.searchQuery || undefined,
          role: filters.role ? (filters.role as AdminAccountRole) : undefined,
          status: filters.status,
        };
      }
    },
    [filters, activeTab],
  );

  const isStaffClientFiltering = activeTab === "staff_admin" && !normalizedFilters.role;
  const accountsQuery = useAdminAccounts(
    normalizedFilters,
    page,
    isStaffClientFiltering ? 100 : PAGE_LIMIT,
  );
  
  const rawAccounts = accountsQuery.data?.items ?? [];
  const accounts = useMemo(() => {
    if (activeTab === "customers") {
      return rawAccounts;
    } else {
      if (!normalizedFilters.role) {
        return rawAccounts.filter((acc) => acc.role === "STAFF" || acc.role === "ADMIN");
      }
      return rawAccounts;
    }
  }, [rawAccounts, activeTab, normalizedFilters.role]);

  const pagination = accountsQuery.data?.pagination;
  const showPagination = activeTab === "customers" || !!normalizedFilters.role;

  const applyFilters = () => {
    setFilters({
      searchQuery: draftFilters.searchQuery.trim() || undefined,
      role: draftFilters.role ? (draftFilters.role as AdminAccountRole) : undefined,
      status: draftFilters.status ? (draftFilters.status as AdminAccountStatus) : undefined,
    });
    setPage(1);
  };

  const clearFilters = () => {
    setDraftFilters({ searchQuery: "", role: "", status: "" });
    setFilters({});
    setPage(1);
  };

  const createFormErrors = useMemo(() => validateCreateStaffForm(createForm, language as "vi" | "en"), [createForm, language]);
  const canSubmitCreateForm =
    Object.values(createFormErrors).every((value) => value === null) && !createStaffMutation.isPending;

  const handleCreateFieldChange =
    (field: keyof CreateAdminStaffPayload) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = field === "phone" ? event.target.value.replace(/\s/g, "") : event.target.value;
      setCreateForm((previous) => ({ ...previous, [field]: nextValue }));
      if (createStaffMutation.isError) {
        createStaffMutation.reset();
      }
    };

  const resetCreateDialog = () => {
    setCreateForm(EMPTY_STAFF_FORM);
    createStaffMutation.reset();
  };

  const handleCreateStaff = async () => {
    if (!canSubmitCreateForm) {
      return;
    }

    try {
      await createStaffMutation.mutateAsync(createForm);
      toast.success(translate(language, "Tạo tài khoản nhân viên thành công.", "Staff account created successfully."));
      setIsCreateDialogOpen(false);
      resetCreateDialog();
      setPage(1);
      void accountsQuery.refetch();
    } catch (error) {
      toast.error(getDisplayErrorMessage(error));
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200">
          <div className="flex">
            <button
              type="button"
              className={`border-b-2 px-6 py-3 text-sm font-semibold transition-all -mb-px ${
                activeTab === "customers"
                  ? "border-sky-600 text-sky-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
              onClick={() => handleTabChange("customers")}
            >
              {translate(language, "Khách hàng", "Customers")}
            </button>
            <button
              type="button"
              className={`border-b-2 px-6 py-3 text-sm font-semibold transition-all -mb-px ${
                activeTab === "staff_admin"
                  ? "border-sky-600 text-sky-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
              onClick={() => handleTabChange("staff_admin")}
            >
              {translate(language, "Nhân viên & Admin", "Staff & Admin")}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-2 sm:pb-0">
            {activeTab === "staff_admin" && (
              <Button
                type="button"
                className="h-9 gap-2"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                {translate(language, "Thêm tài khoản", "Add account")}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2"
              onClick={() => accountsQuery.refetch()}
              disabled={accountsQuery.isFetching}
            >
              <RefreshCcw className={`h-4 w-4 ${accountsQuery.isFetching ? "animate-spin" : ""}`} />
              {translate(language, "Làm mới", "Refresh")}
            </Button>
          </div>
        </div>

        <Card className="rounded-md border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className={`grid gap-3 ${activeTab === "customers" ? "md:grid-cols-[minmax(0,1fr)_160px_auto_auto]" : "md:grid-cols-[minmax(0,1fr)_160px_160px_auto_auto]"} md:items-end`}>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500">{translate(language, "Tìm kiếm tên", "Search name")}</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="h-9 pl-9"
                    placeholder={translate(language, "Tìm theo tên, điện thoại, hoặc email", "Search by name, phone, or email")}
                    value={draftFilters.searchQuery}
                    onChange={(event) =>
                      setDraftFilters((previous) => ({ ...previous, searchQuery: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applyFilters();
                      }
                    }}
                  />
                </div>
              </label>

              {activeTab === "staff_admin" && (
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-500">{translate(language, "Vai trò", "Role")}</span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm"
                    value={draftFilters.role}
                    onChange={(event) => setDraftFilters((previous) => ({ ...previous, role: event.target.value }))}
                  >
                    <option value="">{translate(language, "Tất cả Nhân viên & Admin", "All Staff & Admin")}</option>
                    {STAFF_ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {translateRole(role, language as "vi" | "en")}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500">{translate(language, "Trạng thái", "Status")}</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm"
                  value={draftFilters.status}
                  onChange={(event) => setDraftFilters((previous) => ({ ...previous, status: event.target.value }))}
                >
                  <option value="">{translate(language, "Tất cả trạng thái", "All status")}</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {translateStatus(status, language as "vi" | "en")}
                    </option>
                  ))}
                </select>
              </label>

              <Button type="button" className="h-9" onClick={applyFilters}>
                {translate(language, "Áp dụng", "Apply")}
              </Button>
              <Button type="button" variant="outline" className="h-9" onClick={clearFilters}>
                {translate(language, "Xóa bộ lọc", "Clear")}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-950">
                  {activeTab === "customers" 
                    ? translate(language, "Danh sách khách hàng", "Customer list") 
                    : translate(language, "Danh sách Nhân viên & Admin", "Staff & Admin list")}
                </h2>
                <p className="text-xs text-slate-500">
                  {isStaffClientFiltering
                    ? `${accounts.length.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} ${translate(language, "bản ghi", "records")}`
                    : pagination
                    ? `${pagination.total.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} ${translate(language, "bản ghi", "records")}`
                    : translate(language, "Đang tải bản ghi", "Loading records")}
                </p>
              </div>

              <div className="overflow-hidden rounded-md border border-slate-200">
                {accountsQuery.isPending ? (
                  <StatePanel icon={<Loader2 className="h-4 w-4 animate-spin" />} message={translate(language, "Đang tải danh sách tài khoản...", "Loading accounts...")} />
                ) : accountsQuery.isError ? (
                  <StatePanel tone="danger" message={getDisplayErrorMessage(accountsQuery.error)} />
                ) : accounts.length === 0 ? (
                  <StatePanel message={translate(language, "Không tìm thấy tài khoản nào khớp với bộ lọc.", "No accounts match the current filters.")} />
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>{activeTab === "customers" ? translate(language, "Tên khách hàng", "Customer name") : translate(language, "Họ tên", "Name")}</TableHead>
                        <TableHead>{translate(language, "Email", "Email")}</TableHead>
                        <TableHead>{translate(language, "Điện thoại", "Phone")}</TableHead>
                        {activeTab === "customers" ? (
                          <TableHead>{translate(language, "Hạng", "Tier")}</TableHead>
                        ) : (
                          <TableHead>{translate(language, "Vai trò", "Role")}</TableHead>
                        )}
                        <TableHead>{translate(language, "Ngày tham gia", "Joined date")}</TableHead>
                        <TableHead>{translate(language, "Trạng thái", "Status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account) => (
                        <TableRow
                          key={account.accountId}
                          className="cursor-pointer hover:bg-slate-50/70"
                          role="link"
                          tabIndex={0}
                          onClick={() => router.push(`/admin/accounts/${account.accountId}`)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(`/admin/accounts/${account.accountId}`);
                            }
                          }}
                        >
                          <TableCell>
                            <div className="font-medium text-slate-950">{account.fullName}</div>
                          </TableCell>
                          <TableCell className="text-slate-600">{account.email ?? translate(language, "Không có email", "No email")}</TableCell>
                          <TableCell className="font-medium text-slate-700">{account.phone}</TableCell>
                          {activeTab === "customers" ? (
                            <TableCell>
                              <TierBadge tier={account.tier} language={language as "vi" | "en"} />
                            </TableCell>
                          ) : (
                            <TableCell>
                              <RoleBadge role={account.role} language={language as "vi" | "en"} />
                            </TableCell>
                          )}
                          <TableCell>{formatDate(account.createdAt, language as "vi" | "en")}</TableCell>
                          <TableCell>
                            <StatusBadge status={account.status} language={language as "vi" | "en"} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            {showPagination && pagination ? (
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  {translate(language, `Trang ${pagination.page} / ${Math.max(pagination.totalPages, 1)}`, `Page ${pagination.page} of ${Math.max(pagination.totalPages, 1)}`)}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {translate(language, "Trước", "Previous")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={!pagination.hasMore}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    {translate(language, "Sau", "Next")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            resetCreateDialog();
          }
        }}
      >
        <DialogContent className="rounded-[24px] border-slate-200 bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:max-w-xl">
          <div className="space-y-6 p-6">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-950">
                {translate(language, "Thêm tài khoản nhân viên", "Add staff account")}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={translate(language, "Họ tên", "Full name")}
                value={createForm.fullName}
                onChange={handleCreateFieldChange("fullName")}
                placeholder={translate(language, "Nhập họ tên", "Enter full name")}
                error={resolveFormError("fullName", createFormErrors.fullName, createStaffMutation.error)}
              />
              <FormField
                label={translate(language, "Điện thoại", "Phone")}
                value={createForm.phone}
                onChange={handleCreateFieldChange("phone")}
                placeholder={translate(language, "Nhập số điện thoại", "Enter phone number")}
                error={resolveFormError("phone", createFormErrors.phone, createStaffMutation.error)}
              />
              <FormField
                label={translate(language, "Email", "Email")}
                value={createForm.email}
                onChange={handleCreateFieldChange("email")}
                placeholder={translate(language, "Nhập email", "Enter email")}
                error={resolveFormError("email", createFormErrors.email, createStaffMutation.error)}
              />
              <FormField
                label={translate(language, "Mật khẩu", "Password")}
                value={createForm.password}
                onChange={handleCreateFieldChange("password")}
                placeholder={translate(language, "Nhập mật khẩu", "Enter password")}
                type="password"
                error={resolveFormError("password", createFormErrors.password, createStaffMutation.error)}
              />
              <label className="space-y-2 sm:col-span-2">
                <Label className="text-sm font-semibold text-slate-800">{translate(language, "Vai trò", "Role")}</Label>
                <select
                  className="h-11 w-full rounded-xl border-slate-200 bg-white px-3 text-sm shadow-sm"
                  value={createForm.role}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value as any }))}
                >
                  <option value="STAFF">{translateRole("STAFF", language as "vi" | "en")}</option>
                  <option value="ADMIN">{translateRole("ADMIN", language as "vi" | "en")}</option>
                </select>
              </label>
            </div>

            {createStaffMutation.isError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {getDisplayErrorMessage(createStaffMutation.error)}
              </div>
            ) : null}

            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetCreateDialog();
                }}
              >
                {translate(language, "Hủy", "Cancel")}
              </Button>
              <Button type="button" onClick={handleCreateStaff} disabled={!canSubmitCreateForm}>
                {createStaffMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {translate(language, "Tạo nhân viên", "Create staff")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatePanel({
  icon,
  message,
  tone = "neutral",
}: {
  icon?: ReactNode;
  message: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <div
      className={
        tone === "danger"
          ? "flex items-center justify-center gap-2 bg-rose-50 p-8 text-sm text-rose-700"
          : "flex items-center justify-center gap-2 bg-white p-8 text-sm text-slate-500"
      }
    >
      {icon}
      {message}
    </div>
  );
}

function RoleBadge({ role, language }: { role: AdminAccount["role"]; language: "vi" | "en" }) {
  return (
    <Badge className={ROLE_TONE[role]} variant="outline">
      {translateRole(role, language)}
    </Badge>
  );
}

function StatusBadge({ status, language }: { status: AdminAccount["status"]; language: "vi" | "en" }) {
  const tone = STATUS_TONE[status] ?? "border-slate-300 bg-slate-100 text-slate-700";

  return (
    <Badge className={tone} variant="outline">
      {translateStatus(status, language)}
    </Badge>
  );
}

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function formatDate(value: string, language: "vi" | "en") {
  return new Date(value).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function validateCreateStaffForm(form: CreateAdminStaffPayload, language: "vi" | "en") {
  return {
    fullName: form.fullName.trim().length === 0 
      ? translate(language, "Vui lòng nhập họ tên.", "Full name is required.") 
      : null,
    phone: /^0[0-9]{9}$/.test(form.phone.trim()) 
      ? null 
      : translate(language, "Số điện thoại phải bắt đầu bằng số 0 và gồm 10 chữ số.", "Phone must start with 0 and contain 10 digits."),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) 
      ? null 
      : translate(language, "Email không hợp lệ.", "Email must be valid."),
    password: form.password.length >= 8 
      ? null 
      : translate(language, "Mật khẩu phải chứa ít nhất 8 ký tự.", "Password must be at least 8 characters."),
  };
}

function resolveFormError(
  fieldName: keyof CreateAdminStaffPayload,
  clientError: string | null,
  apiError: ApiErrorResponse | null,
) {
  return clientError ?? getFieldErrorMessage(apiError?.errors, fieldName);
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  error: string | null;
  type?: "text" | "password";
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-slate-800">{label}</Label>
      <div className="relative">
        <Input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={isPassword && showPassword ? "text" : type}
          className={`h-11 rounded-xl border-slate-200 bg-white ${isPassword ? "pr-10" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

const ROLE_TONE: Record<AdminAccount["role"], string> = {
  CUSTOMER: "border-sky-300 bg-sky-100 text-sky-800",
  STAFF: "border-violet-300 bg-violet-100 text-violet-800",
  ADMIN: "border-orange-300 bg-orange-100 text-orange-800",
  GUEST: "border-slate-300 bg-slate-100 text-slate-700",
};

const STATUS_TONE: Record<AdminAccount["status"], string> = {
  PENDING: "border-amber-300 bg-amber-100 text-amber-800",
  ACTIVE: "border-emerald-300 bg-emerald-100 text-emerald-800",
  BLOCKED: "border-rose-300 bg-rose-100 text-rose-800",
  SUSPENDED: "border-slate-400 bg-slate-200 text-slate-800",
  DELETED: "border-zinc-400 bg-zinc-200 text-zinc-800",
};

function TierBadge({ tier, language }: { tier: string; language: "vi" | "en" }) {
  const tone = TIER_TONE[tier] ?? "border-slate-300 bg-slate-100 text-slate-700";
  return (
    <Badge className={tone} variant="outline">
      {translateTier(tier, language)}
    </Badge>
  );
}

const TIER_TONE: Record<string, string> = {
  BRONZE: "border-amber-700/30 bg-amber-700/10 text-amber-900",
  SILVER: "border-slate-400 bg-slate-100 text-slate-700",
  GOLD: "border-yellow-400 bg-yellow-100 text-yellow-800",
  PLATINUM: "border-cyan-300 bg-cyan-100 text-cyan-800",
  DIAMOND: "border-violet-300 bg-violet-100 text-violet-800",
};
