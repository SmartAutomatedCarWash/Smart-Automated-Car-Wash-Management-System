"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CarFront,
  Loader2,
  Palette,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { getFieldErrorMessage } from "@/shared/lib/api-errors";
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

export function CustomerVehiclesListClientPage() {
  const { language } = useLanguageStore();
  const getErrorMessage = useErrorMessage();
  const vehiclesQuery = useCustomerVehicles();
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  if (!vehiclesQuery.data || vehiclesQuery.data.items.length === 0) {
    return <VehicleEmptyState language={language} />;
  }

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_25%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                <CarFront className="h-3.5 w-3.5" />
                {translate(language, "Xe cua khach hang", "Customer vehicles")}
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  {translate(language, "Tat ca xe da luu", "All saved vehicles")}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {translate(
                    language,
                    "Xem danh sach xe cua ban, chon Xem chi tiet tren tung xe de mo thong tin day du.",
                    "Review your vehicle list, then use View details on any vehicle to open the full profile.",
                  )}
                </p>
              </div>
            </div>

            <Button asChild className="h-11 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800">
              <Link href="/customer/vehicles/add">
                <Plus className="mr-2 h-4 w-4" />
                {translate(language, "Them xe", "Add vehicle")}
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4">
          {vehiclesQuery.data.items.map((vehicle) => (
            <VehicleListCard
              key={vehicle.vehicleId}
              vehicle={vehicle}
              isDeleting={deleteId === vehicle.vehicleId}
              onDeleteChange={setDeleteId}
              language={language}
            />
          ))}
        </section>
      </div>
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
      toast.success(translate(language, "Xe da duoc tao thanh cong.", "Vehicle created successfully."));
      router.push(`/customer/vehicles/${createdVehicle.vehicleId}`);
    } catch {
      toast.error(translate(language, "Khong the tao xe.", "Unable to create vehicle."));
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
  const deleteMutation = useDeleteCustomerVehicle(vehicleId);
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
  const vehicleDisplayName = getVehicleDisplayName(vehicle, language);
  const submitErrors = getSubmitErrors(updateMutation.error, clientErrors, showValidation);
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
      toast.info(translate(language, "Chua co thay doi nao de luu.", "No changes to save."));
      router.push("/customer/vehicles");
      return;
    }

    try {
      await updateMutation.mutateAsync(buildUpdateCustomerVehicleRequest(form));
      toast.success(translate(language, "Xe da duoc cap nhat thanh cong.", "Vehicle updated successfully."));
      router.push("/customer/vehicles");
    } catch {
      toast.error(translate(language, "Khong the cap nhat xe.", "Unable to update vehicle."));
    }
  };

  const handleSetPrimary = async () => {
    try {
      await setPrimaryMutation.mutateAsync();
      toast.success(translate(language, "Xe chinh da duoc cap nhat.", "Primary vehicle updated."));
    } catch {
      toast.error(translate(language, "Khong the dat xe chinh.", "Unable to set primary vehicle."));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      toast.success(translate(language, "Xe da duoc xoa.", "Vehicle removed."));
      router.push("/customer/vehicles");
    } catch {
      toast.error(translate(language, "Khong the xoa xe.", "Unable to delete vehicle."));
    }
  };

  return (
    <VehicleFormPageShell
      backHref="/customer/vehicles"
      backLabel={translate(language, "Quay lai danh sach xe", "Back to vehicles")}
    >
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(13,148,136,0.92))] p-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
              <ShieldCheck className="h-3.5 w-3.5" />
              {translate(language, "Chi tiet xe", "Vehicle detail")}
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                {vehicleDisplayName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/75">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-semibold">
                  {vehicle.plate}
                </span>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 font-semibold text-emerald-100">
                  {vehicle.status}
                </span>
                {vehicle.isPrimary ? (
                  <span className="inline-flex items-center rounded-full border border-amber-300/20 bg-amber-300/15 px-3 py-1 font-semibold text-amber-100">
                    <Star className="mr-1 h-3.5 w-3.5" />
                    {translate(language, "Xe chinh", "Primary vehicle")}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-white/75">
              {translate(
                language,
                "Theo doi xe dang dung cho booking, cap nhat thong tin hien thi va dat lai xe chinh khi can.",
                "Review the vehicle used for bookings, keep profile details current, and switch the primary vehicle when needed.",
              )}
            </p>
          </div>

          <div className="grid gap-3 sm:min-w-[320px] sm:grid-cols-2 lg:w-[360px] lg:grid-cols-1">
            <VehicleHeroMetric
              icon={CarFront}
              label={translate(language, "Loai xe", "Vehicle type")}
              value={vehicle.type}
            />
            <VehicleHeroMetric
              icon={Palette}
              label={translate(language, "Mau sac", "Color")}
              value={getVehicleDisplayColor(vehicle.color, language)}
            />
            <VehicleHeroMetric
              icon={CalendarClock}
              label={translate(language, "Ngay tao", "Created")}
              value={formatDateTime(vehicle.createdAt, locale)}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-6">
          <VehicleInfoSummaryCard vehicle={vehicle} language={language} locale={locale} />
          <VehicleQuickActionsCard
            vehicle={vehicle}
            language={language}
            onSetPrimary={handleSetPrimary}
            onDelete={handleDelete}
            isSettingPrimary={setPrimaryMutation.isPending}
            isDeleting={deleteMutation.isPending}
          />
        </div>

        <CustomerVehicleFormCard
          title={vehicleDisplayName}
          description={translate(language, "Cap nhat cac truong xe co the chinh sua. Bien so va loai xe chi doc de giu lich su xe nhat quan.", "Update editable vehicle fields. Plate and type stay read-only to keep vehicle history consistent.")}
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
            <div className="flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              <Save className="h-3.5 w-3.5" />
              {hasChanges
                ? translate(language, "Co thay doi chua luu", "Unsaved changes")
                : translate(language, "Da dong bo", "Up to date")}
            </div>
          }
        />
      </section>
    </VehicleFormPageShell>
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
  onDelete,
  isSettingPrimary,
  isDeleting,
}: {
  vehicle: CustomerVehicleDetail;
  language: "vi" | "en";
  onSetPrimary: () => Promise<void>;
  onDelete: () => Promise<void>;
  isSettingPrimary: boolean;
  isDeleting: boolean;
}) {
  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <CardHeader className="border-b border-slate-200/70 bg-slate-50/70">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          <Sparkles className="h-3.5 w-3.5" />
          {translate(language, "Tac vu nhanh", "Quick actions")}
        </div>
        <CardTitle className="text-lg font-black text-slate-900">
          {translate(language, "Quan ly vai tro cua xe", "Manage vehicle role")}
        </CardTitle>
        <CardDescription>
          {translate(
            language,
            "Dat xe nay lam mac dinh cho booking moi hoac xoa xe khoi tai khoan neu khong con su dung.",
            "Set this vehicle as the default for new bookings or remove it from the account if it is no longer used.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {vehicle.isPrimary ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {translate(
              language,
              "Xe nay dang la primary. Booking moi se uu tien chon xe nay.",
              "This vehicle is currently primary. New bookings will prefer this vehicle.",
            )}
          </div>
        ) : (
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
        )}

        <Button
          type="button"
          variant="destructive"
          className="h-11 w-full rounded-xl"
          onClick={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {translate(language, "Dang xoa...", "Removing...")}
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              {translate(language, "Xoa xe nay", "Delete this vehicle")}
            </>
          )}
        </Button>
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
  const setPrimaryMutation = useSetPrimaryCustomerVehicle(vehicle.vehicleId);
  const deleteMutation = useDeleteCustomerVehicle(vehicle.vehicleId);
  const vehicleDisplayName = getVehicleDisplayName(vehicle, language);

  const handleSetPrimary = async () => {
    try {
      await setPrimaryMutation.mutateAsync();
      toast.success(translate(language, "Xe chinh da duoc cap nhat.", "Primary vehicle updated."));
    } catch {
      toast.error(translate(language, "Khong the cap nhat xe chinh.", "Unable to update primary vehicle."));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      toast.success(translate(language, "Xe da duoc xoa.", "Vehicle removed."));
      onDeleteChange(null);
    } catch {
      toast.error(translate(language, "Khong the xoa xe.", "Unable to delete vehicle."));
    }
  };

  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
            <CarFront className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">{vehicle.plate}</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {vehicle.type}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {vehicle.status}
              </span>
              {vehicle.isPrimary ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  <Star className="mr-1 h-3.5 w-3.5" />
                  {translate(language, "Xe chinh", "Primary")}
                </span>
              ) : null}
            </div>
            <div className="text-sm text-slate-600">
              {vehicleDisplayName}
            </div>
            <div className="text-sm text-slate-500">
              {translate(language, "Mau sac", "Color")}: {getVehicleDisplayColor(vehicle.color, language)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => router.push(`/customer/vehicles/${vehicle.vehicleId}`)}
          >
            {translate(language, "Xem chi tiet", "View details")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
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
                className="rounded-xl"
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
                className="rounded-xl"
                onClick={() => onDeleteChange(null)}
              >
                {translate(language, "Huy", "Cancel")}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
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

function VehicleEmptyState({ language }: { language: "vi" | "en" }) {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-4xl border-slate-200 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <CardHeader>
          <CardTitle className="text-slate-900">
            {translate(language, "Chua co xe nao duoc luu", "No vehicles saved yet")}
          </CardTitle>
          <CardDescription>
            {translate(language, "Them xe cua ban de dat lich rua xe nhanh hon.", "The page stays connected to the real API and keeps the empty state explicit instead of falling back to mock data.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">
            <Link href="/customer/vehicles/add">
              <Plus className="mr-2 h-4 w-4" />
              {translate(language, "Them xe dau tien", "Add first vehicle")}
            </Link>
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

  return mergedErrors;
}

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
