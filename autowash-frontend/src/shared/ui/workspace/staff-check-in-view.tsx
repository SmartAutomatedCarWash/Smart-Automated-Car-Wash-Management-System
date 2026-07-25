"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CarFront, ClipboardCheck, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card } from "@/shared/ui/ui/card";
import { Input } from "@/shared/ui/ui/input";
import { WorkspacePage } from "@/shared/ui/workspace/workspace-page";
import { checkInWashSession, createWashSession, getEligibleSessionBookings } from "@/features/operations/lib/operations-service";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import type { EligibleSessionBooking } from "@/entities/operations";

export function StaffCheckInView() {
  const queryClient = useQueryClient();
  const getErrorMessage = useErrorMessage();
  const [plate, setPlate] = useState("");
  const normalizedPlate = plate.trim().toUpperCase();

  const bookingsQuery = useQuery({
    queryKey: ["staff-check-in-candidates"],
    queryFn: () => getEligibleSessionBookings(undefined, 50),
  });

  const matchedBookings = useMemo(() => {
    const items = bookingsQuery.data ?? [];
    if (normalizedPlate.length < 3) return [];
    return items.filter((booking) => booking.vehiclePlate.toUpperCase().includes(normalizedPlate));
  }, [bookingsQuery.data, normalizedPlate]);

  const selectedBooking = matchedBookings[0] ?? null;

  const checkInMutation = useMutation({
    mutationFn: async (booking: EligibleSessionBooking) => {
      const created = await createWashSession(booking.bookingId, "Staff plate check-in");
      return checkInWashSession(created.sessionId);
    },
    onSuccess: async () => {
      toast.success("Xe đã được check-in và đồng bộ vào phiên rửa.");
      setPlate("");
      await queryClient.invalidateQueries({ queryKey: ["staff-check-in-candidates"] });
      await queryClient.invalidateQueries({ queryKey: ["operations-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["staff-today"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  return (
    <WorkspacePage className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border/70 bg-card/95 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Search className="h-4 w-4 text-cyan-800" />
            Tra cứu biển số
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Tìm đặt lịch hoặc xe đến trực tiếp trước khi tạo phiên rửa.
          </p>
          <div className="mt-5 space-y-3">
            <Input
              value={plate}
              onChange={(event) => setPlate(event.target.value.toUpperCase())}
              placeholder="Nhập biển số xe"
              aria-label="Biển số xe"
            />
            <Button
              className="w-full"
              type="button"
              disabled={!selectedBooking || checkInMutation.isPending}
              onClick={() => selectedBooking && checkInMutation.mutate(selectedBooking)}
            >
              <ClipboardCheck className="h-4 w-4" />
              {checkInMutation.isPending ? "Đang check-in..." : "Xác nhận check-in"}
            </Button>
          </div>
          <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 text-sm text-cyan-950">
            Check-in sử dụng API vận hành hiện tại để đồng bộ trạng thái phiên rửa.
          </div>
        </Card>

        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
          <div className="border-b border-border/60 bg-muted/30 px-6 py-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <CarFront className="h-4 w-4 text-cyan-800" />
              Thông tin khớp
            </div>
          </div>
          {selectedBooking ? (
            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-black tracking-tight">{selectedBooking.vehiclePlate}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{selectedBooking.customerName}</div>
                  </div>
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">
                    Sẵn sàng
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <Info label="Đặt lịch" value={selectedBooking.bookingId} />
                  <Info label="Dịch vụ" value={selectedBooking.packageId ?? selectedBooking.comboId ?? "Service"} />
                  <Info label="Khung giờ" value={selectedBooking.bookingTime} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/staff/operations">Chuyển sang vận hành</Link>
                </Button>
              </div>
            </div>
          ) : normalizedPlate.length >= 3 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                <Search className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-bold">Không tìm thấy booking phù hợp</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Kiểm tra lại biển số hoặc tạo booking trước khi check-in xe.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-800">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-bold">Đang chờ nhập biển số</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Nhập ít nhất ba ký tự để xem đặt lịch khớp và tiếp tục quy trình nhân viên.
              </p>
            </div>
          )}
        </Card>
      </section>
    </WorkspacePage>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
