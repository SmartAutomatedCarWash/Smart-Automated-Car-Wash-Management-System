"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Search,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import { Dialog, DialogContent } from "@/shared/ui/ui/dialog";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { cn } from "@/shared/lib/utils";
import { formatIntegerRating, formatRatingOutOfFive } from "@/shared/lib/rating-format";
import { getActiveStaffOptions, getManagerSessionHistory } from "@/features/operations/lib/operations-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { StaffSessionHistoryItem, StaffSessionHistoryParams } from "@/entities/operations";

type PeriodFilter = "ALL" | "TODAY" | "7DAYS" | "MONTH";
type RatingFilter = "ALL" | "5" | "4" | "LOW" | "NONE";
type SortMode = "COMPLETED_DESC" | "COMPLETED_ASC" | "DURATION_DESC" | "RATING_ASC";

const PAGE_SIZE = 5;
const ALL_STAFF = "ALL";

export function ManagerHistoryView() {
  const getErrorMessage = useErrorMessage();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("7DAYS");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("COMPLETED_DESC");
  const [staffId, setStaffId] = useState(ALL_STAFF);
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<StaffSessionHistoryItem | null>(null);

  const params: StaffSessionHistoryParams = {
    page,
    limit: PAGE_SIZE,
    period,
    rating: ratingFilter,
    sort: sortMode,
    ...(search && { search }),
    ...(staffId !== ALL_STAFF && { staffId }),
  };

  const historyQuery = useQuery({
    queryKey: ["manager-session-history", params],
    queryFn: () => getManagerSessionHistory(params),
    placeholderData: (previous) => previous,
  });

  const staffQuery = useQuery({
    queryKey: ["manager-history", "staff-options"],
    queryFn: getActiveStaffOptions,
  });

  const summary = historyQuery.data?.summary;
  const items = historyQuery.data?.items ?? [];
  const pagination = historyQuery.data?.pagination;

  function applySearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setSearchInput("");
    setPeriod("7DAYS");
    setRatingFilter("ALL");
    setSortMode("COMPLETED_DESC");
    setStaffId(ALL_STAFF);
    setPage(1);
  }

  function changePage(next: number) {
    if (!pagination || next < 1 || next > pagination.totalPages) return;
    setPage(next);
  }

  return (
    <WorkspacePage className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CheckCircle2} label="Completed sessions" value={summary?.completedTotal ?? "--"} detail="Current filters" tone="emerald" />
        <Metric icon={CalendarCheck2} label="Completed today" value={summary?.completedToday ?? "--"} detail={new Date().toLocaleDateString("en-US")} tone="cyan" />
        <Metric icon={Clock3} label="Average time" value={summary?.averageDurationMinutes != null ? `${summary.averageDurationMinutes} min` : "--"} detail="From start to completion" tone="amber" />
        <Metric icon={Star} label="Average rating" value={formatRatingOutOfFive(summary?.averageRating)} detail={`${summary?.reviewedCount ?? 0} reviews`} tone="yellow" />
      </div>

      <Card className="rounded-xl border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:flex-1 lg:min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && applySearch()}
              onBlur={applySearch}
              placeholder="Search plate, customer, phone..."
              className="h-10 w-full rounded-lg pl-9 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:w-auto lg:shrink-0 lg:items-center">
            <Select className="w-full lg:w-[130px] xl:w-[150px]" value={staffId} onChange={(value) => { setStaffId(value); setPage(1); }} options={[[ALL_STAFF, "All staff"], ...(staffQuery.data ?? []).map((staff) => [staff.staffId, staff.staffName] as const)]} />
            <Select className="w-full lg:w-[130px] xl:w-[150px]" value={period} onChange={(value) => { setPeriod(value as PeriodFilter); setPage(1); }} options={[["ALL", "All"], ["TODAY", "Today"], ["7DAYS", "7 days"], ["MONTH", "This month"]]} />
            <Select className="w-full lg:w-[130px] xl:w-[150px]" value={ratingFilter} onChange={(value) => { setRatingFilter(value as RatingFilter); setPage(1); }} options={[["ALL", "All ratings"], ["5", "5 stars"], ["4", "4 stars"], ["LOW", "Below 4"], ["NONE", "No review"]]} />
            <Select className="w-full lg:w-[130px] xl:w-[150px]" value={sortMode} onChange={(value) => { setSortMode(value as SortMode); setPage(1); }} options={[["COMPLETED_DESC", "Newest"], ["COMPLETED_ASC", "Oldest"], ["DURATION_DESC", "Longest"], ["RATING_ASC", "Lowest rating"]]} />
          </div>
          <Button variant="ghost" className="h-10 w-full shrink-0 rounded-md border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 lg:w-auto" onClick={resetFilters}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear filters
          </Button>
        </div>
      </Card>

      {historyQuery.isError ? (
        <WorkspaceEmptyState title="Unable to load history" description={getErrorMessage(historyQuery.error as unknown as ApiErrorResponse)} />
      ) : historyQuery.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
        </div>
      ) : items.length === 0 ? (
        <WorkspaceEmptyState title="No matching sessions" description="Try changing filters or search keywords." />
      ) : (
        <Card className={cn("overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm transition-opacity", historyQuery.isFetching && "opacity-60")}>
          <div className="hidden grid-cols-[1.05fr_1fr_0.8fr_0.75fr_1.2fr_100px] border-b border-slate-100 px-4 py-3 text-[11px] font-black uppercase text-blue-900 lg:grid">
            <span>Vehicle & customer</span>
            <span>Service / Staff</span>
            <span>Time</span>
            <span>Rating</span>
            <span>Notes</span>
            <span className="text-right">Status</span>
          </div>
          {items.map((item) => <HistoryRow key={item.sessionId} item={item} onViewDetails={setSelectedItem} />)}
        </Card>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between px-1 pt-1">
          <p className="text-xs font-semibold text-slate-500">
            Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.totalItems)} / {pagination.totalItems} sessions
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 rounded-md p-0" disabled={pagination.page <= 1} onClick={() => changePage(pagination.page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-black text-slate-600">{pagination.page}/{pagination.totalPages}</span>
            <Button variant="outline" size="sm" className="h-8 w-8 rounded-md p-0" disabled={pagination.page >= pagination.totalPages} onClick={() => changePage(pagination.page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-lg overflow-hidden rounded-xl p-0">
          {selectedItem ? <SessionDetailDialog item={selectedItem} /> : null}
        </DialogContent>
      </Dialog>
    </WorkspacePage>
  );
}

