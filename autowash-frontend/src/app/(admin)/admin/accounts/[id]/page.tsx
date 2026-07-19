"use client";

import { useAdminAccountDetail } from "@/features/reports/hooks/use-admin-reporting";
import { AdminCustomerDetailPageContent } from "@/features/customers/components/admin-customer-detail-page";
import { AdminAccountDetailPageContent } from "@/features/accounts/components/admin-account-detail-page";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/ui/card";
import { useErrorMessage } from "@/shared/hooks/use-error-message";

export default function AdminAccountDetailPage({ params }: { params: { id: string } }) {
  const getErrorMessage = useErrorMessage();
  const detailQuery = useAdminAccountDetail(params.id);

  if (detailQuery.isPending) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          <p className="text-sm font-medium">Loading account details...</p>
        </div>
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Card className="rounded-md border-rose-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-rose-700">{getErrorMessage(detailQuery.error)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const account = detailQuery.data;

  if (!account) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Card className="rounded-md border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Account not found.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (account.role === "CUSTOMER") {
    return <AdminCustomerDetailPageContent customerId={params.id} />;
  }

  return <AdminAccountDetailPageContent accountId={params.id} />;
}

