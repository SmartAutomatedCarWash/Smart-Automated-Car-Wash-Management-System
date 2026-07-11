import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CarFront,
  ClipboardList,
  Droplets,
  Gift,
  History,
  LayoutDashboard,
  Layers3,
  Radar,
  Settings2,
  Star,
  Tag,
  Users,
  Wrench,
} from "lucide-react";
import type { UserRole } from "@/entities/auth";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  labelVi?: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type WorkspaceTheme = {
  label: string;
  labelVi?: string;
  description: string;
  descriptionVi?: string;
  accent: string;
  accentSoft: string;
  accentActive?: string;
  activeNav: string;
  mobileActive: string;
};

export const WORKSPACE_THEMES: Record<UserRole, WorkspaceTheme> = {
  CUSTOMER: {
    label: "AURA CAR CARE",
    labelVi: "AURA CAR CARE",
    description: "Detailing Customer Portal",
    descriptionVi: "Cổng khách hàng Detailing",
    accent: "bg-cyan-300 text-slate-950 shadow-cyan-300/25",
    accentSoft: "border-cyan-300/30 bg-cyan-50 text-cyan-950",
    activeNav: "bg-[#06111a] text-cyan-100 shadow-[0_16px_34px_rgba(8,145,178,0.18)] ring-1 ring-cyan-300/30",
    mobileActive: "bg-cyan-50 text-cyan-800",
  },
  STAFF: {
    label: "Staff Operations",
    labelVi: "Nghiệp vụ nhân viên",
    description: "Check-in and wash flow",
    descriptionVi: "Duyệt check-in & Quy trình",
    accent: "bg-cyan-300 text-slate-950 shadow-cyan-300/25",
    accentSoft: "border-cyan-300/30 bg-cyan-50 text-cyan-950",
    activeNav: "bg-[#06111a] text-cyan-100 shadow-[0_16px_34px_rgba(8,145,178,0.18)] ring-1 ring-cyan-300/30",
    mobileActive: "bg-cyan-50 text-cyan-800",
  },
  ADMIN: {
    label: "Admin Dashboard",
    labelVi: "Bảng quản trị",
    description: "System control center",
    descriptionVi: "Trung tâm quản trị hệ thống",
    accent: "bg-cyan-300 text-slate-950 shadow-cyan-300/25",
    accentSoft: "border-cyan-300/30 bg-cyan-50 text-cyan-950",
    activeNav: "bg-[#06111a] text-cyan-100 shadow-[0_16px_34px_rgba(8,145,178,0.18)] ring-1 ring-cyan-300/30",
    mobileActive: "bg-cyan-50 text-cyan-800",
  },
};

const CUSTOMER_NAV: WorkspaceNavItem[] = [
  { href: "/customer/home", label: "Home Feed", labelVi: "Bản tin", icon: LayoutDashboard, exact: true },
  { href: "/customer/guides", label: "Guides", labelVi: "Bài viết", icon: BookOpen },
  { href: "/customer/services", label: "Service Catalog", labelVi: "Danh mục dịch vụ", icon: Wrench },
  { href: "/customer/bookings", label: "Booking Tracker", labelVi: "Theo dõi đơn đặt", icon: ClipboardList },
  { href: "/customer/loyalty", label: "Member Lounge", labelVi: "Phòng chờ thành viên", icon: Gift },
];

const STAFF_NAV: WorkspaceNavItem[] = [
  { href: "/staff/dashboard", label: "Dashboard", labelVi: "Trang chủ", icon: LayoutDashboard, exact: true },
  { href: "/staff/operations", label: "Operations", labelVi: "Vận hành", icon: ClipboardList },
  { href: "/staff/check-in", label: "Check-in", labelVi: "Duyệt check-in", icon: Wrench },
  { href: "/staff/sessions/history", label: "History", labelVi: "Lịch sử", icon: History },
];

const ADMIN_NAV: WorkspaceNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", labelVi: "Trang chủ", icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: "Bookings", labelVi: "Quản lý đặt lịch", icon: ClipboardList },
  { href: "/admin/accounts", label: "Accounts", labelVi: "Tài khoản", icon: Users },
  { href: "/admin/services", label: "Service Management", labelVi: "Quản lý dịch vụ", icon: Layers3 },
  { href: "/admin/offers?tab=promotions", label: "Offers Management", labelVi: "Ưu đãi & Voucher", icon: Gift },
  { href: "/admin/blog", label: "Blog Management", labelVi: "Quản lý Blog", icon: BookOpen },
  { href: "/admin/reviews", label: "Reviews Management", labelVi: "Quản lý Đánh giá", icon: Star },
  { href: "/admin/operations", label: "Operations", labelVi: "Vận hành", icon: Wrench },
  { href: "/admin/reports", label: "Reports", labelVi: "Báo cáo", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", labelVi: "Cài đặt", icon: Settings2 },
];

export const SHELL_EXCLUDED_PATHS = ["/admin/login"];

export function navForRole(role: UserRole): WorkspaceNavItem[] {
  if (role === "STAFF") return STAFF_NAV;
  if (role === "ADMIN") return ADMIN_NAV;
  return CUSTOMER_NAV;
}

export function mobileNavForRole(role: UserRole): WorkspaceNavItem[] {
  if (role === "STAFF") return STAFF_NAV;
  if (role === "ADMIN") {
    return ADMIN_NAV.filter((item) =>
      ["/admin/dashboard", "/admin/bookings", "/admin/accounts", "/admin/operations"].includes(
        item.href,
      ),
    );
  }
  return CUSTOMER_NAV.filter((item) =>
    ["/customer/home", "/customer/services", "/customer/bookings", "/customer/loyalty"].includes(
      item.href,
    ),
  );
}
