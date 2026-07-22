"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ShoppingBag, Plus } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import {
  useCartStore,
  addCartItem,
  removeCartItemByItemId,
  type CartItemType,
} from "@/features/cart/store/cart.store";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

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
};

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
}: AddToCartButtonProps) {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((state) => state.items);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const inCart = items.some(
    (item) => item.itemId === itemId && item.type === type
  );

  const handleToggleCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inCart) {
      removeCartItemByItemId(itemId, type);
      toast.info(`Đã bỏ "${name}" khỏi giỏ hàng`);
    } else {
      addCartItem({
        itemId,
        type,
        name,
        price,
        durationMinutes,
        description,
      });
      toast.success(`Đã thêm "${name}" vào giỏ hàng`);
    }
  };

  return (
    <Button
      type="button"
      variant={inCart ? "secondary" : variant}
      size={size}
      onClick={handleToggleCart}
      className={cn(
        "gap-1.5 transition-all",
        inCart && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
        className
      )}
    >
      {inCart ? (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          {showText && <span>Đã trong giỏ</span>}
        </>
      ) : (
        <>
          <ShoppingBag className="h-3.5 w-3.5" />
          {showText && <span>Thêm vào giỏ</span>}
        </>
      )}
    </Button>
  );
}
