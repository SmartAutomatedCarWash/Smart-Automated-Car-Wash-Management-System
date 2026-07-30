"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CarFront,
  Eye,
  Loader2,
  Palette,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";
import { Input } from "@/shared/ui/ui/input";
import { getApiErrorCode, getFieldErrorMessage } from "@/shared/lib/api-errors";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import {
  EMPTY_CUSTOMER_VEHICLE_FORM,
  buildCreateCustomerVehicleRequest,
  buildUpdateCustomerVehicleRequest,
  buildVehicleFormDefaults,
  validateCustomerVehicleForm,
} from "@/features/vehicles/lib/vehicle-form";
import {
  getVehicleDisplayColor,
  getVehicleDisplayField,
  getVehicleDisplayName,
} from "@/features/vehicles/lib/vehicle-display";
import { getVehicleToastErrorMessage, VEHICLE_TOAST_OPTIONS } from "@/features/vehicles/lib/vehicle-toast";
import {
  useCreateCustomerVehicle,
  useCustomerVehicleDetail,
  useCustomerVehicles,
  useDeleteCustomerVehicle,
  useSetPrimaryCustomerVehicle,
  useUpdateCustomerVehicle,
} from "@/features/vehicles/hooks/use-customer-vehicles";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type {
  CustomerVehicleDetail,
  CustomerVehicleFormErrors,
  CustomerVehicleFormValues,
  CustomerVehicleListItem,
} from "@/entities/vehicles";
import { CustomerVehicleFormCard } from "@/features/vehicles/components/vehicle-form";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { getVehicleColorOption } from "@/features/vehicles/lib/vehicle-colors";

export function CustomerVehiclesListClientPage() {
  const { language } = useLanguageStore();
  const getErrorMessage = useErrorMessage();
  const router = useRouter();
  const vehiclesQuery = useCustomerVehicles();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"RECENT" | "PRIMARY" | "PLATE">("RECENT");

  if (vehiclesQuery.isPending) {
    return <VehiclePageLoadingState />;
  }

  if (vehiclesQuery.isError) {
    return (
      <VehiclePageErrorState
        title={translate(language, "Khong the tai danh sach xe", "Unable to load vehicles")}
        description={getErrorMessage(vehiclesQuery.error)}
        onRetry={() => vehiclesQuery.refetch()}
        language={language}
      />
    );
  }

  const vehicles = vehiclesQuery.data?.items ?? [];
  const filteredVehicles = vehicles
    .filter((vehicle) => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [vehicle.plate, vehicle.brand, vehicle.model, vehicle.color ?? "", vehicle.type]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => {
      if (sortMode === "PRIMARY") {
        return Number(b.isPrimary) - Number(a.isPrimary);
      }
      if (sortMode === "PLATE") {
        return a.plate.localeCompare(b.plate);
      }
      return 0;
    });
  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[#f7fbff] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-64 w-1/2 bg-[linear-gradient(120deg,rgba(219,234,254,0.78),rgba(255,255,255,0))]" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-600">
                {translate(language, "Xe cua khach hang", "Customer vehicles")}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {translate(language, "Tat ca xe", "All vehicles")}
                </h1>
                <div className="inline-flex h-9 items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 text-sm font-black text-slate-800">
                  <CarFront className="h-4 w-4 text-sky-600" />
                  <span>{vehicles.length}</span>
                  <span className="font-bold text-slate-500">{translate(language, "xe", "vehicles")}</span>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
              {vehicles.length > 0 ? (
                <div className="relative w-full sm:w-[360px]">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={translate(language, "Tim xe...", "Search vehicles...")}
                    className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 shadow-none focus-visible:bg-white"
                  />
                </div>
              ) : null}
              <Button className="h-11 shrink-0 rounded-xl bg-[#06275f] px-5 text-white shadow-sm hover:bg-[#041d48]" onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {translate(language, "Them xe", "Add vehicle")}
              </Button>
            </div>
          </div>
        </section>

        {vehicles.length === 0 ? (
          <VehicleEmptyState language={language} onAddClick={() => setShowCreateDialog(true)} />
        ) : (
          <>
            <section className="grid gap-4">
              {filteredVehicles.map((vehicle) => (
            <VehicleListCard
              key={vehicle.vehicleId}
              vehicle={vehicle}
              isDeleting={deleteId === vehicle.vehicleId}
              onDeleteChange={setDeleteId}
              language={language}
            />
              ))}
              {filteredVehicles.length === 0 ? (
                <Card className="border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
                  {translate(language, "Khong tim thay xe phu hop.", "No vehicles match your search.")}
                </Card>
              ) : null}
            </section>
          </>
        )}
      </div>

      <VehicleCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={(vehicleId) => {
          setShowCreateDialog(false);
          router.push(`/customer/vehicles/${vehicleId}`);
        }}
      />
    </div>
  );
}

