"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import {
  useAdminBookingDetail,
  useQueryAdminVnpayTransaction,
  useRefundAdminVnpayPayment,
  useUpdateAdminBookingStatus,
} from "../hooks/use-admin-booking-detail";
import { ArrowLeft, Calendar, Loader2, Clock, User, Car, CreditCard, CheckCircle, XCircle } from "lucide-react";
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

function translatePaymentMethod(method: string, lang: "vi" | "en") {
  const map: Record<string, { vi: string; en: string }> = {
    E_WALLET: { vi: "VNPay", en: "VNPay" },
    CASH_AT_COUNTER: { vi: "Tiền mặt tại quầy", en: "Cash at counter" },
    BANK_TRANSFER: { vi: "Chuyển khoản", en: "Bank transfer" },
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

function translateWashStatus(status: string, lang: "vi" | "en") {
  const map: Record<string, { vi: string; en: string }> = {
    NOT_STARTED: { vi: "Chưa bắt đầu", en: "Not started" },
    PREPARING: { vi: "Chuẩn bị", en: "Preparing" },
    WASHING: { vi: "Đang rửa", en: "Washing" },
    DRYING: { vi: "Đang sấy khô", en: "Drying" },
    COMPLETED: { vi: "Hoàn thành", en: "Completed" },
  };
  return map[status]?.[lang] || status;
}

export function AdminBookingDetail({ bookingId }: { bookingId: string }) {
  const getErrorMessage = useErrorMessage();
  const router = useRouter();
  const { language } = useLanguageStore();
  const { data: booking, isPending, isError, error } = useAdminBookingDetail(bookingId);
  const queryVnpayMutation = useQueryAdminVnpayTransaction(bookingId);
  const refundVnpayMutation = useRefundAdminVnpayPayment(bookingId);
  const updateStatusMutation = useUpdateAdminBookingStatus(bookingId);
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | "">("");

  useEffect(() => {
    if (booking?.status) {
      setSelectedStatus("");
    }
  }, [booking?.status]);

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>{translate(language, "Đang tải chi tiết lịch đặt...", "Loading booking details...")}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-6 text-rose-700 m-8">
        <h2 className="text-lg font-bold mb-2">{translate(language, "Lỗi khi tải lịch đặt", "Error Loading Booking")}</h2>
        <p>{getErrorMessage(error)}</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          {translate(language, "Quay lại", "Go Back")}
        </Button>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center p-8 text-slate-500">
        {translate(language, "Không tìm thấy lịch đặt.", "Booking not found.")}
      </div>
    );
  }

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount == null) return "0 VND";
    return amount.toLocaleString("vi-VN") + " VND";
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "CONFIRMED": return "bg-blue-100 text-blue-800 border-blue-200";
      case "CANCELLED": return "bg-rose-100 text-rose-800 border-rose-200";
      case "IN_PROGRESS": return "bg-amber-100 text-amber-800 border-amber-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getAvailableStatuses = (): BookingStatus[] => {
    return ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"];
  };

  const availableStatuses = getAvailableStatuses().filter((status) => status !== booking.status);
  const statusDirty = Boolean(selectedStatus && selectedStatus !== booking.status);
  const isVnpayPayment = booking.payment.method === "E_WALLET";
  const canQueryVnpay = isVnpayPayment && booking.payment.status !== "PAID";
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

  const handleQueryVnpay = async () => {
    try {
      const result = await queryVnpayMutation.mutateAsync();
      if (result.success) {
        toast.success(result.message || translate(language, "Đã kiểm tra giao dịch VNPay.", "VNPay transaction checked."));
      } else {
        toast.error(result.message || translate(language, "VNPay chưa xác nhận thanh toán.", "VNPay has not confirmed the payment."));
      }
    } catch (queryError) {
      toast.error(getErrorMessage(queryError));
    }
  };

  const handleRefundVnpay = async () => {
    try {
      const confirmed = window.confirm(translate(language, "Hoàn tiền toàn bộ giao dịch VNPay này?", "Refund this VNPay payment in full?"));
      if (!confirmed) return;
      const result = await refundVnpayMutation.mutateAsync(undefined);
      toast.success(result.message || translate(language, "Đã gửi yêu cầu hoàn tiền VNPay.", "VNPay refund requested."));
    } catch (refundError) {
      toast.error(getErrorMessage(refundError));
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {translate(language, "Quay lại danh sách", "Back to Bookings")}
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {translate(language, "Lịch đặt", "Booking")} #{booking.confirmationNumber}
        </h1>
        <div className="ml-4 flex items-center gap-2">
          <Select
            value={selectedStatus || undefined}
            onValueChange={(value) => setSelectedStatus(value as BookingStatus)}
            disabled={updateStatusMutation.isPending}
          >
            <SelectTrigger className={`h-8 font-semibold rounded-full px-4 ${statusColor(selectedStatus || booking.status)}`}>
              <SelectValue placeholder={translateStatus(booking.status, language as "vi" | "en")} />
            </SelectTrigger>
            <SelectContent>
              {availableStatuses.map((st) => (
                <SelectItem key={st} value={st}>
                  {translateStatus(st, language as "vi" | "en")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant={statusDirty ? "default" : "outline"}
            onClick={handleSaveStatus}
            disabled={!statusDirty || updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {translate(language, "Lưu", "Save")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6 md:col-span-2">
          {/* Service Info */}
          <Card>
            <CardHeader>
              <CardTitle>{translate(language, "Chi tiết dịch vụ", "Service Details")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 pb-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg">{booking.primaryItemName || translate(language, "Dịch vụ tùy chỉnh", "Custom Service")}</h3>
                    <p className="text-sm text-slate-500">{translate(language, "Thời lượng", "Duration")}: ~{booking.scheduling.estimatedDuration} {translate(language, "phút", "mins")}</p>
                  </div>
                  <div className="font-bold text-lg">{formatCurrency(booking.pricing.subtotal)}</div>
                </div>
              </div>

              {booking.details.filter(d => d.itemType === "ADDON") && booking.details.filter(d => d.itemType === "ADDON").length > 0 && (
                <div className="mb-4 pb-4 border-b">
                  <h4 className="font-medium mb-3 text-slate-700">{translate(language, "Dịch vụ thêm", "Add-ons")}</h4>
                  <ul className="space-y-2">
                    {booking.details.filter(d => d.itemType === "ADDON").map((addon) => (
                      <li key={addon.id} className="flex justify-between text-sm">
                        <span>{addon.snapshotName}</span>
                        <span>{formatCurrency(addon.snapshotPrice)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{translate(language, "Tạm tính", "Subtotal")}</span>
                  <span>{formatCurrency(booking.pricing.subtotal)}</span>
                </div>
                {booking.pricing.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>{translate(language, "Giảm giá", "Discount")} ({booking.pricing.discountCode})</span>
                    <span>-{formatCurrency(booking.pricing.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-4 border-t mt-4">
                  <span>{translate(language, "Tổng cộng", "Total")}</span>
                  <span className="text-blue-600">{formatCurrency(booking.pricing.finalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Info */}
          <Card>
            <CardHeader>
              <CardTitle>{translate(language, "Lịch trình & Hoạt động", "Schedule & Operations")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">{translate(language, "Ngày", "Date")}</p>
                    <p className="text-sm text-slate-600">{new Date(booking.scheduling.bookingDate).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">{translate(language, "Giờ", "Time")}</p>
                    <p className="text-sm text-slate-600">
                      {booking.scheduling.bookingTime.substring(0, 5)} - {booking.scheduling.estimatedEndTime}
                    </p>
                  </div>
                </div>
              </div>

              {booking.washStatus && (
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{translate(language, "Trạng thái phiên rửa", "Wash Session Status")}</p>
                  </div>
                  <Badge variant="secondary">{translateWashStatus(booking.washStatus, language as "vi" | "en")}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>{translate(language, "Thông tin khách hàng", "Customer Information")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm font-medium">{booking.customerName}</p>
                  <p className="text-sm text-slate-500">{booking.customerPhone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Info */}
          <Card>
            <CardHeader>
              <CardTitle>{translate(language, "Thông tin xe", "Vehicle Details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Car className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-lg font-bold uppercase tracking-wider">{booking.vehiclePlate}</p>
                  <p className="text-sm text-slate-500">{booking.vehicleBrand} {booking.vehicleModel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle>{translate(language, "Trạng thái thanh toán", "Payment Status")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-slate-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium uppercase">{translatePaymentMethod(booking.payment.method, language as "vi" | "en")}</p>
                  <p className="text-xs text-slate-500">{booking.payment.transactionId}</p>
                </div>
                {booking.payment.status === "PAID" || booking.payment.status === "CONFIRMED" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-500" />
                )}
              </div>
              <div className="pt-2 border-t mt-2">
                <Badge variant={booking.payment.status === "PAID" ? "default" : "outline"} className={booking.payment.status === "PAID" ? "bg-emerald-100 text-emerald-800" : ""}>
                  {translatePaymentStatus(booking.payment.status, language as "vi" | "en")}
                </Badge>
              </div>
              {canQueryVnpay ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleQueryVnpay}
                  disabled={queryVnpayMutation.isPending}
                >
                  {queryVnpayMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {translate(language, "Kiểm tra VNPay", "Query VNPay")}
                </Button>
              ) : null}
              {canRefundVnpay ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={handleRefundVnpay}
                  disabled={refundVnpayMutation.isPending}
                >
                  {refundVnpayMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {translate(language, "Hoàn tiền VNPay", "Refund VNPay")}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
