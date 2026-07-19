"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, CarFront, CheckCircle2, ClipboardList, Languages, Loader2, RefreshCcw, Timer } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { formatBookingCurrency } from "@/features/bookings/lib/booking-format";
import { useActiveWashTracking, useCustomerBookingDetail } from "@/features/bookings/hooks/use-bookings";
import { ApplyPointsPanel } from "@/features/bookings/components/apply-points-panel";
import type { WashTrackingSession } from "@/entities/bookings";
import { useLanguageStore } from "@/shared/store/language.store";
import { BookingCompletionPopup } from "@/features/bookings/components/booking-completion-popup";
import { submitBookingReview } from "@/features/bookings/lib/review-service";
import { BookingLiveSessionCard } from "@/shared/ui/customer/customer-experience";

type TrackingLanguage = "vi" | "en";
const STEPS: Array<WashTrackingSession["status"]> = ["PENDING", "QUEUED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"];

const STATUS_LABELS: Record<"vi" | "en", Partial<Record<WashTrackingSession["status"], string>>> = {
  vi: {
    PENDING: "Chờ duyệt",
    QUEUED: "Đang xếp hàng",
    CHECKED_IN: "Đã check-in",
    IN_PROGRESS: "Đang rửa",
    COMPLETED: "Hoàn thành",
  },
  en: {
    PENDING: "Pending",
    QUEUED: "Queued",
    CHECKED_IN: "Checked in",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
  },
};

const COPY = {
  vi: {
    badge: "Theo dõi rửa xe",
    title: "Theo dõi phiên rửa đang hoạt động",
    subtitle: "Xem trạng thái hiện tại, thông tin xe, lịch hẹn và áp điểm trực tiếp vào đặt lịch trước khi check-in.",
    refresh: "Làm mới",
    loadingBooking: "Đang tải thông tin đặt lịch...",
    bookingUnavailable: "Không thể tải đặt lịch để áp điểm.",
    trackingErrorTitle: "Không thể tải theo dõi phiên rửa",
    quickActions: "Thao tác nhanh",
    quickActionsDescription: "Mở chi tiết đặt lịch hoặc danh sách đặt lịch của bạn.",
    viewBooking: "Xem đặt lịch",
    bookingList: "Danh sách đặt lịch",
    heroEyebrow: "Phiên đang theo dõi",
    status: "Trạng thái",
    timelineTitle: "Tiến độ phiên rửa",
    timelineDescription: "Cập nhật theo vòng đời vận hành từ backend.",
    detailTitle: "Chi tiết phiên rửa",
    detailDescription: "Thông tin đặt lịch, xe và phí được lấy từ dữ liệu thật.",
    vehicle: "Xe",
    plate: "Biển số",
    phone: "Số điện thoại",
    schedule: "Lịch hẹn",
    staff: "Nhân viên",
    unassigned: "Chưa phân công",
    fee: "Phí dịch vụ",
    notAvailable: "Chưa có",
    projectedPoints: "Điểm dự kiến",
    awardedPoints: "Điểm đã cộng",
    pointsUnit: "điểm",
    notes: "Ghi chú",
    noNotes: "Không có ghi chú",
    defaultService: "Gói rửa",
    emptyTitle: "Chưa có phiên rửa đang hoạt động",
    emptyDescription: "Khi nhân viên tạo phiên rửa từ đặt lịch của bạn, trạng thái sẽ xuất hiện tại đây.",
    newBooking: "Đặt lịch mới",
    language: "Ngôn ngữ",
  },
  en: {
    badge: "Wash tracking",
    title: "Track your active wash session",
    subtitle: "View the current status, vehicle details, schedule, and apply points directly before check-in.",
    refresh: "Refresh",
    loadingBooking: "Loading booking details...",
    bookingUnavailable: "Unable to load booking for point application.",
    trackingErrorTitle: "Unable to load wash tracking",
    quickActions: "Quick actions",
    quickActionsDescription: "Open booking details or your booking list.",
    viewBooking: "View booking",
    bookingList: "Booking list",
    heroEyebrow: "Active session",
    status: "Status",
    timelineTitle: "Wash session progress",
    timelineDescription: "Updated from the backend operations lifecycle.",
    detailTitle: "Wash session details",
    detailDescription: "Booking, vehicle, and fee details are loaded from real backend data.",
    vehicle: "Vehicle",
    plate: "Plate",
    phone: "Phone",
    schedule: "Schedule",
    staff: "Staff",
    unassigned: "Unassigned",
    fee: "Service fee",
    notAvailable: "Not available",
    projectedPoints: "Projected points",
    awardedPoints: "Awarded points",
    pointsUnit: "points",
    notes: "Notes",
    noNotes: "No notes",
    defaultService: "Wash package",
    emptyTitle: "No active wash session yet",
    emptyDescription: "Once staff creates a wash session from your booking, its live status will appear here.",
    newBooking: "New booking",
    language: "Language",
  },
} as const;

