"use client";

import Link from "next/link";
import { useState } from "react";
import dynamic from "next/dynamic";

const BookingTrendChart = dynamic(
  () => import("./dashboard-charts").then((mod) => mod.BookingTrendChart),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-muted/20 rounded-2xl" /> }
);
const BookingStatusChart = dynamic(
  () => import("./dashboard-charts").then((mod) => mod.BookingStatusChart),
  { ssr: false, loading: () => <div className="h-[160px] w-[160px] animate-pulse bg-muted/20 rounded-full" /> }
);
const PeakHoursChart = dynamic(
  () => import("./dashboard-charts").then((mod) => mod.PeakHoursChart),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-muted/20 rounded-2xl" /> }
);
const VoucherStatsChart = dynamic(
  () => import("./dashboard-charts").then((mod) => mod.VoucherStatsChart),
  { ssr: false, loading: () => <div className="h-[140px] w-[140px] animate-pulse bg-muted/20 rounded-full" /> }
);

import {
  CalendarDays, Users, Award, TrendingUp, TrendingDown,
  Droplets, Star, AlertTriangle, Clock, BadgePercent,
  Ticket, BarChart3, Settings2, Activity, Zap,
  ChevronRight, RefreshCw, History, ArrowRightLeft, Coins,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useAdminDashboardFull, useStaffKpi } from "@/features/dashboard/hooks/use-admin-dashboard-metrics";
import { useAdminVoucherRedemptions } from "@/features/vouchers/hooks/use-admin-vouchers";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { cn } from "@/shared/lib/utils";
import type {
  NoShowAlert, RecentBooking, TierBucket, ServiceItem,
} from "@/features/dashboard/api/admin-dashboard-service";
import type { StaffKpiRange } from "@/features/dashboard/api/admin-dashboard-service";

// ── Tier badge colours ────────────────────────────────────────────────────────
const TIER_STYLE: Record<string, string> = {
  BRONZE: "bg-orange-100 text-orange-700 border-orange-200",
  SILVER: "bg-slate-100 text-slate-600 border-slate-200",
  GOLD: "bg-amber-100 text-amber-700 border-amber-200",
  PLATINUM: "bg-cyan-100 text-cyan-700 border-cyan-200",
  DIAMOND: "bg-violet-100 text-violet-700 border-violet-200",
};

const STATUS_COLOUR: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  CHECKED_IN: "#06b6d4",
  IN_PROGRESS: "#8b5cf6",
  COMPLETED: "#22c55e",
  CANCELLED: "#ef4444",
  NO_SHOW: "#6b7280",
};

function TierBadge({ tier }: { tier: string }) {
  const key = tier.toUpperCase();
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", TIER_STYLE[key] ?? "bg-slate-100 text-slate-500")}>
      {tier}
    </span>
  );
}

function formatVND(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("vi-VN");
}

