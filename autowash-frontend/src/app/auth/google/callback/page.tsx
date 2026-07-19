"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { buildAuthSession, getAuthRedirectPath } from "@/features/auth/lib/auth-session";
import {
  confirmGoogleAuthLink,
  exchangeGoogleAuthTicket,
  getGoogleAuthTicket,
} from "@/features/auth/lib/auth-service";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { setAuthSession } from "@/features/auth/store/auth.store";
import type { GoogleAuthTicketResponse } from "@/entities/auth";

export default function GoogleAuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoadingScreen />}>
      <GoogleAuthCallbackContent />
    </Suspense>
  );
}

function GoogleAuthCallbackContent() {
  const router = useRouter();
  const getErrorMessage = useErrorMessage();
  const searchParams = useSearchParams();
  const state = searchParams.get("state");
  const callbackStatus = searchParams.get("status");
  const callbackError = searchParams.get("error");
  const [ticket, setTicket] = useState<GoogleAuthTicketResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const exchangeStartedRef = useRef(false);

  useEffect(() => {
    if (callbackStatus === "error") {
      setIsLoading(false);
      setErrorMessage(callbackError ?? "Google login failed.");
      return;
    }

    if (!state) {
      setIsLoading(false);
      setErrorMessage("Missing Google ticket state.");
      return;
    }

    void getGoogleAuthTicket(state)
      .then((response) => {
        setTicket(response);
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [callbackError, callbackStatus, state]);

  useEffect(() => {
    if (!state || !ticket || ticket.expired || ticket.status !== "READY") {
      return;
    }

    if (exchangeStartedRef.current) {
      return;
    }

    exchangeStartedRef.current = true;

    void exchangeGoogleAuthTicket(state)
      .then((response) => {
        setAuthSession(buildAuthSession(response));
        const nextPath = getAuthRedirectPath(response.role);
        window.location.replace(nextPath);
      })
      .catch((error) => {
        exchangeStartedRef.current = false;
        setErrorMessage(getErrorMessage(error));
      });
  }, [state, ticket]);

  const handleConfirmLink = async () => {
    if (!state) {
      return;
    }

    setIsConfirming(true);
    try {
      const response = await confirmGoogleAuthLink(state);
      setAuthSession(buildAuthSession(response));
      const nextPath = getAuthRedirectPath(response.role);
      window.location.replace(nextPath);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-rose-700">
            <ShieldAlert className="h-5 w-5" />
            <div className="font-bold">Google login failed</div>
          </div>
          <p className="mt-3 text-sm text-slate-600">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (ticket?.linkRequired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-slate-900">
            <ShieldCheck className="h-5 w-5 text-sky-600" />
            <div className="font-bold">Confirm auto-link</div>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            This Google email already belongs to an existing account. Confirm auto-link to continue.
          </p>
          <div className="mt-5 flex gap-3">
            <Button onClick={handleConfirmLink} disabled={isConfirming} className="rounded-xl">
              {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm link
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => router.replace("/login")}>
              Use another email
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CallbackLoadingScreen />
  );
}

function CallbackLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
    </div>
  );
}
