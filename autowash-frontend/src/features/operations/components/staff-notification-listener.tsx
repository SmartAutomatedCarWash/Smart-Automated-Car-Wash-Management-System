"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, BellRing, ClipboardCheck } from "lucide-react";
import { getOperationsQueue } from "@/features/operations/lib/operations-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { cn } from "@/shared/lib/utils";

export function StaffNotificationListener() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const enabled = Boolean(accessToken && user?.role === "STAFF");

  const queueQuery = useQuery({
    queryKey: ["staff-notifications", "queue"],
    queryFn: getOperationsQueue,
    enabled,
    refetchInterval: 10_000,
  });

  const pendingSessions = useMemo(() => {
    if (!queueQuery.data) return [];
    const sessions = queueQuery.data.columns.flatMap((column) => column.sessions);
    return sessions.filter((session) => session.status === "CHECKED_IN");
  }, [queueQuery.data]);

  const firstPendingSessionId = pendingSessions[0]?.sessionId ?? null;
  const pendingSessionsCount = pendingSessions.length;
  const hasTasks = pendingSessionsCount > 0;

  if (!hasTasks || user?.role !== "STAFF") return null;

  return null;
}
