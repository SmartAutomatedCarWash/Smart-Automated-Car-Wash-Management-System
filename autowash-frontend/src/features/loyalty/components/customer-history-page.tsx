"use client";

import NextLink from "next/link";
import { useMemo, type ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ArrowRight, CalendarDays, Crown, History, Star, StickyNote, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { buildLoyaltySummary, formatLoyaltyTransactionType } from "@/features/loyalty/lib/customer-loyalty";
import { formatBookingCurrency } from "@/features/bookings/lib/booking-format";
import { useCustomerBookings, useCustomerComboHistory } from "@/features/bookings/hooks/use-bookings";
import type { BookingListItem, CustomerCombo } from "@/entities/bookings";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/ui/pagination";
import {
  useCustomerLoyaltyAccount,
  useCustomerLoyaltyTransactions,
  usePublicTierConfigs,
} from "@/features/loyalty/hooks/use-customer-loyalty";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import type { LoyaltyTransaction } from "@/entities/loyalty";

export function CustomerHistoryPageContent() {
  const { language } = useLanguageStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = (searchParams.get("tab") as "bookings" | "points" | "payments") || "bookings";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 5;

  const bookingsQuery = useCustomerBookings({ page, limit });
  const transactionsQuery = useCustomerLoyaltyTransactions(page, limit);
  const combosQuery = useCustomerComboHistory(page, limit);
  const accountQuery = useCustomerLoyaltyAccount();
  const tiersQuery = usePublicTierConfigs();
  const locale = language === "vi" ? "vi-VN" : "en-US";

  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const summary =
    accountQuery.data && tiersQuery.data ? buildLoyaltySummary(accountQuery.data, tiersQuery.data) : null;

  const historyBookings = useMemo(() => bookingsQuery.data?.items ?? [], [bookingsQuery.data]);
  const progressPercent = summary?.progress.progressPercent ?? 0;
  const nextTierLabel = summary?.progress.nextTier ?? translate(language, "Hạng cao nhất", "Top tier");

  return (
    <div className="relative min-h-[calc(100vh-72px)] bg-[#fafafa] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={Star}
              label={translate(language, "ĐIỂM KHẢ DỤNG", "AVAILABLE POINTS")}
              value={summary ? summary.availablePoints.toLocaleString(locale) : "--"}
            />
            <StatCard
              icon={Crown}
              label={translate(language, "TỔNG BOOKING", "TOTAL BOOKINGS")}
              value={
                typeof accountQuery.data?.totalBookingCount === "number"
                  ? accountQuery.data.totalBookingCount.toLocaleString(locale)
                  : "--"
              }
            />
            <Card className="flex items-center justify-between border-slate-100 bg-white p-5 shadow-sm">
              <div className="w-full">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {translate(language, "TIẾN TRÌNH HẠNG", "TIER PROGRESS")}
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {summary?.progress.nextTier
                    ? `${progressPercent}% to ${nextTierLabel}`
                    : translate(language, "Hạng tối đa", "Top tier")}
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-all duration-700"
                    style={{ width: `${Math.max(8, progressPercent)}%` }}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-8 border-b border-slate-200 px-2">
            <TabButton active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")}>
              <CalendarDays className="h-4 w-4" />
              {translate(language, "Đặt lịch", "Bookings")}
            </TabButton>
            <TabButton active={activeTab === "points"} onClick={() => setActiveTab("points")}>
              <Star className="h-4 w-4" />
              {translate(language, "Lịch sử điểm", "Point history")}
            </TabButton>
            <TabButton active={activeTab === "payments"} onClick={() => setActiveTab("payments")}>
              <History className="h-4 w-4" />
              {translate(language, "Lịch sử Combo", "Combo History")}
            </TabButton>
          </div>

          {activeTab === "bookings" ? (
            <Card className="border-slate-100 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-100 p-5">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <CalendarDays className="h-5 w-5 text-slate-700" />
                  {translate(language, "Đặt lịch gần đây", "Recent bookings")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {bookingsQuery.isPending ? (
                  <div className="h-64 animate-pulse bg-slate-50" />
                ) : historyBookings.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    {translate(language, "Chưa có đặt lịch nào", "No bookings found")}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {historyBookings.map((booking) => (
                      <BookingRow key={booking.bookingId} booking={booking} language={language} locale={locale} />
                    ))}
                  </div>
                )}
                <PaginationBar pagination={bookingsQuery.data?.pagination} page={page} limit={limit} onPage={setPage} language={language} />
              </CardContent>
            </Card>
          ) : activeTab === "points" ? (
            <Card className="border-slate-100 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-100 p-5">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Star className="h-5 w-5 text-slate-700" />
                  {translate(language, "Lịch sử điểm", "Point history")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {transactionsQuery.isPending ? (
                  <div className="h-64 animate-pulse bg-slate-50" />
                ) : !transactionsQuery.data || transactionsQuery.data.items.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    {translate(language, "Chưa có giao dịch điểm nào", "No point transactions found")}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {transactionsQuery.data.items.map((item) => (
                      <PointTransactionRow key={item.transactionId} item={item} language={language} locale={locale} />
                    ))}
                  </div>
                )}
                <PaginationBar pagination={transactionsQuery.data?.pagination} page={page} limit={limit} onPage={setPage} language={language} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-100 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-100 p-5">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <History className="h-5 w-5 text-slate-700" />
                  {translate(language, "Lịch sử Combo", "Combo History")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {combosQuery.isPending ? (
                  <div className="h-64 animate-pulse bg-slate-50" />
                ) : !combosQuery.data || combosQuery.data.items.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    {translate(language, "Chưa mua Combo nào", "No combos purchased")}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {combosQuery.data.items.map((combo) => (
                      <ComboHistoryRow key={combo.customerComboId} combo={combo} language={language} locale={locale} />
                    ))}
                  </div>
                )}
                <PaginationBar pagination={combosQuery.data?.pagination} page={page} limit={limit} onPage={setPage} language={language} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-4 border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
        <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      </div>
    </Card>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 py-4 text-sm font-semibold transition-colors ${
        active ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function PaginationBar({
  pagination,
  page,
  limit,
  onPage,
  language,
}: {
  pagination?: { total?: number } | null;
  page: number;
  limit: number;
  onPage: (page: number) => void;
  language: string;
}) {
  if (!pagination || typeof pagination.total !== "number" || pagination.total <= limit) {
    return null;
  }

  const totalPages = Math.ceil(pagination.total / limit);

  return (
    <div className="flex justify-center border-t border-slate-100 p-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPage(Math.max(1, page - 1))}
              className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          <PaginationItem>
            <span className="px-4 text-sm text-slate-600">
              {translate(language, "Trang", "Page")} {page} / {totalPages}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              onClick={() => onPage(page + 1)}
              className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function PointTransactionRow({
  item,
  language,
  locale,
}: {
  item: LoyaltyTransaction;
  language: string;
  locale: string;
}) {
  const bookingHref = item.bookingId ? `/customer/bookings/${item.bookingId}?from=history` : null;
  const content = (
    <>
      <div>
        <div className="text-sm font-bold text-slate-900">{formatLoyaltyTransactionType(item.type)}</div>
        <div className="mt-1 text-sm text-slate-500">{item.description}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>{new Date(item.createdAt).toLocaleString(locale)}</span>
          {item.bookingId ? (
            <span className="font-medium text-cyan-600">{translate(language, "Xem booking", "View booking")}</span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        <div className={cnPointValue(item.points, Boolean(bookingHref))}>
          {item.points >= 0 ? "+" : ""}
          {item.points.toLocaleString(locale)} pts
        </div>
        {bookingHref ? <ArrowRight className="h-4 w-4 text-slate-300" /> : null}
      </div>
    </>
  );

  const className =
    "flex flex-col gap-4 p-5 transition-colors sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50";

  if (!bookingHref) {
    return <div className={className}>{content}</div>;
  }

  return (
    <NextLink href={bookingHref} className={className}>
      {content}
    </NextLink>
  );
}

function cnPointValue(points: number, linked: boolean) {
  const tone =
    points >= 0
      ? "bg-emerald-50 text-emerald-600 ring-emerald-200"
      : "bg-rose-50 text-rose-600 ring-rose-200";
  const cursor = linked ? "transition-colors group-hover:ring-slate-300" : "";
  return `rounded-full px-3 py-1 text-right text-lg font-bold ring-1 ${tone} ${cursor}`;
}

function BookingRow({ booking, language, locale }: { booking: BookingListItem; language: string; locale: string }) {
  const statusBadge = resolveStatusBadge(booking.status, language);
  const staffName = booking.staffName ?? booking.assignedStaffName ?? null;
  const bookingNote = booking.customerNotes?.trim() || booking.notes?.trim() || null;

  const [year, month, day] = booking.bookingDate.split("-");
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const formattedDate = dateObj.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });

  let timeLabel = booking.bookingTime;
  try {
    const [h, m] = booking.bookingTime.split(":");
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m));
    timeLabel = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  } catch {}

  return (
    <NextLink
      href={`/customer/bookings/${booking.bookingId}?from=history`}
      className="flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-1 items-center gap-8">
        <div className="w-[180px]">
          <div className="truncate text-sm font-bold text-slate-900">{booking.primaryItemName ?? "Booking"}</div>
        </div>

        <div className="flex w-[140px] items-center gap-2 text-slate-500">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <div>
            <div className="text-xs font-medium text-slate-900">{formattedDate}</div>
            <div className="text-xs">{timeLabel}</div>
          </div>
        </div>

        <div className="flex w-[170px] items-center gap-2 text-slate-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
          </svg>
          <div>
            <div className="truncate text-xs font-medium text-slate-900">{booking.vehiclePlate}</div>
            <div className="truncate text-xs">{booking.primaryItemName ?? translate(language, "Booking", "Booking")}</div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1 text-slate-500">
          <div className="flex min-w-0 items-center gap-2">
            <UserCheck className="h-4 w-4 shrink-0" />
            <span className="truncate text-xs font-medium text-slate-900">
              {staffName ?? translate(language, "Chưa gán staff", "No staff assigned")}
            </span>
          </div>
          {bookingNote ? (
            <div className="flex min-w-0 items-start gap-2">
              <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="line-clamp-2 text-xs leading-5 text-slate-500">{bookingNote}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {statusBadge}
        <div className="w-[80px] text-right text-sm font-bold text-slate-900">
          {formatBookingCurrency(booking.finalAmount)}
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300" />
      </div>
    </NextLink>
  );
}

function ComboHistoryRow({
  combo,
  language,
  locale,
}: {
  combo: CustomerCombo;
  language: string;
  locale: string;
}) {
  return (
    <NextLink
      href={`/customer/history/combos/${combo.customerComboId}`}
      className="flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <div className="text-sm font-bold text-slate-900">{combo.comboName}</div>
        <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
          <span className="inline-flex rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-600">
            {combo.status}
          </span>
          <span>
            {combo.remainingUsages} / {combo.totalUsages} {translate(language, "lượt", "uses")}
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-slate-400">
          {translate(language, "Ngày mua:", "Purchased:")}{" "}
          {new Date(combo.createdAt ?? combo.activatedAt ?? combo.expiresAt).toLocaleDateString(locale)}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {translate(language, "Hết hạn:", "Expires:")} {new Date(combo.expiresAt).toLocaleDateString(locale)}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600">
        <span>View detail</span>
        <ArrowRight className="h-4 w-4 text-slate-300" />
      </div>
    </NextLink>
  );
}

function resolveStatusBadge(status: BookingListItem["status"], language: string) {
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
        {translate(language, "Hoàn thành", "Completed")}
      </span>
    );
  }
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">
        {translate(language, "Đã hủy", "Canceled")}
      </span>
    );
  }
  if (status === "NO_SHOW") {
    return (
      <span className="inline-flex items-center rounded bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-600">
        {translate(language, "Không đến", "No Show")}
      </span>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center rounded bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-600">
        {translate(language, "Đang xử lý", "In Progress")}
      </span>
    );
  }
  if (status === "CHECKED_IN") {
    return (
      <span className="inline-flex items-center rounded bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-600">
        {translate(language, "Đã check-in", "Checked In")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
      {translate(language, "Sắp tới", "Upcoming")}
    </span>
  );
}
