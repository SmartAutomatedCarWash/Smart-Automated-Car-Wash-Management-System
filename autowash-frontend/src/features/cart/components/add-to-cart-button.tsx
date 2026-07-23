"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { useCartStore, addCartItem, type CartItemType } from "@/features/cart/store/cart.store";
import { cn } from "@/shared/lib/utils";
import { useLanguageStore, translate } from "@/shared/store/language.store";

type AddToCartButtonProps = {
  itemId: string;
  type: CartItemType;
  name: string;
  price: number;
  durationMinutes?: number;
  description?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
  allowRepeatAdd?: boolean;
};

const NOTICE_DURATION_MS = 3000;

export function AddToCartButton({
  itemId,
  type,
  name,
  price,
  durationMinutes,
  description,
  className,
  variant = "outline",
  size = "sm",
  showText = true,
  allowRepeatAdd = true,
}: AddToCartButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeProgress, setNoticeProgress] = useState(0);
  const items = useCartStore((state) => state.items);
  const { language } = useLanguageStore();
  const t = (vi: string, en: string) => translate(language, vi, en);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!notice) return;

    const startedAt = Date.now();
    setNoticeProgress(100);

    const progressTimer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.max(0, 100 - (elapsed / NOTICE_DURATION_MS) * 100);
      setNoticeProgress(nextProgress);
    }, 50);

    const dismissTimer = window.setTimeout(() => {
      setNotice(null);
    }, NOTICE_DURATION_MS);

    return () => {
      window.clearInterval(progressTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [notice]);

  if (!mounted) return null;

  const cartItem = items.find((item) => item.itemId === itemId && item.type === type) ?? null;
  const inCart = Boolean(cartItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addCartItem({
      itemId,
      type,
      name,
      price,
      durationMinutes,
      description,
      quantity: 1,
    });

    setNotice(
      inCart
        ? t(`Đã thêm thêm 1 "${name}" vào giỏ hàng`, `Added another "${name}" to cart`)
        : t(`Đã thêm "${name}" vào giỏ hàng`, `Added "${name}" to cart`),
    );
  };

  const noticeNode =
    notice && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed right-4 top-4 z-[100] w-[min(92vw,420px)]">
            <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 shadow-[0_18px_50px_rgba(16,185,129,0.18)] backdrop-blur-md animate-in fade-in slide-in-from-right-2 duration-200 dark:border-emerald-900/40 dark:bg-emerald-950/90 dark:text-emerald-100">
              <div
                className="h-1 bg-emerald-400/80 transition-[width] duration-75 ease-linear dark:bg-emerald-400"
                style={{ width: `${noticeProgress}%` }}
              />
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-5">{notice}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="rounded-full p-1 text-emerald-700 transition hover:bg-emerald-100 hover:text-emerald-900 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
                  aria-label="Close notification"
                >
                  <span className="text-lg leading-none">&times;</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {noticeNode}
      <Button
        type="button"
        variant={inCart ? "secondary" : variant}
        size={size}
        onClick={handleAddToCart}
        className={cn(
          "gap-1.5 transition-all",
          inCart && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
          className,
        )}
      >
        {inCart ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            {showText && (
              <span>
                {allowRepeatAdd
                  ? t(`Đã có x${cartItem?.quantity ?? 1}`, `Added x${cartItem?.quantity ?? 1}`)
                  : t("Đã trong giỏ", "In cart")}
              </span>
            )}
          </>
        ) : (
          <>
            <ShoppingBag className="h-3.5 w-3.5" />
            {showText && <span>{t("Thêm vào giỏ", "Add to cart")}</span>}
          </>
        )}
      </Button>
    </>
  );
}
