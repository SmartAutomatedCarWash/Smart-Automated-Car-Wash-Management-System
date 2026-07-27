"use client";

import NextLink from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Crown,
  CreditCard,
  History,
  Repeat2,
  ShieldCheck,
  Star,
  Ticket,
  Wallet,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { buildLoyaltySummary, formatLoyaltyPoints, formatLoyaltyTransactionType } from "@/features/loyalty/lib/customer-loyalty";
import { formatBookingCurrency, getBookingStatusLabel, humanizeCode } from "@/features/bookings/lib/booking-format";
import { useCustomerBookings, useActiveCustomerCombos } from "@/features/bookings/hooks/use-bookings";
import type { BookingListItem } from "@/entities/bookings";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/ui/pagination";
import {
  useCustomerLoyaltyAccount,
  useCustomerLoyaltyTransactions,
  useCustomerWashHistory,
  usePublicTierConfigs,
} from "@/features/loyalty/hooks/use-customer-loyalty";
import { useLanguageStore, translate } from "@/shared/store/language.store";


export function CustomerHistoryPageContent() {
  const getErrorMessage = useErrorMessage();
  const { language } = useLanguageStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const activeTab = (searchParams.get("tab") as "bookings" | "points" | "payments") || "bookings";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 5;

  const bookingsQuery = useCustomerBookings({ page, limit });
  const washHistoryQuery = useCustomerWashHistory(page, limit);
  const transactionsQuery = useCustomerLoyaltyTransactions(page, limit);
  const combosQuery = useActiveCustomerCombos(); // Assuming this doesn't have page/limit but we'll paginate client-side if needed, or it's a small list. We'll paginate client-side for combos if they return all.
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
    return bookingsQuery.data?.items ?? [];
  }, [bookingsQuery.data]);

  // Client-side pagination for combos
  const paginatedCombos = useMemo(() => {
    const allCombos = combosQuery.data ?? [];
    const startIndex = (page - 1) * limit;
    return allCombos.slice(startIndex, startIndex + limit);
  }, [combosQuery.data, page, limit]);

  const totalComboPages = Math.ceil((combosQuery.data?.length ?? 0) / limit);

  const groupedPointTransactions = useMemo(() => {
    const items = transactionsQuery.data?.items ?? [];
    const grouped = new Map<string, {
      bookingId: string;
      transactionId: string;
      createdAt: string;
      description: string;
      points: number;
      types: Set<string>;
    }>();
    const standalone: typeof items = [];

    for (const item of items) {
      if (!item.bookingId) {
        standalone.push(item);
        continue;
      }
      const existing = grouped.get(item.bookingId);
      if (!existing) {
        grouped.set(item.bookingId, {
          bookingId: item.bookingId,
          transactionId: item.transactionId,
          createdAt: item.createdAt,
          description: item.description,
          points: item.points,
          types: new Set([item.type]),
        });
        continue;
      }
      existing.points += item.points;
      existing.createdAt = existing.createdAt > item.createdAt ? existing.createdAt : item.createdAt;
      existing.transactionId = `${existing.transactionId}-${item.transactionId}`;
      existing.types.add(item.type);
      if (!existing.description.toLowerCase().includes(item.description.toLowerCase())) {
        existing.description = `${existing.description} + ${item.description}`;
      }
    }

    return [
      ...Array.from(grouped.values()).map((item) => ({
        transactionId: item.transactionId,
        bookingId: item.bookingId,
        createdAt: item.createdAt,
        description: item.description,
        points: item.points,
        type: "EARN" as const,
      })),
      ...standalone,
    ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [transactionsQuery.data]);

  const progressPercent = summary?.progress.progressPercent ?? 0;
  const nextTierLabel = summary?.progress.nextTier ?? translate(language, "Hạng cao nhất", "Top tier");

  return (
    <div className="relative min-h-[calc(100vh-72px)] bg-[#fafafa] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        


        {/* Overview Section */}
        <div className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">


          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard 
              icon={Star} 
              label={translate(language, "ĐIỂM KHẢ DỤNG", "AVAILABLE POINTS")} 
              value={summary ? summary.availablePoints.toLocaleString(locale) : "--"} 
            />
            <StatCard 
              icon={Crown} 
              label={translate(language, "ĐIỂM TÍCH LŨY", "LIFETIME POINTS")} 
              value={summary ? summary.lifetimePoints.toLocaleString(locale) : "--"} 
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
          {/* Tabs */}
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
            <div className="grid items-start gap-6">
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
                  {bookingsQuery.data && typeof bookingsQuery.data.pagination?.total === "number" && bookingsQuery.data.pagination.total > limit && (
                    <div className="flex justify-center border-t border-slate-100 p-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setPage(Math.max(1, page - 1))}
                              className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <span className="px-4 text-sm text-slate-600">
                              {translate(language, "Trang", "Page")} {page} / {Math.ceil(bookingsQuery.data.pagination.total / limit)}
                            </span>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setPage(page + 1)}
                              className={page >= Math.ceil(bookingsQuery.data.pagination.total / limit) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
                     {groupedPointTransactions.map((item) => (
                       <PointTransactionRow
                         key={item.transactionId}
                         item={item}
                         language={language}
                         locale={locale}
                       />
                     ))}
                   </div>
                 )}
                 {transactionsQuery.data && typeof transactionsQuery.data.pagination?.total === "number" && transactionsQuery.data.pagination.total > limit && (
                    <div className="flex justify-center border-t border-slate-100 p-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setPage(Math.max(1, page - 1))}
                              className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <span className="px-4 text-sm text-slate-600">
                              {translate(language, "Trang", "Page")} {page} / {Math.ceil(transactionsQuery.data.pagination.total / limit)}
                            </span>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setPage(page + 1)}
                              className={page >= Math.ceil(transactionsQuery.data.pagination.total / limit) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
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
                 ) : !combosQuery.data || combosQuery.data.length === 0 ? (
                   <div className="p-8 text-center text-slate-500">
                     {translate(language, "Chưa mua Combo nào", "No combos purchased")}
                   </div>
                 ) : (
                   <div className="divide-y divide-slate-100">
                     {paginatedCombos.map((combo) => (
                       <div key={combo.customerComboId} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50 transition-colors">
                         <div>
                           <div className="text-sm font-bold text-slate-900">{combo.comboName}</div>
                           <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                             <span className="inline-flex rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-600">
                               {combo.status}
                             </span>
                             <span>{combo.remainingUsages} / {combo.totalUsages} {translate(language, "lượt", "uses")}</span>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className="text-xs text-slate-400">{translate(language, "Ngày mua:", "Activated:")} {new Date(combo.activatedAt).toLocaleDateString(locale)}</div>
                           <div className="mt-1 text-xs text-slate-400">{translate(language, "Hết hạn:", "Expires:")} {new Date(combo.expiresAt).toLocaleDateString(locale)}</div>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
                 {totalComboPages > 1 && (
                    <div className="flex justify-center border-t border-slate-100 p-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setPage(Math.max(1, page - 1))}
                              className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <span className="px-4 text-sm text-slate-600">
                              {translate(language, "Trang", "Page")} {page} / {totalComboPages}
                            </span>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setPage(page + 1)}
                              className={page >= totalComboPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
               </CardContent>
             </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
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
        active
          ? "border-cyan-500 text-cyan-600"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function PointTransactionRow({
  item,
  language,
  locale,
}: {
  item: {
    bookingId: string | null;
    createdAt: string;
    description: string;
    points: number;
    type: Parameters<typeof formatLoyaltyTransactionType>[0];
  };
  language: string;
  locale: string;
}) {
  const bookingHref = item.bookingId ? `/customer/bookings/${item.bookingId}?from=history` : null;
  const title = item.bookingId
    ? translate(language, "Tổng điểm", "Total points")
    : formatLoyaltyTransactionType(item.type);
  const content = (
    <>
      <div>
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{item.description}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>{new Date(item.createdAt).toLocaleString(locale)}</span>
          {item.bookingId ? (
            <span className="font-medium text-cyan-600">
              {translate(language, "Xem booking", "View booking")}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        <div className={cnPointValue(item.points, Boolean(bookingHref))}>
          {item.points >= 0 ? "+" : ""}{item.points.toLocaleString(locale)} pts
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
  const tone = points >= 0 ? "text-emerald-600" : "text-rose-600";
  const linkedStyle = linked ? "rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200" : "";
  return `text-right text-lg font-bold ${tone} ${linkedStyle}`;
}

function BookingRow({ booking, language, locale }: { booking: BookingListItem; language: string; locale: string }) {
  let statusBadge = null;
  if (booking.status === "COMPLETED") {
     statusBadge = <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">{translate(language, "Hoàn thành ✓", "Completed ✓")}</span>;
  } else if (booking.status === "CANCELLED") {
     statusBadge = <span className="inline-flex items-center rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">{translate(language, "Đã hủy ⓘ", "Canceled ⓘ")}</span>;
  } else if (booking.status === "NO_SHOW") {
     statusBadge = <span className="inline-flex items-center rounded bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-600">{translate(language, "Không đến", "No Show")}</span>;
  } else if (booking.status === "IN_PROGRESS") {
     statusBadge = <span className="inline-flex items-center rounded bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-600">{translate(language, "Đang xử lý ⏳", "In Progress ⏳")}</span>;
  } else if (booking.status === "CHECKED_IN") {
     statusBadge = <span className="inline-flex items-center rounded bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-600">{translate(language, "Đã check-in", "Checked In")}</span>;
  } else {
     statusBadge = <span className="inline-flex items-center rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">{translate(language, "Sắp tới ⓘ", "Upcoming ⓘ")}</span>;
  }

  const [year, month, day] = booking.bookingDate.split("-");
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const formattedDate = dateObj.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  
  let timeLabel = booking.bookingTime;
  try {
     const [h, m] = booking.bookingTime.split(":");
     const d = new Date();
     d.setHours(parseInt(h), parseInt(m));
     timeLabel = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  } catch(e) {}

  return (
    <NextLink href={`/customer/bookings/${booking.bookingId}?from=history`} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50 transition-colors">
      <div className="flex flex-1 items-center gap-8">
        
        <div className="w-[180px]">
          <div className="text-sm font-bold text-slate-900 truncate">{booking.primaryItemName ?? "Booking"}</div>
        </div>

        <div className="flex items-center gap-2 w-[140px] text-slate-500">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <div>
            <div className="text-xs font-medium text-slate-900">{formattedDate}</div>
            <div className="text-xs">{timeLabel}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-[140px] text-slate-500">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
           <div>
             <div className="text-xs font-medium text-slate-900 truncate">{booking.vehiclePlate}</div>
             <div className="text-xs truncate">{booking.vehiclePlate}</div>
           </div>
        </div>

      </div>

      <div className="flex items-center gap-4">
        {statusBadge}
        <div className="text-sm font-bold text-slate-900 w-[80px] text-right">
          {formatBookingCurrency(booking.finalAmount)}
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300" />
      </div>
    </NextLink>
  );
}


