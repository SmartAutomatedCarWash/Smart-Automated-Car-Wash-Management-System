"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CarFront, Loader2, Plus, RefreshCcw, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { getDisplayErrorMessage, getFieldErrorMessage } from "@/shared/lib/api-errors";
import {
  EMPTY_CUSTOMER_VEHICLE_FORM,
  buildCreateCustomerVehicleRequest,
  buildUpdateCustomerVehicleRequest,
  buildVehicleFormDefaults,
  validateCustomerVehicleForm,
} from "@/features/vehicles/lib/vehicle-form";
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
  const vehiclesQuery = useCustomerVehicles();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (vehiclesQuery.isPending) {
    return <VehiclePageLoadingState />;
  }

  if (vehiclesQuery.isError) {
    return (
      <VehiclePageErrorState
        title={translate(language, "Không thể tải danh sách xe", "Unable to load vehicles")}
        description={getDisplayErrorMessage(vehiclesQuery.error)}
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
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                <CarFront className="h-3.5 w-3.5" />
                {translate(language, "Xe của khách hàng", "Customer vehicles")}
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  {translate(language, "Quản lý xe đã lưu.", "Manage saved vehicles.")}
                </h1>
              </div>
            </div>

            <Button asChild className="h-11 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800">
              <Link href="/customer/vehicles/add">
                <Plus className="mr-2 h-4 w-4" />
                {translate(language, "Thêm xe", "Add vehicle")}
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
  const router = useRouter();
  const createVehicleMutation = useCreateCustomerVehicle();
  const [form, setForm] = useState<CustomerVehicleFormValues>(EMPTY_CUSTOMER_VEHICLE_FORM);
  const [showValidation, setShowValidation] = useState(false);

  const clientErrors = useMemo(
    () => validateCustomerVehicleForm(form, "create"),
    [form],
  );
  const submitErrors = getSubmitErrors(createVehicleMutation.error, clientErrors, showValidation);

  const handleSubmit = async () => {
    setShowValidation(true);

    if (Object.keys(clientErrors).length > 0) {
      return;
    }

    try {
      const createdVehicle = await createVehicleMutation.mutateAsync(
        buildCreateCustomerVehicleRequest(form),
      );
      toast.success(translate(language, "Xe đã được tạo thành công.", "Vehicle created successfully."));
      router.push(`/customer/vehicles/${createdVehicle.vehicleId}`);
    } catch {
      toast.error(translate(language, "Không thể tạo xe.", "Unable to create vehicle."));
    }
  };

  return (
    <VehicleFormPageShell
      backHref="/customer/vehicles"
      backLabel={translate(language, "Quay lại danh sách xe", "Back to vehicles")}
      notice={
        createVehicleMutation.isError
          ? getDisplayErrorMessage(createVehicleMutation.error)
          : translate(language, "Thêm xe mới của bạn.", "Create a vehicle using the live customer vehicle contract.")
      }
    >
      <CustomerVehicleFormCard
        title={translate(language, "Thêm xe mới", "Add a new vehicle")}
        description={translate(language, "Điền thông tin xe để lưu vào tài khoản của bạn.", "The UI stays close to the prototype, but all values now go through the real backend contract.")}
        form={form}
        errors={submitErrors}
        submitLabel={translate(language, "Tạo xe", "Create vehicle")}
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

  const clientErrors = useMemo(
    () => validateCustomerVehicleForm(form, "update"),
    [form],
  );

  if (vehicleQuery.isPending) {
    return <VehiclePageLoadingState />;
  }

  if (vehicleQuery.isError) {
    return (
      <VehiclePageErrorState
        title={translate(language, "Không thể tải xe", "Unable to load vehicle")}
        description={getDisplayErrorMessage(vehicleQuery.error)}
        onRetry={() => vehicleQuery.refetch()}
        language={language}
      />
    );
  }

  if (!vehicleQuery.data) {
    return (
      <VehiclePageErrorState
        title={translate(language, "Không tìm thấy xe", "Vehicle not found")}
        description={translate(language, "Không có dữ liệu xe nào được trả về cho mã này.", "The contract returned no vehicle payload for this identifier.")}
        onRetry={() => router.push("/customer/vehicles")}
        language={language}
      />
    );
  }

  const vehicle = vehicleQuery.data;
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
      toast.info(translate(language, "Chưa có thay đổi nào để lưu.", "No changes to save."));
      router.push("/customer/vehicles");
      return;
    }

    try {
      await updateMutation.mutateAsync(buildUpdateCustomerVehicleRequest(form));
      toast.success(translate(language, "Xe đã được cập nhật thành công.", "Vehicle updated successfully."));
      router.push("/customer/vehicles");
    } catch {
      toast.error(translate(language, "Không thể cập nhật xe.", "Unable to update vehicle."));
    }
  };

  const handleSetPrimary = async () => {
    try {
      await setPrimaryMutation.mutateAsync();
      toast.success(translate(language, "Xe chính đã được cập nhật.", "Primary vehicle updated."));
    } catch {
      toast.error(translate(language, "Không thể đặt xe chính.", "Unable to set primary vehicle."));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      toast.success(translate(language, "Xe đã được xóa.", "Vehicle removed."));
      router.push("/customer/vehicles");
    } catch {
      toast.error(translate(language, "Không thể xóa xe.", "Unable to delete vehicle."));
    }
  };

  return (
    <VehicleFormPageShell
      backHref="/customer/vehicles"
      backLabel={translate(language, "Quay lại danh sách xe", "Back to vehicles")}
      notice={`${translate(language, "Xe đã tạo vào", "Vehicle created")} ${formatDateTime(vehicle.createdAt, locale)} ${translate(language, "và hiện có trạng thái", "and currently marked as")} ${vehicle.status.toLowerCase()}.`}
    >
      <VehicleInfoSummaryCard vehicle={vehicle} language={language} locale={locale} />

      <CustomerVehicleFormCard
        title={`${vehicle.brand} ${vehicle.model}`}
        description={translate(language, "Cập nhật các trường xe có thể chỉnh sửa. Biển số và loại xe chỉ đọc để giữ lịch sử xe nhất quán.", "Update editable vehicle fields. Plate and type stay read-only to keep vehicle history consistent.")}
        form={form}
        errors={submitErrors}
        submitLabel={translate(language, "Lưu thay đổi", "Save changes")}
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
            {vehicle.isPrimary ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                <Star className="mr-1 h-3.5 w-3.5" />
                {translate(language, "Xe chính", "Primary vehicle")}
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={handleSetPrimary}
                disabled={setPrimaryMutation.isPending}
              >
                {setPrimaryMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {translate(language, "Đang cập nhật...", "Updating...")}
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    {translate(language, "Đặt làm xe chính", "Set primary")}
                  </>
                )}
              </Button>
            )}
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
                  {translate(language, "Đang xóa...", "Removing...")}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {translate(language, "Xóa", "Delete")}
                </>
              )}
            </Button>
          </div>
        }
      />
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
    { label: translate(language, "Biển số", "Plate"), value: vehicle.plate },
    { label: translate(language, "Loại xe", "Type"), value: vehicle.type },
    { label: translate(language, "Hãng xe", "Brand"), value: vehicle.brand },
    { label: translate(language, "Dòng xe", "Model"), value: vehicle.model },
    { label: translate(language, "Năm sản xuất", "Year"), value: String(vehicle.year) },
    { label: translate(language, "Màu sắc", "Color"), value: vehicle.color ?? translate(language, "Chưa cung cấp", "Not provided") },
    { label: translate(language, "Ngày tạo", "Created"), value: formatDateTime(vehicle.createdAt, locale) },
  ];

  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <CardHeader className="border-b border-slate-200/70 bg-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-xl font-black text-slate-900">
              {translate(language, "Thông tin xe", "Vehicle information")}
            </CardTitle>
            <CardDescription>
              {translate(language, "Xem nhanh thông tin xe đã lưu trong tài khoản.", "Review the saved vehicle details for this account.")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {vehicle.status}
            </span>
            {vehicle.isPrimary ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                <Star className="mr-1 h-3.5 w-3.5" />
                {translate(language, "Xe chính", "Primary vehicle")}
              </span>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
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
  notice: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_25%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 pointer-events-none">
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
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
            {notice}
          </div>
        </div>
        {children}
      </div>
    </div>
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

  const handleSetPrimary = async () => {
    try {
      await setPrimaryMutation.mutateAsync();
      toast.success(translate(language, "Xe chính đã được cập nhật.", "Primary vehicle updated."));
    } catch {
      toast.error(translate(language, "Không thể cập nhật xe chính.", "Unable to update primary vehicle."));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      toast.success(translate(language, "Xe đã được xóa.", "Vehicle removed."));
      onDeleteChange(null);
    } catch {
      toast.error(translate(language, "Không thể xóa xe.", "Unable to delete vehicle."));
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
                  {translate(language, "Xe chính", "Primary")}
                </span>
              ) : null}
            </div>
            <div className="text-sm text-slate-600">
              {vehicle.brand} {vehicle.model}
            </div>
            <div className="text-sm text-slate-500">
              {translate(language, "Màu sắc", "Color")}: {vehicle.color ?? translate(language, "Chưa cung cấp", "Not provided")}
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
            {translate(language, "Xem chi tiết", "View details")}
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
                {translate(language, "Đang cập nhật...", "Updating...")}
              </>
            ) : (
              <>
                <Star className="mr-2 h-4 w-4" />
                {vehicle.isPrimary ? translate(language, "Xe chính", "Primary") : translate(language, "Đặt làm xe chính", "Set primary")}
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
                    {translate(language, "Đang xóa...", "Removing...")}
                  </>
                ) : (
                  translate(language, "Xác nhận xóa", "Confirm delete")
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => onDeleteChange(null)}
              >
                {translate(language, "Huỷ", "Cancel")}
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
              {translate(language, "Xóa", "Delete")}
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
            {translate(language, "Thử lại", "Retry")}
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
          <CardTitle className="text-slate-900">{translate(language, "Chưa có xe nào được lưu", "No vehicles saved yet")}</CardTitle>
          <CardDescription>
            {translate(language, "Thêm xe của bạn để đặt lịch rửa xe nhanh hơn.", "The page stays connected to the real API and keeps the empty state explicit instead of falling back to mock data.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">
            <Link href="/customer/vehicles/add">
              <Plus className="mr-2 h-4 w-4" />
              {translate(language, "Thêm xe đầu tiên", "Add first vehicle")}
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
