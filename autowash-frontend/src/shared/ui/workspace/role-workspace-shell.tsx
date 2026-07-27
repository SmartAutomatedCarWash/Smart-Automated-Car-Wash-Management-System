"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TierBadge } from "@/shared/ui/customer/customer-experience";
import { CartDrawer } from "@/features/cart/components/cart-drawer";
import {
  ArrowRightFromLine,
  Bell,
  BellRing,
  Car,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Droplets,
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
  Sparkles,
  Sun,
  UserCog,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useCustomerLogout } from "@/features/auth/hooks/use-auth";
import { getAuthRedirectPath } from "@/features/auth/lib/auth-session";
import { cn } from "@/shared/lib/utils";
import { clearAuthSession, hydrateAuthSession, useAuthStore } from "@/features/auth/store/auth.store";
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
import {
  useManagerNotificationStore,
  type ManagerNotification,
  type ManagerNotificationKind,
} from "@/features/operations/store/manager-notification.store";
import { useCustomerNotifications, useMarkCustomerNotificationAsRead } from "@/features/notifications/hooks/use-customer-notifications";
import { useCustomerNotificationRealtime } from "@/features/notifications/hooks/use-customer-notification-realtime";
import { translateNotificationField } from "@/features/notifications/lib/notification-utils";
import { MembershipTierUpgradePopup } from "@/features/loyalty/components/membership-tier-upgrade-popup";
import { useCustomerLoyaltyAccount } from "@/features/loyalty/hooks/use-customer-loyalty";
import { useTierStore } from "@/shared/store/tier.store";
import { useTierStyle } from "@/shared/lib/tier-styles";
import { WorkspaceHeaderProvider, type WorkspaceHeaderConfig } from "@/shared/ui/workspace/workspace-header-context";

type RoleWorkspaceShellProps = {
  requiredRole: UserRole;
  children: ReactNode;
};

// Map of English page titles to their Vietnamese equivalents
const PAGE_TITLE_VI: Record<string, string> = {
  "Staff Dashboard": "Bảng điều khiển nhân viên",
  "Today's Work": "Công việc hôm nay",
  "Operations Board": "Bảng vận hành",
  "Vehicle Check-in": "Duyệt phương tiện",
  "Wash Session History": "Lịch sử phiên rửa xe",
  "Wash Session": "Phiên rửa xe",
  "Customer Home": "Trang chủ khách hàng",
  "Personal Profile": "Hồ sơ cá nhân",
  "All vehicles": "Tất cả xe",
  "Vehicles": "Phương tiện",
  "Bookings": "Lịch đặt",
  "Wash Tracking": "Theo dõi rửa xe",
  "Wash History": "Lịch sử rửa xe",
  "Loyalty & Rewards": "Tích điểm & Phần thưởng",
  "Discounts": "Khuyến mãi",
  "Customer Workspace": "Không gian khách hàng",
  "Admin Control Panel": "Bảng điều khiển Admin",
  "Booking Management": "Quản lý đặt lịch",
  "Content & Feedback": "Nội dung & Phản hồi",
  "Accounts": "Tài khoản",
  "Operations Health": "Sức khỏe vận hành",
  "Reports & Analytics": "Báo cáo & Phân tích",
  "Manager Profile": "Hồ sơ Manager",
  "Operations Queue": "Điều phối vận hành",
  Reports: "Báo cáo vận hành",
  "Staff Management": "Quản lý nhân viên",
  "Service Management": "Quản lý dịch vụ",
  "Offers Management": "Quản lý ưu đãi",
  "Admin Workspace": "Không gian Admin",
  "Overview": "Tổng quan",
  "Notifications": "Thông báo",
  "History": "Lịch sử",
  "Profile": "Hồ sơ",
  "Settings": "Cài đặt",
};

const SEEN_TIER_UPGRADE_NOTIFICATION_STORAGE_KEY = "autowash_seen_tier_upgrade_notifications";

function getPageTitle(title: string, lang: "vi" | "en"): string {
  if (lang === "en") return title;
  return PAGE_TITLE_VI[title] ?? title;
}

