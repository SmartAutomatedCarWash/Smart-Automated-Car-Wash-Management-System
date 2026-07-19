"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, RefreshCcw } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { useCustomerLoyaltyAccount, useCustomerRedeemPoints } from "@/features/loyalty/hooks/use-customer-loyalty";
import type { RedeemPointsResponse } from "@/entities/loyalty";
import { useLanguageStore, translate } from "@/shared/store/language.store";

const MIN_REDEEM_POINTS = 50;
const MAX_REDEEM_POINTS = 200;
const VND_PER_POINT = 1_000;

export function CustomerLoyaltyRedeemPageContent() {
  const getErrorMessage = useErrorMessage();
  const { language } = useLanguageStore();
  const accountQuery = useCustomerLoyaltyAccount();
  const redeemMutation = useCustomerRedeemPoints();
  const [pointsInput, setPointsInput] = useState("50");
  const [referenceId, setReferenceId] = useState("");
  const [successVoucher, setSuccessVoucher] = useState<RedeemPointsResponse | null>(null);
  const locale = language === "vi" ? "vi-VN" : "en-US";

  const points = useMemo(() => Number.parseInt(pointsInput, 10), [pointsInput]);
  const validationMessage = getValidationMessage(pointsInput, points, accountQuery.data?.availablePoints ?? null, language);
  const estimatedVnd = Number.isFinite(points) ? Math.max(points, 0) * VND_PER_POINT : 0;
  const remainingBalance =
    accountQuery.data && Number.isFinite(points) ? accountQuery.data.availablePoints - Math.max(points, 0) : null;

  const submitDisabled =
    accountQuery.isPending || accountQuery.isError || redeemMutation.isPending || Boolean(validationMessage);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessVoucher(null);
    if (!accountQuery.data || validationMessage) {
      return;
    }

    redeemMutation.mutate(
      {
        pointsToRedeem: points,
        referenceId: referenceId.trim() || undefined,
      },
      {
        onSuccess: (response) => {
          setSuccessVoucher(response);
          setReferenceId("");
        },
      },
    );
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Card className="border-slate-200 bg-white">
          <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>{translate(language, "Đổi điểm tích lũy", "Redeem loyalty points")}</CardTitle>
            </div>
            <Button type="button" variant="outline" onClick={() => accountQuery.refetch()} disabled={accountQuery.isFetching}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {translate(language, "Tải lại số dư", "Refresh balance")}
            </Button>
          </CardHeader>
        </Card>

        {accountQuery.isPending ? <div className="h-64 animate-pulse rounded-2xl bg-slate-100" /> : null}
        {accountQuery.isError ? (
          <Card className="border-rose-200 bg-white">
            <CardHeader>
              <CardTitle>{translate(language, "Không thể tải số dư tích điểm", "Unable to load loyalty balance")}</CardTitle>
              <CardDescription>{getErrorMessage(accountQuery.error)}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {accountQuery.data ? (
          <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle>{translate(language, "Biểu mẫu đổi điểm", "Redeem form")}</CardTitle>
                <CardDescription>{translate(language, "Gửi yêu cầu đổi điểm từ ví tích lũy hiện tại của bạn.", "Submit redemption against your current loyalty wallet balance.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="redeem-points">{translate(language, "Số điểm muốn đổi", "Points to redeem")}</Label>
                  <Input
                    id="redeem-points"
                    type="number"
                    min={MIN_REDEEM_POINTS}
                    max={MAX_REDEEM_POINTS}
                    step={1}
                    value={pointsInput}
                    onChange={(event) => setPointsInput(event.target.value)}
                    placeholder="50"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    {[50, 100, 150, 200].map((value) => (
                      <Button key={value} type="button" variant="outline" onClick={() => setPointsInput(String(value))}>
                        {value}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="redeem-reference">{translate(language, "Tham chiếu (tuỳ chọn)", "Reference (optional)")}</Label>
                  <Input
                    id="redeem-reference"
                    type="text"
                    value={referenceId}
                    onChange={(event) => setReferenceId(event.target.value)}
                    placeholder={translate(language, "Mã đặt lịch hoặc ghi chú", "Booking code or note")}
                  />
                </div>

                {validationMessage ? (
                  <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {validationMessage}
                  </p>
                ) : null}
                {redeemMutation.isError ? (
                  <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {getErrorMessage(redeemMutation.error)}
                  </p>
                ) : null}
                {successVoucher ? (
                  <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      {translate(language, "Đổi điểm thành công", "Redemption successful")}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <SummaryRow label={translate(language, "Mã voucher", "Voucher code")} value={successVoucher.discountCode} />
                      <SummaryRow label={translate(language, "Điểm đã đổi", "Points redeemed")} value={`${successVoucher.pointsRedeemed.toLocaleString(locale)} ${translate(language, "điểm", "points")}`} />
                      <SummaryRow label={translate(language, "Giá trị voucher", "Voucher value")} value={`${successVoucher.discountValue.toLocaleString(locale)} VND`} />
                      <SummaryRow label={translate(language, "Hết hạn", "Expires")} value={new Date(successVoucher.expiresAt).toLocaleDateString(locale)} />
                      <SummaryRow label={translate(language, "Trạng thái", "Status")} value={successVoucher.status} />
                      <SummaryRow label={translate(language, "Số dư mới", "New available balance")} value={`${successVoucher.newBalance.toLocaleString(locale)} ${translate(language, "điểm", "points")}`} />
                    </div>
                  </div>
                ) : null}

                <Button type="submit" disabled={submitDisabled} className="w-full sm:w-auto">
                  {redeemMutation.isPending ? translate(language, "Đang đổi điểm...", "Redeeming...") : translate(language, "Đổi điểm", "Redeem points")}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle>{translate(language, "Tóm tắt đổi điểm", "Redemption summary")}</CardTitle>
                <CardDescription>{translate(language, "Tính toán trực tiếp từ dữ liệu hiện tại.", "Live calculation from current input.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <SummaryRow label={translate(language, "Điểm khả dụng", "Available points")} value={`${accountQuery.data.availablePoints.toLocaleString(locale)} ${translate(language, "điểm", "points")}`} />
                <SummaryRow label={translate(language, "Điểm tích lũy", "Lifetime points")} value={`${accountQuery.data.lifetimePoints.toLocaleString(locale)} ${translate(language, "điểm", "points")}`} />
                <SummaryRow label={translate(language, "Số điểm đổi", "Redeem amount")} value={`${Number.isFinite(points) ? Math.max(points, 0).toLocaleString(locale) : 0} ${translate(language, "điểm", "points")}`} />
                <SummaryRow label={translate(language, "Giá trị voucher", "Voucher value")} value={`${estimatedVnd.toLocaleString(locale)} VND`} />
                <SummaryRow
                  label={translate(language, "Số dư còn lại", "Remaining balance")}
                  value={
                    remainingBalance == null
                      ? "N/A"
                      : `${Math.max(remainingBalance, 0).toLocaleString(locale)} ${translate(language, "điểm", "points")}`
                  }
                />

                <Button asChild variant="outline" className="mt-3 w-full">
                  <Link href="/customer/loyalty/history">
                    {translate(language, "Xem lịch sử giao dịch", "View transaction history")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function getValidationMessage(pointsInput: string, points: number, currentBalance: number | null, language: "vi" | "en") {
  if (!pointsInput.trim()) {
    return translate(language, "Vui lòng nhập số điểm muốn đổi.", "Please enter points to redeem.");
  }
  if (!Number.isFinite(points)) {
    return translate(language, "Số điểm phải là số hợp lệ.", "Points must be a valid number.");
  }
  if (!Number.isInteger(points)) {
    return translate(language, "Chỉ có thể đổi số điểm nguyên.", "Only whole points can be redeemed.");
  }
  if (points < MIN_REDEEM_POINTS) {
    return translate(language, `Tối thiểu ${MIN_REDEEM_POINTS} điểm.`, `Minimum redemption is ${MIN_REDEEM_POINTS} points.`);
  }
  if (points > MAX_REDEEM_POINTS) {
    return translate(language, `Tối đa ${MAX_REDEEM_POINTS} điểm.`, `Maximum redemption is ${MAX_REDEEM_POINTS} points.`);
  }
  if (currentBalance != null && points > currentBalance) {
    return translate(language, "Không đủ điểm để đổi.", "Insufficient points for this redemption.");
  }
  return null;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
