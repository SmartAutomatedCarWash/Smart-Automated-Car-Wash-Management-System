"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Sparkles,
  Tag,
  Timer,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { CountdownTimer } from "@/features/bookings/components/countdown-timer";
import {
  buildBookingSummary,
  formatBookingCurrency,
  getModeLabel,
  validateBookingDraft,
} from "@/features/bookings/lib/booking-format";
import {
  useActiveCustomerCombos,
  useBookingAddons,
  useBookingCombos,
  useBookingPackages,
  useCreateCustomerBooking,
} from "@/features/bookings/hooks/use-bookings";
import { useSlotHold } from "@/features/bookings/hooks/use-slot-hold";
import { useCustomerVehicles } from "@/features/vehicles/hooks/use-customer-vehicles";
import { useBookingStore } from "@/features/bookings/store/booking.store";
import type { PaymentMethod } from "@/entities/bookings";

// ─── Payment method config ───────────────────────────────────────────────────

const PAYMENT_OPTIONS: {
  method: PaymentMethod;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
}[] = [
  {
    method: "CASH_AT_COUNTER",
    label: "Cash at counter",
    description: "Pay in cash when you arrive at the wash bay.",
    icon: Banknote,
  },
  {
    method: "BANK_TRANSFER",
    label: "Bank transfer",
    description: "Transfer to our account before your appointment.",
    icon: Building2,
  },
  {
    method: "E_WALLET",
    label: "E-wallet",
    description: "Pay via MoMo, ZaloPay, VNPay or other e-wallets.",
    icon: Wallet,
    badge: "Popular",
  },
];

// ─── Main component ──────────────────────────────────────────────────────────

