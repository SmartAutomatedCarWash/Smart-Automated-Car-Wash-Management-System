"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Car,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  Phone,
  Star,
  User,
  UserCheck,
  Users,
  XCircle,
  ClipboardCheck,
  Droplets,
  PartyPopper,
} from "lucide-react";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/ui/alert-dialog";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import {
  formatBookingCurrency,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  humanizeCode,
} from "@/features/bookings/lib/booking-format";
import {
  useChangeBookingPaymentMethod,
  useCancelCustomerBooking,
  useCreateVnpayCheckout,
  useBookingStaffOptions,
  useCustomerBookingDetail,
  useUpdateCustomerBookingStaff,
} from "@/features/bookings/hooks/use-bookings";
import { useCustomerProfile } from "@/features/profile/hooks/use-customer-profile";
import { BookingCompletionPopup } from "@/features/bookings/components/booking-completion-popup";
import { useBookingReviewCheck, useSubmitBookingReview } from "@/features/bookings/hooks/use-reviews";
import { useCustomerBookingPointBreakdown } from "@/features/loyalty/hooks/use-customer-loyalty";
import type { BookingAddonSelection, BookingDetail, BookingStaffOption, BookingStaffOptionsRequest } from "@/entities/bookings";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { cn } from "@/shared/lib/utils";

function formatShortDate(date: string, lang: "vi" | "en") {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function getBookingOptions(booking: BookingDetail): BookingAddonSelection[] {
  return (booking.details ?? [])
    .filter((detail) => detail.itemType === "ADDON" || detail.itemType === "OPTION")
    .map((detail) => ({
      addonId: detail.refId,
      addonName: detail.snapshotName,
      addonPrice: detail.snapshotPrice,
    }));
}

// ── Status timeline config ───────────────────────────────────────────────────
type TimelineStep = {
  key: string;
  labelVi: string;
  labelEn: string;
  icon: React.ElementType;
};

const TIMELINE_STEPS: TimelineStep[] = [
  { key: "PENDING",     labelVi: "Chờ xác nhận",  labelEn: "Pending",         icon: Clock3 },
  { key: "CONFIRMED",   labelVi: "Đã xác nhận",   labelEn: "Confirmed",       icon: ClipboardCheck },
  { key: "CHECKED_IN",  labelVi: "Đã nhận xe",    labelEn: "Checked In",      icon: Car },
  { key: "IN_PROGRESS", labelVi: "Đang rửa",      labelEn: "In Progress",     icon: Droplets },
  { key: "COMPLETED",   labelVi: "Hoàn thành",    labelEn: "Completed",       icon: PartyPopper },
];

const STATUS_ORDER = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"];

function getStepIndex(status: string) {
  return STATUS_ORDER.indexOf(status.toUpperCase());
}

// ── Countdown to appointment ─────────────────────────────────────────────────
const HOLD_DURATION_MS = 15 * 60 * 1000;
const CUSTOMER_CANCEL_LOCK_MS = 2 * 60 * 60 * 1000;

function getScheduledAtMs(bookingDate: string, bookingTime: string) {
  const normalizedTime = bookingTime.length === 5 ? `${bookingTime}:00` : bookingTime;
  const scheduledAtMs = new Date(`${bookingDate}T${normalizedTime}`).getTime();
  return Number.isFinite(scheduledAtMs) ? scheduledAtMs : null;
}

function isCustomerCancelLocked(booking: BookingDetail) {
  if (booking.status !== "CONFIRMED") {
    return false;
  }
  const scheduledAtMs = getScheduledAtMs(booking.scheduling.bookingDate, booking.scheduling.bookingTime);
  return scheduledAtMs !== null && scheduledAtMs - Date.now() <= CUSTOMER_CANCEL_LOCK_MS;
}

function useCountdownUntil(expiresAtMs: number | null) {
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAtMs) {
      setDiff(null);
      return;
    }

    const tick = () => setDiff(Math.max(0, expiresAtMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAtMs]);

  return diff;
}

function useCountdown(bookingDate: string, bookingTime: string) {
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(`${bookingDate}T${bookingTime}:00`).getTime();
    const tick = () => {
      const now = Date.now();
      setDiff(target - now);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [bookingDate, bookingTime]);

  return diff;
}

function PendingHoldBadge({ expiresAtMs, language }: { expiresAtMs: number; language: "vi" | "en" }) {
  const diff = useCountdownUntil(expiresAtMs);
  if (diff === null) return null;
  if (diff <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
        <AlertCircle className="h-3.5 w-3.5" />
        {translate(language, "Đã hết hạn giữ slot", "Hold expired")}
      </span>
    );
  }

  const totalSec = Math.floor(diff / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const progress = Math.max(0, Math.min(100, (diff / HOLD_DURATION_MS) * 100));
  const urgent = diff <= 2 * 60 * 1000;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
        urgent ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800",
      )}
      title={translate(language, "Slot sẽ được giải phóng nếu booking chưa được xác nhận trước khi hết giờ.", "The slot will be released if the booking is not confirmed before the hold expires.")}
    >
      <Clock3 className="h-3.5 w-3.5" />
      {translate(language, "Giữ slot", "Hold")} {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      <span className="ml-0.5 h-1.5 w-8 overflow-hidden rounded-full bg-white/70">
        <span
          className={cn("block h-full rounded-full", urgent ? "bg-rose-500" : "bg-amber-500")}
          style={{ width: `${progress}%` }}
        />
      </span>
    </span>
  );
}

