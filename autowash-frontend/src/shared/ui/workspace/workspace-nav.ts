import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  CarFront,
  ClipboardList,
  Droplets,
  Gift,
  History,
  LayoutDashboard,
  Layers3,
  Settings2,
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
    descriptionVi: "Cong khach hang Detailing",
    accent: "bg-cyan-300 text-slate-950 shadow-cyan-300/25",
    accentSoft: "border-cyan-300/30 bg-cyan-50 text-cyan-950",
    activeNav: "bg-[#06111a] text-cyan-100 shadow-[0_16px_34px_rgba(8,145,178,0.18)] ring-1 ring-cyan-300/30",
    mobileActive: "bg-cyan-50 text-cyan-800",
  },
  STAFF: {
    label: "Staff Operations",
    labelVi: "Nghiệp vụ nhân viên",
    description: "Assigned wash sessions",
    descriptionVi: "Các phiên rửa được phân công",
    accent: "bg-cyan-300 text-slate-950 shadow-cyan-300/25",
    accentSoft: "border-cyan-300/30 bg-cyan-50 text-cyan-950",
    activeNav: "bg-[#06111a] text-cyan-100 shadow-[0_16px_34px_rgba(8,145,178,0.18)] ring-1 ring-cyan-300/30",
    mobileActive: "bg-cyan-50 text-cyan-800",
  },
  MANAGER: {
    label: "Manager Operations",
    labelVi: "Điều phối vận hành",
    description: "Check-in, assignment, and service flow",
    descriptionVi: "Check-in, phân công và điều phối",
    accent: "bg-cyan-300 text-slate-950 shadow-cyan-300/25",
    accentSoft: "border-cyan-300/30 bg-cyan-50 text-cyan-950",
    activeNav: "bg-[#06111a] text-cyan-100 shadow-[0_16px_34px_rgba(8,145,178,0.18)] ring-1 ring-cyan-300/30",
    mobileActive: "bg-cyan-50 text-cyan-800",
  },
  ADMIN: {
    label: "Admin Dashboard",
    labelVi: "Bang quan tri",
    description: "System control center",
    descriptionVi: "Trung tam quan tri he thong",
    accent: "bg-cyan-300 text-slate-950 shadow-cyan-300/25",
    accentSoft: "border-cyan-300/30 bg-cyan-50 text-cyan-950",
    activeNav: "bg-[#06111a] text-cyan-100 shadow-[0_16px_34px_rgba(8,145,178,0.18)] ring-1 ring-cyan-300/30",
    mobileActive: "bg-cyan-50 text-cyan-800",
  },
};

const CUSTOMER_NAV: WorkspaceNavItem[] = [
  { href: "/customer/home", label: "Home Feed", labelVi: "Ban tin", icon: LayoutDashboard, exact: true },
  { href: "/customer/guides", label: "Guides", labelVi: "Bai viet", icon: BookOpen },
  { href: "/customer/services", label: "Catalog", labelVi: "Danh muc dich vu", icon: Wrench },
  { href: "/customer/bookings", label: "Manage Bookings", labelVi: "Quan ly dat lich", icon: ClipboardList },
  { href: "/customer/history", label: "History", labelVi: "Lich su", icon: History },
  { href: "/customer/vehicles", label: "All vehicles", labelVi: "Tat ca xe", icon: CarFront },
  { href: "/customer/loyalty", label: "Member Lounge", labelVi: "Phong cho thanh vien", icon: Gift },
];

const STAFF_NAV: WorkspaceNavItem[] = [
  { href: "/staff/my-sessions", label: "Today's Work", labelVi: "Công việc hôm nay", icon: Droplets, exact: true },
  { href: "/staff/sessions/history", label: "History", labelVi: "Lịch sử", icon: History },
];

const MANAGER_NAV: WorkspaceNavItem[] = [
  { href: "/manager/operations", label: "Operations", labelVi: "Điều phối vận hành", icon: ClipboardList },
  { href: "/manager/staff", label: "Staff", labelVi: "Quản lý nhân viên", icon: Users },
  { href: "/manager/promotions", label: "Promotions", labelVi: "Khuyến mãi", icon: Gift },
  { href: "/manager/history", label: "History", labelVi: "Lịch sử", icon: History },
  { href: "/manager/reports", label: "Reports", labelVi: "Báo cáo vận hành", icon: BarChart3 },
  { href: "/manager/settings", label: "Settings", labelVi: "Cài đặt", icon: Settings2 },
];

const ADMIN_NAV: WorkspaceNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", labelVi: "Trang chu", icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: "Bookings", labelVi: "Quan ly dat lich", icon: ClipboardList },
  { href: "/admin/accounts", label: "Accounts", labelVi: "Tai khoan", icon: Users },
  { href: "/admin/services", label: "Service Management", labelVi: "Quan ly dich vu", icon: Layers3 },
  { href: "/admin/promotions", label: "Promotions", labelVi: "Khuyến mãi", icon: Gift },
  { href: "/admin/blog", label: "Content & Feedback", labelVi: "Noi dung va Phan hoi", icon: BookOpen },
  { href: "/admin/operations", label: "Operations", labelVi: "Van hanh", icon: Wrench },
  { href: "/admin/reports", label: "Reports", labelVi: "Bao cao", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", labelVi: "Cai dat", icon: Settings2 },
];

export const SHELL_EXCLUDED_PATHS = ["/admin/login"];

export function navForRole(role: UserRole): WorkspaceNavItem[] {
  if (role === "STAFF") return STAFF_NAV;
  if (role === "MANAGER") return MANAGER_NAV;
  if (role === "ADMIN") return ADMIN_NAV;
  return CUSTOMER_NAV;
}

export function mobileNavForRole(role: UserRole): WorkspaceNavItem[] {
  if (role === "STAFF") return STAFF_NAV;
  if (role === "MANAGER") return MANAGER_NAV;
  if (role === "ADMIN") {
    return ADMIN_NAV.filter((item) =>
      ["/admin/dashboard", "/admin/bookings", "/admin/accounts", "/admin/operations"].includes(
        item.href,
      ),
    );
  }

  return CUSTOMER_NAV.filter((item) =>
    ["/customer/home", "/customer/bookings", "/customer/history", "/customer/vehicles", "/customer/loyalty"].includes(
      item.href,
    ),
  );
}
