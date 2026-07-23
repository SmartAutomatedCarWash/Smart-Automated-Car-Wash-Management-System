"use client";

import {
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/ui/select";
import { cn } from "@/shared/lib/utils";
import {
  CUSTOMER_VEHICLE_TYPES,
  type CustomerVehicleFormErrors,
  type CustomerVehicleFormValues,
} from "@/entities/vehicles";
import { VEHICLE_COLOR_OPTIONS, getVehicleColorOption } from "@/features/vehicles/lib/vehicle-colors";

const CAR_BRANDS_MAP: Record<string, string[]> = {
  Toyota:      ["Camry", "Corolla", "Vios", "Fortuner", "Innova", "Hilux", "Rush", "Raize", "Yaris", "Land Cruiser", "Other"],
  Honda:       ["City", "Civic", "CR-V", "HR-V", "Accord", "Jazz", "BR-V", "Pilot", "Odyssey", "Other"],
  Hyundai:     ["Accent", "Elantra", "Tucson", "Santa Fe", "i10", "Creta", "Ioniq", "Kona", "Grand i10", "Other"],
  Kia:         ["Morning", "Seltos", "Sportage", "Sorento", "K3", "K5", "Carnival", "Cerato", "Other"],
  Mazda:       ["2", "3", "6", "CX-3", "CX-5", "CX-8", "CX-30", "BT-50", "MX-5", "Other"],
  Ford:        ["Ranger", "Everest", "Territory", "Explorer", "Escape", "Focus", "Mondeo", "Other"],
  Mitsubishi:  ["Xpander", "Outlander", "Pajero Sport", "Triton", "Eclipse Cross", "Attrage", "Other"],
  Suzuki:      ["Swift", "Ertiga", "XL7", "Vitara", "Ciaz", "Jimny", "Alto", "Other"],
  Nissan:      ["Almera", "Terra", "X-Trail", "Navara", "Sunny", "Kicks", "Other"],
  VinFast:     ["Fadil", "Lux A2.0", "Lux SA2.0", "VF3", "VF5", "VF6", "VF7", "VF8", "VF9", "VF e34", "Other"],
  Mercedes:    ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "A-Class", "CLA", "GLA", "GLB", "Other"],
  BMW:         ["3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7", "2 Series", "Other"],
  Audi:        ["A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron", "Other"],
  Chevrolet:   ["Trailblazer", "Colorado", "Trax", "Spark", "Captiva", "Other"],
  Peugeot:     ["2008", "3008", "5008", "408", "508", "Other"],
  Other:       ["Other model"],
};

const BRAND_OPTIONS = Object.keys(CAR_BRANDS_MAP).map((brand) => ({
  value: brand,
  label: brand === "Other" ? "Other brand" : brand,
}));
const VEHICLE_TYPE_OPTIONS: Record<(typeof CUSTOMER_VEHICLE_TYPES)[number], string> = {
  CAR: "Car",
  SUV: "SUV",
  TRUCK: "Truck",
  MOTORBIKE: "Motorbike",
  VAN: "Van",
};
const COLOR_OPTIONS = VEHICLE_COLOR_OPTIONS.map(({ value, label }) => ({ value, label }));

function getModelOptions(brand: string) {
  return (CAR_BRANDS_MAP[brand] ?? ["Other model"]).map((model) => ({
    value: model,
    label: model === "Other model" ? "Not listed" : model,
  }));
}

