"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  Clock,
  Sparkles,
  Layers,
  PackageCheck,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/shared/ui/ui/sheet";
import {
  useCartStore,
  removeCartItem,
  clearCustomerCart,
  type CartItem,
} from "@/features/cart/store/cart.store";
import { updateBookingDraft } from "@/features/bookings/store/booking.store";
import { formatBookingCurrency } from "@/features/bookings/lib/booking-format";
import { toast } from "sonner";

export function CartDrawer({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalPrice = items.reduce((sum, i) => sum + i.price, 0);
  const totalDuration = items.reduce((sum, i) => sum + (i.durationMinutes || 0), 0);

  const mainPackageOrCombo = items.find(
    (i) => i.type === "PACKAGE" || i.type === "COMBO"
  );
  const addons = items.filter((i) => i.type === "ADDON");

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("Giỏ hàng của bạn đang trống!");
      return;
    }

    // Pre-fill booking draft
    if (mainPackageOrCombo) {
      if (mainPackageOrCombo.type === "PACKAGE") {
        updateBookingDraft({
          mode: "PACKAGE",
          packageId: mainPackageOrCombo.itemId,
          comboId: "",
          addonIds: addons.map((a) => a.itemId),
        });
      } else if (mainPackageOrCombo.type === "COMBO") {
        updateBookingDraft({
          mode: "COMBO",
          comboId: mainPackageOrCombo.itemId,
          packageId: "",
          addonIds: addons.map((a) => a.itemId),
        });
      }
    } else if (addons.length > 0) {
      // If client only selected addons, default to PACKAGE mode with selected addons
      updateBookingDraft({
        mode: "PACKAGE",
        addonIds: addons.map((a) => a.itemId),
      });
    }

    setOpen(false);
    toast.success("Đã đồng bộ giỏ hàng sang trang Đặt lịch!");
    router.push("/customer/booking");
  };

  if (!mounted) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-900/10 bg-white/90 transition hover:border-cyan-300/50 hover:bg-cyan-50"
            aria-label="Giỏ hàng dịch vụ"
          >
            <ShoppingBag className={cn("h-4 w-4", items.length > 0 ? "text-cyan-700" : "text-muted-foreground")} />
            {items.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-white animate-in zoom-in">
                {items.length}
              </span>
            )}
          </button>
        )}
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Giỏ hàng dịch vụ ({items.length})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
              <ShoppingBag className="h-8 w-8 opacity-40" />
            </div>
            <p className="text-sm font-medium">Giỏ hàng của bạn đang trống</p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Hãy chọn gói rửa xe hoặc các dịch vụ đi kèm mong muốn từ trang Dịch vụ hoặc Combo.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 rounded-xl"
              onClick={() => {
                setOpen(false);
                router.push("/customer/services");
              }}
            >
              Khám phá dịch vụ
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Direct Warning if no package/combo selected */}
            {!mainPackageOrCombo && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Bạn chỉ mới chọn dịch vụ bổ sung. Nên chọn thêm gói rửa chính để được phục vụ tốt nhất.
              </div>
            )}

            {/* Render Items */}
            <div className="space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:border-primary/30"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          item.type === "COMBO"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            : item.type === "PACKAGE"
                            ? "bg-primary/10 text-primary"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {item.type === "COMBO"
                          ? "Combo"
                          : item.type === "PACKAGE"
                          ? "Gói Rửa"
                          : "Dịch vụ đi kèm"}
                      </span>
                      <h4 className="text-sm font-bold text-foreground">{item.name}</h4>
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs pt-1">
                      <span className="font-semibold text-primary">
                        {formatBookingCurrency(item.price)}
                      </span>
                      {item.durationMinutes && (
                        <span className="flex items-center gap-1 text-muted-foreground text-[11px]">
                          <Clock className="h-3 w-3" />
                          {item.durationMinutes} phút
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeCartItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length > 0 && (
          <SheetFooter className="border-t pt-4 flex-col gap-3">
            <div className="w-full space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Ước tính thời gian:</span>
                <span className="font-medium text-foreground">
                  ~{totalDuration} phút
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>Tổng tạm tính:</span>
                <span className="text-base text-primary">
                  {formatBookingCurrency(totalPrice)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 w-full pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-1/3 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => clearCustomerCart()}
              >
                Xóa tất cả
              </Button>

              <Button
                className="w-2/3 gap-2 font-semibold shadow-md"
                onClick={handleCheckout}
              >
                Tiến hành Đặt lịch
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
