import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  CarFront,
  ClipboardList,
  Droplets,
  Gift,
  History,
  LayoutDashboard,
  Layers3,
  Radar,
  Settings2,
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
    accent: "bg-[#0566D9] text-white shadow-[#0566D9]/20",
    accentSoft: "border-[#0566D9]/20 bg-[#fdf7ff] text-[#0566D9]",
    activeNav: "bg-[#0566D9] text-white shadow-sm shadow-[#0566D9]/20",
    mobileActive: "bg-[#fdf7ff] text-[#0566D9]",
  },
  STAFF: {
    label: "Staff Operations",
    labelVi: "Nghiệp vụ nhân viên",
    description: "Check-in and wash flow",
    descriptionVi: "Duyệt check-in & Quy trình",
    accent: "bg-teal-600 text-white shadow-teal-600/20",
    accentSoft: "border-teal-200 bg-teal-50 text-teal-700",
    activeNav: "bg-teal-600 text-white shadow-sm shadow-teal-600/20",
    mobileActive: "bg-teal-50 text-teal-700",
  },
  ADMIN: {
    label: "Admin Dashboard",
    labelVi: "Bảng quản trị",
    description: "System control center",
    descriptionVi: "Trung tâm quản trị hệ thống",
    accent: "bg-teal-600 text-white shadow-teal-600/20",
    accentSoft: "border-teal-200 bg-teal-50 text-teal-700",
    activeNav: "bg-teal-600 text-white shadow-sm shadow-teal-600/20",
    mobileActive: "bg-teal-50 text-teal-700",
  },
};

const CUSTOMER_NAV: WorkspaceNavItem[] = [
  { href: "/customer/home", label: "Home Feed", labelVi: "Bản tin", icon: LayoutDashboard, exact: true },
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
