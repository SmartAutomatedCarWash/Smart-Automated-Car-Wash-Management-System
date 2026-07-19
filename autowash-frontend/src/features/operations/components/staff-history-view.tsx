"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, History } from "lucide-react";
import { Card } from "@/shared/ui/ui/card";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { getOperationsQueue } from "@/features/operations/lib/operations-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueueSession } from "@/entities/operations";

export function StaffHistoryView() {
  const getErrorMessage = useErrorMessage();
  const userId = useAuthStore((state) => state.user?.userId);
  const queueQuery = useQuery({ queryKey: ["staff-history", "queue"], queryFn: getOperationsQueue, refetchInterval: 60_000 });
  const sessions = useMemo(() => (queueQuery.data?.columns.flatMap((column) => column.sessions) ?? []).filter((session) => session.assignedStaffId === userId && session.status === "COMPLETED").sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")), [queueQuery.data, userId]);

  return <WorkspacePage className="space-y-5"><section><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Completed work</p><h1 className="mt-1 text-2xl font-black text-slate-950">Lịch sử phiên rửa</h1><p className="mt-1 text-sm text-slate-500">Các phiên đã hoàn thành bởi tài khoản của bạn.</p></section>{queueQuery.isError ? <WorkspaceEmptyState title="Không thể tải lịch sử" description={getErrorMessage(queueQuery.error as unknown as ApiErrorResponse)} /> : queueQuery.isPending ? <div className="h-48 animate-pulse rounded-3xl bg-slate-100" /> : sessions.length === 0 ? <WorkspaceEmptyState title="Chưa có phiên hoàn thành" description="Các phiên hoàn tất sẽ xuất hiện ở đây." /> : <div className="space-y-3">{sessions.map((session) => <HistoryRow key={session.sessionId} session={session} />)}</div>}</WorkspacePage>;
}

function HistoryRow({ session }: { session: OperationsQueueSession }) { return <Card className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-slate-200 p-4 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></div><div><p className="font-black text-slate-900">{session.vehiclePlate}</p><p className="text-xs text-slate-500">{session.servicePackage ?? "Gói rửa"} · Booking {session.bookingId}</p></div></div><div className="text-right text-xs text-slate-500"><p className="font-bold text-emerald-700">Hoàn thành</p><p>{formatDateTime(session.completedAt)}</p></div></Card>; }
function formatDateTime(value?: string | null) { return value ? new Date(value).toLocaleString("vi-VN") : "Chưa có"; }
