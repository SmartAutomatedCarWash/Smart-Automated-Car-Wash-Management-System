"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { ArrowRight, Banknote, Building2, CheckCircle2, Copy, Loader2, Package, QrCode, Wallet } from "lucide-react";
import {
  useBookingCombos,
  useCreateComboVnpayCheckout,
  useCustomerComboPaymentStatus,
  usePurchaseCustomerCombo,
} from "@/features/bookings/hooks/use-bookings";
import {
  clearCartCheckoutSnapshot,
  getCartCheckoutSnapshot,
  type CartCheckoutSnapshotItem,
} from "@/features/cart/store/cart.store";
import { formatBookingCurrency } from "@/features/bookings/lib/booking-format";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { notify } from "@/shared/lib/notify";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/ui/dialog";
import type { BookingCombo, PaymentMethod } from "@/entities/bookings";

type CustomerComboCheckoutPageProps = {
  comboIds?: string[];
};

type GroupedCheckoutItem = {
  combo: BookingCombo;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type ComboPaymentPreview = {
  comboNames: string[];
  amount: number;
  paymentMethod: PaymentMethod;
  reference: string;
  qrUrl?: string | null;
  bankCode?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  transferDescription?: string | null;
};

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; note: string }> = [
  { value: "BANK_TRANSFER", label: "SePay", note: "Auto-confirmed using AU payment code" },
  { value: "E_WALLET", label: "VNPay", note: "Pay online through the VNPay gateway" },
];

