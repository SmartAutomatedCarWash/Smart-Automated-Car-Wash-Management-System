"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, Droplets, ImageUp, Layers3, Loader2, Package, Plus, RefreshCcw, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { AdminManagementTabs } from "@/features/management/components/admin-management-tabs";
import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import {
  useAdminCatalogPackages,
  useAdminCatalogServices,
  useAdminCombosCatalog,
  useCreateAdminCombo,
  useDeleteAdminCombo,
  useCreateAdminService,
  useDeleteAdminService,
  useCreateAdminPackage,
  useDeleteAdminPackage,
} from "@/features/management/hooks/use-admin-service-management";
import type { AdminCatalogService, AdminComboForm, AdminServiceForm, AdminPackageForm } from "@/entities/management";
import { uploadCatalogImage } from "@/features/management/lib/admin-service-management-service";
import { useLanguageStore, translate } from "@/shared/store/language.store";

const EMPTY_COMBO_FORM: AdminComboForm = {
  name: "",
  description: "",
  price: "",
  originalPrice: "",
  durationMinutes: "",
  durationDays: "",
  maxUsages: "",
  imageUrl: "",
  status: "ACTIVE",
  optionIds: [],
};

export function AdminServiceManagementPage() {
  const { language } = useLanguageStore();
  return (
    <WorkspacePage className="space-y-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{translate(language, "Quản lý dịch vụ", "Service Management")}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AdminManagementTabs
            defaultTab="services"
            tabs={[
              {
                value: "services",
                label: translate(language, "Dịch vụ", "Services"),
                content: <LiveServicesPanel />,
              },
              {
                value: "packages",
                label: translate(language, "Gói dịch vụ", "Packages"),
                content: <LivePackagesPanel />,
              },
              {
                value: "combos",
                label: "Combos",
                content: <LiveCombosPanel />,
              },
            ]}
          />
        </CardContent>
      </Card>
    </WorkspacePage>
  );
}

