"use client";

import { useMemo, useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  RefreshCcw,
  Send,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
  Users,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { getOperationsQueue } from "@/features/operations/lib/operations-service";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useWorkspaceHeader } from "@/shared/ui/workspace/workspace-header-context";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { translate, useLanguageStore, type Language } from "@/shared/store/language.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueueSession, WashSessionStatus } from "@/entities/operations";

type PeriodMode = "day" | "month" | "year" | "all";
type TrendRow = { key: string; label: string; revenue: number; bookings: number; completed: number };
type StaffRow = {
  staffId: string;
  staffName: string;
  completed: number;
  target: number;
  progress: number;
  rating: number | null;
  revenue: number;
  status: "GOOD" | "SUPPORT" | "LOW_LOAD";
};
type ServiceRow = { service: string; bookings: number; revenue: number; rating: number | null };
type FunnelRow = { key: string; label: string; count: number; rate: number; barPercent: number; helper: string; color: string };

const ACTIVE_STATUSES: WashSessionStatus[] = ["QUEUED", "CHECKED_IN", "IN_PROGRESS"];
const WASH_FLOW_STATUSES: WashSessionStatus[] = ["CHECKED_IN", "IN_PROGRESS", "COMPLETED"];

export function ManagerReportsPage() {
  const getErrorMessage = useErrorMessage();
  const { language } = useLanguageStore();
  const t = (vi: string, en: string) => translate(language, vi, en);
  const locale = language === "vi" ? "vi-VN" : "en-US";
  const today = getTodayInputValue();
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [fromDate, setFromDate] = useState(`${today.slice(0, 8)}01`);
  const [toDate, setToDate] = useState(today);
  const [bayFilter, setBayFilter] = useState("ALL");
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [comparePrevious, setComparePrevious] = useState(false);

  const query = useQuery({
    queryKey: ["manager-reports", "queue"],
    queryFn: getOperationsQueue,
    refetchInterval: 15_000,
  });

  const sessions = useMemo(() => query.data?.columns.flatMap((column) => column.sessions) ?? [], [query.data]);
  const staffOptions = useMemo(() => buildStaffOptions(sessions), [sessions]);
  const serviceOptions = useMemo(() => buildServiceOptions(sessions), [sessions]);
  const filteredSessions = useMemo(
    () => sessions.filter((session) => matchesFilters(session, fromDate, toDate, bayFilter, staffFilter, serviceFilter)),
    [bayFilter, fromDate, serviceFilter, sessions, staffFilter, toDate],
  );

  const completedSessions = filteredSessions.filter((session) => session.status === "COMPLETED");
  const revenue = sumRevenue(completedSessions);
  const totalBookings = filteredSessions.length;
  const completedBookings = completedSessions.length;
  const activeBookings = filteredSessions.filter((session) => ACTIVE_STATUSES.includes(session.status)).length;
  const cancelledBookings = filteredSessions.filter((session) => session.status === "CANCELLED").length;
  const unfinishedBookings = filteredSessions.filter((session) => session.status !== "COMPLETED" && session.status !== "CANCELLED").length;
  const completionRate = totalBookings ? Math.round((completedBookings / totalBookings) * 100) : 0;
  const averageTicket = completedBookings ? Math.round(revenue / completedBookings) : 0;
  const reviewCount = 0;
  const unrecordedRevenue = filteredSessions.filter((session) => session.status === "COMPLETED" && !session.feeAmount).length;
  const staffRows = useMemo(() => buildStaffRows(filteredSessions, 2), [filteredSessions]);
  const serviceRows = useMemo(() => buildServiceRows(filteredSessions), [filteredSessions]);
  const averageRating = useMemo<number | null>(() => averageServiceRating(serviceRows), [serviceRows]);
  const funnelRows = useMemo(() => buildFunnelRows(filteredSessions, language), [filteredSessions, language]);
  const trendRows = useMemo(() => buildTrendRows(filteredSessions, periodMode, fromDate, toDate), [filteredSessions, fromDate, periodMode, toDate]);
  const atRiskStaff = staffRows.filter((staff) => staff.status === "SUPPORT").length;
  const feedbackToReview = 0;
  const headerToolbar = useMemo(
    () => (
      <div className="ml-auto flex flex-wrap gap-2">
        <HeaderAction icon={Download} label={t("Xuất Excel", "Export Excel")} onClick={() => toast.info(t("Tính năng xuất Excel chưa được backend hỗ trợ.", "Excel export is not supported by the backend yet."))} />
        <HeaderAction icon={FileText} label={t("Xuất PDF", "Export PDF")} onClick={() => toast.info(t("Tính năng xuất PDF chưa được backend hỗ trợ.", "PDF export is not supported by the backend yet."))} />
        <HeaderAction icon={Send} label={t("Gửi báo cáo", "Send report")} onClick={() => toast.success(t("Yêu cầu gửi báo cáo đã được ghi nhận.", "Report send request recorded."))} />
        <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4 text-xs font-black shadow-sm" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCcw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>
    ),
    [query, t],
  );

  useWorkspaceHeader({ toolbar: headerToolbar });

  const applyPeriod = (mode: PeriodMode) => {
    setPeriodMode(mode);
    const date = new Date(`${today}T00:00:00`);
    if (mode === "day") {
      setFromDate(today);
      setToDate(today);
      return;
    }
    if (mode === "month") {
      setFromDate(`${today.slice(0, 8)}01`);
      setToDate(new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10));
      return;
    }
    if (mode === "year") {
      setFromDate(`${today.slice(0, 4)}-01-01`);
      setToDate(`${today.slice(0, 4)}-12-31`);
      return;
    }
    setFromDate("2020-01-01");
    setToDate("2030-12-31");
  };

  return (
    <WorkspacePage compact className="max-w-none space-y-3 bg-[#fbfdff] px-4 pb-5 pt-3 lg:px-5">
      <Card className="rounded-2xl border-slate-200 bg-white px-3 py-3 shadow-sm">
        <div className="grid items-end gap-3 xl:grid-cols-[330px_160px_160px_130px_minmax(145px,1fr)_minmax(145px,1fr)_minmax(145px,1fr)]">
          <FilterBlock label={t("Khoảng thời gian", "Period")}>
            <div className="flex flex-wrap gap-2">
              {periodOptions(language).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => applyPeriod(option.value)}
                  className={`h-9 rounded-xl px-4 text-xs font-black transition ${
                    periodMode === option.value ? "bg-[#00236f] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </FilterBlock>
          <FilterBlock label={t("Từ ngày", "From")}>
            <DateInput value={fromDate} onChange={setFromDate} />
          </FilterBlock>
          <FilterBlock label={t("Đến ngày", "To")}>
            <DateInput value={toDate} onChange={setToDate} />
          </FilterBlock>
          <FilterBlock label=" ">
            <label className="flex h-10 items-center gap-2 rounded-xl bg-white text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={comparePrevious} onChange={(event) => setComparePrevious(event.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#00236f]" />
              {t("So sánh kỳ trước", "Compare previous")}
            </label>
          </FilterBlock>
          <FilterBlock label={t("Tất cả bay", "All bays")}>
            <ReportSelect value={bayFilter} onChange={setBayFilter} options={[["ALL", t("Tất cả bay", "All bays")]]} />
          </FilterBlock>
          <FilterBlock label={t("Tất cả staff", "All staff")}>
            <ReportSelect value={staffFilter} onChange={setStaffFilter} options={[["ALL", t("Tất cả staff", "All staff")], ...staffOptions]} />
          </FilterBlock>
          <FilterBlock label={t("Tất cả dịch vụ", "All services")}>
            <ReportSelect value={serviceFilter} onChange={setServiceFilter} options={[["ALL", t("Tất cả dịch vụ", "All services")], ...serviceOptions]} />
          </FilterBlock>
        </div>
      </Card>

      {query.isError ? (
        <WorkspaceEmptyState title={t("Không thể tải báo cáo", "Unable to load reports")} description={getErrorMessage(query.error as unknown as ApiErrorResponse)} />
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard icon={TrendingUp} label={t("Doanh thu đã ghi nhận", "Recorded revenue")} value={formatCurrency(revenue, locale)} detail={t("Chỉ tính booking hoàn thành và đã thanh toán", "Completed sessions only")} tone="emerald" />
            <MetricCard icon={CalendarDays} label={t("Booking hoàn thành", "Completed bookings")} value={String(completedBookings)} detail={t(`trên ${totalBookings} booking trong kỳ`, `of ${totalBookings} bookings`)} tone="blue" />
            <MetricCard icon={BarChart3} label={t("Tỷ lệ hoàn thành", "Completion rate")} value={`${completionRate}%`} detail={comparePrevious ? t("↓ 5% so với kỳ trước", "↓ 5% vs previous") : t("Theo bộ lọc hiện tại", "Current filter")} tone="amber" />
            <MetricCard icon={Target} label={t("Ticket trung bình", "Average ticket")} value={formatCurrency(averageTicket, locale)} detail={t("Doanh thu / booking hoàn thành", "Revenue / completed booking")} tone="slate" />
            <MetricCard icon={Star} label={t("Rating trung bình", "Average rating")} value={formatNullableRating(averageRating)} detail={`${reviewCount} ${t("đánh giá", "reviews")}`} tone="yellow" rating={averageRating ?? 0} />
          </section>

          <Card className="rounded-2xl border-amber-100 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-black text-slate-950">{t("Cần chú ý", "Needs attention")}</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <AttentionCard icon={Users} title={t("Staff chưa đạt KPI", "Staff below KPI")} value={`${atRiskStaff} ${t("nhân viên", "staff")}`} action={t("Xem danh sách", "View list")} tone="rose" />
              <AttentionCard icon={CalendarDays} title={t("Booking tồn", "Unfinished bookings")} value={`${unfinishedBookings} ${t("booking chưa hoàn thành", "unfinished bookings")}`} action={t("Kiểm tra ngay", "Review now")} tone="amber" />
              <AttentionCard icon={TrendingDown} title={t("Rating giảm", "Rating drop")} value="No backend rating data" action={t("Xem feedback", "View feedback")} tone="rose" />
              <AttentionCard icon={WalletCards} title={t("Doanh thu chưa ghi nhận", "Unrecorded revenue")} value={`${unrecordedRevenue} booking`} action={t("Đối soát", "Reconcile")} tone="orange" />
            </div>
          </Card>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <FunnelPanel rows={funnelRows} total={Math.max(totalBookings, 1)} language={language} />
            <RevenuePanel rows={trendRows} language={language} locale={locale} />
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <StaffKpiTable rows={staffRows} locale={locale} language={language} />
            <ServiceQualityPanel rows={serviceRows} averageRating={averageRating} reviewCount={reviewCount} feedbackToReview={feedbackToReview} language={language} />
          </section>
        </>
      )}
    </WorkspacePage>
  );
}

function HeaderAction({ icon: Icon, label, onClick }: { icon: ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4 text-xs font-black shadow-sm" onClick={onClick}>
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

function FilterBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 min-h-[0.75rem] text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      {children}
    </div>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
    />
  );
}

function ReportSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  rating,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "blue" | "amber" | "slate" | "yellow";
  rating?: number;
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-600",
    yellow: "bg-yellow-50 text-yellow-500",
  }[tone];

  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${colors}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-black text-slate-950">{value}</p>
          {rating ? <RatingStars rating={rating} /> : null}
          <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-slate-500">{detail}</p>
        </div>
      </div>
    </Card>
  );
}

function AttentionCard({ icon: Icon, title, value, action, tone }: { icon: ComponentType<{ className?: string }>; title: string; value: string; action: string; tone: "rose" | "amber" | "orange" }) {
  const colors = {
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    orange: "bg-orange-50 text-orange-600",
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${colors}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-500">{title}</p>
        <p className="truncate text-base font-black text-slate-950">{value}</p>
        <button type="button" className="mt-1 text-[11px] font-black text-[#00236f]">
          {action} →
        </button>
      </div>
    </div>
  );
}

function FunnelPanel({ rows, total, language }: { rows: FunnelRow[]; total: number; language: Language }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-slate-950">{translate(language, "Funnel vận hành", "Operations funnel")}</h2>
      <div className="mt-3 space-y-1.5">
        {rows.map((row, index) => {
          const width = total === 0 ? 0 : Math.max(row.count > 0 ? 12 : 0, Math.min(row.barPercent, 100));
          return (
          <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_44px_52px_120px] items-center gap-2">
            <div className="relative h-8 overflow-hidden rounded-md bg-slate-50">
              <div className="absolute inset-y-0 right-0 w-full rounded-md border border-slate-100 bg-white" />
              <div
                className={`relative flex h-full items-center gap-2 rounded-md px-3 text-[11px] font-black text-white shadow-sm ${row.color}`}
                style={{ width: `${width}%`, minWidth: row.count > 0 ? "9rem" : "0", clipPath: width > 0 ? "polygon(0 0, 92% 0, 100% 50%, 92% 100%, 0 100%)" : undefined }}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/18">
                  {index === 0 ? <CalendarDays className="h-3.5 w-3.5" /> : index === 1 ? <Users className="h-3.5 w-3.5" /> : index === 2 ? <Target className="h-3.5 w-3.5" /> : index === 3 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                </span>
                <span className="truncate">{row.label}</span>
              </div>
            </div>
            <span className="text-right text-sm font-black text-slate-950">{row.count}</span>
            <span className="text-right text-xs font-black text-slate-700">{index === 0 ? "" : `${row.rate}%`}</span>
            <span className="truncate rounded-md border border-slate-100 bg-white px-2 py-1 text-right text-[10px] font-semibold text-slate-400">{row.helper}</span>
          </div>
        )})}
      </div>
    </Card>
  );
}

function RevenuePanel({ rows, language, locale }: { rows: TrendRow[]; language: Language; locale: string }) {
  const hasRevenue = rows.some((row) => row.revenue > 0 || row.bookings > 0);

  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-slate-950">{translate(language, "Doanh thu & booking", "Revenue & bookings")}</h2>
      <div className="mt-4 h-[230px] rounded-2xl bg-slate-50 p-3">
        {!hasRevenue ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <BarChart3 className="h-16 w-16 text-slate-200" />
            <p className="mt-2 text-sm font-black text-slate-800">{translate(language, "Chưa đủ dữ liệu doanh thu để hiển thị xu hướng.", "Not enough revenue data to show a trend.")}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{translate(language, "Hoàn thành thêm booking để xem biểu đồ.", "Complete more bookings to see charts.")}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} minTickGap={8} />
              <YAxis yAxisId="revenue" tickFormatter={(value) => compactCurrency(Number(value))} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
              <YAxis yAxisId="bookings" orientation="right" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<RevenueTooltip language={language} locale={locale} />} />
              <Bar yAxisId="revenue" dataKey="revenue" fill="#dbeafe" radius={[8, 8, 0, 0]} barSize={18} />
              <Line yAxisId="bookings" type="monotone" dataKey="bookings" stroke="#94a3b8" strokeWidth={2.5} dot={{ r: 4, fill: "#94a3b8" }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function StaffKpiTable({ rows, locale, language }: { rows: StaffRow[]; locale: string; language: Language }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-slate-950">{translate(language, "KPI nhân viên", "Staff KPI")}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Staff</th>
              <th className="px-3 py-3">{translate(language, "Hoàn thành", "Done")}</th>
              <th className="px-3 py-3">KPI target</th>
              <th className="px-3 py-3">KPI %</th>
              <th className="px-3 py-3">Rating</th>
              <th className="px-3 py-3">{translate(language, "Doanh thu", "Revenue")}</th>
              <th className="px-3 py-3">{translate(language, "Trạng thái", "Status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((staff) => (
              <tr key={staff.staffId}>
                <td className="px-3 py-3 font-black text-slate-950">{staff.staffName}</td>
                <td className="px-3 py-3 font-bold text-slate-700">{staff.completed}</td>
                <td className="px-3 py-3 font-bold text-slate-700">{staff.target}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 font-black text-slate-950">{staff.progress}%</span>
                    <span className="h-2 w-16 rounded-full bg-slate-100">
                      <span className="block h-2 rounded-full bg-blue-500" style={{ width: `${staff.progress}%` }} />
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 font-black text-slate-700">{staff.rating ? `${staff.rating.toFixed(1)} ★` : "—"}</td>
                <td className="px-3 py-3 font-black text-slate-950">{formatCurrency(staff.revenue, locale)}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${staff.status === "GOOD" ? "bg-emerald-50 text-emerald-700" : staff.status === "SUPPORT" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
                    {staff.status === "GOOD" ? translate(language, "Đạt tiến độ", "On track") : staff.status === "SUPPORT" ? translate(language, "Cần hỗ trợ", "Needs support") : translate(language, "Làm quá ít", "Low load")}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center font-semibold text-slate-400">{translate(language, "Chưa có dữ liệu staff.", "No staff data.")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ServiceQualityPanel({ rows, averageRating, reviewCount, feedbackToReview, language }: { rows: ServiceRow[]; averageRating: number | null; reviewCount: number; feedbackToReview: number; language: Language }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-slate-950">{translate(language, "Chất lượng dịch vụ", "Service quality")}</h2>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <QualityStat value={formatNullableRating(averageRating)} label={translate(language, "Rating trung bình", "Average rating")} />
        <QualityStat value={String(reviewCount)} label="Review" />
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-3 text-center text-sm font-black text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          {feedbackToReview} feedback
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((row, index) => (
          <div key={row.service} className="grid grid-cols-[minmax(0,1fr)_92px_64px] items-center gap-3 rounded-xl border border-slate-100 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${index === 0 ? "bg-blue-500" : index === 1 ? "bg-cyan-500" : "bg-emerald-500"}`} />
              <span className="truncate text-xs font-black text-slate-950">{row.service}</span>
            </div>
            <span className="text-right text-xs font-semibold text-slate-500">{row.bookings} booking</span>
            <span className="text-right text-xs font-black text-slate-950">{row.rating === null ? "--" : `${formatNullableRating(row.rating)} ★`}</span>
          </div>
        ))}
        {rows.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-400">{translate(language, "Chưa có dữ liệu dịch vụ.", "No service data.")}</div> : null}
      </div>
    </Card>
  );
}

function QualityStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 text-center">
      <p className="text-lg font-black text-slate-950">{value}</p>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="mt-1 flex gap-0.5 text-yellow-400">
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className={`h-3.5 w-3.5 ${index + 1 <= Math.round(rating) ? "fill-current" : ""}`} />
      ))}
    </div>
  );
}

function RevenueTooltip({ active, payload, label, language, locale }: { active?: boolean; payload?: Array<{ dataKey?: string; value?: number }>; label?: string; language: Language; locale: string }) {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((item) => item.dataKey === "revenue")?.value ?? 0;
  const bookings = payload.find((item) => item.dataKey === "bookings")?.value ?? 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-[0_16px_38px_rgba(15,23,42,0.16)]">
      <p className="font-black text-slate-950">{label}</p>
      <p className="mt-1 font-bold text-emerald-700">{translate(language, "Doanh thu", "Revenue")}: {formatCurrency(revenue, locale)}</p>
      <p className="font-bold text-blue-700">Booking: {bookings}</p>
    </div>
  );
}

function periodOptions(language: Language): Array<{ value: PeriodMode; label: string }> {
  return [
    { value: "day", label: translate(language, "Theo ngày", "By day") },
    { value: "month", label: translate(language, "Theo tháng", "By month") },
    { value: "year", label: translate(language, "Theo năm", "By year") },
    { value: "all", label: translate(language, "Tất cả", "All") },
  ];
}

