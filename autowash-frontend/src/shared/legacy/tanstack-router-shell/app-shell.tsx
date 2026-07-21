import * as React from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  CarFront,
  ChevronDown,
  ClipboardList,
  Droplets,
  Gift,
  Home,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  ReceiptText,
  Settings2,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getHomePath } from "@/shared/lib/auth";
import { type Role, useCarwashStore } from "@/shared/store/carwash-store";
import { cn } from "@/shared/lib/utils";
import { useCustomerBooking } from "@/app/modules/customer-booking/routes";
import {
  LanguageSwitcher,
  ThemeSwitcher,
  useLanguage,
} from "@/app/modules/public-auth/components/LanguageSwitcher";
import { SupportChatWidget } from "@/features/support/components/support-chat-widget";

type NavItem = {
  to: string;
  label: string;
  labelVi?: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  labelVi?: string;
  items: NavItem[];
};

const CUSTOMER_NAV: NavGroup[] = [
  {
    label: "Customer",
    labelVi: "Khách hàng",
    items: [
      {
        to: "/customer/home",
        label: "Home",
        labelVi: "Trang chủ",
        icon: LayoutDashboard,
        exact: true,
      },
      { to: "/customer/vehicles", label: "Vehicles", labelVi: "Xe của tôi", icon: CarFront },
      {
        to: "/customer/bookings",
        label: "Booking",
        labelVi: "Đặt lịch",
        icon: ClipboardList,
        exact: true,
      },
      {
        to: "/customer/history",
        label: "History",
        labelVi: "Lịch sử",
        icon: ClipboardList,
        exact: true,
      },
      { to: "/customer/loyalty", label: "Loyalty", labelVi: "Tích điểm", icon: Gift },
      {
        to: "/customer/transactions",
        label: "Transactions",
        labelVi: "Giao dịch",
        icon: ReceiptText,
        exact: true,
      },
    ],
  },
];

