"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Eye, EyeOff, KeyRound, Loader2, Lock, RefreshCcw, User, Mail, Phone, CheckCircle2, UserPlus, Calendar, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { validateProfileForm } from "@/features/profile/lib/profile-form-validation";
import { buildUpdateUserProfileRequest } from "@/features/profile/lib/profile-update-payload";
import {
  useCustomerProfile,
  useUploadCustomerAvatar,
  useUpdateCustomerProfile,
  useChangeCustomerPassword,
} from "@/features/profile/hooks/use-customer-profile";
import type { CreateAvatarUploadUrlRequest } from "@/entities/users";

type ProfileFormState = {
  fullName: string;
  email: string;
  phone: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY_FORM: ProfileFormState = {
  fullName: "",
  email: "",
  phone: "",
};

const EMPTY_PASSWORD_FORM: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES: Record<string, CreateAvatarUploadUrlRequest["contentType"]> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

export default function CustomerProfilePage() {
  const getErrorMessage = useErrorMessage();
  const profileQuery = useCustomerProfile();
  const updateProfileMutation = useUpdateCustomerProfile();
  const uploadAvatarMutation = useUploadCustomerAvatar();
  const changePasswordMutation = useChangeCustomerPassword();
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [showValidation, setShowValidation] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(EMPTY_PASSWORD_FORM);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, newPass: false, confirm: false });
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!profileQuery.data) return;
    setForm({
      fullName: profileQuery.data.fullName,
      email: profileQuery.data.email ?? "",
      phone: profileQuery.data.phone ?? "",
    });
    setShowValidation(false);
    updateProfileMutation.reset();
    uploadAvatarMutation.reset();
  }, [profileQuery.data?.userId]);

  const fieldErrors = useMemo(() => validateProfileForm(form), [form]);
  const hasClientErrors = Object.values(fieldErrors).some(Boolean);
  const hasChanges = profileQuery.data
    ? form.fullName !== profileQuery.data.fullName ||
      form.email !== (profileQuery.data.email ?? "") ||
      form.phone !== (profileQuery.data.phone ?? "")
    : false;

  const passwordErrors = useMemo(() => validatePasswordForm(passwordForm), [passwordForm]);
  const hasPasswordClientErrors = Object.values(passwordErrors).some(Boolean);

  const handleFieldChange =
    (field: keyof ProfileFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue =
        field === "phone" ? event.target.value.replace(/\s/g, "") : event.target.value;
      setForm((current) => ({ ...current, [field]: nextValue }));
      if (updateProfileMutation.isError) updateProfileMutation.reset();
    };

  const handlePasswordChange =
    (field: keyof PasswordFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setPasswordForm((cur) => ({ ...cur, [field]: event.target.value }));
      if (changePasswordMutation.isError) changePasswordMutation.reset();
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowValidation(true);
    if (hasClientErrors || !hasChanges) return;
    try {
      await updateProfileMutation.mutateAsync(buildUpdateUserProfileRequest(form));
      toast.success("Profile updated successfully.");
      setShowValidation(false);
    } catch {
      toast.error("Unable to update profile.");
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowPasswordValidation(true);
    if (hasPasswordClientErrors) return;
    try {
      await changePasswordMutation.mutateAsync(passwordForm);
      toast.success("Đã đổi mật khẩu thành công.");
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setShowPasswordValidation(false);
      changePasswordMutation.reset();
    } catch {
      toast.error("Không thể đổi mật khẩu.");
    }
  };

  const handleAvatarSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
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
      toast.error(getErrorMessage(error));
    }
  };

  if (profileQuery.isPending) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="mb-4 text-sm text-rose-600">Unable to load profile.</p>
          <Button onClick={() => profileQuery.refetch()} variant="outline"><RefreshCcw className="mr-2 h-4 w-4"/> Thử lại</Button>
        </div>
      </div>
    );
  }

  const profile = profileQuery.data;
  const initials = getAvatarFallback(profile.fullName);

  const passwordSubmitMessage = changePasswordMutation.isError
    ? changePasswordMutation.error.errors?.map((e) => e.message).join(" ") ||
      getErrorMessage(changePasswordMutation.error)
    : null;

  return (
    <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_40%),linear-gradient(180deg,#f8fbff_0%,#f1f5f9_100%)] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-sm space-y-4">
        {/* ── Profile Card ── */}
        <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 sm:p-8">
        
        {/* Top Section: Avatar & Info */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.fullName} className="h-24 w-24 rounded-full bg-slate-100 object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#1A2E35] text-3xl font-bold tracking-tight text-white">
                {initials}
              </div>
            )}
            
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarSelect}
            />
            <button 
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadAvatarMutation.isPending}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#0D3B3A] text-white shadow-sm transition hover:bg-[#155452] disabled:opacity-70"
            >
              {uploadAvatarMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
          </div>
          
          <h1 className="mt-4 text-xl font-bold text-slate-900">{profile.fullName}</h1>
          
          <div className="mt-2 inline-flex items-center rounded-full bg-[#8C5A3C] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            {profile.tier ?? "BRONZE"}
          </div>
        </div>

        {/* Bottom Section: Form */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Thông tin cá nhân</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <ProfileField
              label="Họ và tên"
              icon={<User className="h-4 w-4 text-slate-400" />}
              value={form.fullName}
              onChange={handleFieldChange("fullName")}
              error={resolveFieldError("fullName", fieldErrors.fullName, updateProfileMutation.error?.errors, showValidation)}
            />
            
            <ProfileField
              label="Email"
              icon={<Mail className="h-4 w-4 text-slate-400" />}
              value={form.email}
              onChange={handleFieldChange("email")}
              disabled={profile.hasGoogleAuth}
              hint={profile.hasGoogleAuth ? "Email được quản lý bởi Google" : undefined}
              error={resolveFieldError("email", fieldErrors.email, updateProfileMutation.error?.errors, showValidation)}
            />
            
            <ProfileField
              label="Số điện thoại"
              icon={<Phone className="h-4 w-4 text-slate-400" />}
              value={form.phone}
              onChange={handleFieldChange("phone")}
              error={resolveFieldError("phone", fieldErrors.phone, updateProfileMutation.error?.errors, showValidation)}
            />
            
            <div className="mt-6 space-y-3 rounded-xl bg-slate-100/50 p-4">
              <div className="flex items-center text-xs font-medium text-slate-600">
                <CheckCircle2 className="mr-3 h-4 w-4 text-emerald-500" />
                STATUS: {profile.status.toUpperCase()}
              </div>
              <div className="flex items-center text-xs font-medium text-slate-600">
                <UserPlus className="mr-3 h-4 w-4 text-slate-400" />
                ROLE: {profile.role.toUpperCase()}
              </div>
              <div className="flex items-center text-xs font-medium text-slate-600">
                <Calendar className="mr-3 h-4 w-4 text-slate-400" />
                REGISTERED: {formatDateTime(profile.registeredAt)}
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-4 text-center">
              <p className="text-[11px] text-slate-400">
                {hasChanges ? "Có thay đổi chưa lưu." : "Hồ sơ đang đồng bộ."}
              </p>
              
              <Button
                type="submit"
                disabled={!hasChanges || hasClientErrors || updateProfileMutation.isPending}
                className="h-12 w-full rounded-full bg-[#0D3B3A] text-white hover:bg-[#155452]"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Lưu thay đổi hồ sơ
              </Button>
            </div>
          </form>
        </div>
        </div>

        {/* ── Change Password Card ── */}
        {!profile.hasGoogleAuth && (
          <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                <KeyRound className="h-4 w-4 text-slate-600" />
              </div>
              <h2 className="text-sm font-semibold text-slate-800">Đổi mật khẩu</h2>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <PasswordField
                label="Mật khẩu hiện tại"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange("currentPassword")}
                show={showPasswords.current}
                onToggle={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
                error={showPasswordValidation ? passwordErrors.currentPassword : null}
              />
              <PasswordField
                label="Mật khẩu mới"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange("newPassword")}
                show={showPasswords.newPass}
                onToggle={() => setShowPasswords((p) => ({ ...p, newPass: !p.newPass }))}
                error={showPasswordValidation ? passwordErrors.newPassword : null}
              />
              <PasswordField
                label="Xác nhận mật khẩu mới"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange("confirmPassword")}
                show={showPasswords.confirm}
                onToggle={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}
                error={showPasswordValidation ? passwordErrors.confirmPassword : null}
              />

              {passwordSubmitMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {passwordSubmitMessage}
                </div>
              )}

              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="h-12 w-full rounded-full bg-[#0D3B3A] text-white hover:bg-[#155452]"
              >
                {changePasswordMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Đổi mật khẩu
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileField({
  label,
  icon,
  value,
  onChange,
  error,
  disabled = false,
  hint,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="relative mt-2">
      <label className="absolute -top-2 left-3 z-10 bg-white px-1 text-[10px] font-medium text-slate-500">
        {label}
      </label>
      <div className={`relative flex h-12 items-center rounded-xl border px-3 transition-colors ${error ? 'border-rose-400' : 'border-slate-200 focus-within:border-[#0D3B3A]'} ${disabled ? 'bg-slate-50' : 'bg-white'}`}>
        {icon}
        <input
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="ml-3 h-full w-full bg-transparent text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:text-slate-500"
        />
      </div>
      {hint && !error && <p className="mt-1 pl-1 text-[10px] text-slate-400">{hint}</p>}
      {error && <p className="mt-1 pl-1 text-[10px] text-rose-500">{error}</p>}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  error,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  show: boolean;
  onToggle: () => void;
  error: string | null;
}) {
  return (
    <div className="relative mt-2">
      <label className="absolute -top-2 left-3 z-10 bg-white px-1 text-[10px] font-medium text-slate-500">
        {label}
      </label>
      <div
        className={`relative flex h-12 items-center rounded-xl border px-3 transition-colors ${
          error ? "border-rose-400" : "border-slate-200 focus-within:border-[#0D3B3A]"
        } bg-white`}
      >
        <Lock className="h-4 w-4 text-slate-400" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete="off"
          className="ml-3 h-full w-full bg-transparent text-sm text-slate-700 outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          className="ml-2 flex-shrink-0 text-slate-400 hover:text-slate-600"
          tabIndex={-1}
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1 pl-1 text-[10px] text-rose-500">{error}</p>}
    </div>
  );
}

function validatePasswordForm(form: PasswordFormState) {
  const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return {
    currentPassword: form.currentPassword.length === 0 ? "Vui lòng nhập mật khẩu hiện tại." : null,
    newPassword:
      form.newPassword.length === 0
        ? "Vui lòng nhập mật khẩu mới."
        : !strongPasswordPattern.test(form.newPassword)
          ? "Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số."
          : null,
    confirmPassword:
      form.confirmPassword.length === 0
        ? "Vui lòng xác nhận mật khẩu mới."
        : form.confirmPassword !== form.newPassword
          ? "Mật khẩu xác nhận không khớp."
          : null,
  };
}

function resolveFieldError(
  fieldName: string,
  clientError: string | null,
  apiErrors: { field: string; message: string }[] | undefined,
  showValidation: boolean,
) {
  if (showValidation && clientError) return clientError;
  return apiErrors?.find((item) => item.field === fieldName)?.message ?? null;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

