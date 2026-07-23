"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  Clock,
  Sparkles,
  Plus,
  Minus,
  Gift,
  ShieldCheck,
  Zap,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { cn } from "@/shared/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/ui/popover";
import {
  useCartStore,
  removeCartItem,
  updateCartItemQuantity,
  clearCustomerCart,
  setCartCheckoutSnapshot,
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

  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const packageItems = items.filter((item) => item.type === "PACKAGE");
  const comboItems = items.filter((item) => item.type === "COMBO");
  const addons = items.filter((item) => item.type === "ADDON");
  const estimatedPoints = Math.floor(totalPrice / 1000);
  const comboCheckoutSnapshot = comboItems.map((item) => ({
    type: item.type,
    itemId: item.itemId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    durationMinutes: item.durationMinutes,
    description: item.description,
    categoryName: item.categoryName,
  }));

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    if (packageItems.length > 0) {
      const mainPackage = packageItems[0];
      updateBookingDraft({
        mode: "PACKAGE",
        packageId: mainPackage.itemId,
        comboId: "",
        addonIds: addons.map((item) => item.itemId),
      });
      setOpen(false);
      router.push("/customer/bookings/new");
      return;
    }

    if (comboItems.length > 0) {
      setCartCheckoutSnapshot(comboCheckoutSnapshot);
      setOpen(false);
      router.push("/customer/combos/checkout");
      return;
    }

    if (addons.length > 0) {
      updateBookingDraft({
        mode: "PACKAGE",
        addonIds: addons.map((item) => item.itemId),
      });
      setOpen(false);
      router.push("/customer/bookings/new");
    }
  };

  if (!mounted) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-950/10 bg-white/90 shadow-sm transition-all duration-200 hover:scale-105 hover:border-cyan-300/50 hover:bg-cyan-50 dark:border-cyan-500/20 dark:bg-slate-900/90 dark:hover:bg-slate-800"
            aria-label="Service cart"
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
        className="flex max-h-[580px] w-[380px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-0 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 sm:w-[420px] dark:border-slate-800 dark:bg-slate-950/95"
      >
        <div className="relative border-b border-slate-200/70 bg-white/60 px-5 py-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-600 dark:text-cyan-400">
                <ShoppingBag className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-black leading-tight text-slate-900 dark:text-white">
                  Service cart
                </h3>
                <p className="text-[10px] font-normal text-muted-foreground">
                  {totalItemCount > 0 ? `${totalItemCount} items selected` : "No services selected"}
                </p>
              </div>
            </div>

            {totalItemCount > 0 && (
              <button
                type="button"
                onClick={() => clearCustomerCart()}
                className="flex items-center gap-1 text-[10px] font-bold text-rose-500 transition hover:text-rose-600 hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-100 p-1.5 opacity-70 transition-all hover:scale-105 hover:bg-slate-200 hover:opacity-100 dark:bg-slate-800 dark:hover:bg-slate-700"
            title="Close cart"
          >
            <X className="h-3.5 w-3.5 text-slate-700 dark:text-slate-200" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/20 bg-gradient-to-tr from-cyan-500/10 via-blue-500/10 to-indigo-500/10 shadow-inner">
              <ShoppingBag className="h-8 w-8 text-cyan-600/60 dark:text-cyan-400/60" />
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-white shadow-md">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>

            <h4 className="text-sm font-black text-slate-900 dark:text-white">Your cart is empty</h4>
            <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-muted-foreground">
              Explore high-quality wash packages and combo deals at AutoWash Pro.
            </p>

            <div className="mt-5 flex w-full max-w-[280px] gap-2">
              <Button
                className="h-9 flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-xs font-semibold text-white shadow-md hover:from-cyan-500 hover:to-blue-500"
                onClick={() => {
                  setOpen(false);
                  router.push("/customer/services");
                }}
              >
                Service catalog
              </Button>
              <Button
                variant="outline"
                className="h-9 flex-1 rounded-xl border-slate-200 text-xs font-semibold dark:border-slate-800"
                onClick={() => {
                  setOpen(false);
                  router.push("/customer/combos");
                }}
              >
                Combo deals
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="max-h-[340px] flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
              <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-indigo-500/10 p-3 shadow-sm">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 font-bold text-cyan-800 dark:text-cyan-300">
                    <Gift className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                    Estimated points:
                  </span>
                  <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 font-extrabold text-cyan-600 dark:text-cyan-400">
                    +{estimatedPoints} Aura Points
                  </span>
                </div>
              </div>

              {packageItems.length === 0 && comboItems.length === 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-300">
                  <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <p className="leading-normal opacity-90">
                    You only selected add-ons. Add a <strong>main wash package</strong> for the best result.
                  </p>
                </div>
              )}

              <div className="space-y-2.5">
                {items.map((item) => {
                  const isCombo = item.type === "COMBO";
                  const isPackage = item.type === "PACKAGE";

                  return (
                    <div
                      key={item.id}
                      className="group relative flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition-all hover:border-cyan-500/30 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider",
                              isCombo
                                ? "border border-purple-500/25 bg-purple-500/15 text-purple-700 dark:text-purple-300"
                                : isPackage
                                  ? "border border-cyan-500/25 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
                                  : "border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                            )}
                          >
                            {isCombo ? "Combo" : isPackage ? "Package" : "Addon"}
                          </span>
                        </div>

                        <h4 className="truncate text-xs font-bold text-slate-900 dark:text-white">
                          {item.name}
                        </h4>

                        <div className="flex items-center gap-2.5 pt-0.5 text-[11px]">
                          <span className="font-black text-cyan-600 dark:text-cyan-400">
                            {formatBookingCurrency(item.price * item.quantity)}
                          </span>
                          {item.durationMinutes && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {item.durationMinutes * item.quantity} min
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end justify-between gap-1.5 self-stretch">
                        <button
                          type="button"
                          className="p-0.5 text-slate-400 transition hover:text-rose-500"
                          onClick={() => removeCartItem(item.id)}
                          title="Remove item"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>

                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-inner dark:border-slate-800 dark:bg-slate-950">
                          <button
                            type="button"
                            className="flex h-5 w-5 items-center justify-center rounded bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-90 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            onClick={() => updateCartItemQuantity(item.id, -1)}
                            title="Decrease quantity"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="w-5 text-center text-[11px] font-black text-slate-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="flex h-5 w-5 items-center justify-center rounded bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-90 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            onClick={() => updateCartItemQuantity(item.id, 1)}
                            title="Increase quantity"
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

            <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-white/80 p-5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
              <div className="space-y-1.5">
            <div className="flex items-baseline justify-between border-t border-slate-100 pt-1 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Subtotal</span>
                    <div className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-2.5 w-2.5" /> Taxes and fees included
                    </div>
                  </div>
                  <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-base font-black text-transparent dark:from-cyan-400 dark:to-blue-400">
                    {formatBookingCurrency(totalPrice)}
                  </span>
                </div>
              </div>

              <Button
                className="h-10 w-full gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 font-bold text-white shadow-md transition-all hover:from-cyan-500 hover:to-indigo-500 active:scale-[0.98]"
                onClick={handleCheckout}
              >
                Proceed to checkout
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