function formatPct(n: number) {
  return `${n.toFixed(1)}%`;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-100", className)} />;
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
      {children}
    </h2>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, tone, delta, loading, href,
}: {
  label: string; value: string; sub: string; icon: React.ElementType;
  tone: string; delta?: number; loading?: boolean; href?: string;
}) {
  const inner = (
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className="mt-1.5 text-3xl font-black tracking-tight text-slate-900 leading-none">{value}</p>
          )}
          <div className="mt-1.5 flex items-center gap-1.5">
            {delta !== undefined && !loading && (
              <span className={cn("flex items-center gap-0.5 text-[11px] font-bold",
                delta >= 0 ? "text-emerald-600" : "text-rose-500")}>
                {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(delta)}
              </span>
            )}
            <span className="text-[11px] text-slate-400 font-semibold">{sub}</span>
          </div>
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        <Card className="border-slate-200 shadow-sm hover:shadow-md hover:border-cyan-200 transition-all cursor-pointer group">
          {inner}
        </Card>
      </Link>
    );
  }
  return (
    <Card className="border-slate-200 shadow-sm">
      {inner}
    </Card>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function AdminDashboardView() {
  const { language } = useLanguageStore();
  const t = (vi: string, en: string) => translate(language, vi, en);
  const { data, isLoading, isError, refetch, isFetching } = useAdminDashboardFull();

  // Section 7: switch between voucher usage stats and point redemption history
  const [redeemView, setRedeemView] = useState<"voucher" | "history">("voucher");
  const [staffKpiRange, setStaffKpiRange] = useState<StaffKpiRange>("TODAY");
  const staffKpiQuery = useStaffKpi(staffKpiRange);
  const redemptionsQuery = useAdminVoucherRedemptions(1, 15);

  const kpis = data?.kpis;
  const trend = data?.bookingTrend?.points ?? [];
  const statusDist = data?.bookingStatusDist;
  const peakHours = data?.peakHours?.slots ?? [];
  const ops = data?.realTimeOps;
  const tierDist = data?.loyaltyTierDist?.tiers ?? [];
  const vouchers = data?.voucherStats;
  const topServices = data?.topServices?.items ?? [];
  const insights = data?.customerInsights;
  const noShows = data?.noShowAlerts ?? [];
  const recentBookings = data?.recentBookings ?? [];
  const reviews = data?.reviewSummary;

  // Booking status chart data
  const statusChartData = statusDist ? [
    { name: t("Chờ xác nhận", "Pending"), value: statusDist.pending, color: STATUS_COLOUR.PENDING },
    { name: t("Đã xác nhận", "Confirmed"), value: statusDist.confirmed, color: STATUS_COLOUR.CONFIRMED },
    { name: t("Check-in", "Checked In"), value: statusDist.checkedIn, color: STATUS_COLOUR.CHECKED_IN },
    { name: t("Đang rửa", "In Progress"), value: statusDist.inProgress, color: STATUS_COLOUR.IN_PROGRESS },
    { name: t("Hoàn thành", "Completed"), value: statusDist.completed, color: STATUS_COLOUR.COMPLETED },
    { name: t("Đã hủy", "Cancelled"), value: statusDist.cancelled, color: STATUS_COLOUR.CANCELLED },
    { name: t("Vắng", "No Show"), value: statusDist.noShow, color: STATUS_COLOUR.NO_SHOW },
  ] : [];

  const voucherChartData = vouchers ? [
    { name: t("Đã phát", "Issued"), value: vouchers.issued, color: "#3b82f6" },
    { name: t("Đã dùng", "Redeemed"), value: vouchers.redeemed, color: "#22c55e" },
    { name: t("Hết hạn", "Expired"), value: vouchers.expired, color: "#f59e0b" },
    { name: t("Thu hồi", "Revoked"), value: vouchers.revoked, color: "#ef4444" },
  ] : [];

  return (
    <WorkspacePage className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{t("Tổng quan hệ thống", "System Overview")}</h1>
          <p className="text-sm text-slate-500 font-semibold mt-0.5">
            {t("Dữ liệu vận hành theo thời gian thực", "Real-time operational data")}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs font-bold"
          onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          {t("Làm mới", "Refresh")}
        </Button>
      </div>

      {isError && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
          <p className="text-sm text-rose-700 font-semibold">
            {t("Không thể tải dữ liệu dashboard. Hãy thử làm mới.", "Failed to load dashboard data. Try refreshing.")}
          </p>
        </div>
      )}

      {/* ─── Section 1: KPI Cards ──────────────────────────────────────── */}
      <section>
        <SectionTitle>{t("Chỉ số hôm nay", "Today's KPIs")}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <KpiCard loading={isLoading} label={t("Đặt lịch hôm nay", "Today's Bookings")}
            value={String(kpis?.todayBookings ?? 0)} icon={CalendarDays}
            tone="text-cyan-800 bg-cyan-50" delta={kpis?.todayBookingsDelta}
            sub={t("so với hôm qua", "vs yesterday")}
            href="/admin/bookings" />
          <KpiCard loading={isLoading} label={t("Hoàn thành hôm nay", "Completed Today")}
            value={String(kpis?.completedToday ?? 0)} icon={Droplets}
            tone="text-emerald-800 bg-emerald-50"
            sub={t("lượt rửa xe", "wash sessions")}
            href="/admin/operations" />
          <KpiCard loading={isLoading} label={t("Khách hàng đang hoạt động", "Active Customers")}
            value={String(kpis?.totalActiveCustomers ?? 0)} icon={Users}
            tone="text-slate-700 bg-slate-100"
            sub={t("tài khoản active", "active accounts")}
            href="/admin/accounts" />
          <KpiCard loading={isLoading} label={t("Tỉ lệ vắng mặt", "No-show Rate")}
            value={formatPct(kpis?.noShowRate ?? 0)} icon={AlertTriangle}
            tone="text-rose-700 bg-rose-50"
            sub={t("trong tổng lịch", "of total bookings")}
            href="/admin/bookings?status=NO_SHOW" />
          <KpiCard loading={isLoading} label={t("Thành viên Loyalty", "Loyalty Members")}
            value={String(kpis?.loyaltyMembers ?? 0)} icon={Award}
            tone="text-amber-700 bg-amber-50"
            sub={t("đã đăng ký", "enrolled")}
            href="/admin/accounts" />
          <KpiCard loading={isLoading} label={t("Doanh thu", "Revenue")}
            value={formatVND(kpis?.totalRevenue ?? 0)} icon={TrendingUp}
            tone="text-violet-700 bg-violet-50"
            sub={t("từ booking hoàn thành", "from completed")}
            href="/admin/reports" />
        </div>
      </section>

      {/* ─── Section 2: Booking Analytics ─────────────────────────────── */}
      <section>
        <SectionTitle>{t("Phân tích đặt lịch", "Booking Analytics")}</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Booking Trend */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-800">
                  {t("Xu hướng đặt lịch 7 ngày", "7-day Booking Trend")}
                </CardTitle>
                <Link href="/admin/bookings" className="flex items-center gap-0.5 text-[11px] font-bold text-cyan-600 hover:text-cyan-700">
                  {t("Xem lịch đặt", "View bookings")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48" /> : (
                <BookingTrendChart trend={trend} />
              )}
            </CardContent>
          </Card>

          {/* Booking Status Doughnut */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-800">
                  {t("Phân bố trạng thái lịch", "Booking Status Distribution")}
                </CardTitle>
                <Link href="/admin/bookings" className="flex items-center gap-0.5 text-[11px] font-bold text-cyan-600 hover:text-cyan-700">
                  {t("Xem tất cả", "View all")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48" /> : (
                <div className="flex items-center gap-4">
                  <BookingStatusChart data={statusChartData} />
                  <div className="flex-1 space-y-1.5">
                    {statusChartData.map((s) => (
                      <div key={s.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                          <span className="font-semibold text-slate-600">{s.name}</span>
                        </div>
                        <span className="font-black text-slate-800">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── Section 3: Operational Analytics ─────────────────────────── */}
      <section>
        <SectionTitle>{t("Phân tích vận hành", "Operational Analytics")}</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Peak Hour Chart */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-800">
                  {t("Giờ cao điểm (30 ngày qua)", "Peak Hours (Last 30 Days)")}
                </CardTitle>
                <Link href="/admin/reports" className="flex items-center gap-0.5 text-[11px] font-bold text-cyan-600 hover:text-cyan-700">
                  {t("Xem báo cáo", "Reports")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48" /> : (
                <PeakHoursChart data={peakHours} />
              )}
            </CardContent>
          </Card>

          {/* Real-time Operations */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {t("Trạng thái vận hành thực tế", "Live Operations Status")}
                </CardTitle>
                <Link href="/admin/operations" className="flex items-center gap-0.5 text-[11px] font-bold text-cyan-600 hover:text-cyan-700">
                  {t("Vận hành", "Operations")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48" /> : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t("Slot đang giữ", "Held Slots"), value: ops?.heldSlots ?? 0, color: "bg-amber-50 border-amber-200 text-amber-700", icon: Clock },
                    { label: t("Xe đang chờ", "Waiting Cars"), value: ops?.waitingCars ?? 0, color: "bg-blue-50 border-blue-200 text-blue-700", icon: CalendarDays },
                    { label: t("Đang rửa", "Being Washed"), value: ops?.carsBeingWashed ?? 0, color: "bg-cyan-50 border-cyan-200 text-cyan-700", icon: Droplets },
                    { label: t("Hoàn thành", "Completed"), value: ops?.completedToday ?? 0, color: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: Activity },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className={cn("flex flex-col gap-1 rounded-2xl border p-4", color)}>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-4 w-4 opacity-70" />
                        <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</span>
                      </div>
                      <span className="text-3xl font-black">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── Section 4: Loyalty & Voucher ─────────────────────────────── */}
      <section>
        <SectionTitle>{t("Loyalty & Voucher", "Loyalty & Voucher")}</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Loyalty Tier Distribution */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-800">
                  {t("Phân bố hạng thành viên", "Loyalty Tier Distribution")}
                </CardTitle>
                <Link href="/admin/accounts" className="flex items-center gap-0.5 text-[11px] font-bold text-cyan-600 hover:text-cyan-700">
                  {t("Xem tất cả", "See all")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? <Skeleton className="h-40" /> : tierDist.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">{t("Chưa có dữ liệu", "No data")}</p>
              ) : tierDist.map((tier: TierBucket) => (
                <div key={tier.tier} className="flex items-center gap-3">
                  <TierBadge tier={tier.displayName || tier.tier} />
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all"
                        style={{ width: `${Math.max(tier.percentage, 2)}%` }} />
                    </div>
                  </div>
                  <span className="w-20 text-right text-xs font-black text-slate-700">
                    {tier.count} <span className="font-normal text-slate-400">({tier.percentage.toFixed(0)}%)</span>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Voucher Statistics */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-800">
                  {t("Thống kê Voucher", "Voucher Statistics")}
                </CardTitle>
                <Link href="/admin/offers?tab=vouchers" className="flex items-center gap-0.5 text-[11px] font-bold text-cyan-600 hover:text-cyan-700">
                  {t("Quản lý", "Manage")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-40" /> : (
                <div className="flex items-center gap-4">
                  <VoucherStatsChart data={voucherChartData} />
                  <div className="flex-1 space-y-2">
                    {voucherChartData.map((v) => (
                      <div key={v.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: v.color }} />
                          <span className="font-semibold text-slate-600">{v.name}</span>
                        </div>
                        <span className="font-black text-slate-800">{v.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── Section 5: Business Insights ─────────────────────────────── */}
      <section>
        <SectionTitle>{t("Business Insights", "Business Insights")}</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Top Services */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-800">
                  {t("Dịch vụ phổ biến nhất", "Top Services")}
                </CardTitle>
                <Link href="/admin/services" className="flex items-center gap-0.5 text-[11px] font-bold text-cyan-600 hover:text-cyan-700">
                  {t("Quản lý", "Manage")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {isLoading ? <Skeleton className="h-40" /> : topServices.map((svc: ServiceItem, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-500">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{svc.serviceName}</p>
                    <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${Math.max(svc.percentage, 3)}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-700 shrink-0">{svc.bookingCount}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Customer Insights */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-800">
                  {t("Phân tích khách hàng", "Customer Insights")}
                </CardTitle>
                <Link href="/admin/accounts" className="flex items-center gap-0.5 text-[11px] font-bold text-cyan-600 hover:text-cyan-700">
                  {t("Xem tất cả", "View all")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-40" /> : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t("Mới tháng này", "New This Month"), value: insights?.newThisMonth ?? 0, color: "text-cyan-700 bg-cyan-50" },
                    { label: t("Quay lại", "Returning"), value: insights?.returning ?? 0, color: "text-emerald-700 bg-emerald-50" },
                    { label: t("VIP", "VIP"), value: insights?.vip ?? 0, color: "text-amber-700 bg-amber-50" },
                    { label: t("Không hoạt động", "Inactive"), value: insights?.inactive ?? 0, color: "text-slate-500 bg-slate-100" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={cn("rounded-2xl p-3", color)}>
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
                      <p className="mt-1 text-2xl font-black">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Summary */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-800">
                  {t("Đánh giá khách hàng", "Customer Reviews")}
                </CardTitle>
                <Link href="/admin/reviews" className="flex items-center gap-0.5 text-[11px] font-bold text-cyan-600 hover:text-cyan-700">
                  {t("Xem tất cả", "See all")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-40" /> : !reviews ? null : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-black text-slate-900">{reviews.averageRating.toFixed(1)}</span>
                    <div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className={cn("h-4 w-4", s <= Math.round(reviews.averageRating)
                            ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                        {reviews.totalReviews} {t("đánh giá", "reviews")}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {[5,4,3,2,1].map((star) => {
                      const cnt = reviews.ratingDistribution?.[star] ?? 0;
                      const pct = reviews.totalReviews > 0 ? cnt / reviews.totalReviews * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-[11px]">
                          <span className="w-4 font-bold text-slate-500">{star}</span>
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-6 text-right font-bold text-slate-500">{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700">{t("Tích cực (4-5★)", "Positive (4-5★)")}</span>
                    <span className="text-sm font-black text-emerald-700">{reviews.positiveRate.toFixed(0)}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── Section 6: Alerts & Recent Activities ────────────────────── */}
      <section>
        <SectionTitle>{t("Cảnh báo & Hoạt động gần đây", "Alerts & Recent Activities")}</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* No-show Alerts */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  {t("Cảnh báo vắng mặt", "No-show Alerts")}
                </CardTitle>
                <Link href="/admin/bookings?status=NO_SHOW"
                  className="flex items-center gap-0.5 text-[11px] font-bold text-rose-500 hover:text-rose-600">
                  {t("Xem tất cả", "View all")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : noShows.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-400 font-semibold">{t("Không có cảnh báo nào", "No alerts")}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {noShows.slice(0, 6).map((alert: NoShowAlert) => (
                    <Link
                      key={alert.customerId}
                      href={`/admin/accounts/${alert.customerId}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-rose-50/40 transition-colors"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{alert.customerName}</p>
                        <p className="text-[11px] text-slate-400 font-semibold">{alert.customerPhone}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <TierBadge tier={alert.tier} />
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-700">
                          ×{alert.violationCount}
                        </span>
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-800">
                  {t("Lịch đặt gần đây", "Recent Bookings")}
                </CardTitle>
                <Link href="/admin/bookings"
                  className="flex items-center gap-0.5 text-[11px] font-bold text-cyan-600 hover:text-cyan-700">
                  {t("Xem tất cả", "View all")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : recentBookings.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-400 font-semibold">{t("Chưa có lịch nào", "No bookings yet")}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {recentBookings.map((booking: RecentBooking) => (
                    <Link
                      key={booking.bookingId}
                      href={`/admin/bookings?id=${booking.bookingId}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-cyan-50/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800 truncate">{booking.customerName}</p>
                          <TierBadge tier={booking.tier} />
                        </div>
                        <p className="text-[11px] text-slate-400 font-semibold truncate">{booking.serviceName}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            background: (STATUS_COLOUR[booking.status] ?? "#6b7280") + "20",
                            color: STATUS_COLOUR[booking.status] ?? "#6b7280",
                          }}>
                          {booking.status.replace("_", " ")}
                        </span>
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── Section 7: Voucher Usage & Point Redemption ──────────────── */}
      <section>
        <SectionTitle>{t("Lịch sử Voucher & Điểm thưởng", "Voucher & Points Activity")}</SectionTitle>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                {redeemView === "voucher" ? (
                  <><Ticket className="h-4 w-4 text-emerald-500" />{t("Thống kê Voucher đã dùng", "Voucher Usage Stats")}</>
                ) : (
                  <><History className="h-4 w-4 text-violet-500" />{t("Lịch sử đổi điểm lấy Voucher", "Point Redemption History")}</>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Switch toggle */}
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    onClick={() => setRedeemView("voucher")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all",
                      redeemView === "voucher"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <Ticket className="h-3 w-3" />
                    {t("Voucher", "Voucher")}
                  </button>
                  <button
                    onClick={() => setRedeemView("history")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all",
                      redeemView === "history"
                        ? "bg-white text-violet-700 shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <History className="h-3 w-3" />
                    {t("Lịch sử điểm", "Point History")}
                  </button>
                </div>
                <Link
                  href="/admin/offers?tab=vouchers"
                  className="flex items-center gap-0.5 text-[11px] font-bold text-cyan-600 hover:text-cyan-700"
                >
                  {t("Xem chi tiết", "View all")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {redeemView === "voucher" ? (
              /* ── Voucher usage view ── */
              <div>
                {/* Summary stats row */}
                {data?.voucherStats && (
                  <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
                    {[
                      { label: t("Tổng phát hành", "Total Issued"), value: data.voucherStats.issued, color: "text-blue-700", bg: "bg-blue-50/50" },
                      { label: t("Đã sử dụng", "Redeemed"), value: data.voucherStats.redeemed, color: "text-emerald-700", bg: "bg-emerald-50/50" },
                      { label: t("Hết hạn", "Expired"), value: data.voucherStats.expired, color: "text-amber-700", bg: "bg-amber-50/50" },
                      { label: t("Thu hồi", "Revoked"), value: data.voucherStats.revoked, color: "text-rose-700", bg: "bg-rose-50/50" },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} className={cn("flex flex-col items-center py-4 px-3 gap-1", bg)}>
                        <span className={cn("text-2xl font-black", color)}>{value}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">{label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Redemption rate bar */}
                {data?.voucherStats && data.voucherStats.issued > 0 && (
                  <div className="px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-600">{t("Tỉ lệ sử dụng voucher", "Voucher Redemption Rate")}</span>
                      <span className="text-xs font-black text-emerald-700">
                        {((data.voucherStats.redeemed / data.voucherStats.issued) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                        style={{ width: `${Math.min((data.voucherStats.redeemed / data.voucherStats.issued) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400 font-semibold">
                      {data.voucherStats.redeemed} / {data.voucherStats.issued} {t("voucher đã được dùng", "vouchers used")}
                    </p>
                  </div>
                )}
                {/* Recent redemptions preview */}
                <div className="px-5 py-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                    {t("Đổi điểm lấy voucher gần đây", "Recent point redemptions")}
                  </p>
                  {redemptionsQuery.isLoading ? (
                    <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
                  ) : redemptionsQuery.data?.items?.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-400">{t("Chưa có lịch sử đổi voucher", "No redemption history yet")}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {redemptionsQuery.data?.items?.slice(0, 5).map((item) => (
                        <div key={item.transactionId} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                          <Ticket className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-800 truncate">{item.customerName}</span>
                            <span className="text-[11px] text-slate-400 ml-2">{item.customerPhone}</span>
                          </div>
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-700">
                            {item.voucherCode}
                          </span>
                          <span className="text-[11px] font-black text-rose-600">−{item.pointsRedeemed} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── Point redemption history view ── */
              <div>
                {redemptionsQuery.isLoading ? (
                  <div className="p-5 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : redemptionsQuery.data?.items?.length === 0 ? (
                  <div className="py-12 text-center">
                    <Coins className="mx-auto h-10 w-10 text-slate-200 mb-3" />
                    <p className="text-sm text-slate-400 font-semibold">{t("Chưa có lịch sử đổi điểm", "No point redemption history")}</p>
                  </div>
                ) : (
                  <>
                    {/* Table header */}
                    <div className="grid grid-cols-5 gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5">
                      {[
                        t("Khách hàng", "Customer"),
                        t("Voucher đổi", "Voucher"),
                        t("Điểm trừ", "Points Used"),
                        t("Số dư còn lại", "Balance After"),
                        t("Thời gian", "Time"),
                      ].map((h) => (
                        <span key={h} className="text-[10px] font-black uppercase tracking-wider text-slate-400">{h}</span>
                      ))}
                    </div>
                    <div className="divide-y divide-slate-50">
                      {redemptionsQuery.data?.items?.map((item) => (
                        <div
                          key={item.transactionId}
                          className="grid grid-cols-5 gap-2 items-center px-5 py-3 hover:bg-slate-50/50 transition-colors"
                        >
                          {/* Customer */}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{item.customerName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{item.customerPhone}</p>
                          </div>
                          {/* Voucher code */}
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 border border-violet-100 px-2 py-0.5 text-[11px] font-black text-violet-700">
                              <Ticket className="h-2.5 w-2.5" />
                              {item.voucherCode}
                            </span>
                          </div>
                          {/* Points used */}
                          <div>
                            <span className="flex items-center gap-1 text-xs font-black text-rose-600">
                              <ArrowRightLeft className="h-3 w-3" />
                              −{item.pointsRedeemed.toLocaleString(language === "vi" ? "vi-VN" : "en-US")}
                            </span>
                          </div>
                          {/* Balance after */}
                          <div>
                            <span className="flex items-center gap-1 text-xs font-black text-emerald-700">
                              <Coins className="h-3 w-3" />
                              {item.balanceAfter.toLocaleString(language === "vi" ? "vi-VN" : "en-US")}
                            </span>
                          </div>
                          {/* Time */}
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {new Date(item.redeemedAt).toLocaleString(language === "vi" ? "vi-VN" : "en-US", {
                                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Footer link */}
                    <div className="border-t border-slate-100 px-5 py-3 flex justify-end">
                      <Link
                        href="/admin/offers?tab=vouchers"
                        className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 hover:text-cyan-700"
                      >
                        {t("Xem toàn bộ lịch sử đổi điểm", "View full redemption history")}
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─── Section 8: Staff Performance KPI ───────────────────────── */}
      <section>
        <SectionTitle>{t("Hiệu suất nhân viên", "Staff Performance")}</SectionTitle>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-600" />
                {t("KPI từng nhân viên", "Staff KPI Breakdown")}
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Range filter */}
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                  {(["TODAY", "WEEK", "MONTH"] as StaffKpiRange[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setStaffKpiRange(r)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all",
                        staffKpiRange === r
                          ? "bg-white text-cyan-700 shadow-sm"
                          : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {r === "TODAY" ? t("Hôm nay", "Today")
                        : r === "WEEK" ? t("Tuần này", "This Week")
                        : t("Tháng này", "This Month")}
                    </button>
                  ))}
                </div>
                <Link href="/admin/accounts?role=STAFF"
                  className="flex items-center gap-0.5 text-[11px] font-bold text-cyan-600 hover:text-cyan-700">
                  {t("Xem nhân viên", "View staff")} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {staffKpiQuery.isLoading ? (
              <div className="p-5 space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : staffKpiQuery.isError ? (
              <div className="flex items-center gap-2 px-5 py-4 text-sm text-rose-600">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {t("Không thể tải dữ liệu KPI nhân viên.", "Failed to load staff KPI.")}
              </div>
            ) : !staffKpiQuery.data || staffKpiQuery.data.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400 font-semibold">
                {t("Chưa có nhân viên nào.", "No staff found.")}
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr] gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5">
                  {[
                    t("Nhân viên", "Staff"),
                    t("Hoàn thành", "Completed"),
                    t("Doanh thu", "Revenue"),
                    t("Đang làm", "Active"),
                    t("KPI tiến độ", "KPI Progress"),
                    t("Trạng thái", "Status"),
                  ].map((h) => (
                    <span key={h} className="text-[10px] font-black uppercase tracking-wider text-slate-400">{h}</span>
                  ))}
                </div>

                <div className="divide-y divide-slate-50">
                  {staffKpiQuery.data.map((staff, idx) => {
                    const isTopThree = idx < 3;
                    const MEDALS = ["🥇", "🥈", "🥉"];
                    const isOverloaded = staff.activeSessions >= 2;
                    return (
                      <Link
                        key={staff.staffId}
                        href={`/admin/accounts/${staff.staffId}`}
                        className="group grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr] gap-2 items-center px-5 py-4 hover:bg-cyan-50/30 transition-colors"
                      >
                        {/* Staff name */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-black",
                            staff.isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          )}>
                            {isTopThree && staff.completedBookings > 0
                              ? MEDALS[idx]
                              : staff.staffName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate group-hover:text-cyan-700 transition-colors">
                              {staff.staffName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold">
                              {staff.totalAssignedBookings} {t("booking tổng", "total assigned")}
                            </p>
                          </div>
                        </div>

                        {/* Completed bookings */}
                        <div className="flex sm:block items-center gap-2">
                          <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase">{t("Hoàn thành:", "Done:")}</span>
                          <span className="text-lg font-black text-slate-900">{staff.completedBookings}</span>
                          <span className="text-xs text-slate-400 font-semibold sm:block ml-1 sm:ml-0">
                            {t("lượt", "sessions")}
                          </span>
                        </div>

                        {/* Revenue */}
                        <div className="flex sm:block items-center gap-2">
                          <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase">{t("Doanh thu:", "Revenue:")}</span>
                          <span className="text-sm font-black text-emerald-700">{formatVND(staff.completedRevenue)}</span>
                        </div>

                        {/* Active sessions */}
                        <div className="flex sm:block items-center gap-2">
                          <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase">{t("Đang làm:", "Active:")}</span>
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black",
                            isOverloaded
                              ? "bg-rose-100 text-rose-700"
                              : staff.activeSessions > 0
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-500"
                          )}>
                            {isOverloaded && <AlertTriangle className="h-3 w-3" />}
                            {staff.activeSessions} {t("ca", "active")}
                          </span>
                        </div>

                        {/* KPI Progress */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500">
                              {formatVND(staff.completedRevenue)} / {formatVND(staff.kpiTargetRevenue)}
                            </span>
                            <span className={cn(
                              "text-[11px] font-black",
                              staff.kpiProgressPercent >= 100 ? "text-emerald-600"
                                : staff.kpiProgressPercent >= 60 ? "text-amber-600"
                                : "text-slate-400"
                            )}>
                              {staff.kpiProgressPercent}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                staff.kpiProgressPercent >= 100 ? "bg-emerald-500"
                                  : staff.kpiProgressPercent >= 60 ? "bg-amber-400"
                                  : "bg-slate-300"
                              )}
                              style={{ width: `${Math.min(staff.kpiProgressPercent, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Online/Offline status */}
                        <div>
                          {staff.isOnline ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {t("Đang làm", "On duty")}
                            </span>
                          ) : staff.status === "ACTIVE" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                              {t("Rảnh", "Available")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-500">
                              {t("Không hoạt động", "Inactive")}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Footer summary */}
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    {staffKpiQuery.data.filter(s => s.isOnline).length} {t("đang làm việc", "on duty")}
                  </span>
                  <span className="font-semibold">
                    {t("Tổng hoàn thành:", "Total completed:")} <span className="font-black text-slate-800">
                      {staffKpiQuery.data.reduce((sum, s) => sum + s.completedBookings, 0)}
                    </span>
                  </span>
                  <span className="font-semibold">
                    {t("Tổng doanh thu:", "Total revenue:")} <span className="font-black text-emerald-700">
                      {formatVND(staffKpiQuery.data.reduce((sum, s) => sum + s.completedRevenue, 0))}
                    </span>
                  </span>
                  {staffKpiQuery.data.some(s => s.activeSessions >= 2) && (
                    <span className="flex items-center gap-1 font-bold text-rose-500">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t("Có nhân viên đang quá tải", "Staff overload detected")}
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─── Quick Actions ────────────────────────────────────────────── */}
      <section>
        <SectionTitle>{t("Thao tác nhanh", "Quick Actions")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[
            { href: "/admin/bookings", label: t("Đặt lịch", "Bookings"), icon: CalendarDays, color: "text-cyan-700 bg-cyan-50 border-cyan-200" },
            { href: "/admin/customers", label: t("Khách hàng", "Customers"), icon: Users, color: "text-slate-700 bg-slate-50 border-slate-200" },
            { href: "/admin/services", label: t("Dịch vụ", "Services"), icon: Zap, color: "text-violet-700 bg-violet-50 border-violet-200" },
            { href: "/admin/offers?tab=promotions", label: t("Khuyến mãi", "Promotions"), icon: BadgePercent, color: "text-amber-700 bg-amber-50 border-amber-200" },
            { href: "/admin/offers?tab=vouchers", label: t("Vouchers", "Vouchers"), icon: Ticket, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
            { href: "/admin/reviews", label: t("Đánh giá", "Reviews"), icon: Star, color: "text-rose-700 bg-rose-50 border-rose-200" },
            { href: "/admin/reports", label: t("Báo cáo", "Reports"), icon: BarChart3, color: "text-blue-700 bg-blue-50 border-blue-200" },
            { href: "/admin/settings", label: t("Cài đặt", "Settings"), icon: Settings2, color: "text-slate-600 bg-slate-100 border-slate-200" },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href}
              className={cn("group flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md", color)}>
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-bold text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </WorkspacePage>
  );
}
