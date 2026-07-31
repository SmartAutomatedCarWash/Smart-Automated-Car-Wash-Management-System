"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { getFieldErrorMessage } from "@/shared/lib/api-errors";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { useCustomerRegister } from "@/features/auth/hooks/use-auth";
import { RegistrationConsent } from "@/features/auth/components/registration-consent";
import { emailPattern, passwordPattern } from "@/shared/lib/validators";

export function RegisterForm() {
  const router = useRouter();
  const registerMutation = useCustomerRegister();
  const getErrorMessage = useErrorMessage();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  const fieldErrors = registerMutation.error?.fieldErrors;
  const fullNameError =
    (fullName.length > 0 && fullName.trim().length === 0 ? "Full name is required." : null) ??
    getFieldErrorMessage(fieldErrors, "fullName");
  const emailError =
    (email.length > 0 && !emailPattern.test(email) ? "Email khong hop le." : null) ??
    getFieldErrorMessage(fieldErrors, "email");
  const passwordError =
    (password.length > 0 && !passwordPattern.test(password)
      ? "Mat khau can co chu hoa, chu thuong, so, ky tu dac biet va toi thieu 8 ky tu."
      : null) ?? getFieldErrorMessage(fieldErrors, "password");
  const passwordConfirmError =
    (passwordConfirm.length > 0 && passwordConfirm !== password
      ? "Mat khau xac nhan phai khop voi mat khau."
      : null) ?? getFieldErrorMessage(fieldErrors, "passwordConfirm");

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length > 0 &&
      emailPattern.test(email) &&
      passwordPattern.test(password) &&
      passwordConfirm === password &&
      hasAcceptedTerms &&
      !registerMutation.isPending
    );
  }, [email, fullName, hasAcceptedTerms, password, passwordConfirm, registerMutation.isPending]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const response = await registerMutation.mutateAsync({
      fullName: fullName.trim(),
      email,
      password,
      passwordConfirm,
    });

    router.push(`/verify-otp?email=${encodeURIComponent(response.email)}&expiresIn=${response.otpExpiresIn}`);
  };

  const errorMessage = registerMutation.error
    ? getErrorMessage(registerMutation.error)
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-bold tracking-wide text-slate-700">
            Full name
          </label>
          <div className="relative flex items-center">
            <input
              id="fullName"
              autoComplete="off"
              name="registerFullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nguyen Van A"
              className="h-12 w-full rounded-2xl border border-sky-100 bg-white/70 pl-11 pr-4 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10"
            />
            <div className="absolute left-4 flex items-center justify-center text-slate-400">
              <UserRound className="h-4 w-4" />
            </div>
          </div>
          {fullNameError ? (
            <p className="pl-1 text-xs font-semibold text-rose-600">{fullNameError}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-bold tracking-wide text-slate-700">
            Email
          </label>
          <div className="relative flex items-center">
            <input
              id="email"
              autoComplete="off"
              name="registerEmail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="h-12 w-full rounded-2xl border border-sky-100 bg-white/70 pl-11 pr-4 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10"
            />
            <div className="absolute left-4 flex items-center justify-center text-slate-400">
              <Mail className="h-4 w-4" />
            </div>
          </div>
          {emailError ? (
            <p className="pl-1 text-xs font-semibold text-rose-600">{emailError}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-bold tracking-wide text-slate-700">
            Mat khau
          </label>
          <div className="relative flex items-center">
            <input
              id="password"
              autoComplete="new-password"
              name="registerNewPassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              className="h-12 w-full rounded-2xl border border-sky-100 bg-white/70 pl-11 pr-4 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10"
            />
            <div className="absolute left-4 flex items-center justify-center text-slate-400">
              <LockKeyhole className="h-4 w-4" />
            </div>
          </div>
          {passwordError ? (
            <p className="pl-1 text-xs font-semibold text-rose-600">{passwordError}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="passwordConfirm" className="text-sm font-bold tracking-wide text-slate-700">
            Xac nhan mat khau
          </label>
          <div className="relative flex items-center">
            <input
              id="passwordConfirm"
              autoComplete="new-password"
              name="registerConfirmPassword"
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="********"
              className="h-12 w-full rounded-2xl border border-sky-100 bg-white/70 pl-11 pr-4 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10"
            />
            <div className="absolute left-4 flex items-center justify-center text-slate-400">
              <LockKeyhole className="h-4 w-4" />
            </div>
          </div>
          {passwordConfirmError ? (
            <p className="pl-1 text-xs font-semibold text-rose-600">{passwordConfirmError}</p>
          ) : null}
        </div>
      </div>

      <RegistrationConsent
        checked={hasAcceptedTerms}
        onCheckedChange={setHasAcceptedTerms}
        language="vi"
      />

      <div className="pt-2">
        <Button
          type="submit"
          disabled={!canSubmit}
          className="h-12 w-full rounded-full text-sm font-bold shadow-[0_12px_32px_rgba(37,99,235,0.24)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          {registerMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Creating account...
            </>
          ) : (
            <>
              Dang ky
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-center text-xs font-bold text-rose-600 animate-pulse">
          {errorMessage}
        </div>
      ) : null}
    </form>
  );
}
