"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { useQuery } from "@tanstack/react-query";
import { listBookingStaffOptions } from "@/features/bookings/lib/booking-service";
import { cn } from "@/shared/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";
import {
  useAdminBookingDetail,
  useRefundAdminVnpayPayment,
  useUpdateAdminBookingStatus,
  useUpdateAdminBookingStaff,
  useAdminVehicleDetail,
} from "../hooks/use-admin-booking-detail";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Clock,
  User,
  Car,
  CreditCard,
  CheckCircle,
  XCircle,
  Copy,
  Printer,
  MoreVertical,
  Star,
  MessageSquare,
  Award,
  ChevronRight,
  FileText,
  BadgeAlert,
  ShieldAlert,
  Info,
  UserRound
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/ui/select";
import { Badge } from "@/shared/ui/ui/badge";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import type { BookingStatus } from "@/entities/bookings";

function translateStatus(st: string, lang: "vi" | "en") {
  const map: Record<string, { vi: string; en: string }> = {
    PENDING: { vi: "Chờ xác nhận", en: "Pending" },
    CONFIRMED: { vi: "Đã xác nhận", en: "Confirmed" },
    CHECKED_IN: { vi: "Đã nhận xe", en: "Checked-in" },
    IN_PROGRESS: { vi: "Đang rửa xe", en: "In progress" },
    COMPLETED: { vi: "Hoàn thành", en: "Completed" },
    CANCELLED: { vi: "Đã hủy", en: "Cancelled" },
    NO_SHOW: { vi: "Vắng mặt", en: "No-show" },
  };
  return map[st]?.[lang] || st;
}

const MAIN_BOOKING_STATUS_FLOW: BookingStatus[] = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"];
const SIDE_BOOKING_STATUSES: BookingStatus[] = ["CANCELLED", "NO_SHOW"];
const TERMINAL_BOOKING_STATUSES: BookingStatus[] = ["COMPLETED", "CANCELLED", "NO_SHOW"];

function getAllowedNextStatuses(currentStatus: BookingStatus): BookingStatus[] {
  if (TERMINAL_BOOKING_STATUSES.includes(currentStatus)) {
    return [];
  }

  const currentIndex = MAIN_BOOKING_STATUS_FLOW.indexOf(currentStatus);
  const nextMainStatuses = currentIndex >= 0 ? MAIN_BOOKING_STATUS_FLOW.slice(currentIndex + 1) : [];
  return [...nextMainStatuses, ...SIDE_BOOKING_STATUSES];
}

function translatePaymentMethod(method: string, lang: "vi" | "en") {
  const map: Record<string, { vi: string; en: string }> = {
    E_WALLET: { vi: "VNPay", en: "VNPay" },
    CASH_AT_COUNTER: { vi: "Tiền mặt tại quầy", en: "Cash at counter" },
    BANK_TRANSFER: { vi: "SePay", en: "SePay" },
    VNPAY: { vi: "Cổng thanh toán VNPAY", en: "VNPAY Gate" },
    CASH: { vi: "Tiền mặt", en: "Cash" },
    PAYMENT_LINK: { vi: "Link thanh toán", en: "Payment Link" },
  };
  return map[method]?.[lang] || method.replace(/_/g, " ");
}

function translatePaymentStatus(status: string, lang: "vi" | "en") {
  const map: Record<string, { vi: string; en: string }> = {
    UNPAID: { vi: "Chưa thanh toán", en: "Unpaid" },
    PENDING: { vi: "Chờ thanh toán", en: "Pending" },
    PENDING_PAYMENT: { vi: "Chờ thanh toán", en: "Pending payment" },
    PAID: { vi: "Đã thanh toán", en: "Paid" },
    FAILED: { vi: "Thanh toán lỗi", en: "Failed" },
    CANCELLED: { vi: "Đã hủy thanh toán", en: "Cancelled" },
    REFUND_PENDING: { vi: "Chờ hoàn tiền", en: "Refund pending" },
    PARTIALLY_REFUNDED: { vi: "Đã hoàn một phần", en: "Partially refunded" },
    REFUND_FAILED: { vi: "Hoàn tiền lỗi", en: "Refund failed" },
    REFUNDED: { vi: "Đã hoàn tiền", en: "Refunded" },
  };
  return map[status]?.[lang] || status;
}

