"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Droplets, Loader2, Play } from "lucide-react";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import { completeWashSession, getOperationsQueue, startWashSession } from "@/features/operations/lib/operations-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { OperationsQueueSession } from "@/entities/operations";

export function StaffSessionDetailView({ sessionId }: { sessionId: string }) {
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.userId);
  const queueQuery = useQuery({ queryKey: ["staff-my-sessions", "queue"], queryFn: getOperationsQueue, refetchInterval: 15_000 });
  const session = queueQuery.data?.columns.flatMap((column) => column.sessions).find((item) => item.sessionId === sessionId && item.assignedStaffId === userId);
  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ["staff-my-sessions"] }); void queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] }); };
  const startMutation = useMutation({ mutationFn: startWashSession, onSuccess: () => { invalidate(); notify.success("Đã bắt đầu rửa xe."); }, onError: (error: ApiErrorResponse) => notify.error(getErrorMessage(error)) });
  const completeMutation = useMutation({ mutationFn: completeWashSession, onSuccess: () => { invalidate(); notify.success("Đã hoàn tất phiên rửa."); }, onError: (error: ApiErrorResponse) => notify.error(getErrorMessage(error)) });

  if (queueQuery.isPending) return <WorkspacePage><div className="h-64 animate-pulse rounded-3xl bg-slate-100" /></WorkspacePage>;
  if (queueQuery.isError) return <WorkspacePage><WorkspaceEmptyState title="Không thể tải session" description={getErrorMessage(queueQuery.error as unknown as ApiErrorResponse)} /></WorkspacePage>;
  if (!session) return <WorkspacePage><WorkspaceEmptyState title="Không tìm thấy session" description="Session không tồn tại hoặc không được phân công cho tài khoản này." /></WorkspacePage>;
  const isReady = session.status === "CHECKED_IN";
  const isWashing = session.status === "IN_PROGRESS";
  const isCompleted = session.status === "COMPLETED";
  return <WorkspacePage className="space-y-5"><Button variant="ghost" asChild className="px-0 text-slate-600 hover:bg-transparent hover:text-slate-950"><Link href="/staff/my-sessions"><ArrowLeft className="h-4 w-4" /> Quay lại phiên của tôi</Link></Button><Card className="mx-auto max-w-2xl rounded-3xl border-slate-200 p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Wash session</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{session.vehiclePlate}</h1><p className="mt-1 text-slate-500">{session.servicePackage ?? "Gói rửa"} · {session.estimatedDurationMinutes ?? "--"} phút</p></div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">{isCompleted ? <CheckCircle2 /> : <Droplets />}</div></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><Info label="Biển số" value={session.vehiclePlate} /><Info label="Khung giờ" value={session.bookingTime} /><Info label="Check-in" value={formatDateTime(session.checkedInAt)} /><Info label="Bắt đầu" value={formatDateTime(session.startedAt)} /></div>{session.notes ? <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><strong>Ghi chú Manager:</strong> {session.notes}</div> : null}<div className="mt-6">{isReady ? <Button className="h-12 w-full rounded-xl bg-slate-950 text-base font-black text-white hover:bg-slate-800" onClick={() => startMutation.mutate(session.sessionId)} disabled={startMutation.isPending}><Play className="h-5 w-5" /> {startMutation.isPending ? "Đang cập nhật..." : "Bắt đầu rửa"}</Button> : null}{isWashing ? <Button className="h-12 w-full rounded-xl bg-emerald-600 text-base font-black text-white hover:bg-emerald-700" onClick={() => completeMutation.mutate(session.sessionId)} disabled={completeMutation.isPending}><CheckCircle2 className="h-5 w-5" /> {completeMutation.isPending ? "Đang cập nhật..." : "Hoàn tất rửa"}</Button> : null}{isCompleted ? <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-700"><CheckCircle2 className="h-5 w-5" /> Phiên đã hoàn thành</div> : null}</div></Card></WorkspacePage>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 px-3 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-bold text-slate-800">{value}</p></div>; }
function formatDateTime(value?: string | null) { return value ? new Date(value).toLocaleString("vi-VN") : "Chưa có"; }
