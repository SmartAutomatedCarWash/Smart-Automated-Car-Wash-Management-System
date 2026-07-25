"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, Droplets, ImageUp, Layers3, Loader2, Package, Plus, RefreshCcw, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/ui/table";
import { AdminManagementTabs } from "@/features/management/components/admin-management-tabs";
import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { cn } from "@/shared/lib/utils";
import {
  useAdminCatalogPackages,
  useAdminCatalogServices,
  useAdminCombosCatalog,
  useCreateAdminCombo,
  useDeleteAdminCombo,
  useUpdateAdminCombo,
  useCreateAdminService,
  useDeleteAdminService,
  useUpdateAdminService,
  useCreateAdminPackage,
  useDeleteAdminPackage,
  useUpdateAdminPackage,
} from "@/features/management/hooks/use-admin-service-management";
import type { AdminCatalogService, AdminCatalogPackage, AdminComboForm, AdminServiceForm, AdminPackageForm } from "@/entities/management";
import { uploadCatalogImage } from "@/features/management/lib/admin-service-management-service";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { Pencil } from "lucide-react";

const EMPTY_COMBO_FORM: AdminComboForm = {
  name: "",
  description: "",
  price: "",
  originalPrice: "",
  durationMinutes: "",
  durationDays: "",
  maxUsages: "",
  imageUrls: [],
  status: "ACTIVE",
  optionIds: [],
};

