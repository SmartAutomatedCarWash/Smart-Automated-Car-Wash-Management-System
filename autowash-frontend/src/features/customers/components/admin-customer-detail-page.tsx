"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CircleCheck,
  Clock3,
  Mail,
  Medal,
  Phone,
  RefreshCcw,
  TimerReset,
  UserCircle2,
  Loader2,
  Copy,
} from "lucide-react";
import { notify } from "@/shared/lib/notify";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/ui/table";
import { DateTimePickerButton } from "@/shared/ui/date-picker-button";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { AdminCustomerStatus, AdminEditableAccountRole } from "@/entities/reports";
import {
  useAdminBookings,
  useAdminCustomerDetail,
  useAdminCustomerPointTransactions,
  useAdminCustomerTierHistory,
  useAdminCustomerVehicles,
  useAdminCustomerWashHistory,
  useUpdateAdminCustomerStatus,
  useUpdateAdminCustomerTier,
  useUpdateAdminCustomerPoints,
} from "@/features/reports/hooks/use-admin-reporting";
import { useTierConfigs } from "@/features/settings/hooks/use-admin-tiers";
import { useLanguageStore, translate } from "@/shared/store/language.store";

type AdminCustomerDetailPageContentProps = {
  customerId: string;
};

type CustomerTab =
  | "overview"
  | "vehicles"
  | "bookings"
  | "wash-history"
  | "point-transactions"
  | "tier-history"
  | "management";

type DateRangeDraft = {
  dateFrom: string;
  dateTo: string;
};

const PAGE_LIMIT = 20;
const EDITABLE_ROLES: AdminEditableAccountRole[] = ["CUSTOMER", "STAFF", "ADMIN"];

function translateEnumLabel(value: string, lang: "vi" | "en") {
  const map: Record<string, { vi: string; en: string }> = {
    CUSTOMER: { vi: "Khách hàng", en: "Customer" },
    STAFF: { vi: "Nhân viên", en: "Staff" },
    ADMIN: { vi: "Quản trị viên", en: "Admin" },
    GUEST: { vi: "Khách vãng lai", en: "Guest" },
    ACTIVE: { vi: "Hoạt động", en: "Active" },
    BLOCKED: { vi: "Đã khóa", en: "Blocked" },
    SUSPENDED: { vi: "Tạm ngưng", en: "Suspended" },
    MEMBER: { vi: "Thành viên", en: "Member" },
    SILVER: { vi: "Bạc", en: "Silver" },
    GOLD: { vi: "Vàng", en: "Gold" },
    PLATINUM: { vi: "Bạch kim", en: "Platinum" },
    PENDING: { vi: "Chờ duyệt", en: "Pending" },
    CONFIRMED: { vi: "Đã xác nhận", en: "Confirmed" },
    CHECKED_IN: { vi: "Đã nhận xe", en: "Checked-in" },
    IN_PROGRESS: { vi: "Đang tiến hành", en: "In progress" },
    COMPLETED: { vi: "Hoàn thành", en: "Completed" },
    CANCELLED: { vi: "Đã hủy", en: "Cancelled" },
    NO_SHOW: { vi: "Vắng mặt", en: "No-show" },
    EARN: { vi: "Tích điểm", en: "Earn" },
    REDEEM: { vi: "Đổi điểm", en: "Redeem" },
    TIER_UPGRADE: { vi: "Thăng hạng", en: "Tier upgrade" },
    ADJUST: { vi: "Điều chỉnh", en: "Adjust" },
    EXPIRE: { vi: "Hết hạn", en: "Expire" },
    FAILED: { vi: "Thất bại", en: "Failed" },
    REFUNDED: { vi: "Đã hoàn tiền", en: "Refunded" },
    NOT_STARTED: { vi: "Chưa bắt đầu", en: "Not started" },
    PREPARING: { vi: "Đang chuẩn bị", en: "Preparing" },
    WASHING: { vi: "Đang rửa", en: "Washing" },
    DRYING: { vi: "Đang sấy", en: "Drying" },
    UNPAID: { vi: "Chưa thanh toán", en: "Unpaid" },
    PAID: { vi: "Đã thanh toán", en: "Paid" },
  };
  return map[value]?.[lang] || value;
}

