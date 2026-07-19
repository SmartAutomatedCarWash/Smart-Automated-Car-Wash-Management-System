"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { buildLoyaltySummary, formatLoyaltyPoints, formatLoyaltyTransactionType } from "@/features/loyalty/lib/customer-loyalty";
import { formatBookingCurrency, getBookingStatusLabel, humanizeCode } from "@/features/bookings/lib/booking-format";
import { useCustomerBookings } from "@/features/bookings/hooks/use-bookings";
import {
  useCustomerLoyaltyAccount,
  useCustomerLoyaltyTransactions,
  useCustomerWashHistory,
  usePublicTierConfigs,
} from "@/features/loyalty/hooks/use-customer-loyalty";
import { useLanguageStore, translate } from "@/shared/store/language.store";

const HISTORY_BOOKING_STATUSES = new Set(["COMPLETED", "CANCELLED", "NO_SHOW"]);

export function CustomerHistoryPageContent() {
  const getErrorMessage = useErrorMessage();
  const { language } = useLanguageStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"bookings" | "washes" | "points">("bookings");
  const bookingsQuery = useCustomerBookings({ page: 1, limit: 50 });
  const washHistoryQuery = useCustomerWashHistory(1, 50);
  const transactionsQuery = useCustomerLoyaltyTransactions(1, 50);
  const accountQuery = useCustomerLoyaltyAccount();
  const tiersQuery = usePublicTierConfigs();
  const locale = language === "vi" ? "vi-VN" : "en-US";

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        bookingsQuery.refetch(),
        washHistoryQuery.refetch(),
        transactionsQuery.refetch(),
        accountQuery.refetch(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const summary =
    accountQuery.data && tiersQuery.data ? buildLoyaltySummary(accountQuery.data, tiersQuery.data) : null;

  const historyBookings = useMemo(() => {
    const items = bookingsQuery.data?.items ?? [];
    return items.filter((booking) => HISTORY_BOOKING_STATUSES.has(booking.status));
  }, [bookingsQuery.data]);

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_25%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Card className="border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>{translate(language, "Lich su khach hang", "Customer history")}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                {isRefreshing ? translate(language, "Dang tai lai...", "Refreshing...") : translate(language, "Tai lai", "Refresh")}
              </Button>
              <Button asChild>
                <Link href="/customer/loyalty/history">{translate(language, "Xem lich su diem", "Open point history")}</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {summary ? (
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard label={translate(language, "Diem kha dung", "Available points")} value={summary.availablePoints.toLocaleString(locale)} />
            <StatCard label={translate(language, "Diem tich luy", "Lifetime points")} value={summary.lifetimePoints.toLocaleString(locale)} />
            <StatCard
              label={translate(language, "Tien trinh hang", "Tier progress")}
              value={
                summary.progress.nextTier
                  ? `${summary.progress.progressPercent}% ${translate(language, "den", "to")} ${summary.progress.nextTier}`
                  : translate(language, "Dat hang cao nhat", "Top tier reached")
              }
            />
          </section>
        ) : null}

        <div className="space-y-4">
          <div className="grid w-full max-w-xl grid-cols-3 rounded-xl bg-white/80 p-1 shadow-sm">
            <TabButton active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")}>
              {translate(language, "Dat lich", "Bookings")}
            </TabButton>
            <TabButton active={activeTab === "washes"} onClick={() => setActiveTab("washes")}>
              {translate(language, "Lich su rua xe", "Wash history")}
            </TabButton>
            <TabButton active={activeTab === "points"} onClick={() => setActiveTab("points")}>
              {translate(language, "Lich su diem", "Point history")}
            </TabButton>
          </div>

          {activeTab === "bookings" ? (
            bookingsQuery.isPending ? (
              <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
            ) : bookingsQuery.isError ? (
              <Card className="border-rose-200 bg-white">
                <CardHeader>
                  <CardTitle>{translate(language, "Lich su dat lich", "Booking history")}</CardTitle>
                  <CardDescription>{getErrorMessage(bookingsQuery.error)}</CardDescription>
                </CardHeader>
              </Card>
            ) : historyBookings.length === 0 ? (
              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle>{translate(language, "Lich su dat lich", "Booking history")}</CardTitle>
                  <CardDescription>
                    {translate(
                      language,
                      "Trang nay chi hien booking da hoan thanh, huy hoac vang mat. Booking moi dat se nam trong muc Quan ly dat lich cho den khi ket thuc.",
                      "This page only shows completed, cancelled, or no-show bookings. Newly created bookings stay in Manage Bookings until they finish.",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline">
                    <Link href="/customer/bookings">
                      {translate(language, "Mo Quan ly dat lich", "Open Manage Bookings")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {historyBookings.map((booking) => (
                  <Card key={booking.bookingId} className="border-slate-200 bg-white">
                    <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">
                            {booking.primaryItemName ?? translate(language, "Dat lich", "Booking")}
                          </h3>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {getBookingStatusLabel(booking.status)}
                          </span>
                        </div>
                        <div className="grid gap-1 text-sm text-slate-600 md:grid-cols-2">
                          <p>{translate(language, "Xe", "Vehicle")}: <span className="font-medium text-slate-900">{booking.vehiclePlate}</span></p>
                          <p>{translate(language, "Dich vu", "Service")}: <span className="font-medium text-slate-900">{booking.primaryItemName ?? "--"}</span></p>
                          <p>{translate(language, "Lich hen", "Schedule")}: <span className="font-medium text-slate-900">{formatSchedule(booking.bookingDate, booking.bookingTime)}</span></p>
                          <p>{translate(language, "Rua xe", "Wash")}: <span className="font-medium text-slate-900">{booking.washStatus ? humanizeCode(booking.washStatus) : translate(language, "Chua bat dau", "Not started")}</span></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{translate(language, "Tong thanh toan", "Final amount")}</div>
                        <div className="text-xl font-black text-slate-900">{formatBookingCurrency(booking.finalAmount)}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : null}

          {activeTab === "washes" ? (
            <HistorySection
              title={translate(language, "Lich su rua xe", "Wash history")}
              description={translate(language, "Cac lan rua xe da hoan thanh va diem duoc tich.", "Completed wash sessions and points earned after staff completes the wash.")}
              isPending={washHistoryQuery.isPending}
              isError={washHistoryQuery.isError}
              error={washHistoryQuery.error}
              isEmpty={!washHistoryQuery.data || washHistoryQuery.data.items.length === 0}
            >
              <div className="grid gap-4">
                {washHistoryQuery.data?.items.map((wash) => (
                  <Card key={wash.sessionId} className="border-slate-200 bg-white">
                    <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">
                            {wash.primaryItemName ?? translate(language, "Phien rua xe", "Wash session")}
                          </h3>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {humanizeCode(wash.status)}
                          </span>
                        </div>
                        <div className="grid gap-1 text-sm text-slate-600 md:grid-cols-2">
                          <p>{translate(language, "Xe", "Vehicle")}: <span className="font-medium text-slate-900">{wash.vehiclePlate}</span></p>
                          <p>{translate(language, "Dich vu", "Service")}: <span className="font-medium text-slate-900">{wash.primaryItemName ?? "--"}</span></p>
                          <p>{translate(language, "Lich hen", "Booked for")}: <span className="font-medium text-slate-900">{formatSchedule(wash.bookingDate, wash.bookingTime)}</span></p>
                          <p>{translate(language, "Hoan thanh", "Completed")}: <span className="font-medium text-slate-900">{formatDateTime(wash.completedAt, locale)}</span></p>
                        </div>
                      </div>
                      <div className="space-y-2 text-right">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{translate(language, "Da thanh toan", "Paid")}</div>
                          <div className="text-xl font-black text-slate-900">{formatBookingCurrency(wash.finalAmount)}</div>
                        </div>
                        <div className="text-sm font-semibold text-emerald-700">
                          +{wash.awardedPoints.toLocaleString(locale)} pts
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </HistorySection>
          ) : null}

          {activeTab === "points" ? (
            <HistorySection
              title={translate(language, "Giao dich diem", "Point transactions")}
              description={translate(language, "Hoat dong tich diem tu cac lan rua xe hoan thanh.", "Loyalty activity derived from completed wash sessions.")}
              isPending={transactionsQuery.isPending}
              isError={transactionsQuery.isError}
              error={transactionsQuery.error}
              isEmpty={!transactionsQuery.data || transactionsQuery.data.items.length === 0}
            >
              <div className="grid gap-4">
                {transactionsQuery.data?.items.map((item) => (
                  <Card key={item.transactionId} className="border-slate-200 bg-white">
                    <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-base font-black text-slate-900">{formatLoyaltyTransactionType(item.type)}</div>
                        <div className="mt-1 text-sm text-slate-600">{item.description}</div>
                        <div className="mt-2 text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleString(locale)}
                        </div>
                      </div>
                      <div className={item.points >= 0 ? "text-right text-lg font-black text-emerald-700" : "text-right text-lg font-black text-rose-700"}>
                        {formatLoyaltyPoints(item.points)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </HistorySection>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatSchedule(date: string, time: string) {
  const [year, month, day] = date.split("-");
  const timePart = time.split(":").slice(0, 2).join(":");
  return `${day}/${month}/${year} ${timePart}`;
}

function formatDateTime(iso: string, locale: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm"
          : "rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
      }
    >
      {children}
    </button>
  );
}

function HistorySection({
  title,
  description,
  isPending,
  isError,
  error,
  isEmpty,
  children,
}: {
  title: string;
  description: string;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isEmpty: boolean;
  children: ReactNode;
}) {
  const getErrorMessage = useErrorMessage();

  if (isPending) {
    return <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />;
  }

  if (isError) {
    return (
      <Card className="border-rose-200 bg-white">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{getErrorMessage(error)}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <>{children}</>;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <CardContent className="p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</div>
      </CardContent>
    </Card>
  );
}
