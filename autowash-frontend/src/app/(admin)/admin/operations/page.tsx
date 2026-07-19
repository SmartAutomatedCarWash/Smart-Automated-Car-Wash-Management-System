"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, PlayCircle, RefreshCcw, Activity, Clock,
  Droplets, CheckCircle2, Car, Users, AlertTriangle,
  Timer, User, Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card";
import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { cn } from "@/shared/lib/utils";
import {
  createWashSession,
  getEligibleSessionBookings,
  getOperationsQueue,
} from "@/features/operations/lib/operations-service";
import type {
  ApiErrorResponse,
} from "@/shared/types/api.types";
import type {
  CreateWashSessionResponse,
  EligibleSessionBooking,
  OperationsQueue,
  OperationsQueueSession,
  WashSessionStatus,
} from "@/entities/operations";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<WashSessionStatus, { label: string; labelVi: string; color: string; dot: string }> = {
  PENDING:    { label: "Pending",     labelVi: "Chờ xử lý",    color: "bg-amber-50 border-amber-200 text-amber-700",    dot: "bg-amber-400" },
  QUEUED:     { label: "Queued",      labelVi: "Trong hàng",    color: "bg-blue-50 border-blue-200 text-blue-700",       dot: "bg-blue-400" },
  CHECKED_IN: { label: "Checked In",  labelVi: "Đã check-in",   color: "bg-cyan-50 border-cyan-200 text-cyan-700",       dot: "bg-cyan-400" },
  IN_PROGRESS:{ label: "In Progress", labelVi: "Đang rửa",      color: "bg-violet-50 border-violet-200 text-violet-700", dot: "bg-violet-400" },
  COMPLETED:  { label: "Completed",   labelVi: "Hoàn thành",    color: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-400" },
  CANCELLED:  { label: "Cancelled",   labelVi: "Đã hủy",        color: "bg-slate-50 border-slate-200 text-slate-500",    dot: "bg-slate-400" },
};

export default function AdminOperationsPage() {
  const { language } = useLanguageStore();
  const getErrorMessage = useErrorMessage();
  const t = (vi: string, en: string) => translate(language, vi, en);
  const queryClient = useQueryClient();

  const queueQuery = useQuery<OperationsQueue, ApiErrorResponse>({
    queryKey: ["admin-operations", "queue"],
    queryFn: getOperationsQueue,
    refetchInterval: 30_000,
  });

  const eligibleQuery = useQuery<EligibleSessionBooking[], ApiErrorResponse>({
    queryKey: ["admin-operations", "eligible"],
    queryFn: getEligibleSessionBookings,
    refetchInterval: 30_000,
  });

  const createMutation = useMutation<CreateWashSessionResponse, ApiErrorResponse, string>({
    mutationFn: (bookingId) => createWashSession(bookingId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-operations"] }),
        queryClient.invalidateQueries({ queryKey: ["staff-operations"] }),
      ]);
      toast.success(t("Đã tạo phiên rửa xe thành công!", "Wash session created."));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const summary = queueQuery.data?.summary;
  const columns = queueQuery.data?.columns ?? [];

  function handleRefresh() {
    void queueQuery.refetch();
    void eligibleQuery.refetch();
  }

  return (
    <WorkspacePage className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">
                {t("Quản lý Vận hành", "Operations Management")}
              </h1>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t("Trực tiếp", "Live")}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {t("Theo dõi và quản lý các phiên rửa xe theo thời gian thực", "Monitor and manage wash sessions in real time")}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs font-bold" onClick={handleRefresh}
          disabled={queueQuery.isFetching || eligibleQuery.isFetching}>
          <RefreshCcw className={cn("h-3.5 w-3.5", (queueQuery.isFetching || eligibleQuery.isFetching) && "animate-spin")} />
          {t("Làm mới", "Refresh")}
        </Button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: t("Tổng hàng đợi", "Total Queue"),
            value: summary?.total ?? 0,
            icon: Users,
            color: "text-slate-700 bg-slate-100",
          },
          {
            label: t("Đã check-in", "Checked In"),
            value: summary?.checkedIn ?? 0,
            icon: Clock,
            color: "text-cyan-700 bg-cyan-50",
          },
          {
            label: t("Đang rửa", "In Progress"),
            value: summary?.inProgress ?? 0,
            icon: Droplets,
            color: "text-violet-700 bg-violet-50",
          },
          {
            label: t("Hoàn thành hôm nay", "Completed Today"),
            value: summary?.completed ?? 0,
            icon: CheckCircle2,
            color: "text-emerald-700 bg-emerald-50",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-slate-200 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                {queueQuery.isLoading ? (
                  <div className="mt-1 h-7 w-12 animate-pulse rounded bg-slate-100" />
                ) : (
                  <p className="mt-0.5 text-3xl font-black text-slate-900 leading-none">{value}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Live Queue Kanban ───────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {t("Hàng đợi phiên rửa xe", "Live Operations Queue")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {queueQuery.isLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="min-w-[260px] h-48 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : queueQuery.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {getErrorMessage(queueQuery.error)}
            </div>
          ) : columns.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm font-semibold">
              {t("Không có phiên nào đang hoạt động", "No active sessions")}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {columns.map((col) => {
                const cfg = STATUS_CONFIG[col.status] ?? STATUS_CONFIG.PENDING;
                return (
                  <div key={col.status} className="min-w-[260px] max-w-[280px] flex-shrink-0">
                    {/* Column header */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", cfg.dot)} />
                        <span className="text-xs font-black text-slate-700">
                          {language === "vi" ? cfg.labelVi : cfg.label}
                        </span>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                        {col.sessions.length}
                      </span>
                    </div>
                    {/* Session cards */}
                    <div className="space-y-2">
                      {col.sessions.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-6 text-center">
                          <p className="text-[11px] text-slate-400 font-semibold">
                            {t("Trống", "Empty")}
                          </p>
                        </div>
                      ) : (
                        col.sessions.map((session) => (
                          <SessionCard key={session.sessionId} session={session} language={language} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Eligible Bookings ───────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-black text-slate-800">
            {t("Lịch đặt sẵn sàng tạo phiên rửa", "Bookings Ready for Session")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {eligibleQuery.isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : eligibleQuery.isError ? (
            <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {getErrorMessage(eligibleQuery.error)}
            </div>
          ) : !eligibleQuery.data || eligibleQuery.data.length === 0 ? (
            <div className="py-12 text-center">
              <Car className="mx-auto h-10 w-10 text-slate-200 mb-3" />
              <p className="text-sm text-slate-400 font-semibold">
                {t("Không có lịch đặt nào sẵn sàng", "No eligible bookings at the moment")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {eligibleQuery.data.map((booking) => {
                const isCreating = createMutation.isPending && createMutation.variables === booking.bookingId;
                return (
                  <div key={booking.bookingId} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    {/* Customer info */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-800">{booking.customerName}</span>
                        <span className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-600">
                          {booking.vehiclePlate}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] font-semibold text-slate-400">
                        <span>{booking.bookingDate} {booking.bookingTime}</span>
                        <span>•</span>
                        <span>{booking.estimatedDurationMinutes} phút</span>
                        <span>•</span>
                        <span>{booking.finalAmount.toLocaleString("vi-VN")} VND</span>
                      </div>
                    </div>
                    {/* Phone */}
                    <span className="hidden sm:block text-xs font-semibold text-slate-400">
                      {booking.customerPhone}
                    </span>
                    {/* Action */}
                    <Button
                      type="button"
                      size="sm"
                      disabled={isCreating}
                      onClick={() => createMutation.mutate(booking.bookingId)}
                      className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs gap-1.5 shrink-0"
                    >
                      {isCreating
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <PlayCircle className="h-3.5 w-3.5" />}
                      {t("Tạo phiên rửa", "Create Session")}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </WorkspacePage>
  );
}

// ── Session Card component ─────────────────────────────────────────────────────
function SessionCard({ session, language }: { session: OperationsQueueSession; language: string }) {
  const cfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.PENDING;

  function formatTime(iso?: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US", {
      hour: "2-digit", minute: "2-digit",
    });
  }

  const activeTime = formatTime(session.startedAt) ?? formatTime(session.checkedInAt) ?? formatTime(session.queuedAt);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2.5">
      {/* Top row: name + status */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-black text-slate-800 leading-tight">{session.customerName}</span>
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black shrink-0", cfg.color)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
          {language === "vi" ? cfg.labelVi : cfg.label}
        </span>
      </div>

      {/* Vehicle plate */}
      <div className="flex items-center gap-1.5">
        <Car className="h-3 w-3 text-slate-400 shrink-0" />
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">
          {session.vehiclePlate}
        </span>
        {session.servicePackage && (
          <span className="text-[10px] font-semibold text-slate-400 truncate">{session.servicePackage}</span>
        )}
      </div>

      {/* Time + Staff */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
        <span>{session.bookingDate} {session.bookingTime}</span>
        {session.assignedStaffName && (
          <span className="flex items-center gap-1">
            <Wrench className="h-2.5 w-2.5" />
            {session.assignedStaffName}
          </span>
        )}
      </div>

      {/* Active time indicator */}
      {activeTime && (
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-2">
          <Timer className="h-2.5 w-2.5" />
          {language === "vi" ? "Kể từ" : "Since"} {activeTime}
        </div>
      )}
    </div>
  );
}
