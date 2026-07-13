"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Sparkles,
  Wallet,
  ShieldCheck,
  ArrowRight,
  BadgeCheck,
  CreditCard,
  CarFront,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import {
  generateTimeSlotsFromRange,
  formatBookingCurrency,
  formatLocalDateInput,
  getAvailableBookingTimeSlots,
  getPaymentMethodLabel,
} from "@/features/bookings/lib/booking-format";
import { usePublicSettings } from "@/features/settings/hooks/use-public-settings";
import { useActiveCustomerCombos, useBookingCombos, useCreateCustomerBooking, usePurchaseCustomerCombo } from "@/features/bookings/hooks/use-bookings";
import { useCustomerVehicles } from "@/features/vehicles/hooks/use-customer-vehicles";
import { cn } from "@/shared/lib/utils";
import type { BookingCombo, CustomerCombo, PaymentMethod } from "@/entities/bookings";

type CustomerComboCheckoutPageProps = {
  comboId: string;
};

const PAYMENT_METHODS: PaymentMethod[] = ["BANK_TRANSFER", "E_WALLET", "CASH_AT_COUNTER"];

function buildComboHeroImage(combo: BookingCombo) {
  if (
    combo.image &&
    (combo.image.startsWith("/") || combo.image.startsWith("data:") || combo.image.startsWith("http"))
  ) {
    return combo.image;
  }

  const palettes = [
    { start: "#0f172a", end: "#1d4ed8", accent: "#38bdf8" },
    { start: "#111827", end: "#0f766e", accent: "#34d399" },
    { start: "#172554", end: "#7c3aed", accent: "#c084fc" },
    { start: "#3f1d0d", end: "#c2410c", accent: "#fb923c" },
    { start: "#1f2937", end: "#be123c", accent: "#fb7185" },
  ];
  const palette =
    palettes[
      Math.abs(combo.comboId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % palettes.length
    ];
  const safeTitle = combo.name;
  const safeSubtitle = `${combo.durationDays} ngày • ${combo.maxServices} lượt`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette.start}" />
          <stop offset="100%" stop-color="${palette.end}" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.55" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="800" rx="48" fill="url(#bg)" />
      <rect width="1200" height="800" fill="url(#glow)" />
      <circle cx="1010" cy="170" r="150" fill="#ffffff" fill-opacity="0.08" />
      <circle cx="180" cy="680" r="180" fill="#ffffff" fill-opacity="0.06" />
      <path d="M120 520 C240 350, 470 290, 690 350 S1030 520, 1110 470" stroke="#ffffff" stroke-opacity="0.18" stroke-width="18" fill="none" stroke-linecap="round"/>
      <text x="92" y="120" fill="#e0f2fe" font-size="28" font-family="Arial, sans-serif" font-weight="700" letter-spacing="6">AURA CAR CARE</text>
      <text x="92" y="452" fill="#ffffff" font-size="76" font-family="Arial, sans-serif" font-weight="800">${safeTitle}</text>
      <text x="92" y="515" fill="#dbeafe" font-size="30" font-family="Arial, sans-serif" font-weight="600">${safeSubtitle}</text>
      <rect x="92" y="574" width="240" height="58" rx="29" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-opacity="0.24"/>
      <text x="132" y="612" fill="#ffffff" font-size="24" font-family="Arial, sans-serif" font-weight="700">Premium combo</text>
    </svg>
  `.trim();

  if (typeof window === "undefined") {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  const encodedSvg = window.btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encodedSvg}`;
}

export function CustomerComboCheckoutPage({ comboId }: CustomerComboCheckoutPageProps) {
  const router = useRouter();
  const combosQuery = useBookingCombos();
  const activeCombosQuery = useActiveCustomerCombos();
  const vehiclesQuery = useCustomerVehicles();
  const createBookingMutation = useCreateCustomerBooking();
  const purchaseComboMutation = usePurchaseCustomerCombo();
  const publicSettingsQuery = usePublicSettings();
  const [vehicleId, setVehicleId] = useState("");
  const [bookingDate, setBookingDate] = useState(formatLocalDateInput(0));
  const [bookingTime, setBookingTime] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [showValidation, setShowValidation] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  // Dynamic time slots from admin operating hours, fallback to legacy hardcode
  const timeSlots = useMemo(() => {
    const s = publicSettingsQuery.data;
    if (s?.operatingStartTime && s?.operatingEndTime) {
      return generateTimeSlotsFromRange(s.operatingStartTime, s.operatingEndTime);
    }
    return ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
  }, [publicSettingsQuery.data]);

  const selectedCombo = useMemo(
    () => combosQuery.data?.find((combo) => combo.comboId === comboId) ?? null,
    [comboId, combosQuery.data],
  );
  const ownedCombo = useMemo(
    () =>
      activeCombosQuery.data?.find(
        (item) => item.comboId === comboId && Number(item.remainingUsages) > 0,
      ) ?? null,
    [activeCombosQuery.data, comboId],
  );
  const availableTimeSlots = useMemo(
    () => getAvailableBookingTimeSlots(bookingDate, timeSlots),
    [bookingDate, timeSlots],
  );
  const firstAvailableTimeSlot = availableTimeSlots.find((slot) => !slot.disabled)?.time ?? "";

  // Set initial booking time once slots are loaded
  useEffect(() => {
    if (!bookingTime && firstAvailableTimeSlot) {
      setBookingTime(firstAvailableTimeSlot);
    }
  }, [bookingTime, firstAvailableTimeSlot]);

  // Derive combo images (multi or fallback)
  const comboImages = useMemo(() => {
    if (!selectedCombo) return [];
    const urls = selectedCombo.imageUrls && selectedCombo.imageUrls.length > 0
      ? selectedCombo.imageUrls
      : selectedCombo.image
        ? [selectedCombo.image]
        : [];
    return urls;
  }, [selectedCombo]);

  // Auto-advance slideshow every 3 seconds
  useEffect(() => {
    if (comboImages.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % comboImages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [comboImages.length]);

  if (combosQuery.isPending || activeCombosQuery.isPending || vehiclesQuery.isPending) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_25%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center rounded-3xl border border-slate-200 bg-white p-10 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      </div>
    );
  }

  const error = combosQuery.error ?? activeCombosQuery.error ?? vehiclesQuery.error ?? null;
  if (error) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_25%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl border-rose-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle>Không tải được trang thanh toán combo</CardTitle>
            <CardDescription>{getDisplayErrorMessage(error)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/customer/home">Về trang chủ</Link>
            </Button>
            <Button asChild>
              <Link href="/customer/combos">Xem danh sách combo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedCombo) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_25%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle>Combo không tồn tại</CardTitle>
            <CardDescription>Vui lòng quay lại danh sách combo để chọn gói khác.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/customer/home">Về trang chủ</Link>
            </Button>
            <Button asChild>
              <Link href="/customer/combos">Xem combo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const combo = selectedCombo as BookingCombo & { services?: any[] };
  const originalPrice = combo.upgradePriceFrom && combo.upgradePriceFrom > combo.basePrice
    ? combo.upgradePriceFrom
    : combo.basePrice;
  const savings = Math.max(0, originalPrice - combo.basePrice);
  // services may be objects {serviceId, name, ...} or plain strings
  const rawBenefits: any[] = combo.benefits ?? combo.services ?? [];
  const comboBenefits: string[] = rawBenefits.map((b) =>
    typeof b === "string" ? b : (b?.name ?? b?.optionName ?? JSON.stringify(b))
  );
  const heroImageSrc = buildComboHeroImage(combo);
  const vehicles = vehiclesQuery.data?.items ?? [];
  const selectedVehicle = vehicles.find((item) => item.vehicleId === vehicleId) ?? null;
  const demoVisualBenefits = [
    "Khoang nội thất sạch sâu, hoàn thiện nhanh",
    "Bề mặt sơn bóng hơn sau mỗi lần dùng",
    "Phù hợp khách hàng đi xe thường xuyên trong tháng",
  ];
  const paymentMethods = [
    {
      label: "Chuyển khoản ngân hàng",
      note: "Xác nhận tự động sau khi nối cổng thanh toán",
    },
    {
      label: "Ví điện tử",
      note: "Dùng cho luồng QR hoặc ví liên kết ở giai đoạn sau",
    },
    {
      label: "Thanh toán tại quầy",
      note: "Nhân viên xác nhận gói trực tiếp tại cửa hàng",
    },
  ];

  if (!vehicleId && vehicles.length > 0) {
    const nextVehicleId = vehicles.find((item) => item.isPrimary)?.vehicleId ?? vehicles[0]?.vehicleId ?? "";
    if (nextVehicleId) {
      setTimeout(() => setVehicleId(nextVehicleId), 0);
    }
  }

  const fieldErrors = {
    vehicleId: !vehicleId ? "Vui lòng chọn xe." : null,
    bookingDate: !bookingDate ? "Vui lòng chọn ngày đặt lịch." : null,
    bookingTime: !bookingTime ? "Vui lòng chọn giờ đặt lịch." : null,
    paymentMethod: !paymentMethod ? "Vui lòng chọn phương thức thanh toán." : null,
  };

  const handleConfirm = async () => {
    setShowValidation(true);

    if (!ownedCombo && fieldErrors.paymentMethod) {
      toast.error("Thiếu thông tin thanh toán combo.");
      return;
    }

    if (
      ownedCombo &&
      (fieldErrors.vehicleId || fieldErrors.bookingDate || fieldErrors.bookingTime || fieldErrors.paymentMethod)
    ) {
      toast.error("Thiếu thông tin đặt lịch cho combo.");
      return;
    }

    try {
      if (ownedCombo) {
        const booking = await createBookingMutation.mutateAsync({
          mode: "COMBO",
          vehicleId,
          packageId: "",
          comboId: combo.comboId,
          addonIds: [],
          bookingDate,
          bookingTime,
          voucherCode: "",
          paymentMethod,
        });

        toast.success("Đã dùng combo sẵn có và tạo lịch thành công.");
        router.push(`/customer/bookings/${booking.bookingId}`);
        return;
      }

      await purchaseComboMutation.mutateAsync({
        comboId: combo.comboId,
        paymentMethod,
      });

      toast.success("Đã mua combo thành công. Bạn có thể dùng gói này để đặt lịch ngay bây giờ.");
      router.push("/customer/home");
    } catch (submitError) {
      toast.error(getDisplayErrorMessage(submitError));
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Combo Checkout</h1>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/customer/home">Back to home</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,380px]">

          {/* ── Left: Combo info + booking form ── */}
          <div className="space-y-4">

            {/* Combo summary card */}
            <Card className="border-border/70 bg-card shadow-sm">
              <CardContent className="p-5 space-y-4">
                {/* Image slideshow */}
                {comboImages.length > 0 && (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100 group">
                    {comboImages.map((src, i) => (
                      <img
                        key={src}
                        src={src}
                        alt={`${combo.name} - ${i + 1}`}
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === slideIndex ? "opacity-100" : "opacity-0"}`}
                      />
                    ))}
                    {comboImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/50"
                          onClick={() => setSlideIndex((prev) => (prev > 0 ? prev - 1 : comboImages.length - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/50"
                          onClick={() => setSlideIndex((prev) => (prev < comboImages.length - 1 ? prev + 1 : 0))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                          {comboImages.map((_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${i === slideIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-foreground">{combo.name}</h2>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full text-xs">{combo.durationDays} days</Badge>
                      <Badge variant="outline" className="rounded-full text-xs">Max {combo.maxServices} uses</Badge>
                      <Badge variant="outline" className={`rounded-full text-xs ${combo.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
                        {combo.isActive ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="text-2xl font-black text-primary">{formatBookingCurrency(combo.basePrice)}</p>
                    {savings > 0 && (
                      <p className="text-xs text-emerald-600 font-semibold">Save {formatBookingCurrency(savings)}</p>
                    )}
                  </div>
                </div>

                {/* Services included */}
                {comboBenefits.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Services included</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {comboBenefits.map((benefit) => (
                        <div key={benefit} className="flex items-center gap-2 text-sm text-foreground">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Owned combo notice */}
                {ownedCombo && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <span className="font-bold">You already own this combo</span> — {ownedCombo.remainingUsages} uses left, expires {new Date(ownedCombo.expiresAt).toLocaleDateString("en-GB")}.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking form (only when using owned combo) */}
            {ownedCombo && (
              <Card className="border-border/70 bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Schedule your appointment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {/* Vehicle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Vehicle</label>
                    <select
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles.map((v) => (
                        <option key={v.vehicleId} value={v.vehicleId}>{v.plate} · {v.brand} {v.model}</option>
                      ))}
                    </select>
                    {showValidation && fieldErrors.vehicleId && <p className="text-xs text-rose-600">{fieldErrors.vehicleId}</p>}
                  </div>

                  {/* Date + Time */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Date</label>
                      <input
                        type="date"
                        min={formatLocalDateInput(0)}
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      {showValidation && fieldErrors.bookingDate && <p className="text-xs text-rose-600">{fieldErrors.bookingDate}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Time</label>
                      <select
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {availableTimeSlots.map(({ time, disabled }) => (
                          <option key={time} value={time} disabled={disabled}>{time}</option>
                        ))}
                      </select>
                      {showValidation && fieldErrors.bookingTime && <p className="text-xs text-rose-600">{fieldErrors.bookingTime}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right: Payment + confirm ── */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="border-border/70 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Payment method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {PAYMENT_METHODS.map((method) => {
                  const active = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                        active ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-foreground hover:border-primary/40"
                      }`}
                    >
                      <span>{getPaymentMethodLabel(method)}</span>
                      {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
                {showValidation && fieldErrors.paymentMethod && <p className="text-xs text-rose-600">{fieldErrors.paymentMethod}</p>}
              </CardContent>
            </Card>

            {/* Order summary */}
            <Card className="border-border/70 bg-card shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base price</span>
                  <span className="font-medium">{formatBookingCurrency(originalPrice)}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-semibold text-emerald-600">−{formatBookingCurrency(savings)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="text-lg font-black text-primary">{formatBookingCurrency(combo.basePrice)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Error */}
            {(createBookingMutation.isError || purchaseComboMutation.isError) && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {getDisplayErrorMessage(createBookingMutation.error ?? purchaseComboMutation.error ?? null)}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="h-11 rounded-xl font-bold gap-2"
                onClick={handleConfirm}
                disabled={createBookingMutation.isPending || purchaseComboMutation.isPending || !combo.isActive || Boolean(ownedCombo && vehicles.length === 0)}
              >
                {createBookingMutation.isPending || purchaseComboMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{ownedCombo ? "Booking..." : "Processing..."}</>
                ) : (
                  <>{ownedCombo ? "Use combo & book" : "Purchase combo"}<ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl">
                <Link href="/customer/combos">Browse other combos</Link>
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function InfoBox({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</div>
          <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
          <div className="mt-1 text-xs text-slate-500">{helper}</div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className={cn("text-right text-sm font-semibold text-slate-900", mono && "font-mono text-xs sm:text-sm")}>
        {value}
      </div>
    </div>
  );
}
