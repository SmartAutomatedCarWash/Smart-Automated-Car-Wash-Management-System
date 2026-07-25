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
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  Sparkles,
  Tag,
  Timer,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
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
  useBookingStaffOptions,
  useCreateCustomerBooking,
  useCreateVnpayCheckout,
} from "@/features/bookings/hooks/use-bookings";
import { getCustomerBookingDetail } from "@/features/bookings/lib/booking-service";
import { useSlotHold } from "@/features/bookings/hooks/use-slot-hold";
import { useCustomerVehicles } from "@/features/vehicles/hooks/use-customer-vehicles";
import { getBookingDraftSnapshot, useBookingStore } from "@/features/bookings/store/booking.store";
import { clearCustomerCart } from "@/features/cart/store/cart.store";
import type { BookingDetail, PaymentMethod } from "@/entities/bookings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";

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
    label: "SePay",
    description: "Transfer with an AU payment code for automatic confirmation.",
    icon: Building2,
    badge: "QR",
  },
  {
    method: "E_WALLET",
    label: "VNPay",
    description: "Pay online through the VNPay payment gateway.",
    icon: Wallet,
    badge: "Online",
  },
];

// ─── Main component ──────────────────────────────────────────────────────────

export function BookingConfirmPage() {
  const getErrorMessage = useErrorMessage();
  const router = useRouter();
  const draft = useBookingStore((state) => state.draft);
  const expiresAt = useBookingStore((state) => state.expiresAt);
  const validatedDiscount = useBookingStore((state) => state.validatedDiscount);
  const updateDraft = useBookingStore((state) => state.updateDraft);
  const resetDraft = useBookingStore((state) => state.resetDraft);
  const setExpiresAt = useBookingStore((state) => state.setExpiresAt);
  const lastCreatedBooking = useBookingStore((state) => state.lastCreatedBooking);
  const setLastCreatedBooking = useBookingStore((state) => state.setLastCreatedBooking);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(draft.paymentMethod);
  const [showPaymentError, setShowPaymentError] = useState(false);
  const [expired, setExpired] = useState(false);
  const [isRedirectingAfterCreate, setIsRedirectingAfterCreate] = useState(false);
  const [sepayPaymentBooking, setSepayPaymentBooking] = useState<BookingDetail | null>(null);

  useEffect(() => {
    setPaymentMethod(draft.paymentMethod);
  }, [draft.paymentMethod]);

  const vehiclesQuery = useCustomerVehicles();
  const packagesQuery = useBookingPackages();
  const addonsQuery = useBookingAddons();
  const combosQuery = useBookingCombos();
  const activeCustomerCombosQuery = useActiveCustomerCombos();
  const createBookingMutation = useCreateCustomerBooking();
  const createVnpayCheckoutMutation = useCreateVnpayCheckout();
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
  const selectedPackage =
    draft.mode === "PACKAGE" && draft.packageId
      ? (packages.find((item) => item.packageId === draft.packageId) ?? null)
      : null;
  const selectedCombo =
    draft.mode === "COMBO" && draft.comboId
      ? (combos.find((item) => item.comboId === draft.comboId) ?? null)
      : null;
  const activeAddonIds = useMemo(
    () => new Set(addons.filter((addon) => addon.status === "ACTIVE").map((addon) => addon.addonId)),
    [addons],
  );
  const selectedPackageServiceIds = useMemo(
    () => new Set(selectedPackage?.serviceIds ?? []),
    [selectedPackage],
  );
  const selectedComboServiceIds = useMemo(
    () => new Set((selectedCombo?.services ?? []).map((service) => service.serviceId)),
    [selectedCombo],
  );
  const allowedAddonIds = useMemo(() => {
    if (draft.mode === "PACKAGE") {
      return selectedPackageServiceIds;
    }
    if (selectedCombo) {
      return new Set([...activeAddonIds].filter((addonId) => !selectedComboServiceIds.has(addonId)));
    }
    return activeAddonIds;
  }, [activeAddonIds, draft.mode, selectedCombo, selectedComboServiceIds, selectedPackageServiceIds]);
  const sanitizedAddonIds = useMemo(
    () => draft.addonIds.filter((addonId) => activeAddonIds.has(addonId) && allowedAddonIds.has(addonId)),
    [activeAddonIds, allowedAddonIds, draft.addonIds],
  );
  const hasStaleAddonIds = sanitizedAddonIds.length !== draft.addonIds.length;
  const sanitizedDraft = useMemo(
    () => ({ ...draft, addonIds: sanitizedAddonIds }),
    [draft, sanitizedAddonIds],
  );

  const summary = useMemo(
    () =>
      buildBookingSummary(sanitizedDraft, {
        packages,
        addons,
        combos,
        voucher: validatedDiscount,
        ownedComboApplied: Boolean(selectedCustomerCombo),
      }),
    [addons, combos, packages, sanitizedDraft, selectedCustomerCombo, validatedDiscount],
  );
  const staffOptionsPayload = useMemo(() => {
    if (hasStaleAddonIds) return null;
    if (!sanitizedDraft.bookingDate || !sanitizedDraft.bookingTime) return null;
    if (sanitizedDraft.mode === "PACKAGE" && !sanitizedDraft.packageId) return null;
    if (sanitizedDraft.mode === "COMBO" && !sanitizedDraft.comboId) return null;

    return {
      packageId: sanitizedDraft.mode === "PACKAGE" ? sanitizedDraft.packageId : undefined,
      comboId: sanitizedDraft.mode === "COMBO" ? sanitizedDraft.comboId : undefined,
      options: sanitizedAddonIds,
      bookingDate: sanitizedDraft.bookingDate,
      bookingTime: sanitizedDraft.bookingTime,
    };
  }, [hasStaleAddonIds, sanitizedAddonIds, sanitizedDraft]);
  const staffOptionsQuery = useBookingStaffOptions(staffOptionsPayload);
  const staffOptions = staffOptionsQuery.data ?? [];
  const availableStaffOptions = useMemo(
    () => staffOptions.filter((staff) => staff.available !== false),
    [staffOptions],
  );
  const selectedStaffIds = useMemo(
    () => (draft.staffIds && draft.staffIds.length > 0 ? draft.staffIds : draft.staffId ? [draft.staffId] : []).slice(0, 1),
    [draft.staffId, draft.staffIds],
  );
  const staffUnavailable = staffOptionsQuery.isSuccess && availableStaffOptions.length < 1;

  const redirectToLastCreatedBooking = useCallback(
    (bookingId?: string) => {
      const snapshot = getBookingDraftSnapshot();
      const hasActiveDraft = Boolean(
        snapshot.draft.vehicleId &&
          snapshot.draft.bookingDate &&
          snapshot.draft.bookingTime &&
          snapshot.expiresAt &&
          snapshot.expiresAt > Date.now(),
      );
      if (hasActiveDraft) return false;

      const targetBookingId = bookingId ?? snapshot.lastCreatedBooking?.bookingId;
      if (!targetBookingId) return false;
      router.replace(`/customer/bookings/${targetBookingId}`);
      return true;
    },
    [router],
  );

  useEffect(() => {
    if (!hasStaleAddonIds) return;
    updateDraft({ addonIds: sanitizedAddonIds, discountCode: "", staffId: "", staffIds: [] });
  }, [hasStaleAddonIds, sanitizedAddonIds, updateDraft]);

  useEffect(() => {
    if (staffOptions.length === 0) return;
    const availableIds = new Set(availableStaffOptions.map((staff) => staff.staffId));
    const nextStaffIds = selectedStaffIds.filter((staffId) => availableIds.has(staffId));
    for (const staff of availableStaffOptions) {
      if (nextStaffIds.length >= 1) break;
      if (!nextStaffIds.includes(staff.staffId)) {
        nextStaffIds.push(staff.staffId);
      }
    }
    const currentKey = selectedStaffIds.join("|");
    const nextKey = nextStaffIds.join("|");
    if (nextKey !== currentKey || draft.staffId !== (nextStaffIds[0] ?? "")) {
      updateDraft({ staffId: nextStaffIds[0] ?? "", staffIds: nextStaffIds });
    }
  }, [availableStaffOptions, draft.staffId, selectedStaffIds, staffOptions.length, updateDraft]);

  useEffect(() => {
    if (expired || isRedirectingAfterCreate) return;
    if (!draft.vehicleId || !draft.bookingDate || !draft.bookingTime || !expiresAt || expiresAt <= Date.now()) {
      if (redirectToLastCreatedBooking(lastCreatedBooking?.bookingId)) return;
      router.replace("/customer/bookings/new");
    }
  }, [
    draft.bookingDate,
    draft.bookingTime,
    draft.vehicleId,
    expired,
    expiresAt,
    isRedirectingAfterCreate,
    lastCreatedBooking?.bookingId,
    redirectToLastCreatedBooking,
    router,
  ]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      redirectToLastCreatedBooking();
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [redirectToLastCreatedBooking]);

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
      toast.error(getErrorMessage(error));
    } finally {
      router.push("/customer/bookings/new");
    }
  }, [releaseHeldSlot, router]);

  useEffect(() => {
    window.history.pushState({ bookingConfirm: true }, "", window.location.href);
    const handlePopState = () => {
      if (redirectToLastCreatedBooking()) return;
      const confirmed = window.confirm("Release held slot and go back to edit?");
      if (!confirmed) {
        window.history.pushState({ bookingConfirm: true }, "", window.location.href);
        return;
      }
      void releaseHeldSlot().finally(() => router.push("/customer/bookings/new"));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [redirectToLastCreatedBooking, releaseHeldSlot, router]);

  const handleExpired = useCallback(() => {
    setExpired(true);
    resetDraft();
  }, [resetDraft]);

  useEffect(() => {
    if (!sepayPaymentBooking || sepayPaymentBooking.payment.status === "PAID" || sepayPaymentBooking.status !== "PENDING") {
      return;
    }

    const refreshPaymentStatus = async () => {
      try {
        const detail = await getCustomerBookingDetail(sepayPaymentBooking.bookingId);
        setSepayPaymentBooking(detail);
        if (detail.payment.status === "PAID" || detail.status === "CONFIRMED") {
          toast.success("SePay payment confirmed.");
          router.replace(`/customer/bookings/${detail.bookingId}`);
        }
      } catch (error) {
        // Keep the QR visible; the next poll can recover from a transient network error.
      }
    };

    const id = window.setInterval(() => void refreshPaymentStatus(), 5_000);
    return () => window.clearInterval(id);
  }, [router, sepayPaymentBooking]);

  const isComboBooking = draft.mode === "COMBO" && Boolean(selectedCustomerCombo);
  const isCashPaymentLocked = paymentMethod === "CASH_AT_COUNTER";

  const handleConfirm = async () => {
    setShowPaymentError(true);
    if (staffUnavailable) {
      toast.error("No staff is available for this service window.");
      return;
    }
    if (selectedStaffIds.length < 1) {
      toast.error("Please select an available staff.");
      return;
    }
    const selectedPaymentMethod = paymentMethod ?? draft.paymentMethod;
    if (!isComboBooking && !selectedPaymentMethod) return;
    if (!expiresAt || expiresAt <= Date.now()) { handleExpired(); return; }
    const effectivePaymentMethod = isComboBooking ? ("CASH_AT_COUNTER" as PaymentMethod) : selectedPaymentMethod!;
    const nextDraft = { ...sanitizedDraft, paymentMethod: effectivePaymentMethod, staffId: selectedStaffIds[0] ?? "", staffIds: selectedStaffIds };
    const errors = validateBookingDraft(nextDraft, summary, { requirePaymentMethod: !isComboBooking });
    if (Object.keys(errors).length > 0) {
      toast.error(Object.values(errors)[0] ?? "Please complete booking information.");
      return;
    }
    try {
      updateDraft({ paymentMethod: effectivePaymentMethod });
      const booking = await createBookingMutation.mutateAsync(nextDraft);
      setIsRedirectingAfterCreate(true);

      if (!isComboBooking && effectivePaymentMethod === "E_WALLET" && booking.pricing.finalAmount > 0) {
        try {
          const checkout = await createVnpayCheckoutMutation.mutateAsync(booking.bookingId);
          resetDraft();
          setLastCreatedBooking(booking);
          toast.success("Booking created. Redirecting to VNPay.");
          window.history.replaceState(
            { bookingId: booking.bookingId, vnpayRedirect: true },
            "",
            `/customer/bookings/${booking.bookingId}`,
          );
          window.location.href = checkout.paymentUrl;
          return;
        } catch (checkoutError) {
          resetDraft();
          setLastCreatedBooking(booking);
          setIsRedirectingAfterCreate(false);
          toast.error(getErrorMessage(checkoutError));
          router.push(`/customer/bookings/${booking.bookingId}`);
          return;
        }
      }

      if (!isComboBooking && effectivePaymentMethod === "BANK_TRANSFER" && booking.pricing.finalAmount > 0) {
        try {
          const detail = await getCustomerBookingDetail(booking.bookingId);
          resetDraft();
          setLastCreatedBooking(booking);
          clearCustomerCart();
          setSepayPaymentBooking(detail);
          toast.success("Booking created. Scan the SePay QR to pay.");
          return;
        } catch (detailError) {
          resetDraft();
          setLastCreatedBooking(booking);
          clearCustomerCart();
          setIsRedirectingAfterCreate(false);
          toast.error(getErrorMessage(detailError));
          router.push(`/customer/bookings/${booking.bookingId}`);
          return;
        }
      }

      resetDraft();
      setLastCreatedBooking(booking);
      clearCustomerCart();
      toast.success(
        booking.paymentMethod === "CASH_AT_COUNTER"
          ? "Booking created. Waiting for manager confirmation."
          : "Booking confirmed.",
      );
      window.location.href = `/customer/bookings/success?bookingId=${booking.bookingId}`;
    } catch (error) {
      setIsRedirectingAfterCreate(false);
      toast.error(getErrorMessage(error));
    }
  };

  const handleCopyPaymentText = async (value: string | null | undefined, message: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error("Unable to copy.");
    }
  };

  const handleViewSepayBooking = () => {
    if (!sepayPaymentBooking) return;
    router.push(`/customer/bookings/${sepayPaymentBooking.bookingId}`);
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

  if (sepayPaymentBooking) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-background px-4 py-6 sm:px-6 lg:px-8">
        <SepayPaymentDialog
          booking={sepayPaymentBooking}
          onCopy={handleCopyPaymentText}
          onViewBooking={handleViewSepayBooking}
        />
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
                  const disabled = isCashPaymentLocked && method !== "CASH_AT_COUNTER";
                  return (
                    <button
                      key={method}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return;
                        setPaymentMethod(method);
                        updateDraft({ paymentMethod: method });
                        setShowPaymentError(false);
                      }}
                      className={`relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        active
                          ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
                          : disabled
                            ? "cursor-not-allowed border-border bg-muted/40 opacity-50"
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
              {isCashPaymentLocked ? (
                <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  Cash at counter is locked for this booking. Manager/Admin will confirm the payment at the counter.
                </p>
              ) : null}
            </CardContent>
          </Card>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleBack()}
              disabled={isReleasing || createBookingMutation.isPending || createVnpayCheckoutMutation.isPending}
              className="rounded-xl gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to edit
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={createBookingMutation.isPending || createVnpayCheckoutMutation.isPending || isReleasing || staffOptionsQuery.isPending || staffUnavailable || selectedStaffIds.length < 1}
              className="rounded-xl gap-2 px-8 font-bold"
            >
              {createBookingMutation.isPending || createVnpayCheckoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {createVnpayCheckoutMutation.isPending ? "Redirecting..." : createBookingMutation.isPending ? "Confirming..." : "Confirm booking"}
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

                {validatedDiscount && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <Tag className="h-3 w-3" />
                      Voucher ({validatedDiscount.discountCode})
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

function SepayPaymentDialog({
  booking,
  onCopy,
  onViewBooking,
}: {
  booking: BookingDetail;
  onCopy: (value: string | null | undefined, message: string) => void;
  onViewBooking: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) {
        onViewBooking();
      }
    }}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
            <QrCode className="h-6 w-6" />
          </div>
          <DialogTitle>Pay with SePay</DialogTitle>
          <DialogDescription>
            Scan the QR code or transfer with the exact details below. Your booking will confirm automatically after payment is received.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {booking.payment.qrUrl ? (
            <div className="flex justify-center rounded-xl border bg-slate-50 p-3">
              <img
                src={booking.payment.qrUrl}
                alt="SePay payment QR code"
                className="h-auto w-full max-w-[300px] rounded-lg"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              QR is not configured yet. Use the transfer details below.
            </div>
          )}

          <div className="space-y-2">
            <SepayPaymentInfoRow label="Bank" value={booking.payment.bankCode ?? "TPBank"} />
            <SepayPaymentInfoRow
              label="Account"
              value={booking.payment.accountNumber ?? "--"}
              onCopy={() => onCopy(booking.payment.accountNumber, "Account number copied.")}
            />
            <SepayPaymentInfoRow label="Account name" value={booking.payment.accountName ?? "--"} />
            <SepayPaymentInfoRow
              label="Amount"
              value={formatBookingCurrency(booking.pricing.finalAmount)}
              onCopy={() => onCopy(String(booking.pricing.finalAmount), "Amount copied.")}
            />
            <SepayPaymentInfoRow
              label="Description"
              value={booking.payment.transferDescription ?? booking.payment.transactionId ?? "--"}
              monospace
              onCopy={() =>
                onCopy(
                  booking.payment.transferDescription ?? booking.payment.transactionId,
                  "Transfer description copied.",
                )
              }
            />
          </div>

          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-800">
            Waiting for SePay webhook. This window refreshes automatically every few seconds.
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onViewBooking}>
            View booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SepayPaymentInfoRow({
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
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span className={`truncate text-right font-bold text-foreground ${monospace ? "font-mono tracking-wide" : ""}`}>
          {value}
        </span>
        {onCopy ? (
          <Button type="button" size="sm" variant="outline" className="h-7 shrink-0 bg-white px-2 text-[11px]" onClick={onCopy}>
            <Copy className="mr-1 h-3 w-3" />
            Copy
          </Button>
        ) : null}
      </div>
    </div>
  );
}
