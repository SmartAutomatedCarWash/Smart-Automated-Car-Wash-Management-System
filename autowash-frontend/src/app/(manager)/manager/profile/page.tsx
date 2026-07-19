"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  Mail,
  Phone,
  RefreshCcw,
  Save,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { validateProfileForm } from "@/features/profile/lib/profile-form-validation";
import { buildUpdateUserProfileRequest } from "@/features/profile/lib/profile-update-payload";
import { useManagerProfile, useUpdateManagerProfile } from "@/features/profile/hooks/use-manager-profile";
import { getActiveStaffOptions, getEligibleSessionBookings, getOperationsQueue } from "@/features/operations/lib/operations-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueueSession } from "@/entities/operations";

type ProfileFormState = {
  fullName: string;
  email: string;
  phone: string;
};

const EMPTY_FORM: ProfileFormState = {
  fullName: "",
  email: "",
  phone: "",
};

const RESPONSIBILITIES = [
  { icon: ClipboardCheck, label: "Check-in khách đến", description: "Xác nhận xe và mở luồng rửa đúng trạng thái." },
  { icon: Users, label: "Theo dõi staff", description: "Nhìn nhanh tải công việc trong ca hiện tại." },
  { icon: ClipboardList, label: "Giữ queue thông suốt", description: "Ưu tiên session trễ, nghẽn hoặc cần can thiệp." },
];

export default function ManagerProfilePage() {
  const getErrorMessage = useErrorMessage();
  const profileQuery = useManagerProfile();
  const updateProfileMutation = useUpdateManagerProfile();
  const queueQuery = useQuery({ queryKey: ["manager-profile", "queue"], queryFn: getOperationsQueue, refetchInterval: 30_000 });
  const eligibleQuery = useQuery({ queryKey: ["manager-profile", "eligible"], queryFn: getEligibleSessionBookings, refetchInterval: 30_000 });
  const staffQuery = useQuery({ queryKey: ["manager-profile", "staff"], queryFn: getActiveStaffOptions, refetchInterval: 30_000 });
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (!profileQuery.data) return;
    setForm({
      fullName: profileQuery.data.fullName,
      email: profileQuery.data.email ?? "",
      phone: profileQuery.data.phone ?? "",
    });
    setShowValidation(false);
    updateProfileMutation.reset();
  }, [profileQuery.data?.userId]);

  const fieldErrors = useMemo(() => validateProfileForm(form), [form]);
  const hasClientErrors = Object.values(fieldErrors).some(Boolean);
  const hasChanges = profileQuery.data
    ? form.fullName !== profileQuery.data.fullName ||
      form.email !== (profileQuery.data.email ?? "") ||
      form.phone !== (profileQuery.data.phone ?? "")
    : false;
  const sessions = useMemo(() => flattenSessions(queueQuery.data), [queueQuery.data]);
  const delayedSessions = sessions.filter(isDelayed);
  const activeSessions = sessions.filter((session) => ["CHECKED_IN", "IN_PROGRESS"].includes(session.status));

  const handleFieldChange =
    (field: keyof ProfileFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = field === "phone" ? event.target.value.replace(/\s/g, "") : event.target.value;
      setForm((current) => ({ ...current, [field]: nextValue }));
      if (updateProfileMutation.isError) updateProfileMutation.reset();
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowValidation(true);

    if (hasClientErrors || !hasChanges) return;

    try {
      await updateProfileMutation.mutateAsync(buildUpdateUserProfileRequest(form));
      toast.success("Đã cập nhật hồ sơ Manager.");
      setShowValidation(false);
    } catch {
      toast.error("Không thể cập nhật hồ sơ Manager.");
    }
  };

  if (profileQuery.isPending) {
    return <ProfileLoadingState />;
  }

  if (profileQuery.isError) {
    return (
      <WorkspacePage>
        <WorkspaceEmptyState
          title="Không thể tải hồ sơ Manager"
          description={getErrorMessage(profileQuery.error)}
          action={
            <Button variant="outline" className="rounded-xl" onClick={() => profileQuery.refetch()}>
              <RefreshCcw className="h-4 w-4" />
              Thử lại
            </Button>
          }
        />
      </WorkspacePage>
    );
  }

  if (!profileQuery.data) {
    return (
      <WorkspacePage>
        <WorkspaceEmptyState title="Chưa có dữ liệu hồ sơ" description="Hệ thống chưa trả về hồ sơ cho tài khoản Manager." />
      </WorkspacePage>
    );
  }

  const profile = profileQuery.data;
  const submitMessage = updateProfileMutation.isError
    ? updateProfileMutation.error.errors?.map((item) => item.message).join(" ") ||
      getErrorMessage(updateProfileMutation.error)
    : null;

  return (
    <WorkspacePage className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#f8feff_0%,#ffffff_56%,#ecfeff_100%)] p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-cyan-100 shadow-sm">
                  {getInitials(profile.fullName)}
                </div>
                <div>
                  <p className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-800">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Operations Manager
                  </p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{profile.fullName}</h1>
                  <p className="mt-1 text-sm text-slate-500">Điều phối check-in, phân công và tiến độ rửa xe trong ca.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm md:min-w-64">
                <MiniInfo icon={Mail} label="Email" value={profile.email ?? "Chưa có"} />
                <MiniInfo icon={Phone} label="Phone" value={profile.phone ?? "Chưa có"} />
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-3">
            <SnapshotCard label="Chờ tiếp nhận" value={eligibleQuery.data?.length ?? 0} />
            <SnapshotCard label="Đang xử lý" value={activeSessions.length} />
            <SnapshotCard label="Cần chú ý" value={delayedSessions.length} tone={delayedSessions.length > 0 ? "rose" : "slate"} />
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black">Trách nhiệm trong ca</h2>
              <p className="mt-1 text-sm leading-6 text-slate-300">Trang này giữ thông tin cá nhân gọn, phần còn lại tập trung vào vận hành.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {RESPONSIBILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex gap-3 rounded-2xl border border-white/10 bg-white/7 p-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                  <div>
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-400">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <Card className="rounded-3xl border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="font-black text-slate-950">Thông tin tài khoản</h2>
            <p className="mt-1 text-sm text-slate-500">Cập nhật thông tin liên hệ. Role và trạng thái do Admin quản lý.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ProfileField
              label="Họ và tên"
              value={form.fullName}
              onChange={handleFieldChange("fullName")}
              error={resolveFieldError("fullName", fieldErrors.fullName, updateProfileMutation.error?.errors, showValidation)}
            />
            <ProfileField
              label="Email"
              value={form.email}
              onChange={handleFieldChange("email")}
              error={resolveFieldError("email", fieldErrors.email, updateProfileMutation.error?.errors, showValidation)}
              inputMode="email"
            />
            <ProfileField
              label="Số điện thoại"
              value={form.phone}
              onChange={handleFieldChange("phone")}
              error={resolveFieldError("phone", fieldErrors.phone, updateProfileMutation.error?.errors, showValidation)}
              inputMode="tel"
            />

            {submitMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitMessage}</div> : null}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">{hasChanges ? "Có thay đổi chưa lưu." : "Hồ sơ đang đồng bộ."}</p>
              <Button
                type="submit"
                disabled={!hasChanges || hasClientErrors || updateProfileMutation.isPending}
                className="h-11 rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800"
              >
                {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu hồ sơ
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-3xl border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Trạng thái tài khoản</h2>
            <div className="mt-4 grid gap-2">
              <InfoRow label="Vai trò" value={profile.role} />
              <InfoRow label="Trạng thái" value={profile.status} />
              <InfoRow label="Ngày tạo" value={formatDate(profile.registeredAt)} />
              <InfoRow label="Staff active" value={`${staffQuery.data?.length ?? 0}`} />
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Thao tác nhanh</h2>
            <div className="mt-4 grid gap-2">
              <QuickAction href="/manager/operations" icon={ClipboardList} label="Mở hàng đợi vận hành" />
              <QuickAction href="/manager/staff" icon={Users} label="Xem phân công staff" />
              <QuickAction href="/manager/reports" icon={BarChart3} label="Xem Dashboard" />
            </div>
            {queueQuery.isError ? (
              <p className="mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Snapshot vận hành chưa tải được: {getErrorMessage(queueQuery.error as unknown as ApiErrorResponse)}
              </p>
            ) : null}
          </Card>
        </div>
      </section>
    </WorkspacePage>
  );
}

