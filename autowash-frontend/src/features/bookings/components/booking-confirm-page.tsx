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
  UserCheck,
  Users,
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
import { useSlotHold } from "@/features/bookings/hooks/use-slot-hold";
import { useCustomerVehicles } from "@/features/vehicles/hooks/use-customer-vehicles";
import { getBookingDraftSnapshot, useBookingStore } from "@/features/bookings/store/booking.store";
import { clearCustomerCart } from "@/features/cart/store/cart.store";
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
    () => (draft.staffIds && draft.staffIds.length > 0 ? draft.staffIds : draft.staffId ? [draft.staffId] : []).slice(0, 3),
    [draft.staffId, draft.staffIds],
  );
  const selectedStaff = useMemo(
    () =>
      selectedStaffIds
        .map((staffId) => staffOptions.find((staff) => staff.staffId === staffId))
        .filter((staff): staff is NonNullable<typeof staff> => Boolean(staff)),
    [selectedStaffIds, staffOptions],
  );
  const staffUnavailable = staffOptionsQuery.isSuccess && availableStaffOptions.length < 3;

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
      if (nextStaffIds.length >= 3) break;
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

  const isComboBooking = draft.mode === "COMBO" && Boolean(selectedCustomerCombo);

  const handleConfirm = async () => {
    setShowPaymentError(true);
    if (staffUnavailable) {
      toast.error("No staff is available for this service window.");
      return;
    }
    if (selectedStaffIds.length < 3) {
      toast.error("Please select 3 available staff.");
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

          {/* Staff selection */}
          <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CardHeader className="pb-3 pt-5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold">Assigned staff</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                Three available staff will be assigned after the booking is confirmed.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 pb-5">
              {staffOptionsQuery.isPending ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              ) : staffUnavailable ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  Fewer than 3 staff are available for this service window. Please choose another time.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[0, 1, 2].map((index) => {
                      const currentStaffId = selectedStaffIds[index] ?? "";
                      return (
                        <label key={index} className="rounded-2xl border border-border bg-card p-4">
                          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            <UserCheck className="h-3.5 w-3.5" />
                            Staff {index + 1}
                          </span>
                          <select
                            value={currentStaffId}
                            onChange={(event) => {
                              const nextStaffIds = [...selectedStaffIds];
                              nextStaffIds[index] = event.target.value;
                              const uniqueStaffIds = nextStaffIds.filter((staffId, staffIndex) => staffId && nextStaffIds.indexOf(staffId) === staffIndex);
                              updateDraft({ staffId: uniqueStaffIds[0] ?? "", staffIds: uniqueStaffIds });
                            }}
                            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary"
                          >
                            <option value="">Select staff</option>
                            {staffOptions.map((staff) => {
                              const disabled = staff.available === false || (selectedStaffIds.includes(staff.staffId) && staff.staffId !== currentStaffId);
                              return (
                                <option key={staff.staffId} value={staff.staffId} disabled={disabled}>
                                  {staff.staffName} - {staff.available === false ? "Busy" : "Available"}
                                </option>
                              );
                            })}
                          </select>
                        </label>
                      );
                    })}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {staffOptions.map((staff) => {
                      const active = selectedStaffIds.includes(staff.staffId);
                      const available = staff.available !== false;
                      return (
                        <div
                          key={staff.staffId}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${
                            active
                              ? "border-primary bg-primary/5"
                              : available
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}
                        >
                          <span className="truncate font-semibold">{staff.staffName}</span>
                          <span className="shrink-0 font-bold">{available ? "Available" : "Busy"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {staffOptionsQuery.isError && (
                <p className="text-xs text-rose-600">{getErrorMessage(staffOptionsQuery.error)}</p>
              )}
            </CardContent>
          </Card>

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
                      onClick={() => {
                        setPaymentMethod(method);
                        updateDraft({ paymentMethod: method });
                        setShowPaymentError(false);
                      }}
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
              disabled={isReleasing || createBookingMutation.isPending || createVnpayCheckoutMutation.isPending}
              className="rounded-xl gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to edit
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={createBookingMutation.isPending || createVnpayCheckoutMutation.isPending || isReleasing || staffOptionsQuery.isPending || staffUnavailable || selectedStaffIds.length < 3}
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

              {/* Staff */}
              <SummaryRow
                icon={UserCheck}
                label="Staff"
                value={selectedStaff.length > 0 ? selectedStaff.map((staff) => staff.staffName).join(", ") : "Auto assign"}
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
