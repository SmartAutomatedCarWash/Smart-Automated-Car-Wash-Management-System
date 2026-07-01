"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightFromLine,
  Bell,
  BellRing,
  ChevronDown,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sun,
  UserCog,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useCustomerLogout } from "@/features/auth/hooks/use-auth";
import { getAuthRedirectPath } from "@/features/auth/lib/auth-session";
import { cn } from "@/shared/lib/utils";
import { clearAuthSession, useAuthStore } from "@/features/auth/store/auth.store";
import type { UserRole } from "@/entities/auth";
import { getWorkspaceHeaderMeta } from "@/shared/ui/workspace/workspace-header-meta";
import {
  mobileNavForRole,
  navForRole,
  SHELL_EXCLUDED_PATHS,
  WORKSPACE_THEMES,
  type WorkspaceNavItem,
} from "@/shared/ui/workspace/workspace-nav";
import { StaffNotificationListener } from "@/features/operations/components/staff-notification-listener";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/ui/avatar";
import { useLanguageStore, translate } from "@/shared/store/language.store";
import { useQuery } from "@tanstack/react-query";
import { MarqueeTicker } from "@/shared/ui/marquee-ticker";
import { getEligibleSessionBookings, getOperationsQueue } from "@/features/operations/lib/operations-service";
import { useCustomerNotifications, useMarkCustomerNotificationAsRead } from "@/features/notifications/hooks/use-customer-notifications";
import { getCustomerTierMetalStyle } from "@/shared/ui/customer/customer-experience";

type RoleWorkspaceShellProps = {
  requiredRole: UserRole;
  children: ReactNode;
};

// Map of English page titles to their Vietnamese equivalents
const PAGE_TITLE_VI: Record<string, string> = {
  "Staff Dashboard": "Bảng điều khiển nhân viên",
  "Operations Board": "Bảng vận hành",
  "Vehicle Check-in": "Duyệt phương tiện",
  "Wash Session History": "Lịch sử phiên rửa xe",
  "Wash Session": "Phiên rửa xe",
  "Customer Home": "Trang chủ khách hàng",
  "Personal Profile": "Hồ sơ cá nhân",
  "Vehicles": "Phương tiện",
  "Bookings": "Lịch đặt",
  "Wash Tracking": "Theo dõi rửa xe",
  "Wash History": "Lịch sử rửa xe",
  "Loyalty & Rewards": "Tích điểm & Phần thưởng",
  "Promotions": "Khuyến mãi",
  "Customer Workspace": "Không gian khách hàng",
  "Admin Control Panel": "Bảng điều khiển Admin",
  "Booking Management": "Quản lý đặt lịch",
  "Accounts": "Tài khoản",
  "Operations Health": "Sức khỏe vận hành",
  "Reports & Analytics": "Báo cáo & Phân tích",
  "Service Management": "Quản lý dịch vụ",
  "Offers Management": "Quản lý ưu đãi",
  "Admin Workspace": "Không gian Admin",
  "Overview": "Tổng quan",
  "Notifications": "Thông báo",
  "History": "Lịch sử",
  "Profile": "Hồ sơ",
  "Settings": "Cài đặt",
};

function getPageTitle(title: string, lang: "vi" | "en"): string {
  if (lang === "en") return title;
  return PAGE_TITLE_VI[title] ?? title;
}

