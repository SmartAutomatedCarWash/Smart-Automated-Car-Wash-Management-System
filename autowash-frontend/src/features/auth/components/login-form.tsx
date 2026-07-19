"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, LockKeyhole, Sparkles, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/ui/button";
import { Checkbox } from "@/shared/ui/ui/checkbox";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { getAuthRedirectPath } from "@/features/auth/lib/auth-session";
import { getLoginIdentifierValidationMessage, normalizeLoginIdentifier } from "@/features/auth/lib/login-identifier";
import { useCustomerLogin } from "@/features/auth/hooks/use-auth";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { cn } from "@/shared/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const loginMutation = useCustomerLogin();
  const getErrorMessage = useErrorMessage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  const errorMessage = useMemo(() => {
    return loginMutation.error ? getErrorMessage(loginMutation.error) : null;
  }, [getErrorMessage, loginMutation.error]);

  useEffect(() => {
    if (accessToken && user) {
      router.replace(getAuthRedirectPath(user.role));
    }
  }, [accessToken, router, user]);

  const normalizedEmail = normalizeLoginIdentifier(email);
  const emailValidationMessage = getLoginIdentifierValidationMessage(normalizedEmail);
  const passwordValidationMessage =
    password.length > 0 && password.length < 8 ? "Mat khau phai co it nhat 8 ky tu." : null;

  const canSubmit = emailValidationMessage === null && password.length >= 8 && !loginMutation.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (emailValidationMessage !== null || password.length < 8) {
      return;
    }

    loginMutation.mutate({
      email: normalizedEmail,
      password,
      rememberMe,
    });
  };

  const handleContinueWithGoogle = () => {
    const returnUrl = `${window.location.origin}/auth/google/callback`;
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1"}/auth/google/start?returnUrl=${encodeURIComponent(returnUrl)}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="email" className="text-sm font-semibold text-foreground">
          Email
        </Label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="email"
            autoComplete="username"
            inputMode="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value.replace(/\s/g, ""))}
            placeholder="Enter email"
            className="h-12 rounded-xl border-slate-200 bg-slate-50/70 pl-10 text-base shadow-none transition focus:border-sky-400 focus:bg-white focus:ring-sky-200"
          />
        </div>
        {emailValidationMessage ? <p className="text-sm text-rose-600">{emailValidationMessage}</p> : null}
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
            Mat khau
          </Label>
          <Link href="/forgot-password" className="text-xs font-bold text-sky-700 transition hover:text-sky-900 hover:underline">
            Quen mat khau?
          </Link>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="password"
            autoComplete="current-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
            className="h-12 rounded-xl border-slate-200 bg-slate-50/70 pl-10 text-base shadow-none transition focus:border-sky-400 focus:bg-white focus:ring-sky-200"
          />
        </div>
        {passwordValidationMessage ? <p className="text-sm text-rose-600">{passwordValidationMessage}</p> : null}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(Boolean(checked))} />
          Ghi nho dang nhap
        </label>
        <Link href="/register" className="text-sm font-semibold text-sky-700 hover:text-sky-800">
          Tao tai khoan
        </Link>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50 p-4 text-sm text-slate-600">
        <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-sky-600" />
          Dang nhap bang email
        </div>
        <div>Sau khi dang nhap, he thong tu chuyen den khu vuc khach hang.</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hoac tiep tuc voi</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      <button
        type="button"
        onClick={handleContinueWithGoogle}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <GoogleIcon />
        Dang nhap bang Google
      </button>

      <Button
        type="submit"
        size="lg"
        disabled={!canSubmit}
        className={cn(
          "h-12 w-full rounded-xl bg-slate-900 text-base font-semibold text-white shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800",
          "disabled:translate-y-0 disabled:shadow-none",
        )}
      >
        {loginMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Dang dang nhap...
          </>
        ) : (
          <>
            Dang nhap
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>

      {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
    </form>
  );
}

function GoogleIcon() {
  return (
    <span className="flex h-6 w-6 items-center justify-center">
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#4285F4" d="M21.35 11.1H12v2.96h5.35c-.23 1.38-1.02 2.55-2.17 3.34v2.77h3.52c2.06-1.9 3.25-4.69 3.25-8.02 0-.77-.07-1.52-.21-2.25z" />
        <path fill="#34A853" d="M12 22c2.94 0 5.4-.97 7.2-2.63l-3.52-2.77c-.98.66-2.23 1.05-3.68 1.05-2.83 0-5.24-1.91-6.1-4.48H2.28v2.84C4.07 19.91 7.77 22 12 22z" />
        <path fill="#FBBC05" d="M5.9 13.17A6.96 6.96 0 0 1 5.5 11c0-.75.13-1.48.36-2.17V6.0H2.28A10 10 0 0 0 2 11c0 1.62.39 3.15 1.08 4.5l2.82-2.33z" />
        <path fill="#EA4335" d="M12 4.24c1.6 0 3.03.55 4.16 1.63l3.11-3.11C17.4 1.03 14.94 0 12 0 7.77 0 4.07 2.09 2.28 5.5l3.62 2.83C6.76 6.15 9.17 4.24 12 4.24z" />
      </svg>
    </span>
  );
}
