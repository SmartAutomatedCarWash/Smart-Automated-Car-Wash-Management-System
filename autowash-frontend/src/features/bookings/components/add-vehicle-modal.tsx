import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { useCreateCustomerVehicle } from "@/features/vehicles/hooks/use-customer-vehicles";
import {
  CUSTOMER_VEHICLE_TYPES,
  type CustomerVehicleFormValues,
  type CustomerVehicleFormErrors,
} from "@/entities/vehicles";
import {
  validateCustomerVehicleForm,
  buildCreateCustomerVehicleRequest,
} from "@/features/vehicles/lib/vehicle-form";
import { cn } from "@/shared/lib/utils";

const selectCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

const YEAR_LIST = Array.from({ length: new Date().getFullYear() - 1989 }, (_, i) =>
  String(new Date().getFullYear() - i),
);

export default function AddVehicleModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (vehicleId: string) => void;
}) {
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
      toast.error(getDisplayErrorMessage(err));
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
            <select value={form.type} onChange={(e) => set("type", e.target.value)} className={cn(selectCls, "text-slate-900 dark:text-slate-100")}>
              <option value="" disabled className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Select type</option>
              {CUSTOMER_VEHICLE_TYPES.map((t) => (
                <option key={t} value={t} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">{t}</option>
              ))}
            </select>
          </div>

          {/* Brand + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-semibold">Brand *</Label>
              <select value={form.brand} onChange={(e) => set("brand", e.target.value)} className={cn(selectCls, "text-slate-900 dark:text-slate-100")}>
                <option value="" disabled className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Select brand</option>
                {BRAND_LIST.map((b) => (
                  <option key={b} value={b} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">{b}</option>
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
                className={cn(selectCls, "text-slate-900 dark:text-slate-100", "disabled:opacity-50 disabled:cursor-not-allowed")}
              >
                <option value="" disabled className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">{form.brand ? "Select model" : "Select brand first"}</option>
                {modelList.map((m) => (
                  <option key={m} value={m} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">{m}</option>
                ))}
              </select>
              {errors.model && <p className="mt-1 text-xs text-rose-600">{errors.model}</p>}
            </div>
          </div>

          {/* Year + Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-semibold">Year *</Label>
              <select value={form.year} onChange={(e) => set("year", e.target.value)} className={cn(selectCls, "text-slate-900 dark:text-slate-100")}>
                <option value="" disabled className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Select year</option>
                {YEAR_LIST.map((y) => (
                  <option key={y} value={y} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">{y}</option>
                ))}
              </select>
              {errors.year && <p className="mt-1 text-xs text-rose-600">{errors.year}</p>}
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold">Color</Label>
              <select value={form.color} onChange={(e) => set("color", e.target.value)} className={cn(selectCls, "text-slate-900 dark:text-slate-100")}>
                <option value="" disabled className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Select color</option>
                {VEHICLE_COLORS.map((c) => (
                  <option key={c} value={c} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">{c}</option>
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
