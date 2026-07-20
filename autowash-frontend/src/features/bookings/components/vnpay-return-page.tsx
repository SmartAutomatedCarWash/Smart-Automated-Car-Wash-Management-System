"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ReceiptText, ShieldAlert, XCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryVnpayTransaction, verifyVnpayReturn } from "@/features/bookings/lib/booking-service";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent } from "@/shared/ui/ui/card";
import { cn } from "@/shared/lib/utils";

export function VnpayReturnPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);
  const hasParams = Object.keys(params).length > 0;

  const resultQuery = useQuery({
    queryKey: ["vnpay-return", params],
    queryFn: () => verifyVnpayReturn(params),
    enabled: hasParams,
    retry: false,
  });

  const result = resultQuery.data;
  const isSuccess = Boolean(result?.validSignature && result.success);
  const bookingId = result?.bookingId ?? params.vnp_TxnRef ?? "";
  const syncQuery = useQuery({
    queryKey: ["vnpay-return-sync", bookingId, result?.responseCode, result?.transactionStatus],
    queryFn: async () => {
      const synced = await queryVnpayTransaction(bookingId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer-bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }),
      ]);
      return synced;
    },
    enabled: isSuccess && bookingId.length > 0,
    retry: 1,
  });
  const syncResult = syncQuery.data;
  const isSynced = Boolean(syncResult?.success);
  const isInvalidSignature = Boolean(result && !result.validSignature);
  const title = !hasParams
    ? "Missing VNPay result"
    : resultQuery.isPending || syncQuery.isPending
      ? "Checking payment"
      : isSuccess && isSynced
        ? "Payment successful"
        : isSuccess
          ? "Payment received"
        : isInvalidSignature
          ? "Invalid payment signature"
          : "Payment not completed";
  const description = !hasParams
    ? "No payment information was returned."
    : resultQuery.isPending || syncQuery.isPending
      ? "Please wait while we verify and sync the payment response."
      : isSuccess && isSynced
        ? "Payment was verified and the booking has been confirmed."
        : isSuccess
          ? "VNPay returned a successful payment, but local sync could not be completed. Open the booking detail and use Query VNPay if needed."
        : isInvalidSignature
          ? "The returned data could not be verified."
          : "The transaction was cancelled or failed.";
  const Icon = resultQuery.isPending || syncQuery.isPending ? Loader2 : isSuccess ? CheckCircle2 : isInvalidSignature ? ShieldAlert : XCircle;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <Card className="rounded-lg">
          <CardContent className="p-7">
            <div
              className={cn(
                "mb-5 flex h-12 w-12 items-center justify-center rounded-full",
                isSuccess
                  ? "bg-emerald-100 text-emerald-700"
                    : resultQuery.isPending || syncQuery.isPending
                    ? "bg-cyan-100 text-cyan-700"
                    : "bg-rose-100 text-rose-700",
              )}
            >
              <Icon className={cn("h-6 w-6", (resultQuery.isPending || syncQuery.isPending) && "animate-spin")} />
            </div>

            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-2 text-sm text-slate-600">{description}</p>

            <div className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <ResultRow label="Booking" value={result?.bookingId ?? params.vnp_TxnRef ?? "-"} />
              <ResultRow label="Response code" value={result?.responseCode ?? params.vnp_ResponseCode ?? "-"} />
              <ResultRow
                label="Transaction status"
                value={result?.transactionStatus ?? params.vnp_TransactionStatus ?? "-"}
              />
              <ResultRow label="Transaction ref" value={result?.transactionRef ?? params.vnp_TransactionNo ?? "-"} />
              <ResultRow
                label="Local sync"
                value={syncQuery.isPending ? "Syncing" : isSynced ? "Confirmed" : syncQuery.isError ? "Needs manual query" : "-"}
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {result?.bookingId ? (
                <Button asChild className="flex-1">
                  <Link href={`/customer/bookings/${result.bookingId}`}>
                    <ReceiptText className="h-4 w-4" />
                    View booking
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" className="flex-1">
                <Link href="/customer/bookings">Back to bookings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[260px] break-words text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}