function buildHeroImage(combo: BookingCombo) {
  if (combo.image && (combo.image.startsWith("/") || combo.image.startsWith("data:") || combo.image.startsWith("http"))) {
    return combo.image;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0b1021" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
        <radialGradient id="glow" cx="72%" cy="28%" r="65%">
          <stop offset="0%" stop-color="#67e8f9" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="800" rx="48" fill="url(#bg)" />
      <rect width="1200" height="800" fill="url(#glow)" />
      <path d="M122 556C250 410 420 360 608 410C759 451 875 568 1020 506" stroke="#5eead4" stroke-opacity="0.24" stroke-width="18" fill="none" stroke-linecap="round"/>
      <text x="92" y="122" fill="#22d3ee" font-size="28" font-family="Arial, sans-serif" font-weight="700" letter-spacing="6">AURA CAR CARE</text>
      <text x="92" y="454" fill="#ffffff" font-size="72" font-family="Arial, sans-serif" font-weight="800">${combo.name}</text>
      <text x="92" y="522" fill="#dbeafe" font-size="30" font-family="Arial, sans-serif" font-weight="600">${combo.durationDays} days • ${combo.maxServices} uses</text>
    </svg>
  `.trim();

  if (typeof window === "undefined") {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svg)))}`;
}

export function CustomerComboCheckoutPage({ comboIds }: CustomerComboCheckoutPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const getErrorMessage = useErrorMessage();
  const combosQuery = useBookingCombos();
  const purchaseComboMutation = usePurchaseCustomerCombo();
  const createComboVnpayCheckoutMutation = useCreateComboVnpayCheckout();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [snapshotReady, setSnapshotReady] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<CartCheckoutSnapshotItem[]>([]);
  const [comboPaymentPreview, setComboPaymentPreview] = useState<ComboPaymentPreview | null>(null);
  const handledPaymentSuccessRef = useRef(false);
  const comboPaymentStatusQuery = useCustomerComboPaymentStatus(
    comboPaymentPreview?.reference,
    Boolean(comboPaymentPreview?.reference)
  );
  const comboPaymentStatus = comboPaymentStatusQuery.data?.paymentStatus?.toUpperCase() ?? "PENDING_PAYMENT";
  const comboPaymentConfirmed = comboPaymentStatus === "PAID";

  useEffect(() => {
    const snapshot = getCartCheckoutSnapshot();

    if (snapshot.length > 0) {
      setCheckoutItems(snapshot.filter((item) => item.type === "COMBO"));
    } else {
      setCheckoutItems(
        (comboIds ?? []).map((comboId) => ({
          type: "COMBO",
          itemId: comboId,
          name: "",
          price: 0,
          quantity: 1,
        }))
      );
    }

    setSnapshotReady(true);
  }, [comboIds]);

  const groupedItems = useMemo<GroupedCheckoutItem[]>(() => {
    const combos = combosQuery.data ?? [];
    const map = new Map<string, GroupedCheckoutItem>();

    for (const item of checkoutItems) {
      const combo = combos.find((candidate) => candidate.comboId === item.itemId);
      if (!combo) continue;

      const quantity = item.quantity > 0 ? item.quantity : 1;
      const current = map.get(combo.comboId);

      if (current) {
        current.quantity += quantity;
        current.totalPrice = current.quantity * current.unitPrice;
      } else {
        map.set(combo.comboId, {
          combo,
          quantity,
          unitPrice: combo.basePrice,
          totalPrice: combo.basePrice * quantity,
        });
      }
    }

    return Array.from(map.values());
  }, [checkoutItems, combosQuery.data]);

  const totalPrice = groupedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const heroCombo = groupedItems[0]?.combo ?? null;
  const heroImage = heroCombo ? buildHeroImage(heroCombo) : null;
  const error = combosQuery.error ?? null;

  const handlePurchase = async () => {
    if (groupedItems.length === 0) {
      notify.error("No combo found for checkout.");
      return;
    }

    try {
      const comboIds = groupedItems.flatMap((item) => Array.from({ length: item.quantity }, () => item.combo.comboId));
      const result = await purchaseComboMutation.mutateAsync({
        comboId: groupedItems[0].combo.comboId,
        comboIds,
        paymentMethod,
      });

      if (paymentMethod === "E_WALLET") {
        const checkout = await createComboVnpayCheckoutMutation.mutateAsync({
          transactionRef: result.payment?.transactionId ?? result.customerComboId ?? result.comboId,
          amount: totalPrice,
        });
        notify.info("Redirecting to VNPay payment.");
        window.location.href = checkout.paymentUrl;
        return;
      }

      if (result.paymentStatus === "PENDING_PAYMENT" || result.payment?.status === "PENDING_PAYMENT" || result.payment?.qrUrl) {
        handledPaymentSuccessRef.current = false;
        setComboPaymentPreview({
          comboNames: groupedItems.flatMap((item) => Array.from({ length: item.quantity }, () => item.combo.name)),
          amount: totalPrice,
          paymentMethod,
          reference: result.payment?.transactionId ?? result.customerComboId ?? result.comboId ?? `COMBO-${Date.now()}`,
          qrUrl: result.payment?.qrUrl ?? null,
          bankCode: result.payment?.bankCode ?? null,
          accountNumber: result.payment?.accountNumber ?? null,
          accountName: result.payment?.accountName ?? null,
          transferDescription: result.payment?.transferDescription ?? null,
        });
        return;
      }

      notify.error("Payment was not initialized. Please try again.");
    } catch (submitError) {
      notify.error(getErrorMessage(submitError));
    }
  };

  useEffect(() => {
    if (!comboPaymentPreview || !comboPaymentConfirmed || handledPaymentSuccessRef.current) {
      return;
    }

    handledPaymentSuccessRef.current = true;
    void (async () => {
      await queryClient.invalidateQueries({ queryKey: ["booking-catalog", "customer-combos", "active"] });
      clearCartCheckoutSnapshot();
      setComboPaymentPreview(null);
      await Swal.fire({
        icon: "success",
        title: "Payment successful!",
        text: "Your combo payment has been confirmed. The purchased combos are now available in your account.",
        confirmButtonText: "OK",
        buttonsStyling: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
          popup: "swal-notify-popup",
          title: "swal-notify-title",
          htmlContainer: "swal-notify-message",
          confirmButton: "swal-notify-btn-success",
        },
      });
      router.push("/customer/services");
    })();
  }, [comboPaymentConfirmed, comboPaymentPreview, queryClient, router]);

  const handleClosePaymentPreview = () => {
    setComboPaymentPreview(null);
    if (comboPaymentConfirmed) {
      router.push("/customer/services");
    }
  };

  if (!snapshotReady || combosQuery.isPending) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_25%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center rounded-3xl border border-slate-200 bg-white p-10 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_25%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl border-rose-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle>Unable to load combo checkout</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/customer/services">Back to catalog</Link>
            </Button>
            <Button asChild>
              <Link href="/customer/combos">View combo list</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (groupedItems.length === 0 || !heroCombo || !heroImage) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_25%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle>Combo not found</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/customer/services">Back to catalog</Link>
            </Button>
            <Button asChild>
              <Link href="/customer/combos">View combos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_25%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button asChild variant="outline" className="rounded-xl border-sky-200 bg-white text-slate-900 shadow-sm hover:bg-sky-50">
              <Link href="/customer/services">Back to catalog</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_480px]">
          <div className="space-y-4">
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="relative overflow-hidden rounded-[22px]">
                  <img src={heroImage} alt={heroCombo.name} className="h-[260px] w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
                  <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.28em] text-white backdrop-blur-md">
                    <span>AURA CAR CARE</span>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-[30px] font-black leading-none tracking-tight text-slate-950">{heroCombo.name}</h2>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-700">{heroCombo.durationDays} days</Badge>
                      <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-700">Max {heroCombo.maxServices} uses</Badge>
                      <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">Available</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Price</p>
                    <p className="text-3xl font-black tracking-tight text-cyan-500">{formatBookingCurrency(heroCombo.basePrice)}</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Combos in this payment</p>
                  <div className="space-y-2">
                    {groupedItems.map(({ combo, quantity, totalPrice: lineTotal }) => (
                      <div key={combo.comboId} className="flex items-center justify-between gap-3 rounded-[14px] border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                            <Package className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">{combo.name}</p>
                            <p className="text-xs text-slate-500">x{quantity}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-cyan-600">{formatBookingCurrency(lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-950">Payment method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {PAYMENT_METHODS.map((method) => {
                  const active = paymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`w-full rounded-[14px] border px-4 py-3 text-left transition-all ${
                        active
                          ? "border-cyan-400 bg-cyan-50 text-cyan-600 shadow-sm"
                          : "border-slate-200 bg-white text-slate-900 hover:border-cyan-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold">{method.label}</span>
                        {active && <CheckCircle2 className="h-4 w-4 text-cyan-500" />}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{method.note}</p>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              <CardContent className="space-y-3 p-5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Base price</span>
                  <span className="font-medium text-slate-950">{formatBookingCurrency(totalPrice)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between">
                  <span className="font-bold text-slate-950">Total</span>
                  <span className="text-2xl font-black tracking-tight text-cyan-500">{formatBookingCurrency(totalPrice)}</span>
                </div>
              </CardContent>
            </Card>

            {purchaseComboMutation.isError && (
              <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {getErrorMessage(purchaseComboMutation.error ?? null)}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="h-11 rounded-[14px] bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white shadow-[0_12px_24px_rgba(34,211,238,0.22)] hover:from-cyan-400 hover:to-blue-500"
                onClick={handlePurchase}
                disabled={purchaseComboMutation.isPending || createComboVnpayCheckoutMutation.isPending}
              >
                {purchaseComboMutation.isPending || createComboVnpayCheckoutMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Proceed to payment
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-[14px] border-slate-200 bg-white text-slate-900 hover:bg-slate-50">
                <Link href="/customer/combos">Browse other combos</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(comboPaymentPreview)} onOpenChange={(open) => !open && handleClosePaymentPreview()}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
              <QrCode className="h-6 w-6" />
            </div>
            <DialogTitle>Pay with SePay</DialogTitle>
            <DialogDescription>
              Scan the QR code or transfer with the exact details below. Your combo will be confirmed after payment is received.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Combos in this payment</p>
              <p className="mt-1">
                {comboPaymentPreview?.comboNames?.length ? comboPaymentPreview.comboNames.join(", ") : "Selected combos"}
              </p>
            </div>

            <div className="space-y-2">
              {comboPaymentPreview?.qrUrl ? (
                <div className="flex justify-center rounded-xl border bg-slate-50 p-3">
                  <img
                    src={comboPaymentPreview.qrUrl}
                    alt="Combo payment QR code"
                    className="h-auto w-full max-w-[300px] rounded-lg"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  QR is not configured yet. Use the transfer details below.
                </div>
              )}

              <ComboPaymentInfoRow icon={Building2} label="Bank" value={comboPaymentPreview?.bankCode ?? "TPBank"} />
              <ComboPaymentInfoRow icon={Banknote} label="Account" value={comboPaymentPreview?.accountNumber ?? "--"} />
              <ComboPaymentInfoRow icon={Wallet} label="Account name" value={comboPaymentPreview?.accountName ?? "AURA CAR CARE"} />
              <ComboPaymentInfoRow icon={Copy} label="Amount" value={formatBookingCurrency(comboPaymentPreview?.amount ?? 0)} />
              <ComboPaymentInfoRow
                icon={Copy}
                label="Description"
                value={comboPaymentPreview?.transferDescription ?? comboPaymentPreview?.reference ?? "--"}
                monospace
              />
            </div>

            <div
              className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
                comboPaymentConfirmed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-sky-100 bg-sky-50 text-sky-800"
              }`}
            >
              {comboPaymentConfirmed ? (
                "Payment confirmed. Your combos are now available."
              ) : (
                <span className="flex items-center gap-2">
                  {comboPaymentStatusQuery.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Checking SePay confirmation every 3 seconds. Keep this window open until payment is confirmed.
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={handleClosePaymentPreview}>
              {comboPaymentConfirmed ? "Done" : "Close"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComboPaymentInfoRow({
  icon: Icon,
  label,
  value,
  monospace = false,
}: {
  icon: ElementType;
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <span className="flex items-center gap-2 shrink-0 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className={`truncate text-right font-bold text-foreground ${monospace ? "font-mono tracking-wide" : ""}`}>
        {value}
      </span>
    </div>
  );
}