export function RoleWorkspaceShell({ requiredRole, children }: RoleWorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const logoutMutation = useCustomerLogout();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const authHydrated = useAuthStore((state) => state.hydrated);
  const [isMounted, setIsMounted] = useState(false);
  const [authHydrationTimedOut, setAuthHydrationTimedOut] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<WorkspaceHeaderConfig | null>(null);

  const { language, setLanguage, hydrateLanguage } = useLanguageStore();
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
  const [tierUpgradePopup, setTierUpgradePopup] = useState<{
    show: boolean;
    title: string;
    message: string;
    oldTier?: string | null;
    newTier?: string | null;
  }>({ show: false, title: "", message: "", oldTier: null, newTier: null });
  const seenCustomerNotificationIds = useRef<Set<string>>(new Set());
  const seenTierUpgradePopupIds = useRef<Set<string>>(new Set());
  const pendingTierUpgradePopup = useRef<{
    title: string;
    message: string;
    oldTier?: string | null;
    newTier?: string | null;
  } | null>(null);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);

  const isStaff = requiredRole === "STAFF";
  const isCustomer = requiredRole === "CUSTOMER";
  const isManager = requiredRole === "MANAGER";
  const customerLoyaltyAccountQuery = useCustomerLoyaltyAccount();
  const effectiveCustomerTier = isCustomer
    ? (customerLoyaltyAccountQuery.data?.tier ?? user?.tier ?? "MEMBER")
    : null;
  const tierStyleData = useTierStyle(effectiveCustomerTier);
  const tierStyle = isCustomer && user ? tierStyleData : null;
  const customerTierMetal = tierStyle?.metal;

  const eligibleQuery = useQuery({
    queryKey: ["staff-notifications", "eligible"],
    queryFn: () => getEligibleSessionBookings(),
    enabled: false,
    refetchInterval: 10_000,
  });

  const queueQuery = useQuery({
    queryKey: ["staff-notifications", "queue"],
    queryFn: getOperationsQueue,
    enabled: isStaff && isMounted,
    refetchInterval: 10_000,
  });

  const persistSeenTierUpgradePopupIds = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SEEN_TIER_UPGRADE_NOTIFICATION_STORAGE_KEY,
      JSON.stringify(Array.from(seenTierUpgradePopupIds.current)),
    );
  }, []);

  const markTierUpgradePopupSeen = useCallback((notificationId: string) => {
    if (!notificationId) return;
    seenTierUpgradePopupIds.current.add(notificationId);
    persistSeenTierUpgradePopupIds();
  }, [persistSeenTierUpgradePopupIds]);

  const showTierUpgradeNotification = useCallback((notificationId: string, popup: {
    title: string;
    message: string;
    oldTier?: string | null;
    newTier?: string | null;
  }) => {
    markTierUpgradePopupSeen(notificationId);
    if (typeof document !== "undefined" && document.querySelector('[role="dialog"]')) {
      pendingTierUpgradePopup.current = popup;
      return;
    }
    setTierUpgradePopup({ show: true, ...popup });
  }, [markTierUpgradePopupSeen]);

  const customerNotificationsQuery = useCustomerNotifications();
  useCustomerNotificationRealtime(isCustomer && isMounted, {
    onTierUpgrade: ({ notificationId, title, message, oldTier, newTier }) => {
      if (!notificationId || !newTier) return;
      if (seenTierUpgradePopupIds.current.has(notificationId)) return;
      showTierUpgradeNotification(notificationId, {
        title: translateNotificationField(title, language),
        message: translateNotificationField(message, language),
        oldTier,
        newTier,
      });
    },
  });
  const markCustomerNotificationAsReadMutation = useMarkCustomerNotificationAsRead();
  const unreadCustomerNotifications = useMemo(() => {
    if (!isCustomer || !customerNotificationsQuery.data) return 0;
    return customerNotificationsQuery.data.filter((n) => !n.read).length;
  }, [isCustomer, customerNotificationsQuery.data]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SEEN_TIER_UPGRADE_NOTIFICATION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      seenTierUpgradePopupIds.current = new Set(parsed.filter((value): value is string => typeof value === "string"));
    } catch {
      seenTierUpgradePopupIds.current = new Set();
    }
  }, []);

  useEffect(() => {
    if (!isCustomer || !isMounted) return;
    const intervalId = window.setInterval(() => {
      if (!pendingTierUpgradePopup.current) return;
      if (document.querySelector('[role="dialog"]')) return;
      const popup = pendingTierUpgradePopup.current;
      pendingTierUpgradePopup.current = null;
      setTierUpgradePopup({ show: true, ...popup });
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [isCustomer, isMounted]);

  const [selectedManagerNotificationId, setSelectedManagerNotificationId] = useState<string | null>(null);

  useEffect(() => {
    console.log("[workspace-shell]", {
      requiredRole,
      pathname,
      isMounted,
      authHydrated,
      hasAccessToken: Boolean(accessToken),
      userRole: user?.role ?? null,
    });
  }, [accessToken, authHydrated, isMounted, pathname, requiredRole, user?.role]);

  // Monitor customer notifications for toast alerts
  useEffect(() => {
    if (!isCustomer || !isMounted || !customerNotificationsQuery.data) return;
    const currentIds = seenCustomerNotificationIds.current;
    if (currentIds.size === 0) {
      const freshTierUpgrade = customerNotificationsQuery.data
        .filter((notification) =>
          !notification.read
          && isTierUpgradeNotification(notification)
          && isRecentNotification(notification.createdAt)
          && !seenTierUpgradePopupIds.current.has(notification.notificationId),
        )
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
      customerNotificationsQuery.data.forEach((notification) => currentIds.add(notification.notificationId));
      if (freshTierUpgrade) {
        const tierUpgradeMeta = extractTierUpgradeData(freshTierUpgrade);
        showTierUpgradeNotification(freshTierUpgrade.notificationId, {
          title: translateNotificationField(freshTierUpgrade.title, language),
          message: translateNotificationField(freshTierUpgrade.message, language),
          oldTier: tierUpgradeMeta.oldTier,
          newTier: tierUpgradeMeta.newTier,
        });
      }
      return;
    }

    const newUnreadNotifications = customerNotificationsQuery.data
      .filter((notification) => !notification.read && !currentIds.has(notification.notificationId))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    customerNotificationsQuery.data.forEach((notification) => currentIds.add(notification.notificationId));

    const latestUnread = newUnreadNotifications[0];
    if (latestUnread) {
      const title = translateNotificationField(latestUnread.title, language);
      const message = translateNotificationField(latestUnread.message, language);
      if (isTierUpgradeNotification(latestUnread)) {
        if (!seenTierUpgradePopupIds.current.has(latestUnread.notificationId)) {
          const tierUpgradeMeta = extractTierUpgradeData(latestUnread);
          showTierUpgradeNotification(latestUnread.notificationId, {
            title,
            message,
            oldTier: tierUpgradeMeta.oldTier,
            newTier: tierUpgradeMeta.newTier,
          });
        }
      } else {
        toast.info(title, {
          description: message,
          position: "bottom-right",
          duration: 5000,
        });
      }
    }
  }, [customerNotificationsQuery.data, isCustomer, isMounted, language, showTierUpgradeNotification]);

  const eligibleCount = eligibleQuery.data?.length ?? 0;
  const pendingSessions = useMemo(() => {
    if (!queueQuery.data) return [];
    const sessions = queueQuery.data.columns.flatMap((column) => column.sessions);
    return sessions.filter((s) => s.status === "CHECKED_IN");
  }, [queueQuery.data]);
  const pendingSessionsCount = pendingSessions.length;
  const totalNotifications = eligibleCount + pendingSessionsCount;

  const selectedNotification = useMemo(() => {
    if (!selectedNotificationId || !customerNotificationsQuery.data) return null;
    return customerNotificationsQuery.data.find(n => n.notificationId === selectedNotificationId) || null;
  }, [selectedNotificationId, customerNotificationsQuery.data]);

  const isExcluded = SHELL_EXCLUDED_PATHS.includes(pathname);
  const workspaceTheme = WORKSPACE_THEMES[requiredRole];
  const navItems = navForRole(requiredRole);
  const mobileItems = mobileNavForRole(requiredRole);
  const isHistoryBookingDetail =
    pathname.startsWith("/customer/bookings/") &&
    !pathname.startsWith("/customer/bookings/new") &&
    searchParams.get("from") === "history";
  const activePathname = isHistoryBookingDetail ? "/customer/history" : pathname;
  const headerMeta = getWorkspaceHeaderMeta(activePathname);
  const headerTitle = language === "vi" ? (headerMeta.titleVi ?? getPageTitle(headerMeta.title, language)) : headerMeta.title;
  const headerSubtitle = language === "vi" ? (headerMeta.subtitleVi ?? headerMeta.subtitle) : headerMeta.subtitle;
  const managerNotifications = useManagerNotificationStore((state) => state.notifications);
  const activeManagerPopup = useManagerNotificationStore((state) => state.activePopup);
  const closeManagerNotificationPopup = useManagerNotificationStore((state) => state.closePopup);
  const markManagerNotificationRead = useManagerNotificationStore((state) => state.markRead);
  const markAllManagerNotificationsRead = useManagerNotificationStore((state) => state.markAllRead);
  const unreadManagerNotifications = managerNotifications.filter((notification) => !notification.read).length;
  const selectedManagerNotification = useMemo(() => {
    if (!selectedManagerNotificationId) return null;
    return managerNotifications.find((notification) => notification.id === selectedManagerNotificationId) ?? null;
  }, [managerNotifications, selectedManagerNotificationId]);

  const { fetchTiers } = useTierStore();
  
  // Sync language from localStorage on mount
  useEffect(() => {
    hydrateLanguage();
  }, [hydrateLanguage]);

  useEffect(() => {
    if (requiredRole === "MANAGER" && language !== "en") {
      setLanguage("en");
    }
  }, [language, requiredRole, setLanguage]);

  useEffect(() => {
    setIsMounted(true);
    hydrateAuthSession();
  }, []);
  useEffect(() => {
    if (!isMounted || authHydrated) return;
    const timer = window.setTimeout(() => {
      setAuthHydrationTimedOut(true);
      hydrateAuthSession();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [authHydrated, isMounted]);
  useEffect(() => {
    if (authHydrated) {
      setAuthHydrationTimedOut(false);
    }
  }, [authHydrated]);
  useEffect(() => {
    if (isMounted) {
      setTheme("light");
    }
  }, [isMounted, setTheme]);
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);
  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  // Staff/Admin notifications -> Sonner toast alerts
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

    const newSessions = pendingSessions.filter((s) => !lastSessionIds.includes(s.sessionId));

    if (newSessions.length > 0) {
      const target = newSessions[0];
      toast.info(t("Xe đã sẵn sàng để rửa!", "A wash session is ready!"), {
        description: `${target.customerName} - ${target.vehiclePlate}`,
        action: {
          label: t("Mở phiên", "Open session"),
          onClick: () => router.push(`/staff/sessions/${target.sessionId}`),
        },
        position: "bottom-right",
        duration: 8000,
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

  if (!isMounted || (!authHydrated && !authHydrationTimedOut)) {
    return <WorkspaceGate message={t("Đang tải khu vực làm việc...", "Loading workspace...")} />;
  }
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
    : requiredRole === "MANAGER" ? "/manager/profile"
    : "/admin/profile";

  const quickActions = getProfileQuickActions(requiredRole);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {requiredRole === "CUSTOMER" && <MarqueeTicker />}
      <div className="relative flex flex-1 overflow-hidden bg-background text-foreground">
        <div 
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[radial-gradient(circle_at_14%_0%,rgba(45,255,238,0.12),transparent_28rem),radial-gradient(circle_at_92%_12%,rgba(13,108,107,0.10),transparent_28rem),linear-gradient(180deg,#f7feff_0%,#ffffff_48%,#f2fbfb_100%)]"
        />

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "sticky top-0 z-20 hidden h-full shrink-0 flex-col border-r border-cyan-900/10 bg-white/88 shadow-[0_24px_80px_rgba(6,17,26,0.08)] backdrop-blur-xl transition-all duration-300 lg:flex",
          requiredRole === "CUSTOMER"
            ? (sidebarCollapsed ? "w-[5.25rem]" : "w-64")
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
                pathname={activePathname}
                collapsed={sidebarCollapsed}
                activeClassName={workspaceTheme.activeNav}
                language={language}
                tierStyle={isCustomer ? tierStyle : null}
              />
            ))}
          </ul>
        </nav>

        <div className="mt-auto space-y-3 border-t border-border/70 p-4">
          {requiredRole === "CUSTOMER" && !sidebarCollapsed && (
            <div className="rounded-md border border-cyan-900/10 bg-white/72 p-3 shadow-[0_14px_36px_rgba(6,17,26,0.05)]">
              <div className="flex items-start gap-3">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", workspaceTheme.accent)}>
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Hotline</div>
                  <div className="mt-0.5 text-sm font-extrabold tracking-tight">1900 1234</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {t("8:00 - 20:00 hằng ngày", "8:00 AM - 8:00 PM daily")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {requiredRole !== "CUSTOMER" && !sidebarCollapsed && (
            <div className="rounded-md border border-cyan-900/10 bg-white/72 p-3 shadow-[0_14px_36px_rgba(6,17,26,0.05)]">
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
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-cyan-900/10 bg-white/76 px-3 py-2.5 text-sm font-bold transition hover:bg-cyan-50"
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
      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <header className="relative z-30 border-b border-cyan-900/10 bg-white/84 px-4 py-4 shadow-[0_12px_40px_rgba(6,17,26,0.04)] backdrop-blur-xl lg:px-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
            {/* Left: title */}
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cyan-900/10 bg-white shadow-sm lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
                aria-label={t("Mở menu điều hướng", "Open navigation menu")}
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <h1 className="truncate text-xl font-bold tracking-tight lg:text-2xl">
                    {headerTitle}
                  </h1>
                  {headerConfig?.toolbar ? (
                    <div className="min-w-0 shrink-0">
                      {headerConfig.toolbar}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {/* Language switcher */}
              <div className="inline-flex items-center rounded-full border border-cyan-900/10 bg-white/90 p-0.5 shadow-sm backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={cn(
                    "rounded-md px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold transition-all",
                    language === "en"
                      ? "bg-primary text-primary-foreground shadow-sm font-black"
                      : "text-muted-foreground hover:text-foreground font-semibold",
                  )}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("vi")}
                  className={cn(
                    "rounded-md px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold transition-all",
                    language === "vi"
                      ? "bg-primary text-primary-foreground shadow-sm font-black"
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
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-900/10 bg-white/90 transition hover:border-cyan-300/50 hover:bg-cyan-50"
                aria-label={t("Chuyển chế độ sáng/tối", "Toggle dark/light mode")}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-yellow-400" />
                ) : (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {/* Customer cart drawer */}
              {isCustomer && <CartDrawer />}

              {/* Staff notification bell */}
              {isStaff && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-900/10 bg-white/90 transition hover:border-cyan-300/50 hover:bg-cyan-50"
                      aria-label={t("Thông báo nghiệp vụ", "Work notifications")}
                    >
                      <Bell className={cn("h-4 w-4", totalNotifications > 0 ? "text-cyan-700" : "text-muted-foreground")} />
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
                    className="w-80 rounded-md border-cyan-900/10 bg-white/95 p-3 shadow-[0_22px_60px_rgba(6,17,26,0.12)] backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        {t("Thông báo nghiệp vụ", "Work Notifications")}
                      </h3>
                      {totalNotifications > 0 && (
                        <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-black text-cyan-800">
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
                                className="flex flex-col gap-0.5 rounded-sm bg-cyan-50/70 hover:bg-cyan-50 p-2 text-[11px] transition"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-cyan-950 font-mono">{booking.vehiclePlate}</span>
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
                                className="flex flex-col gap-0.5 rounded-sm bg-orange-50/50 dark:bg-orange-900/20 hover:bg-orange-50 dark:hover:bg-orange-900/30 p-2 text-[11px] transition"
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
                            className="flex w-full items-center justify-center rounded-sm bg-muted py-2 text-center text-[11px] font-bold text-foreground hover:bg-accent transition"
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
                <Popover
                  onOpenChange={(open) => {
                    if (open) {
                      void customerNotificationsQuery.refetch();
                      return;
                    }
                    setSelectedNotificationId(null);
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-900/10 bg-white/90 transition hover:border-cyan-300/50 hover:bg-cyan-50"
                      aria-label={t("Thông báo", "Notifications")}
                    >
                      <Bell className={cn("h-4 w-4", unreadCustomerNotifications > 0 ? "text-cyan-700" : "text-muted-foreground")} />
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
                    className="w-80 rounded-md border-cyan-900/10 bg-white/95 p-3 shadow-[0_22px_60px_rgba(6,17,26,0.12)] backdrop-blur-xl"
                  >
                    {selectedNotification ? (
                      <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
                        <div className="flex items-center gap-2 border-b border-border/50 pb-2 mb-2">
                          <button
                            type="button"
                            onClick={() => setSelectedNotificationId(null)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-muted-foreground transition"
                            aria-label={t("Quay lại", "Back")}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex-1">
                            {t("Chi tiết thông báo", "Notification Detail")}
                          </h3>
                        </div>
                        <div className="flex flex-col gap-2 p-1 overflow-y-auto max-h-64">
                          <div className="text-sm font-bold text-cyan-950 dark:text-cyan-100">
                            {translateNotificationField(selectedNotification.title, language)}
                          </div>
                          <div className="text-[10px] font-semibold text-muted-foreground">
                            {new Date(selectedNotification.createdAt).toLocaleString(language === "vi" ? "vi-VN" : "en-US")}
                          </div>
                          <div className="text-xs leading-relaxed text-foreground dark:text-slate-300 mt-2 whitespace-pre-wrap">
                            {translateNotificationField(selectedNotification.message, language)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col h-full animate-in slide-in-from-left-4 duration-200">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                              {t("Thông báo", "Notifications")}
                            </h3>
                            {unreadCustomerNotifications > 0 && (
                              <span className="rounded-full bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 text-[9px] font-black text-cyan-800 dark:text-cyan-400">
                                {unreadCustomerNotifications}
                              </span>
                            )}
                          </div>
                          {unreadCustomerNotifications > 0 && (
                            <button
                              type="button"
                              onClick={async () => {
                                const unread = customerNotificationsQuery.data?.filter(n => !n.read) ?? [];
                                try {
                                  await Promise.all(unread.map(item => markCustomerNotificationAsReadMutation.mutateAsync(item.notificationId)));
                                  toast.success(t("Đã đọc tất cả thông báo", "All notifications marked as read"));
                                } catch (e) {}
                              }}
                              className="text-[10px] font-bold text-[#0566D9] dark:text-sky-400 hover:underline"
                            >
                              {t("Đọc tất cả", "Mark all read")}
                            </button>
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
                                onClick={() => {
                                  if (!notification.read) {
                                    markCustomerNotificationAsReadMutation.mutate(notification.notificationId);
                                  }
                                  setSelectedNotificationId(notification.notificationId);
                                }}
                                className={cn(
                                  "flex w-full flex-col gap-1 rounded-sm p-2 text-left text-xs transition",
                                  notification.read 
                                    ? "bg-muted/30 dark:bg-slate-900/40 hover:bg-muted/50 dark:hover:bg-slate-800/40" 
                                    : "bg-cyan-50/70 dark:bg-cyan-950/20 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={cn("font-bold", notification.read ? "text-muted-foreground" : "text-cyan-955 dark:text-cyan-200")}>
                                    {translateNotificationField(notification.title, language)}
                                  </span>
                                  {!notification.read && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                  )}
                                </div>
                                <div className={cn("line-clamp-2 text-[11px]", notification.read ? "text-muted-foreground" : "text-foreground dark:text-slate-300")}>
                                  {translateNotificationField(notification.message, language)}
                                </div>
                              </button>
                            ))}
                            <div className="pt-2 border-t border-border/50">
                              <Link
                                href="/customer/notifications"
                                className="flex w-full items-center justify-center rounded-sm bg-muted dark:bg-slate-900 py-2 text-center text-[11px] font-bold text-foreground dark:text-slate-350 hover:bg-accent dark:hover:bg-slate-800 transition"
                              >
                                {t("Xem tất cả", "View all")}
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              )}

              {isManager && (
                <Popover onOpenChange={(open) => { if (!open) setSelectedManagerNotificationId(null); }}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-900/10 bg-white/90 transition hover:border-cyan-300/50 hover:bg-cyan-50"
                      aria-label={t("Thông báo Manager", "Manager notifications")}
                    >
                      <Bell className={cn("h-4 w-4", unreadManagerNotifications > 0 ? "text-cyan-700" : "text-muted-foreground")} />
                      {unreadManagerNotifications > 0 && (
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
                    className="w-80 rounded-md border-cyan-900/10 bg-white/95 p-3 shadow-[0_22px_60px_rgba(6,17,26,0.12)] backdrop-blur-xl"
                  >
                    {selectedManagerNotification ? (
                      <div className="flex h-full flex-col animate-in slide-in-from-right-4 duration-200">
                        <div className="mb-2 flex items-center gap-2 border-b border-border/50 pb-2">
                          <button
                            type="button"
                            onClick={() => setSelectedManagerNotificationId(null)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-cyan-50"
                            aria-label="Back"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <h3 className="flex-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Notification Detail
                          </h3>
                          <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black", managerNotificationTone(selectedManagerNotification.kind))}>
                            {managerNotificationKindLabel(selectedManagerNotification.kind)}
                          </span>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-1">
                          <div className="text-sm font-bold text-cyan-950">{selectedManagerNotification.title}</div>
                          <div className="mt-1 text-[10px] font-semibold text-muted-foreground">
                            {selectedManagerNotification.createdAt}
                            {selectedManagerNotification.target ? ` · ${selectedManagerNotification.target}` : ""}
                          </div>
                          {selectedManagerNotification.plate ? (
                            <div className="mt-3 inline-flex rounded-sm bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800">
                              Priority vehicle: {selectedManagerNotification.plate}
                            </div>
                          ) : null}
                          <div className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                            {selectedManagerNotification.message}
                          </div>
                          {selectedManagerNotification.href ? (
                            <Link
                              href={selectedManagerNotification.href}
                              className="mt-4 flex w-full items-center justify-center rounded-sm bg-muted py-2 text-center text-[11px] font-bold text-foreground transition hover:bg-accent"
                            >
                              View details
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col animate-in slide-in-from-left-4 duration-200">
                        <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                              Notifications
                            </h3>
                            {unreadManagerNotifications > 0 && (
                              <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[9px] font-black text-cyan-800">
                                {unreadManagerNotifications}
                              </span>
                            )}
                          </div>
                          {unreadManagerNotifications > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                markAllManagerNotificationsRead();
                                toast.success("All notifications marked as read");
                              }}
                              className="text-[10px] font-bold text-[#0566D9] hover:underline"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>

                        {managerNotifications.length === 0 ? (
                          <div className="py-6 text-center text-xs font-semibold text-muted-foreground">
                            No notifications
                          </div>
                        ) : (
                          <div className="max-h-64 space-y-2 overflow-y-auto">
                            {managerNotifications.slice(0, 5).map((notification) => (
                              <button
                                key={notification.id}
                                type="button"
                                onClick={() => {
                                  if (!notification.read) {
                                    markManagerNotificationRead(notification.id);
                                  }
                                  setSelectedManagerNotificationId(notification.id);
                                }}
                                className={cn(
                                  "flex w-full flex-col gap-1 rounded-sm p-2 text-left text-xs transition",
                                  notification.read
                                    ? "bg-muted/30 hover:bg-muted/50"
                                    : "bg-cyan-50/70 hover:bg-cyan-50",
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className={cn("truncate font-bold", notification.read ? "text-muted-foreground" : "text-cyan-955")}>
                                    {notification.title}
                                  </span>
                                  {!notification.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />}
                                </div>
                                <div className={cn("line-clamp-2 text-[11px]", notification.read ? "text-muted-foreground" : "text-foreground")}>
                                  {notification.message}
                                </div>
                                <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                                  <span className={cn("rounded-full px-2 py-0.5", managerNotificationTone(notification.kind))}>
                                    {managerNotificationKindLabel(notification.kind)}
                                  </span>
                                  <span>{notification.createdAt}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
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
                      "group flex h-10 w-auto items-center gap-2 rounded-sm border px-3 py-1.5 text-left transition sm:px-3",
                      customerTierMetal
                        ? "relative overflow-hidden border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_4px_14px_rgba(0,0,0,0.15)] [&>*]:relative [&>*]:z-10"
                        : "border-border/70 bg-card/90 hover:border-primary/30 hover:bg-card",
                    )}
                    style={customerTierMetal ? { background: customerTierMetal.surface, borderColor: customerTierMetal.border } : {}}
                    aria-label={t("Mở menu hồ sơ", "Open profile menu")}
                  >
                    {customerTierMetal ? (
                      <>
                        <span className="absolute inset-0 rounded-sm bg-[linear-gradient(135deg,rgba(255,255,255,0.30)_0%,rgba(255,255,255,0.05)_42%,rgba(0,0,0,0.12)_100%)]" />
                        <span className="absolute inset-x-3 top-px h-px bg-white/40" />
                      </>
                    ) : null}
                    <Avatar
                      className={cn("h-7 w-7 border shadow-sm", customerTierMetal ? "" : workspaceTheme.accentSoft)}
                      style={customerTierMetal ? { background: customerTierMetal.progress, borderColor: customerTierMetal.border } : {}}
                    >
                      <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName} className="object-cover" />
                      <AvatarFallback
                        className={cn("text-[10px] font-black", customerTierMetal ? "" : workspaceTheme.accentSoft)}
                        style={customerTierMetal ? { background: customerTierMetal.progress, color: "#ffffff" } : {}}
                      >
                        {getUserInitials(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden min-w-0 sm:block">
                      <div className={cn("truncate text-[13px] font-black leading-tight")} style={customerTierMetal ? { color: customerTierMetal.text } : {}}>{user.fullName}</div>
                      {requiredRole === "CUSTOMER" ? (
                        <div className="mt-0.5">
                          <TierBadge tier={effectiveCustomerTier} />
                        </div>
                      ) : (
                        <div className={cn("truncate text-[10px] font-black uppercase tracking-wide")} style={customerTierMetal ? { color: customerTierMetal.softText } : {}}>
                          {user.role}
                        </div>
                      )}
                    </div>
                    <ChevronDown className={cn("hidden h-3.5 w-3.5 transition group-data-[state=open]:rotate-180 sm:block", customerTierMetal ? "" : "text-muted-foreground")} style={customerTierMetal ? { color: customerTierMetal.softText } : {}} />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={10}
                  className="w-72 rounded-md border-border/70 bg-card/95 p-2 shadow-[0_22px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl"
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
                          {requiredRole === "CUSTOMER" ? (
                            <TierBadge tier={user.tier || "MEMBER"} />
                          ) : (
                            <>
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                              {user.role}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="my-1 h-px bg-border" />

                  <Link
                    href={profileHref}
                    className="flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-semibold transition hover:bg-accent"
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
                        className="flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-semibold transition hover:bg-accent"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {language === "vi" ? action.labelVi : action.label}
                      </Link>
                    );
                  })}

                  <div className="my-1 h-px bg-border" />

                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-accent"
                    onClick={() => router.refresh()}
                  >
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    {t("Làm mới dữ liệu", "Refresh data")}
                  </button>

                  <button
                    type="button"
                    disabled={logoutMutation.isPending}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="inline-flex h-10 items-center gap-2 rounded-sm border border-border/70 px-3 text-sm font-semibold transition hover:bg-accent lg:hidden"
                aria-label={t("Đăng xuất", "Sign out")}
              >
                <ArrowRightFromLine className="h-4 w-4" />
              </button>
            </div>
          </div>
          </div>
        </header>

        <WorkspaceHeaderProvider onConfigChange={setHeaderConfig}>
          <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>
        </WorkspaceHeaderProvider>
        {requiredRole === "STAFF" && <StaffNotificationListener />}

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan-900/10 bg-white/95 px-2 py-2 shadow-[0_-14px_44px_rgba(6,17,26,0.08)] backdrop-blur-xl lg:hidden">
          <ul className="grid grid-cols-4 gap-1">
            {mobileItems.map((item) => {
              const active = isNavActive(activePathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-sm px-1 py-2 text-[10px] font-semibold",
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
                    pathname={activePathname}
                    collapsed={false}
                    activeClassName={workspaceTheme.activeNav}
                    language={language}
                    tierStyle={isCustomer ? tierStyle : null}
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
        <div className="fixed top-20 right-6 z-[100] w-[22rem] max-w-[calc(100vw-2rem)] rounded-md border border-cyan-300/50 bg-card/95 p-4 shadow-[0_16px_48px_-8px_rgba(8,145,178,0.22)] backdrop-blur-xl animate-in fade-in slide-in-from-top-4 slide-in-from-right-4">
          <button
            type="button"
            onClick={() => setAlertNotification((prev) => ({ ...prev, show: false }))}
            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition"
            aria-label={t("Đóng thông báo", "Dismiss notification")}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3.5 pr-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm dark:border-cyan-800 dark:bg-cyan-900/30">
              <BellRing className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-cyan-800">
                {alertNotification.title}
              </h4>
              <div className="mt-1.5 flex items-center gap-2 rounded-sm bg-muted/80 px-2.5 py-1.5 text-xs font-bold border border-border/50">
                <span className="text-[10px] text-muted-foreground uppercase">
                  {t("Biển số", "Plate")}
                </span>
                <span className="font-black tracking-wide text-cyan-950 font-mono text-sm">
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
                  className="inline-flex items-center justify-center rounded-sm bg-[#06111a] hover:bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5"
                >
                  {t("Duyệt ngay", "Review now")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeManagerPopup ? (
        <ManagerNotificationPopup notification={activeManagerPopup} onClose={closeManagerNotificationPopup} />
      ) : null}
      {tierUpgradePopup.show && tierUpgradePopup.newTier ? (
        <MembershipTierUpgradePopup
          open={tierUpgradePopup.show}
          oldTier={tierUpgradePopup.oldTier}
          newTier={tierUpgradePopup.newTier}
          onClose={() => setTierUpgradePopup((prev) => ({ ...prev, show: false }))}
          onViewTier={() => {
            setTierUpgradePopup((prev) => ({ ...prev, show: false }));
            router.push("/customer/loyalty");
          }}
        />
      ) : null}
      {false ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-md border border-cyan-200 bg-white p-6 text-center shadow-[0_28px_80px_-24px_rgba(8,145,178,0.55)]">
            <button
              type="button"
              onClick={() => setTierUpgradePopup((prev) => ({ ...prev, show: false }))}
              className="absolute right-3 top-3 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label={t("Đóng thông báo", "Dismiss notification")}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm">
              <Sparkles className="h-8 w-8" />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
              {t("Lên hạng thành công", "Tier upgraded")}
            </p>
            <h3 className="mt-2 text-2xl font-black leading-tight text-slate-950">
              {tierUpgradePopup.title}
            </h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              {tierUpgradePopup.message}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/customer/loyalty"
                onClick={() => setTierUpgradePopup((prev) => ({ ...prev, show: false }))}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-sm bg-cyan-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-cyan-700"
              >
                {t("Xem hạng của tôi", "View my tier")}
              </Link>
              <button
                type="button"
                onClick={() => setTierUpgradePopup((prev) => ({ ...prev, show: false }))}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-sm border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                {t("Đóng", "Close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function WorkspaceGate({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="rounded-sm border border-border bg-card px-5 py-3 text-sm font-medium text-muted-foreground shadow-sm">
        {message}
      </p>
    </main>
  );
}

function isTierUpgradeNotification(notification: { type?: string; title: string; message: string }) {
  const text = `${notification.title} ${notification.message}`.toLowerCase();
  return text.includes("thăng hạng")
    || text.includes("lên hạng")
    || text.includes("membership tier")
    || text.includes("updated to")
    || text.includes("upgraded")
    || text.includes("upgrade");
}

function isRecentNotification(createdAt: string) {
  const createdTime = new Date(createdAt).getTime();
  if (!Number.isFinite(createdTime)) return false;
  return Date.now() - createdTime <= 15 * 60 * 1000;
}

function extractTierUpgradeData(notification: { title: string; message: string }) {
  const source = `${notification.title} ${notification.message}`.replace(/\./g, " ");

  const fromToVietnamese = source.match(/từ\s+([A-Z_]+)\s+lên\s+([A-Z_]+)/i);
  if (fromToVietnamese) {
    return {
      oldTier: fromToVietnamese[1].toUpperCase(),
      newTier: fromToVietnamese[2].toUpperCase(),
    };
  }

  const fromToEnglish = source.match(/from\s+([A-Z_]+)\s+to\s+([A-Z_]+)/i);
  if (fromToEnglish) {
    return {
      oldTier: fromToEnglish[1].toUpperCase(),
      newTier: fromToEnglish[2].toUpperCase(),
    };
  }

  const updatedToEnglish = source.match(/updated to\s+([A-Z_]+)/i);
  if (updatedToEnglish) {
    return {
      oldTier: null,
      newTier: updatedToEnglish[1].toUpperCase(),
    };
  }

  const upgradedToVietnamese = source.match(/nâng lên\s+([A-Z_]+)/i);
  if (upgradedToVietnamese) {
    return {
      oldTier: null,
      newTier: upgradedToVietnamese[1].toUpperCase(),
    };
  }

  return {
    oldTier: null,
    newTier: null,
  };
}

function ManagerNotificationPopup({
  notification,
  onClose,
}: {
  notification: ManagerNotification;
  onClose: () => void;
}) {
  return (
    <div className="fixed right-6 top-20 z-[110] w-[23rem] max-w-[calc(100vw-2rem)] rounded-md border border-cyan-200/70 bg-white/96 p-4 shadow-[0_22px_70px_rgba(6,17,26,0.20)] backdrop-blur-xl animate-in fade-in slide-in-from-top-4 slide-in-from-right-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full border", managerNotificationIconTone(notification.kind))}>
          <BellRing className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", managerNotificationTone(notification.kind))}>
              {managerNotificationKindLabel(notification.kind)}
            </span>
            <span className="text-[10px] font-bold text-slate-400">{notification.createdAt}</span>
          </div>
          <h4 className="mt-2 text-sm font-black text-slate-950">{notification.title}</h4>
          {notification.plate ? (
            <div className="mt-2 inline-flex rounded-sm bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800">
              Priority vehicle: {notification.plate}
            </div>
          ) : null}
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{notification.message}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-bold text-slate-400">{notification.target ?? "Manager"}</span>
            {notification.href ? (
              <Link
                href={notification.href}
                onClick={onClose}
                className="rounded-sm bg-[#06111a] px-3 py-2 text-[11px] font-black text-white transition hover:bg-slate-900"
              >
                View details
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function managerNotificationTone(kind: ManagerNotificationKind) {
  const tones: Record<ManagerNotificationKind, string> = {
    success: "bg-emerald-50 text-emerald-700",
    error: "bg-rose-50 text-rose-700",
    warning: "bg-amber-50 text-amber-700",
    info: "bg-cyan-50 text-cyan-700",
    priority: "bg-amber-100 text-amber-800",
    shift: "bg-indigo-50 text-indigo-700",
  };
  return tones[kind];
}

function managerNotificationIconTone(kind: ManagerNotificationKind) {
  const tones: Record<ManagerNotificationKind, string> = {
    success: "border-emerald-100 bg-emerald-50 text-emerald-700",
    error: "border-rose-100 bg-rose-50 text-rose-700",
    warning: "border-amber-100 bg-amber-50 text-amber-700",
    info: "border-cyan-100 bg-cyan-50 text-cyan-700",
    priority: "border-amber-200 bg-amber-100 text-amber-800",
    shift: "border-indigo-100 bg-indigo-50 text-indigo-700",
  };
  return tones[kind];
}

function managerNotificationKindLabel(kind: ManagerNotificationKind) {
  const labels: Record<ManagerNotificationKind, string> = {
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Info",
    priority: "Priority",
    shift: "Shift",
  };
  return labels[kind];
}

function getProfileQuickActions(role: UserRole) {
  if (role === "STAFF") {
    return [
      { href: "/staff/my-sessions",     label: "Today's work",          labelVi: "Công việc hôm nay",   icon: Droplets },
      { href: "/staff/sessions/history",label: "Wash session history",  labelVi: "Lịch sử phiên rửa",  icon: History },
    ];
  }
  if (role === "MANAGER") {
    return [
      { href: "/manager/dashboard", label: "Manager overview", labelVi: "Tổng quan điều phối", icon: LayoutDashboard },
      { href: "/manager/operations", label: "Operations queue", labelVi: "Hàng đợi vận hành", icon: ClipboardList },
      { href: "/manager/staff", label: "Staff management", labelVi: "Quản lý nhân viên", icon: UserCog },
      { href: "/manager/settings", label: "Operation settings", labelVi: "Cài đặt vận hành", icon: Settings2 },
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
    { href: "/customer/home",          label: "Customer home",   labelVi: "Trang khách hàng",    icon: LayoutDashboard },
    { href: "/customer/bookings",      label: "My bookings",     labelVi: "Lịch đặt của tôi",    icon: ClipboardList },
    { href: "/customer/vehicles/add",  label: "Add a vehicle",   labelVi: "Thêm xe mới",          icon: Car },
    { href: "/customer/settings",      label: "Account settings",labelVi: "Cài đặt tài khoản",   icon: Settings2 },
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/15 bg-card text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
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
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-[10px] font-black tracking-tighter", theme.accent)}>
            {isCustomer ? "AR" : "AC"}
          </div>
          <div className="min-w-0 animate-in fade-in">
            <div className="font-black tracking-[-0.02em] text-lg text-slate-900">
              {isCustomer ? "AURA CAR CARE" : "AURA CAR CARE"}
            </div>
            <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {description}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:bg-accent"
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
  tierStyle,
  onNavigate,
}: {
  item: WorkspaceNavItem;
  pathname: string;
  collapsed: boolean;
  activeClassName: string;
  language: "vi" | "en";
  tierStyle?: ReturnType<typeof useTierStyle> | null;
  onNavigate?: () => void;
}) {
  const active = isNavActive(pathname, item);
  const Icon = item.icon;
  const displayLabel = language === "vi" && item.labelVi ? item.labelVi : item.label;
  const isLoyaltyItem = item.href === "/customer/loyalty";

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        title={collapsed ? displayLabel : undefined}
        className={cn(
          "group flex items-center rounded-sm text-sm font-medium transition-all",
          collapsed ? "mx-auto h-12 w-12 justify-center rounded-full" : "gap-3 px-3 py-2.5",
          active ? activeClassName : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Icon 
          className={cn(
            "h-4 w-4 shrink-0"
          )}
          style={isLoyaltyItem && tierStyle && !active ? { color: tierStyle.hex } : undefined}
        />
        {!collapsed && <span>{displayLabel}</span>}
      </Link>
    </li>
  );
}

function isNavActive(pathname: string, item: WorkspaceNavItem) {
  const itemPath = item.href.split("?")[0];
  if (item.exact) return pathname === itemPath;
  if (itemPath === "/customer/services" && pathname.startsWith("/customer/combos/")) {
    return true;
  }
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