export function AdminBookingDetail({ bookingId }: { bookingId: string }) {
  const getErrorMessage = useErrorMessage();
  const router = useRouter();
  const { language } = useLanguageStore();
  const { data: booking, isPending, isError, error } = useAdminBookingDetail(bookingId);
  const refundVnpayMutation = useRefundAdminVnpayPayment(bookingId);
  const updateStatusMutation = useUpdateAdminBookingStatus(bookingId);
  const updateStaffMutation = useUpdateAdminBookingStaff(bookingId);
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | "">("");
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  const staffOptionsQuery = useQuery({
    queryKey: ["booking-staff-options", bookingId],
    queryFn: () => {
      const packageDetail = booking?.details.find((detail: any) => detail.itemType === "PACKAGE");
      const comboDetail = booking?.details.find((detail: any) => detail.itemType === "COMBO");
      return listBookingStaffOptions({
        packageId: packageDetail?.refId,
        comboId: comboDetail?.refId,
        options: booking?.details
          .filter((detail: any) => detail.itemType === "ADDON" || detail.itemType === "OPTION")
          .map((detail: any) => detail.refId) ?? [],
        bookingDate: booking?.scheduling.bookingDate ?? "",
        bookingTime: booking?.scheduling.bookingTime ?? "",
      });
    },
    enabled: Boolean(bookingId && booking && booking.status === "CONFIRMED" && isStaffModalOpen),
  });

  const staffOptions = staffOptionsQuery.data ?? [];

  const handleOpenStaffModal = () => {
    const currentStaff = booking?.assignedStaff?.[0]?.staffId ?? "";
    setSelectedStaffId(currentStaff);
    setIsStaffModalOpen(true);
  };

  const handleUpdateStaff = async () => {
    if (!selectedStaffId) {
      toast.error("Vui lòng chọn nhân viên / Please select a staff member");
      return;
    }
    try {
      await updateStaffMutation.mutateAsync([selectedStaffId]);
      toast.success("Cập nhật nhân viên thành công / Staff updated successfully");
      setIsStaffModalOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e as any));
    }
  };

  useEffect(() => {
    if (booking?.status) {
      setSelectedStatus("");
    }
  }, [booking?.status]);

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-slate-500">
        <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-600" />
        <p className="text-sm font-medium animate-pulse">
          {translate(language, "Đang tải chi tiết lịch đặt...", "Loading booking details...")}
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 text-rose-700 m-8 max-w-2xl mx-auto shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <ShieldAlert className="h-6 w-6 text-rose-600" />
          <h2 className="text-lg font-bold">
            {translate(language, "Lỗi khi tải lịch đặt", "Error Loading Booking")}
          </h2>
        </div>
        <p className="text-sm text-rose-600/90 mb-4">{getErrorMessage(error)}</p>
        <Button onClick={() => router.back()} variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-100/50">
          {translate(language, "Quay lại", "Go Back")}
        </Button>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center p-12 text-slate-500 max-w-md mx-auto">
        <BadgeAlert className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-base font-semibold">{translate(language, "Không tìm thấy lịch đặt.", "Booking not found.")}</p>
        <Button onClick={() => router.back()} className="mt-4" variant="outline">
          {translate(language, "Quay lại danh sách", "Back to list")}
        </Button>
      </div>
    );
  }

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount == null) return "0 VND";
    return amount.toLocaleString("vi-VN") + " VND";
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100";
      case "CHECKED_IN":
        return "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-100";
      case "IN_PROGRESS":
        return "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100";
      case "CANCELLED":
        return "bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100";
      case "NO_SHOW":
        return "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100";
    }
  };

  const availableStatuses = getAllowedNextStatuses(booking.status);
  const statusDirty = Boolean(selectedStatus && selectedStatus !== booking.status);
  const isVnpayPayment = booking.payment.method === "E_WALLET";
  const isSepayPayment = booking.payment.method === "BANK_TRANSFER";
  const hasSepayTransferInfo = isSepayPayment && Boolean(
    booking.payment.qrUrl ||
    booking.payment.bankCode ||
    booking.payment.accountNumber ||
    booking.payment.accountName ||
    booking.payment.transferDescription ||
    booking.payment.transactionId
  );
  const canRefundVnpay = isVnpayPayment && booking.payment.status === "PAID";

  const handleSaveStatus = async () => {
    if (!selectedStatus || selectedStatus === booking.status) {
      return;
    }
    try {
      await updateStatusMutation.mutateAsync(selectedStatus);
      toast.success(translate(language, "Đã lưu trạng thái lịch đặt.", "Booking status saved."));
    } catch (statusError) {
      toast.error(getErrorMessage(statusError));
    }
  };

  const handleRefundVnpay = async () => {
    try {
      const confirmed = window.confirm(
        translate(
          language,
          "Hoàn tiền toàn bộ giao dịch VNPay này?",
          "Refund this VNPay payment in full?"
        )
      );
      if (!confirmed) return;
      const result = await refundVnpayMutation.mutateAsync(undefined);
      toast.success(result.message || translate(language, "Đã gửi yêu cầu hoàn tiền VNPay.", "VNPay refund requested."));
    } catch (refundError) {
      toast.error(getErrorMessage(refundError));
    }
  };

  const handleCopyText = async (value: string | null | undefined, successMessage: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error(translate(language, "Không thể sao chép.", "Could not copy."));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Define steps for booking timeline stepper
  const timelineSteps = [
    { key: "PENDING", label: translate(language, "Chờ xác nhận", "Created"), dateField: booking.createdAt },
    { key: "CONFIRMED", label: translate(language, "Đã xác nhận", "Confirmed"), dateField: null },
    { key: "CHECKED_IN", label: translate(language, "Đã nhận xe", "Checked-In"), dateField: null },
    { key: "IN_PROGRESS", label: translate(language, "Đang làm sạch", "In Progress"), dateField: null },
    { key: "COMPLETED", label: translate(language, "Đã hoàn thành", "Completed"), dateField: null }
  ];

  // Map backend history records to corresponding steps
  if (booking.statusHistory) {
    booking.statusHistory.forEach((h) => {
      const step = timelineSteps.find((s) => s.key === h.newStatus);
      if (step) {
        step.dateField = h.changedAt;
      }
    });
  }

  const currentStepIndex = timelineSteps.findIndex((s) => s.key === booking.status);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto print:p-0 print:max-w-none">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-6 print:hidden">
        <div className="space-y-1">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {translate(language, "Quay lại danh sách", "Back to bookings")}
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {translate(language, "Chi tiết lịch đặt", "Booking Detail")}
            </h1>
            <span className="text-sm font-medium text-slate-400">
              #{booking.confirmationNumber}
            </span>
            <Badge variant="outline" className={`font-bold px-3 py-1 rounded-full text-xs border ${statusColor(booking.status)}`}>
              {translateStatus(booking.status, language as "vi" | "en")}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 px-3 text-slate-600 border-slate-200">
            <Printer className="h-4 w-4 mr-2" />
            {translate(language, "In hóa đơn", "Print")}
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 text-slate-600 border-slate-200">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Top Operations Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Booking Date Card */}
        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {translate(language, "Ngày đặt lịch", "Booking Date")}
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                {new Date(booking.scheduling.bookingDate).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="text-xs text-slate-500">
                {booking.scheduling.bookingTime.substring(0, 5)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Duration/Time Card */}
        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {translate(language, "Khung thời gian", "Time Frame")}
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                {booking.scheduling.bookingTime.substring(0, 5)} - {booking.scheduling.estimatedEndTime}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {booking.scheduling.estimatedDuration} {translate(language, "phút", "mins")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Main Service Package Card */}
        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <Award className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {translate(language, "Gói dịch vụ", "Service Package")}
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                {booking.primaryItemName || translate(language, "Dịch vụ tùy chỉnh", "Custom Service")}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                ID: PKG-{booking.details[0]?.refId.substring(0, 6).toUpperCase() ?? "CUST"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Staff Card */}
        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                <User className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {translate(language, "Nhân viên phụ trách", "Assigned Staff")}
                </p>
                <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                  {booking.staffName || translate(language, "Chưa phân công", "Not Assigned")}
                </p>
                <p className="text-xs text-slate-500">
                  {booking.assignedStaff && booking.assignedStaff.length > 0
                    ? `ID: ST-${booking.assignedStaff[0].staffId.substring(0, 4).toUpperCase()}`
                    : "--"}
                </p>
              </div>
            </div>
            {booking.status === "CONFIRMED" && !booking.washSessionId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenStaffModal}
                className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold"
              >
                {translate(language, "Đổi", "Change")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Columns (col-span-2) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Services and Pricing Detail */}
          <Card className="border border-slate-100 shadow-sm rounded-3xl bg-white">
            <CardHeader className="border-b border-slate-50 px-6 py-5">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-400" />
                {translate(language, "Hóa đơn & Dịch vụ", "Services & Pricing")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Service list table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-slate-400 font-semibold border-b border-slate-100 pb-3">
                      <th className="pb-3">{translate(language, "Tên dịch vụ", "Service")}</th>
                      <th className="pb-3 text-right">{translate(language, "Thời lượng", "Duration")}</th>
                      <th className="pb-3 text-right">{translate(language, "Giá dịch vụ", "Price")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {/* Primary service package */}
                    {booking.details
                      .filter((d) => d.itemType === "PACKAGE")
                      .map((p) => (
                        <tr key={p.id} className="group hover:bg-slate-50/50">
                          <td className="py-4 font-semibold text-slate-800">
                            {p.snapshotName}
                            <span className="block text-xs font-normal text-slate-400 mt-0.5">
                              {translate(language, "Gói dịch vụ chính", "Primary wash package")}
                            </span>
                          </td>
                          <td className="py-4 text-right text-slate-500 font-medium">{p.durationMinutes} {translate(language, "phút", "min")}</td>
                          <td className="py-4 text-right font-bold text-slate-900">{formatCurrency(p.snapshotPrice)}</td>
                        </tr>
                      ))}

                    {/* Add-ons */}
                    {booking.details
                      .filter((d) => d.itemType === "ADDON")
                      .map((a) => (
                        <tr key={a.id} className="group hover:bg-slate-50/50">
                          <td className="py-4 font-semibold text-slate-700">
                            {a.snapshotName}
                            <span className="block text-xs font-normal text-slate-400 mt-0.5">
                              {translate(language, "Dịch vụ thêm", "Add-on service")}
                            </span>
                          </td>
                          <td className="py-4 text-right text-slate-500 font-medium">{a.durationMinutes} {translate(language, "phút", "min")}</td>
                          <td className="py-4 text-right font-bold text-slate-700">
                            +{formatCurrency(a.snapshotPrice)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Calculations */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between text-sm text-slate-500 font-medium">
                  <span>{translate(language, "Tạm tính", "Subtotal")}</span>
                  <span>{formatCurrency(booking.pricing.subtotal)}</span>
                </div>
                {booking.pricing.discountAmount > 0 && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      {translate(language, "Giảm giá", "Discount")}
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px] uppercase">
                        {booking.pricing.discountCode}
                      </Badge>
                    </span>
                    <span className="text-emerald-600 font-bold">-{formatCurrency(booking.pricing.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <span className="text-base font-bold text-slate-900">{translate(language, "Tổng tiền thanh toán", "Total Paid")}</span>
                  <span className="text-2xl font-black text-blue-600 tracking-tight">
                    {formatCurrency(booking.pricing.finalAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Notes */}
            <Card className="border border-slate-100 shadow-sm rounded-3xl bg-slate-50/50">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {translate(language, "Ghi chú của Khách hàng", "Customer Note")}
                  </h4>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed italic bg-white p-4 rounded-2xl border border-slate-100 min-h-[80px]">
                  {booking.notes || translate(language, "Không có ghi chú nào.", "No specific notes provided.")}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {new Date(booking.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}
                </p>
              </CardContent>
            </Card>

            {/* Wash Session Manager Notes */}
            <Card className="border border-slate-100 shadow-sm rounded-3xl bg-slate-50/50">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <User className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {translate(language, "Ghi chú từ Nhân viên/Quản lý", "Manager Note")}
                  </h4>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed italic bg-white p-4 rounded-2xl border border-slate-100 min-h-[80px]">
                  {booking.washStatus === "CANCELLED" 
                    ? translate(language, "Đã hủy lịch đặt.", "Booking cancelled.") 
                    : booking.notes || translate(language, "Không có ghi chú vận hành.", "No operational notes available.")}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {new Date(booking.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stepper Timeline */}
          <Card className="border border-slate-100 shadow-sm rounded-3xl bg-white">
            <CardHeader className="border-b border-slate-50 px-6 py-5">
              <CardTitle className="text-base font-bold text-slate-800">
                {translate(language, "Dòng thời gian hoạt động", "Booking Timeline")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-0 mt-2">
                {/* Horizontal line for desktop */}
                <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-100 -z-10 hidden md:block" />

                {timelineSteps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex && booking.status !== "CANCELLED";
                  const isCurrent = index === currentStepIndex && booking.status !== "CANCELLED";
                  const isCancelled = booking.status === "CANCELLED" && index >= currentStepIndex;

                  return (
                    <div key={step.key} className="flex md:flex-col items-center md:text-center gap-4 md:gap-2 flex-1 w-full md:w-auto">
                      {/* Step Circle */}
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center border-4 font-bold text-xs shrink-0 transition-all ${
                          isCancelled
                            ? "bg-rose-50 border-rose-200 text-rose-500"
                            : isCurrent
                            ? "bg-blue-600 border-blue-100 text-white shadow-md shadow-blue-100 scale-110"
                            : isCompleted
                            ? "bg-emerald-500 border-emerald-100 text-white"
                            : "bg-white border-slate-100 text-slate-400"
                        }`}
                      >
                        {isCompleted && !isCurrent ? (
                          <CheckCircle className="h-4 w-4 text-white" />
                        ) : (
                          index + 1
                        )}
                      </div>

                      {/* Step Info */}
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${isCurrent ? "text-blue-600" : isCompleted ? "text-slate-800" : "text-slate-400"}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {step.dateField ? (
                            new Date(step.dateField).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US", {
                              hour: "2-digit",
                              minute: "2-digit"
                            }) + " - " + new Date(step.dateField).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")
                          ) : (
                            <span className="italic text-slate-300 font-normal">
                              {translate(language, "Chưa cập nhật", "Pending")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar Columns (col-span-1) */}
        <div className="space-y-6">
          {/* Customer Information Panel */}
          <Card className="border border-slate-100 shadow-sm rounded-3xl bg-white">
            <CardHeader className="border-b border-slate-50 px-6 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800">
                {translate(language, "Khách hàng", "Customer Information")}
              </CardTitle>
              <Link href={`/admin/customers/${booking.customerId}`}>
                <Button variant="link" className="text-xs text-blue-600 font-bold h-auto p-0">
                  {translate(language, "Xem hồ sơ", "View profile")}
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
                  {booking.customerName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{booking.customerName}</h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{booking.customerPhone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Information Panel */}
          <Card className="border border-slate-100 shadow-sm rounded-3xl bg-white">
            <CardHeader className="border-b border-slate-50 px-6 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800">
                {translate(language, "Thông tin xe", "Vehicle Details")}
              </CardTitle>
              <Button
                variant="link"
                className="text-xs text-blue-600 font-bold h-auto p-0"
                onClick={() => setIsVehicleModalOpen(true)}
              >
                {translate(language, "Lịch sử xe", "View vehicle")}
              </Button>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl shrink-0">
                  <Car className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="inline-block text-xs font-black tracking-widest text-slate-900 border border-slate-300 rounded px-1.5 py-0.5 bg-slate-50 font-mono uppercase">
                    {booking.vehiclePlate}
                  </span>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    {booking.vehicleBrand} {booking.vehicleModel}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information Panel */}
          <Card className="border border-slate-100 shadow-sm rounded-3xl bg-white">
            <CardHeader className="border-b border-slate-50 px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-800">
                {translate(language, "Trạng thái thanh toán", "Payment Information")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 uppercase">
                      {translatePaymentMethod(booking.payment.method, language as "vi" | "en")}
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[120px]" title={booking.payment.transactionId ?? ""}>
                      {booking.payment.transactionId || "--"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {booking.payment.status === "PAID" ? (
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      <CheckCircle className="h-3 w-3" />
                      {translate(language, "Đã thanh toán", "Paid")}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                      <XCircle className="h-3 w-3" />
                      {translate(language, "Chưa thanh toán", "Unpaid")}
                    </div>
                  )}
                </div>
              </div>

              {/* SePay Bank Transfer instructions */}
              {hasSepayTransferInfo ? (
                <div className="space-y-3 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4 text-xs">
                  {booking.payment.qrUrl && (
                    <div className="rounded-2xl border border-cyan-100 bg-white p-2">
                      <img
                        src={booking.payment.qrUrl}
                        alt="SePay Transfer QR"
                        className="mx-auto h-auto max-h-48 w-full max-w-[180px] object-contain"
                      />
                    </div>
                  )}
                  <div className="space-y-2 pt-1 font-medium text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{translate(language, "Ngân hàng", "Bank")}</span>
                      <span className="font-bold text-slate-950">{booking.payment.bankCode}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{translate(language, "Số tài khoản", "Account No.")}</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-950">{booking.payment.accountNumber}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 hover:bg-slate-200"
                          onClick={() => handleCopyText(booking.payment.accountNumber, translate(language, "Đã copy số tài khoản.", "Copied account number."))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{translate(language, "Tên tài khoản", "Beneficiary")}</span>
                      <span className="font-bold text-slate-950 uppercase">{booking.payment.accountName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{translate(language, "Nội dung", "Message")}</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-950">{booking.payment.transferDescription}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 hover:bg-slate-200"
                          onClick={() => handleCopyText(booking.payment.transferDescription, translate(language, "Đã copy nội dung.", "Copied description."))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {canRefundVnpay && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-rose-200 text-rose-700 hover:bg-rose-50 rounded-2xl h-10 font-bold text-xs"
                  onClick={handleRefundVnpay}
                  disabled={refundVnpayMutation.isPending}
                >
                  {refundVnpayMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  {translate(language, "Hoàn tiền VNPay", "Refund VNPay")}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Customer Feedback/Review Panel */}
          {booking.review ? (
            <Card className="border border-slate-100 shadow-sm rounded-3xl bg-white">
              <CardHeader className="border-b border-slate-50 px-6 py-4">
                <CardTitle className="text-sm font-bold text-slate-800">
                  {translate(language, "Phản hồi của khách hàng", "Customer Feedback")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4.5 w-4.5 ${
                        star <= (booking.review?.rating ?? 0)
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-200"
                      }`}
                    />
                  ))}
                  <span className="text-sm font-bold text-slate-800 ml-1.5">
                    {booking.review.rating.toFixed(1)}
                  </span>
                </div>
                {booking.review.comment ? (
                  <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 italic leading-relaxed">
                    "{booking.review.comment}"
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {translate(language, "Đánh giá không kèm nhận xét.", "No review comments provided.")}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {new Date(booking.review.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-slate-100 shadow-sm rounded-3xl bg-slate-50/20">
              <CardContent className="p-6 text-center text-slate-400 space-y-2">
                <Info className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold">
                  {translate(language, "Chưa có đánh giá nào", "No feedback available yet")}
                </p>
                <p className="text-[10px] text-slate-400 leading-normal">
                  {translate(language, "Đánh giá sẽ hiển thị khi khách hàng hoàn thành và đánh giá dịch vụ.", "Feedback will show up once customer finishes and rates the service.")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Booking Operation Controls Panel */}
          <Card className="border border-slate-100 shadow-sm rounded-3xl bg-white">
            <CardHeader className="border-b border-slate-50 px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-800">
                {translate(language, "Cập nhật Trạng thái đặt lịch", "Update Status")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  {translate(language, "Chọn trạng thái tiếp theo", "Select status")}
                </label>
                <Select
                  value={selectedStatus || undefined}
                  onValueChange={(value) => setSelectedStatus(value as BookingStatus)}
                  disabled={updateStatusMutation.isPending || availableStatuses.length === 0}
                >
                  <SelectTrigger className={`w-full rounded-2xl h-10 border border-slate-200 text-xs font-bold ${statusColor(selectedStatus || booking.status)}`}>
                    <SelectValue placeholder={translateStatus(booking.status, language as "vi" | "en")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.length > 0 ? (
                      availableStatuses.map((st) => (
                        <SelectItem key={st} value={st} className="text-xs font-semibold">
                          {translateStatus(st, language as "vi" | "en")}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__LOCKED__" disabled className="text-xs font-semibold">
                        {translate(language, "Trạng thái đã khóa", "Status locked")}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={statusDirty ? "default" : "outline"}
                  onClick={handleSaveStatus}
                  className="w-full rounded-2xl h-10 font-bold text-xs"
                  disabled={!statusDirty || updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  {translate(language, "Lưu thay đổi", "Apply Change")}
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                {translate(
                  language,
                  "* Lưu ý: Đổi trạng thái đặt lịch sẽ gửi thông báo tương ứng cho khách hàng và cập nhật tiến độ rửa xe.",
                  "* Note: Changing booking status will notify the customer and update the wash session progress."
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {isVehicleModalOpen && (
        <VehicleDetailModal
          vehicleId={booking.vehicleId}
          onClose={() => setIsVehicleModalOpen(false)}
        />
      )}

      {isStaffModalOpen && (
        <Dialog open={isStaffModalOpen} onOpenChange={setIsStaffModalOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-slate-900">{translate(language, "Phân công nhân viên", "Assign Staff")}</DialogTitle>
              <DialogDescription>
                {translate(
                  language,
                  "Chọn một nhân viên khả dụng cho ca rửa này.",
                  "Select an available staff member for this wash session."
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {staffOptionsQuery.isPending ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#003cff]" />
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {staffOptions.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      {translate(language, "Không có nhân viên nào hoạt động.", "No active staff members.")}
                    </p>
                  ) : (
                    staffOptions.map((staff) => {
                      const busy = staff.available === false;
                      const isCurrent = booking?.assignedStaff?.[0]?.staffId === staff.staffId;
                      return (
                        <button
                          key={staff.staffId}
                          type="button"
                          disabled={busy}
                          onClick={() => setSelectedStaffId(staff.staffId)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl border text-left transition",
                            busy
                              ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                              : selectedStaffId === staff.staffId
                              ? "border-[#003cff] bg-[#003cff]/5 ring-1 ring-[#003cff]"
                              : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                              selectedStaffId === staff.staffId ? "bg-[#003cff] text-white" : "bg-slate-100 text-slate-500"
                            )}>
                              <UserRound className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-sm block text-slate-900 truncate">{staff.staffName}</span>
                              <span className={cn("text-[10px] font-bold", busy ? "text-amber-600" : "text-emerald-700")}>
                                {staffAvailabilityLabel(staff)}
                              </span>
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                              {translate(language, "Hiện tại", "Current")}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsStaffModalOpen(false)}
                className="rounded-xl border-slate-200"
                disabled={updateStaffMutation.isPending}
              >
                {translate(language, "Hủy", "Cancel")}
              </Button>
              <Button
                onClick={handleUpdateStaff}
                className="rounded-xl bg-[#003cff] hover:bg-[#002fcc] text-white font-bold"
                disabled={!selectedStaffId || updateStaffMutation.isPending}
              >
                {updateStaffMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {translate(language, "Xác nhận", "Confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function staffAvailabilityLabel(staff: any) {
  if (staff.available === false) {
    return staff.busyUntil ? `Busy until ${staff.busyUntil}` : "Busy";
  }
  return "Available";
}

function VehicleDetailModal({
  vehicleId,
  onClose,
}: {
  vehicleId: string;
  onClose: () => void;
}) {
  const { language } = useLanguageStore();
  const { data: vehicle, isPending, isError, error } = useAdminVehicleDetail(vehicleId, true);
  const getErrorMessage = useErrorMessage();

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {translate(language, "Chi tiết phương tiện", "Vehicle Details")}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {translate(language, "Lịch sử dịch vụ và thông tin xe", "Service history and metadata")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isPending ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
              <p className="text-xs font-semibold">{translate(language, "Đang tải dữ liệu...", "Loading details...")}</p>
            </div>
          ) : (
            <>
              {/* Vehicle Metadata */}
              {isError ? (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-xs">
                  {getErrorMessage(error)}
                </div>
              ) : !vehicle ? (
                <div className="text-center text-slate-400 py-6 text-xs">
                  {translate(language, "Không tìm thấy dữ liệu xe.", "No vehicle data found.")}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        {translate(language, "Biển số xe", "License Plate")}
                      </span>
                      <span className="inline-block font-mono font-black text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-0.5 mt-1 text-sm">
                        {vehicle.plate}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        {translate(language, "Hãng & Dòng xe", "Brand & Model")}
                      </span>
                      <span className="font-bold text-slate-800 block mt-1 text-sm">
                        {vehicle.brand} {vehicle.model}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        {translate(language, "Màu sắc", "Color")}
                      </span>
                      <span className="font-medium text-slate-700 block mt-1 text-sm">
                        {vehicle.color || translate(language, "Không có", "None")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        {translate(language, "Chủ sở hữu", "Owner")}
                      </span>
                      <span className="font-bold text-slate-800 block mt-1 text-sm">
                        {vehicle.ownerName} ({vehicle.ownerPhone})
                      </span>
                    </div>
                  </div>

                  {/* History list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      {translate(language, "Lịch sử đặt lịch của xe", "Booking History")}
                    </h4>
                    {vehicle.bookingHistory.length === 0 ? (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-2xl text-center">
                        {translate(language, "Chưa có lịch sử đặt lịch nào.", "No booking history found.")}
                      </p>
                    ) : (
                      <div className="border border-slate-100 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                              <th className="p-3">{translate(language, "Ngày & Giờ", "Date & Time")}</th>
                              <th className="p-3">{translate(language, "Dịch vụ", "Service")}</th>
                              <th className="p-3 text-right">{translate(language, "Tổng tiền", "Amount")}</th>
                              <th className="p-3 text-right">{translate(language, "Trạng thái", "Status")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                            {vehicle.bookingHistory.map((history) => (
                              <tr key={history.bookingId} className="hover:bg-slate-50/50">
                                <td className="p-3">
                                  <div>{history.bookingDate}</div>
                                  <div className="text-[10px] text-slate-400">{history.bookingTime.substring(0, 5)}</div>
                                </td>
                                <td className="p-3 font-semibold text-slate-900">{history.primaryItemName}</td>
                                <td className="p-3 text-right font-bold text-slate-900">
                                  {history.finalAmount.toLocaleString("vi-VN")} đ
                                </td>
                                <td className="p-3 text-right">
                                  <Badge variant="outline" className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase border bg-white`}>
                                    {history.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <Button onClick={onClose} variant="outline" className="rounded-2xl text-xs font-bold px-4 h-9">
            {translate(language, "Đóng", "Close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