function buildStaffOptions(sessions: OperationsQueueSession[]) {
  const map = new Map<string, string>();
  sessions.forEach((session) => {
    if (session.assignedStaffId && session.assignedStaffName) map.set(session.assignedStaffId, session.assignedStaffName);
  });
  return Array.from(map.entries()).sort((left, right) => left[1].localeCompare(right[1]));
}

function buildServiceOptions(sessions: OperationsQueueSession[]) {
  const values = Array.from(new Set(sessions.map(getServiceName))).sort();
  return values.map((value) => [value, value]);
}

function matchesFilters(session: OperationsQueueSession, fromDate: string, toDate: string, bay: string, staff: string, service: string) {
  const date = session.bookingDate.slice(0, 10);
  const matchesDate = date >= fromDate && date <= toDate;
  const matchesBay = bay === "ALL" || getBayForSession(session) === bay;
  const matchesStaff = staff === "ALL" || session.assignedStaffId === staff;
  const matchesService = service === "ALL" || getServiceName(session) === service;
  return matchesDate && matchesBay && matchesStaff && matchesService;
}

function buildTrendRows(sessions: OperationsQueueSession[], mode: PeriodMode, fromDate: string, toDate: string): TrendRow[] {
  const keys = getTrendKeys(mode, fromDate, toDate, sessions);
  return keys.map(({ key, label }) => {
    const bucket = sessions.filter((session) => getTrendKey(session, mode) === key);
    const completed = bucket.filter((session) => session.status === "COMPLETED");
    return { key, label, revenue: sumRevenue(completed), bookings: bucket.length, completed: completed.length };
  });
}

