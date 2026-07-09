"use client";

import Link from "next/link";
import { Clock3, LoaderCircle, TimerReset, Truck } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { WorkspaceEmptyState, WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { cn } from "@/shared/lib/utils";

type OperationCard = {
  id: string;
  plate: string;
  service: string;
  meta: string;
  priority: "late" | "soon" | "normal";
};

type OperationColumn = {
  id: string;
  title: string;
  tone: string;
  cards: OperationCard[];
};

const COLUMNS: OperationColumn[] = [
  {
    id: "pending",
    title: "Chờ duyệt",
    tone: "border-amber-200 bg-amber-50/50",
    cards: [{ id: "WS-01", plate: "51H-77889", service: "Rửa nâng cao", meta: "Khung 09:15", priority: "soon" }],
  },
  {
    id: "checked-in",
    title: "Đã check-in",
    tone: "border-slate-200 bg-slate-50/60",
    cards: [
      { id: "WS-02", plate: "30A-11223", service: "Rửa cao cấp", meta: "Khoang 2", priority: "normal" },
      { id: "WS-03", plate: "43C-55667", service: "Combo vàng", meta: "Khoang 4", priority: "late" },
    ],
  },
  {
    id: "in-progress",
    title: "Đang rửa",
    tone: "border-cyan-200 bg-cyan-50/60",
    cards: [{ id: "WS-04", plate: "59F-99001", service: "Nội thất và phủ sáp", meta: "Còn 18:42", priority: "normal" }],
  },
  {
    id: "completed",
    title: "Đã hoàn thành",
    tone: "border-cyan-200 bg-cyan-50/45",
    cards: [{ id: "WS-05", plate: "72E-33445", service: "Rửa nhanh", meta: "Chờ nhận xe", priority: "normal" }],
  },
];

const PRIORITY_DOT = {
  late: "bg-rose-500",
  soon: "bg-amber-500",
  normal: "bg-cyan-500",
};

export function StaffOperationsBoard() {
  return (
    <WorkspacePage className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Truck} label="Khoang đã phân công" value="4 / 6" />
        <MetricCard icon={LoaderCircle} label="Đang rửa" value="3" />
        <MetricCard icon={TimerReset} label="Thời lượng trung bình" value="28 phút" />
      </section>

      <section className="overflow-x-auto pb-2">
        <div className="flex min-w-[64rem] gap-4">
          {COLUMNS.map((column) => (
            <div key={column.id} className={cn("w-72 shrink-0 rounded-2xl border p-3", column.tone)}>
              <header className="mb-3 px-1">
                <h2 className="text-sm font-bold">{column.title}</h2>
                <p className="text-xs text-muted-foreground">{column.cards.length} phiên</p>
              </header>
              <div className="space-y-3">
                {column.cards.length === 0 ? (
                  <WorkspaceEmptyState title="Chưa có phiên" description="Cột này hiện đang trống." />
                ) : (
                  column.cards.map((card) => (
                    <Card key={card.id} className="border-border/70 bg-card p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold">{card.plate}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{card.service}</div>
                        </div>
                        <span
                          className={cn("mt-1 h-2.5 w-2.5 rounded-full", PRIORITY_DOT[card.priority])}
                          title={card.priority}
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        {card.meta}
                      </div>
                      <Button className="mt-4 w-full" size="sm" variant="outline" asChild>
                        <Link href={`/staff/sessions/${card.id}`}>Mở phiên</Link>
                      </Button>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Hàng đợi tự làm mới từ API vận hành. Màu đỏ là trễ, vàng là sắp đến, xanh là đúng tiến độ.
      </p>
    </WorkspacePage>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Truck;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-4 border-border/70 bg-card/95 p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-800">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-black tracking-tight">{value}</p>
      </div>
    </Card>
  );
}