function toTrackingDateTime(bookingDate?: string | null, bookingTime?: string | null) {
  if (!bookingDate || !bookingTime) return null;
  const normalizedTime = bookingTime.length === 5 ? `${bookingTime}:00` : bookingTime;
  return `${bookingDate}T${normalizedTime}`;
}

function toLiveTrackingStatus(status: WashTrackingSession["status"]) {
  return status === "QUEUED" ? "QUEUED" : status;
}

export function CustomerWashTrackingPage() {
  const getErrorMessage = useErrorMessage();
  const { language, setLanguage } = useLanguageStore();
  const copy = COPY[language];
  const activeQuery = useActiveWashTracking();
  const activeSession = activeQuery.data ?? null;
  const bookingQuery = useCustomerBookingDetail(activeSession?.bookingId ?? "");

  const [showCompletion, setShowCompletion] = useState(false);
  const [hasShownFor, setHasShownFor] = useState<string | null>(null);

  useEffect(() => {
    if (activeSession && activeSession.status === "COMPLETED" && hasShownFor !== activeSession.bookingId) {
      setShowCompletion(true);
      setHasShownFor(activeSession.bookingId);
    }
  }, [activeSession, hasShownFor]);

  function handleLanguageChange(nextLanguage: "vi" | "en") {
    setLanguage(nextLanguage);
  }

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_26%),linear-gradient(180deg,#f5fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white/90 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
                <Timer className="h-3.5 w-3.5" />
                {copy.badge}
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{copy.title}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <LanguageToggle language={language} onChange={handleLanguageChange} label={copy.language} />
              <Button type="button" variant="outline" onClick={() => activeQuery.refetch()} disabled={activeQuery.isFetching}>
                {activeQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                {copy.refresh}
              </Button>
            </div>
          </div>
        </section>

        {activeQuery.isPending ? (
          <div className="h-96 animate-pulse rounded-[2rem] bg-slate-100" />
        ) : activeQuery.isError ? (
          <Card className="border-rose-200 bg-white">
            <CardHeader>
              <CardTitle>{copy.trackingErrorTitle}</CardTitle>
              <CardDescription>{getErrorMessage(activeQuery.error)}</CardDescription>
            </CardHeader>
          </Card>
        ) : !activeSession ? (
          <EmptyTrackingState copy={copy} />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <BookingLiveSessionCard
                language={language}
                bookingCode={activeSession.bookingId}
                serviceName={activeSession.serviceName ?? activeSession.packageId ?? copy.defaultService}
                status={toLiveTrackingStatus(activeSession.status)}
                scheduledAt={toTrackingDateTime(activeSession.bookingDate, activeSession.bookingTime)}
                timestamps={{
                  PENDING: activeSession.createdAt,
                  SCHEDULED: activeSession.queuedAt,
                  CHECKED_IN: activeSession.checkedInAt,
                  IN_PROGRESS: activeSession.startedAt,
                  COMPLETED: activeSession.completedAt,
                }}
              />
              <TrackingHero session={activeSession} copy={copy} language={language} />
              <TrackingTimeline session={activeSession} copy={copy} language={language} />
              <TrackingDetails session={activeSession} copy={copy} />
            </div>
            <div className="space-y-6">
              {bookingQuery.data ? (
                <ApplyPointsPanel
                  bookingId={bookingQuery.data.bookingId}
                  finalAmount={bookingQuery.data.pricing.finalAmount}
                  pointsRedeemed={0}
                  pointsDiscount={bookingQuery.data.pricing.discountAmount}
                  disabled={bookingQuery.data.status !== "CONFIRMED"}
                  language={language}
                />
              ) : (
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-6 text-sm text-slate-500">
                    {bookingQuery.isPending ? copy.loadingBooking : copy.bookingUnavailable}
                  </CardContent>
                </Card>
              )}

              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle>{copy.quickActions}</CardTitle>
                  <CardDescription>{copy.quickActionsDescription}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Button asChild variant="outline">
                    <Link href={`/customer/bookings/${activeSession.bookingId}`}>
                      <ClipboardList className="mr-2 h-4 w-4" />
                      {copy.viewBooking}
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/customer/bookings">{copy.bookingList}</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {activeSession && (
        <BookingCompletionPopup
          bookingId={activeSession.bookingId}
          pointsEarned={activeSession.awardedLoyaltyPoints ?? 10}
          isOpen={showCompletion}
          onClose={() => setShowCompletion(false)}
          onSubmitReview={async (stars, comment, images) => {
            await submitBookingReview({
              bookingId: activeSession.bookingId,
              rating: stars,
              comment,
              beforeImageUrl: images.beforeImageUrl,
              afterImageUrl: images.afterImageUrl,
            });
          }}
        />
      )}
    </div>
  );
}

