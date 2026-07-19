"use client";

import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { formatLoyaltyPoints, formatLoyaltyTransactionType } from "@/features/loyalty/lib/customer-loyalty";
import { useCustomerLoyaltyTransactions } from "@/features/loyalty/hooks/use-customer-loyalty";
import { useLanguageStore, translate } from "@/shared/store/language.store";

export function CustomerLoyaltyHistoryPageContent() {
  const getErrorMessage = useErrorMessage();
  const { language } = useLanguageStore();
  const transactionsQuery = useCustomerLoyaltyTransactions(1, 50);
  const locale = language === "vi" ? "vi-VN" : "en-US";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/customer/loyalty" className="text-lg font-semibold text-slate-900 hover:text-slate-700">
            {translate(language, "Quay lại", "Back")}
          </Link>
        </div>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-200 pb-6">
            <div className="space-y-4">
              <div>
                <CardTitle>{translate(language, "Lịch sử giao dịch điểm", "Point transaction history")}</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                className="self-start px-5 py-3 text-base font-semibold"
                size="lg"
                onClick={() => transactionsQuery.refetch()}
              >
                <RefreshCcw className="mr-2 h-5 w-5" />
                {translate(language, "Tải lại", "Refresh")}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            {transactionsQuery.isPending ? (
              <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
            ) : transactionsQuery.isError ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                {getErrorMessage(transactionsQuery.error)}
              </div>
            ) : !transactionsQuery.data || transactionsQuery.data.items.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                {translate(language, "Giao dịch điểm sẽ xuất hiện ở đây sau khi hoàn thành phiên rửa xe.", "Point entries appear here after a wash session is completed.")}
              </div>
            ) : (
              <div className="grid gap-4">
                {transactionsQuery.data.items.map((item) => (
                  <Card key={item.transactionId} className="border-slate-200 bg-white">
                    <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-base font-black text-slate-900">{formatLoyaltyTransactionType(item.type)}</div>
                        <div className="mt-1 text-sm text-slate-600">{item.description}</div>
                        <div className="mt-2 text-xs text-slate-500">
                          {item.bookingId} • {new Date(item.createdAt).toLocaleString(locale)}
                        </div>
                      </div>
                      <div className={item.points >= 0 ? "text-right text-lg font-black text-emerald-700" : "text-right text-lg font-black text-rose-700"}>
                        {formatLoyaltyPoints(item.points)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
