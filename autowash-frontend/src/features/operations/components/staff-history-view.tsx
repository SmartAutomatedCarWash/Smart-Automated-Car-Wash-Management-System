"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Search,
  Star,
  X,
  Eye,
  Car,
  User,
  Phone,
  CreditCard,
  Banknote,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/shared/ui/ui/dialog";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { getStaffSessionHistory } from "@/features/operations/lib/operations-service";
import { cn } from "@/shared/lib/utils";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type {
  StaffSessionHistoryItem,
  StaffSessionHistoryParams,
} from "@/entities/operations";

type PeriodFilter = "ALL" | "TODAY" | "7DAYS" | "MONTH";
type RatingFilter = "ALL" | "5" | "4" | "LOW" | "NONE";
type SortMode = "COMPLETED_DESC" | "COMPLETED_ASC" | "DURATION_DESC" | "RATING_ASC";

const PAGE_SIZE = 5;

export function StaffHistoryView() {
  const getErrorMessage = useErrorMessage();

  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("7DAYS");
  const [serviceFilter, setServiceFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("COMPLETED_DESC");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [selectedItem, setSelectedItem] = useState<StaffSessionHistoryItem | null>(null);

  const params: StaffSessionHistoryParams = {
    page,
    limit: PAGE_SIZE,
    period,
    ...(serviceFilter && { servicePackage: serviceFilter }),
    rating: ratingFilter,
    ...(search && { search }),
    sort: sortMode,
  };

  const historyQuery = useQuery({
    queryKey: ["staff-history", params],
    queryFn: () => getStaffSessionHistory(params),
    placeholderData: (prev) => prev,
  });

  const summary = historyQuery.data?.summary;
  const items = historyQuery.data?.items ?? [];
  const pagination = historyQuery.data?.pagination;

  function applySearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setPeriod("7DAYS");
    setServiceFilter("");
    setRatingFilter("ALL");
    setSortMode("COMPLETED_DESC");
    setPage(1);
  }

  function changePage(next: number) {
    if (!pagination) return;
    if (next < 1 || next > pagination.totalPages) return;
    setPage(next);
  }

  return (
    <WorkspacePage className="space-y-5">
      {/* ── Summary metrics ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CheckCircle2} label="Completed sessions" value={summary?.completedTotal ?? "--"} detail="Current filter results" tone="emerald" />
        <Metric icon={CalendarCheck2} label="Completed today" value={summary?.completedToday ?? "--"} detail={formatDate(new Date())} tone="cyan" />
        <Metric icon={Clock3} label="Avg. handling time" value={summary?.averageDurationMinutes != null ? `${summary.averageDurationMinutes} min` : "--"} detail="From start to completion" tone="amber" />
        <Metric icon={Star} label="Average rating" value={summary?.averageRating != null ? `${summary.averageRating.toFixed(1)}/5` : "--/5"} detail="From reviewed sessions" tone="yellow" />
      </div>

      {/* ── Filters ── */}
      <Card className="rounded-xl border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 xl:grid-cols-[minmax(260px,1fr)_repeat(4,minmax(130px,160px))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              onBlur={applySearch}
              placeholder="Plate, customer, phone..."
              className="h-10 rounded-lg pl-9 text-sm"
            />
          </div>
          <Select value={period} onChange={(v) => { setPeriod(v as PeriodFilter); setPage(1); }} options={[["ALL", "All time"], ["TODAY", "Today"], ["7DAYS", "Last 7 days"], ["MONTH", "This month"]]} />
          <Select value={ratingFilter} onChange={(v) => { setRatingFilter(v as RatingFilter); setPage(1); }} options={[["ALL", "All ratings"], ["5", "5 stars"], ["4", "4 stars"], ["LOW", "Below 4 stars"], ["NONE", "Not rated"]]} />
          <Select value={sortMode} onChange={(v) => { setSortMode(v as SortMode); setPage(1); }} options={[["COMPLETED_DESC", "Newest first"], ["COMPLETED_ASC", "Oldest first"], ["DURATION_DESC", "Longest duration"], ["RATING_ASC", "Lowest rating"]]} />
          <Button variant="ghost" className="h-10 rounded-md border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50" onClick={resetFilters}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear filters
          </Button>
        </div>
      </Card>

      {/* ── Table ── */}
      <section className="space-y-3">
        {historyQuery.isError ? (
          <WorkspaceEmptyState title="Unable to load history" description={getErrorMessage(historyQuery.error as unknown as ApiErrorResponse)} />
        ) : historyQuery.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <WorkspaceEmptyState title="No sessions found" description="Try adjusting your search or filters." />
        ) : (
          <Card className={cn("overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm transition-opacity", historyQuery.isFetching && "opacity-60")}>
            <div className="hidden grid-cols-[1.15fr_1.1fr_0.85fr_0.75fr_1fr_140px] border-b border-slate-100 px-4 py-3 text-[11px] font-black uppercase text-blue-900 lg:grid">
              <span>Vehicle &amp; Customer</span>
              <span>Service</span>
              <span>Handling time</span>
              <span>Rating</span>
              <span>Notes</span>
              <span className="text-right">Status &amp; Action</span>
            </div>
            {items.map((item) => (
              <HistoryRow key={item.sessionId} item={item} onViewDetails={setSelectedItem} />
            ))}
          </Card>
        )}

        {/* ── Pagination ── */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-1 pt-1">
            <p className="text-xs font-semibold text-slate-500">
              Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.totalItems)} of {pagination.totalItems} sessions
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 rounded-md p-0" disabled={pagination.page <= 1} onClick={() => changePage(pagination.page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <Button key={p} variant={p === pagination.page ? "default" : "outline"} size="sm" className={cn("h-8 w-8 rounded-md p-0 text-xs font-bold", p === pagination.page && "shadow-sm")} onClick={() => changePage(p)}>
                  {p}
                </Button>
              ))}
              <Button variant="outline" size="sm" className="h-8 w-8 rounded-md p-0" disabled={pagination.page >= pagination.totalPages} onClick={() => changePage(pagination.page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ── Session Detail Dialog ── */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-lg rounded-xl p-0 overflow-hidden">
          {selectedItem && <SessionDetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />}
        </DialogContent>
      </Dialog>
    </WorkspacePage>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────

function HistoryRow({ item, onViewDetails }: { item: StaffSessionHistoryItem; onViewDetails: (item: StaffSessionHistoryItem) => void }) {
  const isLowRating = item.review.rating !== null && (item.review.rating ?? 99) < 4;
  const serviceName = item.servicePackage ?? item.packageId ?? "Wash service";

  return (
    <div className={cn("grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 lg:grid-cols-[1.15fr_1.1fr_0.85fr_0.75fr_1fr_140px] lg:items-center", isLowRating && "border-l-2 border-l-amber-400 bg-amber-50/55")}>
      <div className="min-w-0">
        <p className="truncate text-base font-black text-slate-950">{item.vehiclePlate}</p>
        <p className="truncate text-xs font-semibold text-slate-500">{item.customerName} · {item.customerPhone}</p>
        <p className="truncate text-[11px] text-slate-400">{item.bookingDate} {item.bookingTime}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-900">{serviceName}</p>
        <p className="truncate text-xs font-semibold text-slate-500">{item.assignedStaffName ?? "Unassigned"}</p>
      </div>
      <div>
        <p className="text-sm font-black text-slate-900">
          {formatTime(item.startedAt)}<span className="px-1 text-slate-400">→</span>{formatTime(item.completedAt)}
        </p>
        <p className="text-xs font-semibold text-slate-500">{item.durationMinutes != null ? `${item.durationMinutes} min` : "--"}</p>
      </div>
      <RatingCell review={item.review} />
      <div className="min-w-0">
        <div className="flex items-start gap-2 text-xs font-semibold text-slate-600">
          <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-blue-900" />
          <p className="line-clamp-2">
            {item.managerNotes ? `Manager: ${item.managerNotes}` : item.customerNotes ? `Customer: ${item.customerNotes}` : "No notes"}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <StatusBadge status={item.status} />
        <Button variant="outline" size="sm" className="h-8 rounded-md px-3 text-xs font-bold" onClick={() => onViewDetails(item)}>
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          View
        </Button>
      </div>
    </div>
  );
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────

function SessionDetailDialog({ item, onClose }: { item: StaffSessionHistoryItem; onClose: () => void }) {
  const serviceName = item.servicePackage ?? item.packageId ?? "Wash service";
  const statusCfg = STATUS_MAP[item.status] ?? STATUS_MAP.PENDING;

  // Timeline steps
  const steps = [
    { label: "Check-in", time: item.checkedInAt },
    { label: "Start",    time: item.startedAt },
    { label: "Done",     time: item.completedAt },
  ];
  const allDone = steps.every((s) => s.time);

  return (
    <div className="flex flex-col bg-white">
      {/* ── Header ── */}
      <div className="flex items-start justify-between px-6 pt-6 pb-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">{item.vehiclePlate}</h2>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-full", statusCfg.dotBg ?? "bg-emerald-500")} />
              <span className={cn("text-base font-bold", statusCfg.dotColor ?? "text-emerald-600")}>{statusCfg.label}</span>
            </div>
            <p className="mt-0.5 text-sm text-slate-400">{formatDateLong(item.completedAt ?? item.bookingDate)}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {/* ── Customer & Service (2-col) ── */}
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="px-6 py-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="text-base font-semibold text-slate-800">{item.customerName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="text-base font-semibold text-slate-800">{item.customerPhone}</span>
              </div>
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Service</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="text-base font-semibold text-slate-800">{serviceName}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="text-base font-semibold text-slate-800">{item.assignedStaffName ?? "Unassigned"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Timeline stepper ── */}
        <div className="px-6 py-5">
          <p className="mb-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Timeline</p>
          <div className="relative flex items-start justify-between">
            {/* connecting line */}
            <div className="absolute left-[20px] right-[20px] top-[20px] h-0.5 bg-emerald-200" />
            {steps.map((step, i) => {
              const done = Boolean(step.time);
              return (
                <div key={i} className="relative z-10 flex flex-1 flex-col items-center gap-2">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full shadow-sm",
                    done
                      ? "bg-emerald-500 text-white"
                      : "border-2 border-slate-200 bg-white text-slate-300",
                  )}>
                    {done ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{step.label}</span>
                  <span className="text-xs font-semibold text-slate-700">{formatTime(step.time)}</span>
                </div>
              );
            })}
          </div>
          {allDone && item.durationMinutes != null && (
            <p className="mt-4 text-right text-sm font-bold text-emerald-600">{item.durationMinutes} min</p>
          )}
        </div>

        {/* ── Payment & Rating (2-col) ── */}
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="px-6 py-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Payment</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="text-base font-bold text-slate-900">See checkout</span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="text-base font-semibold text-slate-700">Cash</span>
              </div>
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Rating</p>
            {item.review.hasReview && item.review.rating != null ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("h-5 w-5", i < item.review.rating! ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                  ))}
                  <span className="ml-1 text-base font-black text-slate-900">{item.review.rating.toFixed(1)}</span>
                </div>
                {item.review.comment && (
                  <div className="flex items-start gap-2">
                    <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-600 italic">"{item.review.comment}"</span>
                  </div>
                )}
              </div>
            ) : (
              <span className="inline-flex rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">
                Not rated
              </span>
            )}
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="px-6 py-5">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Notes</p>
          {item.managerNotes || item.customerNotes ? (
            <div className="space-y-2">
              {item.managerNotes && (
                <div className="flex items-start gap-2">
                  <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">Manager: {item.managerNotes}</p>
                </div>
              )}
              {item.customerNotes && (
                <div className="flex items-start gap-2">
                  <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">Customer: {item.customerNotes}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-base text-slate-400">No notes recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; className: string; dotBg: string; dotColor: string }> = {
  COMPLETED:   { label: "Completed",   className: "border-emerald-200 bg-emerald-50 text-emerald-700",  dotBg: "bg-emerald-500",  dotColor: "text-emerald-600" },
  CANCELLED:   { label: "Cancelled",   className: "border-rose-200 bg-rose-50 text-rose-600",           dotBg: "bg-rose-500",     dotColor: "text-rose-600" },
  IN_PROGRESS: { label: "In progress", className: "border-blue-200 bg-blue-50 text-blue-700",           dotBg: "bg-blue-500",     dotColor: "text-blue-600" },
  CHECKED_IN:  { label: "Checked in",  className: "border-amber-200 bg-amber-50 text-amber-700",        dotBg: "bg-amber-400",    dotColor: "text-amber-600" },
  QUEUED:      { label: "Queued",      className: "border-purple-200 bg-purple-50 text-purple-700",     dotBg: "bg-purple-500",   dotColor: "text-purple-600" },
  PENDING:     { label: "Pending",     className: "border-slate-200 bg-slate-100 text-slate-600",       dotBg: "bg-slate-400",    dotColor: "text-slate-500" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.PENDING;
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", cfg.className)}>
      {cfg.label}
    </span>
  );
}

function RatingCell({ review }: { review: StaffSessionHistoryItem["review"] }) {
  if (!review.hasReview || review.rating == null) {
    return <span className="w-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">Not rated</span>;
  }
  return (
    <div>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={cn("h-3.5 w-3.5", i < review.rating! ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
        ))}
        <span className="ml-1 text-xs font-black text-slate-900">{review.rating.toFixed(1)}</span>
      </div>
      {review.comment && (
        <span className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold", review.rating < 4 ? "bg-orange-50 text-orange-700" : "bg-cyan-50 text-cyan-700")}>
          Has feedback
        </span>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof CheckCircle2; label: string; value: number | string; detail: string; tone: "emerald" | "cyan" | "amber" | "yellow" }) {
  const styles = { emerald: "bg-emerald-50 text-emerald-700", cyan: "bg-cyan-50 text-cyan-700", amber: "bg-orange-50 text-orange-700", yellow: "bg-yellow-50 text-yellow-600" };
  return (
    <Card className="rounded-xl border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", styles[tone])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase text-blue-900/70">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
          <p className="truncate text-xs font-semibold text-blue-900/60">{detail}</p>
        </div>
      </div>
    </Card>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: ReadonlyArray<readonly [string, string]> }) {
  return (
    <select
      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select>
  );
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatTime(value?: string | null) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLong(value?: string | null) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US");
}
