"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  Droplets,
  Loader2,
  TrendingUp,
  Users,
  Package,
  Ticket,
  BadgePercent,
  DollarSign,
} from "lucide-react";
import type { ComponentType } from "react";
import { Card } from "@/shared/ui/ui/card";
import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { getOperationsQueue } from "@/features/operations/lib/operations-service";
import { useAdminDashboardMetrics } from "@/features/dashboard/hooks/use-admin-dashboard-metrics";
import { cn } from "@/shared/lib/utils";
import { useLanguageStore, translate } from "@/shared/store/language.store";

const QUICK_LINKS = [
  { href: "/admin/operations", labelVi: "Vận hành", labelEn: "Operations", icon: Droplets, color: "text-cyan-800 bg-cyan-50" },
  { href: "/admin/bookings", labelVi: "Đặt lịch", labelEn: "Bookings", icon: CalendarDays, color: "text-cyan-950 bg-cyan-100" },
  { href: "/admin/accounts", labelVi: "Tài khoản", labelEn: "Accounts", icon: Users, color: "text-slate-800 bg-slate-100" },
  { href: "/admin/services", labelVi: "Dịch vụ", labelEn: "Services", icon: Package, color: "text-rose-800 bg-rose-50" },
  { href: "/admin/offers?tab=promotions", labelVi: "Khuyến mãi", labelEn: "Promotions", icon: BadgePercent, color: "text-amber-800 bg-amber-50" },
  { href: "/admin/offers?tab=vouchers", labelVi: "Vouchers", labelEn: "Vouchers", icon: Ticket, color: "text-slate-900 bg-cyan-50" },
  { href: "/admin/reports", labelVi: "Báo cáo", labelEn: "Reports", icon: BarChart3, color: "text-cyan-900 bg-cyan-50" },
];

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`;
  }
  return amount.toLocaleString("vi-VN");
}

export function AdminDashboardView() {
  const { language } = useLanguageStore();
  const queueQuery = useQuery({
    queryKey: ["admin-dashboard", "queue"],
    queryFn: getOperationsQueue,
    refetchInterval: 30_000,
  });
  const metricsQuery = useAdminDashboardMetrics();

  const summary = queueQuery.data?.summary ?? {
    total: 0,
    pending: 0,
    checkedIn: 0,
    inProgress: 0,
    completed: 0,
  };

  const metrics = metricsQuery.data;

  const kpiCards = [
    {
      label: translate(language, "Tổng số đặt lịch", "Total bookings"),
      value: `${metrics?.totalBookings ?? 0}`,
      delta: translate(language, "Tất cả yêu cầu đặt lịch", "All booking requests"),
      icon: CalendarDays,
      tone: "text-cyan-800 bg-cyan-50",
    },
    {
      label: translate(language, "Doanh thu (VNĐ)", "Revenue (VND)"),
      value: `${formatRevenue(metrics?.totalRevenue ?? 0)}`,
      delta: translate(language, "Các lịch đã thanh toán", "Paid bookings"),
      icon: DollarSign,
      tone: "text-cyan-950 bg-cyan-100",
    },
    {
      label: translate(language, "Khách hàng", "Customers"),
      value: `${metrics?.totalCustomers ?? 0}`,
      delta: translate(language, "Tổng số tài khoản khách", "Total customer accounts"),
      icon: Users,
      tone: "text-slate-800 bg-slate-100",
    },
    {
      label: translate(language, "Khuyến mãi đang chạy", "Active promotions"),
      value: `${metrics?.activePromotions ?? 0}`,
      delta: translate(language, "Các chiến dịch đang diễn ra", "Currently running campaigns"),
      icon: BadgePercent,
      tone: "text-amber-800 bg-amber-50",
    },
  ];

  const liveCards = [
    {
      label: translate(language, "Hàng đợi hiện tại", "Current queue"),
      value: `${summary.pending + summary.checkedIn + summary.inProgress}`,
      delta: translate(language, "Phiên rửa xe đang diễn ra", "Live sessions in progress"),
      icon: Droplets,
      tone: "text-cyan-800 bg-cyan-50",
    },
    {
      label: translate(language, "Hoàn thành hôm nay", "Completed today"),
      value: `${summary.completed}`,
      delta: translate(language, "Các phiên đã rửa", "Live wash sessions"),
      icon: TrendingUp,
      tone: "text-cyan-950 bg-cyan-100",
    },
  ];

  return (
    <WorkspacePage className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {translate(language, "Chỉ số tổng quan", "Overview metrics")}
          </h2>
          {metricsQuery.isError && (
            <span className="flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="h-3.5 w-3.5" />
              {translate(language, "Không thể tải dữ liệu", "Failed to load metrics")}
            </span>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} isLoading={metricsQuery.isLoading} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {translate(language, "Hoạt động trực tiếp", "Live operations")}
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {liveCards.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} isLoading={queueQuery.isLoading} />
          ))}
        </div>
      </section>

      <section>
        <Card className="border-border/70 bg-card/95 p-8 shadow-sm">
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-bold">{translate(language, "Thao tác nhanh", "Quick actions")}</h2>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/50 bg-card p-5 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-border hover:shadow-md"
                >
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", link.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[13px] font-semibold text-muted-foreground group-hover:text-foreground">{translate(language, link.labelVi, link.labelEn)}</span>
                </Link>
              );
            })}
          </div>
        </Card>
      </section>
    </WorkspacePage>
  );
}

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  tone,
  isLoading,
}: {
  label: string;
  value: string;
  delta: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="border-border/70 bg-card/95 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          {isLoading ? (
            <div className="mt-2 flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
          )}
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{delta}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
