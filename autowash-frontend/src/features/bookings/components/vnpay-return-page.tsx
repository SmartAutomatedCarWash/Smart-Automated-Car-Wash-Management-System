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
import { translate, useLanguageStore, type Language } from "@/shared/store/language.store";
import type { VnpayPaymentResultResponse } from "@/entities/bookings";

export function VnpayReturnPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { language } = useLanguageStore();
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
  const shouldSyncPayment = isSuccess && bookingId.length > 0;
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
    enabled: shouldSyncPayment,
    retry: 1,
  });
  const syncResult = syncQuery.data;
  const isSynced = Boolean(syncResult?.success);
  const hasSyncFailure = Boolean(syncResult && !syncResult.success);
  const isInvalidSignature = Boolean(result && !result.validSignature);
  const isSyncing = shouldSyncPayment && syncQuery.isFetching;
  const isCheckingPayment = resultQuery.isFetching || isSyncing;
  const failureMessage = buildVnpayFailureMessage(syncResult ?? result, params, language);
  const title = !hasParams
    ? translate(language, "Thiếu kết quả VNPay", "Missing VNPay result")
    : isCheckingPayment
      ? translate(language, "Đang kiểm tra thanh toán", "Checking payment")
      : isSuccess && isSynced
        ? translate(language, "Thanh toán thành công", "Payment successful")
        : hasSyncFailure
          ? translate(language, "Thanh toán chưa được xác nhận", "Payment not confirmed")
          : isSuccess
            ? translate(language, "Đã nhận kết quả thanh toán", "Payment received")
        : isInvalidSignature
          ? translate(language, "Chữ ký thanh toán không hợp lệ", "Invalid payment signature")
          : translate(language, "Thanh toán không hoàn tất", "Payment not completed");
  const description = !hasParams
    ? translate(language, "VNPay không trả về thông tin thanh toán.", "No payment information was returned.")
    : isCheckingPayment
      ? translate(language, "Vui lòng chờ trong khi hệ thống xác minh và đồng bộ kết quả.", "Please wait while we verify and sync the payment response.")
      : isSuccess && isSynced
        ? translate(language, "Thanh toán đã được xác minh và lịch đặt đã được xác nhận.", "Payment was verified and the booking has been confirmed.")
        : hasSyncFailure
          ? failureMessage
          : isSuccess
            ? translate(language, "VNPay trả kết quả thanh toán thành công, nhưng hệ thống chưa đồng bộ xong. Mở chi tiết lịch đặt và dùng Query VNPay nếu cần.", "VNPay returned a successful payment, but local sync could not be completed. Open the booking detail and use Query VNPay if needed.")
        : isInvalidSignature
          ? translate(language, "Dữ liệu trả về không thể xác minh.", "The returned data could not be verified.")
          : failureMessage;
  const Icon =
    isCheckingPayment
      ? Loader2
      : isInvalidSignature
        ? ShieldAlert
        : isSuccess && !hasSyncFailure
          ? CheckCircle2
          : XCircle;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <Card className="rounded-lg">
          <CardContent className="p-7">
            <div
              className={cn(
                "mb-5 flex h-12 w-12 items-center justify-center rounded-full",
                isSuccess && !hasSyncFailure
                  ? "bg-emerald-100 text-emerald-700"
                    : isCheckingPayment
                    ? "bg-cyan-100 text-cyan-700"
                    : "bg-rose-100 text-rose-700",
              )}
            >
              <Icon className={cn("h-6 w-6", isCheckingPayment && "animate-spin")} />
            </div>

            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-2 text-sm text-slate-600">{description}</p>

            <div className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <ResultRow label={translate(language, "Lịch đặt", "Booking")} value={result?.bookingId ?? params.vnp_TxnRef ?? "-"} />
              <ResultRow label={translate(language, "Mã phản hồi", "Response code")} value={result?.responseCode ?? params.vnp_ResponseCode ?? "-"} />
              <ResultRow
                label={translate(language, "Trạng thái giao dịch", "Transaction status")}
                value={result?.transactionStatus ?? params.vnp_TransactionStatus ?? "-"}
              />
              <ResultRow label={translate(language, "Mã giao dịch", "Transaction ref")} value={result?.transactionRef ?? params.vnp_TransactionNo ?? "-"} />
              <ResultRow
                label={translate(language, "Đồng bộ hệ thống", "Local sync")}
                value={
                  isSyncing
                    ? translate(language, "Đang đồng bộ", "Syncing")
                    : isSynced
                      ? translate(language, "Đã xác nhận", "Confirmed")
                      : syncQuery.isError || hasSyncFailure
                        ? translate(language, "Cần kiểm tra lại", "Needs manual query")
                        : "-"
                }
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {result?.bookingId ? (
                <Button asChild className="flex-1">
                  <Link href={`/customer/bookings/${result.bookingId}`}>
                    <ReceiptText className="h-4 w-4" />
                    {translate(language, "Xem lịch đặt", "View booking")}
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" className="flex-1">
                <Link href="/customer/bookings">{translate(language, "Về danh sách", "Back to bookings")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function buildVnpayFailureMessage(
  result: VnpayPaymentResultResponse | undefined,
  params: Record<string, string>,
  language: Language,
) {
  if (result && !result.validSignature) {
    return translate(language, "Dữ liệu trả về từ VNPay không hợp lệ.", "The returned VNPay data is invalid.");
  }

  const responseCode = result?.responseCode ?? params.vnp_ResponseCode;
  const transactionStatus = result?.transactionStatus ?? params.vnp_TransactionStatus;
  if (transactionStatus && transactionStatus !== "00") {
    const statusMessage = vnpayResponseMessage(transactionStatus, language);
    if (responseCode && responseCode !== transactionStatus) {
      return `${statusMessage} ${translate(
        language,
        `Mã phản hồi VNPay: ${responseCode}. Trạng thái giao dịch: ${transactionStatus}.`,
        `VNPay response code: ${responseCode}. Transaction status: ${transactionStatus}.`,
      )}`;
    }
    return statusMessage;
  }

  const baseMessage = vnpayResponseMessage(responseCode, language, result?.message);
  if (!transactionStatus || transactionStatus === responseCode || transactionStatus === "00") {
    return baseMessage;
  }
  return `${baseMessage} ${translate(language, "Trạng thái giao dịch:", "Transaction status:")} ${vnpayTransactionStatusMessage(transactionStatus, language)}.`;
}

function vnpayResponseMessage(code: string | null | undefined, language: Language, fallback?: string) {
  const messages: Record<string, { vi: string; en: string }> = {
    "00": { vi: "VNPay đã chấp nhận thanh toán.", en: "VNPay approved the payment." },
    "01": { vi: "Giao dịch VNPay chưa hoàn tất.", en: "VNPay transaction has not been completed." },
    "02": { vi: "Giao dịch VNPay thất bại.", en: "VNPay transaction failed." },
    "04": { vi: "Giao dịch VNPay đã bị đảo.", en: "VNPay transaction was reversed." },
    "05": { vi: "VNPay đang xử lý giao dịch.", en: "VNPay is processing the transaction." },
    "06": { vi: "VNPay đã gửi yêu cầu hoàn tiền.", en: "VNPay sent a refund request." },
    "07": { vi: "Giao dịch bị nghi ngờ gian lận.", en: "VNPay flagged the transaction as suspicious." },
    "09": { vi: "Thẻ hoặc tài khoản chưa đăng ký Internet Banking.", en: "The card or account is not registered for Internet Banking." },
    "10": { vi: "Xác thực thẻ hoặc tài khoản sai quá số lần quy định.", en: "Card or account authentication failed too many times." },
    "11": { vi: "Phiên thanh toán đã hết hạn.", en: "The payment session expired." },
    "12": { vi: "Thẻ hoặc tài khoản bị khóa hoặc chưa kích hoạt.", en: "The card or account is locked or not active." },
    "13": { vi: "Mã OTP không đúng.", en: "The OTP was incorrect." },
    "24": { vi: "Bạn đã hủy giao dịch.", en: "The payment was cancelled." },
    "51": { vi: "Thẻ hoặc tài khoản không đủ số dư.", en: "The card or account has insufficient funds." },
    "65": { vi: "Giao dịch vượt hạn mức cho phép.", en: "The transaction exceeded the allowed limit." },
    "75": { vi: "Ngân hàng đang bảo trì.", en: "The bank is temporarily under maintenance." },
    "79": { vi: "Sai mật khẩu thanh toán quá số lần quy định.", en: "The payment password was entered incorrectly too many times." },
    "99": { vi: "VNPay trả về lỗi thanh toán không xác định.", en: "VNPay returned an unknown payment error." },
  };
  if (code && messages[code]) {
    return messages[code][language];
  }
  if (fallback) {
    return fallback;
  }
  return code
    ? translate(language, `VNPay từ chối giao dịch với mã ${code}.`, `VNPay rejected the transaction with response code ${code}.`)
    : translate(language, "VNPay không trả về mã phản hồi.", "VNPay did not return a response code.");
}

function vnpayTransactionStatusMessage(status: string, language: Language) {
  const messages: Record<string, { vi: string; en: string }> = {
    "00": { vi: "thành công", en: "successful" },
    "01": { vi: "chưa hoàn tất", en: "not completed" },
    "02": { vi: "thất bại", en: "failed" },
    "04": { vi: "bị đảo", en: "reversed" },
    "05": { vi: "đang xử lý", en: "processing" },
    "06": { vi: "đã gửi yêu cầu hoàn tiền", en: "refund request sent" },
    "07": { vi: "nghi ngờ gian lận", en: "suspected fraud" },
    "09": { vi: "hoàn tiền bị từ chối", en: "refund rejected" },
    "10": { vi: "xác thực sai quá số lần quy định", en: "authentication failed too many times" },
    "11": { vi: "phiên thanh toán đã hết hạn", en: "payment session expired" },
    "12": { vi: "thẻ hoặc tài khoản bị khóa hoặc chưa kích hoạt", en: "card or account locked or inactive" },
    "13": { vi: "sai mã OTP", en: "incorrect OTP" },
    "24": { vi: "đã hủy", en: "cancelled" },
    "51": { vi: "không đủ số dư", en: "insufficient funds" },
    "65": { vi: "vượt hạn mức", en: "limit exceeded" },
    "75": { vi: "ngân hàng đang bảo trì", en: "bank maintenance" },
    "79": { vi: "sai mật khẩu thanh toán quá số lần quy định", en: "payment password failed too many times" },
    "99": { vi: "lỗi thanh toán không xác định", en: "unknown payment error" },
  };
  return messages[status]?.[language] ?? translate(language, `mã ${status}`, `code ${status}`);
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[260px] break-words text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}
