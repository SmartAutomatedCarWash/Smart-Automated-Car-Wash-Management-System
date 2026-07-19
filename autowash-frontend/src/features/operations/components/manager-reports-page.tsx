"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  LineChart,
  RefreshCcw,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { DatePickerButton, getTodayInputValue } from "@/shared/ui/date-picker-button";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { getOperationsQueue } from "@/features/operations/lib/operations-service";
import { translate, useLanguageStore, type Language } from "@/shared/store/language.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueueSession, WashSessionStatus } from "@/entities/operations";

type PeriodMode = "day" | "month" | "year" | "all";
type ReportTab = "overview" | "staff" | "services";

type TrendRow = { key: string; label: string; revenue: number; bookings: number; completed: number };
type ServiceRow = { service: string; bookings: number; completed: number; revenue: number; completionRate: number };
type StaffRow = { staffId: string; staffName: string; total: number; active: number; completed: number; revenue: number; points: number; progress: number };
type FunnelRow = { key: string; label: string; count: number; helper: string; color: string };

const ACTIVE_STATUSES: WashSessionStatus[] = ["QUEUED", "CHECKED_IN", "IN_PROGRESS"];

export function ManagerReportsPage() {
  const getErrorMessage = useErrorMessage();
  const { language } = useLanguageStore();
  const locale = language === "vi" ? "vi-VN" : "en-US";
  const t = (vi: string, en: string) => translate(language, vi, en);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
  const [selectedMonth, setSelectedMonth] = useState(getTodayInputValue().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(getTodayInputValue().slice(0, 4));
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [staffTarget, setStaffTarget] = useState(2);

  const query = useQuery({
    queryKey: ["manager-reports", "queue"],
    queryFn: getOperationsQueue,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const sessions = useMemo(() => query.data?.columns.flatMap((column) => column.sessions) ?? [], [query.data]);
  const period = { day: selectedDate, month: selectedMonth, year: selectedYear };
  const filteredSessions = useMemo(() => sessions.filter((session) => matchesPeriod(session.bookingDate, periodMode, period)), [periodMode, selectedDate, selectedMonth, selectedYear, sessions]);
  const completedSessions = filteredSessions.filter((session) => session.status === "COMPLETED");
  const trendRows = useMemo(() => buildTrendRows(filteredSessions, periodMode, period), [filteredSessions, periodMode, selectedDate, selectedMonth, selectedYear]);
  const serviceRows = useMemo(() => buildServiceRows(filteredSessions, language), [filteredSessions, language]);
  const staffRows = useMemo(() => buildStaffRows(filteredSessions, staffTarget, language), [filteredSessions, staffTarget, language]);
  const funnelRows = useMemo(() => buildFunnelRows(filteredSessions, language), [filteredSessions, language]);

  const revenue = sumRevenue(completedSessions);
  const totalBookings = filteredSessions.length;
  const completedBookings = completedSessions.length;
  const activeBookings = filteredSessions.filter((session) => ACTIVE_STATUSES.includes(session.status)).length;
  const cancelledBookings = filteredSessions.filter((session) => session.status === "CANCELLED").length;
  const completionRate = totalBookings ? Math.round((completedBookings / totalBookings) * 100) : 0;
  const averageTicket = completedBookings ? Math.round(revenue / completedBookings) : 0;
  const bestStaff = staffRows[0];
  const atRiskStaff = [...staffRows].sort((left, right) => left.progress - right.progress || left.completed - right.completed)[0];
  const bestService = serviceRows[0];

  return (
    <WorkspacePage className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">{t("Báo cáo Manager", "Manager reports")}</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">{t("Báo cáo vận hành", "Operational reports")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("Theo dõi doanh thu, tiến độ booking, hiệu suất staff và dịch vụ từ dữ liệu vận hành hiện có.", "Track revenue, booking progress, staff performance, and service performance from live operations data.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-9 rounded-xl border-cyan-100 bg-white text-xs shadow-sm" disabled>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="h-9 rounded-xl border-cyan-100 bg-white text-xs shadow-sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCcw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            {t("Làm mới", "Refresh")}
          </Button>
        </div>
      </section>

      <Card className="relative z-40 rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t("Khoảng thời gian", "Period")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {getPeriodOptions(language).map((periodItem) => (
                <button
                  key={periodItem.value}
                  type="button"
                  onClick={() => setPeriodMode(periodItem.value)}
                  className={`h-9 rounded-xl px-3 text-xs font-black transition ${
                    periodMode === periodItem.value ? "bg-[#00236f] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50"
                  }`}
                >
                  {periodItem.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t("Mốc báo cáo", "Report range")}</p>
            <div className="mt-2">
              {periodMode === "day" ? <DatePickerButton value={selectedDate} onChange={setSelectedDate} label={t("Chọn ngày báo cáo", "Select report date")} buttonClassName="w-full justify-start" /> : null}
              {periodMode === "month" ? <ReportSelect value={selectedMonth} onChange={setSelectedMonth} options={buildMonthOptions(sessions, selectedMonth, language)} /> : null}
              {periodMode === "year" ? <ReportSelect value={selectedYear} onChange={setSelectedYear} options={buildYearOptions(sessions, selectedYear, language)} /> : null}
              {periodMode === "all" ? <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-500">{t("Toàn bộ dữ liệu hiện có", "All available data")}</div> : null}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">View</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {getReportTabs(language).map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={`h-9 rounded-xl px-3 text-xs font-black transition ${
                    activeTab === tab.value ? "bg-cyan-500 text-slate-950 shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {query.isError ? (
        <WorkspaceEmptyState title={t("Không thể tải báo cáo", "Unable to load reports")} description={getErrorMessage(query.error as unknown as ApiErrorResponse)} />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={TrendingUp} label={t("Doanh thu", "Revenue")} value={formatCurrency(revenue, locale)} detail={periodDescription(periodMode, selectedDate, selectedMonth, selectedYear, language)} tone="green" />
            <MetricCard icon={ClipboardList} label={t("Tổng booking", "Total bookings")} value={`${totalBookings}`} detail={`${activeBookings} active, ${cancelledBookings} canceled`} tone="blue" />
            <MetricCard icon={CheckCircle2} label={t("Hoàn thành", "Completion")} value={`${completionRate}%`} detail={`${completedBookings}/${totalBookings || 0} booking`} tone="cyan" />
            <MetricCard icon={Target} label={t("Ticket TB", "Avg ticket")} value={formatCurrency(averageTicket, locale)} detail={t("Doanh thu / booking hoàn thành", "Revenue / completed booking")} tone="amber" />
          </section>

          {activeTab === "overview" ? (
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_24rem]">
              <ChartCard title="Revenue trend" subtitle={t("Doanh thu và số booking theo kỳ", "Revenue and bookings by period")} icon={LineChart}>
                <RevenueTrendChart rows={trendRows} language={language} />
              </ChartCard>
              <FunnelCard rows={funnelRows} total={totalBookings} language={language} />
              <ChartCard title="Service performance" subtitle={t("Doanh thu theo dịch vụ", "Revenue by service")} icon={BarChart3}>
                <ServiceBarChart rows={serviceRows} metric="revenue" language={language} />
              </ChartCard>
              <InsightsCard bestStaff={bestStaff} atRiskStaff={atRiskStaff} bestService={bestService} completionRate={completionRate} staffTarget={staffTarget} language={language} />
            </section>
          ) : null}

          {activeTab === "staff" ? (
            <section className="space-y-4">
              <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">Staff KPI</h2>
                    <p className="text-sm text-slate-500">{t("Theo dõi session, doanh thu và mức đạt KPI của từng staff.", "Track sessions, revenue, and KPI progress for each staff member.")}</p>
                  </div>
                  <div className="w-full sm:w-48">
                    <ReportSelect value={String(staffTarget)} onChange={(value) => setStaffTarget(Number(value))} options={[2, 4, 6, 8, 10, 12].map((value) => [String(value), `Target ${value} booking`] as const)} />
                  </div>
                </div>
              </Card>
              <div className="grid gap-3 xl:grid-cols-2">
                {staffRows.map((staff) => (
                  <StaffKpiCard key={staff.staffId} staff={staff} target={staffTarget} language={language} />
                ))}
                {staffRows.length === 0 ? <EmptyCard message={t("Chưa có dữ liệu staff trong kỳ này.", "No staff data for this period.")} /> : null}
              </div>
            </section>
          ) : null}

          {activeTab === "services" ? (
            <section className="grid gap-4 xl:grid-cols-2">
              <ChartCard title={t("Doanh thu theo dịch vụ", "Revenue by service")} subtitle={t("Dịch vụ nào tạo doanh thu tốt nhất", "Which services generate the most revenue")} icon={BarChart3}>
                <ServiceBarChart rows={serviceRows} metric="revenue" language={language} />
              </ChartCard>
              <ChartCard title={t("Booking theo dịch vụ", "Bookings by service")} subtitle={t("Số booking theo từng gói rửa", "Booking count by wash package")} icon={ClipboardList}>
                <ServiceBarChart rows={serviceRows} metric="bookings" language={language} />
              </ChartCard>
              <div className="xl:col-span-2">
                <ServiceTable rows={serviceRows} language={language} />
              </div>
            </section>
          ) : null}
        </>
      )}
    </WorkspacePage>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone }: { icon: ComponentType<{ className?: string }>; label: string; value: string; detail: string; tone: "green" | "blue" | "cyan" | "amber" }) {
  const toneClass = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    cyan: "bg-cyan-50 text-cyan-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</p>
          <p className="truncate text-xl font-black text-slate-950">{value}</p>
          <p className="truncate text-xs text-slate-500">{detail}</p>
        </div>
      </div>
    </Card>
  );
}

function ChartCard({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-black text-slate-950">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function RevenueTrendChart({ rows, language }: { rows: TrendRow[]; language: Language }) {
  const hasData = rows.some((row) => row.bookings > 0 || row.revenue > 0);

  return (
    <div>
      {!hasData ? <EmptyLine message={translate(language, "Chưa có dữ liệu doanh thu trong kỳ này.", "No revenue data for this period.")} /> : null}
      <div className="h-[300px] rounded-2xl bg-slate-50 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="managerReportRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} minTickGap={8} />
            <YAxis yAxisId="revenue" tickFormatter={(value) => compactCurrency(Number(value))} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
            <YAxis yAxisId="bookings" orientation="right" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
            <Tooltip content={<RevenueTooltip language={language} />} />
            <Area yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fill="url(#managerReportRevenue)" dot={{ r: 3 }} />
            <Area yAxisId="bookings" type="monotone" dataKey="bookings" stroke="#06b6d4" strokeWidth={2.5} fill="transparent" dot={{ r: 2.5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex gap-4 text-[11px] font-bold text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-5 rounded-full bg-emerald-500" /> {translate(language, "Doanh thu", "Revenue")}</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-5 rounded-full bg-cyan-500" /> Booking</span>
      </div>
    </div>
  );
}

function FunnelCard({ rows, total, language }: { rows: FunnelRow[]; total: number; language: Language }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-black text-slate-950">Booking funnel</h2>
          <p className="text-xs text-slate-500">{translate(language, "Từ tiếp nhận tới hoàn thành", "From intake to completion")}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">{row.label}</p>
                <p className="text-[11px] font-semibold text-slate-500">{row.helper}</p>
              </div>
              <span className="text-lg font-black text-slate-950">{row.count}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white">
              <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${Math.max(row.count ? 8 : 0, (row.count / Math.max(total, 1)) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function InsightsCard({ bestStaff, atRiskStaff, bestService, completionRate, staffTarget, language }: { bestStaff?: StaffRow; atRiskStaff?: StaffRow; bestService?: ServiceRow; completionRate: number; staffTarget: number; language: Language }) {
  const noData = translate(language, "Chưa có dữ liệu", "No data yet");

  return (
    <Card className="rounded-2xl border-cyan-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-black text-slate-950">Manager insights</h2>
          <p className="text-xs text-slate-500">{translate(language, "Các điểm cần nhìn nhanh trong kỳ.", "Quick points to watch this period.")}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <InsightRow icon={Users} label={translate(language, "Staff tốt nhất", "Best staff")} value={bestStaff ? `${bestStaff.staffName}: ${bestStaff.completed}/${staffTarget} completed` : noData} />
        <InsightRow icon={TrendingDown} label={translate(language, "Cần hỗ trợ", "Needs support")} value={atRiskStaff ? `${atRiskStaff.staffName}: KPI ${atRiskStaff.progress}%` : noData} />
        <InsightRow icon={BarChart3} label={translate(language, "Dịch vụ mạnh", "Top service")} value={bestService ? `${bestService.service}: ${formatCurrency(bestService.revenue, language === "vi" ? "vi-VN" : "en-US")}` : noData} />
        <InsightRow
          icon={Target}
          label={translate(language, "Sức khỏe booking", "Booking health")}
          value={
            completionRate >= 70
              ? translate(language, `${completionRate}% hoàn thành, luồng ổn`, `${completionRate}% completed, flow looks healthy`)
              : translate(language, `${completionRate}% hoàn thành, nên kiểm tra các booking chưa xong`, `${completionRate}% completed, review unfinished bookings`)
          }
        />
      </div>
    </Card>
  );
}

function InsightRow({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function StaffKpiCard({ staff, target, language }: { staff: StaffRow; target: number; language: Language }) {
  const locale = language === "vi" ? "vi-VN" : "en-US";
  const isAtTarget = staff.completed >= target;

  return (
    <Card className={`rounded-2xl p-4 shadow-sm ${isAtTarget ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/35"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-slate-950">{staff.staffName}</p>
          <p className="text-xs font-semibold text-slate-500">
            {staff.total} total · {staff.active} active · {formatCurrency(staff.revenue, locale)}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${isAtTarget ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
          {staff.completed}/{target}
        </span>
      </div>
      <div className="mt-4 h-2.5 rounded-full bg-white">
        <div className={`h-2.5 rounded-full ${isAtTarget ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${staff.progress}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MiniInfo label="Done" value={String(staff.completed)} />
        <MiniInfo label="Points" value={String(staff.points)} />
        <MiniInfo label="KPI" value={`${staff.progress}%`} />
      </div>
    </Card>
  );
}

function ServiceBarChart({ rows, metric, language }: { rows: ServiceRow[]; metric: "revenue" | "bookings"; language: Language }) {
  const hasData = rows.some((row) => row[metric] > 0);

  return (
    <div>
      {!hasData ? <EmptyLine message={translate(language, "Chưa có dữ liệu dịch vụ trong kỳ này.", "No service data for this period.")} /> : null}
      <div className="h-[300px] rounded-2xl bg-slate-50 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 18, left: 12, bottom: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={(value) => (metric === "revenue" ? compactCurrency(Number(value)) : String(value))} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="service" width={110} tick={{ fill: "#334155", fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => (metric === "revenue" ? formatCurrency(Number(value), language === "vi" ? "vi-VN" : "en-US") : `${value} booking`)} />
            <Bar dataKey={metric} radius={[0, 10, 10, 0]} fill={metric === "revenue" ? "#00236f" : "#06b6d4"} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ServiceTable({ rows, language }: { rows: ServiceRow[]; language: Language }) {
  const locale = language === "vi" ? "vi-VN" : "en-US";

  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-black text-slate-950">Service detail</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-wide text-slate-500">
              <th className="py-3">{translate(language, "Dịch vụ", "Service")}</th>
              <th className="py-3">Booking</th>
              <th className="py-3">{translate(language, "Hoàn thành", "Completed")}</th>
              <th className="py-3">Completion</th>
              <th className="py-3 text-right">{translate(language, "Doanh thu", "Revenue")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.service}>
                <td className="py-3 font-black text-slate-950">{row.service}</td>
                <td className="py-3 font-bold text-slate-700">{row.bookings}</td>
                <td className="py-3 font-bold text-slate-700">{row.completed}</td>
                <td className="py-3 font-bold text-cyan-700">{row.completionRate}%</td>
                <td className="py-3 text-right font-black text-slate-950">{formatCurrency(row.revenue, locale)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center font-semibold text-slate-400">{translate(language, "Chưa có dữ liệu dịch vụ.", "No service data yet.")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 px-2 py-2">
      <p className="text-sm font-black text-slate-950">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return <Card className="rounded-2xl border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400">{message}</Card>;
}

function EmptyLine({ message }: { message: string }) {
  return <p className="mb-3 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-sm font-semibold text-slate-400">{message}</p>;
}

function ReportSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: ReadonlyArray<readonly [string, string]> }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-[#00236f] shadow-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  );
}

function RevenueTooltip({ active, payload, label, language }: { active?: boolean; payload?: Array<{ dataKey?: string; value?: number }>; label?: string; language: Language }) {
  if (!active || !payload?.length) return null;
  const locale = language === "vi" ? "vi-VN" : "en-US";
  const revenue = payload.find((item) => item.dataKey === "revenue")?.value ?? 0;
  const bookings = payload.find((item) => item.dataKey === "bookings")?.value ?? 0;
  const completed = payload.find((item) => item.dataKey === "completed")?.value ?? 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-[0_16px_38px_rgba(15,23,42,0.16)]">
      <p className="font-black text-slate-950">{label}</p>
      <p className="mt-1 font-bold text-emerald-700">{translate(language, "Doanh thu", "Revenue")}: {formatCurrency(revenue, locale)}</p>
      <p className="font-bold text-cyan-700">Booking: {bookings}</p>
      <p className="font-bold text-slate-600">Completed: {completed}</p>
    </div>
  );
}

function buildTrendRows(sessions: OperationsQueueSession[], mode: PeriodMode, period: { day: string; month: string; year: string }): TrendRow[] {
  const keys = getTrendKeys(mode, period, sessions);
  const rows = keys.map(({ key, label }) => {
    const bucketSessions = sessions.filter((session) => getTrendKey(session, mode) === key);
    const completed = bucketSessions.filter((session) => session.status === "COMPLETED");
    return { key, label, revenue: sumRevenue(completed), bookings: bucketSessions.length, completed: completed.length };
  });

  return mode === "all" ? rows.filter((row) => row.bookings > 0 || row.revenue > 0) : rows;
}

function buildServiceRows(sessions: OperationsQueueSession[], language: Language): ServiceRow[] {
  const names = Array.from(new Set(sessions.map((session) => getServiceName(session, language))));
  return names
    .map((service) => {
      const serviceSessions = sessions.filter((session) => getServiceName(session, language) === service);
      const completed = serviceSessions.filter((session) => session.status === "COMPLETED");
      return {
        service,
        bookings: serviceSessions.length,
        completed: completed.length,
        revenue: sumRevenue(completed),
        completionRate: serviceSessions.length ? Math.round((completed.length / serviceSessions.length) * 100) : 0,
      };
    })
    .sort((left, right) => right.revenue - left.revenue || right.bookings - left.bookings || left.service.localeCompare(right.service));
}

function buildStaffRows(sessions: OperationsQueueSession[], target: number, language: Language): StaffRow[] {
  const staffIds = Array.from(new Set(sessions.map((session) => session.assignedStaffId ?? "unassigned")));
  return staffIds
    .map((staffId) => {
      const staffSessions = sessions.filter((session) => (session.assignedStaffId ?? "unassigned") === staffId);
      const completed = staffSessions.filter((session) => session.status === "COMPLETED");
      const completedCount = completed.length;
      return {
        staffId,
        staffName: staffSessions.find((session) => session.assignedStaffName)?.assignedStaffName ?? translate(language, "Chưa phân công", "Unassigned"),
        total: staffSessions.length,
        active: staffSessions.filter((session) => ACTIVE_STATUSES.includes(session.status)).length,
        completed: completedCount,
        revenue: sumRevenue(completed),
        points: completed.reduce((sum, session) => sum + (session.awardedLoyaltyPoints ?? 0), 0),
        progress: Math.min(100, Math.round((completedCount / Math.max(target, 1)) * 100)),
      };
    })
    .sort((left, right) => right.progress - left.progress || right.completed - left.completed || right.revenue - left.revenue);
}

function buildFunnelRows(sessions: OperationsQueueSession[], language: Language): FunnelRow[] {
  return [
    { key: "total", label: translate(language, "Tổng session", "Total sessions"), helper: translate(language, "Tất cả xe trong kỳ", "All vehicles in period"), count: sessions.length, color: "bg-blue-500" },
    { key: "checked-in", label: translate(language, "Đã check-in", "Checked in"), helper: translate(language, "Manager đã nhận xe", "Vehicle received by manager"), count: sessions.filter((session) => ["CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(session.status)).length, color: "bg-cyan-500" },
    { key: "washing", label: translate(language, "Vào quy trình rửa", "In wash flow"), helper: translate(language, "Đang rửa hoặc đã hoàn thành", "In progress or completed"), count: sessions.filter((session) => ["IN_PROGRESS", "COMPLETED"].includes(session.status)).length, color: "bg-amber-500" },
    { key: "completed", label: translate(language, "Hoàn thành", "Completed"), helper: translate(language, "Đã ghi nhận doanh thu", "Revenue recorded"), count: sessions.filter((session) => session.status === "COMPLETED").length, color: "bg-emerald-500" },
    { key: "cancelled", label: translate(language, "Đã hủy", "Canceled"), helper: translate(language, "Cần xem nguyên nhân", "Review cancellation reason"), count: sessions.filter((session) => session.status === "CANCELLED").length, color: "bg-rose-500" },
  ];
}

function getPeriodOptions(language: Language): Array<{ value: PeriodMode; label: string }> {
  return [
    { value: "day", label: translate(language, "Theo ngày", "By day") },
    { value: "month", label: translate(language, "Theo tháng", "By month") },
    { value: "year", label: translate(language, "Theo năm", "By year") },
    { value: "all", label: translate(language, "Tất cả", "All") },
  ];
}

function getReportTabs(language: Language): Array<{ value: ReportTab; label: string }> {
  return [
    { value: "overview", label: "Overview" },
    { value: "staff", label: "Staff KPI" },
    { value: "services", label: translate(language, "Dịch vụ", "Services") },
  ];
}

function matchesPeriod(value: string, mode: PeriodMode, period: { day: string; month: string; year: string }) {
  if (mode === "all") return true;
  if (mode === "day") return value.slice(0, 10) === period.day;
  if (mode === "month") return value.slice(0, 7) === period.month;
  return value.slice(0, 4) === period.year;
}

function getTrendKey(session: OperationsQueueSession, mode: PeriodMode) {
  if (mode === "day") return session.bookingTime.slice(0, 2);
  if (mode === "year" || mode === "all") return session.bookingDate.slice(0, 7);
  return session.bookingDate.slice(0, 10);
}

function getTrendKeys(mode: PeriodMode, period: { day: string; month: string; year: string }, sessions: OperationsQueueSession[]) {
  if (mode === "day") {
    return Array.from({ length: 14 }, (_, index) => {
      const hour = String(index + 7).padStart(2, "0");
      return { key: hour, label: `${hour}:00` };
    });
  }

  if (mode === "month") {
    const [year, month] = period.month.split("-").map(Number);
    const days = new Date(year, month, 0).getDate();
    return Array.from({ length: days }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return { key: `${period.month}-${day}`, label: day };
    });
  }

  if (mode === "all") {
    const values = Array.from(new Set(sessions.map((session) => session.bookingDate.slice(0, 7)))).sort();
    return (values.length ? values : [period.month]).map((value) => ({ key: value, label: `${value.slice(5, 7)}/${value.slice(2, 4)}` }));
  }

  return Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0");
    return { key: `${period.year}-${month}`, label: `T${index + 1}` };
  });
}

function buildMonthOptions(sessions: OperationsQueueSession[], selectedMonth: string, language: Language) {
  const values = Array.from(new Set([selectedMonth, ...sessions.map((session) => session.bookingDate.slice(0, 7))])).sort();
  return values.map((value) => [value, translate(language, `Tháng ${value.slice(5, 7)}/${value.slice(0, 4)}`, `Month ${value.slice(5, 7)}/${value.slice(0, 4)}`)] as const);
}

function buildYearOptions(sessions: OperationsQueueSession[], selectedYear: string, language: Language) {
  const values = Array.from(new Set([selectedYear, ...sessions.map((session) => session.bookingDate.slice(0, 4))])).sort();
  return values.map((value) => [value, translate(language, `Năm ${value}`, `Year ${value}`)] as const);
}

function periodDescription(mode: PeriodMode, day: string, month: string, year: string, language: Language) {
  if (mode === "day") return formatDate(day, language);
  if (mode === "month") return translate(language, `Tháng ${month.slice(5, 7)}/${month.slice(0, 4)}`, `Month ${month.slice(5, 7)}/${month.slice(0, 4)}`);
  if (mode === "year") return translate(language, `Năm ${year}`, `Year ${year}`);
  return translate(language, "Toàn bộ dữ liệu", "All data");
}

function getServiceName(session: OperationsQueueSession, language: Language) {
  return session.servicePackage ?? session.packageId ?? translate(language, "Gói rửa xe", "Wash package");
}

function sumRevenue(sessions: OperationsQueueSession[]) {
  return sessions.reduce((sum, session) => sum + (session.feeAmount ?? 0), 0);
}

function formatDate(value: string, language: Language) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function compactCurrency(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${value}`;
}