function LiveServicesPanel() {
  const { language } = useLanguageStore();
  const servicesQuery = useAdminCatalogServices();
  const createServiceMutation = useCreateAdminService();
  const deleteServiceMutation = useDeleteAdminService();
  const [form, setForm] = useState<AdminServiceForm>({
    name: "",
    description: "",
    price: "",
    duration: "",
    status: "ACTIVE",
    imageUrl: "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof AdminServiceForm, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const formErrors = useMemo(() => {
    const errors: Partial<Record<keyof AdminServiceForm, string>> = {};
    if (!form.name.trim()) errors.name = translate(language, "Vui lòng nhập tên dịch vụ.", "Name is required.");
    if (!form.price.trim() || Number(form.price) < 0) errors.price = translate(language, "Giá dịch vụ phải từ 0 trở lên.", "Price must be 0 or greater.");
    if (!form.duration.trim() || Number(form.duration) < 1) errors.duration = translate(language, "Thời lượng phải tối thiểu 1 phút.", "Duration must be at least 1 minute.");
    return errors;
  }, [form, language]);

  const visibleErrors = useMemo(() => {
    if (submitted) return formErrors;
    return Object.fromEntries(
      Object.entries(formErrors).filter(([key]) => touched[key as keyof AdminServiceForm])
    ) as Partial<Record<keyof AdminServiceForm, string>>;
  }, [formErrors, touched, submitted]);

  function touchField(field: keyof AdminServiceForm) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{translate(language, "Tạo dịch vụ mới", "Create service")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label={translate(language, "Tên dịch vụ", "Name")} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} onBlur={() => touchField("name")} error={visibleErrors.name} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={translate(language, "Giá dịch vụ (VND)", "Price")} value={form.price} onChange={(value) => setForm((current) => ({ ...current, price: value }))} onBlur={() => touchField("price")} error={visibleErrors.price} />
            <FormField label={translate(language, "Thời lượng (phút)", "Duration minutes")} value={form.duration} onChange={(value) => setForm((current) => ({ ...current, duration: value }))} onBlur={() => touchField("duration")} error={visibleErrors.duration} />
          </div>
          <FormField label={translate(language, "Mô tả", "Description")} value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
          <ImageUploadField label={translate(language, "Ảnh dịch vụ", "Service image")} value={form.imageUrl || ""} onChange={(value) => setForm((current) => ({ ...current, imageUrl: value }))} language={language as "vi" | "en"} />
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-800">{translate(language, "Trạng thái", "Status")}</span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as "ACTIVE" | "INACTIVE" }))}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
            >
              <option value="ACTIVE">{translate(language, "Hoạt động", "Active")}</option>
              <option value="INACTIVE">{translate(language, "Ngưng hoạt động", "Inactive")}</option>
            </select>
          </label>

          {createServiceMutation.isError ? (
            <ErrorPanel message={getDisplayErrorMessage(createServiceMutation.error)} />
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={createServiceMutation.isPending}
              onClick={async () => {
                setSubmitted(true);
                if (Object.keys(formErrors).length > 0) return;
                try {
                  await createServiceMutation.mutateAsync(form);
                  setForm({
                    name: "",
                    description: "",
                    price: "",
                    duration: "",
                    status: "ACTIVE",
                    imageUrl: "",
                  });
                  setTouched({});
                  setSubmitted(false);
                  toast.success(translate(language, "Tạo dịch vụ mới thành công.", "Service created successfully."));
                } catch (error) {
                  toast.error(getDisplayErrorMessage(error));
                }
              }}
            >
              {createServiceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {translate(language, "Tạo dịch vụ", "Create service")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{translate(language, "Danh mục dịch vụ", "Services catalog")}</CardTitle>
          </div>
          <Button type="button" variant="outline" onClick={() => servicesQuery.refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {translate(language, "Làm mới", "Refresh")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {servicesQuery.isPending ? (
            <LoadingPanel />
          ) : servicesQuery.isError ? (
            <ErrorPanel message={getDisplayErrorMessage(servicesQuery.error)} />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-1">
                {servicesQuery.data?.map((service) => {
                  const isDeleting = deleteServiceMutation.isPending && deleteServiceMutation.variables === service.serviceId;
                  return (
                    <Card key={service.serviceId} className="border-slate-200 bg-slate-50/50">
                      <CardContent className="p-5 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-4">
                          {service.imageUrl && (
                            <img
                              src={service.imageUrl}
                              alt={service.name}
                              className="h-14 w-14 rounded-lg object-cover border border-slate-200"
                            />
                          )}
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-bold text-slate-900">{service.name}</div>
                              <StatusBadge active={service.status === "ACTIVE"} language={language as "vi" | "en"} />
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                              <span className="rounded-full bg-white px-2.5 py-1">{service.duration} {translate(language, "phút", "min")}</span>
                              <span className="rounded-full bg-white px-2.5 py-1">{formatCurrency(service.price)}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={service.status !== "ACTIVE" || isDeleting}
                          onClick={async () => {
                            try {
                              await deleteServiceMutation.mutateAsync(service.serviceId);
                              toast.success(translate(language, "Đã ngưng hoạt động dịch vụ.", "Service deactivated."));
                            } catch (error) {
                              toast.error(getDisplayErrorMessage(error));
                            }
                          }}
                        >
                          {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          {translate(language, "Ngưng hoạt động", "Deactivate")}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LivePackagesPanel() {
  const { language } = useLanguageStore();
  const packagesQuery = useAdminCatalogPackages();
  const servicesQuery = useAdminCatalogServices();
  const createPackageMutation = useCreateAdminPackage();
  const deletePackageMutation = useDeleteAdminPackage();
  const [form, setForm] = useState<AdminPackageForm>({
    name: "",
    description: "",
    basePrice: "",
    duration: "",
    category: "",
    features: "",
    status: "ACTIVE",
    serviceIds: [],
    imageUrl: "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof AdminPackageForm, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const formErrors = useMemo(() => {
    const errors: Partial<Record<keyof AdminPackageForm, string>> = {};
    if (!form.name.trim()) errors.name = translate(language, "Vui lòng nhập tên gói.", "Name is required.");
    if (!form.basePrice.trim() || Number(form.basePrice) < 0) errors.basePrice = translate(language, "Giá gói phải từ 0 trở lên.", "Base price must be 0 or greater.");
    if (!form.duration.trim() || Number(form.duration) < 1) errors.duration = translate(language, "Thời lượng phải tối thiểu 1 phút.", "Duration must be at least 1 minute.");
    if (!form.category.trim()) errors.category = translate(language, "Vui lòng nhập danh mục.", "Category is required.");
    if (form.serviceIds.length === 0) errors.serviceIds = translate(language, "Chọn ít nhất một dịch vụ đi kèm.", "Select at least one service.");
    return errors;
  }, [form, language]);

  const visibleErrors = useMemo(() => {
    if (submitted) return formErrors;
    return Object.fromEntries(
      Object.entries(formErrors).filter(([key]) => touched[key as keyof AdminPackageForm])
    ) as Partial<Record<keyof AdminPackageForm, string>>;
  }, [formErrors, touched, submitted]);

  function touchField(field: keyof AdminPackageForm) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{translate(language, "Tạo gói dịch vụ mới", "Create package")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label={translate(language, "Tên gói", "Name")} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} onBlur={() => touchField("name")} error={visibleErrors.name} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={translate(language, "Giá gói (VND)", "Base price")} value={form.basePrice} onChange={(value) => setForm((current) => ({ ...current, basePrice: value }))} onBlur={() => touchField("basePrice")} error={visibleErrors.basePrice} />
            <FormField label={translate(language, "Thời lượng (phút)", "Duration minutes")} value={form.duration} onChange={(value) => setForm((current) => ({ ...current, duration: value }))} onBlur={() => touchField("duration")} error={visibleErrors.duration} />
          </div>
          <FormField label={translate(language, "Danh mục (ví dụ: Tiêu chuẩn, Cao cấp)", "Category (e.g. Basic, Premium)")} value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} onBlur={() => touchField("category")} error={visibleErrors.category} />
          <FormField label={translate(language, "Tính năng nổi bật (cách nhau bởi dấu phẩy)", "Features (comma separated)")} value={form.features} onChange={(value) => setForm((current) => ({ ...current, features: value }))} placeholder={translate(language, "Hút bụi, Rửa tay, Làm bóng lốp", "Vacuuming, Hand wash, Tire shine")} />
          <FormField label={translate(language, "Mô tả", "Description")} value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
          <ImageUploadField label={translate(language, "Ảnh gói dịch vụ", "Package image")} value={form.imageUrl || ""} onChange={(value) => setForm((current) => ({ ...current, imageUrl: value }))} language={language as "vi" | "en"} />

          {/* Services multi-select dropdown */}
          <ServiceMultiSelect
            label={translate(language, "Các dịch vụ đi kèm", "Services included")}
            services={servicesQuery.data?.filter((s) => s.status === "ACTIVE") ?? []}
            selectedIds={form.serviceIds}
            onChange={(ids) => setForm((current) => ({ ...current, serviceIds: ids }))}
            isLoading={servicesQuery.isPending}
            isError={servicesQuery.isError}
            errorMessage={servicesQuery.isError ? getDisplayErrorMessage(servicesQuery.error) : undefined}
            validationError={visibleErrors.serviceIds}
            language={language as "vi" | "en"}
          />

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-800">{translate(language, "Trạng thái", "Status")}</span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as "ACTIVE" | "INACTIVE" }))}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
            >
              <option value="ACTIVE">{translate(language, "Hoạt động", "Active")}</option>
              <option value="INACTIVE">{translate(language, "Ngưng hoạt động", "Inactive")}</option>
            </select>
          </label>

          {createPackageMutation.isError ? (
            <ErrorPanel message={getDisplayErrorMessage(createPackageMutation.error)} />
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={createPackageMutation.isPending}
              onClick={async () => {
                setSubmitted(true);
                if (Object.keys(formErrors).length > 0) return;
                try {
                  await createPackageMutation.mutateAsync(form);
                  setForm({
                    name: "",
                    description: "",
                    basePrice: "",
                    duration: "",
                    category: "",
                    features: "",
                    status: "ACTIVE",
                    serviceIds: [],
                    imageUrl: "",
                  });
                  setTouched({});
                  setSubmitted(false);
                  toast.success(translate(language, "Tạo gói dịch vụ mới thành công.", "Package created successfully."));
                } catch (error) {
                  toast.error(getDisplayErrorMessage(error));
                }
              }}
            >
              {createPackageMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {translate(language, "Tạo gói dịch vụ", "Create package")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{translate(language, "Danh mục các gói dịch vụ", "Packages catalog")}</CardTitle>
          </div>
          <Button type="button" variant="outline" onClick={() => packagesQuery.refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {translate(language, "Làm mới", "Refresh")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {packagesQuery.isPending ? (
            <LoadingPanel />
          ) : packagesQuery.isError ? (
            <ErrorPanel message={getDisplayErrorMessage(packagesQuery.error)} />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-1">
                {packagesQuery.data?.map((pkg) => {
                  const isDeleting = deletePackageMutation.isPending && deletePackageMutation.variables === pkg.packageId;
                  return (
                    <Card key={pkg.packageId} className="border-slate-200 bg-slate-50/50">
                      <CardContent className="p-5 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-4">
                          {pkg.image && (
                            <img
                              src={pkg.image}
                              alt={pkg.name}
                              className="h-16 w-16 rounded-xl object-cover border border-slate-200"
                            />
                          )}
                          <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-bold text-slate-900">{pkg.name}</div>
                            <StatusBadge active={pkg.status === "ACTIVE"} language={language as "vi" | "en"} />
                          </div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">{pkg.category}</div>
                          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                            <span className="rounded-full bg-white px-2.5 py-1">{pkg.duration} {translate(language, "phút", "min")}</span>
                            <span className="rounded-full bg-white px-2.5 py-1">{formatCurrency(pkg.basePrice)}</span>
                            {pkg.popularity ? <span className="rounded-full bg-white px-2.5 py-1">{pkg.popularity}</span> : null}
                          </div>
                          {pkg.features.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {pkg.features.map((feature) => (
                                <span key={feature} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                                  {feature}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <Button
                          type="button"
                          variant="outline"
                          disabled={pkg.status !== "ACTIVE" || isDeleting}
                          onClick={async () => {
                            try {
                              await deletePackageMutation.mutateAsync(pkg.packageId);
                              toast.success(translate(language, "Đã ngưng hoạt động gói dịch vụ.", "Package deactivated."));
                            } catch (error) {
                              toast.error(getDisplayErrorMessage(error));
                            }
                          }}
                        >
                          {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          {translate(language, "Ngưng hoạt động", "Deactivate")}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LiveCombosPanel() {
  const { language } = useLanguageStore();
  const servicesQuery = useAdminCatalogServices();
  const combosQuery = useAdminCombosCatalog();
  const createComboMutation = useCreateAdminCombo();
  const deleteComboMutation = useDeleteAdminCombo();
  const [form, setForm] = useState<AdminComboForm>(EMPTY_COMBO_FORM);
  const [touched, setTouched] = useState<Partial<Record<keyof AdminComboForm, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const formErrors = useMemo(() => {
    const errors: Partial<Record<keyof AdminComboForm, string>> = {};
    if (!form.name.trim()) errors.name = translate(language, "Vui lòng nhập tên Combo.", "Name is required.");
    if (!form.price.trim() || Number(form.price) < 0) errors.price = translate(language, "Giá phải lớn hơn hoặc bằng 0.", "Price must be 0 or greater.");
    if (!form.durationMinutes.trim() || Number(form.durationMinutes) < 1) errors.durationMinutes = translate(language, "Thời lượng tối thiểu là 1 phút.", "Duration must be at least 1 minute.");
    if (form.durationDays.trim() && Number(form.durationDays) < 1) errors.durationDays = translate(language, "Số ngày hiệu lực phải tối thiểu là 1 ngày.", "Duration days must be at least 1.");
    if (form.maxUsages.trim() && Number(form.maxUsages) < 1) errors.maxUsages = translate(language, "Số lần sử dụng tối đa phải từ 1 lần trở lên.", "Max usages must be at least 1.");
    if (form.optionIds.length === 0) errors.optionIds = translate(language, "Vui lòng chọn ít nhất một dịch vụ.", "Select at least one service.");
    return errors;
  }, [form, language]);

  const visibleErrors = useMemo(() => {
    if (submitted) return formErrors;
    return Object.fromEntries(
      Object.entries(formErrors).filter(([key]) => touched[key as keyof AdminComboForm])
    ) as Partial<Record<keyof AdminComboForm, string>>;
  }, [formErrors, touched, submitted]);

  function touchField(field: keyof AdminComboForm) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{translate(language, "Tạo Combo mới", "Create combo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={translate(language, "Tên Combo", "Name")} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} onBlur={() => touchField("name")} error={visibleErrors.name} />
            <FormField label={translate(language, "Giá Combo (VND)", "Price")} value={form.price} onChange={(value) => setForm((current) => ({ ...current, price: value }))} onBlur={() => touchField("price")} error={visibleErrors.price} />
            <FormField label={translate(language, "Giá gốc (VND)", "Original price")} value={form.originalPrice} onChange={(value) => setForm((current) => ({ ...current, originalPrice: value }))} />
            <FormField label={translate(language, "Thời lượng (phút)", "Duration minutes")} value={form.durationMinutes} onChange={(value) => setForm((current) => ({ ...current, durationMinutes: value }))} onBlur={() => touchField("durationMinutes")} error={visibleErrors.durationMinutes} />
            <FormField label={translate(language, "Thời hạn áp dụng (ngày)", "Duration days")} value={form.durationDays} onChange={(value) => setForm((current) => ({ ...current, durationDays: value }))} onBlur={() => touchField("durationDays")} error={visibleErrors.durationDays} />
            <FormField label={translate(language, "Số lần rửa tối đa", "Max usages")} value={form.maxUsages} onChange={(value) => setForm((current) => ({ ...current, maxUsages: value }))} onBlur={() => touchField("maxUsages")} error={visibleErrors.maxUsages} />
          </div>
          <FormField
            label={translate(language, "Mô tả", "Description")}
            value={form.description}
            onChange={(value) => setForm((current) => ({ ...current, description: value }))}
          />
          <ImageUploadField label={translate(language, "Ảnh Combo", "Combo image")} value={form.imageUrl} onChange={(value) => setForm((current) => ({ ...current, imageUrl: value }))} language={language as "vi" | "en"} />
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-800">{translate(language, "Trạng thái", "Status")}</span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as "ACTIVE" | "INACTIVE" }))}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
            >
              <option value="ACTIVE">{translate(language, "Hoạt động", "Active")}</option>
              <option value="INACTIVE">{translate(language, "Ngưng hoạt động", "Inactive")}</option>
            </select>
          </label>

          <ServiceMultiSelect
            label={translate(language, "Dịch vụ đi kèm trong Combo", "Services included")}
            services={servicesQuery.data?.filter((s) => s.status === "ACTIVE") ?? []}
            selectedIds={form.optionIds}
            onChange={(ids) => setForm((current) => ({ ...current, optionIds: ids }))}
            isLoading={servicesQuery.isPending}
            isError={servicesQuery.isError}
            errorMessage={servicesQuery.isError ? getDisplayErrorMessage(servicesQuery.error) : undefined}
            validationError={visibleErrors.optionIds}
            language={language as "vi" | "en"}
          />

          {createComboMutation.isError ? (
            <ErrorPanel message={getDisplayErrorMessage(createComboMutation.error)} />
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={createComboMutation.isPending}
              onClick={async () => {
                setSubmitted(true);
                if (Object.keys(formErrors).length > 0) return;
                try {
                  await createComboMutation.mutateAsync(form);
                  setForm(EMPTY_COMBO_FORM);
                  setTouched({});
                  setSubmitted(false);
                  toast.success(translate(language, "Tạo Combo thành công.", "Combo created successfully."));
                } catch (error) {
                  toast.error(getDisplayErrorMessage(error));
                }
              }}
            >
              {createComboMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {translate(language, "Tạo Combo", "Create combo")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{translate(language, "Danh mục các Combo", "Live combo catalog")}</CardTitle>
          </div>
          <Button type="button" variant="outline" onClick={() => combosQuery.refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {translate(language, "Làm mới", "Refresh")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {combosQuery.isPending ? (
            <LoadingPanel />
          ) : combosQuery.isError ? (
            <ErrorPanel message={getDisplayErrorMessage(combosQuery.error)} />
          ) : !combosQuery.data || combosQuery.data.length === 0 ? (
            <Card className="border-slate-200 bg-slate-50/50">
              <CardContent className="p-5 text-sm text-slate-500">{translate(language, "Không tìm thấy Combo nào.", "No combos found.")}</CardContent>
            </Card>
          ) : (
            combosQuery.data.map((combo) => {
              const isDeleting =
                deleteComboMutation.isPending && deleteComboMutation.variables === combo.comboId;

              return (
                <Card key={combo.comboId} className="border-slate-200 bg-slate-50/50">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-4">
                        {(combo.image || (combo as any).imageUrl) && (
                          <img
                            src={combo.image || (combo as any).imageUrl}
                            alt={combo.name}
                            className="h-16 w-16 rounded-xl object-cover border border-slate-200"
                          />
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-lg font-bold text-slate-900">{combo.name}</div>
                            <StatusBadge active={combo.isActive} language={language as "vi" | "en"} />
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!combo.isActive || isDeleting}
                        onClick={async () => {
                          try {
                            await deleteComboMutation.mutateAsync(combo.comboId);
                            toast.success(translate(language, "Đã ngưng hoạt động Combo.", "Combo deactivated."));
                          } catch (error) {
                            toast.error(getDisplayErrorMessage(error));
                          }
                        }}
                      >
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {translate(language, "Ngưng hoạt động", "Deactivate")}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      <span className="rounded-full bg-white px-2.5 py-1">{formatCurrency(combo.basePrice)}</span>
                      <span className="rounded-full bg-white px-2.5 py-1">{combo.durationDays} {translate(language, "ngày", "days")}</span>
                      <span className="rounded-full bg-white px-2.5 py-1">{combo.maxServices} {translate(language, "dịch vụ", "services")}</span>
                    </div>
                    {combo.benefits.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {combo.benefits.map((benefit) => (
                          <span key={`${combo.comboId}-${benefit}`} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                            {benefit}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryEntryCard({
  icon: Icon,
  title,
  description,
  href,
  cta,
}: {
  icon: typeof Layers3;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Card className="border-border/70 bg-white shadow-sm">
      <CardContent className="space-y-4 p-6 flex flex-col justify-between h-full">
        <div className="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{title}</div>
            <p className="hidden mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button asChild type="button" className="mt-4 w-full">
          <Link href={href}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ active, language }: { active: boolean; language: "vi" | "en" }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
      {active ? translate(language, "Hoạt động", "Active") : translate(language, "Ngưng hoạt động", "Inactive")}
    </span>
  );
}

function BackendGapNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function ServiceMultiSelect({
  label,
  services,
  selectedIds,
  onChange,
  isLoading,
  isError,
  errorMessage,
  validationError,
  language,
}: {
  label: string;
  services: AdminCatalogService[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  validationError?: string;
  language: "vi" | "en";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedServices = services.filter((s) => selectedIds.includes(s.serviceId));

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  function removeTag(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(selectedIds.filter((x) => x !== id));
  }

  // Close when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="grid gap-2" ref={containerRef}>
      <span className="text-sm font-semibold text-slate-800">{label}</span>

      {isLoading ? (
        <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> {translate(language, "Đang tải danh mục dịch vụ...", "Loading services...")}
        </div>
      ) : isError ? (
        <div className="flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm text-rose-600">
          {errorMessage ?? translate(language, "Lỗi tải danh mục dịch vụ", "Failed to load services")}
        </div>
      ) : (
        <div className="relative">
          {/* Trigger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
              open ? "border-teal-400 ring-2 ring-teal-100" : "border-slate-200"
            } bg-white`}
          >
            {selectedServices.length === 0 ? (
              <span className="text-slate-400">{translate(language, "Chọn các dịch vụ...", "Select services...")}</span>
            ) : (
              selectedServices.map((s) => (
                <span
                  key={s.serviceId}
                  className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700"
                >
                  {s.name}
                  <button
                    type="button"
                    onClick={(e) => removeTag(s.serviceId, e)}
                    className="ml-0.5 rounded-full hover:text-teal-900"
                    aria-label={`Remove ${s.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
            <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown panel */}
          {open && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
              {services.length === 0 ? (
                <div className="px-3 py-3 text-sm text-slate-400">{translate(language, "Không có dịch vụ hoạt động.", "No active services available.")}</div>
              ) : (
                <ul className="max-h-52 overflow-auto py-1">
                  {services.map((service) => {
                    const checked = selectedIds.includes(service.serviceId);
                    return (
                      <li key={service.serviceId}>
                        <button
                          type="button"
                          onClick={() => toggle(service.serviceId)}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${checked ? "bg-teal-50/60" : ""}`}
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-teal-500 bg-teal-500 text-white" : "border-slate-300"}`}>
                            {checked && (
                              <svg viewBox="0 0 10 8" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">{service.name}</div>
                            <div className="text-xs text-slate-500">{service.duration} {translate(language, "phút", "min")} · {formatCurrency(service.price)}</div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {validationError ? <p className="text-sm text-rose-600">{validationError}</p> : null}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
      />
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
    </label>
  );
}

function ImageUploadField({
  label,
  value,
  onChange,
  language,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  language: "vi" | "en";
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setIsUploading(true);
      const uploaded = await uploadCatalogImage(file);
      onChange(uploaded.url);
      toast.success(translate(language, "Tải ảnh lên thành công.", "Image uploaded."));
    } catch (error) {
      toast.error(getDisplayErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://example.com/image.jpg"
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
        />
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <Button type="button" variant="outline" disabled={isUploading} onClick={() => inputRef.current?.click()}>
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
          {translate(language, "Tải lên", "Upload")}
        </Button>
      </div>
      {value ? (
        <img src={value} alt="" className="h-24 w-24 rounded-xl border border-slate-200 object-cover" />
      ) : null}
    </div>
  );
}

function LoadingPanel() {
  const { language } = useLanguageStore();
  return (
    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
      <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      <span className="ml-2 text-sm text-slate-400">{translate(language, "Đang tải...", "Loading...")}</span>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {message}
    </div>
  );
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}
