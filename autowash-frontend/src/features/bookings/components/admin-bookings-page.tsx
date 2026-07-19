"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, RefreshCcw, Search, ClipboardList, X, Calendar as CalendarIcon } from "lucide-react";
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
import { useAdminBookings } from "@/features/bookings/hooks/use-admin-bookings";

import { useLanguageStore, translate } from "@/shared/store/language.store";

const PAGE_LIMIT = 20;

const STATUS_TONE: Record<string, string> = {
  CONFIRMED: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  CHECKED_IN: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  IN_PROGRESS: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  CANCELLED: "bg-zinc-500/10 text-zinc-600 border-zinc-500/30",
  NO_SHOW: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  PENDING: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
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
  const [filters, setFilters] = useState({
    status: "ALL",
    date: "",
    customerName: "",
  });

  const bookingsQuery = useAdminBookings(page, PAGE_LIMIT, {
    searchQuery: filters.customerName || undefined,
    status: filters.status !== "ALL" ? filters.status : undefined,
    dateFrom: filters.date || undefined,
    dateTo: filters.date || undefined,
  });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const canGoPrev = page > 1;
  const totalPages = Math.max(bookingsQuery.data?.pagination.totalPages || 1, 1);
  const canGoNext = page < totalPages;
  const totalItems = bookingsQuery.data?.pagination.total || 0;
  const currentItemsCount = bookingsQuery.data?.items.length || 0;

  const handleResetFilters = () => {
    setFilters({ status: "ALL", date: "", customerName: "" });
  };

  return (
    <div className="p-4 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="border border-slate-100 bg-white p-4 shadow-sm md:p-5 rounded-2xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="space-y-1.5 flex-[1.5]">
              <Label
                htmlFor="filter-name"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {translate(language, "Tên khách hàng", "Customer name")}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-name"
                  value={filters.customerName}
                  onChange={(event) => setFilters({ ...filters, customerName: event.target.value })}
                  placeholder={translate(language, "Tìm theo tên khách hàng hoặc biển số", "Search by customer name or plate")}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5 flex-1">
              <Label
                htmlFor="filter-status"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {translate(language, "Trạng thái", "Status")}
              </Label>
              <Select
                value={filters.status}
                onValueChange={(next) => setFilters({ ...filters, status: next })}
              >
                <SelectTrigger id="filter-status">
                  <SelectValue placeholder={translate(language, "Tất cả trạng thái", "All status")} />
                </SelectTrigger>
                <SelectContent>
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

            <div className="space-y-1.5 flex-1">
              <Label
                htmlFor="filter-date"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {translate(language, "Ngày đặt lịch", "Scheduled date")}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white h-9",
                      !filters.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.date ? (
                      (() => {
                        const d = new Date(filters.date);
                        return d.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", { year: "numeric", month: "short", day: "numeric" });
                      })()
                    ) : (
                      <span>{translate(language, "Chọn ngày", "Pick a date")}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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

            <div className="flex items-center gap-2 pb-0.5">
              <Button type="button" variant="outline" onClick={handleResetFilters} className="gap-1.5">
                <X className="h-3.5 w-3.5" /> {translate(language, "Đặt lại", "Reset")}
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={() => bookingsQuery.refetch()}
                disabled={bookingsQuery.isFetching}
              >
                <RefreshCcw className={`h-4 w-4 ${bookingsQuery.isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </Card>

        {bookingsQuery.isPending ? (
          <Card className="border-border/50 bg-card/60 p-10 text-center text-sm text-muted-foreground backdrop-blur-xl">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            {translate(language, "Đang tải danh sách đặt lịch...", "Loading bookings...")}
          </Card>
        ) : bookingsQuery.isError ? (
          <Card className="border-rose-200 bg-rose-50 p-10 text-center text-sm text-rose-700">
            {getErrorMessage(bookingsQuery.error)}
          </Card>
        ) : !bookingsQuery.data || bookingsQuery.data.items.length === 0 ? (
          <Card className="border-border/50 bg-card/60 p-10 text-center text-sm text-muted-foreground backdrop-blur-xl">
            {translate(language, "Không tìm thấy dữ liệu đặt lịch.", "No booking data found.")}
          </Card>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead>{translate(language, "Tên khách hàng", "Customer name")}</TableHead>
                  <TableHead>{translate(language, "Biển số xe", "Vehicle plate")}</TableHead>
                  <TableHead>{translate(language, "Gói dịch vụ", "Service package")}</TableHead>
                  <TableHead>{translate(language, "Thời gian đặt", "Scheduled time")}</TableHead>
                  <TableHead>{translate(language, "Nhân viên", "Staff")}</TableHead>
                  <TableHead>{translate(language, "Trạng thái", "Status")}</TableHead>
                  <TableHead className="text-right">{translate(language, "Thao tác", "Action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingsQuery.data.items.map((row) => (
                  <TableRow key={row.bookingId} className="hover:bg-muted/10">
                    <TableCell>
                      <div className="text-sm font-medium">{row.customerName}</div>
                      <div className="text-xs text-muted-foreground">{row.customerPhone}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.vehiclePlate}</TableCell>
                    <TableCell>
                      <div className="text-sm">{row.servicePackageName || translate(language, "Dịch vụ tùy chỉnh", "Custom Service")}</div>
                      <div className="text-xs font-medium text-slate-700">
                        {row.finalAmount.toLocaleString("vi-VN")} VND
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(row.bookingDate, language as "vi" | "en")}</div>
                      <div className="text-xs text-muted-foreground">{row.bookingTime}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-medium text-slate-500">{row.staffName || translate(language, "Chưa phân công", "Not assigned")}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`border font-semibold rounded-full px-3 py-0.5 ${STATUS_TONE[row.status] || "bg-slate-100 text-slate-600"}`}
                      >
                        {translateStatus(row.status, language as "vi" | "en")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/bookings/${row.bookingId}`} className="text-sm font-medium hover:underline text-slate-700">
                        {translate(language, "Xem", "View")}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {bookingsQuery.data && bookingsQuery.data.items.length > 0 && (
          <div className="flex justify-center pt-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-border/50 bg-card/60 p-1.5 shadow-sm backdrop-blur-xl">
              <Button
                variant="outline"
                disabled={!canGoPrev}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="h-10 rounded-full px-6 text-sm font-medium text-slate-500 hover:text-slate-900 border-border/40"
              >
                {translate(language, "Trước", "Prev")}
              </Button>
              <span className="text-sm font-semibold text-slate-600 px-2 min-w-[80px] text-center">
                {translate(language, `Trang ${page} / ${totalPages}`, `Page ${page} / ${totalPages}`)}
              </span>
              <Button
                variant="outline"
                disabled={!canGoNext}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                className="h-10 rounded-full px-6 text-sm font-medium text-slate-500 hover:text-slate-900 border-border/40"
              >
                {translate(language, "Sau", "Next")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