export function AdminServiceManagementPage() {
  const { language } = useLanguageStore();
  return (
    <WorkspacePage className="space-y-6">
      <Card className="overflow-hidden border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(244,251,255,0.98)_100%)] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 text-white shadow-lg shadow-cyan-100">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-2 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-orange-500">
                {translate(language, "Bảng điều phối danh mục", "Catalog control hub")}
              </div>
              <CardTitle className="text-2xl font-black tracking-tight text-slate-950">
                {translate(language, "Quản lý dịch vụ", "Service Management")}
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-slate-500">
                {translate(
                  language,
                  "Đồng bộ dịch vụ, gói dịch vụ và combo trong cùng một giao diện quản trị.",
                  "Manage services, packages, and combos from one consistent admin workspace.",
                )}
              </CardDescription>
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
  const getErrorMessage = useErrorMessage();
  const servicesQuery = useAdminCatalogServices();
  const createServiceMutation = useCreateAdminService();
  const deleteServiceMutation = useDeleteAdminService();
  const updateServiceMutation = useUpdateAdminService();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  
  const defaultForm: AdminServiceForm = {
    name: "",
    description: "",
    price: "",
    duration: "",
    status: "ACTIVE",
    imageUrls: [],
  };
  const [form, setForm] = useState<AdminServiceForm>(defaultForm);
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

  function handleEdit(service: AdminCatalogService) {
    setEditingServiceId(service.serviceId);
    setForm({
      name: service.name || "",
      description: service.description || "",
      price: service.price != null ? String(service.price) : "",
      duration: service.duration != null ? String(service.duration) : "",
      status: service.status as "ACTIVE" | "INACTIVE",
      imageUrls: service.imageUrls || [],
    });
    setTouched({});
    setSubmitted(false);
    setIsDialogOpen(true);
  }

  function handleCancelEdit() {
    setIsDialogOpen(false);
    setEditingServiceId(null);
    setForm(defaultForm);
    setTouched({});
    setSubmitted(false);
  }

  return (
    <>
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg font-bold text-slate-950">{translate(language, "Danh sách dịch vụ", "Services list")}</CardTitle>
              <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                {(servicesQuery.data?.length ?? 0)} {translate(language, "dịch vụ", "services")}
              </span>
            </div>
            <CardDescription className="max-w-xl text-sm leading-6 text-slate-500">
              {translate(language, "Danh sách ở dạng bảng. Thêm hoặc chỉnh sửa dịch vụ bằng cửa sổ popup.", "List services in a table. Add or edit a service from the popup form.")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => servicesQuery.refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {translate(language, "Làm mới", "Refresh")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setEditingServiceId(null);
                setForm(defaultForm);
                setTouched({});
                setSubmitted(false);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {translate(language, "Thêm dịch vụ", "Add service")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          {servicesQuery.isPending ? (
            <div className="p-6">
              <LoadingPanel />
            </div>
          ) : servicesQuery.isError ? (
            <div className="p-6">
              <ErrorPanel message={getErrorMessage(servicesQuery.error)} />
            </div>
          ) : (
            <Table className="border-0 rounded-none">
              <TableHeader className="bg-slate-50/90">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">{translate(language, "Dịch vụ", "Service")}</TableHead>
                  <TableHead>{translate(language, "Giá", "Price")}</TableHead>
                  <TableHead>{translate(language, "Thời lượng", "Duration")}</TableHead>
                  <TableHead>{translate(language, "Trạng thái", "Status")}</TableHead>
                  <TableHead className="pr-6 text-right">{translate(language, "Hành động", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicesQuery.data?.length ? servicesQuery.data.map((service) => {
                  const isDeleting = deleteServiceMutation.isPending && deleteServiceMutation.variables === service.serviceId;
                  return (
                    <TableRow key={service.serviceId} className="border-slate-100">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          {service.imageUrls?.[0] ? (
                            <img src={service.imageUrls[0]} alt={service.name} className="h-12 w-12 rounded-xl border border-slate-200 object-cover" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-300">
                              <ImageUp className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">{service.name}</div>
                            {service.description ? <div className="line-clamp-2 text-xs text-slate-500">{service.description}</div> : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700">{formatCurrency(service.price)}</TableCell>
                      <TableCell className="text-slate-600">{service.duration} {translate(language, "phút", "min")}</TableCell>
                      <TableCell><StatusBadge active={service.status === "ACTIVE"} language={language as "vi" | "en"} /></TableCell>
                      <TableCell className="pr-6">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => handleEdit(service)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {translate(language, "Sửa", "Edit")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={service.status !== "ACTIVE" || isDeleting}
                            onClick={async () => {
                              try {
                                await deleteServiceMutation.mutateAsync(service.serviceId);
                                notify.success(translate(language, "Đã ngưng hoạt động dịch vụ.", "Service deactivated."));
                              } catch (error) {
                                notify.error(getErrorMessage(error));
                              }
                            }}
                          >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            {translate(language, "Ngưng", "Deactivate")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                      {translate(language, "Chưa có dịch vụ nào.", "No services yet.")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : handleCancelEdit())}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[28px] border border-white/70 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,0.16)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-950">
              {editingServiceId ? translate(language, "Chỉnh sửa dịch vụ", "Edit service") : translate(language, "Tạo dịch vụ mới", "Create service")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-500">
              {translate(language, "Nhập thông tin dịch vụ trong popup này. Các ràng buộc dữ liệu hiện tại vẫn được giữ nguyên.", "Enter service information in this popup. Current validation rules remain unchanged.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <FormField label={translate(language, "Tên dịch vụ", "Name")} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} onBlur={() => touchField("name")} error={visibleErrors.name} />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label={translate(language, "Giá dịch vụ (VND)", "Price")} value={form.price} onChange={(value) => setForm((current) => ({ ...current, price: value }))} onBlur={() => touchField("price")} error={visibleErrors.price} />
              <FormField label={translate(language, "Thời lượng (phút)", "Duration minutes")} value={form.duration} onChange={(value) => setForm((current) => ({ ...current, duration: value }))} onBlur={() => touchField("duration")} error={visibleErrors.duration} />
            </div>
            <RichDescriptionField label={translate(language, "Mô tả", "Description")} value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
            <ImageUploadField label={translate(language, "Ảnh dịch vụ", "Service image")} value={form.imageUrls || []} onChange={(value) => setForm((current) => ({ ...current, imageUrls: value }))} language={language as "vi" | "en"} />
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

            {createServiceMutation.isError ? <ErrorPanel message={getErrorMessage(createServiceMutation.error)} /> : null}
            {updateServiceMutation.isError ? <ErrorPanel message={getErrorMessage(updateServiceMutation.error)} /> : null}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleCancelEdit}>
              {translate(language, "Hủy", "Cancel")}
            </Button>
            <Button
              type="button"
              disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
              onClick={async () => {
                setSubmitted(true);
                if (Object.keys(formErrors).length > 0) return;
                try {
                  if (editingServiceId) {
                    await updateServiceMutation.mutateAsync({ ...form, serviceId: editingServiceId });
                    notify.success(translate(language, "Cập nhật dịch vụ thành công.", "Service updated successfully."));
                    handleCancelEdit();
                  } else {
                    await createServiceMutation.mutateAsync(form);
                    notify.success(translate(language, "Tạo dịch vụ mới thành công.", "Service created successfully."));
                    handleCancelEdit();
                  }
                } catch (error) {
                  notify.error(getErrorMessage(error));
                }
              }}
            >
              {(createServiceMutation.isPending || updateServiceMutation.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : editingServiceId ? (
                <Pencil className="mr-2 h-4 w-4" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {editingServiceId ? translate(language, "Cập nhật", "Update") : translate(language, "Tạo dịch vụ", "Create service")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LivePackagesPanel() {
  const { language } = useLanguageStore();
  const getErrorMessage = useErrorMessage();
  const packagesQuery = useAdminCatalogPackages();
  const servicesQuery = useAdminCatalogServices();
  const createPackageMutation = useCreateAdminPackage();
  const deletePackageMutation = useDeleteAdminPackage();
  const updatePackageMutation = useUpdateAdminPackage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  const defaultForm: AdminPackageForm = {
    name: "",
    description: "",
    basePrice: "",
    duration: "",
    category: "",
    features: "",
    status: "ACTIVE",
    serviceIds: [],
    imageUrls: [],
  };
  const [form, setForm] = useState<AdminPackageForm>(defaultForm);
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

  function handleEdit(pkg: AdminCatalogPackage) {
    setEditingPackageId(pkg.packageId);
    setForm({
      name: pkg.name || "",
      description: pkg.description || "",
      basePrice: pkg.basePrice != null ? String(pkg.basePrice) : "",
      duration: pkg.duration != null ? String(pkg.duration) : "",
      category: pkg.category || "",
      features: pkg.features ? pkg.features.join(", ") : "",
      status: pkg.status as "ACTIVE" | "INACTIVE",
      serviceIds: pkg.serviceIds || [],
      imageUrls: pkg.imageUrls || [],
    });
    setTouched({});
    setSubmitted(false);
    setIsDialogOpen(true);
  }

  function handleCancelEdit() {
    setIsDialogOpen(false);
    setEditingPackageId(null);
    setForm(defaultForm);
    setTouched({});
    setSubmitted(false);
  }

  return (
    <>
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg font-bold text-slate-950">{translate(language, "Danh sách gói dịch vụ", "Packages list")}</CardTitle>
              <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                {(packagesQuery.data?.length ?? 0)} {translate(language, "gói", "packages")}
              </span>
            </div>
            <CardDescription className="max-w-xl text-sm leading-6 text-slate-500">
              {translate(language, "Danh sách gói ở dạng bảng. Nút thêm gói sẽ mở popup nhập thông tin gói.", "Packages are shown in a table. The add package button opens a popup form.")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => packagesQuery.refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {translate(language, "Làm mới", "Refresh")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setEditingPackageId(null);
                setForm(defaultForm);
                setTouched({});
                setSubmitted(false);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {translate(language, "Thêm gói", "Add package")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {packagesQuery.isPending ? (
            <div className="p-6">
              <LoadingPanel />
            </div>
          ) : packagesQuery.isError ? (
            <div className="p-6">
              <ErrorPanel message={getErrorMessage(packagesQuery.error)} />
            </div>
          ) : (
            <Table className="border-0 rounded-none">
              <TableHeader className="bg-slate-50/90">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">{translate(language, "Gói", "Package")}</TableHead>
                  <TableHead>{translate(language, "Danh mục", "Category")}</TableHead>
                  <TableHead>{translate(language, "Giá", "Price")}</TableHead>
                  <TableHead>{translate(language, "Thời lượng", "Duration")}</TableHead>
                  <TableHead>{translate(language, "Trạng thái", "Status")}</TableHead>
                  <TableHead className="pr-6 text-right">{translate(language, "Hành động", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packagesQuery.data?.length ? packagesQuery.data.map((pkg) => {
                  const isDeleting = deletePackageMutation.isPending && deletePackageMutation.variables === pkg.packageId;
                  return (
                    <TableRow key={pkg.packageId} className="border-slate-100">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          {pkg.imageUrls?.[0] ? (
                            <img src={pkg.imageUrls[0]} alt={pkg.name} className="h-12 w-12 rounded-xl border border-slate-200 object-cover" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-300">
                              <ImageUp className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">{pkg.name}</div>
                            {pkg.features.length > 0 ? <div className="line-clamp-2 text-xs text-slate-500">{pkg.features.join(", ")}</div> : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{pkg.category}</TableCell>
                      <TableCell className="font-semibold text-slate-700">{formatCurrency(pkg.basePrice)}</TableCell>
                      <TableCell className="text-slate-600">{pkg.duration} {translate(language, "phút", "min")}</TableCell>
                      <TableCell><StatusBadge active={pkg.status === "ACTIVE"} language={language as "vi" | "en"} /></TableCell>
                      <TableCell className="pr-6">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => handleEdit(pkg)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {translate(language, "Sửa", "Edit")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={pkg.status !== "ACTIVE" || isDeleting}
                            onClick={async () => {
                              try {
                                await deletePackageMutation.mutateAsync(pkg.packageId);
                                notify.success(translate(language, "Đã ngưng hoạt động gói dịch vụ.", "Package deactivated."));
                              } catch (error) {
                                notify.error(getErrorMessage(error));
                              }
                            }}
                          >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            {translate(language, "Ngưng", "Deactivate")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                      {translate(language, "Chưa có gói dịch vụ nào.", "No packages yet.")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : handleCancelEdit())}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[28px] border border-white/70 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,0.16)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-950">
              {editingPackageId ? translate(language, "Chỉnh sửa gói dịch vụ", "Edit package") : translate(language, "Tạo gói dịch vụ mới", "Create package")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-500">
              {translate(language, "Popup này giữ nguyên validation và ràng buộc chọn dịch vụ đi kèm cho gói.", "This popup preserves the current package validation and included-service constraints.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <FormField label={translate(language, "Tên gói", "Name")} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} onBlur={() => touchField("name")} error={visibleErrors.name} />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label={translate(language, "Giá gói (VND)", "Base price")} value={form.basePrice} onChange={(value) => setForm((current) => ({ ...current, basePrice: value }))} onBlur={() => touchField("basePrice")} error={visibleErrors.basePrice} />
              <FormField label={translate(language, "Thời lượng (phút)", "Duration minutes")} value={form.duration} onChange={(value) => setForm((current) => ({ ...current, duration: value }))} onBlur={() => touchField("duration")} error={visibleErrors.duration} />
            </div>
            <CategorySelectField
              label={translate(language, "Danh mục", "Category")}
              value={form.category}
              existingCategories={Array.from(new Set(packagesQuery.data?.map((p) => p.category).filter(Boolean) as string[]))}
              onChange={(value) => setForm((current) => ({ ...current, category: value }))}
              onBlur={() => touchField("category")}
              error={visibleErrors.category}
              language={language as "vi" | "en"}
            />
            <FormField label={translate(language, "Tính năng nổi bật (cách nhau bởi dấu phẩy)", "Features (comma separated)")} value={form.features} onChange={(value) => setForm((current) => ({ ...current, features: value }))} placeholder={translate(language, "Hút bụi, Rửa tay, Làm bóng lốp", "Vacuuming, Hand wash, Tire shine")} />
            <RichDescriptionField label={translate(language, "Mô tả", "Description")} value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
            <ImageUploadField label={translate(language, "Ảnh gói dịch vụ", "Package image")} value={form.imageUrls || []} onChange={(value) => setForm((current) => ({ ...current, imageUrls: value }))} language={language as "vi" | "en"} />
            <ServiceMultiSelect
              label={translate(language, "Các dịch vụ đi kèm", "Services included")}
              services={servicesQuery.data?.filter((s) => s.status === "ACTIVE") ?? []}
              selectedIds={form.serviceIds}
              onChange={(ids) => setForm((current) => ({ ...current, serviceIds: ids }))}
              isLoading={servicesQuery.isPending}
              isError={servicesQuery.isError}
              errorMessage={servicesQuery.isError ? getErrorMessage(servicesQuery.error) : undefined}
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
            {createPackageMutation.isError ? <ErrorPanel message={getErrorMessage(createPackageMutation.error)} /> : null}
            {updatePackageMutation.isError ? <ErrorPanel message={getErrorMessage(updatePackageMutation.error)} /> : null}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleCancelEdit}>
              {translate(language, "Hủy", "Cancel")}
            </Button>
            <Button
              type="button"
              disabled={createPackageMutation.isPending || updatePackageMutation.isPending}
              onClick={async () => {
                setSubmitted(true);
                if (Object.keys(formErrors).length > 0) return;
                try {
                  if (editingPackageId) {
                    await updatePackageMutation.mutateAsync({ ...form, packageId: editingPackageId });
                    notify.success(translate(language, "Cập nhật gói dịch vụ thành công.", "Package updated successfully."));
                    handleCancelEdit();
                  } else {
                    await createPackageMutation.mutateAsync(form);
                    notify.success(translate(language, "Tạo gói dịch vụ mới thành công.", "Package created successfully."));
                    handleCancelEdit();
                  }
                } catch (error) {
                  notify.error(getErrorMessage(error));
                }
              }}
            >
              {(createPackageMutation.isPending || updatePackageMutation.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : editingPackageId ? (
                <Pencil className="mr-2 h-4 w-4" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {editingPackageId ? translate(language, "Cập nhật", "Update") : translate(language, "Tạo gói dịch vụ", "Create package")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LiveCombosPanel() {
  const { language } = useLanguageStore();
  const getErrorMessage = useErrorMessage();
  const servicesQuery = useAdminCatalogServices();
  const combosQuery = useAdminCombosCatalog();
  const createComboMutation = useCreateAdminCombo();
  const deleteComboMutation = useDeleteAdminCombo();
  const updateComboMutation = useUpdateAdminCombo();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComboId, setEditingComboId] = useState<string | null>(null);

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

  function handleEdit(combo: any) {
    setEditingComboId(combo.comboId);
    setForm({
      name: combo.name || "",
      description: combo.description || "",
      price: combo.basePrice != null ? String(combo.basePrice) : (combo.price != null ? String(combo.price) : ""),
      originalPrice: combo.originalPrice != null ? String(combo.originalPrice) : "",
      durationMinutes: combo.durationMinutes != null ? String(combo.durationMinutes) : "",
      durationDays: combo.durationDays != null ? String(combo.durationDays) : "",
      maxUsages: combo.maxServices != null ? String(combo.maxServices) : (combo.maxUsages != null ? String(combo.maxUsages) : ""),
      imageUrls: combo.imageUrls || [],
      status: combo.isActive ? "ACTIVE" : "INACTIVE",
      optionIds: combo.options ? combo.options.map((o: any) => o.optionId) : [],
    });
    setTouched({});
    setSubmitted(false);
    setIsDialogOpen(true);
  }

  function handleCancelEdit() {
    setIsDialogOpen(false);
    setEditingComboId(null);
    setForm(EMPTY_COMBO_FORM);
    setTouched({});
    setSubmitted(false);
  }

  return (
    <>
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg font-bold text-slate-950">{translate(language, "Danh sách combo", "Combos list")}</CardTitle>
              <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                {(combosQuery.data?.length ?? 0)} {translate(language, "combo", "combos")}
              </span>
            </div>
            <CardDescription className="max-w-xl text-sm leading-6 text-slate-500">
              {translate(language, "Danh sách combo ở dạng bảng. Nút thêm combo sẽ mở popup nhập thông tin.", "Combos are shown in a table. The add combo button opens a popup form.")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => combosQuery.refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {translate(language, "Làm mới", "Refresh")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setEditingComboId(null);
                setForm(EMPTY_COMBO_FORM);
                setTouched({});
                setSubmitted(false);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {translate(language, "Thêm combo", "Add combo")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {combosQuery.isPending ? (
            <div className="p-6">
              <LoadingPanel />
            </div>
          ) : combosQuery.isError ? (
            <div className="p-6">
              <ErrorPanel message={getErrorMessage(combosQuery.error)} />
            </div>
          ) : (
            <Table className="border-0 rounded-none">
              <TableHeader className="bg-slate-50/90">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">{translate(language, "Combo", "Combo")}</TableHead>
                  <TableHead>{translate(language, "Giá", "Price")}</TableHead>
                  <TableHead>{translate(language, "Hiệu lực", "Validity")}</TableHead>
                  <TableHead>{translate(language, "Giới hạn", "Limit")}</TableHead>
                  <TableHead>{translate(language, "Trạng thái", "Status")}</TableHead>
                  <TableHead className="pr-6 text-right">{translate(language, "Hành động", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combosQuery.data?.length ? combosQuery.data.map((combo) => {
                  const isDeleting = deleteComboMutation.isPending && deleteComboMutation.variables === combo.comboId;
                  return (
                    <TableRow key={combo.comboId} className="border-slate-100">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          {(combo.imageUrls?.[0] || (combo as any).imageUrl) ? (
                            <img src={combo.imageUrls?.[0] || (combo as any).imageUrl} alt={combo.name} className="h-12 w-12 rounded-xl border border-slate-200 object-cover" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-300">
                              <ImageUp className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">{combo.name}</div>
                            {(combo.benefits ?? []).length > 0 ? <div className="line-clamp-2 text-xs text-slate-500">{(combo.benefits ?? []).join(", ")}</div> : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700">{formatCurrency(combo.basePrice)}</TableCell>
                      <TableCell className="text-slate-600">{combo.durationDays} {translate(language, "ngày", "days")}</TableCell>
                      <TableCell className="text-slate-600">{combo.maxServices} {translate(language, "dịch vụ", "services")}</TableCell>
                      <TableCell><StatusBadge active={combo.isActive} language={language as "vi" | "en"} /></TableCell>
                      <TableCell className="pr-6">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => handleEdit(combo)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {translate(language, "Sửa", "Edit")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!combo.isActive || isDeleting}
                            onClick={async () => {
                              try {
                                await deleteComboMutation.mutateAsync(combo.comboId);
                                notify.success(translate(language, "Đã ngưng hoạt động Combo.", "Combo deactivated."));
                              } catch (error) {
                                notify.error(getErrorMessage(error));
                              }
                            }}
                          >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            {translate(language, "Ngưng", "Deactivate")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                      {translate(language, "Chưa có combo nào.", "No combos yet.")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : handleCancelEdit())}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[28px] border border-white/70 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,0.16)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-950">
              {editingComboId ? translate(language, "Chỉnh sửa Combo", "Edit combo") : translate(language, "Tạo Combo mới", "Create combo")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-500">
              {translate(language, "Popup này giữ nguyên ràng buộc số ngày hiệu lực, số lượt dùng và danh sách dịch vụ của combo.", "This popup preserves combo constraints for duration, usage limits, and included services.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label={translate(language, "Tên Combo", "Name")} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} onBlur={() => touchField("name")} error={visibleErrors.name} />
              <FormField label={translate(language, "Giá Combo (VND)", "Price")} value={form.price} onChange={(value) => setForm((current) => ({ ...current, price: value }))} onBlur={() => touchField("price")} error={visibleErrors.price} />
              <FormField label={translate(language, "Giá gốc (VND)", "Original price")} value={form.originalPrice} onChange={(value) => setForm((current) => ({ ...current, originalPrice: value }))} />
              <FormField label={translate(language, "Thời lượng (phút)", "Duration minutes")} value={form.durationMinutes} onChange={(value) => setForm((current) => ({ ...current, durationMinutes: value }))} onBlur={() => touchField("durationMinutes")} error={visibleErrors.durationMinutes} />
              <FormField label={translate(language, "Thời hạn áp dụng (ngày)", "Duration days")} value={form.durationDays} onChange={(value) => setForm((current) => ({ ...current, durationDays: value }))} onBlur={() => touchField("durationDays")} error={visibleErrors.durationDays} />
              <FormField label={translate(language, "Số lần rửa tối đa", "Max usages")} value={form.maxUsages} onChange={(value) => setForm((current) => ({ ...current, maxUsages: value }))} onBlur={() => touchField("maxUsages")} error={visibleErrors.maxUsages} />
            </div>
            <RichDescriptionField
              label={translate(language, "Mô tả", "Description")}
              value={form.description}
              onChange={(value) => setForm((current) => ({ ...current, description: value }))}
            />
            <ImageUploadField label={translate(language, "Ảnh Combo", "Combo image")} value={form.imageUrls || []} onChange={(value) => setForm((current) => ({ ...current, imageUrls: value }))} language={language as "vi" | "en"} />
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
              errorMessage={servicesQuery.isError ? getErrorMessage(servicesQuery.error) : undefined}
              validationError={visibleErrors.optionIds}
              language={language as "vi" | "en"}
            />
            {createComboMutation.isError ? <ErrorPanel message={getErrorMessage(createComboMutation.error)} /> : null}
            {updateComboMutation.isError ? <ErrorPanel message={getErrorMessage(updateComboMutation.error)} /> : null}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleCancelEdit}>
              {translate(language, "Hủy", "Cancel")}
            </Button>
            <Button
              type="button"
              disabled={createComboMutation.isPending || updateComboMutation.isPending}
              onClick={async () => {
                setSubmitted(true);
                if (Object.keys(formErrors).length > 0) return;
                try {
                  if (editingComboId) {
                    await updateComboMutation.mutateAsync({ ...form, comboId: editingComboId });
                    notify.success(translate(language, "Cập nhật Combo thành công.", "Combo updated successfully."));
                    handleCancelEdit();
                  } else {
                    await createComboMutation.mutateAsync(form);
                    notify.success(translate(language, "Tạo Combo thành công.", "Combo created successfully."));
                    handleCancelEdit();
                  }
                } catch (error) {
                  notify.error(getErrorMessage(error));
                }
              }}
            >
              {(createComboMutation.isPending || updateComboMutation.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : editingComboId ? (
                <Pencil className="mr-2 h-4 w-4" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {editingComboId ? translate(language, "Cập nhật", "Update") : translate(language, "Tạo Combo", "Create combo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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

// Category dropdown with inline "Add new" option
function CategorySelectField({
  label,
  value,
  existingCategories,
  onChange,
  onBlur,
  error,
  language,
}: {
  label: string;
  value: string;
  existingCategories: string[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  language: "vi" | "en";
}) {
  const ADD_NEW = "__add_new__";
  const [showInput, setShowInput] = useState(false);
  const [newCat, setNewCat] = useState("");

  const handleSelect = (v: string) => {
    if (v === ADD_NEW) {
      setShowInput(true);
    } else {
      onChange(v);
      onBlur?.();
    }
  };

  const handleConfirm = () => {
    const trimmed = newCat.trim();
    if (trimmed) {
      onChange(trimmed);
      onBlur?.();
    }
    setShowInput(false);
    setNewCat("");
  };

  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {!showInput ? (
        <select
          value={value}
          onChange={(e) => handleSelect(e.target.value)}
          onBlur={onBlur}
          className={cn(
            "h-11 rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-colors",
            error ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-[#0566D9]"
          )}
        >
          <option value="" disabled>
            {language === "vi" ? "Chọn danh mục..." : "Select category..."}
          </option>
          {existingCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
          {value && !existingCategories.includes(value) && (
            <option value={value}>{value}</option>
          )}
          <option value={ADD_NEW}>
            + {language === "vi" ? "Thêm danh mục mới" : "Add new category"}
          </option>
        </select>
      ) : (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleConfirm(); } if (e.key === "Escape") { setShowInput(false); setNewCat(""); } }}
            placeholder={language === "vi" ? "Tên danh mục mới..." : "New category name..."}
            className="h-11 flex-1 rounded-xl border border-[#0566D9] bg-white px-3 text-sm text-slate-900 outline-none"
          />
          <button type="button" onClick={handleConfirm} className="h-11 rounded-xl bg-teal-600 px-4 text-xs font-bold text-white hover:bg-teal-700 transition">
            {language === "vi" ? "Xác nhận" : "Confirm"}
          </button>
          <button type="button" onClick={() => { setShowInput(false); setNewCat(""); }} className="h-11 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
            {language === "vi" ? "Hủy" : "Cancel"}
          </button>
        </div>
      )}
      {value && !showInput && (
        <span className="text-xs text-slate-500">
          {language === "vi" ? "Đang chọn" : "Selected"}: <strong>{value}</strong>
        </span>
      )}
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
    </div>
  );
}
function RichDescriptionField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function insertTag(open: string, close: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const newVal = value.slice(0, start) + open + selected + close + value.slice(end);
    onChange(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + open.length, start + open.length + selected.length);
    }, 0);
  }

  function insertImageUrl() {
    const url = prompt("Image URL:");
    if (!url) return;
    const el = ref.current;
    if (!el) return;
    const pos = el.selectionStart;
    const img = `<img src="${url}" alt="image" style="width:100%;border-radius:8px;margin:8px 0;" />`;
    onChange(value.slice(0, pos) + img + value.slice(pos));
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <div>
        <div className="flex flex-wrap gap-1 border border-slate-200 border-b-0 rounded-t-xl bg-slate-50 px-2 py-1.5">
          {[
            { label: "B", open: "<strong>", close: "</strong>", cls: "font-black" },
            { label: "I", open: "<em>", close: "</em>", cls: "italic" },
            { label: "P", open: "<p>", close: "</p>", cls: "" },
            { label: "• List", open: "<ul><li>", close: "</li></ul>", cls: "" },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => insertTag(btn.open, btn.close)}
              className={`px-2 py-0.5 text-xs hover:bg-white rounded border border-transparent hover:border-slate-200 transition ${btn.cls}`}
            >
              {btn.label}
            </button>
          ))}
          <div className="w-px bg-slate-200 mx-0.5" />
          <button
            type="button"
            onClick={insertImageUrl}
            className="px-2 py-0.5 text-xs hover:bg-white rounded border border-transparent hover:border-slate-200 transition"
          >
            🖼 Ảnh
          </button>
        </div>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full rounded-b-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none resize-y font-mono min-h-[90px] focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
          placeholder="<p>Mô tả dịch vụ...</p>"
        />
      </div>
    </div>
  );
}

function ImageUploadField({
  label,
  value,
  onChange,
  language,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  language: "vi" | "en";
}) {
  const getErrorMessage = useErrorMessage();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      setIsUploading(true);
      const newUrls = [...(value || [])];
      for (let i = 0; i < files.length; i++) {
        const uploaded = await uploadCatalogImage(files[i]);
        newUrls.push(uploaded.url);
      }
      onChange(newUrls);
      notify.success(translate(language, "Tải ảnh lên thành công.", "Images uploaded."));
    } catch (error) {
      notify.error(getErrorMessage(error));
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function handleRemove(index: number) {
    const newUrls = [...(value || [])];
    newUrls.splice(index, 1);
    onChange(newUrls);
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <div className="flex gap-2">
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        <Button type="button" variant="outline" disabled={isUploading} onClick={() => inputRef.current?.click()}>
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
          {translate(language, "Tải lên", "Upload")}
        </Button>
      </div>
      {value && value.length > 0 ? (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt="" className="h-24 w-24 rounded-xl border border-slate-200 object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
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