export function CustomerVehicleCreateClientPage() {
  const { language } = useLanguageStore();
  const getErrorMessage = useErrorMessage();
  const router = useRouter();
  const createVehicleMutation = useCreateCustomerVehicle();
  const [form, setForm] = useState<CustomerVehicleFormValues>(EMPTY_CUSTOMER_VEHICLE_FORM);
  const [showValidation, setShowValidation] = useState(false);

  const clientErrors = useMemo(() => validateCustomerVehicleForm(form, "create"), [form]);
  const submitErrors = getSubmitErrors(createVehicleMutation.error, clientErrors, showValidation);

  const handleSubmit = async () => {
    setShowValidation(true);

    if (Object.keys(clientErrors).length > 0) {
      return;
    }

    try {
      const createdVehicle = await createVehicleMutation.mutateAsync(buildCreateCustomerVehicleRequest(form));
      toast.success(translate(language, "Xe da duoc tao thanh cong.", "Vehicle created successfully."), VEHICLE_TOAST_OPTIONS);
      router.push(`/customer/vehicles/${createdVehicle.vehicleId}`);
    } catch (error) {
      toast.error(
        getVehicleToastErrorMessage(
          error,
          translate(language, "Khong the tao xe.", "Unable to create vehicle."),
          getErrorMessage,
        ),
        VEHICLE_TOAST_OPTIONS,
      );
    }
  };

  return (
    <VehicleFormPageShell
      backHref="/customer/vehicles"
      backLabel={translate(language, "Quay lai danh sach xe", "Back to vehicles")}
      notice={
        createVehicleMutation.isError
          ? getErrorMessage(createVehicleMutation.error)
          : translate(language, "Them xe moi cua ban.", "Create a vehicle using the live customer vehicle contract.")
      }
    >
      <CustomerVehicleFormCard
        title={translate(language, "Them xe moi", "Add a new vehicle")}
        description={translate(language, "Dien thong tin xe de luu vao tai khoan cua ban.", "The UI stays close to the prototype, but all values now go through the real backend contract.")}
        form={form}
        errors={submitErrors}
        submitLabel={translate(language, "Tao xe", "Create vehicle")}
        isSubmitting={createVehicleMutation.isPending}
        onChange={(field, value) => {
          setForm((current) => ({ ...current, [field]: value }));
          if (createVehicleMutation.isError) {
            createVehicleMutation.reset();
          }
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/customer/vehicles")}
      />
    </VehicleFormPageShell>
  );
}

export function CustomerVehicleDetailClientPage({ vehicleId }: { vehicleId: string }) {
  const { language } = useLanguageStore();
  const getErrorMessage = useErrorMessage();
  const router = useRouter();
  const vehicleQuery = useCustomerVehicleDetail(vehicleId);
  const updateMutation = useUpdateCustomerVehicle(vehicleId);
  const setPrimaryMutation = useSetPrimaryCustomerVehicle(vehicleId);
  const [form, setForm] = useState<CustomerVehicleFormValues>(EMPTY_CUSTOMER_VEHICLE_FORM);
  const [showValidation, setShowValidation] = useState(false);
  const locale = language === "vi" ? "vi-VN" : "en-US";

  useEffect(() => {
    if (!vehicleQuery.data) {
      return;
    }

    setForm(buildVehicleFormDefaults(vehicleQuery.data));
    setShowValidation(false);
    updateMutation.reset();
  }, [vehicleQuery.data?.vehicleId]);

  const clientErrors = useMemo(() => validateCustomerVehicleForm(form, "update"), [form]);

  if (vehicleQuery.isPending) {
    return <VehiclePageLoadingState />;
  }

  if (vehicleQuery.isError) {
    return (
      <VehiclePageErrorState
        title={translate(language, "Khong the tai xe", "Unable to load vehicle")}
        description={getErrorMessage(vehicleQuery.error)}
        onRetry={() => vehicleQuery.refetch()}
        language={language}
      />
    );
  }

  if (!vehicleQuery.data) {
    return (
      <VehiclePageErrorState
        title={translate(language, "Khong tim thay xe", "Vehicle not found")}
        description={translate(language, "Khong co du lieu xe nao duoc tra ve cho ma nay.", "The contract returned no vehicle payload for this identifier.")}
        onRetry={() => router.push("/customer/vehicles")}
        language={language}
      />
    );
  }

  const vehicle = vehicleQuery.data;
  const submitErrors = getSubmitErrors(updateMutation.error, clientErrors, showValidation);
  const previewVehicle: CustomerVehicleDetail = {
    ...vehicle,
    brand: form.brand || vehicle.brand,
    model: form.model || vehicle.model,
    year: Number(form.year) || vehicle.year,
    color: form.color || null,
  };
  const hasChanges =
    form.brand !== vehicle.brand ||
    form.model !== vehicle.model ||
    form.year !== String(vehicle.year) ||
    form.color !== (vehicle.color ?? "");

  const handleSave = async () => {
    setShowValidation(true);

    if (Object.keys(clientErrors).length > 0) {
      return;
    }

    if (!hasChanges) {
      return;
    }

    const confirmation = await Swal.fire({
      title: "Are you sure you want to change the car's information?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: translate(language, "Xac nhan", "Confirm"),
      cancelButtonText: translate(language, "Huy", "Cancel"),
      buttonsStyling: false,
      customClass: {
        popup: "swal-notify-popup",
        title: "swal-notify-title",
        htmlContainer: "swal-notify-message",
        confirmButton: "swal-notify-btn-warning",
        cancelButton: "swal-notify-btn-info",
      },
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      await updateMutation.mutateAsync(buildUpdateCustomerVehicleRequest(form));
      await Swal.fire({
        icon: "success",
        title: translate(language, "Cap nhat thanh cong!", "Vehicle updated successfully!"),
        text: translate(language, "Thong tin xe da duoc luu.", "The vehicle information has been saved."),
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          popup: "swal-notify-popup",
          title: "swal-notify-title",
          htmlContainer: "swal-notify-message",
          confirmButton: "swal-notify-btn-success",
        },
      });
      router.push("/customer/vehicles");
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: translate(language, "Khong the cap nhat xe.", "Unable to update vehicle."),
        text: getVehicleToastErrorMessage(
          error,
          translate(language, "Khong the cap nhat xe.", "Unable to update vehicle."),
          getErrorMessage,
        ),
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          popup: "swal-notify-popup",
          title: "swal-notify-title",
          htmlContainer: "swal-notify-message",
          confirmButton: "swal-notify-btn-error",
        },
      });
    }
  };

  const handleSetPrimary = async () => {
    try {
      await setPrimaryMutation.mutateAsync();
      toast.success(translate(language, "Xe chinh da duoc cap nhat.", "Primary vehicle updated."), VEHICLE_TOAST_OPTIONS);
    } catch (error) {
      toast.error(
        getVehicleToastErrorMessage(
          error,
          translate(language, "Khong the dat xe chinh.", "Unable to set primary vehicle."),
          getErrorMessage,
        ),
        VEHICLE_TOAST_OPTIONS,
      );
    }
  };

  return (
    <VehicleFormPageShell
      backHref="/customer/vehicles"
      backLabel={translate(language, "Quay lai danh sach xe", "Back to vehicles")}
    >
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <CustomerVehicleFormCard
          title={translate(language, "Thong tin xe", "Vehicle information")}
          description={translate(language, "Cap nhat thong tin xe dang luu trong ho so cua ban.", "Update the vehicle details saved in your profile.")}
          form={form}
          errors={submitErrors}
          submitLabel={translate(language, "Luu thay doi", "Save changes")}
          isSubmitting={updateMutation.isPending}
          disableIdentityFields
          onChange={(field, value) => {
            setForm((current) => ({ ...current, [field]: value }));
            if (updateMutation.isError) {
              updateMutation.reset();
            }
          }}
          onSubmit={handleSave}
          onCancel={() => router.push("/customer/vehicles")}
          extraActions={
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {vehicle.status}
              </span>
              {vehicle.isPrimary ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  <Star className="mr-1 h-3.5 w-3.5" />
                  {translate(language, "Xe uu tien", "Primary vehicle")}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                <Save className="h-3.5 w-3.5" />
                {hasChanges
                  ? translate(language, "Co thay doi chua luu", "Unsaved changes")
                  : translate(language, "Da dong bo", "Up to date")}
              </span>
            </div>
          }
        />

        <div className="space-y-5">
          <VehiclePreviewCard vehicle={previewVehicle} language={language} locale={locale} />
          <VehicleQuickActionsCard
            vehicle={vehicle}
            language={language}
            onSetPrimary={handleSetPrimary}
            isSettingPrimary={setPrimaryMutation.isPending}
          />
        </div>
      </section>
    </VehicleFormPageShell>
  );
}

function VehicleCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (vehicleId: string) => void;
}) {
  const { language } = useLanguageStore();
  const getErrorMessage = useErrorMessage();
  const createVehicleMutation = useCreateCustomerVehicle();
  const [form, setForm] = useState<CustomerVehicleFormValues>(EMPTY_CUSTOMER_VEHICLE_FORM);
  const [showValidation, setShowValidation] = useState(false);
  const clientErrors = useMemo(() => validateCustomerVehicleForm(form, "create"), [form]);
  const submitErrors = getSubmitErrors(createVehicleMutation.error, clientErrors, showValidation);

  const handleSubmit = async () => {
    setShowValidation(true);

    if (Object.keys(clientErrors).length > 0) {
      return;
    }

    try {
      const createdVehicle = await createVehicleMutation.mutateAsync(buildCreateCustomerVehicleRequest(form));
      toast.success(translate(language, "Xe da duoc tao thanh cong.", "Vehicle created successfully."), VEHICLE_TOAST_OPTIONS);
      setForm(EMPTY_CUSTOMER_VEHICLE_FORM);
      setShowValidation(false);
      onCreated(createdVehicle.vehicleId);
    } catch (error) {
      toast.error(
        getVehicleToastErrorMessage(
          error,
          translate(language, "Khong the tao xe.", "Unable to create vehicle."),
          getErrorMessage,
        ),
        VEHICLE_TOAST_OPTIONS,
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          createVehicleMutation.reset();
          setShowValidation(false);
        }
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-2xl p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{translate(language, "Them xe moi", "Add a new vehicle")}</DialogTitle>
        </DialogHeader>
        <CustomerVehicleFormCard
          title={translate(language, "Them xe moi", "Add a new vehicle")}
          description={translate(language, "Nhap thong tin xe, sau khi luu he thong se mo trang chi tiet xe vua tao.", "Enter the vehicle details. After saving, the vehicle detail page will open.")}
          form={form}
          errors={submitErrors}
          submitLabel={translate(language, "Tao xe", "Create vehicle")}
          isSubmitting={createVehicleMutation.isPending}
          onChange={(field, value) => {
            setForm((current) => ({ ...current, [field]: value }));
            if (createVehicleMutation.isError) {
              createVehicleMutation.reset();
            }
          }}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function VehiclePreviewCard({
  vehicle,
  language,
  locale,
}: {
  vehicle: CustomerVehicleDetail;
  language: "vi" | "en";
  locale: string;
}) {
  const details = [
    { icon: CarFront, label: translate(language, "Bien so", "License plate"), value: vehicle.plate },
    { icon: ShieldCheck, label: translate(language, "Loai xe", "Vehicle type"), value: vehicle.type },
    { icon: Sparkles, label: translate(language, "Hang xe", "Brand"), value: getVehicleDisplayField("brand", vehicle.brand, language) },
    { icon: CarFront, label: translate(language, "Dong xe", "Model"), value: getVehicleDisplayField("model", vehicle.model, language) },
    { icon: CalendarClock, label: translate(language, "Nam", "Year"), value: String(vehicle.year) },
    { icon: Palette, label: translate(language, "Mau sac", "Color"), value: getVehicleDisplayColor(vehicle.color, language) },
    { icon: CalendarClock, label: translate(language, "Ngay tao", "Created"), value: formatDateTime(vehicle.createdAt, locale) },
  ];

  return (
    <Card className="overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-black text-slate-950">
          {getVehicleDisplayName(vehicle, language)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <VehicleImage vehicle={vehicle} size="large" />
        <div className="grid grid-cols-2 gap-3">
          {details.map((item) => (
            <div key={item.label} className={item.label === translate(language, "Ngay tao", "Created") ? "col-span-2" : ""}>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                <item.icon className="h-3.5 w-3.5 text-sky-500" />
                {item.label}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-950">
                {item.label === translate(language, "Mau sac", "Color") ? <VehicleColorSwatch color={vehicle.color} /> : null}
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function VehicleImage({
  vehicle,
  size = "small",
}: {
  vehicle: Pick<CustomerVehicleListItem, "color" | "brand" | "model" | "type">;
  size?: "small" | "large";
}) {
  const isLarge = size === "large";
  const colorOption = getVehicleColorOption(vehicle.color);

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-slate-100 shadow-inner ${
        isLarge ? "h-36" : "h-20 w-32"
      }`}
      style={{ background: colorOption.imageBackground ?? "linear-gradient(135deg,#f8fdff,#eef8ff)" }}
    >
      <img
        src={colorOption.image}
        alt={`${vehicle.brand} ${vehicle.model}`}
        className={`absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain ${
          isLarge ? "h-[132%] w-[132%]" : "h-[145%] w-[145%]"
        }`}
        style={colorOption.imageFilter ? { filter: colorOption.imageFilter } : undefined}
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-white/70" />
      {isLarge ? (
        <div className="absolute bottom-3 left-4 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-700">
          {vehicle.type}
        </div>
      ) : null}
    </div>
  );
}

function VehicleColorSwatch({ color }: { color: string | null | undefined }) {
  const option = getVehicleColorOption(color);

  return (
    <span
      className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full border"
      style={{ backgroundColor: option.hex, borderColor: option.border ?? option.hex }}
      aria-hidden="true"
    />
  );
}

function VehicleInfoSummaryCard({
  vehicle,
  language,
  locale,
}: {
  vehicle: CustomerVehicleDetail;
  language: "vi" | "en";
  locale: string;
}) {
  const details = [
    { label: translate(language, "Bien so", "Plate"), value: vehicle.plate },
    { label: translate(language, "Loai xe", "Type"), value: vehicle.type },
    { label: translate(language, "Hang xe", "Brand"), value: getVehicleDisplayField("brand", vehicle.brand, language) },
    { label: translate(language, "Dong xe", "Model"), value: getVehicleDisplayField("model", vehicle.model, language) },
    { label: translate(language, "Nam san xuat", "Year"), value: String(vehicle.year) },
    { label: translate(language, "Mau sac", "Color"), value: getVehicleDisplayColor(vehicle.color, language) },
    { label: translate(language, "Ngay tao", "Created"), value: formatDateTime(vehicle.createdAt, locale) },
  ];

  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <CardHeader className="border-b border-slate-200/70 bg-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-xl font-black text-slate-900">
              {translate(language, "Thong tin xe", "Vehicle information")}
            </CardTitle>
            <CardDescription>
              {translate(language, "Xem nhanh thong tin xe da luu trong tai khoan.", "Review the saved vehicle details for this account.")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {vehicle.status}
            </span>
            {vehicle.isPrimary ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                <Star className="mr-1 h-3.5 w-3.5" />
                {translate(language, "Xe chinh", "Primary vehicle")}
              </span>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-6 sm:grid-cols-2">
        {details.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <div className="text-xs font-semibold uppercase text-slate-500">{item.label}</div>
            <div className="mt-1 text-sm font-bold text-slate-900">{item.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function VehicleFormPageShell({
  backHref,
  backLabel,
  notice,
  children,
}: {
  backHref: string;
  backLabel: string;
  notice?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_25%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline" className="w-fit rounded-xl">
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
          {notice ? (
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
              {notice}
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

function VehicleHeroMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CarFront;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function VehicleQuickActionsCard({
  vehicle,
  language,
  onSetPrimary,
  isSettingPrimary,
}: {
  vehicle: CustomerVehicleDetail;
  language: "vi" | "en";
  onSetPrimary: () => Promise<void>;
  isSettingPrimary: boolean;
}) {
  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <CardHeader className="border-b border-slate-200/70 bg-slate-50/70">
        <CardDescription>
          {translate(
            language,
            "Dat xe nay lam mac dinh cho cac booking moi.",
            "Set this vehicle as the default for new bookings.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {!vehicle.isPrimary ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-slate-200"
            onClick={onSetPrimary}
            disabled={isSettingPrimary}
          >
            {isSettingPrimary ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {translate(language, "Dang cap nhat...", "Updating...")}
              </>
            ) : (
              <>
                <Star className="mr-2 h-4 w-4" />
                {translate(language, "Dat lam xe chinh", "Set as primary")}
              </>
            )}
          </Button>
        ) : (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
            {translate(language, "Day la xe chinh hien tai.", "This is your current primary vehicle.")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VehicleListCard({
  vehicle,
  isDeleting,
  onDeleteChange,
  language,
}: {
  vehicle: CustomerVehicleListItem;
  isDeleting: boolean;
  onDeleteChange: (vehicleId: string | null) => void;
  language: "vi" | "en";
}) {
  const router = useRouter();
  const getErrorMessage = useErrorMessage();
  const setPrimaryMutation = useSetPrimaryCustomerVehicle(vehicle.vehicleId);
  const deleteMutation = useDeleteCustomerVehicle(vehicle.vehicleId);
  const vehicleDisplayName = getVehicleDisplayName(vehicle, language);

  const handleSetPrimary = async () => {
    try {
      await setPrimaryMutation.mutateAsync();
      toast.success(translate(language, "Xe chinh da duoc cap nhat.", "Primary vehicle updated."), VEHICLE_TOAST_OPTIONS);
    } catch (error) {
      toast.error(
        getVehicleToastErrorMessage(
          error,
          translate(language, "Khong the cap nhat xe chinh.", "Unable to update primary vehicle."),
          getErrorMessage,
        ),
        VEHICLE_TOAST_OPTIONS,
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      toast.success(translate(language, "Xe da duoc xoa.", "Vehicle removed."), VEHICLE_TOAST_OPTIONS);
      onDeleteChange(null);
    } catch (error) {
      toast.error(
        getVehicleToastErrorMessage(
          error,
          translate(language, "Khong the xoa xe.", "Unable to delete vehicle."),
          getErrorMessage,
        ),
        VEHICLE_TOAST_OPTIONS,
      );
    }
  };

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm transition hover:border-cyan-200 hover:shadow-md">
      <CardContent className="flex flex-col gap-5 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <VehicleImage vehicle={vehicle} />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-950">{vehicle.plate}</h2>
              <span className="rounded-md bg-sky-50 px-2 py-1 text-[11px] font-black text-sky-700">
                {vehicle.type}
              </span>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">
                {vehicle.status}
              </span>
              {vehicle.isPrimary ? (
                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-800">
                  <Star className="mr-1 h-3 w-3" />
                  {translate(language, "Uu tien", "Primary")}
                </span>
              ) : null}
            </div>
            <div className="truncate text-sm font-semibold text-slate-600">
              {vehicleDisplayName}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Palette className="h-3.5 w-3.5 text-slate-400" />
                <VehicleColorSwatch color={vehicle.color} />
                {getVehicleDisplayColor(vehicle.color, language)}
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                {vehicle.isPrimary
                  ? translate(language, "Se duoc uu tien khi booking", "Preferred for bookings")
                  : translate(language, "Co the dat lam xe uu tien", "Can be set as primary")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg border-slate-200"
            onClick={() => router.push(`/customer/vehicles/${vehicle.vehicleId}`)}
          >
            <Eye className="mr-2 h-4 w-4" />
            {translate(language, "Xem chi tiet", "View details")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg border-slate-200"
            onClick={handleSetPrimary}
            disabled={vehicle.isPrimary || setPrimaryMutation.isPending}
          >
            {setPrimaryMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {translate(language, "Dang cap nhat...", "Updating...")}
              </>
            ) : (
              <>
                <Star className="mr-2 h-4 w-4" />
                {vehicle.isPrimary
                  ? translate(language, "Xe chinh", "Primary")
                  : translate(language, "Dat lam xe chinh", "Set primary")}
              </>
            )}
          </Button>
          {isDeleting ? (
            <>
              <Button
                type="button"
                variant="destructive"
                className="h-10 rounded-lg"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {translate(language, "Dang xoa...", "Removing...")}
                  </>
                ) : (
                  translate(language, "Xac nhan xoa", "Confirm delete")
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg border-slate-200"
                onClick={() => onDeleteChange(null)}
              >
                {translate(language, "Huy", "Cancel")}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="destructive"
              className="h-10 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
              onClick={() => onDeleteChange(vehicle.vehicleId)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {translate(language, "Xoa", "Delete")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VehiclePageLoadingState() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-40 animate-pulse rounded-[2rem] bg-slate-100" />
        <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    </div>
  );
}

function VehiclePageErrorState({
  title,
  description,
  onRetry,
  language,
}: {
  title: string;
  description: string;
  onRetry: () => void;
  language: "vi" | "en";
}) {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-3xl border-rose-200 bg-white">
        <CardHeader>
          <CardTitle className="text-slate-900">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={onRetry} variant="outline" className="rounded-xl">
            <RefreshCcw className="mr-2 h-4 w-4" />
            {translate(language, "Thu lai", "Retry")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function VehicleEmptyState({ language, onAddClick }: { language: "vi" | "en"; onAddClick: () => void }) {
  return (
    <div>
      <Card className="border-dashed border-slate-200 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">
            {translate(language, "Chua co xe nao duoc luu", "No vehicles saved yet")}
          </CardTitle>
          <CardDescription>
            {translate(language, "Them xe cua ban de dat lich rua xe nhanh hon.", "The page stays connected to the real API and keeps the empty state explicit instead of falling back to mock data.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="rounded-lg bg-[#06275f] text-white hover:bg-[#041d48]" onClick={onAddClick}>
            <Plus className="mr-2 h-4 w-4" />
            {translate(language, "Them xe dau tien", "Add first vehicle")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function getSubmitErrors(
  apiError: ApiErrorResponse | null,
  clientErrors: CustomerVehicleFormErrors,
  showValidation: boolean,
) {
  const mergedErrors: CustomerVehicleFormErrors = {};
  const apiCode = getApiErrorCode(apiError);

  for (const fieldName of Object.keys(EMPTY_CUSTOMER_VEHICLE_FORM) as (keyof CustomerVehicleFormValues)[]) {
    const clientError = clientErrors[fieldName] ?? null;
    const apiFieldError = getFieldErrorMessage(apiError?.errors, fieldName);

    if (showValidation && clientError) {
      mergedErrors[fieldName] = clientError;
      continue;
    }

    if (apiFieldError) {
      mergedErrors[fieldName] = apiFieldError;
    }
  }

  if (apiCode === "DUPLICATE_PLATE" && !mergedErrors.plate) {
    mergedErrors.plate = "This license plate already exists. Please check the plate or choose another vehicle.";
  }

  return mergedErrors;
}

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