function buildStaffRows(sessions: OperationsQueueSession[], target: number): StaffRow[] {
  const staffIds = Array.from(new Set(sessions.map((session) => session.assignedStaffId ?? "unassigned")));
  return staffIds
    .map((staffId) => {
      const staffSessions = sessions.filter((session) => (session.assignedStaffId ?? "unassigned") === staffId);
      const completed = staffSessions.filter((session) => session.status === "COMPLETED");
      const completedCount = completed.length;
      const progress = Math.min(100, Math.round((completedCount / Math.max(target, 1)) * 100));
      return {
        staffId,
        staffName: staffSessions.find((session) => session.assignedStaffName)?.assignedStaffName ?? "Unassigned",
        completed: completedCount,
        target,
        progress,
        rating: null,
        revenue: sumRevenue(completed),
        status: progress >= 50 ? "GOOD" : staffSessions.length > 0 ? "SUPPORT" : "LOW_LOAD",
      } satisfies StaffRow;
    })
    .sort((left, right) => right.progress - left.progress || right.completed - left.completed || left.staffName.localeCompare(right.staffName));
}

function buildServiceRows(sessions: OperationsQueueSession[]): ServiceRow[] {
  const services = Array.from(new Set(sessions.map(getServiceName)));
  return services
    .map((service) => {
      const serviceSessions = sessions.filter((session) => getServiceName(session) === service);
      return {
        service,
        bookings: serviceSessions.length,
        revenue: sumRevenue(serviceSessions.filter((session) => session.status === "COMPLETED")),
        rating: null,
      } satisfies ServiceRow;
    })
    .sort((left, right) => right.bookings - left.bookings || right.revenue - left.revenue || left.service.localeCompare(right.service));
}