export function BookingConfirmPage() {
  const router = useRouter();
  const draft = useBookingStore((state) => state.draft);
  const expiresAt = useBookingStore((state) => state.expiresAt);
  const validatedVoucher = useBookingStore((state) => state.validatedVoucher);
  const updateDraft = useBookingStore((state) => state.updateDraft);
  const resetDraft = useBookingStore((state) => state.resetDraft);
  const setExpiresAt = useBookingStore((state) => state.setExpiresAt);
  const setLastCreatedBooking = useBookingStore((state) => state.setLastCreatedBooking);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(draft.paymentMethod);
  const [showPaymentError, setShowPaymentError] = useState(false);
  const [expired, setExpired] = useState(false);

  const vehiclesQuery = useCustomerVehicles();
  const packagesQuery = useBookingPackages();
  const addonsQuery = useBookingAddons();
  const combosQuery = useBookingCombos();
  const activeCustomerCombosQuery = useActiveCustomerCombos();
  const createBookingMutation = useCreateCustomerBooking();
  const { releaseSlot, isReleasing } = useSlotHold();

  const vehicles = vehiclesQuery.data?.items ?? [];
  const packages = packagesQuery.data ?? [];
  const addons = addonsQuery.data ?? [];
  const combos = combosQuery.data ?? [];
  const activeCustomerCombos = activeCustomerCombosQuery.data ?? [];
  const selectedCustomerCombo =
    draft.mode === "COMBO"
      ? (activeCustomerCombos.find((item) => item.comboId === draft.comboId) ?? null)
      : null;

  const summary = useMemo(
    () =>
      buildBookingSummary(draft, {
        packages,
        addons,
        combos,
        voucher: validatedVoucher,
        ownedComboApplied: Boolean(selectedCustomerCombo),
      }),
    [addons, combos, draft, packages, selectedCustomerCombo, validatedVoucher],
  );

  useEffect(() => {
    if (expired) return;
    if (!draft.vehicleId || !draft.bookingDate || !draft.bookingTime || !expiresAt || expiresAt <= Date.now()) {
      router.replace("/customer/booking");
    }
  }, [draft.bookingDate, draft.bookingTime, draft.vehicleId, expired, expiresAt, router]);

  const releaseHeldSlot = useCallback(async () => {
    if (!draft.bookingDate || !draft.bookingTime) return;
    await releaseSlot({ bookingDate: draft.bookingDate, bookingTime: draft.bookingTime });
    setExpiresAt(null);
  }, [draft.bookingDate, draft.bookingTime, releaseSlot, setExpiresAt]);

  const handleBack = useCallback(async () => {
    const confirmed = window.confirm("Release held slot and go back to edit?");
    if (!confirmed) return;
    try {
      await releaseHeldSlot();
    } catch (error) {
      toast.error(getDisplayErrorMessage(error));
    } finally {
      router.push("/customer/booking");
    }
  }, [releaseHeldSlot, router]);

  useEffect(() => {
    window.history.pushState({ bookingConfirm: true }, "", window.location.href);
    const handlePopState = () => {
      const confirmed = window.confirm("Release held slot and go back to edit?");
      if (!confirmed) {
        window.history.pushState({ bookingConfirm: true }, "", window.location.href);
        return;
      }
      void releaseHeldSlot().finally(() => router.push("/customer/booking"));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [releaseHeldSlot, router]);

  const handleExpired = useCallback(() => {
    setExpired(true);
    resetDraft();
  }, [resetDraft]);

  const isComboBooking = draft.mode === "COMBO" && Boolean(selectedCustomerCombo);

  const handleConfirm = async () => {
    setShowPaymentError(true);
    if (!isComboBooking && !paymentMethod) return;
    if (!expiresAt || expiresAt <= Date.now()) { handleExpired(); return; }
    const effectivePaymentMethod = isComboBooking ? ("CASH_AT_COUNTER" as PaymentMethod) : paymentMethod!;
    const nextDraft = { ...draft, paymentMethod: effectivePaymentMethod };
    const errors = validateBookingDraft(nextDraft, summary, { requirePaymentMethod: !isComboBooking });
    if (Object.keys(errors).length > 0) {
      toast.error(Object.values(errors)[0] ?? "Please complete booking information.");
      return;
    }
    try {
      updateDraft({ paymentMethod: effectivePaymentMethod });
      const booking = await createBookingMutation.mutateAsync(nextDraft);
      setLastCreatedBooking(booking);
      resetDraft();
      toast.success("Booking confirmed.");
      router.push(`/customer/bookings/${booking.bookingId}`);
    } catch (error) {
      toast.error(getDisplayErrorMessage(error));
    }
  };

  const selectedVehicle = vehicles.find((v) => v.vehicleId === draft.vehicleId);
  const isLoading =
    vehiclesQuery.isPending || packagesQuery.isPending ||
    addonsQuery.isPending || combosQuery.isPending ||
    activeCustomerCombosQuery.isPending;

  // ─── Expired state ────────────────────────────────────────────────────────

  if (expired) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
            <Timer className="h-8 w-8 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Slot hold expired</h2>
            <p className="text-sm text-muted-foreground">Your reserved slot was released. Please pick a new time to book.</p>
          </div>
          <Button onClick={() => router.replace("/customer/bookings/new")} className="rounded-xl px-8">
            Pick a new slot
          </Button>
        </div>
      </div>
    );
  }

  // ─── Loading state ────────────────────────────────────────────────────────

  if (isLoading || !summary || !expiresAt) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  // ─── Main layout ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-72px)] bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr,380px]">

        {/* ── Left column ── */}
        <div className="space-y-5">

          {/* Countdown banner */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 dark:from-emerald-950/30 dark:to-teal-950/30">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Slot reserved — confirm before time runs out
                </p>
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-500">
                  Your selected time slot is held for you. Complete payment to lock it in.
                </p>
              </div>
              <div className="shrink-0">
                <CountdownTimer expiresAt={expiresAt} onExpired={handleExpired} />
              </div>
            </div>
          </div>

          {/* Payment method — hidden when using an owned (pre-paid) combo */}
          {isComboBooking ? (
            <Card className="border-emerald-200/80 bg-emerald-50/60 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20">
              <CardContent className="flex items-center gap-3 px-5 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                    Combo already paid
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    This booking uses your active combo — no additional payment required.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
          <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CardHeader className="pb-3 pt-5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold">Payment method</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {PAYMENT_OPTIONS.map(({ method, label, description, icon: Icon, badge }) => {
                  const active = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => { setPaymentMethod(method); setShowPaymentError(false); }}
                      className={`relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        active
                          ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      {/* Badge */}
                      {badge && (
                        <span className="absolute right-3 top-3 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {badge}
                        </span>
                      )}

                      {/* Icon circle */}
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </span>

                      {/* Text */}
                      <div className="flex-1 space-y-0.5">
                        <p className="text-sm font-bold text-foreground">{label}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
                      </div>

                      {/* Selected indicator */}
                      {active && (
                        <CheckCircle2 className="absolute bottom-3 right-3 h-4 w-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {showPaymentError && !paymentMethod && (
                <p className="flex items-center gap-1.5 text-xs text-rose-600">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Please select a payment method to continue.
                </p>
              )}
            </CardContent>
          </Card>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleBack()}
              disabled={isReleasing || createBookingMutation.isPending}
              className="rounded-xl gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to edit
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={createBookingMutation.isPending || isReleasing}
              className="rounded-xl gap-2 px-8 font-bold"
            >
              {createBookingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {createBookingMutation.isPending ? "Confirming..." : "Confirm booking"}
            </Button>
          </div>
        </div>

        {/* ── Right column — Order summary ── */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CardHeader className="border-b border-border/60 pb-4 pt-5">
              <CardTitle className="text-base font-bold">Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 py-0">

              {/* Vehicle */}
              <SummaryRow
                icon={Car}
                label="Vehicle"
                value={selectedVehicle
                  ? `${selectedVehicle.plate} · ${selectedVehicle.brand} ${selectedVehicle.model}`
                  : "--"}
              />

              {/* Schedule */}
              <SummaryRow
                icon={CalendarDays}
                label="Schedule"
                value={`${draft.bookingDate} · ${draft.bookingTime}`}
              />

              {/* Duration */}
              <SummaryRow
                icon={Clock}
                label="Duration"
                value={summary.estimatedDurationLabel}
              />

              {/* Service */}
              <div className="border-b border-border/50 px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>{getModeLabel(summary.itemType)}</span>
                  </div>
                  <span className="text-right text-xs font-semibold text-foreground">{summary.itemName}</span>
                </div>
                {summary.selectedAddons.length > 0 && (
                  <div className="mt-2 ml-6 space-y-1">
                    {summary.selectedAddons.map((addon) => (
                      <div key={addon.addonId} className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>+ {addon.name}</span>
                        <span>{formatBookingCurrency(addon.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pricing breakdown */}
              <div className="space-y-2.5 px-5 py-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">{formatBookingCurrency(summary.subtotal)}</span>
                </div>

                {validatedVoucher && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <Tag className="h-3 w-3" />
                      Voucher ({validatedVoucher.voucherCode})
                    </span>
                    <span className="font-semibold text-emerald-600">
                      −{formatBookingCurrency(summary.discountAmount)}
                    </span>
                  </div>
                )}

                {/* Total */}
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">Total</span>
                    <span className="text-lg font-black text-primary">
                      {formatBookingCurrency(summary.finalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust note */}
          <p className="text-center text-[11px] text-muted-foreground px-2">
            By confirming you agree to our cancellation policy. Free cancellation up to 2 hours before appointment.
          </p>
        </div>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-3.5">
      <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </div>
      <span className="text-right text-xs font-semibold text-foreground max-w-[55%] truncate">{value}</span>
    </div>
  );
}
