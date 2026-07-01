"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Loader2, RefreshCcw, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/ui/avatar";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { validateProfileForm } from "@/features/profile/lib/profile-form-validation";
import { buildUpdateUserProfileRequest } from "@/features/profile/lib/profile-update-payload";
import {
  useCustomerProfile,
  useUploadCustomerAvatar,
  useUpdateCustomerProfile,
} from "@/features/profile/hooks/use-customer-profile";
import type { CreateAvatarUploadUrlRequest } from "@/entities/users";

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

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES: Record<string, CreateAvatarUploadUrlRequest["contentType"]> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

export default function CustomerProfilePage() {
  const profileQuery = useCustomerProfile();
  const updateProfileMutation = useUpdateCustomerProfile();
  const uploadAvatarMutation = useUploadCustomerAvatar();
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [showValidation, setShowValidation] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

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
    uploadAvatarMutation.reset();
  }, [profileQuery.data?.userId]);

  useEffect(() => {
    if (profileQuery.data?.isNewCustomer) {
      toast.info("Complete your profile to finish first-time setup.");
    }
  }, [profileQuery.data?.isNewCustomer]);

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

      toast.success("Profile updated successfully.");
      setShowValidation(false);
    } catch {
      toast.error("Unable to update profile.");
    }
  };

  const handleAvatarSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const contentType = ALLOWED_AVATAR_TYPES[file.type];
    if (!contentType) {
      toast.error("Avatar must be a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      toast.error("Avatar must be 5MB or smaller.");
      return;
    }

    try {
      await uploadAvatarMutation.mutateAsync({ file, contentType });
      toast.success("Avatar updated successfully.");
    } catch (error) {
      toast.error(getDisplayErrorMessage(error));
    }
  };

  if (profileQuery.isPending) {
    return <ProfileLoadingState />;
  }

  if (profileQuery.isError) {
    return (
      <ProfileErrorState
        description={getDisplayErrorMessage(profileQuery.error)}
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
        .join(" ") || getDisplayErrorMessage(updateProfileMutation.error)
    : null;

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_25%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Customer profile
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Manage your account profile.
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Avatar className="h-11 w-11 rounded-2xl border border-slate-200">
                <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.fullName} className="object-cover" />
                <AvatarFallback className="rounded-2xl bg-slate-900 text-white">
                  {getAvatarFallback(profile.fullName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-semibold text-slate-900">{profile.fullName}</div>
                <div className="text-xs text-slate-500">
                  {profile.tier ?? "MEMBER"} • {profile.phone ?? "Phone not provided"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-slate-200/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <CardHeader className="border-b border-slate-200/70 bg-slate-50/80">
              <CardTitle className="text-base text-slate-900">Current profile state</CardTitle>
              <CardDescription>
                Data below comes from `GET /users/profile`.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border border-slate-200 shadow-sm">
                      <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.fullName} className="object-cover" />
                      <AvatarFallback className="bg-slate-900 text-lg font-semibold text-white">
                        {getAvatarFallback(profile.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Profile avatar</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarSelect}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      disabled={uploadAvatarMutation.isPending}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {uploadAvatarMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" />
                          Change avatar
                        </>
                      )}
                    </Button>
                    {uploadAvatarMutation.isError ? (
                      <p className="text-sm text-rose-700">
                        {getDisplayErrorMessage(uploadAvatarMutation.error)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              <InfoRow label="Full name" value={profile.fullName} />
              <InfoRow label="Phone" value={profile.phone ?? "Not provided"} />
              <InfoRow label="Email" value={profile.email ?? "Not provided"} />
              <InfoRow label="Role" value={profile.role} />
              <InfoRow label="Status" value={profile.status} />
              <InfoRow label="Tier" value={profile.tier ?? "MEMBER"} />
              <InfoRow label="Loyalty balance" value={`${profile.loyaltyBalance} points`} />
              <InfoRow label="Registered" value={formatDateTime(profile.registeredAt)} />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <CardHeader className="border-b border-slate-200/70 bg-slate-50/80">
              <CardTitle className="text-base text-slate-900">Update profile</CardTitle>
              <CardDescription>
                Full name and phone stay editable. Google-linked accounts keep their email locked.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <ProfileField
                  label="Full name"
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
                  placeholder="customer@example.com"
                  inputMode="email"
                  disabled={profile.hasGoogleAuth}
                  helperText={
                    profile.hasGoogleAuth
                      ? "Google-linked email is the primary account identifier and cannot be edited here."
                      : null
                  }
                  error={resolveFieldError(
                    "email",
                    fieldErrors.email,
                    updateProfileMutation.error?.errors,
                    showValidation,
                  )}
                />
                <ProfileField
                  label="Phone"
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
                      ? "Unsaved changes are ready to submit."
                      : "Profile is in sync with the latest fetched data."}
                  </div>
                  <Button
                    type="submit"
                    disabled={!hasChanges || hasClientErrors || updateProfileMutation.isPending}
                    className="h-11 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
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
          <CardTitle className="text-slate-900">Unable to load profile</CardTitle>
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
          <CardTitle className="text-slate-900">Profile data is empty</CardTitle>
          <CardDescription>
            The contract returned no profile payload. This state is kept explicit instead of
            falling back to mock data.
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
  disabled = false,
  helperText = null,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  error: string | null;
  inputMode?: "text" | "email" | "numeric" | "tel" | "search" | "url" | "none" | "decimal";
  disabled?: boolean;
  helperText?: string | null;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />
      {helperText ? <p className="text-sm text-slate-500">{helperText}</p> : null}
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

function getAvatarFallback(fullName: string) {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
}