function LanguageToggle({
  language,
  onChange,
  label,
}: {
  language: TrackingLanguage;
  onChange: (language: TrackingLanguage) => void;
  label: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm"
      role="group"
      aria-label={label}
    >
      <Languages className="ml-2 h-4 w-4 text-slate-500" />
      {(["vi", "en"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={
            language === item
              ? "rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold uppercase text-white shadow-sm"
              : "rounded-full px-3 py-1.5 text-xs font-bold uppercase text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          }
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function TrackingHero({
  session,
  copy,
  language,
}: {
  session: WashTrackingSession;
  copy: (typeof COPY)[TrackingLanguage];
  language: TrackingLanguage;
}) {
  return (
    <Card className="overflow-hidden border-sky-100 bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 text-white shadow-[0_24px_70px_rgba(14,165,233,0.25)]">
      <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-sky-200">{copy.heroEyebrow}</div>
          <h2 className="mt-3 text-3xl font-black tracking-tight">{session.bookingId}</h2>
          <p className="mt-2 text-sky-100">
            {session.customerName} · {session.vehiclePlate} · {session.serviceName ?? session.packageId ?? copy.defaultService}
          </p>
        </div>
        <div className="rounded-3xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-sky-100">{copy.status}</div>
          <div className="mt-2 text-2xl font-black">{statusLabel(session.status, language)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrackingTimeline({
  session,
  copy,
  language,
}: {
  session: WashTrackingSession;
  copy: (typeof COPY)[TrackingLanguage];
  language: TrackingLanguage;
}) {
  const activeIndex = STEPS.indexOf(session.status);
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader>
        <CardTitle>{copy.timelineTitle}</CardTitle>
        <CardDescription>{copy.timelineDescription}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-5">
        {STEPS.map((step, index) => {
          const done = index <= activeIndex;
          return (
            <div
              key={step}
              className={done ? "rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-800" : "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500"}
            >
              <CheckCircle2 className={done ? "h-5 w-5 text-sky-600" : "h-5 w-5 text-slate-300"} />
              <div className="mt-3 text-sm font-bold">{statusLabel(step, language)}</div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function TrackingDetails({
  session,
  copy,
}: {
  session: WashTrackingSession;
  copy: (typeof COPY)[TrackingLanguage];
}) {
  const rows: Array<[string, string]> = [
    [copy.vehicle, `${session.vehicleBrand} ${session.vehicleModel}`],
    [copy.plate, session.vehiclePlate],
    [copy.phone, session.customerPhone],
    [copy.schedule, `${session.bookingDate} ${session.bookingTime}`],
    [copy.staff, session.assignedStaffName ?? copy.unassigned],
    [copy.fee, session.feeAmount ? formatBookingCurrency(session.feeAmount) : copy.notAvailable],
    [copy.projectedPoints, session.projectedLoyaltyPoints == null ? copy.notAvailable : `${session.projectedLoyaltyPoints} ${copy.pointsUnit}`],
    [copy.awardedPoints, session.awardedLoyaltyPoints == null ? copy.notAvailable : `${session.awardedLoyaltyPoints} ${copy.pointsUnit}`],
    [copy.notes, session.notes ?? copy.noNotes],
  ];

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader>
        <CardTitle>{copy.detailTitle}</CardTitle>
        <CardDescription>{copy.detailDescription}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
            <div className="mt-1 font-semibold text-slate-900">{value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyTrackingState({ copy }: { copy: (typeof COPY)[TrackingLanguage] }) {
  return (
    <Card className="border-dashed border-sky-200 bg-white">
      <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-600">
          <CarFront className="h-7 w-7" />
        </span>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">{copy.emptyTitle}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{copy.emptyDescription}</p>
        </div>
        <Button asChild>
          <Link href="/customer/bookings/new">
            <CalendarClock className="mr-2 h-4 w-4" />
            {copy.newBooking}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function statusLabel(status: WashTrackingSession["status"], language: TrackingLanguage) {
  return STATUS_LABELS[language][status] ?? status;
}
