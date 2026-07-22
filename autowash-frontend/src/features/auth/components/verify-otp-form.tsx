"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { getFieldErrorMessage } from "@/shared/lib/api-errors";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { useSendCustomerOtp, useVerifyCustomerOtp } from "@/features/auth/hooks/use-auth";
import { emailPattern, otpPattern } from "@/shared/lib/validators";
import { cn } from "@/shared/lib/utils";

const OTP_LENGTH = 6;

export function VerifyOtpForm({
  autoSend,
  initialEmail,
  initialExpiresIn,
}: {
  autoSend: boolean;
  initialEmail: string;
  initialExpiresIn: number;
}) {
  const getErrorMessage = useErrorMessage();
  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(initialEmail ? initialExpiresIn : 0);
  const [verifying, setVerifying] = useState(false);
  const [lastOtpExpiry, setLastOtpExpiry] = useState<number | null>(
    initialEmail ? Date.now() + initialExpiresIn * 1000 : null,
  );
  const hasAutoSentRef = useRef(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const sendOtpMutation = useSendCustomerOtp();
  const verifyOtpMutation = useVerifyCustomerOtp();

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (!lastOtpExpiry) {
      return undefined;
    }

    const syncTimer = () => {
      const nextSecondsLeft = Math.max(0, Math.ceil((lastOtpExpiry - Date.now()) / 1000));
      setSecondsLeft(nextSecondsLeft);
    };

    syncTimer();
    const timer = setInterval(syncTimer, 1000);
    return () => clearInterval(timer);
  }, [lastOtpExpiry]);

  const otp = digits.join("");
  const expired = secondsLeft === 0 && lastOtpExpiry !== null;
  const ready = otpPattern.test(otp) && emailPattern.test(email) && !expired;

  const emailError =
    (email.length > 0 && !emailPattern.test(email) ? "Email không hợp lệ." : null) ??
    getFieldErrorMessage(sendOtpMutation.error?.fieldErrors, "email");
  const otpError =
    (otp.length > 0 && !otpPattern.test(otp) ? "OTP must be exactly 6 digits." : null) ??
    getFieldErrorMessage(verifyOtpMutation.error?.fieldErrors, "otp");
  const sendErrorMessage = useMemo(() => {
    return sendOtpMutation.error ? getErrorMessage(sendOtpMutation.error) : null;
  }, [sendOtpMutation.error]);
  const verifyErrorMessage = useMemo(() => {
    return verifyOtpMutation.error ? getErrorMessage(verifyOtpMutation.error) : null;
  }, [verifyOtpMutation.error]);

  const handleDigitChange = (index: number, value: string) => {
    const nextDigit = value.replace(/\D/g, "").slice(-1);

    setDigits((prev) => {
      const next = [...prev];
      next[index] = nextDigit;
      return next;
    });

    if (nextDigit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    event.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    for (let index = 0; index < pasted.length; index += 1) {
      next[index] = pasted[index];
    }
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleSendOtp = useCallback(async () => {
    if (!emailPattern.test(email)) {
      return;
    }

    const response = await sendOtpMutation.mutateAsync({ email });
    setLastOtpExpiry(Date.now() + response.otpExpiresIn * 1000);
    setDigits(Array(OTP_LENGTH).fill(""));
    inputRefs.current[0]?.focus();
  }, [email, sendOtpMutation]);

  useEffect(() => {
    if (!autoSend || hasAutoSentRef.current || !emailPattern.test(email)) {
      return;
    }

    hasAutoSentRef.current = true;
    handleSendOtp().catch(() => undefined);
  }, [autoSend, handleSendOtp, email]);

  const handleVerify = async () => {
    if (!ready) {
      return;
    }

    setVerifying(true);
    try {
      await verifyOtpMutation.mutateAsync({ email, otp });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 shadow-[0_10px_30px_rgba(59,130,246,0.1)] ring-1 ring-sky-100">
          <ShieldCheck className="h-7 w-7" />
        </div>
      </div>

      <div className="space-y-2 text-center">
        <h3 className="text-xl font-bold tracking-tight text-slate-900">Enter OTP Code</h3>
        <p className="text-sm leading-6 text-slate-600">
          Enter the 6-digit OTP sent to <span className="font-semibold text-slate-900">{email || "your email"}</span> to activate the account.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-bold tracking-wide text-slate-700">
          Email
        </label>
        <input
          id="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value.trim())}
          className="h-12 w-full rounded-2xl border border-sky-100 bg-white/70 px-4 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition-all duration-300 placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10"
          placeholder="name@example.com"
        />
        {emailError ? <p className="text-xs font-semibold text-rose-600 pl-1">{emailError}</p> : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold tracking-wide text-slate-700">6-Digit Code</label>
        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              value={digit}
              onChange={(event) => handleDigitChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onFocus={(event) => event.currentTarget.select()}
              inputMode="numeric"
              pattern="[0-9]*"
              className={cn(
                "h-12 w-10 rounded-xl border text-center text-xl font-semibold shadow-sm transition sm:h-14 sm:w-12 duration-300",
                "focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-500/10",
                digit ? "border-sky-300 bg-sky-50 text-slate-900" : "border-sky-100 bg-white/70",
              )}
            />
          ))}
        </div>
        {otpError ? <p className="text-center text-xs font-semibold text-rose-600 mt-1">{otpError}</p> : null}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-white/60 p-4 text-sm">
        <div className="text-slate-600">
          {secondsLeft > 0 ? (
            <>
              OTP expires in <span className="font-semibold text-slate-900">{secondsLeft}s</span>
            </>
          ) : (
            <span className="font-medium text-slate-500">You can resend a new code now.</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleSendOtp()}
          disabled={sendOtpMutation.isPending || !emailPattern.test(email)}
          className="font-semibold text-sky-700 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200"
        >
          {sendOtpMutation.isPending ? "Sending..." : "Resend code"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 rounded-full border-sky-100 bg-white/70 text-slate-700 hover:bg-sky-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          asChild
        >
          <Link href="/register" className="inline-flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>

        <Button
          type="button"
          size="lg"
          disabled={!ready || verifying}
          onClick={handleVerify}
          className="h-12 rounded-full text-base font-bold shadow-[0_12px_32px_rgba(37,99,235,0.24)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          {verifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify & Complete"
          )}
        </Button>
      </div>

      {sendErrorMessage ? (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center text-xs font-bold text-rose-600">
          {sendErrorMessage}
        </div>
      ) : null}
      {verifyErrorMessage ? (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center text-xs font-bold text-rose-600">
          {verifyErrorMessage}
        </div>
      ) : null}
    </div>
  );
}
