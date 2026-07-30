import { useState } from "react";
import { BellRing, Car, Clock, Eye, UserCheck, X } from "lucide-react";
import { Booking, STATUS_STYLES, fmtBookingMoney, useBookings } from "@/features/bookings/lib/booking-store";
import { Card } from "@/shared/ui/ui/card";
import { Button } from "@/shared/ui/ui/button";
import { useLanguageStore, translate } from "@/shared/store/language.store";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/ui/select";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

export function CustomerHistory({ onTrack }: { onTrack: () => void }) {
  const { language } = useLanguageStore();
  const locale = language === "vi" ? "vi-VN" : "en-US";
  const { bookings, transactions, updateStatus, setSelectedBookingId, setReminder } = useBookings();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const upcoming = bookings.filter((booking) =>
    ["Pending", "Confirmed", "Checked-in"].includes(booking.status),
  );
  const past = bookings.filter((booking) =>
    ["Completed", "Cancelled", "No-show"].includes(booking.status),
  );
  const detailBooking = bookings.find((booking) => booking.id === detailId) ?? null;
  const cancellingBooking = bookings.find((booking) => booking.id === cancelId) ?? null;
  const detailTransaction =
    transactions.find((transaction) => transaction.id === detailBooking?.checkoutTransactionId) ??
    transactions.find((transaction) => transaction.bookingId === detailBooking?.id) ??
    null;

  const renderCard = (booking: Booking) => {
    const cancellable = booking.status === "Pending" || booking.status === "Confirmed";
    const trackable = booking.status !== "Cancelled";
    const reminderValue = booking.reminderMinutesBefore
      ? String(booking.reminderMinutesBefore)
      : "none";

    const handleReminderChange = (value: string) => {
      const minutes = value === "none" ? null : Number(value);
      setReminder(booking.id, minutes);
      if (minutes && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      toast.success(
        minutes
          ? translate(language, `Đã đặt nhắc nhở trước ${minutes} phút cho xe ${booking.vehiclePlate}.`, `Reminder set ${minutes} minutes before check-in for ${booking.vehiclePlate}.`)
          : translate(language, `Đã hủy nhắc nhở cho xe ${booking.vehiclePlate}.`, `Reminder removed for ${booking.vehiclePlate}.`),
      );
    };

    return (
      <Card
        key={booking.id}
        className="group relative overflow-hidden rounded-[1.5rem] border-border/55 bg-card/60 p-6 backdrop-blur-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-primary/10 to-indigo-500/10 text-primary shadow-inner transition-transform duration-300 group-hover:scale-105">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg text-foreground">#{booking.vehiclePlate}</span>
                <span
                  className={cn(
                    "rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm",
                    STATUS_STYLES[booking.status],
                  )}
                >
                  {booking.status}
                </span>
              </div>
              <div className="mt-2 font-medium text-foreground">
                {booking.vehicleName} <span className="mx-1 text-muted-foreground">/</span>{" "}
                <span className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {booking.vehiclePlate}
                </span>
              </div>
              <div className="mt-1.5 text-sm font-medium text-muted-foreground">
                {booking.services.join(", ")}
              </div>
              <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <UserCheck className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {booking.assignedStaffName || translate(language, "Chưa gán staff", "No staff assigned")}
                </span>
              </div>
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-accent/30 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" /> {booking.scheduledAt}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-4 w-full sm:w-auto mt-2 sm:mt-0">
            <div className="text-left sm:text-right w-full sm:w-auto flex justify-between sm:block border-b border-border/50 pb-3 sm:border-0 sm:pb-0">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {translate(language, "Tổng thanh toán", "Total")}
              </div>
              <div className="text-xl font-bold text-primary">
                {fmtBookingMoney(booking.totalPrice)}
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {cancellable && (
                <div className="min-w-[170px]">
                  <Select value={reminderValue} onValueChange={handleReminderChange}>
                    <SelectTrigger
                      className="h-9 rounded-xl border-border/60 bg-background/60 text-xs font-semibold"
                      aria-label={`Reminder for booking ${booking.id}`}
                    >
                      <BellRing className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      <SelectValue placeholder={translate(language, "Nhắc nhở", "Reminder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">{translate(language, "Không nhắc nhở", "No reminder")}</SelectItem>
                        <SelectItem value="15">{translate(language, "Trước 15 phút", "15 min before")}</SelectItem>
                        <SelectItem value="30">{translate(language, "Trước 30 phút", "30 min before")}</SelectItem>
                        <SelectItem value="60">{translate(language, "Trước 60 phút", "60 min before")}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailId(booking.id)}
                className="rounded-xl font-semibold hover:bg-accent hover:text-foreground"
              >
                <Eye className="mr-1.5 h-4 w-4" /> {translate(language, "Xem", "View")}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setSelectedBookingId(booking.id);
                  onTrack();
                }}
                disabled={!trackable}
                className="rounded-xl font-bold shadow-md shadow-primary/20"
              >
                {translate(language, "Theo dõi", "Track")}
              </Button>
              {cancellable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelId(booking.id)}
                  className="rounded-xl border-rose-200/50 text-rose-600 font-semibold hover:bg-rose-500/10 hover:text-rose-700 hover:border-rose-300"
                >
                  <X className="mr-1.5 h-4 w-4" /> {translate(language, "Hủy lịch", "Cancel")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-10">
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {translate(language, "SẮP TỚI", "UPCOMING")}{" "}
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {upcoming.length}
          </span>
        </h3>
        <div className="space-y-4">
          {upcoming.length === 0 && (
            <p className="text-sm font-medium text-muted-foreground italic pl-4 border-l-2 border-border">
              {translate(language, "Không có lịch hẹn sắp tới.", "No upcoming bookings.")}
            </p>
          )}
          {upcoming.map(renderCard)}
        </div>
      </div>
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> {translate(language, "LỊCH SỬ", "HISTORY")}{" "}
          <span className="bg-accent px-2 py-0.5 rounded-full text-foreground">{past.length}</span>
        </h3>
        <div className="space-y-4">
          {past.length === 0 && (
            <p className="text-sm font-medium text-muted-foreground italic pl-4 border-l-2 border-border">
              {translate(language, "Chưa có lịch sử đặt xe.", "No booking history yet.")}
            </p>
          )}
          {past.map(renderCard)}
        </div>
      </div>

      <AlertDialog open={!!cancelId} onOpenChange={(open: boolean) => !open && setCancelId(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border/50 bg-card/90 backdrop-blur-2xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">{translate(language, "Hủy đặt lịch này?", "Cancel this booking?")}</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {translate(language, `Hành động này sẽ hủy vĩnh viễn lịch hẹn xe #${cancellingBooking?.vehiclePlate ?? ""}. Không thể hoàn tác hành động này.`, `This will permanently cancel booking for vehicle #${cancellingBooking?.vehiclePlate ?? ""}. This action cannot be undone.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="rounded-xl font-semibold">{translate(language, "Giữ lịch hẹn", "Keep Booking")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20"
              onClick={() => {
                if (!cancelId) return;

                try {
                  updateStatus(cancelId, "Cancelled");
                  toast.success(translate(language, `Lịch hẹn xe ${cancellingBooking?.vehiclePlate ?? ""} đã bị hủy`, `Booking for vehicle ${cancellingBooking?.vehiclePlate ?? ""} cancelled`));
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : translate(language, "Không thể hủy lịch hẹn.", "Unable to cancel booking."));
                } finally {
                  setCancelId(null);
                }
              }}
            >
              {translate(language, "Đúng, Hủy lịch", "Yes, Cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!detailId} onOpenChange={(open: boolean) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl rounded-[2rem] border-border/50 bg-card/95 backdrop-blur-2xl shadow-2xl p-0">
          {detailBooking && (
            <div className="p-8">
              <DialogHeader className="mb-6 border-b border-border/50 pb-6">
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  {translate(language, "Đặt lịch", "Booking")} <span className="text-primary">#{detailBooking.vehiclePlate}</span>
                </DialogTitle>
                <DialogDescription className="text-base font-medium mt-2 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  {detailBooking.vehicleName} <span className="opacity-50">/</span>{" "}
                  <span className="font-mono bg-accent px-1.5 py-0.5 rounded">
                    {detailBooking.vehiclePlate}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 text-sm">
                <section className="grid gap-4 rounded-2xl border border-border/50 bg-background/50 p-5 sm:grid-cols-2 shadow-sm">
                  <Info
                    label={translate(language, "Trạng thái", "Status")}
                    value={detailBooking.status}
                    badgeClass={STATUS_STYLES[detailBooking.status]}
                  />
                  <Info label={translate(language, "Khách hàng", "Customer")} value={detailBooking.customerName ?? translate(language, "Khách hàng hiện tại", "Current customer")} />
                  <Info label={translate(language, "Số điện thoại", "Phone")} value={detailBooking.customerPhone ?? "-"} />
                  <Info label={translate(language, "Loại xe", "Vehicle type")} value={detailBooking.vehicleType} />
                  <Info label={translate(language, "Lên lịch lúc", "Scheduled")} value={detailBooking.scheduledAt} />
                  <Info
                    label={translate(language, "Nhắc nhở", "Reminder")}
                    value={
                      detailBooking.reminderMinutesBefore
                        ? translate(language, `Trước giờ hẹn ${detailBooking.reminderMinutesBefore} phút`, `${detailBooking.reminderMinutesBefore} minutes before check-in`)
                        : translate(language, "Không có", "None")
                    }
                  />
                  <Info label={translate(language, "Dịch vụ", "Services")} value={detailBooking.services.join(", ")} />
                  <Info
                    label={translate(language, "Tổng chi phí", "Booking total")}
                    value={fmtBookingMoney(detailBooking.totalPrice)}
                    highlight
                  />
                  <Info
                    label={translate(language, "Nhân viên phụ trách", "Assigned staff")}
                    value={detailBooking.assignedStaffName || translate(language, "Chưa gán staff", "No staff assigned")}
                  />
                  <Info label={translate(language, "Ghi chú", "Notes")} value={detailBooking.notes || translate(language, "Không có", "None")} />
                </section>

                <section className="grid gap-4 rounded-2xl border border-border/50 bg-background/50 p-5 sm:grid-cols-2 shadow-sm">
                  <Info
                    label={translate(language, "Thời gian nhận xe", "Check-in time")}
                    value={
                      detailBooking.checkInAt
                        ? new Date(detailBooking.checkInAt).toLocaleString(locale)
                        : translate(language, "Chưa nhận xe", "Not checked in")
                    }
                  />
                  <Info label={translate(language, "Phiên rửa xe", "Wash session")} value={detailBooking.washStatus ?? translate(language, "Chưa bắt đầu", "Not started")} />
                  <Info
                    label={translate(language, "Hoàn thành lúc", "Completed at")}
                    value={
                      detailBooking.completedAt
                        ? new Date(detailBooking.completedAt).toLocaleString(locale)
                        : translate(language, "Chưa hoàn thành", "Not completed")
                    }
                  />
                  <Info
                    label={translate(language, "Phương thức thanh toán", "Payment method")}
                    value={detailBooking.checkoutPaymentMethod ?? translate(language, "Chưa thanh toán", "Not paid")}
                  />
                </section>

                <section className="rounded-2xl border border-border/50 bg-accent/10 p-5 shadow-sm">
                  <div className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50 pb-2">
                    {translate(language, "Tóm tắt thanh toán", "Checkout Summary")}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Info
                      label={translate(language, "Giao dịch", "Transaction")}
                      value={detailBooking.checkoutTransactionId ?? translate(language, "Chờ xử lý", "Pending")}
                    />
                    <Info
                      label={translate(language, "Số tiền cuối cùng", "Final amount")}
                      highlight
                      value={
                        typeof detailBooking.checkoutAmount === "number"
                          ? fmtBookingMoney(detailBooking.checkoutAmount)
                          : translate(language, "Chờ xử lý", "Pending")
                      }
                    />
                    <Info
                      label={translate(language, "Điểm đã đổi", "Points redeemed")}
                      value={String(detailBooking.checkoutPointsRedeemed ?? 0)}
                    />
                    <Info
                      label={translate(language, "Điểm tích lũy được", "Points earned")}
                      value={String(detailBooking.checkoutPointsEarned ?? 0)}
                    />
                    <Info label={translate(language, "Mã khuyến mãi", "Promo code")} value={detailBooking.checkoutPromoCode ?? translate(language, "Không có", "None")} />
                  </div>
                </section>

                <section className="rounded-2xl border border-border/50 bg-accent/10 p-5 shadow-sm">
                  <div className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50 pb-2">
                    {translate(language, "Thông tin giao dịch", "Payment Transaction")}
                  </div>
                  {detailTransaction ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Info label={translate(language, "Mã biên lai", "Receipt ID")} value={detailTransaction.id} />
                      <Info
                        label={translate(language, "Thời gian thanh toán", "Paid at")}
                        value={new Date(detailTransaction.date).toLocaleString(locale)}
                      />
                      <Info label={translate(language, "Tạm tính", "Subtotal")} value={fmtBookingMoney(detailTransaction.subtotal)} />
                      <Info
                        label={translate(language, "Tổng đã trả", "Total paid")}
                        value={fmtBookingMoney(detailTransaction.finalAmount)}
                        highlight
                      />
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground italic py-2">
                      {translate(language, "Chưa ghi nhận giao dịch.", "No transaction recorded yet.")}
                    </p>
                  )}
                </section>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({
  label,
  value,
  badgeClass,
  highlight,
}: {
  label: string;
  value: string;
  badgeClass?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {badgeClass ? (
        <span
          className={cn(
            "mt-1.5 inline-flex rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm",
            badgeClass,
          )}
        >
          {value}
        </span>
      ) : (
        <div
          className={cn(
            "mt-1.5 font-medium",
            highlight ? "text-lg font-bold text-primary" : "text-foreground",
          )}
        >
          {value}
        </div>
      )}
    </div>
  );
}
