"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { CountdownTimer } from "@/features/bookings/components/countdown-timer";
import {
  buildBookingSummary,
  formatBookingCurrency,
  getModeLabel,
  getPaymentMethodLabel,
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

const PAYMENT_METHODS: PaymentMethod[] = ["CASH_AT_COUNTER", "BANK_TRANSFER", "E_WALLET"];

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
    if (!draft.vehicleId || !draft.bookingDate || !draft.bookingTime || !expiresAt || expiresAt <= Date.now()) {
      router.replace("/customer/booking");
    }
  }, [draft.bookingDate, draft.bookingTime, draft.vehicleId, expiresAt, router]);

  const releaseHeldSlot = useCallback(async () => {
    if (!draft.bookingDate || !draft.bookingTime) {
      return;
    }
    await releaseSlot({
      bookingDate: draft.bookingDate,
      bookingTime: draft.bookingTime,
    });
    setExpiresAt(null);
  }, [draft.bookingDate, draft.bookingTime, releaseSlot, setExpiresAt]);

  const handleBack = useCallback(async () => {
    const confirmed = window.confirm("Ban co muon huy giu cho khong?");
    if (!confirmed) {
      return;
    }
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
      const confirmed = window.confirm("Ban co muon huy giu cho khong?");
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

  const handleConfirm = async () => {
    setShowPaymentError(true);
    if (!paymentMethod) {
      return;
    }
    const nextDraft = { ...draft, paymentMethod };
    const errors = validateBookingDraft(nextDraft, summary, { requirePaymentMethod: true });
    if (Object.keys(errors).length > 0) {
      toast.error(Object.values(errors)[0] ?? "Please complete booking information.");
      return;
    }

    try {
      updateDraft({ paymentMethod });
      const booking = await createBookingMutation.mutateAsync(nextDraft);
      setLastCreatedBooking(booking);
      toast.success("Booking confirmed.");
      router.push(`/customer/bookings/success?bookingId=${booking.bookingId}`);
    } catch (error) {
      toast.error(getDisplayErrorMessage(error));
    }
  };

  const selectedVehicle = vehicles.find((item) => item.vehicleId === draft.vehicleId);
  const isLoading =
    vehiclesQuery.isPending ||
    packagesQuery.isPending ||
    addonsQuery.isPending ||
    combosQuery.isPending ||
    activeCustomerCombosQuery.isPending;

  if (expired) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Slot hold expired</CardTitle>
            <CardDescription>The slot was released. Please choose a booking time again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.replace("/customer/booking")}>Choose another slot</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !summary || !expiresAt) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.4fr,0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Confirm booking</CardTitle>
              <CardDescription>Review your wash appointment and confirm before the hold expires.</CardDescription>
            </CardHeader>
            <CardContent>
              <CountdownTimer expiresAt={expiresAt} onExpired={handleExpired} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {PAYMENT_METHODS.map((method) => {
                  const active = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      className={`rounded-xl border p-4 text-left transition-all ${
                        active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
                      }`}
                      onClick={() => setPaymentMethod(method)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{getPaymentMethodLabel(method)}</span>
                        {active ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Demo payment only.</p>
                    </button>
                  );
                })}
              </div>
              {showPaymentError && !paymentMethod ? (
                <p className="text-sm text-rose-600">Please select a payment method.</p>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => void handleBack()} disabled={isReleasing}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to edit
            </Button>
            <Button type="button" onClick={() => void handleConfirm()} disabled={createBookingMutation.isPending}>
              {createBookingMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm booking
            </Button>
          </div>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryItem label="Vehicle" value={selectedVehicle ? `${selectedVehicle.plate} · ${selectedVehicle.brand} ${selectedVehicle.model}` : "--"} />
            <SummaryItem label="Booking type" value={getModeLabel(summary.itemType)} />
            <SummaryItem label="Selected item" value={summary.itemName} />
            <SummaryItem label="Add-ons" value={summary.selectedAddons.length ? summary.selectedAddons.map((item) => item.name).join(", ") : "None"} />
            <SummaryItem label="Schedule" value={`${draft.bookingDate} · ${draft.bookingTime}`} />
            <SummaryItem label="Estimated duration" value={summary.estimatedDurationLabel} />
            <SummaryItem label="Voucher" value={validatedVoucher ? `${validatedVoucher.voucherCode} (-${formatBookingCurrency(summary.discountAmount)})` : "None"} />
            <SummaryItem label="Subtotal" value={formatBookingCurrency(summary.subtotal)} />
            <SummaryItem label="Total" value={formatBookingCurrency(summary.finalAmount)} emphasize />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-3 text-sm last:border-b-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right ${emphasize ? "text-base font-bold text-foreground" : "font-medium text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}