function HistoryRow({ item, onViewDetails }: { item: StaffSessionHistoryItem; onViewDetails: (item: StaffSessionHistoryItem) => void }) {
  const serviceName = item.servicePackage ?? item.packageId ?? "Wash package";
  return (
    <div className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 lg:grid-cols-[1.05fr_1fr_0.8fr_0.75fr_1.2fr_100px] lg:items-center">
      <div className="min-w-0">
        <p className="truncate text-base font-black text-slate-950">#{item.vehiclePlate}</p>
        <p className="truncate text-xs font-semibold text-slate-500">{item.customerName} · {item.customerPhone}</p>
        <p className="truncate text-[11px] text-slate-400">{item.bookingDate} {item.bookingTime}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-900">{serviceName}</p>
        <p className="truncate text-xs font-semibold text-slate-500">{formatHistoryStaff(item)}</p>
      </div>
      <div>
        <p className="text-sm font-black text-slate-900">{formatTime(item.startedAt)} {"->"} {formatTime(item.completedAt)}</p>
        {item.durationMinutes != null && (
          <p className="text-xs font-semibold text-slate-500">{item.durationMinutes} min</p>
        )}
      </div>
      <RatingCell review={item.review} />
      <div className="min-w-0">
        <p className="line-clamp-2 break-words text-xs font-semibold text-slate-600">{item.customerNotes || item.managerNotes || "No notes"}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <StatusBadge status={item.status} />
        <Button variant="outline" size="sm" className="h-8 w-full justify-center rounded-md px-3 text-xs font-bold" onClick={() => onViewDetails(item)}>
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          View
        </Button>
      </div>
    </div>
  );
}

function SessionDetailDialog({ item }: { item: StaffSessionHistoryItem }) {
  return (
    <div className="bg-white">
      <div className="border-b border-slate-100 bg-slate-50/50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-cyan-700">Session History</p>
              <StatusBadge status={item.status} />
            </div>
            <h2 className="mt-2 text-3xl font-black text-slate-950">#{item.vehiclePlate}</h2>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-6 grid gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Customer</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{item.customerName}</p>
            <p className="text-xs font-semibold text-slate-500">{item.customerPhone || "No phone"}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Assigned Staff</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{formatHistoryStaff(item)}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="Service Package" value={item.servicePackage ?? item.packageId ?? "Wash package"} />
          <Info label="Appointment" value={`${item.bookingDate} ${item.bookingTime}`} />
          <Info label="Check-in Time" value={formatDateTime(item.checkedInAt)} />
          <Info label="Completed Time" value={formatDateTime(item.completedAt)} />
          <Info label="Duration" value={item.durationMinutes != null ? `${item.durationMinutes} mins` : "--"} />
          <Info label="Total Price" value={item.totalPrice != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.totalPrice) : "--"} />
        </div>

        {item.services && item.services.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Services</p>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <ul className="space-y-2 text-sm text-slate-600 font-medium">
                {item.services.map((service, index) => (
                  <li key={index} className="flex justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                    <span>{service.snapshotName} x {service.quantity}</span>
                    <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(service.subtotal)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-6">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Review & Rating</p>
          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            {item.review.hasReview && item.review.rating != null ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-black text-slate-900">{formatIntegerRating(item.review.rating)}/5</span>
                </div>
                <span className="text-sm font-semibold text-slate-600">
                  {item.review.comment ? `· ${item.review.comment}` : ""}
                </span>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-500">No review yet</p>
            )}
          </div>
        </div>
      </div>
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

function Select({ value, onChange, options, className }: { value: string; onChange: (value: string) => void; options: ReadonlyArray<readonly [string, string]>; className?: string }) {
  return (
    <select className={cn("h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100", className)} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
    </select>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isCompleted = status === "COMPLETED";
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", isCompleted ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600")}>
      {isCompleted ? "Completed" : status}
    </span>
  );
}

function RatingCell({ review }: { review: StaffSessionHistoryItem["review"] }) {
  if (!review.hasReview || review.rating == null) {
    return <span className="w-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">No review</span>;
  }
  return (
    <div className="flex items-center gap-1">
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      <span className="text-xs font-black text-slate-900">{formatIntegerRating(review.rating)}</span>
    </div>
  );
}

function formatHistoryStaff(item: StaffSessionHistoryItem) {
  const names = (item.assignedStaff ?? [])
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((staff) => staff.staffName)
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : (item.assignedStaffName ?? "Unassigned");
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function formatTime(value?: string | null) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("en-US") : "Not available";
}