export function CustomerVehicleFormCard({
  title,
  description,
  form,
  errors,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
  disableIdentityFields = false,
  extraActions,
}: {
  title: string;
  description: string;
  form: CustomerVehicleFormValues;
  errors: CustomerVehicleFormErrors;
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (field: keyof CustomerVehicleFormValues, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  disableIdentityFields?: boolean;
  extraActions?: React.ReactNode;
}) {
  return (
    <Card className="border-teal-100 bg-white shadow-[0_18px_44px_rgba(15,118,110,0.08)]">
      <CardHeader className="border-b border-slate-200/70 bg-slate-50/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Customer vehicles
            </div>
            <CardTitle className="text-xl font-black text-slate-900">{title}</CardTitle>
            <CardDescription className="max-w-2xl">{description}</CardDescription>
          </div>
          {extraActions}
        </div>
      </CardHeader>
      <CardContent className="space-y-8 p-6">
        <div className="mx-auto max-w-2xl space-y-5">
          <VehicleTextField
            label="License plate"
            value={form.plate}
            onChange={(value) => onChange("plate", value.toUpperCase())}
            placeholder="30H-123456"
            error={errors.plate ?? null}
            disabled={disableIdentityFields}
          />
          <VehicleSelectField
            label="Vehicle type"
            value={form.type}
            onChange={(value) => onChange("type", value)}
            placeholder="Select a vehicle type"
            options={CUSTOMER_VEHICLE_TYPES.map((type) => ({
              value: type,
              label: VEHICLE_TYPE_OPTIONS[type],
            }))}
            error={errors.type ?? null}
            disabled={disableIdentityFields}
          />
          <VehicleSelectField
            label="Brand"
            value={form.brand}
            onChange={(value) => {
              onChange("brand", value);
              // Reset model when brand changes
              if (form.model) onChange("model", "");
            }}
            placeholder="Select a brand"
            options={BRAND_OPTIONS}
            error={errors.brand ?? null}
          />
          <VehicleSelectField
            label="Model"
            value={form.model}
            onChange={(value) => onChange("model", value)}
            placeholder={form.brand ? "Select a model" : "Select brand first"}
            options={form.brand ? getModelOptions(form.brand) : []}
            error={errors.model ?? null}
            disabled={!form.brand}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <VehicleTextField
              label="Year"
              value={form.year}
              onChange={(value) => onChange("year", value.replace(/\D/g, "").slice(0, 4))}
              placeholder="e.g. 2024"
              error={errors.year ?? null}
              inputMode="numeric"
            />
            <VehicleSelectField
              label="Color"
              value={form.color}
              onChange={(value) => onChange("color", value)}
              placeholder="Select color"
              options={COLOR_OPTIONS}
              error={errors.color ?? null}
              description="Optional."
            />
          </div>

          {disableIdentityFields ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mt-4">
              Plate and vehicle type are locked after creation to keep service history, invoices,
              and booking records consistent.
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" className="rounded-xl" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-lg bg-teal-600 px-5 text-white hover:bg-teal-700"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {submitLabel}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function VehicleTextField({
  label,
  value,
  onChange,
  placeholder,
  error,
  description,
  disabled = false,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error: string | null;
  description?: string;
  disabled?: boolean;
  inputMode?: "text" | "email" | "numeric" | "tel" | "search" | "url" | "none" | "decimal";
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        className="h-12 rounded-lg border-slate-200 bg-white px-4 text-sm text-slate-900 focus-visible:ring-teal-200"
      />
      {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

function VehicleSelectField({
  label,
  value,
  onChange,
  placeholder,
  error,
  description,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error: string | null;
  description?: string;
  options: Array<{ value: string; label: string }> | string[];
  disabled?: boolean;
}) {
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={cn("h-12 rounded-lg border-slate-200 bg-white px-4 text-sm text-slate-900 focus-visible:ring-teal-200", !value && "text-slate-500")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {normalizedOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {isVehicleColorOption(option.value) ? (
                <span className="flex items-center gap-2">
                  <ColorSwatch value={option.value} />
                  <span>{option.label}</span>
                </span>
              ) : (
                option.label
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

function isVehicleColorOption(value: string) {
  return VEHICLE_COLOR_OPTIONS.some((option) => option.value === value);
}

function ColorSwatch({ value }: { value: string }) {
  const color = getVehicleColorOption(value);

  return (
    <span
      className="h-3 w-3 rounded-full border"
      style={{ backgroundColor: color.hex, borderColor: color.border ?? color.hex }}
      aria-hidden="true"
    />
  );
}
