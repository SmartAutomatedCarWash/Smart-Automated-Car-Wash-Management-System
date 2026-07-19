"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";
import {
  Banknote,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Loader2,
  Mail,
  RefreshCcw,
  Sparkles,
  Ticket,
  X,
  Phone,
  MessageSquare,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/ui/popover";
import { DatePickerButton } from "@/shared/ui/date-picker-button";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { CustomerBookingSelect, CustomerBookingMultiSelect } from "@/features/bookings/components/customer-booking-select";
import {
  generateTimeSlotsFromRange,
  buildBookingSummary,
  formatBookingCurrency,
  getModeLabel,
  validateBookingDraft,
} from "@/features/bookings/lib/booking-format";
import { usePublicSettings } from "@/features/settings/hooks/use-public-settings";
import {
  getVoucherCodeFormatError,
  sanitizeVoucherCodeInput,
} from "@/shared/lib/validators";
import { cn } from "@/shared/lib/utils";
import {
  useActiveCustomerCombos,
  useBookingAddons,
  useBookingCombos,
  useBookingPackages,
  useCreateCustomerBooking,
  useValidateBookingDiscount,
} from "@/features/bookings/hooks/use-bookings";
import { useSlotHold } from "@/features/bookings/hooks/use-slot-hold";
import { useCustomerVehicles, useCreateCustomerVehicle } from "@/features/vehicles/hooks/use-customer-vehicles";
import { useCustomerDiscounts } from "@/features/discounts/hooks/use-customer-discounts";
import { useBookingStore } from "@/features/bookings/store/booking.store";
import type { BookingDraft, PaymentMethod, DiscountValidationResult } from "@/entities/bookings";
import {
  CUSTOMER_VEHICLE_TYPES,
  type CustomerVehicleFormValues,
  type CustomerVehicleFormErrors,
} from "@/entities/vehicles";
import {
  validateCustomerVehicleForm,
  buildCreateCustomerVehicleRequest,
} from "@/features/vehicles/lib/vehicle-form";

// ─── helpers ────────────────────────────────────────────────────────────────

function getTomorrowDate() {
  return new Date().toISOString().slice(0, 10);
}

function optionCardClass(active: boolean, disabled = false) {
  return [
    "group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    active
      ? "border-primary bg-primary/5 shadow-[0_4px_16px_rgb(0,212,255,0.1)]"
      : "border-border bg-card hover:border-primary/50 hover:bg-muted/40",
    disabled ? "cursor-not-allowed opacity-50 hover:border-border hover:bg-card" : "",
  ].join(" ");
}

function SelectionMark({ active }: { active: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted/50 text-transparent group-hover:border-primary/40"
      }`}
      aria-hidden="true"
    >
      <CheckCircle2 className="h-3 w-3" />
    </span>
  );
}

function OptionPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-background/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

// ─── Add New Vehicle Modal ────────────────────────────────────────────────────

const EMPTY_VEHICLE_FORM: CustomerVehicleFormValues = {
  plate: "",
  type: "CAR",
  brand: "",
  model: "",
  year: "",
  color: "",
};

// Popular car brands in Vietnam market
const CAR_BRANDS: Record<string, string[]> = {
  Toyota: ["Camry", "Corolla", "Vios", "Fortuner", "Innova", "Hilux", "Rush", "Raize", "Yaris", "Land Cruiser"],
  Honda: ["City", "Civic", "CR-V", "HR-V", "Accord", "Jazz", "BR-V", "Pilot", "Odyssey"],
  Hyundai: ["Accent", "Elantra", "Tucson", "Santa Fe", "i10", "Creta", "Ioniq", "Kona", "Grand i10"],
  Kia: ["Morning", "Seltos", "Sportage", "Sorento", "K3", "K5", "Carnival", "Telluride", "Cerato"],
  Mazda: ["2", "3", "6", "CX-3", "CX-5", "CX-8", "CX-30", "BT-50", "MX-5"],
  Ford: ["Ranger", "Everest", "Territory", "Explorer", "Escape", "Focus", "Mondeo"],
  Mitsubishi: ["Xpander", "Outlander", "Pajero Sport", "Triton", "Eclipse Cross", "Attrage", "Galant"],
  Suzuki: ["Swift", "Ertiga", "XL7", "Vitara", "Ciaz", "Jimny", "Alto"],
  Nissan: ["Almera", "Terra", "X-Trail", "Navara", "Sunny", "Kicks"],
  Mercedes: ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "A-Class", "CLA", "GLA", "GLB"],
  BMW: ["3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7", "2 Series"],
  Audi: ["A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron"],
  VinFast: ["Fadil", "Lux A2.0", "Lux SA2.0", "VF3", "VF5", "VF6", "VF7", "VF8", "VF9", "VF e34"],
  Chevrolet: ["Trailblazer", "Colorado", "Trax", "Spark", "Captiva"],
  Peugeot: ["2008", "3008", "5008", "408", "508"],
  Other: ["Other model"],
};

const BRAND_LIST = Object.keys(CAR_BRANDS);

const VEHICLE_COLORS = [
  "White", "Black", "Silver", "Gray", "Red", "Blue", "Brown",
  "Green", "Yellow", "Orange", "Gold", "Beige", "Navy Blue",
  "Champagne", "Pearl White", "Midnight Black", "Other",
];

const selectCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const PAYMENT_OPTIONS: {
  method: PaymentMethod;
  label: string;
  description: string;
  icon: ElementType;
  badge?: string;
}[] = [
  {
    method: "CASH_AT_COUNTER",
    label: "Cash at counter",
    description: "Pay directly when you arrive.",
    icon: Banknote,
  },
  {
    method: "BANK_TRANSFER",
    label: "Bank transfer",
    description: "Transfer before your appointment.",
    icon: Building2,
  },
  {
    method: "E_WALLET",
    label: "E-wallet",
    description: "Pay via MoMo, ZaloPay or VNPay.",
    icon: Wallet,
    badge: "Popular",
  },
];

function AddVehicleModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (vehicleId: string) => void;
}) {
  const getErrorMessage = useErrorMessage();
  const createMutation = useCreateCustomerVehicle();
  const [form, setForm] = useState<CustomerVehicleFormValues>(EMPTY_VEHICLE_FORM);
  const [errors, setErrors] = useState<CustomerVehicleFormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function set(field: keyof CustomerVehicleFormValues, value: string) {
    const next = { ...form, [field]: value };
    // Reset model when brand changes
    if (field === "brand") next.model = "";
    setForm(next);
    if (submitted) setErrors(validateCustomerVehicleForm(next, "create"));
  }

  const modelList = form.brand ? (CAR_BRANDS[form.brand] ?? ["Other model"]) : [];

  async function handleCreate() {
    setSubmitted(true);
    const errs = validateCustomerVehicleForm(form, "create");
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const payload = buildCreateCustomerVehicleRequest(form);
      const created = await createMutation.mutateAsync(payload);
      toast.success(`Vehicle ${created.plate} added.`);
      onCreated(created.vehicleId);
      onOpenChange(false);
      setForm(EMPTY_VEHICLE_FORM);
      setErrors({});
      setSubmitted(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add new vehicle</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">

          {/* Plate number — free text */}
          <div>
            <Label className="mb-1 block text-xs font-semibold">Plate number *</Label>
            <Input
              value={form.plate}
              onChange={(e) => set("plate", e.target.value.toUpperCase())}
              placeholder="Enter plate number"
              className="rounded-xl"
            />
            {errors.plate && <p className="mt-1 text-xs text-rose-600">{errors.plate}</p>}
          </div>

          {/* Vehicle type */}
          <div>
            <Label className="mb-1 block text-xs font-semibold">Type *</Label>
            <select value={form.type} onChange={(e) => set("type", e.target.value)} className={selectCls}>
              <option value="" disabled>Select type</option>
              {CUSTOMER_VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Brand + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-semibold">Brand *</Label>
              <select value={form.brand} onChange={(e) => set("brand", e.target.value)} className={selectCls}>
                <option value="" disabled>Select brand</option>
                {BRAND_LIST.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              {errors.brand && <p className="mt-1 text-xs text-rose-600">{errors.brand}</p>}
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold">Model *</Label>
              <select
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                disabled={!form.brand}
                className={`${selectCls} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <option value="" disabled>{form.brand ? "Select model" : "Select brand first"}</option>
                {modelList.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {errors.model && <p className="mt-1 text-xs text-rose-600">{errors.model}</p>}
            </div>
          </div>

          {/* Year + Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-semibold">Year *</Label>
              <Input
                value={form.year}
                onChange={(e) => set("year", e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="e.g. 2024"
                inputMode="numeric"
                className="rounded-xl"
              />
              {errors.year && <p className="mt-1 text-xs text-rose-600">{errors.year}</p>}
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold">Color</Label>
              <select value={form.color} onChange={(e) => set("color", e.target.value)} className={selectCls}>
                <option value="" disabled>Select color</option>
                {VEHICLE_COLORS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
          <Button onClick={() => void handleCreate()} disabled={createMutation.isPending} className="rounded-xl">
            {createMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Add vehicle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add-ons multi-select dropdown ────────────────────────────────────────────

function AddonsDropdown({
  addons,
  selectedIds,
  onToggle,
}: {
  addons: { addonId: string; name: string; price: number; duration: number }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const totalAddonsPrice = addons
    .filter((a) => selectedIds.includes(a.addonId))
    .reduce((sum, a) => sum + a.price, 0);

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground ring-offset-background transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="text-muted-foreground">
              {selectedIds.length === 0
                ? "Select add-ons (optional)"
                : `${selectedIds.length} add-on${selectedIds.length > 1 ? "s" : ""} · +${formatBookingCurrency(totalAddonsPrice)}`}
            </span>
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-full min-w-[320px] rounded-xl p-2" align="start">
          {addons.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No add-ons available.</p>
          ) : (
            <ul className="space-y-0.5">
              {addons.map((addon) => {
                const active = selectedIds.includes(addon.addonId);
                return (
                  <li key={addon.addonId}>
                    <button
                      type="button"
                      onClick={() => onToggle(addon.addonId)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                        {active && <CheckCircle2 className="h-3 w-3" />}
                      </span>
                      <span className="flex-1 text-left font-medium">{addon.name}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{addon.duration} min</span>
                      <span className="shrink-0 font-semibold text-primary">{formatBookingCurrency(addon.price)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </PopoverContent>
      </Popover>

      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {addons
            .filter((a) => selectedIds.includes(a.addonId))
            .map((addon) => (
              <span
                key={addon.addonId}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {addon.name}
                <button
                  type="button"
                  onClick={() => onToggle(addon.addonId)}
                  className="ml-0.5 rounded-full hover:text-rose-500"
                  aria-label={`Remove ${addon.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── AM/PM Time Picker (redesigned — matches reference image) ───────────────
// Layout: "Start with" trigger + "End with" read-only trigger side by side,
// dropdown list opens below showing scrollable time slots.

/** Add totalMinutes to a "HH:MM" string, returns "HH:MM" */
function addMinutesToTime(time: string, totalMinutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + totalMinutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

/** Format a 24h "HH:MM" string to "HH:MM AM/PM" */
function to12hLabel(time: string): { time: string; period: "AM" | "PM" } {
  const [h, m] = time.split(":").map(Number);
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { time: `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")}`, period };
}

function AmPmTimePicker({
  timeSlots,
  value,
  onChange,
  endTime,
  bookingDate,
}: {
  timeSlots: string[];
  value: string;
  onChange: (time: string) => void;
  /** Pre-calculated end time in 24h "HH:MM" format, or null */
  endTime: string | null;
  /** Selected booking date "YYYY-MM-DD" — used to filter past slots when today */
  bookingDate?: string;
}) {
  const availableSet = useMemo(() => new Set(timeSlots), [timeSlots]);

  // When booking date is today, hide time slots that have already passed
  const visibleSlots = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (bookingDate !== today) return timeSlots;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return timeSlots.filter((t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m > nowMinutes;
    });
  }, [timeSlots, bookingDate]);

  const groupedSlots = useMemo(() => {
    const mapSlot = (slot24: string) => ({ slot24, label: to12hLabel(slot24).time });
    return {
      AM: visibleSlots.filter((t) => Number(t.split(":")[0]) < 12).map(mapSlot),
      PM: visibleSlots.filter((t) => Number(t.split(":")[0]) >= 12).map(mapSlot),
    };
  }, [visibleSlots]);

  // If the currently selected time has become past (today), clear it
  useEffect(() => {
    if (value && !visibleSlots.includes(value)) {
      onChange("");
    }
  }, [visibleSlots, value, onChange]);

  function selectSlot(slot24: string) {
    if (availableSet.has(slot24)) {
      onChange(slot24);
    }
  }

  const startLabel = value ? to12hLabel(value) : null;
  const endLabel = endTime ? to12hLabel(endTime) : null;
  const availableCount = visibleSlots.filter((slot) => availableSet.has(slot)).length;

  return (
    <div className="relative space-y-3">
      {/* ── Two trigger buttons row ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Start with — active/clickable */}
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-left shadow-sm">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-0.5">
              Start with
            </p>
            <p className={`text-sm font-bold leading-none tabular-nums ${startLabel ? "text-foreground" : "text-muted-foreground font-normal"}`}>
              {startLabel ? `${startLabel.time} ${startLabel.period}` : "Select time"}
            </p>
          </div>
        </div>

        {/* End with — read-only, auto-calculated */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3 cursor-default">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-0.5">
              End with
            </p>
            <p className="text-sm font-bold text-foreground leading-none tabular-nums">
              {endLabel ? `${endLabel.time} ${endLabel.period}` : "—"}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground opacity-40" />
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card/70 p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Available slots</p>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            {availableCount} open
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["AM", "PM"] as const).map((period) => (
            <div key={period} className="rounded-2xl border border-border/80 bg-background/70 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black text-foreground">{period === "AM" ? "Morning" : "Afternoon"}</p>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{period}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {groupedSlots[period].length === 0 ? (
                  <p className="col-span-2 rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    No slots
                  </p>
                ) : (
                  groupedSlots[period].map(({ slot24, label }) => {
                    const active = value === slot24;
                    const available = availableSet.has(slot24);
                    return (
                      <button
                        key={slot24}
                        type="button"
                        disabled={!available}
                        onClick={() => selectSlot(slot24)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm font-black tabular-nums transition duration-200",
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(0,184,217,0.22)]"
                            : available
                              ? "border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5"
                              : "cursor-not-allowed border-border bg-muted/40 text-muted-foreground/45 line-through",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
        {value && endLabel ? (
          <div className="mt-3 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-foreground">
            Estimated completion: {endLabel.time} {endLabel.period}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Voucher section ──────────────────────────────────────────────────────────

function DiscountSection({
  draft,
  summary,
  validatedDiscount,
  discountMutation,
  customerDiscounts,
  onApply,
  onClear,
  onCodeChange,
}: {
  draft: BookingDraft;
  summary: ReturnType<typeof buildBookingSummary>;
  validatedDiscount: DiscountValidationResult | null;
  discountMutation: { isPending: boolean; error?: unknown; reset: () => void };
  customerDiscounts: { code: string; name: string; discountType: string; discountValue: number }[];
  onApply: (code?: string) => void;
  onClear: () => void;
  onCodeChange: (code: string) => void;
}) {
  const getErrorMessage = useErrorMessage();
  const [inputError, setInputError] = useState<string | null>(null);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = sanitizeVoucherCodeInput(e.target.value);
    setInputError(getVoucherCodeFormatError(v));
    onCodeChange(v);
  }

  return (
    <div className="space-y-3">
      {/* Applied voucher chip */}
      {validatedDiscount ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="flex-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            {validatedDiscount.discountCode} −{formatBookingCurrency(validatedDiscount.discountAmount)}
          </span>
          <button type="button" onClick={onClear} className="text-muted-foreground hover:text-rose-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={draft.discountCode}
            onChange={handleInput}
            placeholder="Enter voucher code"
            maxLength={50}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="rounded-xl font-medium tracking-wide"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onApply()}
            disabled={!draft.discountCode.trim() || Boolean(inputError) || discountMutation.isPending || !summary}
            className="shrink-0 rounded-xl border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground"
          >
            {discountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </div>
      )}

      {/* Inline errors */}
      {inputError && !validatedDiscount && (
        <p className="text-xs text-rose-600">{inputError}</p>
      )}
      {!inputError && Boolean(discountMutation.error) && !validatedDiscount && (
        <p className="text-xs text-rose-600">{getErrorMessage(discountMutation.error)}</p>
      )}

      {/* Wallet vouchers */}
      {customerDiscounts.length > 0 && !validatedDiscount && (
        <div className="pt-1">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Ticket className="h-3.5 w-3.5" />
            From your wallet
          </div>
          <div className="flex flex-wrap gap-2">
            {customerDiscounts.map((voucher) => {
              const discountText =
                voucher.discountType === "PERCENTAGE"
                  ? `${voucher.discountValue}% OFF`
                  : `${voucher.discountValue.toLocaleString("vi-VN")}đ`;
              return (
                <button
                  key={voucher.code}
                  type="button"
                  onClick={() => onApply(voucher.code)}
                  className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-1.5 text-xs hover:border-primary/40 hover:bg-muted transition-colors"
                >
                  <span className="font-bold">{voucher.name}</span>
                  <span className="rounded bg-background/70 border px-1 py-0.5 text-[10px] font-black opacity-80">{discountText}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TimeSlotGrid({
  timeSlots,
  value,
  onChange,
  bookingDate,
  durationMinutes = 45,
}: {
  timeSlots: string[];
  value: string;
  onChange: (time: string) => void;
  bookingDate?: string;
  durationMinutes?: number;
}) {
  const visibleSlotsMap = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return timeSlots.map((t, idx) => {
      const [h, m] = t.split(":").map(Number);
      const isPast = bookingDate === today && (h * 60 + m <= nowMinutes);
      const endTimeStr = addMinutesToTime(t, durationMinutes);
      
      return {
        id: idx + 1,
        timeStart: t,
        timeEnd: endTimeStr,
        isAvailable: !isPast,
      };
    });
  }, [timeSlots, bookingDate, durationMinutes]);

  return (
    <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
      {visibleSlotsMap.map((slot) => {
        const active = value === slot.timeStart;
        return (
          <button
            key={slot.timeStart}
            type="button"
            disabled={!slot.isAvailable}
            onClick={() => onChange(slot.timeStart)}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all duration-200",
              !slot.isAvailable
                ? "border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900 cursor-not-allowed opacity-50"
                : active
                  ? "border-[#00B8D9] bg-[#EAF6FD] dark:bg-slate-900/60 shadow-[0_0_12px_rgba(0,184,217,0.18)]"
                  : "border-border bg-card hover:border-primary/50"
            )}
          >
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Lượt {slot.id}
            </div>
            <div className="mt-1 text-xs font-bold text-foreground tabular-nums">
              {slot.timeStart} - {slot.timeEnd}
            </div>
            <div className="mt-2">
              {slot.isAvailable ? (
                <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                  Còn trống
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-600 dark:text-rose-400">
                  Không khả dụng
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function CustomerBookingForm() {
  const router = useRouter();
  const getErrorMessage = useErrorMessage();
  const searchParams = useSearchParams();
  const queryMode = searchParams.get("mode");
  const queryPackageId = searchParams.get("packageId");
  const queryComboId = searchParams.get("comboId");
  const queryAddonIds = searchParams.get("addonIds");
  const queryServiceIds = searchParams.get("serviceIds");
  const queryType = searchParams.get("type");
  const queryId = searchParams.get("id");

  const hasAutoSelectedVehicleRef = useRef(false);
  const hasAutoSelectedPackageRef = useRef(false);
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
  const customerDiscountsQuery = useCustomerDiscounts();
  const discountMutation = useValidateBookingDiscount();
  const createBookingMutation = useCreateCustomerBooking();
  const publicSettingsQuery = usePublicSettings();
  const { holdSlot, isHolding, holdError } = useSlotHold();
  const setExpiresAt = useBookingStore((state) => state.setExpiresAt);
  const setStoredValidatedDiscount = useBookingStore((state) => state.setValidatedDiscount);
  const resetDraft = useBookingStore((state) => state.resetDraft);
  const setLastCreatedBooking = useBookingStore((state) => state.setLastCreatedBooking);

  const [validatedDiscount, setValidatedDiscount] = useState<DiscountValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(draft.paymentMethod);
  const [showPaymentError, setShowPaymentError] = useState(false);

  useEffect(() => {
    setSelectedPaymentMethod(draft.paymentMethod);
  }, [draft.paymentMethod]);

  const resetValidatedDiscount = () => {
    setValidatedDiscount(null);
    setStoredValidatedDiscount(null);
    discountMutation.reset();
  };

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

  const timeSlots = useMemo(() => {
    const s = publicSettingsQuery.data;
    if (s?.operatingStartTime && s?.operatingEndTime) {
      return generateTimeSlotsFromRange(s.operatingStartTime, s.operatingEndTime);
    }
    return ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
  }, [publicSettingsQuery.data]);

  const activeOwnedCombos = useMemo(
    () =>
      [...activeCustomerCombos]
        .filter((item) => Number(item.remainingUsages) > 0)
        .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)),
    [activeCustomerCombos],
  );
  const preferredOwnedComboId = activeOwnedCombos[0]?.comboId ?? "";
  const activeOwnedComboMap = useMemo(
    () => new Map(activeOwnedCombos.map((item) => [item.comboId, item] as const)),
    [activeOwnedCombos],
  );

  useEffect(() => {
    if (!draft.bookingDate) updateDraft({ bookingDate: getTomorrowDate() });
  }, [draft.bookingDate, updateDraft]);

  useEffect(() => {
    if (vehicles.length === 0) {
      hasAutoSelectedVehicleRef.current = false;
      return;
    }

    const preferredVehicleId =
      vehicles.find((item) => item.isPrimary)?.vehicleId ?? vehicles[0].vehicleId;
    const availableVehicleIds = new Set(vehicles.map((item) => item.vehicleId));
    const hasValidSelectedVehicle =
      draft.vehicleId.length > 0 && availableVehicleIds.has(draft.vehicleId);

    if (hasValidSelectedVehicle) {
      hasAutoSelectedVehicleRef.current = true;
      return;
    }

    if (hasAutoSelectedVehicleRef.current) {
      return;
    }

    hasAutoSelectedVehicleRef.current = true;
    updateDraft({ vehicleId: preferredVehicleId });
  }, [draft.vehicleId, updateDraft, vehicles]);

  useEffect(() => {
    if (draft.mode !== "PACKAGE") {
      hasAutoSelectedPackageRef.current = false;
      return;
    }
    if (draft.packageId) {
      hasAutoSelectedPackageRef.current = true;
      return;
    }
    if (!hasAutoSelectedPackageRef.current && packages.length > 0) {
      hasAutoSelectedPackageRef.current = true;
      updateDraft({ packageId: packages[0].packageId });
    }
  }, [draft.mode, draft.packageId, packages, updateDraft]);

  useEffect(() => {
    if (draft.mode !== "COMBO") {
      hasAutoSelectedComboRef.current = false;
      return;
    }
    if (combos.length === 0) return;
    const fallbackComboId = preferredOwnedComboId || combos[0]?.comboId || "";
    const availableComboIds = new Set(combos.map((item) => item.comboId));
    const hasValidSelectedCombo = draft.comboId.length > 0 && availableComboIds.has(draft.comboId);

    if (hasValidSelectedCombo) {
      hasAutoSelectedComboRef.current = true;
      return;
    }

    if (!draft.comboId && hasAutoSelectedComboRef.current) {
      return;
    }

    if (!hasValidSelectedCombo && fallbackComboId && !hasAutoSelectedComboRef.current) {
      hasAutoSelectedComboRef.current = true;
      updateDraft({ comboId: fallbackComboId });
      return;
    }
    if (!hasAutoSelectedComboRef.current && preferredOwnedComboId && draft.comboId !== preferredOwnedComboId) {
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
      packages
        .map((item) => ({
          value: item.packageId,
          label: item.name,
          description: item.description,
          helper: `${item.duration} min · ${formatBookingCurrency(item.basePrice)}`,
          badge: item.popularity === "BEST_SELLER" ? { label: "Best Seller", tone: "amber" as const } : undefined,
        }))
        .sort((a, b) => (a.badge ? -1 : b.badge ? 1 : 0)),
    [packages],
  );

  const summary = useMemo(
    () =>
      buildBookingSummary(draft, {
        packages,
        addons,
        combos,
        voucher: validatedDiscount,
        ownedComboApplied: Boolean(selectedCustomerCombo),
      }),
    [addons, combos, draft, packages, selectedCustomerCombo, validatedDiscount],
  );

  const errors = useMemo(() => {
    const validationSummary =
      draft.discountCode.trim().length > 0 && !validatedDiscount ? null : summary;
    return validateBookingDraft(draft, validationSummary, { requirePaymentMethod: false });
  }, [draft, summary, validatedDiscount]);

  const selectedPackageAddons =
    draft.mode === "PACKAGE" && draft.packageId
      ? addons.filter((addon) => addon.status === "ACTIVE")
      : [];

  const vehicleOptions = [
    ...vehicles.map((vehicle) => ({
      value: vehicle.vehicleId,
      label: `${vehicle.plate} · ${vehicle.brand} ${vehicle.model}`,
      description: `${vehicle.type}${vehicle.isPrimary ? " · Primary" : ""}`,
    })),
    {
      value: "__add_new__",
      label: "+ Add new vehicle",
      description: "",
    },
  ];

  const validateDiscount = async (codeToValidate?: string) => {
    const code = codeToValidate ?? draft.discountCode;
    const normalizedCode = sanitizeVoucherCodeInput(code);
    const formatError = getVoucherCodeFormatError(normalizedCode);
    if (!normalizedCode || !summary) { resetValidatedDiscount(); return; }
    if (formatError) { resetValidatedDiscount(); return; }
    try {
      const result = await discountMutation.mutateAsync({
        discountCode: normalizedCode,
        packageId: draft.mode === "PACKAGE" ? draft.packageId : undefined,
        amount: summary.subtotal,
      });
      setValidatedDiscount(result);
      setStoredValidatedDiscount(result);
      updateDraft({ discountCode: result.discountCode });
      toast.success(`Voucher ${result.discountCode} applied.`);
    } catch (error) {
      setValidatedDiscount(null);
      setStoredValidatedDiscount(null);
      toast.error(getErrorMessage(error));
    }
  };

  const clearDiscount = () => {
    resetValidatedDiscount();
    updateDraft({ discountCode: "" });
  };

  const handleDiscountCodeChange = (code: string) => {
    resetValidatedDiscount();
    updateDraft({ discountCode: code });
  };

  const handleSubmit = async () => {
    setShowValidation(true);
    if (Object.keys(errors).length > 0) {
      toast.error(Object.values(errors)[0] ?? "Please complete booking information.");
      return;
    }
    setSelectedPaymentMethod(draft.paymentMethod);
    setShowPaymentError(false);
    setShowPaymentDialog(true);
  };

  const handleConfirmPayment = async () => {
    setShowPaymentError(true);
    if (!selectedPaymentMethod) return;

    const nextDraft = { ...draft, paymentMethod: selectedPaymentMethod };
    const nextErrors = validateBookingDraft(nextDraft, summary, { requirePaymentMethod: true });
    if (Object.keys(nextErrors).length > 0) {
      setShowValidation(true);
      toast.error(Object.values(nextErrors)[0] ?? "Please complete booking information.");
      setShowPaymentDialog(false);
      return;
    }

    try {
      updateDraft({ paymentMethod: selectedPaymentMethod });
      await holdSlot({
        bookingDate: draft.bookingDate,
        bookingTime: draft.bookingTime,
      });
      const booking = await createBookingMutation.mutateAsync(nextDraft);
      setLastCreatedBooking(booking);
      resetDraft();
      setExpiresAt(null);
      setShowPaymentDialog(false);
      toast.success("Booking confirmed.");
      router.push(`/customer/bookings/${booking.bookingId}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const completedSteps = useMemo<Record<number, boolean>>(
    () => ({
      1: Boolean(draft.vehicleId),
      2: Boolean(draft.mode),
      3: Boolean(draft.mode === "PACKAGE" ? draft.packageId : draft.comboId),
      4: true,
      5: Boolean(draft.bookingDate && draft.bookingTime),
      6: true,
      7: true,
    }),
    [draft],
  );

  const completedStepsCount = Object.values(completedSteps).filter(Boolean).length;

  const progressPercent = Math.round((completedStepsCount / 7) * 100);

  const updateMode = (mode: BookingDraft["mode"]) => {
    resetValidatedDiscount();
    updateDraft({
      mode,
      packageId: mode === "PACKAGE" ? (packages[0]?.packageId ?? "") : "",
      comboId: mode === "COMBO" ? preferredOwnedComboId || combos[0]?.comboId || "" : "",
      addonIds: [],
      discountCode: "",
    });
  };

  if (isLoadingCatalog) return <BookingPageLoadingState />;

  if (catalogError) {
    return (
      <BookingPageErrorState
        title="Unable to load booking checkout"
        description={getErrorMessage(catalogError)}
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
        description="Add at least one vehicle before creating a booking."
        actionHref="/customer/vehicles/add"
        actionLabel="Add vehicle"
      />
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-x-hidden bg-background px-4 py-6 sm:px-6 lg:px-8">
      {/* Sticky horizontal progress bar */}
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 lg:-mx-8 mb-6 h-1.5 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] bg-border/20 backdrop-blur-md">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-[#00B8D9] transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/8 via-background to-background" />

      <AddVehicleModal
        open={showAddVehicleModal}
        onOpenChange={setShowAddVehicleModal}
        onCreated={(vehicleId) => {
          updateDraft({ vehicleId });
          void vehiclesQuery.refetch();
        }}
      />

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Choose payment method
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select how you want to pay before we reserve this booking slot.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {PAYMENT_OPTIONS.map(({ method, label, description, icon: Icon, badge }) => {
                const active = selectedPaymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setSelectedPaymentMethod(method);
                      setShowPaymentError(false);
                    }}
                    className={cn(
                      "relative flex min-h-40 flex-col gap-3 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      active
                        ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.28)]"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
                    )}
                  >
                    {badge ? (
                      <span className="absolute right-3 top-3 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {badge}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="space-y-1">
                      <span className="block text-sm font-bold text-foreground">{label}</span>
                      <span className="block text-xs leading-relaxed text-muted-foreground">{description}</span>
                    </span>
                    {active ? <CheckCircle2 className="absolute bottom-3 right-3 h-4 w-4 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
            {showPaymentError && !selectedPaymentMethod ? (
              <p className="text-xs font-medium text-rose-600">Please select a payment method.</p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setShowPaymentDialog(false)}
                disabled={isHolding || createBookingMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl px-6 font-bold"
                onClick={() => void handleConfirmPayment()}
                disabled={isHolding || createBookingMutation.isPending}
              >
                {isHolding || createBookingMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="relative mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.6fr_1fr]">

        {/* Steps List */}
        <div className="space-y-6">

          {/* Step 1 — Vehicle */}
          <StepCard step={1} title="Your vehicle">
            <CustomerBookingSelect
              options={vehicleOptions}
              value={draft.vehicleId}
              onValueChange={(value) => {
                if (value === "__add_new__") {
                  setShowAddVehicleModal(true);
                } else {
                  updateDraft({ vehicleId: draft.vehicleId === value ? "" : value });
                }
              }}
              placeholder="Select a vehicle"
              searchPlaceholder="Search by plate, brand or model..."
              emptyText="No vehicles found."
              renderValue={(option) =>
                option ? (
                  <span className="block">
                    <span className="block truncate font-semibold">{option.label}</span>
                    <span className="block truncate text-xs text-muted-foreground mt-0.5">{option.description}</span>
                  </span>
                ) : "Select a vehicle"
              }
            />
            <FieldError message={showValidation ? errors.vehicleId : null} />
          </StepCard>

          {/* Step 2 — Booking type */}
          <StepCard step={2} title="Service type">
            <div className="grid gap-2 md:grid-cols-2">
              {(["PACKAGE", "COMBO"] as const).map((mode) => {
                const active = draft.mode === mode;
                const disabled = mode === "COMBO" && combos.length === 0;
                return (
                  <button
                    key={mode}
                    type="button"
                    className={optionCardClass(active, disabled)}
                    disabled={disabled}
                    onClick={() => {
                      if (active) {
                        resetValidatedDiscount();
                        updateDraft({ mode, packageId: "", comboId: "", addonIds: [], discountCode: "" });
                        return;
                      }
                      updateMode(mode);
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-foreground">{getModeLabel(mode)}</span>
                      <SelectionMark active={active} />
                    </div>
                  </button>
                );
              })}
            </div>
          </StepCard>

          {/* Step 3 — Package / Combo */}
          <StepCard step={3} title={draft.mode === "PACKAGE" ? "Select package" : "Select combo"}>
            {draft.mode === "PACKAGE" ? (
              <CustomerBookingSelect
                options={packageOptions}
                value={draft.packageId}
                onValueChange={(packageId) => {
                  resetValidatedDiscount();
                  updateDraft({
                    packageId: draft.packageId === packageId ? "" : packageId,
                    addonIds: [],
                    discountCode: "",
                  });
                }}
                placeholder="Select a package"
                searchPlaceholder="Search package..."
                emptyText="No packages found."
                renderValue={(option) =>
                  option ? (
                    <span className="block">
                      <span className="block truncate font-semibold">{option.label}</span>
                      <span className="block truncate text-xs text-muted-foreground mt-0.5">{option.helper}</span>
                    </span>
                  ) : "Select a package"
                }
              />
            ) : (
              <div className="grid gap-2">
                {combos.map((item) => {
                  const active = draft.comboId === item.comboId;
                  const ownedCombo = activeOwnedComboMap.get(item.comboId);
                  return (
                    <button
                      key={item.comboId}
                      type="button"
                      className={optionCardClass(active)}
                      onClick={() => {
                        resetValidatedDiscount();
                        updateDraft({
                          comboId: active ? "" : item.comboId,
                          discountCode: "",
                        });
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-bold">{item.name}</div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <OptionPill>{item.durationDays} days</OptionPill>
                            <OptionPill>Max {item.maxServices} services</OptionPill>
                            <OptionPill>{formatBookingCurrency(item.basePrice)}</OptionPill>
                          </div>
                          {ownedCombo && (
                            <span className="mt-1.5 inline-flex items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              Owned · {ownedCombo.remainingUsages} left · expires {new Date(ownedCombo.expiresAt).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                        </div>
                        <SelectionMark active={active} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <FieldError message={showValidation ? (draft.mode === "PACKAGE" ? errors.packageId : errors.comboId) : null} />
          </StepCard>

          {/* Step 4 — Add-ons */}
          <StepCard step={4} title="Add-ons">
            {draft.mode === "COMBO" ? (
              selectedCustomerCombo ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <span className="font-semibold">Owned combo active</span> — {selectedCustomerCombo.remainingUsages} uses left, expires {new Date(selectedCustomerCombo.expiresAt).toLocaleDateString("en-GB")}.
                </div>
              ) : (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
                  <span className="font-semibold">No owned combo</span> — booking will purchase the selected combo.
                </div>
              )
            ) : (
              <CustomerBookingMultiSelect
                options={selectedPackageAddons.map((a) => ({
                  value: a.addonId,
                  label: a.name,
                  helper: `${a.duration} min · ${formatBookingCurrency(a.price)}`,
                }))}
                value={draft.addonIds}
                onValueChange={(ids) => {
                  resetValidatedDiscount();
                  updateDraft({ addonIds: ids, discountCode: "" });
                }}
                placeholder="Select add-ons (optional)"
                searchPlaceholder="Search add-ons..."
                emptyText="No add-ons available."
              />
            )}
          </StepCard>

          {/* Step 5 — Schedule */}
          <StepCard step={5} title="Schedule">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Select a day
                </label>
                <DatePickerButton
                  value={draft.bookingDate}
                  min={getTomorrowDate()}
                  onChange={(bookingDate) => updateDraft({ bookingDate })}
                  label="Select a day"
                  buttonClassName="h-11 w-full justify-start rounded-xl border-input bg-background text-sm"
                />
                <FieldError message={showValidation ? errors.bookingDate : null} />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Khung giờ khả dụng (Lượt)
                </label>
                <TimeSlotGrid
                  timeSlots={timeSlots}
                  value={draft.bookingTime}
                  onChange={(time) => updateDraft({ bookingTime: time })}
                  bookingDate={draft.bookingDate}
                  durationMinutes={(() => {
                    if (!summary) return 45;
                    const match = summary.estimatedDurationLabel.match(/^(\d+)\s*min/);
                    return match ? Number(match[1]) : 45;
                  })()}
                />
                <FieldError message={showValidation ? errors.bookingTime : null} />
              </div>
            </div>
          </StepCard>

          {/* Step 6 — Confirmation email */}
          <StepCard step={6} title="Confirmation email (optional)">
            <div className="space-y-2">
              <Label htmlFor="booking-confirmation-email" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Gmail / Email nhận xác nhận (không bắt buộc)
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="booking-confirmation-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="example@gmail.com"
                  value={draft.confirmationEmail ?? ""}
                  onChange={(event) => updateDraft({ confirmationEmail: event.target.value })}
                  className="h-12 rounded-xl pl-10"
                />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Nếu để trống, email xác nhận booking sẽ gửi về email tài khoản đăng ký.
              </p>
              <FieldError message={showValidation ? errors.confirmationEmail : null} />
            </div>
          </StepCard>

          {/* Step 7 — Voucher */}
          <StepCard step={7} title="Voucher">
            <DiscountSection
              draft={draft}
              summary={summary}
              validatedDiscount={validatedDiscount}
              discountMutation={discountMutation}
              customerDiscounts={customerDiscountsQuery.data?.items.filter((item) => Boolean(item.discount.code)).map((item) => ({ code: item.discount.code ?? "", name: item.discount.name, discountType: item.discount.discountType, discountValue: item.discount.discountValue })) ?? []}
              onApply={(code) => void validateDiscount(code)}
              onClear={clearDiscount}
              onCodeChange={handleDiscountCodeChange}
            />
          </StepCard>

          <div className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <BookingButton
              onClick={() => void handleSubmit()}
              isLoading={isHolding || createBookingMutation.isPending}
              errors={errors}
              showValidation={showValidation}
              summary={summary}
            />
          </div>
        </div>

        {/* Sidebar summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary ? (
                <>
                  <SummaryItem label="Type" value={getModeLabel(summary.itemType)} />
                  <SummaryItem label="Item" value={summary.itemName} />
                  <SummaryItem label="Vehicle" value={vehicles.find((v) => v.vehicleId === draft.vehicleId)?.plate ?? "--"} />
                  <SummaryItem label="Schedule" value={draft.bookingDate && draft.bookingTime ? `${draft.bookingDate} ${draft.bookingTime}` : "--"} />
                  <SummaryItem label="Duration" value={summary.estimatedDurationLabel} />
                  <SummaryItem label="Base" value={formatBookingCurrency(summary.baseAmount)} />
                  <SummaryItem label="Add-ons" value={formatBookingCurrency(summary.addonsTotal)} />
                  <SummaryItem label="Subtotal" value={formatBookingCurrency(summary.subtotal)} />
                  {summary.discountAmount > 0 && (
                    <SummaryItem label="Discount" value={`-${formatBookingCurrency(summary.discountAmount)}`} />
                  )}
                  {draft.mode === "COMBO" && (
                    <SummaryItem label="Owned combo" value={selectedCustomerCombo ? `${selectedCustomerCombo.remainingUsages} usages left` : "Will be purchased"} />
                  )}
                  <div className="border-t border-border pt-3">
                    <SummaryItem label="Total" value={formatBookingCurrency(summary.finalAmount)} emphasize />
                  </div>

                  <BookingButton
                    onClick={() => void handleSubmit()}
                    isLoading={isHolding || createBookingMutation.isPending}
                    errors={errors}
                    showValidation={showValidation}
                    summary={summary}
                  />

                  <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                    <div className="flex items-center gap-2 font-bold">
                      <Phone className="h-4 w-4" />
                      Liên hệ hỗ trợ: 1900 5566
                    </div>
                    
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center">
                  <p className="text-xs text-muted-foreground">Complete the steps to see a summary.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Chatbot support bubble */}
      <div className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-white shadow-xl">
        <MessageSquare className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">1</span>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={`step-${step}`} className="scroll-mt-24">
      <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 overflow-visible transition-all duration-300">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
              {step}
            </span>
            <CardTitle className="text-sm font-bold text-foreground">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-4 pt-1 overflow-visible">{children}</CardContent>
      </Card>
    </div>
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
    <div className="flex items-start justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right ${emphasize ? "text-base font-bold text-foreground" : "font-medium text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}

function FieldError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return <p className="text-xs text-rose-600">{message}</p>;
}

function BookingPageLoadingState() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
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
      <Card className="mx-auto max-w-3xl">
        <CardHeader className="pb-3">
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {onRetry && (
            <Button type="button" variant="outline" onClick={onRetry}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
          {actionHref && actionLabel && (
            <Button asChild>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BookingButton({
  onClick,
  isLoading,
  errors,
  showValidation,
}: {
  onClick: () => void;
  isLoading: boolean;
  errors: Record<string, string | undefined>;
  showValidation: boolean;
  summary: ReturnType<typeof buildBookingSummary> | null;
}) {
  const isDisabled = isLoading;

  const firstErrorKey = Object.keys(errors)[0];
  const errorHintMap: Record<string, string> = {
    vehicleId: "Please select a vehicle",
    packageId: "Please select a service package",
    comboId: "Please select a combo",
    bookingDate: "Please select a date",
    bookingTime: "Please select a time",
    confirmationEmail: "Please enter a valid confirmation email",
    paymentMethod: "Please select a payment method",
  };
  const hintText = firstErrorKey ? errorHintMap[firstErrorKey] : null;

  return (
    <div className="space-y-2 pt-1">
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        className={cn(
          "h-11 w-full rounded-xl bg-cyan-500 text-sm font-bold !text-white shadow-sm shadow-cyan-500/20 transition-all hover:bg-cyan-600 hover:!text-white hover:shadow-md disabled:pointer-events-none disabled:opacity-60",
        )}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </span>
        ) : (
          "Confirm Booking"
        )}
      </Button>
      {showValidation && hintText && !isLoading && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-rose-600">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
          {hintText}
        </p>
      )}
    </div>
  );
}
