"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  RefreshCw,
  Search,
  ClipboardList,
  X,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Calendar } from "@/shared/ui/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/ui/popover";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/ui/table";
import { Badge } from "@/shared/ui/ui/badge";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { useAdminBookings, useAdminBookingSummary } from "@/features/bookings/hooks/use-admin-bookings";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { apiClient } from "@/shared/lib/api";
import { formatIntegerRating } from "@/shared/lib/rating-format";
import type { ApiSuccessResponse } from "@/shared/types/api.types";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

// Purple Ban compliant status styling
const STATUS_TONE: Record<string, string> = {
  CONFIRMED: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50",
  CHECKED_IN: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50", // Changed from purple to Indigo
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
  CANCELLED: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-50",
  NO_SHOW: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50",
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50",
};

function translateStatus(status: string, lang: "vi" | "en") {
  const map: Record<string, { vi: string; en: string }> = {
    PENDING: { vi: "Chờ xác nhận", en: "Pending" },
    CONFIRMED: { vi: "Đã xác nhận", en: "Confirmed" },
    CHECKED_IN: { vi: "Đã nhận xe", en: "Checked-in" },
    IN_PROGRESS: { vi: "Đang rửa xe", en: "In progress" },
    COMPLETED: { vi: "Hoàn thành", en: "Completed" },
    CANCELLED: { vi: "Đã hủy", en: "Cancelled" },
    NO_SHOW: { vi: "Vắng mặt", en: "No-show" },
  };
  return map[status]?.[lang] || status;
}

