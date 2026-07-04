"use client";

import { FormEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import { cn } from "@/shared/lib/utils";
import { getDisplayErrorMessage, getFieldErrorMessage } from "@/shared/lib/api-errors";
import { emailPattern, otpPattern, passwordPattern } from "@/shared/lib/validators";
import {
  useForgotPasswordRequest,
  useForgotPasswordReset,
  useVerifyForgotPasswordOtp,
} from "@/features/auth/hooks/use-auth";

type Step = "email" | "verify" | "reset" | "done";

const OTP_LENGTH = 6;

export function ForgotPasswordForm() {
  const requestMutation = useForgotPasswordRequest();
  const verifyOtpMutation = useVerifyForgotPasswordOtp();
  const resetMutation = useForgotPasswordReset();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const normalizedEmail = email.trim().toLowerCase();
  const otp = otpDigits.join("");

  const requestErrorMessage = requestMutation.error ? getDisplayErrorMessage(requestMutation.error) : null;
  const verifyErrorMessage = verifyOtpMutation.error ? getDisplayErrorMessage(verifyOtpMutation.error) : null;
  const resetErrorMessage = resetMutation.error ? getDisplayErrorMessage(resetMutation.error) : null;
  const fieldErrors = resetMutation.error?.fieldErrors;

  const emailError =
    email.length > 0 && !emailPattern.test(normalizedEmail) ? "Enter a valid email address." : null;
  const otpError =
    otp.length > 0 && !otpPattern.test(otp)
      ? "OTP must be exactly 6 digits."
      : getFieldErrorMessage(fieldErrors, "otp");
  const passwordError =
    newPassword.length > 0 && !passwordPattern.test(newPassword)
      ? "Use 8+ characters with uppercase, lowercase, number, and symbol."
      : getFieldErrorMessage(fieldErrors, "newPassword");
  const confirmError =
    newPasswordConfirm.length > 0 && newPasswordConfirm !== newPassword
      ? "Password confirmation does not match."
      : getFieldErrorMessage(fieldErrors, "newPasswordConfirm");

  const canRequest = emailPattern.test(normalizedEmail) && !requestMutation.isPending;
  const canVerify = otpPattern.test(otp) && secondsLeft > 0 && !verifyOtpMutation.isPending;
  const canReset =
    passwordPattern.test(newPassword) &&
    newPasswordConfirm === newPassword &&
    !resetMutation.isPending;

  useEffect(() => {
    if (!otpExpiresAt) {
      setSecondsLeft(0);
      return;
    }

    const updateTimer = () => {
      setSecondsLeft(Math.max(Math.ceil((otpExpiresAt - Date.now()) / 1000), 0));
    };

    updateTimer();
    const timerId = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timerId);
  }, [otpExpiresAt]);

  const startOtpFlow = (response: { email: string; maskedEmail?: string; otpExpiresIn: number; devOtp?: string | null }) => {
    setMaskedEmail(response.maskedEmail ?? response.email);
    setOtpExpiresAt(Date.now() + response.otpExpiresIn * 1000);
    setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
    setDevOtp(response.devOtp ?? null);
    setStep("verify");
    window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
  };

  const handleRequestOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canRequest) return;
    const response = await requestMutation.mutateAsync({ email: normalizedEmail });
    startOtpFlow(response);
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canVerify) return;
    await verifyOtpMutation.mutateAsync({ email: normalizedEmail, otp });
    setStep("reset");
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canReset) return;
    await resetMutation.mutateAsync({
      email: normalizedEmail,
      otp,
      newPassword,
      newPasswordConfirm,
    });
    setSuccessMessage("Your password has been changed. You can sign in with the new password now.");
    setStep("done");
  };

  const handleResendOtp = async () => {
    if (!emailPattern.test(normalizedEmail) || requestMutation.isPending) return;
    const response = await requestMutation.mutateAsync({ email: normalizedEmail });
    startOtpFlow(response);
  };

  const updateOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtpDigits((current) => current.map((item, itemIndex) => (itemIndex === index ? digit : item)));
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (value: string) => {
    const nextDigits = value.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
    if (nextDigits.length === 0) return;
    setOtpDigits(Array.from({ length: OTP_LENGTH }, (_, index) => nextDigits[index] ?? ""));
    otpRefs.current[Math.min(nextDigits.length, OTP_LENGTH) - 1]?.focus();
  };

  if (step === "done") {
    return (
      <div className="space-y-7 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Password reset complete</h2>
          <p className="mx-auto max-w-md text-sm leading-6 text-slate-600">{successMessage}</p>
        </div>
        <Button asChild size="lg" className="h-12 rounded-md px-8">
          <Link href="/login">
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-3 gap-2 text-xs font-bold text-slate-500">
        <StepPill active={step === "email"} complete={step !== "email"} label="Email" />
        <StepPill active={step === "verify"} complete={step === "reset"} label="OTP" />
        <StepPill active={step === "reset"} complete={false} label="Done" />
      </div>

      {step === "email" ? (
        <form onSubmit={handleRequestOtp} className="space-y-5">
          <FieldShell label="Account email" htmlFor="forgot-email" error={emailError}>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="forgot-email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value.replace(/\s/g, ""))}
                placeholder="Enter your email"
                className="h-12 rounded-md border-slate-200 bg-slate-50 pl-10 text-base shadow-none focus:bg-white"
              />
            </div>
          </FieldShell>

          {requestErrorMessage ? <ErrorText message={requestErrorMessage} /> : null}

          <Button
            type="submit"
            size="lg"
            disabled={!canRequest}
            className="h-12 w-full rounded-md bg-slate-950 text-base text-white hover:bg-slate-800"
          >
            {requestMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending OTP
              </>
            ) : (
              <>
                Send reset OTP
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      ) : null}

      {step === "verify" ? (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            OTP was sent to <strong className="text-slate-900">{maskedEmail || normalizedEmail}</strong>.
            {secondsLeft > 0 ? (
              <span className="ml-1">Expires in {secondsLeft}s.</span>
            ) : (
              <span className="ml-1 font-semibold text-rose-600">The code expired.</span>
            )}
            {devOtp ? <div className="mt-1 font-mono text-xs text-slate-500">Dev OTP: {devOtp}</div> : null}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">OTP code</Label>
            <div className="grid grid-cols-6 gap-2">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    otpRefs.current[index] = element;
                  }}
                  aria-label={`OTP digit ${index + 1}`}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => updateOtpDigit(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(event, index)}
                  onPaste={(event) => {
                    event.preventDefault();
                    handleOtpPaste(event.clipboardData.getData("text"));
                  }}
                  className="aspect-square min-h-12 rounded-md border border-slate-200 bg-slate-50 text-center font-mono text-xl font-black text-slate-950 shadow-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              ))}
            </div>
            {otpError ? <p className="text-sm text-rose-600">{otpError}</p> : null}
          </div>

          {verifyErrorMessage ? <ErrorText message={verifyErrorMessage} /> : null}
          {requestErrorMessage ? <ErrorText message={requestErrorMessage} /> : null}

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Button
              type="submit"
              size="lg"
              disabled={!canVerify}
              className="h-12 rounded-md bg-slate-950 text-base text-white hover:bg-slate-800"
            >
              {verifyOtpMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying OTP
                </>
              ) : (
                <>
                  Verify OTP
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={requestMutation.isPending || !emailPattern.test(normalizedEmail)}
              onClick={handleResendOtp}
              className="h-12 rounded-md"
            >
              {requestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Resend
            </Button>
          </div>

          <button
            type="button"
            onClick={() => {
              setStep("email");
              verifyOtpMutation.reset();
              resetMutation.reset();
              requestMutation.reset();
            }}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Change email
          </button>
        </form>
      ) : null}

      {step === "reset" ? (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div className="rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
            OTP verified for <strong>{maskedEmail || normalizedEmail}</strong>. You can now set a new password.
          </div>

          <FieldShell label="New password" htmlFor="new-password" error={passwordError}>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="new-password"
                autoComplete="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                className="h-12 rounded-md border-slate-200 bg-slate-50 pl-10 text-base shadow-none focus:bg-white"
              />
            </div>
          </FieldShell>

          <FieldShell label="Confirm new password" htmlFor="new-password-confirm" error={confirmError}>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="new-password-confirm"
                autoComplete="new-password"
                type="password"
                value={newPasswordConfirm}
                onChange={(event) => setNewPasswordConfirm(event.target.value)}
                placeholder="Confirm new password"
                className="h-12 rounded-md border-slate-200 bg-slate-50 pl-10 text-base shadow-none focus:bg-white"
              />
            </div>
          </FieldShell>

          {resetErrorMessage ? <ErrorText message={resetErrorMessage} /> : null}

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Button
              type="submit"
              size="lg"
              disabled={!canReset}
              className="h-12 rounded-md bg-slate-950 text-base text-white hover:bg-slate-800"
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating password
                </>
              ) : (
                <>
                  Reset password
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <Button type="button" variant="outline" size="lg" disabled className="h-12 rounded-md opacity-60">
              <RotateCcw className="h-4 w-4" />
              Resend
            </Button>
          </div>

          <button
            type="button"
            onClick={() => {
              setStep("verify");
              resetMutation.reset();
            }}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to OTP
          </button>
        </form>
      ) : null}
    </div>
  );
}

function StepPill({ active, complete, label }: { active: boolean; complete: boolean; label: string }) {
  return (
    <div
      className={cn(
        "flex h-10 items-center justify-center rounded-md border text-center transition",
        active && "border-sky-200 bg-sky-50 text-sky-800",
        complete && "border-emerald-200 bg-emerald-50 text-emerald-700",
        !active && !complete && "border-slate-200 bg-white text-slate-400",
      )}
    >
      {label}
    </div>
  );
}

function FieldShell({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
        {label}
      </Label>
      {children}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

function ErrorText({ message }: { message: string }) {
  return <div className="rounded-md border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{message}</div>;
}