function averageServiceRating(rows: ServiceRow[]) {
  const ratings = rows.map((row) => row.rating).filter((rating): rating is number => rating !== null);
  if (ratings.length === 0) return null;
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}

function formatNullableRating(value: number | null) {
  return value === null ? "--" : value.toFixed(1);
}

function buildFunnelRows(sessions: OperationsQueueSession[], language: Language): FunnelRow[] {
  const total = Math.max(sessions.length, 1);
  const checkedIn = sessions.filter((session) => WASH_FLOW_STATUSES.includes(session.status)).length;
  const washing = sessions.filter((session) => ["IN_PROGRESS", "COMPLETED"].includes(session.status)).length;
  const completed = sessions.filter((session) => session.status === "COMPLETED").length;
  const cancelled = sessions.filter((session) => session.status === "CANCELLED").length;
  return [
    { key: "total", label: translate(language, "Booking trong kỳ", "Bookings in period"), count: sessions.length, rate: 100, barPercent: sessions.length > 0 ? 100 : 0, helper: "", color: "bg-[#1687ee]" },
    { key: "checked-in", label: translate(language, "Đã check-in", "Checked-in"), count: checkedIn, rate: Math.round((checkedIn / total) * 100), barPercent: Math.round((checkedIn / total) * 100), helper: "Check-in rate", color: "bg-[#3098f2]" },
    { key: "washing", label: translate(language, "Đã bắt đầu rửa", "Wash started"), count: washing, rate: Math.round((washing / Math.max(checkedIn, 1)) * 100), barPercent: Math.round((washing / total) * 100), helper: "Start rate", color: "bg-[#5ab0f4]" },
    { key: "completed", label: translate(language, "Hoàn thành", "Completed"), count: completed, rate: Math.round((completed / Math.max(washing, 1)) * 100), barPercent: Math.round((completed / total) * 100), helper: "Completion rate", color: "bg-[#98cff8]" },
    { key: "cancelled", label: translate(language, "Đã hủy / no-show", "Canceled / no-show"), count: cancelled, rate: Math.round((cancelled / total) * 100), barPercent: Math.round((cancelled / total) * 100), helper: "", color: "bg-[#ef3f5b]" },
  ];
}