export function AdminBookingsPageContent() {
  const getErrorMessage = useErrorMessage();
  const { language } = useLanguageStore();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    status: "ALL",
    date: "",
    customerName: "",
    packageId: "ALL",
  });

  // Fetch Stats Summary
  const summaryQuery = useAdminBookingSummary();

  // Fetch Packages for filter dropdown
  const packagesQuery = useQuery({
    queryKey: ["admin-packages-filter-list"],
    queryFn: async () => {
      const response = await apiClient.get<ApiSuccessResponse<any[]>>("/admin/packages");
      return response.data.data;
    },
    staleTime: 5 * 60_000,
  });

  const bookingsQuery = useAdminBookings(page, limit, {
    searchQuery: filters.customerName || undefined,
    status: filters.status !== "ALL" ? filters.status : undefined,
    dateFrom: filters.date || undefined,
    dateTo: filters.date || undefined,
  });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters, limit]);

  const handleResetFilters = () => {
    setFilters({ status: "ALL", date: "", customerName: "", packageId: "ALL" });
  };

  const handleRefreshAll = () => {
    bookingsQuery.refetch();
    summaryQuery.refetch();
    packagesQuery.refetch();
  };

  // Client side filtering for package if selected
  const filteredBookings = useMemo(() => {
    if (!bookingsQuery.data?.items) return [];
    if (filters.packageId === "ALL") return bookingsQuery.data.items;
    
    // Filter by package ID
    return bookingsQuery.data.items.filter(item => {
      const targetPackage = packagesQuery.data?.find(p => p.packageId === filters.packageId);
      if (!targetPackage) return true;
      return item.primaryItemName === targetPackage.name;
    });
  }, [bookingsQuery.data, filters.packageId, packagesQuery.data]);

  const totalPages = Math.max(bookingsQuery.data?.pagination.totalPages || 1, 1);
  const totalItems = bookingsQuery.data?.pagination.total || 0;

  const kpis = summaryQuery.data;

  return (
    <div className="p-4 md:p-8 bg-slate-50/50 min-h-screen">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              {translate(language, "Quản lý đặt lịch", "Booking Management")}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {translate(
                language,
                "Theo dõi lịch hẹn, phân công nhân viên, gói dịch vụ và trạng thái khách hàng",
                "Track appointments, assigned staff, service packages, and customer status"
              )}
            </p>
          </div>
        </div>

        {/* ─── KPI Statistics Cards ───────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-cyan-50 rounded-xl text-cyan-600">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {translate(language, "Tổng số đặt lịch", "Total bookings")}
                </p>
                <p className="text-2xl font-black text-slate-800 mt-1">
                  {summaryQuery.isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                  ) : (
                    kpis?.totalBookings ?? 0
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-cyan-50 rounded-xl text-cyan-600">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {translate(language, "Đặt lịch hôm nay", "Today's bookings")}
                </p>
                <p className="text-2xl font-black text-slate-800 mt-1">
                  {summaryQuery.isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                  ) : (
                    kpis?.todayBookings ?? 0
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {translate(language, "Đang thực hiện", "In progress")}
                </p>
                <p className="text-2xl font-black text-slate-800 mt-1">
                  {summaryQuery.isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                  ) : (
                    kpis?.inProgress ?? 0
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {translate(language, "Combo hoàn thành", "Completed combo sessions")}
                </p>
                <p className="text-2xl font-black text-slate-800 mt-1">
                  {summaryQuery.isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                  ) : (
                    kpis?.completedComboSessions ?? 0
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Filtering Area ─────────────────────────────────────────── */}
        <Card className="border border-slate-100 bg-white p-4 shadow-sm rounded-2xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            
            {/* Search customer/plate/phone */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={filters.customerName}
                onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                placeholder={translate(language, "Tìm khách hàng, biển số, số điện thoại...", "Search customer, plate, phone...")}
                className="pl-10 h-10 border-slate-200 focus-visible:ring-cyan-500 rounded-xl text-sm"
              />
            </div>

            {/* Status Select */}
            <div className="w-full lg:w-44">
              <Select
                value={filters.status}
                onValueChange={(val) => setFilters({ ...filters, status: val })}
              >
                <SelectTrigger className="h-10 border-slate-200 rounded-xl text-sm">
                  <SelectValue placeholder={translate(language, "Tất cả trạng thái", "All status")} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">{translate(language, "Tất cả trạng thái", "All status")}</SelectItem>
                  <SelectItem value="PENDING">{translate(language, "Chờ xác nhận", "Pending")}</SelectItem>
                  <SelectItem value="CONFIRMED">{translate(language, "Đã xác nhận", "Confirmed")}</SelectItem>
                  <SelectItem value="CHECKED_IN">{translate(language, "Đã nhận xe", "Checked-in")}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{translate(language, "Đang rửa xe", "In progress")}</SelectItem>
                  <SelectItem value="COMPLETED">{translate(language, "Hoàn thành", "Completed")}</SelectItem>
                  <SelectItem value="CANCELLED">{translate(language, "Đã hủy", "Cancelled")}</SelectItem>
                  <SelectItem value="NO_SHOW">{translate(language, "Vắng mặt", "No-show")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Package Select */}
            <div className="w-full lg:w-52">
              <Select
                value={filters.packageId}
                onValueChange={(val) => setFilters({ ...filters, packageId: val })}
              >
                <SelectTrigger className="h-10 border-slate-200 rounded-xl text-sm">
                  <SelectValue placeholder={translate(language, "Tất cả gói dịch vụ", "All packages")} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">{translate(language, "Tất cả gói dịch vụ", "All packages")}</SelectItem>
                  {packagesQuery.data?.map((pkg) => (
                    <SelectItem key={pkg.packageId} value={pkg.packageId}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            <div className="w-full lg:w-48">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white h-10 border-slate-200 rounded-xl text-sm text-slate-700",
                      !filters.date && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                    {filters.date ? (
                      new Date(filters.date).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    ) : (
                      <span>{translate(language, "Chọn ngày", "Pick a date")}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.date ? new Date(filters.date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, "0");
                        const day = String(date.getDate()).padStart(2, "0");
                        setFilters({ ...filters, date: `${year}-${month}-${day}` });
                      } else {
                        setFilters({ ...filters, date: "" });
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetFilters}
                className="h-10 border-slate-200 text-slate-600 font-semibold rounded-xl text-sm px-4"
              >
                {translate(language, "Đặt lại", "Reset")}
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleRefreshAll}
                className="h-10 w-10 p-0 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
                disabled={bookingsQuery.isFetching || summaryQuery.isFetching}
              >
                <RefreshCw className={cn("h-4 w-4", (bookingsQuery.isFetching || summaryQuery.isFetching) && "animate-spin")} />
              </Button>
            </div>
          </div>
        </Card>

        {/* ─── Table Section ──────────────────────────────────────────── */}
        {bookingsQuery.isPending ? (
          <Card className="border border-slate-100 bg-white p-12 text-center text-slate-400 rounded-2xl">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-600" />
            {translate(language, "Đang tải danh sách đặt lịch...", "Loading bookings...")}
          </Card>
        ) : bookingsQuery.isError ? (
          <Card className="border-rose-100 bg-rose-50/50 p-12 text-center text-rose-700 rounded-2xl">
            {getErrorMessage(bookingsQuery.error)}
          </Card>
        ) : filteredBookings.length === 0 ? (
          <Card className="border border-slate-100 bg-white p-12 text-center text-slate-400 rounded-2xl">
            {translate(language, "Không tìm thấy dữ liệu đặt lịch phù hợp.", "No matching booking data found.")}
          </Card>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider pl-6">
                    {translate(language, "ĐẶT LỊCH / KHÁCH HÀNG", "BOOKING / CUSTOMER")}
                  </TableHead>
                  <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider">
                    {translate(language, "PHƯƠNG TIỆN", "VEHICLE")}
                  </TableHead>
                  <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider">
                    {translate(language, "GÓI DỊCH VỤ / NHÂN VIÊN", "PACKAGE / STAFF")}
                  </TableHead>
                  <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider">
                    {translate(language, "THỜI GIAN", "TIME")}
                  </TableHead>
                  <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider">
                    {translate(language, "THỜI LƯỢNG", "DURATION")}
                  </TableHead>
                  <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider">
                    {translate(language, "ĐÁNH GIÁ", "RATING")}
                  </TableHead>
                  <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider">
                    {translate(language, "GHI CHÚ PHIÊN RỬA", "SESSION NOTE")}
                  </TableHead>
                  <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider">
                    {translate(language, "TRẠNG THÁI", "STATUS")}
                  </TableHead>
                  <TableHead className="font-bold text-slate-500 py-4 uppercase text-[11px] tracking-wider text-right pr-6">
                    {translate(language, "HÀNH ĐỘNG", "ACTION")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((row) => (
                  <TableRow key={row.bookingId} className="border-b border-slate-100 hover:bg-slate-50/40">
                    
                    {/* Booking/Customer */}
                    <TableCell className="py-4 pl-6">
                      <div className="font-bold text-slate-800 text-sm">{row.customerName}</div>
                      <div className="text-xs text-slate-400 font-semibold mt-0.5">{row.customerPhone}</div>
                    </TableCell>

                    {/* Vehicle */}
                    <TableCell className="py-4 font-mono font-bold text-xs text-slate-700">
                      {row.vehiclePlate}
                    </TableCell>

                    {/* Package/Staff */}
                    <TableCell className="py-4">
                      <div className="text-sm font-semibold text-slate-700">
                        {row.primaryItemName || translate(language, "Dịch vụ tùy chỉnh", "Custom Service")}
                      </div>
                      <div className="text-xs text-slate-400 font-semibold mt-0.5">
                        {formatAssignedStaff(row.assignedStaff, row.staffName) || translate(language, "Chưa phân công", "Not assigned")}
                      </div>
                    </TableCell>

                    {/* Scheduled Time */}
                    <TableCell className="py-4">
                      <div className="text-sm font-semibold text-slate-700">
                        {formatDate(row.bookingDate, language as "vi" | "en")}
                      </div>
                      <div className="text-xs text-slate-400 font-semibold mt-0.5">
                        {formatTimeRange(row.bookingTime, row.durationMinutes || 0)}
                      </div>
                    </TableCell>

                    {/* Duration */}
                    <TableCell className="py-4 text-sm text-slate-600 font-semibold">
                      {row.durationMinutes ? (
                        row.durationMinutes >= 60 ? (
                          `${Math.floor(row.durationMinutes / 60)} hr ${row.durationMinutes % 60} min`
                        ) : (
                          `${row.durationMinutes} min`
                        )
                      ) : (
                        "-"
                      )}
                    </TableCell>

                    {/* Rating */}
                    <TableCell className="py-4">
                      {row.rating ? (
                        <div className="inline-flex items-center gap-1 text-amber-500 font-bold text-sm bg-amber-50 px-2 py-0.5 rounded-lg">
                          <Star className="h-3.5 w-3.5 fill-amber-500 stroke-amber-500" />
                          {formatIntegerRating(row.rating)}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>

                    {/* Session Note */}
                    <TableCell className="py-4 text-xs text-slate-500 font-medium max-w-[200px] truncate">
                      {row.sessionNote || <span className="text-slate-300">-</span>}
                    </TableCell>

                    {/* Status badge (no purple) */}
                    <TableCell className="py-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border font-bold rounded-full px-3 py-1 text-xs shrink-0",
                          STATUS_TONE[row.status] || "bg-slate-50 text-slate-600 border-slate-200"
                        )}
                      >
                        {translateStatus(row.status, language as "vi" | "en")}
                      </Badge>
                    </TableCell>

                    {/* Action */}
                    <TableCell className="py-4 text-right pr-6">
                      <Link href={`/admin/bookings/${row.bookingId}`}>
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg gap-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50">
                          <Eye className="h-3.5 w-3.5" />
                          {translate(language, "Xem", "View")}
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ─── Pagination Footer ──────────────────────────────────────── */}
        {bookingsQuery.data && bookingsQuery.data.items.length > 0 && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
            
            {/* Items count info */}
            <div className="text-sm font-semibold text-slate-500">
              {translate(
                language,
                `Đang hiển thị 1 đến ${filteredBookings.length} của ${totalItems} lịch đặt`,
                `Showing 1 to ${filteredBookings.length} of ${totalItems} bookings`
              )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-4 self-center sm:self-auto">
              <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="h-8 w-8 rounded-lg hover:bg-slate-50 text-slate-500"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Simplified page indicators */}
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  const targetPage = i + 1;
                  const isActive = targetPage === page;
                  return (
                    <Button
                      key={targetPage}
                      variant={isActive ? "default" : "ghost"}
                      onClick={() => setPage(targetPage)}
                      className={cn(
                        "h-8 w-8 text-xs font-bold rounded-lg p-0",
                        isActive ? "bg-cyan-600 text-white hover:bg-cyan-700" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {targetPage}
                    </Button>
                  );
                })}

                {totalPages > 5 && (
                  <>
                    <span className="text-slate-400 text-xs px-1">...</span>
                    <Button
                      variant={totalPages === page ? "default" : "ghost"}
                      onClick={() => setPage(totalPages)}
                      className={cn(
                        "h-8 w-8 text-xs font-bold rounded-lg p-0",
                        totalPages === page ? "bg-cyan-600 text-white hover:bg-cyan-700" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 rounded-lg hover:bg-slate-50 text-slate-500"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Page size changer */}
              <div className="flex items-center gap-2">
                <Select
                  value={String(limit)}
                  onValueChange={(val) => setLimit(Number(val))}
                >
                  <SelectTrigger className="h-9 w-24 border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)} className="text-xs">
                        {opt} / {translate(language, "trang", "page")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function formatAssignedStaff(
  assignedStaff: Array<{ staffName: string; sortOrder: number }> | undefined,
  fallback?: string | null,
) {
  const names = (assignedStaff ?? [])
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((staff) => staff.staffName)
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : (fallback ?? "");
}

function formatDate(dateString: string, language: "vi" | "en") {
  try {
    return new Date(dateString).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatTimeRange(timeStr: string, durationMinutes: number) {
  try {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    const formatTime = (d: Date) => {
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };
    
    const startStr = formatTime(date);
    date.setMinutes(date.getMinutes() + durationMinutes);
    const endStr = formatTime(date);
    return `${startStr} → ${endStr}`;
  } catch {
    return timeStr;
  }
}
