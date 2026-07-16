"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      expand={false}
      duration={4200}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-2xl group-[.toaster]:border group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-[0_18px_60px_rgba(15,23,42,0.14)]",
          success:
            "group-[.toaster]:border-emerald-200 group-[.toaster]:bg-emerald-50 group-[.toaster]:text-emerald-900",
          error:
            "group-[.toaster]:border-rose-200 group-[.toaster]:bg-rose-50 group-[.toaster]:text-rose-900",
          warning:
            "group-[.toaster]:border-amber-200 group-[.toaster]:bg-amber-50 group-[.toaster]:text-amber-900",
          info:
            "group-[.toaster]:border-cyan-200 group-[.toaster]:bg-cyan-50 group-[.toaster]:text-cyan-950",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:leading-5",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