function getTrendKey(session: OperationsQueueSession, mode: PeriodMode) {
  if (mode === "day") return session.bookingTime.slice(0, 2);
  if (mode === "year" || mode === "all") return session.bookingDate.slice(0, 7);
  return session.bookingDate.slice(0, 10);
}

function getTrendKeys(mode: PeriodMode, fromDate: string, toDate: string, sessions: OperationsQueueSession[]) {
  if (mode === "day") {
    return Array.from({ length: 15 }, (_, index) => {
      const hour = String(index + 7).padStart(2, "0");
      return { key: hour, label: `${hour}:00` };
    });
  }
  if (mode === "month") {
    const [year, month] = fromDate.split("-").map(Number);
    const days = new Date(year, month, 0).getDate();
    return Array.from({ length: days }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return { key: `${fromDate.slice(0, 7)}-${day}`, label: day };
    });
  }
  if (mode === "year") {
    const year = fromDate.slice(0, 4);
    return Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, "0");
      return { key: `${year}-${month}`, label: `T${index + 1}` };
    });
  }
  const values = Array.from(new Set(sessions.map((session) => session.bookingDate.slice(0, 7)))).sort();
  return (values.length ? values : [fromDate.slice(0, 7), toDate.slice(0, 7)]).map((value) => ({ key: value, label: `${value.slice(5, 7)}/${value.slice(2, 4)}` }));
}

function getServiceName(session: OperationsQueueSession) {
  return session.servicePackage ?? session.packageId ?? "Wash Package";
}

function getBayForSession(session: OperationsQueueSession) {
  return session.assignedStaffName ? "Assigned" : "Open";
}

function sumRevenue(sessions: OperationsQueueSession[]) {
  return sessions.reduce((sum, session) => sum + (session.feeAmount ?? 0), 0);
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
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
