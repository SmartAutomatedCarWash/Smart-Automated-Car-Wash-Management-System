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
  Plus,
  Minus,
  Gift,
  ShieldCheck,
  Zap,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/ui/popover";
import {
  useCartStore,
  removeCartItem,
  updateCartItemQuantity,
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

  const totalItemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalDuration = items.reduce((sum, i) => sum + (i.durationMinutes || 0) * i.quantity, 0);

  const mainPackageOrCombo = items.find(
    (i) => i.type === "PACKAGE" || i.type === "COMBO"
  );
  const addons = items.filter((i) => i.type === "ADDON");

  // Perks / Loyalty Points calculation (e.g., 1000 VND = 1 Point)
  const estimatedPoints = Math.floor(totalPrice / 1000);

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("Giỏ hàng của bạn đang trống!");
      return;
    }

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-950/10 bg-white/90 shadow-sm transition-all duration-200 hover:scale-105 hover:border-cyan-300/50 hover:bg-cyan-50 dark:border-cyan-500/20 dark:bg-slate-900/90 dark:hover:bg-slate-800"
            aria-label="Giỏ hàng dịch vụ"
          >
            <ShoppingBag className={cn("h-4 w-4 transition-transform", totalItemCount > 0 ? "text-cyan-700 dark:text-cyan-400" : "text-muted-foreground")} />
            {totalItemCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-1 text-[10px] font-black text-white shadow-md ring-2 ring-white dark:ring-slate-900 animate-in zoom-in">
                {totalItemCount}
              </span>
            )}
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="flex w-[380px] sm:w-[420px] max-h-[580px] flex-col p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      >
        {/* Floating Dropdown Header */}
        <div className="relative pl-5 pr-14 py-4 border-b border-slate-200/70 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                <ShoppingBag className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                  Giỏ hàng dịch vụ
                </h3>
                <p className="text-[10px] text-muted-foreground font-normal">
                  {totalItemCount > 0 ? `${totalItemCount} mục được chọn` : "Chưa chọn dịch vụ nào"}
                </p>
              </div>
            </div>

            {totalItemCount > 0 && (
              <button
                type="button"
                onClick={() => clearCustomerCart()}
                className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition hover:underline flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Close button X */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 opacity-70 bg-slate-100 dark:bg-slate-800 hover:opacity-100 hover:scale-105 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all z-10"
            title="Đóng giỏ hàng"
          >
            <X className="h-3.5 w-3.5 text-slate-700 dark:text-slate-200" />
          </button>
        </div>

        {/* Dynamic Body */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/10 via-blue-500/10 to-indigo-500/10 border border-cyan-500/20 shadow-inner">
              <ShoppingBag className="h-8 w-8 text-cyan-600/60 dark:text-cyan-400/60" />
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-white shadow-md">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>

            <h4 className="text-sm font-black text-slate-900 dark:text-white">Giỏ hàng của bạn đang trống</h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-[220px] leading-relaxed">
              Khám phá các gói rửa xe chất lượng cao & combo tiết kiệm tại AutoWash Pro!
            </p>

            <div className="mt-5 flex gap-2 w-full max-w-[280px]">
              <Button
                className="flex-1 h-9 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-semibold shadow-md hover:from-cyan-500 hover:to-blue-500"
                onClick={() => {
                  setOpen(false);
                  router.push("/customer/services");
                }}
              >
                Gói Rửa Xe
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-9 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold"
                onClick={() => {
                  setOpen(false);
                  router.push("/customer/combos");
                }}
              >
                Combo Ưu Đãi
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 max-h-[340px]">
              {/* Upsell / Loyalty Perks Bar */}
              <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-indigo-500/10 p-3 shadow-sm">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 font-bold text-cyan-800 dark:text-cyan-300">
                    <Gift className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                    Tích lũy:
                  </span>
                  <span className="font-extrabold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    +{estimatedPoints} Aura Points
                  </span>
                </div>
              </div>

              {/* Direct Warning if no package/combo selected */}
              {!mainPackageOrCombo && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-300">
                  <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="opacity-90 leading-normal">
                    Bạn chỉ chọn dịch vụ đi kèm. Hãy thêm một <strong>Gói rửa chính</strong> để xe được chăm sóc tốt nhất!
                  </p>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2.5">
                {items.map((item) => {
                  const isCombo = item.type === "COMBO";
                  const isPackage = item.type === "PACKAGE";

                  return (
                    <div
                      key={item.id}
                      className="relative group flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm transition-all hover:border-cyan-500/30"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        {/* Tag */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider",
                              isCombo
                                ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25"
                                : isPackage
                                ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25"
                            )}
                          >
                            {isCombo ? "Combo" : isPackage ? "Gói Rửa" : "Đi kèm"}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </h4>

                        {/* Meta (Price & Duration) */}
                        <div className="flex items-center gap-2.5 text-[11px] pt-0.5">
                          <span className="font-black text-cyan-600 dark:text-cyan-400">
                            {formatBookingCurrency(item.price * item.quantity)}
                          </span>
                          {item.durationMinutes && (
                            <span className="flex items-center gap-0.5 text-muted-foreground text-[10px]">
                              <Clock className="h-3 w-3" />
                              {item.durationMinutes * item.quantity} phút
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Controls: Delete & Quantity Counter */}
                      <div className="flex flex-col items-end justify-between self-stretch gap-1.5 shrink-0">
                        <button
                          type="button"
                          className="text-slate-400 hover:text-rose-500 transition p-0.5"
                          onClick={() => removeCartItem(item.id)}
                          title="Xóa mục này"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>

                        {/* Quantity Controls */}
                        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-0.5 shadow-inner">
                          <button
                            type="button"
                            className="flex h-5 w-5 items-center justify-center rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 disabled:opacity-50"
                            onClick={() => updateCartItemQuantity(item.id, -1)}
                            title="Giảm số lượng"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="w-5 text-center text-[11px] font-black text-slate-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="flex h-5 w-5 items-center justify-center rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90"
                            onClick={() => updateCartItemQuantity(item.id, 1)}
                            title="Tăng số lượng"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Summary Action */}
            <div className="p-5 border-t border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col gap-3">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                    Tổng thời gian thi công dự kiến:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ~{totalDuration} phút
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Tổng tạm tính</span>
                    <div className="flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                      <ShieldCheck className="h-2.5 w-2.5" /> Đã gồm thuế và phí
                    </div>
                  </div>
                  <span className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400">
                    {formatBookingCurrency(totalPrice)}
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-10 gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 font-bold text-white shadow-md hover:from-cyan-500 hover:to-indigo-500 transition-all active:scale-[0.98]"
                onClick={handleCheckout}
              >
                Tiến hành Đặt lịch
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
