"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { getDisplayErrorMessage, getFieldErrorMessage } from "@/shared/lib/api-errors";
import { CustomerBookingSelect } from "@/features/bookings/components/customer-booking-select";
import {
  BOOKING_TIME_SLOTS,
  buildBookingSummary,
  formatBookingCurrency,
  getModeLabel,
  getPaymentMethodLabel,
  validateBookingDraft,
} from "@/features/bookings/lib/booking-format";
import {
  getVoucherCodeFormatError,
  sanitizeVoucherCodeInput,
  voucherCodeFormatMessage,
} from "@/shared/lib/validators";
import {
  useActiveCustomerCombos,
  useBookingAddons,
  useBookingCombos,
  useBookingPackages,
  useCreateCustomerBooking,
  useValidateBookingVoucher,
} from "@/features/bookings/hooks/use-bookings";
import { useCustomerVehicles } from "@/features/vehicles/hooks/use-customer-vehicles";
import { useCustomerVouchers } from "@/features/vouchers/hooks/use-customer-vouchers";
import { useBookingStore } from "@/features/bookings/store/booking.store";
import type { BookingDraft, PaymentMethod, VoucherValidationResult } from "@/entities/bookings";
import { Ticket, TicketCheck } from "lucide-react";

const PAYMENT_METHODS: PaymentMethod[] = ["BANK_TRANSFER", "E_WALLET", "CASH_AT_COUNTER"];

function getTomorrowDate() {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return next.toISOString().slice(0, 10);
}

function optionCardClass(active: boolean, disabled = false) {
  return [
    "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    active
      ? "border-primary bg-primary/5 shadow-[0_8px_30px_rgb(0,212,255,0.12)] dark:bg-primary/10"
      : "border-border bg-card shadow-sm hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)]",
    disabled
      ? "cursor-not-allowed opacity-50 hover:translate-y-0 hover:border-border hover:shadow-sm"
      : "",
  ].join(" ");
}