const STAFF_NAV: NavGroup[] = [
  {
    label: "Staff",
    labelVi: "Nhân viên",
    items: [
      {
        to: "/staff/dashboard",
        label: "Dashboard",
        labelVi: "Bảng điều khiển",
        icon: LayoutDashboard,
        exact: true,
      },
      { to: "/staff/operations", label: "Operations", labelVi: "Vận hành", icon: ClipboardList },
      { to: "/staff/check-in", label: "Check-in", labelVi: "Check-in", icon: Wrench },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    label: "Admin",
    labelVi: "Quản trị",
    items: [
      {
        to: "/admin/dashboard",
        label: "Dashboard",
        labelVi: "Bảng điều khiển",
        icon: LayoutDashboard,
        exact: true,
      },
      { to: "/admin/bookings", label: "Bookings", labelVi: "Lịch đặt", icon: ClipboardList },
      { to: "/admin/accounts", label: "Accounts", labelVi: "Tài khoản", icon: Users },
      { to: "/admin/packages", label: "Wash Packages", labelVi: "Gói rửa xe", icon: Droplets },
      { to: "/admin/loyalty", label: "Loyalty", labelVi: "Tích điểm", icon: Gift },
      { to: "/admin/promotions", label: "Promotions", labelVi: "Khuyến mãi", icon: Sparkles },
      { to: "/admin/reports", label: "Reports", labelVi: "Báo cáo", icon: BarChart3 },
    ],
  },
];

function navForRole(role: Role) {
  if (role === "Staff") return STAFF_NAV;
  if (role === "Admin") return ADMIN_NAV;
  return CUSTOMER_NAV;
}

function formatNotificationTime(timestamp: Date) {
  const diffMs = Date.now() - timestamp.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return timestamp.toLocaleDateString("vi-VN");
}

export function AppShell({ role }: { role: Role }) {
  const { lang, t } = useLanguage();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const { loginAs, logout } = useCarwashStore();
  const { setLanguage: setCustomerBookingLanguage } = useCustomerBooking();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [customerNotificationsOpen, setCustomerNotificationsOpen] = useState(false);
  const customerNotificationsRef = useRef<HTMLDivElement | null>(null);
  const navGroups = navForRole(role);

  useEffect(() => {
    if (role === "Customer") {
      setCustomerBookingLanguage(lang);
    }
  }, [lang, role, setCustomerBookingLanguage]);

  const switchRole = (nextRole: Role) => {
    loginAs(nextRole);
    navigate({ to: getHomePath(nextRole) });
  };

  const store = useCarwashStore();
  const currentCustomer = store.customers.find((c) => c.id === store.currentCustomerId);
  const customerNotifications = useMemo(() => {
    if (role !== "Customer" || !store.currentCustomerId) return [];
    return store.notifications
      .filter((notification) => notification.customerId === store.currentCustomerId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [role, store.currentCustomerId, store.notifications]);
  const profileName =
    role === "Customer" && currentCustomer ? currentCustomer.name : `${role} User`;
  const profileTag =
    role === "Customer" && currentCustomer
      ? t(`${currentCustomer.tier} Member`, `Hạng ${currentCustomer.tier}`)
      : t(`${role} Workspace`, `Không gian ${role}`);

  let headerTitle = "Overview";
  let headerTitleVi = "Tổng quan";
  let headerSubtitle = "Manage your car wash activities";
  let headerSubtitleVi = "Quản lý hoạt động rửa xe của bạn";

  if (pathname === "/customer/home" || pathname.includes("/cb/home")) {
    headerTitle = "Customer Home";
    headerTitleVi = "Trang khách hàng";
    headerSubtitle = "Points, vouchers, active combo, and bookings";
    headerSubtitleVi = "Điểm, voucher, combo đang dùng và lịch đặt";
  } else if (pathname.includes("/profile")) {
    headerTitle = "Personal Profile";
    headerTitleVi = "Hồ sơ cá nhân";
    headerSubtitle = "Manage your account information and preferences";
    headerSubtitleVi = "Quản lý thông tin tài khoản và tùy chọn";
  } else if (pathname.includes("/cb/vehicles") || pathname === "/customer/vehicles") {
    headerTitle = "My Vehicles";
    headerTitleVi = "Xe của tôi";
    headerSubtitle = "Add, edit, or remove your registered vehicles";
    headerSubtitleVi = "Thêm, sửa hoặc xóa xe đã đăng ký";
  } else if (pathname.includes("/cb/booking") || pathname === "/customer/bookings") {
    headerTitle = "Đặt lịch rửa xe";
    headerTitleVi = "Đặt lịch rửa xe";
    headerSubtitle = "Choose a wash, voucher, payment method, or active combo";
    headerSubtitleVi = "Chọn gói rửa, voucher, thanh toán hoặc combo";
  } else if (pathname.includes("/cb/history") || pathname === "/customer/history") {
    headerTitle = "Your History";
    headerTitleVi = "Lịch sử của bạn";
    headerSubtitle = "Track and manage your wash appointments";
    headerSubtitleVi = "Theo dõi và quản lý lịch hẹn rửa xe";
  } else if (pathname.includes("/transactions")) {
    headerTitle = "Transactions";
    headerTitleVi = "Giao dịch";
    headerSubtitle = "View your payment history and receipts";
    headerSubtitleVi = "Xem lịch sử thanh toán và hóa đơn";
  } else if (pathname.includes("/loyalty")) {
    headerTitle = "Loyalty & Rewards";
    headerTitleVi = "Tích điểm & quà thưởng";
    headerSubtitle = "Track your points and membership benefits";
    headerSubtitleVi = "Theo dõi điểm và quyền lợi thành viên";
  } else if (role === "Staff") {
    headerTitle = "Staff Dashboard";
    headerTitleVi = "Bảng điều khiển nhân viên";
    headerSubtitle = "Manage check-ins and operations";
    headerSubtitleVi = "Quản lý check-in và vận hành";
  } else if (role === "Admin") {
    headerTitle = "Admin Control Panel";
    headerTitleVi = "Bảng quản trị";
    headerSubtitle = "System overview and configurations";
    headerSubtitleVi = "Tổng quan hệ thống và cấu hình";
  }

  useEffect(() => {
    if (!customerNotificationsOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!customerNotificationsRef.current?.contains(event.target as Node)) {
        setCustomerNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [customerNotificationsOpen]);

  useEffect(() => {
    setCustomerNotificationsOpen(false);
  }, [pathname, role]);

  return (
    <div className="flex min-h-screen bg-background text-foreground relative selection:bg-primary/30">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/5 blur-[120px] mix-blend-screen" />
      </div>

      <aside
        className={cn(
          "hidden shrink-0 border-r border-border/50 bg-card/60 backdrop-blur-xl transition-all duration-300 lg:flex lg:flex-col relative z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] dark:shadow-none",
          sidebarCollapsed ? "w-20" : "w-72",
        )}
        onClick={() => {
          if (sidebarCollapsed) {
            setSidebarCollapsed(false);
          }
        }}
      >
        <div className="border-b border-border/50 px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-md overflow-hidden p-0.5">
                <img
                  src="/logo.png"
                  alt="AURA CAR CARE logo"
                  className="h-full w-full rounded-[10px] object-cover"
                />
              </div>
              {!sidebarCollapsed && (
                <div className="animate-in fade-in duration-300">
                  <div className="font-bold tracking-tight">AURA CAR CARE</div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t(`${role} Workspace`, `Không gian ${role}`)}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarCollapsed((value) => !value);
              }}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background/50 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              aria-label={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="mt-6 rounded-xl border border-border/50 bg-background/40 p-3 backdrop-blur-sm animate-in fade-in duration-500">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t("Demo Role Switch", "Chuyển vai trò demo")}
              </div>
              <div className="flex gap-1.5">
                {(["Customer", "Staff", "Admin"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => switchRole(item)}
                    className={cn(
                      "flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all duration-200 border",
                      role === item
                        ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                        : "bg-transparent text-muted-foreground border-transparent hover:bg-background/80 hover:border-border",
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={cn("flex-1 overflow-y-auto py-6", sidebarCollapsed ? "px-3" : "px-4")}>
          {navGroups.map((group) => (
            <div key={group.label} className="mb-6">
              {!sidebarCollapsed && (
                <div className="px-2 pb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 animate-in fade-in">
                  {t(group.label, group.labelVi ?? group.label)}
                </div>
              )}
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={(event) => {
                        if (sidebarCollapsed) {
                          event.preventDefault();
                          setSidebarCollapsed(false);
                        }
                      }}
                      className={cn(
                        "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200",
                        sidebarCollapsed ? "justify-center h-12 w-12 mx-auto" : "gap-3 px-3 py-2.5",
                        active
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                      )}
                      title={
                        sidebarCollapsed ? t(item.label, item.labelVi ?? item.label) : undefined
                      }
                    >
                      {active && !sidebarCollapsed && (
                        <div className="absolute left-0 top-1/2 h-1/2 w-1 -translate-y-1/2 rounded-r-full bg-primary-foreground/30" />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          active
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-primary",
                        )}
                      />
                      {!sidebarCollapsed && (
                        <span>{t(item.label, item.labelVi ?? item.label)}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto border-t border-border/50 p-4 space-y-4">
          {!sidebarCollapsed && (
            <div className="rounded-xl bg-primary/5 p-4 border border-primary/10">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    {t("Customer Support", "Hỗ trợ khách hàng")}
                  </div>
                  <div className="mt-0.5 text-base font-extrabold text-foreground tracking-tight">
                    1900 1234
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground font-medium">
                    {t("8:00 - 20:00 Daily", "8:00 - 20:00 hằng ngày")}
                  </div>
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              logout();
              window.location.assign("/");
            }}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/50 p-3 text-sm font-bold text-foreground transition-all hover:bg-accent hover:text-accent-foreground shadow-sm group",
              sidebarCollapsed ? "px-0" : "px-4",
            )}
            title={t("Sign out", "Đăng xuất")}
          >
            <LogOut className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            {!sidebarCollapsed && <span>{t("Sign out", "Đăng xuất")}</span>}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 flex flex-col relative z-10">
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/90 px-4 py-4 backdrop-blur-xl lg:px-8 transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm overflow-hidden p-0.5">
                <img
                  src="/logo.png"
                  alt="AURA CAR CARE logo"
                  className="h-full w-full rounded-[6px] object-cover"
                />
              </div>
              <div className="hidden lg:block">
                <div className="text-xl font-bold tracking-tight text-foreground">
                  {t(headerTitle, headerTitleVi)}
                </div>
                <div className="text-sm font-medium text-muted-foreground mt-0.5">
                  {t(headerSubtitle, headerSubtitleVi)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <ThemeSwitcher />
                <LanguageSwitcher />
              </div>

              {role === "Customer" && (
                <div className="relative" ref={customerNotificationsRef}>
                  <button
                    type="button"
                    onClick={() => setCustomerNotificationsOpen((open) => !open)}
                    className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                    title={t("Customer notifications", "Th?ng b?o kh?ch h?ng")}
                    aria-label={t("Customer notifications", "Th?ng b?o kh?ch h?ng")}
                    aria-expanded={customerNotificationsOpen}
                  >
                    <Bell className="h-5 w-5" />
                    {customerNotifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff3b30] px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
                        {customerNotifications.length > 9 ? "9+" : customerNotifications.length}
                      </span>
                    )}
                  </button>

                  {customerNotificationsOpen && (
                    <div className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                        <div>
                          <div className="text-sm font-bold text-foreground">
                            {t("Notifications", "Th?ng b?o")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {customerNotifications.length} {t("items", "m?c")}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerNotificationsOpen(false);
                            navigate({ to: "/customer/history" });
                          }}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
                        >
                          {t("View history", "Xem l?ch s?")}
                        </button>
                      </div>

                      {customerNotifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <div className="text-sm font-semibold text-foreground">
                            {t("No notifications yet", "Ch?a c? th?ng b?o")}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t(
                              "Booking updates and refund messages will appear here.",
                              "C?p nh?t l?ch h?n v? ho?n ti?n s? hi?n ? ??y.",
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="max-h-[420px] overflow-y-auto">
                          {customerNotifications.slice(0, 8).map((notification) => (
                            <button
                              key={notification.id}
                              type="button"
                              onClick={() => {
                                setCustomerNotificationsOpen(false);
                                navigate({ to: "/customer/history" });
                              }}
                              className="flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition hover:bg-accent/40 last:border-b-0"
                            >
                              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Bell className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="text-sm font-semibold text-foreground">
                                    {notification.title}
                                  </div>
                                  <div className="shrink-0 text-[11px] text-muted-foreground">
                                    {formatNotificationTime(notification.timestamp)}
                                  </div>
                                </div>
                                <div className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                                  {notification.message}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="h-10 w-px bg-border/60 hidden sm:block" />

              <button
                type="button"
                onClick={() =>
                  navigate({
                    to:
                      role === "Customer"
                        ? "/customer/profile"
                        : `/${role.toLowerCase()}/dashboard`,
                  })
                }
                className="group flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
              >
                <div className="h-10 w-10 overflow-hidden rounded-full border border-border/50 bg-secondary/50 shadow-sm shrink-0">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profileName}&backgroundColor=e2e8f0`}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-bold text-foreground leading-tight">
                    {profileName}
                  </div>
                  <div className="mt-1 inline-flex rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[11px] font-bold text-indigo-600 leading-none">
                    {profileTag}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block transition-transform group-hover:translate-y-0.5 cursor-pointer" />
              </button>
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 relative">
          <Outlet />
        </main>
      </div>
      <SupportChatWidget key={role} role={role} />
    </div>
  );
}