export function RoleWorkspaceShell({ requiredRole, children }: RoleWorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logoutMutation = useCustomerLogout();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { language, setLanguage } = useLanguageStore();
  const { theme, setTheme } = useTheme();

  const t = (vi: string, en: string) => translate(language, vi, en);

  const [lastBookingIds, setLastBookingIds] = useState<string[]>([]);
  const [lastSessionIds, setLastSessionIds] = useState<string[]>([]);
  const [alertNotification, setAlertNotification] = useState<{
    show: boolean;
    title: string;
    message: string;
    plate: string;
    path: string;
  }>({ show: false, title: "", message: "", plate: "", path: "" });

  const isStaff = requiredRole === "STAFF";
  const isCustomer = requiredRole === "CUSTOMER";

  const eligibleQuery = useQuery({
    queryKey: ["staff-notifications", "eligible"],
    queryFn: getEligibleSessionBookings,
    enabled: isStaff && isMounted,
    refetchInterval: 10_000,
  });

  const queueQuery = useQuery({
    queryKey: ["staff-notifications", "queue"],
    queryFn: getOperationsQueue,
    enabled: isStaff && isMounted,
    refetchInterval: 10_000,
  });

  const customerNotificationsQuery = useCustomerNotifications();
  const markCustomerNotificationAsReadMutation = useMarkCustomerNotificationAsRead();
  const unreadCustomerNotifications = useMemo(() => {
    if (!isCustomer || !customerNotificationsQuery.data) return 0;
    return customerNotificationsQuery.data.filter((n) => !n.read).length;
  }, [isCustomer, customerNotificationsQuery.data]);

  const eligibleCount = eligibleQuery.data?.length ?? 0;
  const pendingSessions = useMemo(() => {
    if (!queueQuery.data) return [];
    const sessions = queueQuery.data.columns.flatMap((column) => column.sessions);
    return sessions.filter((s) => s.status === "PENDING" || s.status === "QUEUED");
  }, [queueQuery.data]);
  const pendingSessionsCount = pendingSessions.length;
  const totalNotifications = eligibleCount + pendingSessionsCount;

  const isExcluded = SHELL_EXCLUDED_PATHS.includes(pathname);
  const workspaceTheme = WORKSPACE_THEMES[requiredRole];
  const navItems = navForRole(requiredRole);
  const mobileItems = mobileNavForRole(requiredRole);
  const headerMeta = getWorkspaceHeaderMeta(pathname);

  // Sync language from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("aura-lang") as "vi" | "en" | null;
      if (stored === "vi" || stored === "en") {
        setLanguage(stored);
      }
    }
  }, [setLanguage]);

  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  // Staff notification tracking
  useEffect(() => {
    if (!isStaff || !isMounted) return;

    const currentBookingIds = eligibleQuery.data?.map((b) => b.bookingId) ?? [];
    const currentSessionIds = pendingSessions.map((s) => s.sessionId);

    if (lastBookingIds.length === 0 && lastSessionIds.length === 0) {
      if (currentBookingIds.length > 0 || currentSessionIds.length > 0) {
        setLastBookingIds(currentBookingIds);
        setLastSessionIds(currentSessionIds);
      }
      return;
    }

    const newBookings = eligibleQuery.data?.filter((b) => !lastBookingIds.includes(b.bookingId)) ?? [];
    const newSessions = pendingSessions.filter((s) => !lastSessionIds.includes(s.sessionId));

    if (newBookings.length > 0) {
      const target = newBookings[0];
      setAlertNotification({
        show: true,
        title: t("Lịch hẹn mới chờ duyệt!", "New booking awaiting approval!"),
        message: `${target.customerName} - ${target.customerPhone}`,
        plate: target.vehiclePlate,
        path: "/staff/check-in",
      });
      setLastBookingIds(currentBookingIds);
    } else if (newSessions.length > 0) {
      const target = newSessions[0];
      setAlertNotification({
        show: true,
        title: t("Phiên rửa xe chờ duyệt!", "Wash session awaiting approval!"),
        message: `${target.customerName} - ${target.customerPhone}`,
        plate: target.vehiclePlate,
        path: `/staff/check-in?sessionId=${target.sessionId}`,
      });
      setLastSessionIds(currentSessionIds);
    } else {
      setLastBookingIds(currentBookingIds);
      setLastSessionIds(currentSessionIds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleQuery.data, pendingSessions, isStaff, isMounted]);

  // Auto-dismiss notification popup after 8s
  useEffect(() => {
    if (!alertNotification.show) return;
    const timer = setTimeout(() => {
      setAlertNotification((prev) => ({ ...prev, show: false }));
    }, 8000);
    return () => clearTimeout(timer);
  }, [alertNotification.show]);

  useEffect(() => {
    if (!isMounted || isExcluded) return;
    if (!accessToken || !user) {
      router.replace(requiredRole === "ADMIN" ? "/admin/login" : "/login");
      return;
    }
    if (user.role !== requiredRole) {
      router.replace(getAuthRedirectPath(user.role));
    }
  }, [accessToken, isExcluded, isMounted, requiredRole, router, user]);

  if (isExcluded) return <>{children}</>;

  if (!isMounted) return <WorkspaceGate message={t("Đang tải khu vực làm việc...", "Loading workspace...")} />;
  if (!accessToken || !user) return <WorkspaceGate message={t("Đang chuyển đến trang đăng nhập...", "Redirecting to login...")} />;
  if (user.role !== requiredRole) return <WorkspaceGate message={t("Đang chuyển đến khu vực phù hợp...", "Redirecting to your workspace...")} />;

  const handleLogout = () => {
    if (requiredRole === "CUSTOMER") {
      logoutMutation.mutate();
      return;
    }
    clearAuthSession();
    router.push(requiredRole === "ADMIN" ? "/admin/login" : "/login");
  };

  const profileHref =
    requiredRole === "CUSTOMER" ? "/customer/profile"
    : requiredRole === "STAFF" ? "/staff/profile"
    : "/admin/dashboard";

  const quickActions = getProfileQuickActions(requiredRole);
  const customerTierMetal = requiredRole === "CUSTOMER" ? getCustomerTierMetalStyle(user.tier) : null;

  return (
    <div className="flex flex-col min-h-screen">
      {requiredRole === "CUSTOMER" && <MarqueeTicker />}
      <div className={cn("flex flex-1 text-foreground relative", requiredRole === "CUSTOMER" ? "bg-[#f7fcff]" : "bg-background")}>
        <div 
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--card))_55%,hsl(var(--muted))_100%)]" 
          style={requiredRole === "CUSTOMER" ? { background: "radial-gradient(circle at top left, rgba(0,184,217,0.12), #f7fcff 68%)" } : undefined}
        />

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "sticky top-0 z-20 hidden h-screen shrink-0 flex-col border-r border-border/70 bg-card/85 backdrop-blur-xl transition-all duration-300 lg:flex",
          requiredRole === "CUSTOMER"
            ? (sidebarCollapsed ? "w-[5.25rem] bg-white/95 shadow-[0_4px_20px_rgba(0,0,0,0.02)]" : "w-64 bg-white/95 shadow-[0_4px_20px_rgba(0,0,0,0.02)]")
            : (sidebarCollapsed ? "w-[5.25rem]" : "w-72"),
        )}
      >
        <SidebarBrand
          collapsed={sidebarCollapsed}
          theme={workspaceTheme}
          language={language}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />

        <nav className={cn("min-h-0 flex-1 overflow-y-auto", !sidebarCollapsed ? "px-3 py-4" : "px-2 py-4")}>
          <ul className={cn(!sidebarCollapsed ? "space-y-1" : "space-y-3")}>
            {navItems.map((item) => (
              <SidebarNavLink
                key={item.href}
                item={item}
                pathname={pathname}
                collapsed={sidebarCollapsed}
                activeClassName={workspaceTheme.activeNav}
                language={language}
              />
            ))}
          </ul>
        </nav>

        <div className="mt-auto space-y-3 border-t border-border/70 p-4">
          {requiredRole === "CUSTOMER" && (
            <Link
              href="/customer/bookings/new"
              title={sidebarCollapsed ? t("Đặt lịch mới", "Book New Service") : undefined}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl bg-[#0566D9] text-white text-sm font-bold shadow-[0_12px_24px_rgba(5,102,217,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0455B6]",
                sidebarCollapsed ? "h-11 px-0" : "px-4 py-3",
              )}
            >
              <ClipboardList className={cn("h-4 w-4", !sidebarCollapsed && "hidden")} />
              {!sidebarCollapsed && t("Đặt lịch mới", "Book New Service")}
            </Link>
          )}

          {requiredRole !== "CUSTOMER" && !sidebarCollapsed && (
            <div className="rounded-xl border border-border/70 bg-background/70 p-3">
              <div className="flex items-start gap-3">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", workspaceTheme.accent)}>
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">{t("Hỗ trợ", "Support")}</div>
                  <div className="mt-0.5 text-sm font-extrabold tracking-tight">1900 1234</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {t("8:00 - 20:00 hằng ngày", "8:00 AM - 8:00 PM daily")}
                  </div>
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            disabled={logoutMutation.isPending}
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm font-semibold transition hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
            {!sidebarCollapsed && (
              <span>
                {logoutMutation.isPending
                  ? t("Đang đăng xuất...", "Signing out...")
                  : t("Đăng xuất", "Sign out")}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 px-4 py-4 backdrop-blur-xl lg:px-8">
          <div className="flex items-start justify-between gap-3">
            {/* Left: title */}
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
                aria-label={t("Mở menu điều hướng", "Open navigation menu")}
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className={cn("mb-1 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", workspaceTheme.accentSoft)}>
                  {language === "vi" ? (workspaceTheme.labelVi ?? workspaceTheme.label) : workspaceTheme.label}
                </p>
                <h1 className="truncate text-xl font-bold tracking-tight lg:text-2xl">
                  {getPageTitle(headerMeta.title, language)}
                </h1>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {/* Language switcher */}
              <div className="inline-flex items-center rounded-xl border border-border/70 bg-card/90 p-0.5 shadow-sm backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={cn(
                    "rounded-lg px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold transition-all",
                    language === "en"
                      ? "bg-teal-600 text-white shadow-sm font-black"
                      : "text-muted-foreground hover:text-foreground font-semibold",
                  )}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("vi")}
                  className={cn(
                    "rounded-lg px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold transition-all",
                    language === "vi"
                      ? "bg-teal-600 text-white shadow-sm font-black"
                      : "text-muted-foreground hover:text-foreground font-semibold",
                  )}
                >
                  VN
                </button>
              </div>

              {/* Dark / light toggle */}
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/90 transition hover:border-teal-500/30 hover:bg-card"
                aria-label={t("Chuyển chế độ sáng/tối", "Toggle dark/light mode")}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-yellow-400" />
                ) : (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {/* Staff notification bell */}
              {isStaff && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/90 transition hover:border-teal-500/30 hover:bg-card"
                      aria-label={t("Thông báo nghiệp vụ", "Work notifications")}
                    >
                      <Bell className={cn("h-4 w-4", totalNotifications > 0 ? "text-teal-600" : "text-muted-foreground")} />
                      {totalNotifications > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={10}
                    className="w-80 rounded-2xl border-border/70 bg-card/95 p-3 shadow-[0_22px_60px_rgba(15,118,110,0.12)] backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        {t("Thông báo nghiệp vụ", "Work Notifications")}
                      </h3>
                      {totalNotifications > 0 && (
                        <span className="rounded-full bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 text-[10px] font-black text-teal-700 dark:text-teal-400">
                          {totalNotifications} {t("mới", "new")}
                        </span>
                      )}
                    </div>

                    {totalNotifications === 0 ? (
                      <div className="py-6 text-center text-xs font-semibold text-muted-foreground">
                        {t("Không có thông báo mới", "No new notifications")}
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto space-y-3">
                        {eligibleCount > 0 && (
                          <div className="space-y-1.5">
                            <h4 className="text-[11px] font-bold text-muted-foreground px-1">
                              {t("Lịch hẹn chờ check-in", "Bookings awaiting check-in")}
                            </h4>
                            {eligibleQuery.data?.slice(0, 5).map((booking) => (
                              <Link
                                key={booking.bookingId}
                                href="/staff/check-in"
                                className="flex flex-col gap-0.5 rounded-xl bg-teal-50/50 dark:bg-teal-900/20 hover:bg-teal-50 dark:hover:bg-teal-900/30 p-2 text-[11px] transition"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-teal-950 dark:text-teal-200 font-mono">{booking.vehiclePlate}</span>
                                  <span className="font-semibold text-muted-foreground">{booking.bookingTime}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {booking.customerName} - {booking.customerPhone}
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}

                        {pendingSessionsCount > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-border/50">
                            <h4 className="text-[11px] font-bold text-muted-foreground px-1">
                              {t("Phiên rửa xe chờ duyệt", "Wash sessions awaiting approval")}
                            </h4>
                            {pendingSessions.slice(0, 5).map((session) => (
                              <Link
                                key={session.sessionId}
                                href={`/staff/check-in?sessionId=${session.sessionId}`}
                                className="flex flex-col gap-0.5 rounded-xl bg-orange-50/50 dark:bg-orange-900/20 hover:bg-orange-50 dark:hover:bg-orange-900/30 p-2 text-[11px] transition"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-orange-950 dark:text-orange-200 font-mono">{session.vehiclePlate}</span>
                                  <span className="rounded-full bg-card px-1.5 py-0.5 text-[9px] font-black text-orange-700 dark:text-orange-400 shadow-sm border border-orange-100 dark:border-orange-800">
                                    {session.status === "PENDING"
                                      ? t("Chờ duyệt", "Pending")
                                      : t("Chờ check-in", "Queued")}
                                  </span>
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {session.customerName} - {session.customerPhone}
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 border-t border-border/50">
                          <Link
                            href="/staff/check-in"
                            className="flex w-full items-center justify-center rounded-xl bg-muted py-2 text-center text-[11px] font-bold text-foreground hover:bg-accent transition"
                          >
                            {t("Xem tất cả check-in", "View all check-ins")}
                          </Link>
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              )}

              {/* Customer notification bell */}
              {isCustomer && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/90 transition hover:border-teal-500/30 hover:bg-card"
                      aria-label={t("Thông báo", "Notifications")}
                    >
                      <Bell className={cn("h-4 w-4", unreadCustomerNotifications > 0 ? "text-teal-600" : "text-muted-foreground")} />
                      {unreadCustomerNotifications > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={10}
                    className="w-80 rounded-2xl border-border/70 bg-card/95 p-3 shadow-[0_22px_60px_rgba(15,118,110,0.12)] backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        {t("Thông báo", "Notifications")}
                      </h3>
                      {unreadCustomerNotifications > 0 && (
                        <span className="rounded-full bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 text-[10px] font-black text-teal-700 dark:text-teal-400">
                          {unreadCustomerNotifications} {t("chưa đọc", "unread")}
                        </span>
                      )}
                    </div>

                    {(!customerNotificationsQuery.data || customerNotificationsQuery.data.length === 0) ? (
                      <div className="py-6 text-center text-xs font-semibold text-muted-foreground">
                        {t("Không có thông báo nào", "No notifications")}
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {customerNotificationsQuery.data.slice(0, 5).map((notification) => (
                          <button
                            key={notification.notificationId}
                            type="button"
                            onClick={() => {
                              if (!notification.read) {
                                markCustomerNotificationAsReadMutation.mutate(notification.notificationId);
                              }
                            }}
                            className={cn(
                              "flex w-full flex-col gap-1 rounded-xl p-2 text-left text-xs transition",
                              notification.read 
                                ? "bg-muted/50 hover:bg-muted" 
                                : "bg-teal-50/50 dark:bg-teal-900/20 hover:bg-teal-50 dark:hover:bg-teal-900/30"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className={cn("font-bold", notification.read ? "text-muted-foreground" : "text-teal-950 dark:text-teal-200")}>
                                {notification.title}
                              </span>
                              {!notification.read && (
                                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                              )}
                            </div>
                            <div className={cn("line-clamp-2 text-[11px]", notification.read ? "text-muted-foreground" : "text-foreground")}>
                              {notification.message}
                            </div>
                          </button>
                        ))}
                        <div className="pt-2 border-t border-border/50">
                          <Link
                            href="/customer/notifications"
                            className="flex w-full items-center justify-center rounded-xl bg-muted py-2 text-center text-[11px] font-bold text-foreground hover:bg-accent transition"
                          >
                            {t("Xem tất cả", "View all")}
                          </Link>
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              )}

              {/* User profile popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "group flex h-10 max-w-[9.75rem] items-center gap-1.5 rounded-xl border px-2 py-1.5 text-left transition sm:w-[11.75rem] sm:max-w-[11.75rem] sm:px-2",
                      customerTierMetal
                        ? "relative overflow-hidden border-[#c28a56]/70 bg-[#d5aa7b] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_0_0_1px_rgba(255,238,210,0.34),0_8px_20px_rgba(163,107,66,0.20)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_0_0_1px_rgba(255,238,210,0.46),0_10px_24px_rgba(163,107,66,0.24)] [&>*]:relative [&>*]:z-10"
                        : "border-border/70 bg-card/90 hover:border-primary/30 hover:bg-card",
                    )}
                    aria-label={t("Mở menu hồ sơ", "Open profile menu")}
                  >
                    {customerTierMetal ? (
                      <span className={cn("absolute inset-0 rounded-xl opacity-100", customerTierMetal.surface)} />
                    ) : null}
                    {customerTierMetal ? (
                      <>
                        <span className="absolute inset-0 rounded-xl bg-[linear-gradient(135deg,rgba(255,255,255,0.40)_0%,rgba(255,255,255,0.10)_42%,rgba(67,40,23,0.12)_100%)]" />
                        <span className="absolute inset-x-3 top-px h-px bg-white/70" />
                        <span className="absolute left-8 top-1.5 h-1 w-1 rounded-full bg-white/50 shadow-[0_0_8px_rgba(255,255,255,0.52)]" />
                        <span className="absolute right-6 top-2 h-1 w-1 rounded-full bg-[#fff3d6]/55 shadow-[0_0_10px_rgba(255,232,186,0.58)]" />
                        <span className="absolute bottom-2 right-12 h-0.5 w-0.5 rounded-full bg-white/50 shadow-[0_0_7px_rgba(255,255,255,0.50)]" />
                      </>
                    ) : null}
                    <Avatar className={cn("h-7 w-7 border bg-[#fcf9f5]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_3px_8px_rgba(67,40,23,0.15)]", customerTierMetal ? ["ring-2", customerTierMetal.ring, customerTierMetal.border] : workspaceTheme.accentSoft)}>
                      <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName} className="object-cover" />
                      <AvatarFallback className={cn("text-[10px] font-black", customerTierMetal ? ["bg-[#fcf9f5]/80", customerTierMetal.text] : workspaceTheme.accentSoft)}>
                        {getUserInitials(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden min-w-0 sm:block">
                      <div className={cn("truncate text-[13px] font-black leading-tight", customerTierMetal?.text)}>{user.fullName}</div>
                      <div className={cn("truncate text-[10px] font-black uppercase tracking-wide", customerTierMetal ? customerTierMetal.softText : "text-muted-foreground")}>
                        {requiredRole === "CUSTOMER" ? (user.tier ?? (t("THÀNH VIÊN", "MEMBER"))) : user.role}
                      </div>
                    </div>
                    <ChevronDown className={cn("hidden h-3.5 w-3.5 transition group-data-[state=open]:rotate-180 sm:block", customerTierMetal ? customerTierMetal.softText : "text-muted-foreground")} />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={10}
                  className="w-72 rounded-2xl border-border/70 bg-card/95 p-2 shadow-[0_22px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl"
                >
                  <div className="px-2 py-2">
                    <div className="flex items-center gap-3">
                      <Avatar className={cn("h-10 w-10 border", workspaceTheme.accentSoft)}>
                        <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName} className="object-cover" />
                        <AvatarFallback className={cn("text-xs font-semibold", workspaceTheme.accentSoft)}>
                          {getUserInitials(user.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold">{user.fullName}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                          {requiredRole === "CUSTOMER" ? (user.tier ?? t("THÀNH VIÊN", "MEMBER")) : user.role}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="my-1 h-px bg-border" />

                  <Link
                    href={profileHref}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-accent"
                  >
                    <UserCog className="h-4 w-4 text-primary" />
                    {t("Hồ sơ cá nhân", "My Profile")}
                  </Link>

                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-accent"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {language === "vi" ? action.labelVi : action.label}
                      </Link>
                    );
                  })}

                  <div className="my-1 h-px bg-border" />

                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-accent"
                    onClick={() => router.refresh()}
                  >
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    {t("Làm mới dữ liệu", "Refresh data")}
                  </button>

                  <button
                    type="button"
                    disabled={logoutMutation.isPending}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    {logoutMutation.isPending
                      ? t("Đang đăng xuất...", "Signing out...")
                      : t("Đăng xuất", "Sign out")}
                  </button>
                </PopoverContent>
              </Popover>

              {/* Mobile logout shortcut */}
              <button
                type="button"
                disabled={logoutMutation.isPending}
                onClick={handleLogout}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/70 px-3 text-sm font-semibold transition hover:bg-accent lg:hidden"
                aria-label={t("Đăng xuất", "Sign out")}
              >
                <ArrowRightFromLine className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>
        {requiredRole === "STAFF" && <StaffNotificationListener />}

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-2 py-2 backdrop-blur-xl lg:hidden">
          <ul className="grid grid-cols-4 gap-1">
            {mobileItems.map((item) => {
              const active = isNavActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold",
                      active ? workspaceTheme.mobileActive : "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">
                      {language === "vi" && item.labelVi ? item.labelVi : item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("Đóng menu điều hướng", "Close navigation menu")}
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(100%,20rem)] flex-col bg-card shadow-2xl">
            <SidebarBrand
              collapsed={false}
              theme={workspaceTheme}
              language={language}
              onToggle={() => setMobileMenuOpen(false)}
              closeIcon
            />
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <SidebarNavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    collapsed={false}
                    activeClassName={workspaceTheme.activeNav}
                    language={language}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      )}

      {/* Staff alert popup */}
      {alertNotification.show && (
        <div className="fixed top-20 right-6 z-[100] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-teal-200/90 dark:border-teal-800/50 bg-card/95 p-4 shadow-[0_16px_48px_-8px_rgba(15,118,110,0.22)] backdrop-blur-xl animate-in fade-in slide-in-from-top-4 slide-in-from-right-4">
          <button
            type="button"
            onClick={() => setAlertNotification((prev) => ({ ...prev, show: false }))}
            className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition"
            aria-label={t("Đóng thông báo", "Dismiss notification")}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3.5 pr-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 shadow-sm border border-teal-100 dark:border-teal-800">
              <BellRing className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
                {alertNotification.title}
              </h4>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-muted/80 px-2.5 py-1.5 text-xs font-bold border border-border/50">
                <span className="text-[10px] text-muted-foreground uppercase">
                  {t("Biển số", "Plate")}
                </span>
                <span className="font-black tracking-wide text-teal-950 dark:text-teal-200 font-mono text-sm">
                  {alertNotification.plate}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-muted-foreground truncate">
                {alertNotification.message}
              </p>
              <div className="mt-3 flex justify-end">
                <Link
                  href={alertNotification.path}
                  onClick={() => setAlertNotification((prev) => ({ ...prev, show: false }))}
                  className="inline-flex items-center justify-center rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5"
                >
                  {t("Duyệt ngay", "Review now")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function WorkspaceGate({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-muted-foreground shadow-sm">
        {message}
      </p>
    </main>
  );
}

function getProfileQuickActions(role: UserRole) {
  if (role === "STAFF") {
    return [
      { href: "/staff/dashboard",       label: "Shift overview",        labelVi: "Tổng quan ca làm",    icon: LayoutDashboard },
      { href: "/staff/operations",      label: "Operations board",      labelVi: "Bảng vận hành",       icon: ClipboardList },
      { href: "/staff/check-in",        label: "Check-in review",       labelVi: "Duyệt check-in",      icon: Wrench },
      { href: "/staff/sessions/history",label: "Wash session history",  labelVi: "Lịch sử phiên rửa",  icon: History },
    ];
  }
  if (role === "ADMIN") {
    return [
      { href: "/admin/dashboard", label: "Admin overview",      labelVi: "Tổng quan quản trị",  icon: LayoutDashboard },
      { href: "/admin/accounts",  label: "Account management",  labelVi: "Quản lý tài khoản",   icon: UserCog },
      { href: "/admin/settings",  label: "System settings",     labelVi: "Cài đặt hệ thống",    icon: Settings2 },
    ];
  }
  return [
    { href: "/customer/home",     label: "Customer home",   labelVi: "Trang khách hàng",    icon: LayoutDashboard },
    { href: "/customer/bookings", label: "My bookings",     labelVi: "Lịch đặt của tôi",    icon: ClipboardList },
    { href: "/customer/settings", label: "Account settings",labelVi: "Cài đặt tài khoản",   icon: Settings2 },
  ];
}

function SidebarBrand({
  collapsed,
  theme,
  language,
  onToggle,
  closeIcon,
}: {
  collapsed: boolean;
  theme: (typeof WORKSPACE_THEMES)[UserRole];
  language: "vi" | "en";
  onToggle: () => void;
  closeIcon?: boolean;
}) {
  const user = useAuthStore((state) => state.user);
  const description = language === "vi"
    ? (theme.descriptionVi ?? theme.description)
    : theme.description;

  const isCustomer = user?.role === "CUSTOMER";

  if (collapsed) {
    return (
      <div className="border-b border-border/70 px-2.5 py-4">
        <div className="mx-auto flex h-11 w-full items-center justify-center">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-card text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
            aria-label={translate(language, "Mở rộng thanh bên", "Expand sidebar")}
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border/70 px-4 py-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-black tracking-tighter", theme.accent)}>
            {isCustomer ? "AR" : "AC"}
          </div>
          <div className="min-w-0 animate-in fade-in">
            <div className="font-black tracking-[-0.02em] text-lg text-slate-900">
              {isCustomer ? "AURA CAR CARE" : "AURA CAR CARE"}
            </div>
            {isCustomer ? (
              <span className="inline-flex items-center rounded-full bg-[#0566D9]/10 px-2 py-0.5 text-[9px] font-bold text-[#0566D9] shadow-[0_0_15px_rgba(5,102,217,0.15)] mt-0.5">
                Diamond Member
              </span>
            ) : (
              <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {description}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition hover:bg-accent"
          aria-label={closeIcon
            ? translate(language, "Đóng", "Close")
            : translate(language, "Thu gọn thanh bên", "Collapse sidebar")}
        >
          {closeIcon ? <X className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function SidebarNavLink({
  item,
  pathname,
  collapsed,
  activeClassName,
  language,
  onNavigate,
}: {
  item: WorkspaceNavItem;
  pathname: string;
  collapsed: boolean;
  activeClassName: string;
  language: "vi" | "en";
  onNavigate?: () => void;
}) {
  const active = isNavActive(pathname, item);
  const Icon = item.icon;
  const displayLabel = language === "vi" && item.labelVi ? item.labelVi : item.label;

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        title={collapsed ? displayLabel : undefined}
        className={cn(
          "group flex items-center rounded-xl text-sm font-medium transition-all",
          collapsed ? "mx-auto h-12 w-12 justify-center rounded-2xl" : "gap-3 px-3 py-2.5",
          active ? activeClassName : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{displayLabel}</span>}
      </Link>
    </li>
  );
}

function isNavActive(pathname: string, item: WorkspaceNavItem) {
  const itemPath = item.href.split("?")[0];
  if (item.exact) return pathname === itemPath;
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

function getUserInitials(fullName: string) {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
}