function SelectionMark({ active }: { active: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted/50 text-transparent group-hover:border-primary/50"
      }`}
      aria-hidden="true"
    >
      <CheckCircle2 className="h-4 w-4" />
    </span>
  );
}

function OptionPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
      {children}
    </span>
  );
}

export function CustomerBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryMode = searchParams.get("mode");
  const queryPackageId = searchParams.get("packageId");
  const queryComboId = searchParams.get("comboId");
  const queryAddonIds = searchParams.get("addonIds");
  const queryServiceIds = searchParams.get("serviceIds");
  const queryType = searchParams.get("type");
  const queryId = searchParams.get("id");

  const hasAutoSelectedComboRef = useRef(false);
  const draft = useBookingStore((state) => state.draft);
  const updateDraft = useBookingStore((state) => state.updateDraft);

  useEffect(() => {
    const patch: Partial<BookingDraft> = {};
    if (queryMode === "PACKAGE" || queryMode === "COMBO") {
      patch.mode = queryMode;
    } else if (queryMode === "SERVICE") {
      patch.mode = "PACKAGE";
    } else if (queryType === "package" || queryType === "service") {
      patch.mode = "PACKAGE";
    } else if (queryType === "combo") {
      patch.mode = "COMBO";
    }
    if (queryPackageId || (queryType === "package" && queryId)) {
      patch.packageId = queryPackageId ?? queryId ?? "";
    }
    if (queryComboId || (queryType === "combo" && queryId)) {
      patch.comboId = queryComboId ?? queryId ?? "";
    }
    if (queryAddonIds) {
      patch.addonIds = queryAddonIds.split(",").filter(Boolean);
    }
    if (queryServiceIds) {
      patch.addonIds = queryServiceIds.split(",").filter(Boolean);
    }
    if (queryType === "service" && queryId) {
      patch.addonIds = [queryId];
    }
    if (Object.keys(patch).length > 0) {
      updateDraft(patch);
    }
  }, [queryAddonIds, queryComboId, queryId, queryMode, queryPackageId, queryServiceIds, queryType, updateDraft]);
  const vehiclesQuery = useCustomerVehicles();
  const packagesQuery = useBookingPackages();
  const addonsQuery = useBookingAddons();
  const combosQuery = useBookingCombos();
  const activeCustomerCombosQuery = useActiveCustomerCombos();
  const customerVouchersQuery = useCustomerVouchers();
  const voucherMutation = useValidateBookingVoucher();
  const createBookingMutation = useCreateCustomerBooking();
  const [validatedVoucher, setValidatedVoucher] = useState<VoucherValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [voucherInputError, setVoucherInputError] = useState<string | null>(null);

  const isLoadingCatalog =
    vehiclesQuery.isPending ||
    packagesQuery.isPending ||
    addonsQuery.isPending ||
    combosQuery.isPending ||
    activeCustomerCombosQuery.isPending;
  const catalogError =
    vehiclesQuery.error ??
    packagesQuery.error ??
    addonsQuery.error ??
    combosQuery.error ??
    activeCustomerCombosQuery.error ??
    null;

  const vehicles = vehiclesQuery.data?.items ?? [];
  const packages = packagesQuery.data ?? [];
  const addons = addonsQuery.data ?? [];
  const combos = combosQuery.data ?? [];
  const activeCustomerCombos = activeCustomerCombosQuery.data ?? [];
  const activeOwnedCombos = useMemo(
    () =>
      [...activeCustomerCombos]
        .filter((item) => Number(item.remainingUsages) > 0)
        .sort((left, right) => left.expiresAt.localeCompare(right.expiresAt)),
    [activeCustomerCombos],
  );
  const preferredOwnedComboId = activeOwnedCombos[0]?.comboId ?? "";
  const activeOwnedComboMap = useMemo(
    () => new Map(activeOwnedCombos.map((item) => [item.comboId, item] as const)),
    [activeOwnedCombos],
  );

  useEffect(() => {
    if (!draft.bookingDate) {
      updateDraft({ bookingDate: getTomorrowDate() });
    }
  }, [draft.bookingDate, updateDraft]);

  useEffect(() => {
    if (!draft.vehicleId && vehicles.length > 0) {
      updateDraft({
        vehicleId: vehicles.find((item) => item.isPrimary)?.vehicleId ?? vehicles[0].vehicleId,
      });
    }
  }, [draft.vehicleId, updateDraft, vehicles]);

  useEffect(() => {
    if (draft.mode === "PACKAGE" && !draft.packageId && packages.length > 0) {
      updateDraft({ packageId: packages[0].packageId });
    }
  }, [draft.mode, draft.packageId, packages, updateDraft]);

  useEffect(() => {
    if (draft.mode !== "COMBO") {
      hasAutoSelectedComboRef.current = false;
      return;
    }

    if (combos.length === 0) {
      return;
    }

    const fallbackComboId = preferredOwnedComboId || combos[0]?.comboId || "";
    const availableComboIds = new Set(combos.map((item) => item.comboId));
    const hasValidSelectedCombo = draft.comboId.length > 0 && availableComboIds.has(draft.comboId);

    if (!hasValidSelectedCombo && fallbackComboId) {
      hasAutoSelectedComboRef.current = true;
      updateDraft({ comboId: fallbackComboId });
      return;
    }

    if (
      !hasAutoSelectedComboRef.current &&
      preferredOwnedComboId &&
      draft.comboId !== preferredOwnedComboId
    ) {
      hasAutoSelectedComboRef.current = true;
      updateDraft({ comboId: preferredOwnedComboId });
      return;
    }

    hasAutoSelectedComboRef.current = true;
  }, [combos, draft.comboId, draft.mode, preferredOwnedComboId, updateDraft]);

  const selectedCustomerCombo =
    draft.mode === "COMBO"
      ? (activeCustomerCombos.find((item) => item.comboId === draft.comboId) ?? null)
      : null;

  const packageOptions = useMemo(
    () =>
      packages.map((item) => ({
        value: item.packageId,
        label: item.name,
        description: item.description,
        helper: `${item.duration} min · ${formatBookingCurrency(item.basePrice)}`,
      })),
    [packages],
  );

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

  const errors = useMemo(() => {
    const validationSummary =
      draft.voucherCode.trim().length > 0 && !validatedVoucher ? null : summary;

    return validateBookingDraft(draft, validationSummary);
  }, [draft, summary, validatedVoucher]);

  const selectedPackageAddons =
    draft.mode === "PACKAGE" && draft.packageId
      ? addons.filter((addon) => addon.status === "ACTIVE")
      : [];

  const vehicleOptions = vehicles.map((vehicle) => ({
    value: vehicle.vehicleId,
    label: `${vehicle.plate} · ${vehicle.brand} ${vehicle.model}`,
    description: `${vehicle.type}${vehicle.isPrimary ? " · Primary vehicle" : ""}`,
  }));
  const validateVoucher = async (codeToValidate?: string) => {
    const code = codeToValidate ?? draft.voucherCode;
    const normalizedCode = sanitizeVoucherCodeInput(code);
    const formatError = getVoucherCodeFormatError(normalizedCode);

    if (!normalizedCode || !summary) {
      setValidatedVoucher(null);
      setVoucherInputError(null);
      return;
    }

    if (formatError) {
      setValidatedVoucher(null);
      setVoucherInputError(formatError);
      toast.error(formatError);
      return;
    }

    try {
      const result = await voucherMutation.mutateAsync({
        voucherCode: normalizedCode,
        packageId: draft.mode === "PACKAGE" ? draft.packageId : undefined,
        amount: summary.subtotal,
      });
      setValidatedVoucher(result);
      setVoucherInputError(null);
      updateDraft({ voucherCode: result.voucherCode });
      toast.success(`Voucher ${result.voucherCode} applied.`);
    } catch (error) {
      setValidatedVoucher(null);
      toast.error(getDisplayErrorMessage(error));
    }
  };

  const clearVoucher = () => {
    setValidatedVoucher(null);
    setVoucherInputError(null);
    updateDraft({ voucherCode: "" });
    voucherMutation.reset();
  };

  const handleSubmit = async () => {
    setShowValidation(true);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      const booking = await createBookingMutation.mutateAsync(draft);
      toast.success("Booking created successfully.");
      router.push(`/customer/bookings/success?bookingId=${booking.bookingId}`);
    } catch (error) {
      toast.error(getDisplayErrorMessage(error));
    }
  };

  const updateMode = (mode: BookingDraft["mode"]) => {
    setValidatedVoucher(null);
    updateDraft({
      mode,
      packageId: mode === "PACKAGE" ? (packages[0]?.packageId ?? "") : "",
      comboId: mode === "COMBO" ? preferredOwnedComboId || combos[0]?.comboId || "" : "",
      addonIds: [],
      voucherCode: "",
    });
  };

  if (isLoadingCatalog) {
    return <BookingPageLoadingState />;
  }

  if (catalogError) {
    return (
      <BookingPageErrorState
        title="Unable to load booking checkout"
        description={getDisplayErrorMessage(catalogError)}
        onRetry={() => {
          void Promise.all([
            vehiclesQuery.refetch(),
            packagesQuery.refetch(),
            addonsQuery.refetch(),
            combosQuery.refetch(),
            activeCustomerCombosQuery.refetch(),
          ]);
        }}
      />
    );
  }

  if (vehicles.length === 0) {
    return (
      <BookingPageErrorState
        title="No active vehicles found"
        description="Add at least one customer vehicle before creating a booking."
        actionHref="/customer/vehicles/add"
        actionLabel="Add vehicle"
      />
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-background px-4 py-6 sm:px-6 lg:px-8">
      {/* Decorative premium background elements */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      
      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.6fr,1fr]">
        <div className="space-y-6">
          <CheckoutSection step="1" title="Select vehicle">
            <CustomerBookingSelect
              options={vehicleOptions}
              value={draft.vehicleId}
              onValueChange={(vehicleId) => updateDraft({ vehicleId })}
              placeholder="Select a vehicle"
              searchPlaceholder="Search plate, brand, or model..."
              emptyText="No vehicles found."
              renderValue={(option) =>
                option ? (
                  <span className="block">
                    <span className="block truncate font-semibold text-foreground">
                      {option.label}
                    </span>
                    <span className="block truncate text-xs font-normal text-muted-foreground mt-1">
                      {option.description}
                    </span>
                  </span>
                ) : (
                  "Select a vehicle"
                )
              }
            />
            <FieldError message={showValidation ? errors.vehicleId : null} />
          </CheckoutSection>

          <CheckoutSection step="2" title="Choose booking type">
            <div className="grid gap-3 md:grid-cols-2">
              {(["PACKAGE", "COMBO"] as const).map((mode) => {
                const active = draft.mode === mode;
                const disabled = mode === "COMBO" && combos.length === 0;

                return (
                  <button
                    key={mode}
                    type="button"
                    className={optionCardClass(active, disabled)}
                    disabled={disabled}
                    onClick={() => updateMode(mode)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-bold text-foreground">
                          {getModeLabel(mode)}
                        </div>
                        <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {mode === "PACKAGE"
                            ? "Chọn một gói rửa và dịch vụ thêm nếu cần."
                            : "Đặt trực tiếp từ danh sách combo hiện có."}
                        </div>
                      </div>
                      <SelectionMark active={active} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <OptionPill>
                        {mode === "PACKAGE"
                          ? `${packages.length} packages`
                          : `${combos.length} combos`}
                      </OptionPill>
                      <OptionPill>
                        {mode === "PACKAGE"
                          ? `${addons.length} add-ons`
                          : `${activeOwnedCombos.length} active owned`}
                      </OptionPill>
                    </div>
                  </button>
                );
              })}
            </div>
            {draft.mode === "COMBO" ? (
              <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-primary">
                Select a combo first. If you already own a valid combo of the same type, the combo
                charge is skipped and the booking uses the remaining usages from that owned combo.
              </div>
            ) : null}
          </CheckoutSection>

          <CheckoutSection
            step="3"
            title={draft.mode === "PACKAGE" ? "Select wash package" : "Select combo"}
          >
            {draft.mode === "PACKAGE" ? (
              <CustomerBookingSelect
                options={packageOptions}
                value={draft.packageId}
                onValueChange={(packageId) => updateDraft({
                  packageId,
                  addonIds: [],
                  voucherCode: "",
                })}
                placeholder="Select a package"
                searchPlaceholder="Search package name..."
                emptyText="No packages found."
                className="border-slate-300 bg-white"
                renderValue={(option) =>
                  option ? (
                    <span className="block">
                      <span className="block truncate font-semibold text-foreground">
                        {option.label}
                      </span>
                      <span className="block truncate text-xs font-normal text-muted-foreground mt-1">
                        {option.helper}
                      </span>
                    </span>
                  ) : (
                    "Select a package"
                  )
                }
              />
            ) : (
              <div className="grid gap-3">
                {combos.map((item) => {
                  const active = draft.comboId === item.comboId;
                  const ownedCombo = activeOwnedComboMap.get(item.comboId);

                  return (
                    <button
                      key={item.comboId}
                      type="button"
                      className={optionCardClass(active)}
                      onClick={() => updateDraft({ comboId: item.comboId, voucherCode: "" })}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-lg font-bold text-foreground">{item.name}</div>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                        <SelectionMark active={active} />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <OptionPill>{item.durationDays} days</OptionPill>
                        <OptionPill>Max {item.maxServices} services</OptionPill>
                        <OptionPill>{formatBookingCurrency(item.basePrice)}</OptionPill>
                      </div>
                      {ownedCombo ? (
                        <p className="mt-5 inline-flex items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Owned combo · {ownedCombo.remainingUsages} usages left · expires{" "}
                          {new Date(ownedCombo.expiresAt).toLocaleDateString("vi-VN")}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
            <FieldError
              message={
                showValidation
                  ? draft.mode === "PACKAGE"
                    ? errors.packageId
                    : errors.comboId
                  : null
              }
            />
          </CheckoutSection>

          <CheckoutSection step="4" title="Select add-ons">
            {draft.mode === "COMBO" ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Combo bookings do not use add-ons in this simplified flow.
                </p>
                {selectedCustomerCombo ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-600 dark:text-emerald-400">
                    <div className="font-semibold text-emerald-700 dark:text-emerald-300">Owned combo applied</div>
                    <div className="mt-1.5 opacity-90">
                      {selectedCustomerCombo.remainingUsages} usages left, expires on{" "}
                      {new Date(selectedCustomerCombo.expiresAt).toLocaleDateString("vi-VN")}.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-600 dark:text-amber-400">
                    <div className="font-semibold text-amber-700 dark:text-amber-300">No valid owned combo</div>
                    <div className="mt-1.5 opacity-90">
                      Completing this booking will also purchase the selected combo.
                    </div>
                  </div>
                )}
              </div>
            ) : selectedPackageAddons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active add-ons are available for the selected package.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {selectedPackageAddons.map((addon) => {
                  const active = draft.addonIds.includes(addon.addonId);
                  return (
                    <button
                      key={addon.addonId}
                      type="button"
                      className={optionCardClass(active)}
                      onClick={() =>
                        updateDraft({
                          addonIds: active
                            ? draft.addonIds.filter((addonId) => addonId !== addon.addonId)
                            : [...draft.addonIds, addon.addonId],
                          voucherCode: "",
                        })
                      }
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground">{addon.name}</div>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                            {addon.description}
                          </p>
                        </div>
                        <SelectionMark active={active} />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <OptionPill>{addon.duration} min</OptionPill>
                        <OptionPill>{formatBookingCurrency(addon.price)}</OptionPill>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CheckoutSection>

          <CheckoutSection step="5" title="Choose schedule">
            <div className="grid gap-4 xl:grid-cols-[220px,1fr]">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Booking date
                </label>
                <input
                  type="date"
                  min={getTomorrowDate()}
                  value={draft.bookingDate}
                  onChange={(event) => updateDraft({ bookingDate: event.target.value })}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <FieldError message={showValidation ? errors.bookingDate : null} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Booking time
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {BOOKING_TIME_SLOTS.map((time) => (
                    <button
                      key={time}
                      type="button"
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                        draft.bookingTime === time
                          ? "border-primary bg-primary text-primary-foreground shadow-md"
                          : "border-input bg-card text-foreground hover:border-primary/50 hover:bg-muted"
                      }`}
                      onClick={() => updateDraft({ bookingTime: time })}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                <FieldError message={showValidation ? errors.bookingTime : null} />
              </div>
            </div>
          </CheckoutSection>

          <CheckoutSection step="6" title="Validate voucher">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={draft.voucherCode}
                onChange={(event) => {
                  const nextValue = sanitizeVoucherCodeInput(event.target.value);
                  setValidatedVoucher(null);
                  setVoucherInputError(getVoucherCodeFormatError(nextValue));
                  updateDraft({ voucherCode: nextValue });
                }}
                placeholder="Nhập mã giảm giá (VD: WELCOME20)"
                className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium tracking-wide placeholder:text-muted-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void validateVoucher()}
                disabled={
                  !draft.voucherCode.trim() ||
                  Boolean(voucherInputError) ||
                  voucherMutation.isPending ||
                  !summary
                }
                className="rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground sm:w-auto"
              >
                {voucherMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Validate
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={clearVoucher}
                disabled={!draft.voucherCode && !validatedVoucher}
              >
                Clear
              </Button>
            </div>
            
            {/* Vouchers from Wallet */}
            {customerVouchersQuery.data && customerVouchersQuery.data.items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Ticket className="h-4 w-4" />
                  Hoặc chọn từ Ví Voucher của bạn
                </div>
                <div className="flex flex-wrap gap-2">
                  {customerVouchersQuery.data.items.map((voucher) => {
                    const isSelected = draft.voucherCode === voucher.code;
                    const isValidated = validatedVoucher?.voucherCode === voucher.code;
                    const discountText = voucher.discountType === "PERCENT" ? `${voucher.discountValue}% OFF` : `${voucher.discountValue.toLocaleString("vi-VN")}đ`;
                    return (
                      <button
                        key={voucher.code}
                        type="button"
                        onClick={() => {
                          setValidatedVoucher(null);
                          setVoucherInputError(null);
                          updateDraft({ voucherCode: voucher.code });
                          // Automatically validate after setting state in next tick
                          setTimeout(() => validateVoucher(voucher.code), 50);
                        }}
                        className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                          isValidated
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 shadow-sm"
                            : isSelected
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-border/60 bg-card text-foreground hover:border-primary/40 hover:bg-muted"
                        }`}
                      >
                        <div className="font-bold">{voucher.name}</div>
                        <div className="rounded-md bg-background/50 px-1.5 py-0.5 text-[10px] font-black tracking-wider opacity-80 border">
                          {discountText}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="mt-2 text-xs text-muted-foreground">{voucherCodeFormatMessage}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Voucher validation uses the real contract with the current subtotal.
            </p>
            {validatedVoucher ? (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {validatedVoucher.voucherCode} applied. Discount{" "}
                {formatBookingCurrency(validatedVoucher.discountAmount)}.
              </div>
            ) : null}
            <FieldError
              message={
                voucherInputError ??
                (showValidation
                  ? errors.voucherCode
                  : getFieldErrorMessage(voucherMutation.error?.errors, "voucherCode"))
              }
            />
          </CheckoutSection>

          <CheckoutSection step="7" title="Choose payment and review">
            <div className="grid gap-3 md:grid-cols-3">
              {PAYMENT_METHODS.map((method) => {
                const active = draft.paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    className={`rounded-2xl border p-4 text-left transition-all duration-300 ${
                      active
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                        : "border-border bg-card hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-sm"
                    }`}
                    onClick={() => updateDraft({ paymentMethod: method })}
                  >
                    <div className="font-semibold text-foreground">
                      {getPaymentMethodLabel(method)}
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                      Demo checkout only. No real bank or wallet transaction is executed.
                    </div>
                  </button>
                );
              })}
            </div>
            <FieldError message={showValidation ? errors.paymentMethod : null} />
            {createBookingMutation.isError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {getDisplayErrorMessage(createBookingMutation.error)}
              </div>
            ) : null}
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => void handleSubmit()}
              disabled={createBookingMutation.isPending}
            >
              {createBookingMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Submit booking
            </Button>
          </CheckoutSection>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="border-border bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
            <CardHeader>
              <CardTitle>Checkout review</CardTitle>
              <CardDescription>
                The summary reflects the actual API payload and validated voucher result.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary ? (
                <>
                  <SummaryItem label="Booking type" value={getModeLabel(summary.itemType)} />
                  <SummaryItem label="Selected item" value={summary.itemName} />
                  <SummaryItem
                    label="Vehicle"
                    value={
                      vehicles.find((item) => item.vehicleId === draft.vehicleId)?.plate ?? "--"
                    }
                  />
                  <SummaryItem
                    label="Schedule"
                    value={
                      draft.bookingDate && draft.bookingTime
                        ? `${draft.bookingDate} ${draft.bookingTime}`
                        : "--"
                    }
                  />
                  <SummaryItem label="Estimated duration" value={summary.estimatedDurationLabel} />
                  <SummaryItem
                    label="Base amount"
                    value={formatBookingCurrency(summary.baseAmount)}
                  />
                  <SummaryItem label="Add-ons" value={formatBookingCurrency(summary.addonsTotal)} />
                  <SummaryItem label="Subtotal" value={formatBookingCurrency(summary.subtotal)} />
                  <SummaryItem
                    label="Voucher discount"
                    value={formatBookingCurrency(summary.discountAmount)}
                  />
                  {draft.mode === "COMBO" ? (
                    <SummaryItem
                      label="Owned combo"
                      value={
                        selectedCustomerCombo
                          ? `${selectedCustomerCombo.remainingUsages} usages left`
                          : "Will be purchased with booking"
                      }
                    />
                  ) : null}
                  <SummaryItem
                    label="Payment method"
                    value={draft.paymentMethod ? getPaymentMethodLabel(draft.paymentMethod) : "--"}
                  />
                  <SummaryItem
                    label="Final amount"
                    value={formatBookingCurrency(summary.finalAmount)}
                    emphasize
                  />
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/50 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Complete the checkout steps to build a valid booking summary.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CheckoutSection({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <CardHeader>
        <CardDescription>Step {step}</CardDescription>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function SummaryItem({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 text-sm last:border-b-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`text-right ${
          emphasize ? "text-base font-bold text-slate-900" : "font-medium text-slate-800"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function FieldError({ message }: { message: string | null | undefined }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-rose-600">{message}</p>;
}

function BookingPageLoadingState() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    </div>
  );
}

function BookingPageErrorState({
  title,
  description,
  onRetry,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-3xl border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {onRetry ? (
            <Button type="button" variant="outline" onClick={onRetry}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Thử lại
            </Button>
          ) : null}
          {actionHref && actionLabel ? (
            <Button asChild>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
