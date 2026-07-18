"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Clock3, Droplets, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { completeWashSession, getOperationsQueue, startWashSession } from "@/features/operations/lib/operations-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueueSession } from "@/entities/operations";

export function StaffMySessionsView() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.userId);
  const queueQuery = useQuery({ queryKey: ["staff-my-sessions", "queue"], queryFn: getOperationsQueue, refetchInterval: 15_000 });
  const sessions = useMemo(() => (queueQuery.data?.columns.flatMap((column) => column.sessions) ?? []).filter((session) => session.assignedStaffId === userId), [queueQuery.data, userId]);

  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ["staff-my-sessions"] }); void queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] }); };
  const startMutation = useMutation({ mutationFn: startWashSession, onSuccess: () => { invalidate(); toast.success("Đã bắt đầu rửa xe."); }, onError: (error: ApiErrorResponse) => toast.error(getDisplayErrorMessage(error)) });
  const completeMutation = useMutation({ mutationFn: completeWashSession, onSuccess: () => { invalidate(); toast.success("Đã hoàn tất phiên rửa."); }, onError: (error: ApiErrorResponse) => toast.error(getDisplayErrorMessage(error)) });

  const ready = sessions.filter((session) => session.status === "CHECKED_IN");
  const washing = sessions.filter((session) => session.status === "IN_PROGRESS");
  const completed = sessions.filter((session) => session.status === "COMPLETED");
  const pendingAction = startMutation.isPending || completeMutation.isPending;

  return <WorkspacePage className="space-y-6"><section className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">My work</p><h1 className="mt-1 text-2xl font-black text-slate-950">Phiên rửa của tôi</h1><p className="mt-1 text-sm text-slate-500">Chỉ xử lý những xe đã được Manager check-in và phân công.</p></div><Button variant="outline" className="rounded-xl" onClick={() => queueQuery.refetch()} disabled={queueQuery.isFetching}><RefreshCcw className={`h-4 w-4 ${queueQuery.isFetching ? "animate-spin" : ""}`} /> Làm mới</Button></section><div className="grid gap-3 sm:grid-cols-3"><Metric icon={Clock3} label="Sẵn sàng rửa" value={ready.length} tone="amber" /><Metric icon={Droplets} label="Đang rửa" value={washing.length} tone="cyan" /><Metric icon={CheckCircle2} label="Hoàn thành hôm nay" value={completed.length} tone="emerald" /></div>{queueQuery.isError ? <WorkspaceEmptyState title="Không thể tải session" description={getDisplayErrorMessage(queueQuery.error as unknown as ApiErrorResponse)} /> : queueQuery.isPending ? <div className="h-48 animate-pulse rounded-3xl bg-slate-100" /> : sessions.length === 0 ? <WorkspaceEmptyState title="Chưa có session được phân công" description="Manager sẽ check-in và phân công xe cho bạn tại hàng đợi vận hành." /> : <div className="grid gap-4 lg:grid-cols-2"><div className="space-y-3">{ready.map((session) => <SessionCard key={session.sessionId} session={session} actionLabel="Bắt đầu rửa" onAction={() => startMutation.mutate(session.sessionId)} isPending={pendingAction} tone="amber" />)}{ready.length === 0 ? <EmptySection label="Không có xe đang chờ bắt đầu." /> : null}</div><div className="space-y-3">{washing.map((session) => <SessionCard key={session.sessionId} session={session} actionLabel="Hoàn tất rửa" onAction={() => completeMutation.mutate(session.sessionId)} isPending={pendingAction} tone="emerald" />)}{washing.length === 0 ? <EmptySection label="Không có xe đang rửa." /> : null}</div><div className="lg:col-span-2 space-y-3">{completed.slice(0, 5).map((session) => <CompletedRow key={session.sessionId} session={session} />)}</div></div>}</WorkspacePage>;
}

function SessionCard({ session, actionLabel, onAction, isPending, tone }: { session: OperationsQueueSession; actionLabel: string; onAction: () => void; isPending: boolean; tone: "amber" | "emerald" }) { const toneClass = tone === "amber" ? "border-amber-200 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/60"; return <Card className={`rounded-2xl p-5 shadow-sm ${toneClass}`}><div className="flex items-start justify-between gap-4"><div><p className="text-lg font-black text-slate-950">{session.vehiclePlate}</p><p className="mt-1 text-sm text-slate-600">{session.servicePackage ?? "Gói rửa"} · {session.estimatedDurationMinutes ?? "--"} phút</p></div><span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-slate-600">{session.bookingTime}</span></div>{session.notes ? <p className="mt-3 rounded-xl bg-white/60 px-3 py-2 text-xs text-slate-600">Ghi chú Manager: {session.notes}</p> : null}<div className="mt-4 flex flex-wrap gap-2"><Button className="flex-1 rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={onAction} disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : actionLabel}</Button><Button variant="outline" className="rounded-xl bg-white/70" asChild><Link href={`/staff/sessions/${session.sessionId}`}>Chi tiết <ArrowRight className="h-4 w-4" /></Link></Button></div></Card>; }

function CompletedRow({ session }: { session: OperationsQueueSession }) { return <Card className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-slate-200 p-4 shadow-sm"><div><p className="font-bold text-slate-900">{session.vehiclePlate}</p><p className="text-xs text-slate-500">{session.servicePackage ?? "Gói rửa"} · hoàn tất {formatTime(session.completedAt)}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">COMPLETED</span></Card>; }
function EmptySection({ label }: { label: string }) { return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">{label}</div>; }
function Metric({ icon: Icon, label, value, tone }: { icon: typeof Clock3; label: string; value: number; tone: "amber" | "cyan" | "emerald" }) { const styles = { amber: "bg-amber-50 text-amber-700", cyan: "bg-cyan-50 text-cyan-700", emerald: "bg-emerald-50 text-emerald-700" }; return <Card className="rounded-2xl border-slate-200 p-4 shadow-sm"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}><Icon className="h-5 w-5" /></div><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="text-2xl font-black text-slate-950">{value}</p></div></div></Card>; }
function formatTime(value?: string | null) { return value ? new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "--"; }
