"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { ArrowRightFromLine, Home, PackageSearch, CarFront, Gift, BadgePercent, History } from "lucide-react";
import { getAuthRedirectPath } from "@/features/auth/lib/auth-session";
import { useCustomerLogout } from "@/features/auth/hooks/use-auth";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { cn } from "@/shared/lib/utils";

export function CustomerWorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const logoutMutation = useCustomerLogout();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const { language } = useLanguageStore();
  const [isMounted, setIsMounted] = useState(false);

  const t = (vi: string, en: string) => translate(language, vi, en);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    if (!accessToken || !user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "CUSTOMER") {
      router.replace(getAuthRedirectPath(user.role));
    }
  }, [accessToken, isMounted, router, user]);

  if (!isMounted) {
    return <main style={{ padding: 24 }}>{t("Đang tải khu vực làm việc...", "Loading workspace...")}</main>;
  }

  if (!accessToken || !user) {
    return <main style={{ padding: 24 }}>{t("Đang chuyển đến trang đăng nhập...", "Redirecting to login...")}</main>;
  }

  if (user.role !== "CUSTOMER") {
    return <main style={{ padding: 24 }}>{t("Đang chuyển đến khu vực phù hợp...", "Redirecting to your workspace...")}</main>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Home className="h-5 w-5" />
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <NavLink href="/customer/home" icon={Home} label={t("Trang chủ", "Home")} />
            <NavLink href="/customer/bookings/new" icon={PackageSearch} label={t("Đặt lịch", "Book")} />
            <NavLink href="/customer/history" icon={History} label={t("Lịch sử", "History")} />
            <NavLink href="/customer/vehicles" icon={CarFront} label={t("Phương tiện", "Vehicles")} />
            <NavLink href="/customer/loyalty" icon={Gift} label={t("Tích điểm", "Loyalty")} />
            <NavLink href="/customer/discounts" icon={BadgePercent} label={t("Ưu đãi", "Discounts")} />
            <button
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
              type="button"
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border border-border bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {logoutMutation.isPending
                ? t("Đang đăng xuất...", "Signing out...")
                : t("Đăng xuất", "Sign out")}
              <ArrowRightFromLine className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-muted-foreground shadow-sm transition hover:border-primary/50 hover:text-primary"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