export function AdminCustomerDetailPageContent({ customerId }: AdminCustomerDetailPageContentProps) {
  const router = useRouter();
  const { language } = useLanguageStore();
  const getErrorMessage = useErrorMessage();
  const [activeTab, setActiveTab] = useState<CustomerTab>("overview");
  const [vehiclesPage, setVehiclesPage] = useState(1);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [washPage, setWashPage] = useState(1);
  const [pointPage, setPointPage] = useState(1);
  const [tierPage, setTierPage] = useState(1);
  const [statusDraft, setStatusDraft] = useState<AdminCustomerStatus>("ACTIVE");
  const [statusReasonDraft, setStatusReasonDraft] = useState("");
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [pointsDraft, setPointsDraft] = useState<string>("");
  const [pointsReason, setPointsReason] = useState<string>("");
  const [pointsFeedback, setPointsFeedback] = useState<string | null>(null);
  const [tierDraft, setTierDraft] = useState<string>("BRONZE");
  const [tierFeedback, setTierFeedback] = useState<string | null>(null);

  const [washDateDraft, setWashDateDraft] = useState<DateRangeDraft>({ dateFrom: "", dateTo: "" });
  const [washDateRange, setWashDateRange] = useState<DateRangeDraft>({ dateFrom: "", dateTo: "" });

  const [pointTypeDraft, setPointTypeDraft] = useState("");
  const [pointDateDraft, setPointDateDraft] = useState<DateRangeDraft>({ dateFrom: "", dateTo: "" });
  const [pointFilters, setPointFilters] = useState({
    type: "",
    dateFrom: "",
    dateTo: "",
  });

  const detailQuery = useAdminCustomerDetail(customerId);
  const vehiclesQuery = useAdminCustomerVehicles(
    customerId,
    { page: vehiclesPage, limit: PAGE_LIMIT },
    { enabled: activeTab === "vehicles" },
  );
  const bookingsQuery = useAdminBookings(
    { customerId },
    bookingsPage,
    PAGE_LIMIT,
    { enabled: activeTab === "bookings" },
  );
  const washHistoryQuery = useAdminCustomerWashHistory(
    customerId,
    {
      page: washPage,
      limit: PAGE_LIMIT,
      dateFrom: washDateRange.dateFrom || undefined,
      dateTo: washDateRange.dateTo || undefined,
    },
    { enabled: activeTab === "wash-history" },
  );
  const pointTransactionsQuery = useAdminCustomerPointTransactions(
    customerId,
    {
      page: pointPage,
      limit: PAGE_LIMIT,
      type: pointFilters.type || undefined,
      dateFrom: pointFilters.dateFrom || undefined,
      dateTo: pointFilters.dateTo || undefined,
    },
    { enabled: activeTab === "point-transactions" },
  );
  const tierHistoryQuery = useAdminCustomerTierHistory(
    customerId,
    { page: tierPage, limit: PAGE_LIMIT },
    { enabled: activeTab === "tier-history" },
  );
  const updateStatusMutation = useUpdateAdminCustomerStatus(customerId);
  const updatePointsMutation = useUpdateAdminCustomerPoints(customerId);
  const updateTierMutation = useUpdateAdminCustomerTier(customerId);
  const tiersQuery = useTierConfigs();
  const profile = detailQuery.data?.profile;
  const loyalty = detailQuery.data?.loyalty;

  useEffect(() => {
    if (!detailQuery.data?.profile.status) {
      return;
    }

    if (detailQuery.data.profile.status === "BLOCKED" || detailQuery.data.profile.status === "SUSPENDED") {
      setStatusDraft(detailQuery.data.profile.status);
      return;
    }

    setStatusDraft("ACTIVE");
  }, [detailQuery.data?.profile.status]);

  useEffect(() => {
    if (!detailQuery.data?.loyalty.tier) {
      return;
    }
    setTierDraft(detailQuery.data.loyalty.tier);
  }, [detailQuery.data?.loyalty.tier]);

  const customerTabs = [
    { id: "overview" as CustomerTab, label: translate(language, "Tổng quan", "Overview") },
    { id: "vehicles" as CustomerTab, label: translate(language, "Danh sách xe", "Vehicles") },
    { id: "bookings" as CustomerTab, label: translate(language, "Lịch đặt", "Bookings") },
    { id: "wash-history" as CustomerTab, label: translate(language, "Lịch sử rửa xe", "Wash history") },
    { id: "point-transactions" as CustomerTab, label: translate(language, "Giao dịch điểm", "Point transactions") },
    { id: "tier-history" as CustomerTab, label: translate(language, "Lịch sử hạng", "Tier history") },
    { id: "management" as CustomerTab, label: translate(language, "Quản lý", "Management") },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">


        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <CustomerProfilePanel
            query={detailQuery}
            language={language as "vi" | "en"}
            customerId={customerId}
          />

          <Card className="rounded-md border-slate-200 bg-white shadow-sm">
            <CardContent className="p-0">
              <div className="border-b border-slate-200 px-5 pt-4">
                <div className="flex flex-wrap gap-1">
                  {customerTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
                        activeTab === tab.id
                          ? "border-sky-600 text-sky-700"
                          : "border-transparent text-slate-500 hover:text-slate-900"
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5">
                {activeTab === "overview" ? <OverviewTab query={detailQuery} language={language as "vi" | "en"} /> : null}

                {activeTab === "vehicles" ? (
                  <VehiclesTab query={vehiclesQuery} page={vehiclesPage} onPageChange={setVehiclesPage} language={language as "vi" | "en"} />
                ) : null}

                {activeTab === "bookings" ? (
                  <BookingsTab query={bookingsQuery} page={bookingsPage} onPageChange={setBookingsPage} language={language as "vi" | "en"} />
                ) : null}

                {activeTab === "wash-history" ? (
                  <WashHistoryTab
                    query={washHistoryQuery}
                    page={washPage}
                    onPageChange={setWashPage}
                    draft={washDateDraft}
                    onDraftChange={setWashDateDraft}
                    onApply={() => {
                      setWashDateRange(washDateDraft);
                      setWashPage(1);
                    }}
                    onClear={() => {
                      const emptyRange = { dateFrom: "", dateTo: "" };
                      setWashDateDraft(emptyRange);
                      setWashDateRange(emptyRange);
                      setWashPage(1);
                    }}
                    language={language as "vi" | "en"}
                  />
                ) : null}

                {activeTab === "point-transactions" ? (
                  <PointTransactionsTab
                    query={pointTransactionsQuery}
                    page={pointPage}
                    onPageChange={setPointPage}
                    typeDraft={pointTypeDraft}
                    dateDraft={pointDateDraft}
                    onTypeDraftChange={setPointTypeDraft}
                    onDateDraftChange={setPointDateDraft}
                    onApply={() => {
                      setPointFilters({
                        type: pointTypeDraft,
                        dateFrom: pointDateDraft.dateFrom,
                        dateTo: pointDateDraft.dateTo,
                      });
                      setPointPage(1);
                    }}
                    language={language as "vi" | "en"}
                  />
                ) : null}

                {activeTab === "tier-history" ? (
                  <TierHistoryTab query={tierHistoryQuery} page={tierPage} onPageChange={setTierPage} language={language as "vi" | "en"} />
                ) : null}

                {activeTab === "management" ? (
                  <ManagementTab
                    profile={profile}
                    language={language as "vi" | "en"}
                    statusDraft={statusDraft}
                    statusReasonDraft={statusReasonDraft}
                    onStatusDraftChange={setStatusDraft}
                    onStatusReasonDraftChange={setStatusReasonDraft}
                    onSubmitStatus={async () => {
                      setStatusFeedback(null);
                      try {
                        await updateStatusMutation.mutateAsync({
                          status: statusDraft,
                          reason: statusReasonDraft.trim() || undefined,
                        });
                        await detailQuery.refetch();
                        setStatusFeedback(translate(language, "Cập nhật trạng thái khách hàng thành công.", "Customer status updated."));
                      } catch (error) {
                        setStatusFeedback(getErrorMessage(error));
                      }
                    }}
                    isUpdatingStatus={updateStatusMutation.isPending}
                    statusFeedback={statusFeedback}
                    pointsDraft={pointsDraft}
                    pointsReason={pointsReason}
                    onPointsDraftChange={setPointsDraft}
                    onPointsReasonChange={setPointsReason}
                    onSubmitPoints={async () => {
                      setPointsFeedback(null);
                      const points = parseInt(pointsDraft, 10);
                      if (isNaN(points) || points === 0) {
                        setPointsFeedback(translate(language, "Vui lòng nhập số điểm hợp lệ.", "Please enter a valid points amount."));
                        return;
                      }
                      if (!pointsReason.trim()) {
                        setPointsFeedback(translate(language, "Vui lòng nhập lý do.", "Please enter a reason."));
                        return;
                      }
                      try {
                        await updatePointsMutation.mutateAsync({ points, reason: pointsReason });
                        setPointsFeedback(translate(language, "Cập nhật điểm thành công.", "Successfully updated points."));
                        setPointsDraft("");
                        setPointsReason("");
                        await detailQuery.refetch();
                      } catch (error) {
                        setPointsFeedback(getErrorMessage(error));
                      }
                    }}
                    isUpdatingPoints={updatePointsMutation.isPending}
                    pointsFeedback={pointsFeedback}
                    tierDraft={tierDraft}
                    onTierDraftChange={setTierDraft}
                    onSubmitTier={async () => {
                      setTierFeedback(null);
                      try {
                        await updateTierMutation.mutateAsync({ tier: tierDraft });
                        setTierFeedback(translate(language, "Cập nhật hạng thành viên thành công.", "Tier updated."));
                        await detailQuery.refetch();
                      } catch (error) {
                        setTierFeedback(getErrorMessage(error));
                      }
                    }}
                    isUpdatingTier={updateTierMutation.isPending}
                    tierFeedback={tierFeedback}
                    tierOptions={tiersQuery.data ?? []}
                  />
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  async function refreshActiveTab(tab: CustomerTab) {
    if (tab === "overview") {
      await detailQuery.refetch();
      return;
    }
    if (tab === "vehicles") {
      await vehiclesQuery.refetch();
      return;
    }
    if (tab === "bookings") {
      await bookingsQuery.refetch();
      return;
    }
    if (tab === "wash-history") {
      await washHistoryQuery.refetch();
      return;
    }
    if (tab === "point-transactions") {
      await pointTransactionsQuery.refetch();
      return;
    }
    await tierHistoryQuery.refetch();
  }
}

function CustomerProfilePanel({
  query,
  language,
  customerId,
}: {
  query: ReturnType<typeof useAdminCustomerDetail>;
  language: "vi" | "en";
  customerId: string;
}) {
  const getErrorMessage = useErrorMessage();

  if (query.isPending) {
    return (
      <Card className="rounded-md border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <LoadingInline message={translate(language, "Đang tải hồ sơ khách hàng...", "Loading customer profile...")} />
        </CardContent>
      </Card>
    );
  }

  if (query.isError) {
    return (
      <Card className="rounded-md border-rose-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <ErrorInline message={getErrorMessage(query.error)} />
        </CardContent>
      </Card>
    );
  }

  if (!query.data) {
    return (
      <Card className="rounded-md border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <EmptyInline message={translate(language, "Không tìm thấy khách hàng.", "Customer not found.")} />
        </CardContent>
      </Card>
    );
  }

  const { profile, loyalty, summary } = query.data;

  return (
    <Card className="rounded-md border-slate-200 bg-white shadow-sm relative">
      <Button asChild variant="ghost" size="icon" className="absolute top-3 left-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 h-8 w-8">
        <Link href="/admin/accounts">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
      <button
        onClick={() => {
          navigator.clipboard.writeText(customerId);
          notify.success(translate(language, "Đã sao chép ID!", "Copied ID!"));
        }}
        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium"
        title={translate(language, "Sao chép ID người dùng", "Copy User ID")}
      >
        <Copy className="h-4 w-4" />
        <span className="sr-only">Copy ID</span>
      </button>

      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col items-center text-center">
          <div className="relative inline-block mt-1">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <UserCircle2 className="h-9 w-9" />
            </div>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-slate-950">{profile.fullName}</h2>
          <p className="text-sm text-slate-500">{profile.phone}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <StatusBadge value={profile.status} language={language} />
            <StatusBadge value={profile.tier} language={language} />
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-4 text-sm">
          <IconInfo icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email ?? translate(language, "Không có email", "No email")} />
          <IconInfo icon={<Phone className="h-4 w-4" />} label={translate(language, "Điện thoại", "Phone")} value={profile.phone} />
          <IconInfo icon={<Medal className="h-4 w-4" />} label={translate(language, "Điểm thưởng", "Loyalty points")} value={String(loyalty.currentPoints)} />
          <IconInfo icon={<CalendarClock className="h-4 w-4" />} label={translate(language, "Đã đăng ký", "Registered")} value={formatDate(profile.registeredAt, language)} />
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
          <MiniStat label={translate(language, "Đặt lịch", "Bookings")} value={String(summary.totalBookings)} />
          <MiniStat label={translate(language, "Phiên rửa", "Sessions")} value={String(summary.totalWashSessions)} />
          <MiniStat label={translate(language, "Chi tiêu", "Spent")} value={formatVnd(summary.totalSpent)} />
          <MiniStat label={translate(language, "Tích lũy", "Earned")} value={String(summary.totalPointsEarned)} />
        </div>

      </CardContent>
    </Card>
  );
}

type ManagementTabProps = {
  profile: any;
  language: "vi" | "en";
  statusDraft: AdminCustomerStatus;
  statusReasonDraft: string;
  onStatusDraftChange: (value: AdminCustomerStatus) => void;
  onStatusReasonDraftChange: (value: string) => void;
  onSubmitStatus: () => Promise<void>;
  isUpdatingStatus: boolean;
  statusFeedback: string | null;
  pointsDraft: string;
  pointsReason: string;
  onPointsDraftChange: (value: string) => void;
  onPointsReasonChange: (value: string) => void;
  onSubmitPoints: () => Promise<void>;
  isUpdatingPoints: boolean;
  pointsFeedback: string | null;
  tierDraft: string;
  onTierDraftChange: (value: string) => void;
  onSubmitTier: () => Promise<void>;
  isUpdatingTier: boolean;
  tierFeedback: string | null;
  tierOptions: { tier: string; name?: string | null; active?: boolean }[];
};

function ManagementTab({
  profile,
  language,
  statusDraft,
  statusReasonDraft,
  onStatusDraftChange,
  onStatusReasonDraftChange,
  onSubmitStatus,
  isUpdatingStatus,
  statusFeedback,
  pointsDraft,
  pointsReason,
  onPointsDraftChange,
  onPointsReasonChange,
  onSubmitPoints,
  isUpdatingPoints,
  pointsFeedback,
  tierDraft,
  onTierDraftChange,
  onSubmitTier,
  isUpdatingTier,
  tierFeedback,
  tierOptions,
}: ManagementTabProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card className="rounded-md border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-950">
            {translate(language, "Trạng thái tài khoản", "Account status")}
          </h2>
          <div className="space-y-3">
            <label className="space-y-1.5 block">
              <select
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm"
                value={statusDraft}
                onChange={(event) => onStatusDraftChange(event.target.value as AdminCustomerStatus)}
              >
                <option value="ACTIVE">{translate(language, "Hoạt động", "Active")}</option>
                <option value="BLOCKED">{translate(language, "Đã khóa", "Blocked")}</option>
                <option value="SUSPENDED">{translate(language, "Tạm ngưng", "Suspended")}</option>
              </select>
            </label>
            <Input
              placeholder={translate(language, "Lý do (tùy chọn)", "Reason (optional)")}
              value={statusReasonDraft}
              onChange={(event) => onStatusReasonDraftChange(event.target.value)}
            />
            <Button type="button" className="w-full" onClick={() => void onSubmitStatus()} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? translate(language, "Đang cập nhật...", "Updating...") : translate(language, "Cập nhật trạng thái", "Update status")}
            </Button>
            {statusFeedback ? <p className="text-xs text-slate-600">{statusFeedback}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-950">
            {translate(language, "Hạng thành viên", "Loyalty tier")}
          </h2>
          <div className="space-y-3">
            <label className="space-y-1.5 block">
              <select
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm"
                value={tierDraft}
                onChange={(event) => onTierDraftChange(event.target.value)}
              >
                {(tierOptions.length ? tierOptions.filter((tier) => tier.active !== false) : [
                  { tier: "BRONZE", name: translateEnumLabel("BRONZE", language) },
                  { tier: "SILVER", name: translateEnumLabel("SILVER", language) },
                  { tier: "GOLD", name: translateEnumLabel("GOLD", language) },
                  { tier: "PLATINUM", name: translateEnumLabel("PLATINUM", language) },
                  { tier: "DIAMOND", name: translateEnumLabel("DIAMOND", language) },
                ]).map((tier) => (
                  <option key={tier.tier} value={tier.tier}>
                    {tier.name || translateEnumLabel(tier.tier, language)}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" className="w-full" variant="outline" onClick={() => void onSubmitTier()} disabled={isUpdatingTier}>
              {isUpdatingTier ? translate(language, "Đang cập nhật...", "Updating...") : translate(language, "Cập nhật hạng", "Update tier")}
            </Button>
            {tierFeedback ? <p className="text-xs text-slate-600">{tierFeedback}</p> : null}
          </div>
        </CardContent>
      </Card>

      {profile?.role === "CUSTOMER" && (
        <Card className="rounded-md border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-950">
              {translate(language, "Cộng/Trừ điểm khả dụng", "Add/Deduct active points")}
            </h2>
            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-500">{translate(language, "Số điểm (+ để cộng, - để trừ)", "Points (+ to add, - to deduct)")}</span>
                <Input
                  type="number"
                  placeholder="e.g. 100 or -50"
                  value={pointsDraft}
                  onChange={(e) => onPointsDraftChange(e.target.value)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-500">{translate(language, "Lý do", "Reason")}</span>
                <Input
                  placeholder={translate(language, "Nhập lý do điều chỉnh...", "Enter reason...")}
                  value={pointsReason}
                  onChange={(e) => onPointsReasonChange(e.target.value)}
                />
              </label>
              <Button type="button" className="w-full" variant="outline" onClick={() => void onSubmitPoints()} disabled={isUpdatingPoints}>
                {isUpdatingPoints ? translate(language, "Đang xử lý...", "Processing...") : translate(language, "Thực hiện", "Execute")}
              </Button>
              {pointsFeedback ? <p className="text-xs text-slate-600">{pointsFeedback}</p> : null}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function IconInfo({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="truncate font-medium text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function OverviewTab({
  query,
  language,
}: {
  query: ReturnType<typeof useAdminCustomerDetail>;
  language: "vi" | "en";
}) {
  const getErrorMessage = useErrorMessage();

  if (query.isPending) {
    return <LoadingInline message={translate(language, "Đang tải chi tiết khách hàng...", "Loading customer detail...")} />;
  }
  if (query.isError) {
    return <ErrorInline message={getErrorMessage(query.error)} />;
  }
  if (!query.data) {
    return <EmptyInline message={translate(language, "Không tìm thấy khách hàng.", "Customer not found.")} />;
  }

  const { profile, loyalty, summary } = query.data;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-950">{translate(language, "Thông tin cá nhân", "Profile information")}</h2>
        <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <DetailField label={translate(language, "Họ tên", "Full name")} value={profile.fullName} />
          <DetailField label={translate(language, "Số điện thoại", "Phone number")} value={profile.phone} />
          <DetailField label={translate(language, "Địa chỉ email", "Email address")} value={profile.email ?? translate(language, "Không có email", "No email")} />
          <DetailField label={translate(language, "Ngày đăng ký", "Registered date")} value={formatDateTime(profile.registeredAt, language)} />
          <DetailField label={translate(language, "Trạng thái", "Status")} value={<StatusBadge value={profile.status} language={language} />} />
          <DetailField label={translate(language, "Hạng thành viên", "Loyalty tier")} value={<StatusBadge value={profile.tier} language={language} />} />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="text-base font-semibold text-slate-950">{translate(language, "Tóm tắt hoạt động", "Activity summary")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricBox label={translate(language, "Lượt đặt lịch", "Bookings")} value={String(summary.totalBookings)} />
          <MetricBox label={translate(language, "Hoàn thành", "Completed")} value={String(summary.completedBookings)} />
          <MetricBox label={translate(language, "Đã hủy", "Cancelled")} value={String(summary.cancelledBookings)} />
          <MetricBox label={translate(language, "Phiên rửa xe", "Wash sessions")} value={String(summary.totalWashSessions)} />
          <MetricBox label={translate(language, "Tổng chi tiêu", "Total spent")} value={formatVnd(summary.totalSpent)} />
          <MetricBox label={translate(language, "Điểm tích lũy", "Points balance")} value={String(loyalty.currentPoints)} />
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-950">{value}</div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function VehiclesTab({
  query,
  page,
  onPageChange,
  language,
}: {
  query: ReturnType<typeof useAdminCustomerVehicles>;
  page: number;
  onPageChange: (page: number) => void;
  language: "vi" | "en";
}) {
  if (query.isPending) {
    return <LoadingInline message={translate(language, "Đang tải danh sách xe...", "Loading customer vehicles...")} />;
  }
  if (query.isError) {
    return (
      <ApiGapAwareError
        error={query.error}
        fallbackMessage={translate(language, "Không thể tải danh sách xe khách hàng.", "Failed to load customer vehicles.")}
        language={language}
      />
    );
  }
  if (!query.data || query.data.items.length === 0) {
    return <EmptyInline message={translate(language, "Khách hàng này chưa đăng ký xe.", "No vehicles for this customer.")} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-950">{translate(language, "Danh sách xe", "Vehicles")}</h2>
      <div className="overflow-hidden rounded-md border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>{translate(language, "Biển số xe", "Plate")}</TableHead>
              <TableHead>{translate(language, "Loại xe", "Type")}</TableHead>
              <TableHead>{translate(language, "Mẫu xe", "Model")}</TableHead>
              <TableHead>{translate(language, "Trạng thái", "Status")}</TableHead>
              <TableHead>{translate(language, "Mặc định", "Primary")}</TableHead>
              <TableHead>{translate(language, "Lần rửa gần nhất", "Last service")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.items.map((vehicle) => (
              <TableRow key={vehicle.vehicleId}>
                <TableCell className="font-mono">{vehicle.plate}</TableCell>
                <TableCell>{vehicle.type}</TableCell>
                <TableCell>{[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "N/A"}</TableCell>
                <TableCell>
                  <StatusBadge value={vehicle.status} language={language} />
                </TableCell>
                <TableCell>{vehicle.isPrimary ? translate(language, "Có", "Yes") : translate(language, "Không", "No")}</TableCell>
                <TableCell>{vehicle.lastServiceDate ? formatDateTime(vehicle.lastServiceDate, language) : "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination
        page={page}
        hasMore={query.data.pagination.hasMore}
        onPrevious={() => onPageChange(Math.max(1, page - 1))}
        onNext={() => onPageChange(page + 1)}
        language={language}
      />
    </div>
  );
}

function BookingsTab({
  query,
  page,
  onPageChange,
  language,
}: {
  query: ReturnType<typeof useAdminBookings>;
  page: number;
  onPageChange: (page: number) => void;
  language: "vi" | "en";
}) {
  const getErrorMessage = useErrorMessage();

  if (query.isPending) {
    return <LoadingInline message={translate(language, "Đang tải danh sách đặt lịch...", "Loading customer bookings...")} />;
  }
  if (query.isError) {
    return <ErrorInline message={getErrorMessage(query.error)} />;
  }
  if (!query.data || query.data.items.length === 0) {
    return <EmptyInline message={translate(language, "Khách hàng này chưa có lịch đặt nào.", "No bookings for this customer.")} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-950">{translate(language, "Đặt lịch khách hàng", "Customer bookings")}</h2>
      <div className="overflow-hidden rounded-md border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>{translate(language, "Mã đặt lịch", "Booking")}</TableHead>
              <TableHead>{translate(language, "Dịch vụ", "Service")}</TableHead>
              <TableHead>{translate(language, "Lịch trình", "Schedule")}</TableHead>
              <TableHead>{translate(language, "Trạng thái", "Status")}</TableHead>
              <TableHead>{translate(language, "Thanh toán", "Payment")}</TableHead>
              <TableHead className="text-right">{translate(language, "Số tiền", "Amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.items.map((booking) => (
              <TableRow key={booking.bookingId}>
                <TableCell>
                  <Link href={`/admin/bookings/${booking.bookingId}`} className="text-sky-700 hover:underline font-medium">
                    {shortId(booking.bookingId)}
                  </Link>
                </TableCell>
                <TableCell>{booking.servicePackageName ?? "N/A"}</TableCell>
                <TableCell>
                  {booking.bookingDate} {booking.bookingTime}
                </TableCell>
                <TableCell>
                  <StatusBadge value={booking.status} language={language} />
                </TableCell>
                <TableCell>
                  <StatusBadge value={booking.paymentStatus} language={language} />
                </TableCell>
                <TableCell className="text-right">{formatVnd(booking.finalAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination
        page={page}
        hasMore={query.data.pagination.hasMore}
        onPrevious={() => onPageChange(Math.max(1, page - 1))}
        onNext={() => onPageChange(page + 1)}
        language={language}
      />
    </div>
  );
}

function WashHistoryTab({
  query,
  page,
  onPageChange,
  draft,
  onDraftChange,
  onApply,
  onClear,
  language,
}: {
  query: ReturnType<typeof useAdminCustomerWashHistory>;
  page: number;
  onPageChange: (page: number) => void;
  draft: DateRangeDraft;
  onDraftChange: (next: DateRangeDraft) => void;
  onApply: () => void;
  onClear: () => void;
  language: "vi" | "en";
}) {
  const getErrorMessage = useErrorMessage();
  const items = query.data?.items ?? [];
  const activeSessions = items.filter((item) => item.status !== "COMPLETED" && item.status !== "CANCELLED").length;
  const completedSessions = items.filter((item) => item.status === "COMPLETED").length;
  const totalPoints = items.reduce((sum, item) => sum + (item.pointsAwarded ?? 0), 0);
  const totalFees = items.reduce((sum, item) => sum + (item.fee.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-950">{translate(language, "Lịch sử theo dõi rửa xe", "Wash tracking history")}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {translate(language, "Theo dõi từng phiên rửa xe theo mã đặt lịch, xe, trạng thái, và thời gian thực hiện.", "Follow each wash session by booking, vehicle, status, and service timing.")}
        </p>
      </div>
      <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] md:items-end">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-slate-500">{translate(language, "Bắt đầu từ", "Started from")}</span>
          <DateTimePickerButton
            value={draft.dateFrom}
            onChange={(dateFrom) => onDraftChange({ ...draft, dateFrom })}
            label={translate(language, "Bắt đầu từ", "Started from")}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-slate-500">{translate(language, "Bắt đầu đến", "Started to")}</span>
          <DateTimePickerButton
            value={draft.dateTo}
            onChange={(dateTo) => onDraftChange({ ...draft, dateTo })}
            label={translate(language, "Bắt đầu đến", "Started to")}
            align="right"
          />
        </label>
        <Button type="button" onClick={onApply}>
          {translate(language, "Áp dụng", "Apply")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClear}
        >
          {translate(language, "Xóa bộ lọc", "Clear")}
        </Button>
      </div>

      {query.isPending ? (
        <LoadingInline message={translate(language, "Đang tải lịch sử rửa xe...", "Loading wash history...")} />
      ) : query.isError ? (
        <ErrorInline message={getErrorMessage(query.error)} />
      ) : !query.data || items.length === 0 ? (
        <EmptyInline message={translate(language, "Khách hàng này chưa có phiên rửa xe nào.", "No wash sessions for this customer.")} />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <TrackingMetric icon={<Clock3 className="h-4 w-4" />} label={translate(language, "Số phiên trên trang", "Sessions on page")} value={String(items.length)} />
            <TrackingMetric icon={<TimerReset className="h-4 w-4" />} label={translate(language, "Phiên đang rửa", "Active sessions")} value={String(activeSessions)} />
            <TrackingMetric icon={<CircleCheck className="h-4 w-4" />} label={translate(language, "Đã hoàn thành", "Completed")} value={String(completedSessions)} />
            <TrackingMetric icon={<CalendarClock className="h-4 w-4" />} label={translate(language, "Phí / Điểm", "Fees / points")} value={`${formatVnd(totalFees)} / ${totalPoints}`} />
          </div>

          <div className="overflow-hidden rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>{translate(language, "Trạng thái", "Tracking")}</TableHead>
                  <TableHead>{translate(language, "Biển số", "Plate")}</TableHead>
                  <TableHead>{translate(language, "Xe", "Vehicle")}</TableHead>
                  <TableHead>{translate(language, "Dịch vụ", "Service")}</TableHead>
                  <TableHead>{translate(language, "Lịch rửa", "Schedule")}</TableHead>
                  <TableHead>{translate(language, "Bắt đầu", "Started")}</TableHead>
                  <TableHead>{translate(language, "Hoàn thành", "Completed")}</TableHead>
                  <TableHead className="text-right">{translate(language, "Phí", "Fee")}</TableHead>
                  <TableHead className="text-right">{translate(language, "Điểm", "Points")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.sessionId} className="align-top hover:bg-slate-50/70">
                    <TableCell className="min-w-[190px]">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge value={item.status} language={language} />
                        </div>
                        <WashProgress status={item.status} startedAt={item.startedAt} completedAt={item.completedAt} language={language} />
                        <div className="text-xs text-slate-500">{durationLabel(item.startedAt, item.completedAt, language)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="link" className="h-auto p-0 text-sky-700">
                        <Link href={`/admin/bookings/${item.bookingId}`}>{item.vehiclePlate}</Link>
                      </Button>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.vehiclePlate}</TableCell>
                    <TableCell>{item.servicePackage?.name ?? item.servicePackage?.id ?? "N/A"}</TableCell>
                    <TableCell>
                      <div>{formatDate(item.bookingDate, language)}</div>
                      <div className="text-xs text-slate-500">{item.bookingTime}</div>
                    </TableCell>
                    <TableCell>{item.startedAt ? formatDateTime(item.startedAt, language) : translate(language, "Chưa bắt đầu", "Not started")}</TableCell>
                    <TableCell>{item.completedAt ? formatDateTime(item.completedAt, language) : translate(language, "Đang thực hiện", "In progress")}</TableCell>
                    <TableCell className="text-right">
                      {item.fee.amount != null ? formatMoney(item.fee.amount, item.fee.currency) : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">{item.pointsAwarded ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            hasMore={query.data.pagination.hasMore}
            onPrevious={() => onPageChange(Math.max(1, page - 1))}
            onNext={() => onPageChange(page + 1)}
            language={language}
          />
        </>
      )}
    </div>
  );
}

function TrackingMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700">
        {icon}
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-base font-semibold text-slate-950">{value}</div>
      </div>
    </div>
  );
}

function WashProgress({
  status,
  startedAt,
  completedAt,
  language,
}: {
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  language: "vi" | "en";
}) {
  const steps = [
    { key: "queued", label: translate(language, "Chờ rửa", "Queued"), active: Boolean(startedAt || completedAt || status !== "PENDING") },
    { key: "started", label: translate(language, "Đang rửa", "Started"), active: Boolean(startedAt || completedAt) },
    { key: "done", label: translate(language, "Xong", "Done"), active: Boolean(completedAt || status === "COMPLETED") },
  ];

  return (
    <div className="grid grid-cols-3 gap-1">
      {steps.map((step) => (
        <div key={step.key} className="space-y-1">
          <div className={`h-1.5 rounded-full ${step.active ? "bg-emerald-500" : "bg-slate-200"}`} />
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{step.label}</div>
        </div>
      ))}
    </div>
  );
}

function PointTransactionsTab({
  query,
  page,
  onPageChange,
  typeDraft,
  dateDraft,
  onTypeDraftChange,
  onDateDraftChange,
  onApply,
  language,
}: {
  query: ReturnType<typeof useAdminCustomerPointTransactions>;
  page: number;
  onPageChange: (page: number) => void;
  typeDraft: string;
  dateDraft: DateRangeDraft;
  onTypeDraftChange: (value: string) => void;
  onDateDraftChange: (next: DateRangeDraft) => void;
  onApply: () => void;
  language: "vi" | "en";
}) {
  const getErrorMessage = useErrorMessage();

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-950">{translate(language, "Lịch sử giao dịch điểm", "Point transaction history")}</h2>
      <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
        <select
          className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm"
          value={typeDraft}
          onChange={(event) => onTypeDraftChange(event.target.value)}
        >
          <option value="">{translate(language, "Tất cả các loại", "All types")}</option>
          <option value="EARN">{translate(language, "Tích điểm", "EARN")}</option>
          <option value="REDEEM">{translate(language, "Đổi điểm", "REDEEM")}</option>
          <option value="TIER_UPGRADE">{translate(language, "Thăng hạng", "TIER_UPGRADE")}</option>
          <option value="ADJUST">{translate(language, "Điều chỉnh", "ADJUST")}</option>
          <option value="EXPIRE">{translate(language, "Hết hạn", "EXPIRE")}</option>
        </select>
        <DateTimePickerButton
          value={dateDraft.dateFrom}
          onChange={(dateFrom) => onDateDraftChange({ ...dateDraft, dateFrom })}
          label={translate(language, "Từ ngày", "From date")}
        />
        <DateTimePickerButton
          value={dateDraft.dateTo}
          onChange={(dateTo) => onDateDraftChange({ ...dateDraft, dateTo })}
          label={translate(language, "Đến ngày", "To date")}
          align="right"
        />
        <Button type="button" onClick={onApply}>
          {translate(language, "Áp dụng", "Apply")}
        </Button>
      </div>

      {query.isPending ? (
        <LoadingInline message={translate(language, "Đang tải giao dịch điểm...", "Loading point transactions...")} />
      ) : query.isError ? (
        <ErrorInline message={getErrorMessage(query.error)} />
      ) : !query.data || query.data.items.length === 0 ? (
        <EmptyInline message={translate(language, "Khách hàng này chưa có giao dịch điểm nào.", "No point transactions for this customer.")} />
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>{translate(language, "Loại", "Type")}</TableHead>
                  <TableHead>{translate(language, "Điểm", "Points")}</TableHead>
                  <TableHead>{translate(language, "Số dư sau GD", "Balance after")}</TableHead>
                  <TableHead>{translate(language, "Lý do", "Reason")}</TableHead>
                  <TableHead>{translate(language, "Mã tham chiếu", "Reference")}</TableHead>
                  <TableHead>{translate(language, "Thời gian", "Created at")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((item) => (
                  <TableRow key={item.transactionId}>
                    <TableCell>
                      <StatusBadge value={item.type} language={language} />
                    </TableCell>
                    <TableCell className={item.points >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                      {item.points >= 0 ? `+${item.points}` : item.points}
                    </TableCell>
                    <TableCell>{item.balanceAfter}</TableCell>
                    <TableCell>{item.reason}</TableCell>
                    <TableCell>{item.referenceId ?? "N/A"}</TableCell>
                    <TableCell>{formatDateTime(item.createdAt, language)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            hasMore={query.data.pagination.hasMore}
            onPrevious={() => onPageChange(Math.max(1, page - 1))}
            onNext={() => onPageChange(page + 1)}
            language={language}
          />
        </>
      )}
    </div>
  );
}

function TierHistoryTab({
  query,
  page,
  onPageChange,
  language,
}: {
  query: ReturnType<typeof useAdminCustomerTierHistory>;
  page: number;
  onPageChange: (page: number) => void;
  language: "vi" | "en";
}) {
  if (query.isPending) {
    return <LoadingInline message={translate(language, "Đang tải lịch sử nâng hạng...", "Loading tier history...")} />;
  }
  if (query.isError) {
    return (
      <ApiGapAwareError
        error={query.error}
        fallbackMessage={translate(language, "Không thể tải lịch sử nâng hạng.", "Failed to load tier history.")}
        language={language}
      />
    );
  }
  if (!query.data || query.data.items.length === 0) {
    return <EmptyInline message={translate(language, "Khách hàng này chưa có lịch sử nâng hạng.", "No tier history for this customer.")} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-950">{translate(language, "Lịch sử hạng", "Tier history")}</h2>
      <div className="overflow-hidden rounded-md border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>{translate(language, "Hạng cũ", "From tier")}</TableHead>
              <TableHead>{translate(language, "Hạng mới", "To tier")}</TableHead>
              <TableHead>{translate(language, "Điểm số", "Points")}</TableHead>
              <TableHead>{translate(language, "Lý do", "Reason")}</TableHead>
              <TableHead>{translate(language, "Thay đổi lúc", "Changed at")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.fromTier ? <StatusBadge value={item.fromTier} language={language} /> : "N/A"}</TableCell>
                <TableCell>
                  <StatusBadge value={item.toTier} language={language} />
                </TableCell>
                <TableCell>{item.pointsAtChange ?? "N/A"}</TableCell>
                <TableCell>{item.reason ?? "N/A"}</TableCell>
                <TableCell>{formatDateTime(item.changedAt, language)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination
        page={page}
        hasMore={query.data.pagination.hasMore}
        onPrevious={() => onPageChange(Math.max(1, page - 1))}
        onNext={() => onPageChange(page + 1)}
        language={language}
      />
    </div>
  );
}

function ApiGapAwareError({
  error,
  fallbackMessage,
  language,
}: {
  error: ApiErrorResponse;
  fallbackMessage: string;
  language: "vi" | "en";
}) {
  if (error.statusCode === 404 || error.statusCode === 405) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="font-semibold">{translate(language, "Nguồn dữ liệu không khả dụng", "Data source unavailable")}</div>
        <p className="mt-1">{fallbackMessage}</p>
        <p className="mt-1">{translate(language, "Nguồn dữ liệu admin liên quan chưa được hỗ trợ trên backend.", "The related admin data source is not available yet.")}</p>
      </div>
    );
  }

  return <ErrorInline message={fallbackMessage} />;
}

function Pagination({
  page,
  hasMore,
  onPrevious,
  onNext,
  language,
}: {
  page: number;
  hasMore: boolean;
  onPrevious: () => void;
  onNext: () => void;
  language: "vi" | "en";
}) {
  return (
    <div className="mt-4 flex items-center justify-between border-t pt-3">
      <p className="text-sm text-slate-500">{translate(language, `Trang ${page}`, `Page ${page}`)}</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={page <= 1} onClick={onPrevious}>
          {translate(language, "Trước", "Previous")}
        </Button>
        <Button type="button" variant="outline" disabled={!hasMore} onClick={onNext}>
          {translate(language, "Sau", "Next")}
        </Button>
      </div>
    </div>
  );
}

function LoadingInline({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 p-3 text-sm text-slate-600">
      <Loader2 className="h-4 w-4 animate-spin" />
      {message}
    </div>
  );
}

function ErrorInline({ message }: { message: string }) {
  return <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{message}</p>;
}

function EmptyInline({ message }: { message: string }) {
  return <p className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{message}</p>;
}

function StatusBadge({ value, language }: { value: string; language: "vi" | "en" }) {
  const tone = STATUS_TONE[value] ?? "border-slate-300 bg-slate-100 text-slate-700";

  return (
    <Badge className={tone} variant="outline">
      {translateEnumLabel(value, language)}
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

function formatDateTime(value: string, language: "vi" | "en") {
  return new Date(value).toLocaleString(language === "vi" ? "vi-VN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatVnd(amount: number) {
  return `${amount.toLocaleString("vi-VN")} VND`;
}

function formatMoney(amount: number, currency: string | null) {
  if (!currency || currency === "VND") {
    return formatVnd(amount);
  }
  return `${amount.toLocaleString("en-US")} ${currency}`;
}

function durationLabel(startedAt: string | null, completedAt: string | null, language: "vi" | "en") {
  if (!startedAt) {
    return translate(language, "Đang chờ bắt đầu", "Waiting for start");
  }

  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return translate(language, "Thời lượng không khả dụng", "Duration unavailable");
  }

  const totalMinutes = Math.max(1, Math.round((end - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} ${translate(language, "phút", "min")}`;
  }

  return `${hours}h ${minutes}${translate(language, "phút", "m")}`;
}

const STATUS_TONE: Record<string, string> = {
  PENDING: "border-amber-300 bg-amber-100 text-amber-800",
  CONFIRMED: "border-sky-300 bg-sky-100 text-sky-800",
  CHECKED_IN: "border-violet-300 bg-violet-100 text-violet-800",
  IN_PROGRESS: "border-orange-300 bg-orange-100 text-orange-800",
  COMPLETED: "border-emerald-300 bg-emerald-100 text-emerald-800",
  CANCELLED: "border-rose-300 bg-rose-100 text-rose-800",
  NO_SHOW: "border-slate-400 bg-slate-200 text-slate-800",
  ACTIVE: "border-emerald-300 bg-emerald-100 text-emerald-800",
  BLOCKED: "border-rose-300 bg-rose-100 text-rose-800",
  SUSPENDED: "border-amber-300 bg-amber-100 text-amber-800",
  MEMBER: "border-slate-300 bg-slate-100 text-slate-800",
  SILVER: "border-zinc-300 bg-zinc-100 text-zinc-800",
  GOLD: "border-yellow-300 bg-yellow-100 text-yellow-800",
  PLATINUM: "border-indigo-300 bg-indigo-100 text-indigo-800",
  EARN: "border-emerald-300 bg-emerald-100 text-emerald-800",
  REDEEM: "border-rose-300 bg-rose-100 text-rose-800",
  TIER_UPGRADE: "border-indigo-300 bg-indigo-100 text-indigo-800",
  ADJUST: "border-violet-300 bg-violet-100 text-violet-800",
  EXPIRE: "border-slate-400 bg-slate-200 text-slate-800",
  FAILED: "border-rose-300 bg-rose-100 text-rose-800",
  REFUNDED: "border-zinc-300 bg-zinc-100 text-zinc-800",
};
