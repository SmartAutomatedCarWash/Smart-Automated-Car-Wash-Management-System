"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  RefreshCcw,
  Shield,
  User,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { buildUpdateUserProfileRequest } from "@/features/profile/lib/profile-update-payload";
import { phonePattern } from "@/shared/lib/validators";
import { useAdminProfile, useChangeAdminPassword, useUpdateAdminProfile } from "@/features/profile/hooks/use-admin-profile";

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

type View = "profile" | "password";

const EMPTY_FORM: ProfileFormState = { fullName: "", email: "", phone: "" };
const EMPTY_PASSWORD_FORM: PasswordFormState = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function AdminProfilePage() {
  const getErrorMessage = useErrorMessage();
  const profileQuery = useAdminProfile();
  const updateProfileMutation = useUpdateAdminProfile();
  const changePasswordMutation = useChangeAdminPassword();
  const [view, setView] = useState<View>("profile");
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [showValidation, setShowValidation] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(EMPTY_PASSWORD_FORM);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, newPass: false, confirm: false });

  useEffect(() => {
    if (!profileQuery.data) return;
    setForm({
      fullName: profileQuery.data.fullName,
      email: profileQuery.data.email ?? "",
      phone: profileQuery.data.phone ?? "",
    });
    setShowValidation(false);
    updateProfileMutation.reset();
  }, [profileQuery.data?.userId]);

  const fieldErrors = useMemo(() => validateForm(form), [form]);
  const hasClientErrors = Object.values(fieldErrors).some(Boolean);
  const hasChanges = profileQuery.data
    ? form.fullName !== profileQuery.data.fullName || form.phone !== (profileQuery.data.phone ?? "")
    : false;
  const passwordErrors = useMemo(() => validatePasswordForm(passwordForm), [passwordForm]);
  const hasPasswordClientErrors = Object.values(passwordErrors).some(Boolean);

  const handleFieldChange = (field: keyof ProfileFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = field === "phone" ? event.target.value.replace(/\s/g, "") : event.target.value;
    setForm((current) => ({ ...current, [field]: next }));
    if (updateProfileMutation.isError) updateProfileMutation.reset();
  };

  const handlePasswordChange = (field: keyof PasswordFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setPasswordForm((current) => ({ ...current, [field]: event.target.value }));
    if (changePasswordMutation.isError) changePasswordMutation.reset();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowValidation(true);
    if (hasClientErrors || !hasChanges) return;
    try {
      await updateProfileMutation.mutateAsync(buildUpdateUserProfileRequest(form));
      toast.success("Đã cập nhật hồ sơ.");
      setShowValidation(false);
    } catch {
      toast.error("Không thể cập nhật hồ sơ.");
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
      setView("profile");
    } catch {
      toast.error("Không thể đổi mật khẩu.");
    }
  };

  const openPasswordView = () => {
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setShowPasswordValidation(false);
    changePasswordMutation.reset();
    setView("password");
  };

  const backToProfile = () => {
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setShowPasswordValidation(false);
    changePasswordMutation.reset();
    setView("profile");
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
          <p className="mb-4 text-sm text-rose-600">{profileQuery.isError ? getErrorMessage(profileQuery.error) : "No profile data."}</p>
          <Button onClick={() => profileQuery.refetch()} variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const profile = profileQuery.data;
  const submitMessage = updateProfileMutation.isError
    ? updateProfileMutation.error.errors?.map((error) => error.message).join(" ") || getErrorMessage(updateProfileMutation.error)
    : null;
  const passwordSubmitMessage = changePasswordMutation.isError
    ? changePasswordMutation.error.errors?.map((error) => error.message).join(" ") || getErrorMessage(changePasswordMutation.error)
    : null;

  return (
    <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(14,116,144,0.08),transparent_40%),linear-gradient(180deg,#f0fdfa_0%,#f1f5f9_100%)] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-sm">
        {view === "profile" ? (
          <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-slate-100 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 select-none items-center justify-center rounded-full bg-[#0D3B3A] text-3xl font-black tracking-tight text-white">
                {getInitials(profile.fullName)}
              </div>
              <h1 className="mt-4 text-xl font-bold text-slate-900">{profile.fullName}</h1>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-cyan-900 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                <Shield className="h-3 w-3" />
                {profile.role}
              </div>
            </div>

            <div className="mt-8">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">Thông tin cá nhân</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <ProfileField label="Họ và tên" icon={<User className="h-4 w-4 text-slate-400" />} value={form.fullName} onChange={handleFieldChange("fullName")} error={resolveFieldError("fullName", fieldErrors.fullName, updateProfileMutation.error?.errors, showValidation)} />
                <ProfileField label="Email" icon={<Mail className="h-4 w-4 text-slate-400" />} value={form.email} onChange={handleFieldChange("email")} inputMode="email" disabled hint="Email do hệ thống quản lý, không thể thay đổi" error={null} />
                <ProfileField label="Số điện thoại" icon={<Phone className="h-4 w-4 text-slate-400" />} value={form.phone} onChange={handleFieldChange("phone")} inputMode="tel" error={resolveFieldError("phone", fieldErrors.phone, updateProfileMutation.error?.errors, showValidation)} />

                <div className="mt-2 space-y-3 rounded-xl bg-slate-50 p-4">
                  <MetaLine icon={CheckCircle2} value={`STATUS: ${profile.status.toUpperCase()}`} tone="emerald" />
                  <MetaLine icon={UserRound} value={`ROLE: ${profile.role.toUpperCase()}`} />
                  <MetaLine icon={Calendar} value={`REGISTERED: ${formatDate(profile.registeredAt)}`} />
                </div>

                {submitMessage ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitMessage}</div> : null}

                <div className="mt-6 flex flex-col gap-3">
                  <Button type="submit" disabled={!hasChanges || hasClientErrors || updateProfileMutation.isPending} className="h-12 w-full rounded-full bg-[#0D3B3A] text-white hover:bg-[#155452]">
                    {updateProfileMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Lưu thay đổi
                  </Button>
                  {!profile.hasGoogleAuth ? (
                    <Button type="button" variant="outline" onClick={openPasswordView} className="h-12 w-full rounded-full border-slate-200 text-slate-700 hover:bg-slate-50">
                      <KeyRound className="mr-2 h-4 w-4" />
                      Đổi mật khẩu
                    </Button>
                  ) : null}
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-slate-100 sm:p-8">
            <div className="mb-8 flex items-center gap-3">
              <button type="button" onClick={backToProfile} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200" aria-label="Quay lại">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <KeyRound className="h-5 w-5 text-slate-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Đổi mật khẩu</h2>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <PasswordField label="Mật khẩu hiện tại" value={passwordForm.currentPassword} onChange={handlePasswordChange("currentPassword")} show={showPasswords.current} onToggle={() => setShowPasswords((passwords) => ({ ...passwords, current: !passwords.current }))} error={showPasswordValidation ? passwordErrors.currentPassword : null} />
              <PasswordField label="Mật khẩu mới" value={passwordForm.newPassword} onChange={handlePasswordChange("newPassword")} show={showPasswords.newPass} onToggle={() => setShowPasswords((passwords) => ({ ...passwords, newPass: !passwords.newPass }))} error={showPasswordValidation ? passwordErrors.newPassword : null} />
              <PasswordField label="Xác nhận mật khẩu mới" value={passwordForm.confirmPassword} onChange={handlePasswordChange("confirmPassword")} show={showPasswords.confirm} onToggle={() => setShowPasswords((passwords) => ({ ...passwords, confirm: !passwords.confirm }))} error={showPasswordValidation ? passwordErrors.confirmPassword : null} />
              {passwordSubmitMessage ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{passwordSubmitMessage}</div> : null}
              <Button type="submit" disabled={changePasswordMutation.isPending} className="h-12 w-full rounded-full bg-[#0D3B3A] text-base font-semibold text-white hover:bg-[#155452]">
                {changePasswordMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                Đổi mật khẩu
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileField({ label, icon, value, onChange, error, inputMode, disabled = false, hint }: { label: string; icon: React.ReactNode; value: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; error: string | null; inputMode?: "text" | "email" | "numeric" | "tel" | "search" | "url" | "none" | "decimal"; disabled?: boolean; hint?: string }) {
  return (
    <div className="relative mt-2">
      <label className="absolute -top-2 left-3 z-10 bg-white px-1 text-[10px] font-medium text-slate-500">{label}</label>
      <div className={`relative flex h-12 items-center rounded-xl border px-3 transition-colors ${error ? "border-rose-400" : "border-slate-200 focus-within:border-[#0D3B3A]"} ${disabled ? "bg-slate-50" : "bg-white"}`}>
        {icon}
        <input value={value} onChange={onChange} disabled={disabled} inputMode={inputMode} className="ml-3 h-full w-full bg-transparent text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:text-slate-500" />
      </div>
      {hint && !error ? <p className="mt-1 pl-1 text-[10px] text-slate-400">{hint}</p> : null}
      {error ? <p className="mt-1 pl-1 text-[10px] text-rose-500">{error}</p> : null}
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, error }: { label: string; value: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; show: boolean; onToggle: () => void; error: string | null }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-500">{label}</label>
      <div className={`flex h-14 items-center rounded-2xl border bg-white px-4 transition-colors ${error ? "border-rose-400" : "border-slate-200 focus-within:border-[#0D3B3A]"}`}>
        <Lock className="h-4 w-4 flex-shrink-0 text-slate-300" />
        <input type={show ? "text" : "password"} value={value} onChange={onChange} autoComplete="off" className="ml-3 h-full w-full bg-transparent text-sm text-slate-700 outline-none" />
        <button type="button" onClick={onToggle} className="ml-2 flex-shrink-0 text-slate-300 transition-colors hover:text-slate-500" tabIndex={-1} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="mt-1.5 pl-1 text-[11px] text-rose-500">{error}</p> : null}
    </div>
  );
}

function MetaLine({ icon: Icon, value, tone = "slate" }: { icon: typeof CheckCircle2; value: string; tone?: "emerald" | "slate" }) {
  return (
    <div className="flex items-center text-xs font-medium text-slate-600">
      <Icon className={`mr-3 h-4 w-4 ${tone === "emerald" ? "text-emerald-500" : "text-slate-400"}`} />
      {value}
    </div>
  );
}

function validateForm(form: ProfileFormState) {
  return {
    fullName: form.fullName.trim().length === 0 ? "Họ và tên là bắt buộc." : null,
    email: null,
    phone: !phonePattern.test(form.phone.trim()) ? "Số điện thoại phải đúng định dạng 0XXXXXXXXX." : null,
  };
}

function validatePasswordForm(form: PasswordFormState) {
  const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return {
    currentPassword: form.currentPassword.length === 0 ? "Vui lòng nhập mật khẩu hiện tại." : null,
    newPassword: form.newPassword.length === 0 ? "Vui lòng nhập mật khẩu mới." : !strongPasswordPattern.test(form.newPassword) ? "Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số." : null,
    confirmPassword: form.confirmPassword.length === 0 ? "Vui lòng xác nhận mật khẩu mới." : form.confirmPassword !== form.newPassword ? "Mật khẩu xác nhận không khớp." : null,
  };
}

function resolveFieldError(fieldName: string, clientError: string | null, apiErrors: { field: string; message: string }[] | undefined, showValidation: boolean) {
  if (showValidation && clientError) return clientError;
  return apiErrors?.find((error) => error.field === fieldName)?.message ?? null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getInitials(fullName: string) {
  return fullName.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "A";
}
