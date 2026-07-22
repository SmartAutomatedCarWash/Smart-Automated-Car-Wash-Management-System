"use client";

import { useMemo, useState } from "react";
import { Coins, Loader2, Sparkles } from "lucide-react";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import { Label } from "@/shared/ui/ui/label";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { formatBookingCurrency } from "@/features/bookings/lib/booking-format";
import { useApplyBookingPoints } from "@/features/bookings/hooks/use-bookings";

const MIN_POINTS = 50;
const MAX_POINTS = 200;

export type ApplyPointsLanguage = "vi" | "en";

const COPY = {
  vi: {
    title: "Áp điểm vào đặt lịch",
    description: "Dùng điểm tích lũy để giảm trực tiếp số tiền cần thanh toán.",
    alreadyApplied: (points: number, discount: string) => `Đã áp ${points} điểm, giảm ${discount} cho đặt lịch này.`,
    inputLabel: "Số điểm muốn áp",
    estimateLabel: "Tạm giảm",
    rule: `Quy tắc hiện tại: tối thiểu ${MIN_POINTS} điểm, tối đa ${MAX_POINTS} điểm, 1 điểm = 1.000 VND.`,
    currentAmount: "Số tiền hiện tại",
    apply: "Áp điểm ngay",
    applied: "Điểm đã được áp",
    validation: `Vui lòng nhập từ ${MIN_POINTS} đến ${MAX_POINTS} điểm.`,
    successTitle: "Đã áp điểm vào đặt lịch",
    successDescription: (discount: string, balance: number) => `Giảm ${discount}. Số dư còn ${balance} điểm.`,
  },
  en: {
    title: "Apply points to booking",
    description: "Use loyalty points to reduce the payable amount before check-in.",
    alreadyApplied: (points: number, discount: string) => `${points} points applied, discounting ${discount} for this booking.`,
    inputLabel: "Points to apply",
    estimateLabel: "Estimated discount",
    rule: `Current rule: minimum ${MIN_POINTS} points, maximum ${MAX_POINTS} points, 1 point = 1,000 VND.`,
    currentAmount: "Current amount",
    apply: "Apply points",
    applied: "Points already applied",
    validation: `Please enter between ${MIN_POINTS} and ${MAX_POINTS} points.`,
    successTitle: "Points applied to booking",
    successDescription: (discount: string, balance: number) => `Discount ${discount}. Remaining balance ${balance} points.`,
  },
} as const;

export function ApplyPointsPanel({
  bookingId,
  finalAmount,
  pointsRedeemed,
  pointsDiscount,
  disabled,
  language = "vi",
}: {
  bookingId: string;
  finalAmount: number;
  pointsRedeemed: number;
  pointsDiscount: number;
  disabled?: boolean;
  language?: ApplyPointsLanguage;
}) {
  const getErrorMessage = useErrorMessage();
  const copy = COPY[language];
  const [points, setPoints] = useState(MIN_POINTS);
  const mutation = useApplyBookingPoints(bookingId);
  const estimatedDiscount = useMemo(() => points * 1000, [points]);
  const alreadyApplied = pointsRedeemed > 0;
  const blocked = disabled || alreadyApplied;

  async function handleApply() {
    if (!Number.isInteger(points) || points < MIN_POINTS || points > MAX_POINTS) {
      notify.error(copy.validation);
      return;
    }
    try {
      const result = await mutation.mutateAsync({ pointsToApply: points });
      notify.success(copy.successTitle);
    } catch (error) {
      notify.error(getErrorMessage(error));
    }
  }

  return (
    <Card className="border-sky-200 bg-gradient-to-br from-white via-sky-50/70 to-cyan-50 shadow-[0_18px_50px_rgba(14,165,233,0.12)]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/20">
            <Coins className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {alreadyApplied ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {copy.alreadyApplied(pointsRedeemed, formatBookingCurrency(pointsDiscount))}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor={`points-${bookingId}`}>{copy.inputLabel}</Label>
                <Input
                  id={`points-${bookingId}`}
                  type="number"
                  min={MIN_POINTS}
                  max={MAX_POINTS}
                  value={points}
                  disabled={blocked || mutation.isPending}
                  onChange={(event) => setPoints(Number(event.target.value))}
                  className="h-12 rounded-2xl border-sky-200 bg-white text-base font-semibold"
                />
              </div>
              <div className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm shadow-sm">
                <div className="text-slate-500">{copy.estimateLabel}</div>
                <div className="mt-1 text-lg font-black text-sky-700">{formatBookingCurrency(estimatedDiscount)}</div>
              </div>
            </div>
            <div className="text-xs leading-5 text-slate-500">{copy.rule}</div>
          </>
        )}

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-sm text-slate-500">{copy.currentAmount}</span>
          <span className="font-black text-slate-900">{formatBookingCurrency(finalAmount)}</span>
        </div>

        <Button
          type="button"
          disabled={blocked || mutation.isPending}
          onClick={handleApply}
          className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 font-bold shadow-lg shadow-sky-600/20"
        >
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {alreadyApplied ? copy.applied : copy.apply}
        </Button>
      </CardContent>
    </Card>
  );
}
