"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Loader2, RefreshCcw, Save, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/ui/card";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { buildUpdateUserProfileRequest } from "@/features/profile/lib/profile-update-payload";
import { emailPattern, phonePattern } from "@/shared/lib/validators";
import { useStaffProfile, useUpdateStaffProfile } from "@/features/profile/hooks/use-staff-profile";

type ProfileFormState = {
  fullName: string;
  email: string;
  phone: string;
};

const EMPTY_FORM: ProfileFormState = {
  fullName: "",
  email: "",
  phone: "",
};

export default function StaffProfilePage() {
  const getErrorMessage = useErrorMessage();
  const profileQuery = useStaffProfile();
  const updateProfileMutation = useUpdateStaffProfile();
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    setForm({
      fullName: profileQuery.data.fullName,
      email: profileQuery.data.email ?? "",
      phone: profileQuery.data.phone ?? "",
    });
    setShowValidation(false);
    updateProfileMutation.reset();
  }, [profileQuery.data?.userId]);

  const fieldErrors = useMemo(() => validateProfileForm(form), [form]);
  const hasClientErrors = Object.values(fieldErrors).some(Boolean);
  const hasChanges = profileQuery.data
    ? form.fullName !== profileQuery.data.fullName ||
      form.email !== (profileQuery.data.email ?? "") ||
      form.phone !== (profileQuery.data.phone ?? "")
    : false;

  const handleFieldChange =
    (field: keyof ProfileFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue =
        field === "phone" ? event.target.value.replace(/\s/g, "") : event.target.value;

      setForm((current) => ({
        ...current,
        [field]: nextValue,
      }));

      if (updateProfileMutation.isError) {
        updateProfileMutation.reset();
      }
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowValidation(true);

    if (hasClientErrors || !hasChanges) {
      return;
    }

    try {
      await updateProfileMutation.mutateAsync(buildUpdateUserProfileRequest(form));
      toast.success("Đã cập nhật hồ sơ.");
      setShowValidation(false);
    } catch {
      toast.error("Không thể cập nhật hồ sơ.");
    }
  };

  if (profileQuery.isPending) {
    return <ProfileLoadingState />;
  }

  if (profileQuery.isError) {
    return (
      <ProfileErrorState
        description={getErrorMessage(profileQuery.error)}
        onRetry={() => profileQuery.refetch()}
      />
    );
  }

  if (!profileQuery.data) {
    return <ProfileEmptyState />;
  }

  const profile = profileQuery.data;
  const submitMessage = updateProfileMutation.isError
    ? updateProfileMutation.error.errors
        ?.map((item) => item.message)
        .join(" ") || getErrorMessage(updateProfileMutation.error)
    : null;

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(147,51,234,0.08),transparent_25%),linear-gradient(180deg,#fbf9ff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-purple-100/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-violet-50/60 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-purple-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Hồ sơ nhân viên
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Quản lý hồ sơ tài khoản
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">{profile.fullName}</div>
                <div className="text-xs text-slate-500">
                  {profile.role} • {profile.phone ?? "Chưa cung cấp"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-slate-200/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <CardHeader className="border-b border-slate-200/70 bg-slate-50/80">
              <CardTitle className="text-base text-slate-900">Thông tin hồ sơ hiện tại</CardTitle>
              <CardDescription>
                Thông tin tài khoản đã đăng ký trong hệ thống.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <InfoRow label="Họ và tên" value={profile.fullName} />
              <InfoRow label="Số điện thoại" value={profile.phone ?? "Chưa cung cấp"} />
              <InfoRow label="Email" value={profile.email ?? "Chưa cung cấp"} />
              <InfoRow label="Vai trò" value={profile.role} />
              <InfoRow label="Trạng thái" value={profile.status} />
              <InfoRow label="Ngày đăng ký" value={formatDateTime(profile.registeredAt)} />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <CardHeader className="border-b border-slate-200/70 bg-slate-50/80">
              <CardTitle className="text-base text-slate-900">Cập nhật hồ sơ</CardTitle>
              <CardDescription>
                Cập nhật họ tên, email hoặc số điện thoại.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <ProfileField
                  label="Họ và tên"
                  value={form.fullName}
                  onChange={handleFieldChange("fullName")}
                  placeholder="Nguyen Van A"
                  error={resolveFieldError(
                    "fullName",
                    fieldErrors.fullName,
                    updateProfileMutation.error?.errors,
                    showValidation,
                  )}
                />
                <ProfileField
                  label="Email"
                  value={form.email}
                  onChange={handleFieldChange("email")}
                  placeholder="staff@example.com"
                  inputMode="email"
                  error={resolveFieldError(
                    "email",
                    fieldErrors.email,
                    updateProfileMutation.error?.errors,
                    showValidation,
                  )}
                />
                <ProfileField
                  label="Số điện thoại"
                  value={form.phone}
                  onChange={handleFieldChange("phone")}
                  placeholder="0901234567"
                  inputMode="tel"
                  error={resolveFieldError(
                    "phone",
                    fieldErrors.phone,
                    updateProfileMutation.error?.errors,
                    showValidation,
                  )}
                />

                {submitMessage ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {submitMessage}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-500">
                    {hasChanges
                      ? "Có thay đổi chưa lưu."
                      : "Hồ sơ đang đồng bộ với hệ thống."}
                  </div>
                  <Button
                    type="submit"
                    disabled={!hasChanges || hasClientErrors || updateProfileMutation.isPending}
                    className="h-11 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Lưu hồ sơ
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function ProfileLoadingState() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-40 animate-pulse rounded-[2rem] bg-slate-100" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function ProfileErrorState({
  description,
  onRetry,
}: {
  description: string;
  onRetry: () => void;
}) {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-3xl border-rose-200 bg-white">
        <CardHeader>
          <CardTitle className="text-slate-900">Không thể tải hồ sơ</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={onRetry} variant="outline" className="rounded-xl">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Thử lại
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileEmptyState() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-3xl border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="text-slate-900">Không có dữ liệu hồ sơ</CardTitle>
          <CardDescription>
            Hệ thống không trả về dữ liệu hồ sơ.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  placeholder,
  error,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  error: string | null;
  inputMode?: "text" | "email" | "numeric" | "tel" | "search" | "url" | "none" | "decimal";
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
      />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function validateProfileForm(form: ProfileFormState) {
  return {
    fullName: form.fullName.trim().length === 0 ? "Vui lòng nhập họ và tên." : null,
    email:
      form.email.trim().length > 0 && !emailPattern.test(form.email.trim())
        ? "Email không hợp lệ."
        : null,
    phone: !phonePattern.test(form.phone.trim())
      ? "Số điện thoại phải đúng định dạng Việt Nam 0XXXXXXXXX."
      : null,
  };
}

function resolveFieldError(
  fieldName: string,
  clientError: string | null,
  apiErrors: { field: string; message: string }[] | undefined,
  showValidation: boolean,
) {
  if (showValidation && clientError) {
    return clientError;
  }

  return apiErrors?.find((item) => item.field === fieldName)?.message ?? null;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
