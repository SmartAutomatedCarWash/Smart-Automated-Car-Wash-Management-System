"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, CheckCircle2, Clock3, Droplets, RefreshCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { getDisplayErrorMessage } from "@/shared/lib/api-errors";
import { getOperationsQueue, getStaffDashboardSummary } from "@/features/operations/lib/operations-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueueSession } from "@/entities/operations";

export function StaffDashboardView() {
  const userId = useAuthStore((state) => state.user?.userId);
  const queueQuery = useQuery({ queryKey: ["staff-dashboard", "queue"], queryFn: getOperationsQueue, refetchInterval: 15_000 });
  const summaryQuery = useQuery({ queryKey: ["staff-dashboard", "summary"], queryFn: getStaffDashboardSummary, refetchInterval: 30_000 });
  const sessions = useMemo(() => (queueQuery.data?.columns.flatMap((column) => column.sessions) ?? []).filter((session) => session.assignedStaffId === userId), [queueQuery.data, userId]);
  const ready = sessions.filter((session) => session.status === "CHECKED_IN");
  const washing = sessions.filter((session) => session.status === "IN_PROGRESS");
  const current = washing[0] ?? ready[0];

  return <WorkspacePage className="space-y-6"><section className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Your shift</p><h1 className="mt-1 text-2xl font-black text-slate-950">Staff Dashboard</h1><p className="mt-1 text-sm text-slate-500">Tập trung vào xe đang được giao và bước tiếp theo cần thực hiện.</p></div><Button variant="outline" className="rounded-xl" onClick={() => queueQuery.refetch()} disabled={queueQuery.isFetching}><RefreshCcw className={`h-4 w-4 ${queueQuery.isFetching ? "animate-spin" : ""}`} /> Làm mới</Button></section><div className="grid gap-3 sm:grid-cols-3"><Metric label="Sẵn sàng rửa" value={ready.length} icon={Clock3} tone="amber" /><Metric label="Đang rửa" value={washing.length} icon={Droplets} tone="cyan" /><Metric label="Hoàn thành hôm nay" value={summaryQuery.data?.completedSessions ?? sessions.filter((session) => session.status === "COMPLETED").length} icon={CheckCircle2} tone="emerald" /></div>{queueQuery.isError ? <WorkspaceEmptyState title="Không thể tải ca làm" description={getDisplayErrorMessage(queueQuery.error as unknown as ApiErrorResponse)} /> : current ? <Card className="rounded-3xl border-slate-200 bg-slate-950 p-6 text-white shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Next action</p><h2 className="mt-2 text-3xl font-black">{current.vehiclePlate}</h2><p className="mt-1 text-sm text-slate-300">{current.servicePackage ?? "Gói rửa"} · {current.status === "IN_PROGRESS" ? "Đang rửa" : "Sẵn sàng bắt đầu"}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{current.bookingTime}</span></div><Button asChild className="mt-6 rounded-xl bg-white text-slate-950 hover:bg-cyan-50"><Link href={`/staff/sessions/${current.sessionId}`}>Mở session <ArrowRight className="h-4 w-4" /></Link></Button></Card> : <WorkspaceEmptyState title="Chưa có session được giao" description="Manager sẽ check-in và phân công xe cho bạn." />}</WorkspacePage>;
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Clock3; tone: "amber" | "cyan" | "emerald" }) { const styles = { amber: "bg-amber-50 text-amber-700", cyan: "bg-cyan-50 text-cyan-700", emerald: "bg-emerald-50 text-emerald-700" }; return <Card className="rounded-2xl border-slate-200 p-4 shadow-sm"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}><Icon className="h-5 w-5" /></div><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="text-2xl font-black text-slate-950">{value}</p></div></div></Card>; }
