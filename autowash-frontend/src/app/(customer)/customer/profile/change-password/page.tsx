"use client";

import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useChangeCustomerPassword } from "@/features/profile/hooks/use-customer-profile";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { Button } from "@/shared/ui/ui/button";

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY_PASSWORD_FORM: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function CustomerChangePasswordPage() {
  const getErrorMessage = useErrorMessage();
  const changePasswordMutation = useChangeCustomerPassword();
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(EMPTY_PASSWORD_FORM);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, newPass: false, confirm: false });

  const passwordErrors = useMemo(() => validatePasswordForm(passwordForm), [passwordForm]);
  const hasPasswordClientErrors = Object.values(passwordErrors).some(Boolean);

  const handlePasswordChange =
    (field: keyof PasswordFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setPasswordForm((current) => ({ ...current, [field]: event.target.value }));
      if (changePasswordMutation.isError) changePasswordMutation.reset();
    };

  const passwordSubmitMessage = changePasswordMutation.isError
    ? changePasswordMutation.error.errors?.map((error) => error.message).join(" ") ||
      getErrorMessage(changePasswordMutation.error)
    : null;

  return (
    <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_40%),linear-gradient(180deg,#f8fbff_0%,#f1f5f9_100%)] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 sm:p-8">
        <Button asChild variant="ghost" className="mb-4 -ml-3 text-slate-500 hover:text-slate-900">
          <Link href="/customer/profile">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Link>
        </Button>

        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <KeyRound className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Change Password</h1>
            <p className="text-sm text-slate-500">Enter your current password and choose a new secure password.</p>
          </div>
        </div>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setShowPasswordValidation(true);
            if (hasPasswordClientErrors) return;
            try {
              await changePasswordMutation.mutateAsync(passwordForm);
              toast.success("Password changed successfully.");
              setPasswordForm(EMPTY_PASSWORD_FORM);
              setShowPasswordValidation(false);
              changePasswordMutation.reset();
            } catch {
              toast.error("Unable to change password.");
            }
          }}
          className="space-y-4"
        >
          <PasswordField
            label="Current Password"
            value={passwordForm.currentPassword}
            onChange={handlePasswordChange("currentPassword")}
            show={showPasswords.current}
            onToggle={() => setShowPasswords((current) => ({ ...current, current: !current.current }))}
            error={showPasswordValidation ? passwordErrors.currentPassword : null}
          />
          <PasswordField
            label="New Password"
            value={passwordForm.newPassword}
            onChange={handlePasswordChange("newPassword")}
            show={showPasswords.newPass}
            onToggle={() => setShowPasswords((current) => ({ ...current, newPass: !current.newPass }))}
            error={showPasswordValidation ? passwordErrors.newPassword : null}
          />
          <PasswordField
            label="Confirm New Password"
            value={passwordForm.confirmPassword}
            onChange={handlePasswordChange("confirmPassword")}
            show={showPasswords.confirm}
            onToggle={() => setShowPasswords((current) => ({ ...current, confirm: !current.confirm }))}
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
            Change Password
          </Button>
        </form>
      </div>
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
          aria-label={show ? "Hide password" : "Show password"}
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
    currentPassword: form.currentPassword.length === 0 ? "Please enter your current password." : null,
    newPassword:
      form.newPassword.length === 0
        ? "Please enter a new password."
        : !strongPasswordPattern.test(form.newPassword)
          ? "Password must be at least 8 characters and include uppercase, lowercase, and a number."
          : null,
    confirmPassword:
      form.confirmPassword.length === 0
        ? "Please confirm your new password."
        : form.confirmPassword !== form.newPassword
          ? "Confirmation password does not match."
          : null,
  };
}
