"use client";

import { useMemo, useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, ClipboardList, Crown, LineChart, RefreshCcw, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { Progress } from "@/shared/ui/ui/progress";
import { DatePickerButton, getTodayInputValue } from "@/shared/ui/date-picker-button";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { getOperationsQueue } from "@/features/operations/lib/operations-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueueSession } from "@/entities/operations";

type PeriodMode = "day" | "month" | "year" | "all";
type StaffSort = "kpi" | "bookings" | "revenue" | "name";
type ReportOption = "overview" | "staff" | "services";

const REPORT_OPTIONS: Array<{ value: ReportOption; label: string }> = [
  { value: "overview", label: "Tổng quan" },
  { value: "staff", label: "KPI nhân viên" },
  { value: "services", label: "Dịch vụ" },
];

const KPI_TARGETS = [2, 4, 6, 8, 10, 12];

export function ManagerReportsPage() {
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
  const [selectedMonth, setSelectedMonth] = useState("2026-07");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [staffKpiTarget, setStaffKpiTarget] = useState(2);
  const [staffSort, setStaffSort] = useState<StaffSort>("kpi");
  const [activeOption, setActiveOption] = useState<ReportOption>("overview");
  const query = useQuery({ queryKey: ["manager-reports", "queue"], queryFn: getOperationsQueue, refetchInterval: 60_000 });

  const sessions = useMemo(() => query.data?.columns.flatMap((column) => column.sessions) ?? [], [query.data]);
  const filteredSessions = useMemo(
    () => sessions.filter((session) => matchesPeriod(session.bookingDate, periodMode, { day: selectedDate, month: selectedMonth, year: selectedYear })),
    [periodMode, selectedDate, selectedMonth, selectedYear, sessions],
  );
  const completedSessions = filteredSessions.filter((session) => session.status === "COMPLETED");
  const staffRows = useMemo(() => sortStaffRows(buildStaffRows(filteredSessions, staffKpiTarget), staffSort), [filteredSessions, staffKpiTarget, staffSort]);
  const trendRows = useMemo(() => buildTrendRows(filteredSessions, periodMode, { day: selectedDate, month: selectedMonth, year: selectedYear }), [filteredSessions, periodMode, selectedDate, selectedMonth, selectedYear]);
  const serviceRows = useMemo(() => buildServiceRows(filteredSessions), [filteredSessions]);
  const funnelRows = useMemo(() => buildFunnelRows(filteredSessions), [filteredSessions]);
  const achievedStaff = staffRows.filter((row) => row.completedBookings >= staffKpiTarget);
  const missedStaff = staffRows.filter((row) => row.completedBookings < staffKpiTarget);
  const bestStaff = staffRows[0];
  const weakestStaff = [...staffRows].sort((left, right) => left.progress - right.progress || left.completedBookings - right.completedBookings)[0];
  const bestService = serviceRows[0];
  const revenue = sumRevenue(completedSessions);
  const totalBookings = filteredSessions.length;
  const completedBookings = completedSessions.length;
  const conversionRate = totalBookings ? Math.round((completedBookings / totalBookings) * 100) : 0;
  const averageTicket = completedBookings ? Math.round(revenue / completedBookings) : 0;

  return (
    <WorkspacePage className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">Revenue intelligence</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Báo cáo doanh thu & KPI</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi doanh thu, tổng booking, hiệu suất dịch vụ và nhân viên đạt/chưa đạt KPI.</p>
        </div>
        <Button variant="outline" className="h-9 rounded-xl border-cyan-100 bg-white text-xs shadow-sm" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCcw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </section>

      <Card className="relative z-40 overflow-visible rounded-3xl border-cyan-100 bg-white/90 p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Khoảng thời gian</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["day", "month", "year", "all"] as PeriodMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPeriodMode(mode)}
                  className={`h-9 rounded-xl px-3 text-xs font-black transition ${
                    periodMode === mode ? "bg-[#00236f] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50"
                  }`}
                >
                  {periodModeLabel(mode)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Mốc báo cáo</p>
            <div className="mt-2">
              {periodMode === "day" ? <DatePickerButton value={selectedDate} onChange={setSelectedDate} label="Chọn ngày báo cáo" buttonClassName="w-full justify-start" /> : null}
              {periodMode === "month" ? <ReportSelect value={selectedMonth} onChange={setSelectedMonth} options={buildMonthOptions(sessions)} /> : null}
              {periodMode === "year" ? <ReportSelect value={selectedYear} onChange={setSelectedYear} options={buildYearOptions(sessions)} /> : null}
              {periodMode === "all" ? <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-500">Toàn bộ dữ liệu hiện có</div> : null}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Option phân tích</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {REPORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setActiveOption(option.value)}
                  className={`h-9 rounded-xl px-3 text-xs font-black transition ${
                    activeOption === option.value ? "bg-cyan-500 text-slate-950 shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {query.isError ? (
        <WorkspaceEmptyState title="Không thể tải báo cáo" description={getDisplayErrorMessage(query.error as unknown as ApiErrorResponse)} />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={TrendingUp} label="Doanh thu" value={formatCurrency(revenue)} detail={periodDescription(periodMode, selectedDate, selectedMonth, selectedYear)} tone="green" />
            <MetricCard icon={ClipboardList} label="Tổng booking" value={`${totalBookings} booking`} detail={`${completedBookings} hoàn thành`} tone="blue" />
            <MetricCard icon={LineChart} label="Tỷ lệ hoàn thành" value={`${conversionRate}%`} detail="Completed / total booking" tone="amber" />
            <MetricCard icon={Target} label="Ticket trung bình" value={formatCurrency(averageTicket)} detail="Doanh thu / booking hoàn thành" tone="slate" />
          </section>

          {activeOption === "overview" ? (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[1.55fr_0.9fr]">
                <ChartCard title="Revenue trend" subtitle="Doanh thu và booking theo mốc thời gian" icon={BarChart3}>
                  <RevenueTrendChart rows={trendRows} />
                </ChartCard>
                <BookingFunnelCard rows={funnelRows} total={totalBookings} />
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
                <ChartCard title="Service revenue mix" subtitle="Tỷ trọng doanh thu theo dịch vụ" icon={LineChart}>
                  <ServiceMixChart rows={serviceRows} />
                </ChartCard>
                <ActionInsightPanel bestStaff={bestStaff} weakestStaff={weakestStaff} bestService={bestService} target={staffKpiTarget} conversionRate={conversionRate} />
              </div>
            </div>
          ) : null}

          {activeOption === "staff" ? (
            <section className="space-y-4">
              <Card className="rounded-3xl border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">KPI nhân viên</h2>
                    <p className="text-sm text-slate-500">Thể hiện rõ số booking của từng nhân viên, ai đạt và ai chưa đạt KPI.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ReportSelect value={String(staffKpiTarget)} onChange={(value) => setStaffKpiTarget(Number(value))} options={KPI_TARGETS.map((value) => [String(value), `KPI ${value} booking`] as const)} />
                    <ReportSelect
                      value={staffSort}
                      onChange={(value) => setStaffSort(value as StaffSort)}
                      options={[
                        ["kpi", "Sắp xếp theo KPI"],
                        ["bookings", "Theo số booking"],
                        ["revenue", "Theo doanh thu"],
                        ["name", "Theo tên"],
                      ]}
                    />
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                <StaffPerformancePanel title="Nhân viên đạt KPI / làm tốt" tone="good" rows={achievedStaff} target={staffKpiTarget} />
                <StaffPerformancePanel title="Nhân viên chưa đạt KPI" tone="risk" rows={missedStaff} target={staffKpiTarget} />
              </div>
            </section>
          ) : null}

          {activeOption === "services" ? (
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <ChartCard title="Doanh thu theo dịch vụ" subtitle="Dịch vụ nào tạo doanh thu tốt nhất" icon={BarChart3}>
                <ServiceChart rows={serviceRows} metric="revenue" />
              </ChartCard>
              <ChartCard title="Booking theo dịch vụ" subtitle="Tổng booking theo từng gói rửa" icon={ClipboardList}>
                <ServiceChart rows={serviceRows} metric="bookings" />
              </ChartCard>
            </div>
          ) : null}
        </>
      )}
    </WorkspacePage>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone: "green" | "blue" | "amber" | "slate";
}) {
  const toneClass = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <Card className="rounded-3xl border-slate-200 bg-white p-4 shadow-sm">
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

function ChartCard({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Card className="rounded-3xl border-slate-200 bg-white p-4 shadow-sm">
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

function RevenueTrendChart({ rows }: { rows: TrendRow[] }) {
  const hasData = rows.some((row) => row.revenue > 0 || row.bookings > 0);

  return (
    <div className="space-y-3">
      {!hasData ? <EmptyReportLine label="Không có dữ liệu doanh thu trong kỳ này." /> : null}
      <div className="h-[290px] rounded-3xl bg-gradient-to-br from-slate-50 to-cyan-50/50 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="managerRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="managerBookingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.26} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} minTickGap={8} />
            <YAxis yAxisId="revenue" tickFormatter={(value) => compactCurrency(Number(value))} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={58} />
            <YAxis yAxisId="bookings" orientation="right" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
            <Tooltip content={<RevenueTooltip />} />
            <Area yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fill="url(#managerRevenueGradient)" dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
            <Area yAxisId="bookings" type="monotone" dataKey="bookings" stroke="#06b6d4" strokeWidth={2.5} fill="url(#managerBookingGradient)" dot={{ r: 2.5, strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3 text-[11px] font-bold text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-5 rounded-full bg-emerald-500" /> Doanh thu</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-5 rounded-full bg-cyan-500" /> Booking</span>
      </div>
    </div>
  );
}

function BookingFunnelCard({ rows, total }: { rows: FunnelRow[]; total: number }) {
  return (
    <Card className="rounded-3xl border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-black text-slate-950">Booking funnel</h2>
          <p className="text-xs text-slate-500">Từ booking đến hoàn thành</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((row, index) => (
          <div key={row.key} className="rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black ${row.colorSoft}`}>{index + 1}</span>
                <div>
                  <p className="text-sm font-black text-slate-900">{row.label}</p>
                  <p className="text-[11px] text-slate-500">{row.helper}</p>
                </div>
              </div>
              <span className="text-lg font-black text-slate-950">{row.count}</span>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-white">
              <div className={`h-2.5 rounded-full ${row.color}`} style={{ width: `${Math.max(row.count ? 8 : 0, (row.count / Math.max(total, 1)) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ServiceMixChart({ rows }: { rows: ServiceRow[] }) {
  const colors = ["#00236f", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
  const data = rows.map((row, index) => ({ ...row, fill: colors[index % colors.length] }));
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
      <div className="relative h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="revenue" nameKey="service" innerRadius={62} outerRadius={92} paddingAngle={3}>
              {data.map((item) => (
                <Cell key={item.service} fill={item.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Tổng</span>
          <span className="text-sm font-black text-slate-950">{formatCurrency(totalRevenue)}</span>
        </div>
      </div>
      <div className="space-y-2">
        {data.length === 0 ? <EmptyReportLine label="Chưa có dữ liệu dịch vụ trong kỳ này." /> : null}
        {data.map((row) => (
          <div key={row.service} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.fill }} />
              <span className="truncate text-xs font-black text-slate-800">{row.service}</span>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-slate-950">{formatCurrency(row.revenue)}</p>
              <p className="text-[10px] text-slate-500">{row.bookings} booking</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionInsightPanel({
  bestStaff,
  weakestStaff,
  bestService,
  target,
  conversionRate,
}: {
  bestStaff?: StaffRow;
  weakestStaff?: StaffRow;
  bestService?: ServiceRow;
  target: number;
  conversionRate: number;
}) {
  return (
    <Card className="rounded-3xl border-cyan-100 bg-gradient-to-br from-white via-cyan-50/55 to-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-black text-slate-950">Gợi ý hành động</h2>
          <p className="text-xs text-slate-500">Các điểm Manager nên chú ý trong kỳ báo cáo.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InsightCard title="Nhân viên tốt nhất" value={bestStaff?.staffName ?? "Chưa có"} detail={bestStaff ? `${bestStaff.completedBookings}/${target} booking, ${formatCurrency(bestStaff.revenue)}` : "Chưa có dữ liệu"} tone="good" icon={Crown} />
        <InsightCard title="Cần hỗ trợ" value={weakestStaff?.staffName ?? "Chưa có"} detail={weakestStaff ? `${weakestStaff.completedBookings}/${target} booking, KPI ${weakestStaff.progress}%` : "Chưa có dữ liệu"} tone="risk" icon={TrendingDown} />
        <InsightCard title="Dịch vụ mạnh" value={bestService?.service ?? "Chưa có"} detail={bestService ? `${formatCurrency(bestService.revenue)} từ ${bestService.bookings} booking` : "Chưa có dữ liệu"} tone="blue" icon={BarChart3} />
        <InsightCard title="Sức khỏe booking" value={`${conversionRate}% hoàn thành`} detail={conversionRate >= 70 ? "Luồng vận hành ổn định" : "Nên kiểm tra các booking chưa hoàn tất"} tone="amber" icon={Target} />
      </div>
    </Card>
  );
}

function InsightCard({ title, value, detail, tone, icon: Icon }: { title: string; value: string; detail: string; tone: "good" | "risk" | "blue" | "amber"; icon: ComponentType<{ className?: string }> }) {
  const toneClass = {
    good: "bg-emerald-50 text-emerald-700",
    risk: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{title}</p>
          <p className="truncate text-sm font-black text-slate-950">{value}</p>
          <p className="text-xs leading-5 text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function StaffPerformancePanel({ title, tone, rows, target }: { title: string; tone: "good" | "risk"; rows: StaffRow[]; target: number }) {
  const isGood = tone === "good";

  return (
    <Card className={`rounded-3xl p-4 shadow-sm ${isGood ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/45"}`}>
      <div className="flex items-center gap-2">
        {isGood ? <CheckCircle2 className="h-5 w-5 text-emerald-700" /> : <TrendingDown className="h-5 w-5 text-rose-700" />}
        <h3 className="font-black text-slate-950">{title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? <EmptyReportLine label={isGood ? "Chưa có nhân viên đạt KPI trong kỳ này." : "Không có nhân viên dưới KPI trong kỳ này."} /> : null}
        {rows.map((row) => (
          <div key={row.staffId} className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{row.staffName}</p>
                <p className="text-xs text-slate-500">
                  Tổng booking: <span className="font-black text-slate-700">{row.totalBookings}</span> · Hoàn thành: <span className="font-black text-slate-700">{row.completedBookings}</span> · Đang rửa: {row.activeBookings}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${isGood ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                {row.completedBookings}/{target}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={row.progress} className="h-2 bg-slate-100" />
              <span className="w-10 text-right text-xs font-black text-slate-600">{row.progress}%</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
              <MiniInfo label="Doanh thu" value={formatCurrency(row.revenue)} />
              <MiniInfo label="Thời lượng TB" value={row.averageDuration ? `${row.averageDuration} phút` : "--"} />
              <MiniInfo label="Điểm thưởng" value={`${row.points}`} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ServiceChart({ rows, metric }: { rows: ServiceRow[]; metric: "revenue" | "bookings" }) {
  const hasData = rows.some((row) => (metric === "revenue" ? row.revenue : row.bookings) > 0);

  return (
    <div className="space-y-3">
      {!hasData ? <EmptyReportLine label="Chưa có dữ liệu dịch vụ trong kỳ này." /> : null}
      <div className="h-[285px] rounded-3xl bg-slate-50 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, left: 20, bottom: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={(value) => (metric === "revenue" ? compactCurrency(Number(value)) : String(value))} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="service" width={92} tick={{ fill: "#334155", fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => (metric === "revenue" ? formatCurrency(Number(value)) : `${value} booking`)} />
            <Bar dataKey={metric} radius={[0, 10, 10, 0]} fill={metric === "revenue" ? "#00236f" : "#06b6d4"} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="truncate text-xs font-black text-slate-800">{value}</p>
    </div>
  );
}

function EmptyReportLine({ label }: { label: string }) {
  return <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-3 py-5 text-center text-sm font-semibold text-slate-400">{label}</p>;
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

type TrendRow = { key: string; label: string; revenue: number; bookings: number };
type ServiceRow = { service: string; revenue: number; bookings: number };
type FunnelRow = { key: string; label: string; helper: string; count: number; color: string; colorSoft: string };
type StaffRow = {
  staffId: string;
  staffName: string;
  totalBookings: number;
  completedBookings: number;
  activeBookings: number;
  revenue: number;
  points: number;
  averageDuration: number;
  progress: number;
};

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string; value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((item) => item.dataKey === "revenue")?.value ?? 0;
  const bookings = payload.find((item) => item.dataKey === "bookings")?.value ?? 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-[0_16px_38px_rgba(15,23,42,0.16)]">
      <p className="font-black text-slate-950">{label}</p>
      <p className="mt-1 font-bold text-emerald-700">Doanh thu: {formatCurrency(revenue)}</p>
      <p className="font-bold text-cyan-700">Booking: {bookings}</p>
    </div>
  );
}

function buildTrendRows(sessions: OperationsQueueSession[], mode: PeriodMode, period: { day: string; month: string; year: string }): TrendRow[] {
  const keys = getTrendKeys(mode, period);
  const rows = keys.map(({ key, label }) => {
    const bucketSessions = sessions.filter((session) => getTrendKey(session, mode) === key);
    return {
      key,
      label,
      revenue: sumRevenue(bucketSessions.filter((session) => session.status === "COMPLETED")),
      bookings: bucketSessions.length,
    };
  });

  if (mode === "all") {
    return rows.filter((row) => row.bookings > 0 || row.revenue > 0);
  }

  return rows;
}

function buildFunnelRows(sessions: OperationsQueueSession[]): FunnelRow[] {
  const created = sessions.length;
  const checkedIn = sessions.filter((session) => ["CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(session.status)).length;
  const washing = sessions.filter((session) => ["IN_PROGRESS", "COMPLETED"].includes(session.status)).length;
  const completed = sessions.filter((session) => session.status === "COMPLETED").length;
  const cancelled = sessions.filter((session) => session.status === "CANCELLED").length;

  return [
    { key: "created", label: "Tổng booking/session", helper: "Tất cả xe trong kỳ", count: created, color: "bg-blue-500", colorSoft: "bg-blue-50 text-blue-700" },
    { key: "checkedIn", label: "Đã check-in", helper: "Manager đã nhận xe", count: checkedIn, color: "bg-cyan-500", colorSoft: "bg-cyan-50 text-cyan-700" },
    { key: "washing", label: "Đã vào quy trình rửa", helper: "Đang rửa hoặc đã hoàn thành", count: washing, color: "bg-amber-500", colorSoft: "bg-amber-50 text-amber-700" },
    { key: "completed", label: "Hoàn thành", helper: "Đã ghi nhận doanh thu", count: completed, color: "bg-emerald-500", colorSoft: "bg-emerald-50 text-emerald-700" },
    { key: "cancelled", label: "Đã hủy", helper: "Cần xem nguyên nhân", count: cancelled, color: "bg-rose-500", colorSoft: "bg-rose-50 text-rose-700" },
  ];
}

function buildStaffRows(sessions: OperationsQueueSession[], target: number): StaffRow[] {
  const staffIds = Array.from(new Set(sessions.map((session) => session.assignedStaffId ?? "unassigned")));
  return staffIds.map((staffId) => {
    const staffSessions = sessions.filter((session) => (session.assignedStaffId ?? "unassigned") === staffId);
    const completed = staffSessions.filter((session) => session.status === "COMPLETED");
    const durations = completed.map(getDuration).filter((duration): duration is number => duration !== null);
    const completedBookings = completed.length;

    return {
      staffId,
      staffName: staffSessions.find((session) => session.assignedStaffName)?.assignedStaffName ?? "Chưa phân công",
      totalBookings: staffSessions.length,
      completedBookings,
      activeBookings: staffSessions.filter((session) => ["CHECKED_IN", "IN_PROGRESS", "QUEUED"].includes(session.status)).length,
      revenue: sumRevenue(completed),
      points: completed.reduce((sum, session) => sum + (session.awardedLoyaltyPoints ?? 0), 0),
      averageDuration: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
      progress: Math.min(100, Math.round((completedBookings / Math.max(target, 1)) * 100)),
    };
  });
}

function sortStaffRows(rows: StaffRow[], sort: StaffSort) {
  return [...rows].sort((left, right) => {
    if (sort === "name") return left.staffName.localeCompare(right.staffName);
    if (sort === "bookings") return right.completedBookings - left.completedBookings || right.totalBookings - left.totalBookings;
    if (sort === "revenue") return right.revenue - left.revenue;
    return right.progress - left.progress || right.completedBookings - left.completedBookings || right.revenue - left.revenue;
  });
}

function buildServiceRows(sessions: OperationsQueueSession[]): ServiceRow[] {
  const services = Array.from(new Set(sessions.map((session) => session.servicePackage ?? session.packageId ?? "Gói rửa")));
  return services
    .map((service) => {
      const serviceSessions = sessions.filter((session) => (session.servicePackage ?? session.packageId ?? "Gói rửa") === service);
      return {
        service,
        bookings: serviceSessions.length,
        revenue: sumRevenue(serviceSessions.filter((session) => session.status === "COMPLETED")),
      };
    })
    .sort((left, right) => right.revenue - left.revenue || right.bookings - left.bookings);
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

function getTrendKeys(mode: PeriodMode, period: { day: string; month: string; year: string }) {
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

  const year = mode === "year" ? period.year : "2026";
  return Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0");
    return { key: `${year}-${month}`, label: `T${index + 1}` };
  });
}

function buildMonthOptions(sessions: OperationsQueueSession[]) {
  const values = Array.from(new Set(sessions.map((session) => session.bookingDate.slice(0, 7)))).sort();
  return (values.length ? values : ["2026-07"]).map((value) => [value, `Tháng ${value.slice(5, 7)}/${value.slice(0, 4)}`] as const);
}

function buildYearOptions(sessions: OperationsQueueSession[]) {
  const values = Array.from(new Set(sessions.map((session) => session.bookingDate.slice(0, 4)))).sort();
  return (values.length ? values : ["2026"]).map((value) => [value, `Năm ${value}`] as const);
}

function periodModeLabel(mode: PeriodMode) {
  const labels: Record<PeriodMode, string> = {
    day: "Theo ngày",
    month: "Theo tháng",
    year: "Theo năm",
    all: "Tất cả",
  };
  return labels[mode];
}

function periodDescription(mode: PeriodMode, day: string, month: string, year: string) {
  if (mode === "day") return formatDate(day);
  if (mode === "month") return `Tháng ${month.slice(5, 7)}/${month.slice(0, 4)}`;
  if (mode === "year") return `Năm ${year}`;
  return "Toàn bộ dữ liệu";
}

function sumRevenue(sessions: OperationsQueueSession[]) {
  return sessions.reduce((sum, session) => sum + (session.feeAmount ?? 0), 0);
}

function getDuration(session: OperationsQueueSession) {
  if (!session.startedAt || !session.completedAt) return null;
  const value = new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime();
  return value > 0 ? Math.round(value / 60_000) : null;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
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