function ProfileLoadingState() {
  return (
    <WorkspacePage className="space-y-5">
      <div className="h-56 animate-pulse rounded-3xl bg-slate-100" />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    </WorkspacePage>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  error,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
  inputMode?: "text" | "email" | "numeric" | "tel" | "search" | "url" | "none" | "decimal";
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-900">{label}</label>
      <input
        value={value}
        onChange={onChange}
        inputMode={inputMode}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
      />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

function SnapshotCard({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "rose" }) {
  const toneClass = tone === "rose" ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-700";
  return (
    <div className={`rounded-2xl border border-slate-200 px-4 py-3 ${toneClass}`}>
      <p className="text-[11px] font-black uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function MiniInfo({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-black text-slate-900">{value}</span>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: typeof ClipboardList; label: string }) {
  return (
    <Button asChild variant="outline" className="h-11 justify-between rounded-xl border-slate-200 bg-white px-3">
      <Link href={href}>
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-cyan-700" />
          {label}
        </span>
        <ArrowRight className="h-4 w-4 text-slate-400" />
      </Link>
    </Button>
  );
}

function resolveFieldError(
  fieldName: string,
  clientError: string | null,
  apiErrors: { field: string; message: string }[] | undefined,
  showValidation: boolean,
) {
  if (showValidation && clientError) return clientError;
  return apiErrors?.find((item) => item.field === fieldName)?.message ?? null;
}

function flattenSessions(queue?: { columns: { sessions: OperationsQueueSession[] }[] }) {
  return queue?.columns.flatMap((column) => column.sessions) ?? [];
}

function isDelayed(session: OperationsQueueSession) {
  if (session.status === "COMPLETED" || session.status === "CANCELLED") return false;
  const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : null;
  if (!startedAt || !session.estimatedDurationMinutes) return false;
  return Date.now() > startedAt + session.estimatedDurationMinutes * 60_000;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getInitials(fullName: string) {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "M";
}
