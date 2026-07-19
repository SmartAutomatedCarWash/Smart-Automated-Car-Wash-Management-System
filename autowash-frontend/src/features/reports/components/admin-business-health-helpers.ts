import type { AdminReportBreakdown, ReportAnalysisGroup, ReportRangeKey } from "@/entities/reports";

export const REPORT_RANGE_OPTIONS: Array<{ value: ReportRangeKey; label: string; labelVi: string }> = [
  { value: "LAST_7_DAYS", label: "Last 7 days", labelVi: "7 ngày qua" },
  { value: "LAST_30_DAYS", label: "Last 30 days", labelVi: "30 ngày qua" },
  { value: "THIS_MONTH", label: "This month", labelVi: "Tháng này" },
  { value: "THIS_QUARTER", label: "This quarter", labelVi: "Quý này" },
];

export const REPORT_GROUP_OPTIONS: Array<{ value: ReportAnalysisGroup; label: string; labelVi: string }> = [
  { value: "revenue", label: "Revenue", labelVi: "Doanh thu" },
  { value: "service", label: "Service", labelVi: "Dịch vụ" },
  { value: "discount", label: "Discount", labelVi: "Ưu đãi" },
  { value: "channel", label: "Channel", labelVi: "Kênh" },
];

export function formatCurrency(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

export function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString("vi-VN");
}

export function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export function formatGrowth(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

export function growthTone(value: number) {
  if (value > 0) return "text-emerald-700";
  if (value < 0) return "text-rose-700";
  return "text-slate-600";
}

export function insightToneClasses(tone: string) {
  switch (tone) {
    case "positive":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "negative":
      return "border-rose-200 bg-rose-50 text-rose-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

export function breakdownForGroup(
  group: ReportAnalysisGroup,
  breakdowns: {
    revenue: AdminReportBreakdown;
    service: AdminReportBreakdown;
    discount: AdminReportBreakdown;
    channel: AdminReportBreakdown;
  },
) {
  return breakdowns[group];
}
