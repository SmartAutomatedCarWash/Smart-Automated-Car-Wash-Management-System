"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Loader2, RefreshCcw, UserCircle2 } from "lucide-react";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent } from "@/shared/ui/ui/card";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { useAdminAccountDetail, useUpdateAdminCustomerStatus, useUpdateAdminCustomerPoints } from "@/features/reports/hooks/use-admin-reporting";
import type { AdminEditableAccountRole } from "@/entities/reports";
import { useLanguageStore, translate } from "@/shared/store/language.store";

type AdminAccountDetailPageContentProps = {
  accountId: string;
};

const ROLE_OPTIONS: AdminEditableAccountRole[] = ["CUSTOMER", "STAFF", "ADMIN"];
const STATUS_OPTIONS = ["ACTIVE", "BLOCKED", "SUSPENDED"];

function translateEnumLabel(value: string, lang: "vi" | "en") {
  const map: Record<string, { vi: string; en: string }> = {
    CUSTOMER: { vi: "Khách hàng", en: "Customer" },
    STAFF: { vi: "Nhân viên", en: "Staff" },
    ADMIN: { vi: "Quản trị viên", en: "Admin" },
    GUEST: { vi: "Khách vãng lai", en: "Guest" },
    ACTIVE: { vi: "Hoạt động", en: "Active" },
    BLOCKED: { vi: "Đã khóa", en: "Blocked" },
    SUSPENDED: { vi: "Tạm ngưng", en: "Suspended" },
    MEMBER: { vi: "Thành viên", en: "Member" },
    SILVER: { vi: "Bạc", en: "Silver" },
    GOLD: { vi: "Vàng", en: "Gold" },
    PLATINUM: { vi: "Bạch kim", en: "Platinum" },
  };
  return map[value]?.[lang] || value;
}