function CountdownBadge({ bookingDate, bookingTime, language }: { bookingDate: string; bookingTime: string; language: "vi" | "en" }) {
  const getErrorMessage = useErrorMessage();
  const diff = useCountdown(bookingDate, bookingTime);
  if (diff === null) return null;
  if (diff <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        {translate(language, "Đã đến giờ hẹn", "Appointment time")}
      </span>
    );
  }
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const label = days > 0
    ? `${days}d ${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`
    : `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
      <Clock3 className="h-3.5 w-3.5" />
      {translate(language, "Còn lại", "In")} {label}
    </span>
  );
}

export function CustomerBookingDetailPage({ bookingId }: { bookingId: string }) {
  const getErrorMessage = useErrorMessage();
  const { language } = useLanguageStore();
  const bookingQuery = useCustomerBookingDetail(bookingId);
  const profileQuery = useCustomerProfile();
  const cancelBookingMutation = useCancelCustomerBooking(bookingId);
  const changePaymentMethodMutation = useChangeBookingPaymentMethod(bookingId);
  const createVnpayCheckoutMutation = useCreateVnpayCheckout();
  const updateBookingStaffMutation = useUpdateCustomerBookingStaff(bookingId);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showOnlineCancelFeeDialog, setShowOnlineCancelFeeDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [autoReviewShown, setAutoReviewShown] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  const submitReviewMutation = useSubmitBookingReview();
  const isCompleted = bookingQuery.data?.status === "COMPLETED" || bookingQuery.data?.washStatus === "COMPLETED";
  const reviewCheckQuery = useBookingReviewCheck(bookingId, isCompleted);
  const bookingPointsQuery = useCustomerBookingPointBreakdown(bookingId);
  const bookingPointsEarned =
    (bookingPointsQuery.data?.bookingPoints ?? 0) > 0
      ? bookingPointsQuery.data?.bookingPoints ?? null
      : null;
  const reviewPointsEarned = bookingPointsQuery.data?.reviewPoints ?? 0;

  // Auto-show review popup when booking is COMPLETED and not yet reviewed
  useEffect(() => {
    if (
      isCompleted &&
      !autoReviewShown &&
      reviewCheckQuery.data &&
      !reviewCheckQuery.data.hasReview
    ) {
      setAutoReviewShown(true);
      setShowReviewPopup(true);
    }
  }, [isCompleted, autoReviewShown, reviewCheckQuery.data]);

  const pendingHoldExpiresAtMs = useMemo(() => {
    const booking = bookingQuery.data;
    if (!booking?.confirmationExpiresAt) {
      return null;
    }
    const paymentStatus = booking.payment.status?.toUpperCase() ?? "";
    if (booking.status !== "PENDING" || paymentStatus === "PAID") {
      return null;
    }
    const expiresAtMs = new Date(booking.confirmationExpiresAt).getTime();
    return Number.isFinite(expiresAtMs) ? expiresAtMs : null;
  }, [bookingQuery.data]);

  const [pendingHoldExpired, setPendingHoldExpired] = useState(false);

  useEffect(() => {
    if (!pendingHoldExpiresAtMs) {
      setPendingHoldExpired(false);
      return;
    }

    const tick = () => setPendingHoldExpired(pendingHoldExpiresAtMs <= Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pendingHoldExpiresAtMs]);

  const staffOptionsPayload = useMemo<BookingStaffOptionsRequest | null>(() => {
    const booking = bookingQuery.data;
    if (!booking) return null;
    const packageDetail = booking.details.find((detail) => detail.itemType === "PACKAGE");
    const comboDetail = booking.details.find((detail) => detail.itemType === "COMBO");
    return {
      bookingId: booking.bookingId,
      packageId: packageDetail?.refId,
      comboId: comboDetail?.refId,
      options: booking.details
        .filter((detail) => detail.itemType === "ADDON" || detail.itemType === "OPTION")
        .map((detail) => detail.refId),
      bookingDate: booking.scheduling.bookingDate,
      bookingTime: booking.scheduling.bookingTime,
    };
  }, [bookingQuery.data]);
  const staffOptionsQuery = useBookingStaffOptions(staffOptionsPayload);
  const staffOptions = staffOptionsQuery.data ?? [];

  useEffect(() => {
    const booking = bookingQuery.data;
    if (!booking) return;
    const assignedIds = assignedStaffList(booking)
      .map((staff) => staff.staffId)
      .filter(Boolean);
    if (assignedIds.length > 0) {
      setSelectedStaffIds(assignedIds.slice(0, 1));
      return;
    }
    if (booking.status !== "CONFIRMED") {
      setSelectedStaffIds([]);
      return;
    }
    const recommendedStaff = (staffOptionsQuery.data ?? []).find((staff) => staff.recommended && staff.available !== false);
    const fallbackStaff = (staffOptionsQuery.data ?? []).find((staff) => staff.available !== false);
    const nextStaff = recommendedStaff ?? fallbackStaff;
    if (nextStaff) {
      setSelectedStaffIds([nextStaff.staffId]);
    }
  }, [bookingQuery.data, staffOptionsQuery.data]);

  if (bookingQuery.isPending) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center rounded-3xl border border-slate-200 bg-white p-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      </div>
    );
  }

  if (bookingQuery.isError || !bookingQuery.data) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl border-rose-200 bg-white">
          <CardHeader>
            <CardTitle>{translate(language, "Không thể tải chi tiết lịch đặt", "Unable to load booking details")}</CardTitle>
            <CardDescription>
              {bookingQuery.isError
                ? getErrorMessage(bookingQuery.error)
                : translate(language, "Không tìm thấy lịch đặt.", "Booking not found.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/customer/home">{translate(language, "Về trang chủ", "Go home")}</Link>
            </Button>
            <Button asChild>
              <Link href="/customer/bookings/new">{translate(language, "Tạo lịch đặt", "Create a booking")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const booking = bookingQuery.data;
  const bookingOptions = getBookingOptions(booking);
  const canCancelBooking = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const customerCancelLocked = isCustomerCancelLocked(booking);
  const paymentStatus = booking.payment.status?.toUpperCase() ?? "";
  const paymentMethod = booking.payment.method?.toUpperCase() ?? "";
  const isPaymentPaid = paymentStatus === "PAID";
  const isPaidOnlineBooking = isPaymentPaid && (paymentMethod === "E_WALLET" || paymentMethod === "BANK_TRANSFER");
  const isPendingBookingHold = booking.status === "PENDING" && !isPaymentPaid;
  const canChoosePendingPaymentAction = isPendingBookingHold && !pendingHoldExpired;
  const canPayAgainWithVnpay = canChoosePendingPaymentAction && paymentMethod !== "CASH_AT_COUNTER" && booking.pricing.finalAmount > 0;
  const canChangeToSepay = canChoosePendingPaymentAction && paymentMethod === "E_WALLET" && booking.pricing.finalAmount > 0;
  const canShowSepayInstructions = canChoosePendingPaymentAction && paymentMethod === "BANK_TRANSFER";
  const sepayPaymentCode = canShowSepayInstructions ? booking.payment.transactionId : null;
  const sepayTransferDescription = canShowSepayInstructions
    ? (booking.payment.transferDescription || sepayPaymentCode)
    : null;
  const canShowAppointmentCountdown = ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(booking.status);
  const showCashConfirmationNote = paymentMethod === "CASH_AT_COUNTER" && paymentStatus !== "PAID" && booking.pricing.finalAmount > 0;
  const isPaymentActionPending = changePaymentMethodMutation.isPending || createVnpayCheckoutMutation.isPending;
  const originalAssignedStaffIds = assignedStaffList(booking).map((staff) => staff.staffId).slice(0, 1);
  const canEditAssignedStaff = booking.status === "CONFIRMED" && originalAssignedStaffIds.length === 1 && !booking.washSessionId;
  const canSaveAssignedStaff = canEditAssignedStaff && selectedStaffIds.length === 1 && selectedStaffIds[0] !== originalAssignedStaffIds[0];
  const recommendedStaffId = staffOptions.find((staff) => staff.recommended && staff.available !== false)?.staffId ?? null;
  const customerNote = booking.customerNotes?.trim() || null;
  const customerName = booking.customerName || profileQuery.data?.fullName || translate(language, "Khách hàng", "Customer");
  const customerPhone = booking.customerPhone || profileQuery.data?.phone || translate(language, "Chưa có số điện thoại", "No phone number");
  const customerEmail = booking.confirmationEmail || profileQuery.data?.email || translate(language, "email của bạn", "your email");
  const expectedDate = formatShortDate(booking.scheduling.bookingDate, language);
  const expectedTime = booking.scheduling.bookingTime.length >= 5
    ? booking.scheduling.bookingTime.slice(0, 5)
    : booking.scheduling.bookingTime;

  let heroBg = "bg-emerald-600";
  let heroTitle = translate(language, "Lịch đặt đã được tạo", "Booking created");
  let heroDesc = translate(
    language,
    `Chúng tôi đã nhận lịch đặt của bạn vào ngày ${expectedDate} lúc ${expectedTime}. Email xác nhận đã được gửi đến ${customerEmail}.`,
    `We have received your booking for ${expectedDate} at ${expectedTime}. A confirmation email was sent to ${customerEmail}.`,
  );
  let heroIcon = <CheckCircle2 className="h-12 w-12" />;

  if (booking.status === "CANCELLED") {
    heroBg = "bg-rose-600";
    heroTitle = translate(language, "Lịch đặt đã bị huỷ", "Booking cancelled");
    heroDesc = translate(language, "Lịch đặt này đã bị huỷ.", "This booking has been cancelled.");
    heroIcon = <XCircle className="h-12 w-12" />;
  } else if (booking.status === "COMPLETED" || booking.washStatus === "COMPLETED") {
    heroBg = "bg-emerald-700";
    heroTitle = translate(language, "Đã hoàn thành rửa xe", "Wash session completed");
    heroDesc = translate(language, "Xe của bạn đã được rửa, kiểm tra và bàn giao.", "Your vehicle has been washed, inspected, and picked up.");
    heroIcon = <CheckCircle2 className="h-12 w-12" />;
  } else if (booking.status === "NO_SHOW") {
    heroBg = "bg-slate-600";
    heroTitle = translate(language, "Vắng mặt", "No show");
    heroDesc = translate(language, "Lịch đặt đã được đánh dấu là vắng mặt.", "The booking was marked as no-show.");
    heroIcon = <AlertCircle className="h-12 w-12" />;
  } else if (booking.status === "CHECKED_IN" || booking.washStatus) {
    heroBg = "bg-blue-600";
    heroTitle = humanizeCode(booking.washStatus ?? booking.status);
    heroDesc = translate(language, "Theo dõi tiến trình rửa xe từ trang chi tiết này.", "Track the current wash progress from this booking detail.");
    heroIcon = <Car className="h-12 w-12" />;
  }

  const showCustomerCancelLockedWarning = () => {
    notify.warning(
      translate(
        language,
        "Lịch đặt còn dưới 2 giờ nữa sẽ đến giờ hẹn nên khách hàng không thể tự huỷ. Vui lòng liên hệ cửa hàng nếu cần hỗ trợ.",
        "This booking is less than 2 hours from the appointment time, so customers cannot cancel it directly. Please contact the store if you need support.",
      ),
    );
  };

  const handleToggleCancelForm = () => {
    if (isCustomerCancelLocked(booking)) {
      setShowCancelForm(false);
      showCustomerCancelLockedWarning();
      return;
    }
    setShowCancelForm((value) => !value);
  };

  const executeCancelBooking = async () => {
    try {
      await cancelBookingMutation.mutateAsync(cancelReason.trim() || undefined);
      notify.success(translate(language, "Đã huỷ lịch đặt thành công.", "Booking cancelled successfully."));
      setShowOnlineCancelFeeDialog(false);
      setShowCancelForm(false);
      setCancelReason("");
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  };

  const handleCancelBooking = async () => {
    if (isCustomerCancelLocked(booking)) {
      setShowCancelForm(false);
      showCustomerCancelLockedWarning();
      return;
    }
    if (isPaidOnlineBooking) {
      setShowOnlineCancelFeeDialog(true);
      return;
    }
    await executeCancelBooking();
  };

  const handlePayAgainWithVnpay = async () => {
    try {
      if (paymentMethod !== "E_WALLET") {
        await changePaymentMethodMutation.mutateAsync("E_WALLET");
      }
      const checkout = await createVnpayCheckoutMutation.mutateAsync(booking.bookingId);
      notify.success(translate(language, "Đang chuyển sang VNPay.", "Redirecting to VNPay."));
      window.location.href = checkout.paymentUrl;
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  };

  const handleChangeToSepay = async () => {
    try {
      await changePaymentMethodMutation.mutateAsync("BANK_TRANSFER");
      notify.success(translate(language, "Đã chuyển sang thanh toán SePay.", "Changed to SePay."));
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  };

  const handleSaveAssignedStaff = async () => {
    try {
      await updateBookingStaffMutation.mutateAsync({ staffIds: selectedStaffIds.slice(0, 1) });
      notify.success(translate(language, "Đã lưu nhân viên phụ trách.", "Assigned staff saved."));
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  };

  const handleCopySepayCode = async () => {
    if (!sepayTransferDescription) return;
    await handleCopyText(sepayTransferDescription, translate(language, "Đã copy nội dung chuyển khoản.", "Transfer description copied."));
  };

  const handleCopyText = async (value: string | null | undefined, successMessage: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      notify.success(successMessage);
    } catch {
      notify.error(translate(language, "Không thể copy.", "Unable to copy."));
    }
  };


  const handleSubmitReview = async (
    stars: number,
    comment: string,
    images: { beforeImageUrl?: string | null; afterImageUrl?: string | null }
  ) => {
    await submitReviewMutation.mutateAsync({
      bookingId,
      rating: stars,
      comment,
      ...images,
    });
    await Promise.all([bookingPointsQuery.refetch(), bookingQuery.refetch()]);
    notify.success(translate(language, "Đánh giá đã được gửi thành công!", "Review submitted successfully!"));
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className={`relative overflow-hidden rounded-3xl ${heroBg} px-6 py-12 text-white shadow-lg`}>
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-xl">
                {heroIcon}
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/75">
                {translate(language, "Lịch đặt", "Booking")} #{booking.confirmationNumber}
              </p>
              <h1 className="mt-2 text-2xl font-extrabold uppercase tracking-wide sm:text-3xl">
                {heroTitle}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/90">{heroDesc}</p>
            </div>
          </div>

          {/* ── Booking status timeline ── */}
          {booking.status !== "CANCELLED" && booking.status !== "NO_SHOW" && (
            <Card className="border-slate-200 bg-white shadow-md">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>{translate(language, "Tiến trình đặt lịch", "Booking progress")}</CardTitle>
                    <CardDescription>{translate(language, "Theo dõi trạng thái từng bước của lịch đặt.", "Track each step of your booking session.")}</CardDescription>
                  </div>
                  {pendingHoldExpiresAtMs ? (
                    <PendingHoldBadge expiresAtMs={pendingHoldExpiresAtMs} language={language} />
                  ) : canShowAppointmentCountdown ? (
                    <CountdownBadge
                      bookingDate={booking.scheduling.bookingDate}
                      bookingTime={booking.scheduling.bookingTime}
                      language={language}
                    />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative flex items-start justify-between gap-1 overflow-x-auto pb-2">
                  {/* connector line */}
                  <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-200 mx-6 hidden sm:block" />
                  {TIMELINE_STEPS.map((step, idx) => {
                    const currentIdx = getStepIndex(booking.washStatus ?? booking.status);
                    const isCompleted = currentIdx === STATUS_ORDER.length - 1;
                    const isDone = isCompleted || idx < currentIdx;
                    const isActive = !isCompleted && idx === currentIdx;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="relative z-10 flex min-w-[80px] flex-1 flex-col items-center gap-2 text-center">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                          isDone  ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-100" :
                          isActive ? "border-sky-500 bg-sky-500 text-white shadow-md shadow-sky-100 animate-pulse" :
                          "border-slate-200 bg-white text-slate-400"
                        )}>
                          {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold leading-tight",
                          isDone ? "text-emerald-600" : isActive ? "text-sky-700" : "text-slate-400"
                        )}>
                          {language === "vi" ? step.labelVi : step.labelEn}
                        </span>
                        {isActive && (
                          <span className="text-[9px] font-semibold text-sky-500 uppercase tracking-wider">
                            {translate(language, "Hiện tại", "Current")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-emerald-200 bg-emerald-50 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3 text-emerald-800">
                <Users className="h-5 w-5" />
                <CardTitle>{translate(language, "Nhân viên đã được phân công", "Assigned staff")}</CardTitle>
              </div>
              <CardDescription>
                {canEditAssignedStaff
                  ? translate(language, "Bạn có thể đổi nhân viên đang rảnh, sau đó bấm Confirm để lưu.", "You can replace the assigned staff with an available staff member, then press Confirm to save.")
                  : translate(language, "Nhân viên phụ trách lịch đặt này.", "Staff assigned to this booking.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {staffOptionsQuery.isPending ? (
                <div className="h-20 animate-pulse rounded-2xl bg-white/70" />
              ) : (
                <div className="max-w-md rounded-2xl border border-emerald-100 bg-white/80 p-3">
                  <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                    <UserCheck className="h-3.5 w-3.5" />
                    {translate(language, "Nhân viên phụ trách", "Assigned staff")}
                  </span>
                  {canEditAssignedStaff ? (
                    <Select
                      value={selectedStaffIds[0] || undefined}
                      onValueChange={(staffId) => setSelectedStaffIds([staffId])}
                    >
                      <SelectTrigger className="h-auto min-h-12 rounded-xl bg-white px-3 py-2 text-left [&>span]:line-clamp-none">
                        <SelectValue placeholder={translate(language, "Chọn nhân viên", "Select staff")}>
                          {staffOptionById(staffOptions, booking, selectedStaffIds[0] ?? "") ? (
                            <StaffSelectLabel
                              staff={staffOptionById(staffOptions, booking, selectedStaffIds[0] ?? "")!}
                              statusLabel={selectedStaffIds[0] === originalAssignedStaffIds[0] ? translate(language, "Đang được gán", "Current assignment") : undefined}
                              statusTone={selectedStaffIds[0] === originalAssignedStaffIds[0] ? "locked" : undefined}
                            />
                          ) : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent
                        position="item-aligned"
                        className="min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]"
                      >
                        {staffOptions.map((staff) => (
                          <SelectItem
                            key={staff.staffId}
                            value={staff.staffId}
                            disabled={staff.available === false && staff.staffId !== originalAssignedStaffIds[0]}
                            className="py-2 pr-8 [&>span:last-child]:w-full"
                          >
                            <StaffSelectLabel
                              staff={staff}
                              statusLabel={
                                staff.staffId === originalAssignedStaffIds[0]
                                  ? translate(language, "Đang được gán", "Current assignment")
                                  : staff.staffId === recommendedStaffId
                                    ? translate(language, "Đề xuất", "Recommended")
                                    : undefined
                              }
                              statusTone={staff.staffId === originalAssignedStaffIds[0] ? "locked" : staff.staffId === recommendedStaffId ? "available" : undefined}
                            />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : staffOptionById(staffOptions, booking, selectedStaffIds[0] ?? "") ? (
                    <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                      <StaffSelectLabel
                        staff={staffOptionById(staffOptions, booking, selectedStaffIds[0] ?? "")!}
                        statusLabel={translate(language, "Đang được gán", "Assigned")}
                        statusTone="available"
                      />
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-slate-500">
                      {translate(language, "Sẽ được phân công sau khi xác nhận.", "Will be assigned after confirmation.")}
                    </p>
                  )}
                </div>
              )}
              {staffOptionsQuery.isError ? (
                <p className="text-xs font-semibold text-rose-600">{getErrorMessage(staffOptionsQuery.error)}</p>
              ) : null}
              {canEditAssignedStaff ? (
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => void handleSaveAssignedStaff()}
                    disabled={!canSaveAssignedStaff || updateBookingStaffMutation.isPending}
                  >
                    {updateBookingStaffMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {translate(language, "Confirm staff change", "Confirm staff change")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void bookingQuery.refetch()}>
                    {translate(language, "Tải lại từ máy chủ", "Refresh from server")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setSelectedStaffIds(originalAssignedStaffIds)}>
                    {translate(language, "Hủy đổi nhân viên", "Cancel staff change")}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-md">
            <CardHeader>
              <CardTitle>{translate(language, "Lịch trình lịch đặt", "Booking timeline")}</CardTitle>
              <CardDescription>{translate(language, "Trạng thái và lịch hẹn cho lần rửa xe này.", "Status and schedule for this wash session.")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={<Calendar className="h-4 w-4" />} label={translate(language, "Ngày hẹn", "Expected date")} value={expectedDate} />
              <InfoRow icon={<Clock3 className="h-4 w-4" />} label={translate(language, "Giờ hẹn", "Expected time")} value={expectedTime} />
              <InfoRow icon={<Car className="h-4 w-4" />} label={translate(language, "Trạng thái lịch đặt", "Booking status")} value={humanizeCode(booking.status)} />
              <InfoRow icon={<FileText className="h-4 w-4" />} label={translate(language, "Xác nhận", "Confirmation")} value={humanizeCode(booking.confirmationStatus)} />
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-md">
            <CardHeader>
              <CardTitle>{translate(language, "Ghi chú của bạn", "Your note")}</CardTitle>
              <CardDescription>{translate(language, "Ghi chú đã gửi khi tạo lịch đặt.", "The note you submitted with this booking.")}</CardDescription>
            </CardHeader>
            <CardContent>
              {customerNote ? (
                <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
                    <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-800">
                      {customerNote}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                  {translate(language, "Bạn chưa thêm ghi chú cho lịch đặt này.", "No note was added to this booking.")}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <DetailSection
              title={translate(language, "Khách hàng và xe", "Customer and vehicle")}
              rows={[
                [translate(language, "Khách hàng", "Customer"), customerName],
                [translate(language, "Điện thoại", "Phone"), customerPhone],
                [translate(language, "Email", "Email"), customerEmail],
                [translate(language, "Xe", "Vehicle"), `${booking.vehicleBrand} ${booking.vehicleModel}`],
                [translate(language, "Biển số", "Plate"), booking.vehiclePlate],
                [translate(language, "Dịch vụ", "Service"), booking.primaryItemName ?? "--"],
              ]}
            />
            <DetailSection
              title={translate(language, "Lịch hẹn và thanh toán", "Schedule and payment")}
              rows={[
                [translate(language, "Ngày đặt", "Booking date"), booking.scheduling.bookingDate],
                [translate(language, "Giờ đặt", "Booking time"), booking.scheduling.bookingTime],
                [translate(language, "Dự kiến kết thúc", "Estimated end"), booking.scheduling.estimatedEndTime],
                [translate(language, "Phương thức TT", "Payment method"), getPaymentMethodLabel(booking.payment.method)],
                [translate(language, "Trạng thái TT", "Payment status"), getPaymentStatusLabel(booking.payment.status)],
                [translate(language, "Mã giao dịch", "Transaction"), booking.payment.transactionId || "--"],
              ]}
            />
          </div>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-md">
            <CardHeader className="bg-slate-50">
              <CardDescription>{translate(language, "Chi tiết đơn hàng", "Order detail")}</CardDescription>
              <CardTitle>#{booking.confirmationNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <SidebarBlock icon={<Car className="h-4 w-4" />} title={translate(language, "Thông tin xe", "Vehicle details")}>
                <p className="font-semibold text-slate-800">
                  {booking.vehicleBrand} {booking.vehicleModel}
                </p>
                <p className="font-mono text-xs uppercase tracking-wider text-slate-500">
                  {translate(language, "Biển số", "Plate")}: {booking.vehiclePlate}
                </p>
              </SidebarBlock>

              <SidebarBlock icon={<User className="h-4 w-4" />} title={translate(language, "Thông tin liên hệ", "Contact details")}>
                <p className="font-semibold text-slate-800">{customerName}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Phone className="h-3 w-3" />
                  {customerPhone}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Mail className="h-3 w-3" />
                  {customerEmail}
                </p>
              </SidebarBlock>

              <SidebarBlock icon={<FileText className="h-4 w-4" />} title={translate(language, "Tóm tắt đơn hàng", "Order summary")}>
                <SummaryLine label={booking.primaryItemName ?? translate(language, "Dịch vụ", "Service")} value={formatBookingCurrency(booking.pricing.subtotal)} />
                {bookingOptions.map((addon) => (
                  <SummaryLine
                    key={addon.addonId}
                    label={`+ ${addon.addonName}`}
                    value={formatBookingCurrency(addon.addonPrice)}
                    muted
                  />
                ))}
                <SummaryLine label={translate(language, "Tạm tính", "Subtotal")} value={formatBookingCurrency(booking.pricing.subtotal)} muted />
                {booking.pricing.discountAmount > 0 ? (
                  <SummaryLine label={translate(language, "Giảm giá voucher", "Voucher discount")} value={`-${formatBookingCurrency(booking.pricing.discountAmount)}`} muted />
                ) : null}
                {booking.pricing.discountAmount > 0 ? (
                  <SummaryLine label={translate(language, "Giảm điểm", "Points discount")} value={`-${formatBookingCurrency(booking.pricing.discountAmount)}`} muted />
                ) : null}
                <SummaryLine label={translate(language, "Tổng cộng", "Total")} value={formatBookingCurrency(booking.pricing.finalAmount)} strong />
              </SidebarBlock>

              {bookingPointsEarned !== null ? (
                <SidebarBlock icon={<Star className="h-4 w-4" />} title={translate(language, "Điểm booking", "Booking points")}>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div className="text-2xl font-black text-emerald-700">
                      +{bookingPointsEarned.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} pts
                    </div>
                    <p className="mt-1 text-xs font-semibold text-emerald-800">
                      {translate(language, "Điểm cộng sau khi rửa xe thành công.", "Points earned after a successful wash.")}
                    </p>
                  </div>
                </SidebarBlock>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-md">
            <CardHeader>
              <CardTitle>{translate(language, "Thao tác", "Actions")}</CardTitle>
              <CardDescription>{translate(language, "Quản lý lịch đặt này.", "Manage this booking.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/customer/bookings">{translate(language, "Quay lại danh sách", "Back to bookings")}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/customer/bookings/new">{translate(language, "Đặt dịch vụ khác", "Book another service")}</Link>
              </Button>

              {isPendingBookingHold && pendingHoldExpired ? (
                <div className="space-y-2 rounded-2xl border border-rose-100 bg-rose-50 p-3">
                  <p className="text-xs font-semibold text-rose-800">
                    {translate(
                      language,
                      "Thời gian giữ slot đã hết. Slot này sẽ được giải phóng tự động, vui lòng tạo lịch đặt mới nếu vẫn muốn rửa xe.",
                      "The booking hold window has expired. This slot will be released automatically; please create a new booking if you still want this service.",
                    )}
                  </p>
                </div>
              ) : null}

              {canChoosePendingPaymentAction && paymentMethod !== "CASH_AT_COUNTER" ? (
                <div className="space-y-2 rounded-2xl border border-sky-100 bg-sky-50 p-3">
                  <p className="text-xs font-semibold text-sky-900">
                    {translate(
                      language,
                      "Lịch đặt đang chờ xác nhận. Bạn có thể đổi giữa SePay/VNPay, đổi sang tiền mặt hoặc huỷ lịch.",
                      "This booking is pending. You can switch between SePay/VNPay, switch to cash, or cancel it.",
                    )}
                  </p>
                  {canShowSepayInstructions ? (
                    <div className="rounded-xl border border-cyan-100 bg-white p-3 text-xs text-slate-700">
                      <p className="font-bold text-slate-900">
                        {translate(language, "Thanh toán SePay", "SePay payment")}
                      </p>
                      <p className="mt-1">
                        {translate(
                          language,
                          "Quét mã QR hoặc chuyển khoản đúng thông tin bên dưới để hệ thống tự xác nhận.",
                          "Scan the QR or transfer with the exact details below so the system can confirm automatically.",
                        )}
                      </p>
                      {booking.payment.qrUrl ? (
                        <div className="mt-3 flex justify-center rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <img
                            src={booking.payment.qrUrl}
                            alt={translate(language, "Mã QR thanh toán SePay", "SePay payment QR code")}
                            className="h-auto w-full max-w-[280px] rounded-lg"
                          />
                        </div>
                      ) : null}
                      <div className="mt-3 space-y-2">
                        <SepayInfoRow
                          label={translate(language, "Ngân hàng", "Bank")}
                          value={booking.payment.bankCode ?? "TPBank"}
                        />
                        <SepayInfoRow
                          label={translate(language, "Số tài khoản", "Account number")}
                          value={booking.payment.accountNumber ?? "--"}
                          onCopy={() => handleCopyText(booking.payment.accountNumber, translate(language, "Đã copy số tài khoản.", "Account number copied."))}
                        />
                        <SepayInfoRow
                          label={translate(language, "Chủ tài khoản", "Account holder")}
                          value={booking.payment.accountName ?? "--"}
                        />
                        <SepayInfoRow
                          label={translate(language, "Số tiền", "Amount")}
                          value={formatBookingCurrency(booking.pricing.finalAmount)}
                          onCopy={() => handleCopyText(String(booking.pricing.finalAmount), translate(language, "Đã copy số tiền.", "Amount copied."))}
                        />
                        <SepayInfoRow
                          label={translate(language, "Nội dung", "Description")}
                          value={sepayTransferDescription ?? "--"}
                          monospace
                          onCopy={handleCopySepayCode}
                        />
                      </div>
                    </div>
                  ) : null}
                  {canPayAgainWithVnpay ? (
                    <Button
                      type="button"
                      className="w-full"
                      onClick={handlePayAgainWithVnpay}
                      disabled={isPaymentActionPending}
                    >
                      {createVnpayCheckoutMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                      {translate(language, "Thanh toán VNPay", "Pay with VNPay")}
                    </Button>
                  ) : null}
                  {canChangeToSepay ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-white"
                      onClick={handleChangeToSepay}
                      disabled={isPaymentActionPending}
                    >
                      {changePaymentMethodMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                      {translate(language, "Đổi sang SePay", "Change to SePay")}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {/* Review section — chỉ hiện khi COMPLETED */}
              {(booking.status === "COMPLETED" || booking.washStatus === "COMPLETED") && (
                <>
                  {reviewCheckQuery.data?.hasReview ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-700 font-black text-xs uppercase tracking-wider">
                        <CheckCircle2 className="h-4 w-4" />
                        {translate(language, "Đã đánh giá", "Review submitted")}
                      </div>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s <= (reviewCheckQuery.data?.reviewDetail?.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                          />
                        ))}
                        <span className="text-xs font-bold text-slate-600 ml-1">
                          {reviewCheckQuery.data?.reviewDetail?.rating}/5
                        </span>
                      </div>
                      {reviewCheckQuery.data?.reviewDetail?.comment && (
                        <p className="text-xs text-slate-600 italic">
                          "{reviewCheckQuery.data.reviewDetail.comment}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setShowReviewPopup(true)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      {translate(language, "Viết đánh giá", "Write a Review")}
                    </Button>
                  )}
                </>
              )}

              {canCancelBooking ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-rose-200 text-rose-700 hover:bg-rose-50"
                    onClick={handleToggleCancelForm}
                  >
                    {translate(language, "Huỷ lịch đặt", "Cancel booking")}
                  </Button>
                  {customerCancelLocked ? (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                      {translate(
                        language,
                        "Không thể tự huỷ trong 2 giờ cuối trước lịch hẹn. Nếu có việc gấp, vui lòng liên hệ cửa hàng để được hỗ trợ.",
                        "You cannot cancel directly within the final 2 hours before the appointment. Please contact the store if urgent support is needed.",
                      )}
                    </div>
                  ) : null}
                  {showCancelForm ? (
                    <div className="space-y-3 rounded-2xl border border-rose-100 bg-rose-50 p-3">
                      <textarea
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value.slice(0, 500))}
                        maxLength={500}
                        placeholder={translate(language, "Lý do huỷ", "Cancel reason")}
                        className="min-h-24 w-full rounded-xl border border-rose-100 bg-white p-3 text-sm outline-none"
                      />
                      <Button
                        type="button"
                        className="w-full bg-rose-600 hover:bg-rose-700"
                        onClick={handleCancelBooking}
                        disabled={cancelBookingMutation.isPending}
                      >
                        {cancelBookingMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {translate(language, "Xác nhận huỷ", "Confirm cancel")}
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : null}

              {reviewCheckQuery.data?.hasReview ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-700">
                    <Star className="h-4 w-4" />
                    {translate(language, "Điểm đánh giá", "Review points")}
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-700">
                    +10 pts
                  </div>
                  <p className="mt-1 text-xs font-semibold text-emerald-800">
                    {translate(language, "Điểm thưởng từ đánh giá của booking này.", "Bonus points from this booking's review.")}
                  </p>
                </div>
              ) : null}

              {showCashConfirmationNote ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                  {translate(
                    language,
                    "Đơn trả tại quầy đã được giữ lịch. Manager sẽ xác nhận thu tiền khi bạn check-in.",
                    "This cash booking is scheduled. The manager will collect and confirm payment at check-in.",
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Review Popup */}
          {showReviewPopup && (
              <BookingCompletionPopup
              bookingId={bookingId}
              vehiclePlate={booking.vehiclePlate}
              pointsEarned={bookingPointsEarned}
              isOpen={showReviewPopup}
              onClose={() => setShowReviewPopup(false)}
              onSubmitReview={handleSubmitReview}
            />
          )}
        </div>
      </div>
      <AlertDialog open={showOnlineCancelFeeDialog} onOpenChange={setShowOnlineCancelFeeDialog}>
        <AlertDialogContent className="rounded-2xl border-rose-100 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {translate(language, "Xác nhận huỷ booking đã thanh toán", "Cancel paid online booking?")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-slate-600">
              {translate(
                language,
                "Booking này đã thanh toán online. Nếu bạn tiếp tục huỷ, khoản hoàn tiền có thể bị trừ phí xử lý hoặc phí huỷ theo chính sách của cửa hàng.",
                "This booking has been paid online. If you continue cancelling, any refund may be reduced by a processing or cancellation fee under the store policy.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelBookingMutation.isPending}>
              {translate(language, "Quay lại", "Go back")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={cancelBookingMutation.isPending}
              onClick={executeCancelBooking}
            >
              {cancelBookingMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {translate(language, "Vẫn huỷ booking", "Cancel anyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="text-slate-500">{icon}</span>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="text-sm font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

type StaffDisplay = {
  staffId: string;
  staffName: string;
  sortOrder?: number;
  available?: boolean;
  busyUntil?: string | null;
};

function assignedStaffList(booking: BookingDetail): StaffDisplay[] {
  return (booking.assignedStaff ?? [])
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .filter((item) => Boolean(item.staffId && item.staffName));
}

function staffOptionById(staffOptions: BookingStaffOption[], booking: BookingDetail, staffId: string): StaffDisplay | null {
  if (!staffId) return null;
  return staffOptions.find((staff) => staff.staffId === staffId)
    ?? assignedStaffList(booking).find((staff) => staff.staffId === staffId)
    ?? null;
}

function staffAvailabilityLabel(staff: StaffDisplay) {
  if (staff.available === false) {
    return staff.busyUntil ? `Busy until ${staff.busyUntil}` : "Busy";
  }
  return "Available";
}

function StaffSelectLabel({
  staff,
  statusLabel,
  statusTone,
}: {
  staff: StaffDisplay;
  statusLabel?: string;
  statusTone?: "available" | "busy" | "locked";
}) {
  const busy = staff.available === false;
  const tone = statusTone ?? (busy ? "busy" : "available");
  return (
    <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 pr-2 leading-snug">
      <span className="block max-w-full truncate text-sm font-semibold text-slate-900">
        {staff.staffName}
      </span>
      <span className={cn(
        "text-[11px] font-bold",
        tone === "busy" ? "text-amber-600" : tone === "locked" ? "text-slate-500" : "text-emerald-700",
      )}>
        {statusLabel ?? staffAvailabilityLabel(staff)}
      </span>
    </span>
  );
}

function DetailSection({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <Card className="border-slate-200 bg-white shadow-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(([label, value]) => (
          <SummaryLine key={label} label={label} value={value} />
        ))}
      </CardContent>
    </Card>
  );
}

function SepayInfoRow({
  label,
  value,
  monospace = false,
  onCopy,
}: {
  label: string;
  value: string;
  monospace?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="shrink-0 text-slate-500">{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn("truncate text-right font-bold text-slate-950", monospace ? "font-mono tracking-wide" : "")}>
          {value}
        </span>
        {onCopy ? (
          <Button type="button" size="sm" variant="outline" className="h-7 shrink-0 bg-white px-2 text-[11px]" onClick={onCopy}>
            Copy
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SidebarBlock({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-b border-slate-100 pb-5 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-1 text-sm">{children}</div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  muted = false,
  strong = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${
        strong ? "border-t border-slate-200 pt-3 text-base font-extrabold" : "text-sm"
      } ${muted ? "text-slate-500" : "text-slate-800"}`}
    >
      <span>{label}</span>
      <span className={strong ? "text-slate-900" : "font-semibold text-slate-800"}>{value}</span>
    </div>
  );
}