export function AdminAccountDetailPageContent({ accountId }: AdminAccountDetailPageContentProps) {
  const router = useRouter();
  const { language } = useLanguageStore();
  const detailQuery = useAdminAccountDetail(accountId);
  const updateStatusMutation = useUpdateAdminCustomerStatus(accountId);
  const updatePointsMutation = useUpdateAdminCustomerPoints(accountId);
  const [statusDraft, setStatusDraft] = useState<string>("ACTIVE");
  const [pointsDraft, setPointsDraft] = useState<string>("");
  const [pointsReason, setPointsReason] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pointsFeedback, setPointsFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (detailQuery.data?.status) {
      setStatusDraft(detailQuery.data.status);
    }
  }, [detailQuery.data?.status]);

  const account = detailQuery.data;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{translate(language, "Admin / Tài khoản", "Admin / Accounts")}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{translate(language, "Chi tiết tài khoản", "Account detail")}</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="h-9 gap-2">
              <Link href="/admin/accounts">
                <ArrowLeft className="h-4 w-4" />
                {translate(language, "Quay lại danh sách", "Back to list")}
              </Link>
            </Button>
            <Button type="button" variant="outline" className="h-9 gap-2" onClick={() => void detailQuery.refetch()}>
              <RefreshCcw className="h-4 w-4" />
              {translate(language, "Làm mới", "Refresh")}
            </Button>
          </div>
        </div>

        {detailQuery.isPending ? (
          <Card className="rounded-md border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <LoadingInline message={translate(language, "Đang tải thông tin tài khoản...", "Loading account...")} />
            </CardContent>
          </Card>
        ) : detailQuery.isError ? (
          <Card className="rounded-md border-rose-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <ErrorInline message={getDisplayErrorMessage(detailQuery.error)} />
            </CardContent>
          </Card>
        ) : !account ? (
          <Card className="rounded-md border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <EmptyInline message={translate(language, "Không tìm thấy tài khoản.", "Account not found.")} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="rounded-md border-slate-200 bg-white shadow-sm">
              <CardContent className="space-y-5 p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <UserCircle2 className="h-9 w-9" />
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-slate-950">{account.fullName}</h2>
                  <p className="text-sm text-slate-500">{account.phone}</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <StatusBadge value={account.role} language={language as "vi" | "en"} />
                    <StatusBadge value={account.status} language={language as "vi" | "en"} />
                    <StatusBadge value={account.tier} language={language as "vi" | "en"} />
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-200 pt-4 text-sm">
                  <InfoRow label="Email" value={account.email ?? translate(language, "Không có email", "No email")} />
                  <InfoRow label={translate(language, "Ngày tham gia", "Joined")} value={formatDateTime(account.createdAt, language as "vi" | "en")} />
                  <InfoRow label={translate(language, "Cập nhật", "Updated")} value={formatDateTime(account.updatedAt, language as "vi" | "en")} />
                </div>

                <div className="space-y-4 border-t border-slate-200 pt-4">
                  <div className="space-y-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-slate-500">{translate(language, "Trạng thái tài khoản", "Account status")}</span>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm"
                        value={statusDraft}
                        onChange={(event) => setStatusDraft(event.target.value)}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {translateEnumLabel(status, language as "vi" | "en")}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    variant="outline"
                    onClick={async () => {
                      setFeedback(null);
                      try {
                        if (statusDraft !== account?.status) {
                          await updateStatusMutation.mutateAsync({ status: statusDraft as any });
                          setFeedback(translate(language, "Cập nhật thành công.", "Successfully updated."));
                          void detailQuery.refetch();
                        }
                      } catch (error) {
                        setFeedback(getDisplayErrorMessage(error));
                      }
                    }}
                    disabled={updateStatusMutation.isPending || statusDraft === account?.status}
                  >
                    {updateStatusMutation.isPending
                      ? translate(language, "Đang cập nhật...", "Updating...") 
                      : translate(language, "Lưu thay đổi", "Save changes")}
                  </Button>
                  {feedback ? <p className="text-xs text-slate-600">{feedback}</p> : null}
                </div>
              </CardContent>
            </Card>

            {account.role === "CUSTOMER" && (
              <Card className="rounded-md border-slate-200 bg-white shadow-sm mt-5">
                <CardContent className="space-y-4 p-5">
                  <h2 className="text-base font-semibold text-slate-950">
                    {translate(language, "Cộng/Trừ điểm khả dụng", "Add/Deduct active points")}
                  </h2>
                  <div className="space-y-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-slate-500">{translate(language, "Số điểm (+ để cộng, - để trừ)", "Points (+ to add, - to deduct)")}</span>
                      <input
                        type="number"
                        className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm"
                        placeholder="e.g. 100 or -50"
                        value={pointsDraft}
                        onChange={(e) => setPointsDraft(e.target.value)}
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-slate-500">{translate(language, "Lý do", "Reason")}</span>
                      <input
                        type="text"
                        className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm"
                        placeholder={translate(language, "Nhập lý do điều chỉnh...", "Enter reason...")}
                        value={pointsReason}
                        onChange={(e) => setPointsReason(e.target.value)}
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    variant="outline"
                    onClick={async () => {
                      setPointsFeedback(null);
                      const points = parseInt(pointsDraft, 10);
                      if (isNaN(points) || points === 0) {
                        setPointsFeedback(translate(language, "Vui lòng nhập số điểm hợp lệ.", "Please enter a valid points amount."));
                        return;
                      }
                      if (!pointsReason.trim()) {
                        setPointsFeedback(translate(language, "Vui lòng nhập lý do.", "Please enter a reason."));
                        return;
                      }
                      try {
                        await updatePointsMutation.mutateAsync({ points, reason: pointsReason });
                        setPointsFeedback(translate(language, "Cập nhật điểm thành công.", "Successfully updated points."));
                        setPointsDraft("");
                        setPointsReason("");
                        void detailQuery.refetch();
                      } catch (error) {
                        setPointsFeedback(getDisplayErrorMessage(error));
                      }
                    }}
                    disabled={updatePointsMutation.isPending}
                  >
                    {updatePointsMutation.isPending
                      ? translate(language, "Đang xử lý...", "Processing...") 
                      : translate(language, "Thực hiện", "Execute")}
                  </Button>
                  {pointsFeedback ? <p className="text-xs text-slate-600">{pointsFeedback}</p> : null}
                </CardContent>
              </Card>
            )}

            <Card className="rounded-md border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <h2 className="text-base font-semibold text-slate-950">{translate(language, "Thông tin tài khoản", "Account information")}</h2>
                <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  <DetailField label={translate(language, "Họ tên", "Full name")} value={account.fullName} />
                  <DetailField label={translate(language, "Số điện thoại", "Phone number")} value={account.phone} />
                  <DetailField label={translate(language, "Địa chỉ email", "Email address")} value={account.email ?? translate(language, "Không có email", "No email")} />
                  <DetailField label={translate(language, "Vai trò", "Role")} value={<StatusBadge value={account.role} language={language as "vi" | "en"} />} />
                  <DetailField label={translate(language, "Trạng thái", "Status")} value={<StatusBadge value={account.status} language={language as "vi" | "en"} />} />
                  <DetailField label={translate(language, "Hạng thành viên", "Tier")} value={<StatusBadge value={account.tier} language={language as "vi" | "en"} />} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-950">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-950">{value}</span>
    </div>
  );
}

function StatusBadge({ value, language }: { value: string; language: "vi" | "en" }) {
  const tone = STATUS_TONE[value] ?? "border-slate-300 bg-slate-100 text-slate-700";

  return (
    <Badge className={tone} variant="outline">
      {translateEnumLabel(value, language)}
    </Badge>
  );
}

function formatDateTime(value: string, language: "vi" | "en") {
  return new Date(value).toLocaleString(language === "vi" ? "vi-VN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LoadingInline({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 p-3 text-sm text-slate-600">
      <Loader2 className="h-4 w-4 animate-spin" />
      {message}
    </div>
  );
}

function ErrorInline({ message }: { message: string }) {
  return <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{message}</p>;
}

function EmptyInline({ message }: { message: string }) {
  return <p className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{message}</p>;
}

const STATUS_TONE: Record<string, string> = {
  CUSTOMER: "border-sky-300 bg-sky-100 text-sky-800",
  STAFF: "border-violet-300 bg-violet-100 text-violet-800",
  ADMIN: "border-orange-300 bg-orange-100 text-orange-800",
  GUEST: "border-slate-400 bg-slate-200 text-slate-800",
  ACTIVE: "border-emerald-300 bg-emerald-100 text-emerald-800",
  BLOCKED: "border-rose-300 bg-rose-100 text-rose-800",
  SUSPENDED: "border-amber-300 bg-amber-100 text-amber-800",
  MEMBER: "border-slate-300 bg-slate-100 text-slate-800",
  SILVER: "border-zinc-300 bg-zinc-100 text-zinc-800",
  GOLD: "border-yellow-300 bg-yellow-100 text-yellow-800",
  PLATINUM: "border-indigo-300 bg-indigo-100 text-indigo-800",
};
