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
    descriptionVi: "C\u1ed5ng kh\u00e1ch h\u00e0ng Detailing",
    accent: "bg-cyan-300 text-slate-950 shadow-cyan-300/25",
    accentSoft: "border-cyan-300/30 bg-cyan-50 text-cyan-950",
    activeNav: "bg-[#06111a] text-cyan-100 shadow-[0_16px_34px_rgba(8,145,178,0.18)] ring-1 ring-cyan-300/30",
    mobileActive: "bg-cyan-50 text-cyan-800",
  },
  STAFF: {
    label: "Staff Operations",
    labelVi: "Nghi\u1ec7p v\u1ee5 nh\u00e2n vi\u00ean",
    description: "Assigned wash sessions",
    descriptionVi: "C\u00e1c phi\u00ean r\u1eeda \u0111\u01b0\u1ee3c ph\u00e2n c\u00f4ng",
    accent: "bg-cyan-300 text-slate-950 shadow-cyan-300/25",
    accentSoft: "border-cyan-300/30 bg-cyan-50 text-cyan-950",
    activeNav: "bg-[#06111a] text-cyan-100 shadow-[0_16px_34px_rgba(8,145,178,0.18)] ring-1 ring-cyan-300/30",
    mobileActive: "bg-cyan-50 text-cyan-800",
  },
  MANAGER: {
    label: "Manager Operations",
    labelVi: "\u0110i\u1ec1u ph\u1ed1i v\u1eadn h\u00e0nh",
    description: "Check-in, assignment, and service flow",
    descriptionVi: "Check-in, ph\u00e2n c\u00f4ng v\u00e0 \u0111i\u1ec1u ph\u1ed1i",
    accent: "bg-cyan-300 text-slate-950 shadow-cyan-300/25",
    accentSoft: "border-cyan-300/30 bg-cyan-50 text-cyan-950",
    activeNav: "bg-[#06111a] text-cyan-100 shadow-[0_16px_34px_rgba(8,145,178,0.18)] ring-1 ring-cyan-300/30",
    mobileActive: "bg-cyan-50 text-cyan-800",
  },
  ADMIN: {
    label: "Admin Dashboard",
    labelVi: "B\u1ea3ng qu\u1ea3n tr\u1ecb",
    description: "System control center",
    descriptionVi: "Trung t\u00e2m qu\u1ea3n tr\u1ecb h\u1ec7 th\u1ed1ng",
    accent: "bg-cyan-300 text-slate-950 shadow-cyan-300/25",
    accentSoft: "border-cyan-300/30 bg-cyan-50 text-cyan-950",
    activeNav: "bg-[#06111a] text-cyan-100 shadow-[0_16px_34px_rgba(8,145,178,0.18)] ring-1 ring-cyan-300/30",
    mobileActive: "bg-cyan-50 text-cyan-800",
  },
};

const CUSTOMER_NAV: WorkspaceNavItem[] = [
  { href: "/customer/home", label: "Home", labelVi: "Trang ch\u1ee7", icon: LayoutDashboard, exact: true },
  { href: "/customer/guides", label: "Guides", labelVi: "B\u00e0i vi\u1ebft", icon: BookOpen },
  { href: "/customer/services", label: "Catalog", labelVi: "Danh m\u1ee5c d\u1ecbch v\u1ee5", icon: Wrench },
  { href: "/customer/bookings", label: "Bookings", labelVi: "\u0110\u1eb7t l\u1ecbch", icon: ClipboardList },
  { href: "/customer/history", label: "History", labelVi: "L\u1ecbch s\u1eed", icon: History },
  { href: "/customer/vehicles", label: "Vehicles", labelVi: "Th\u00eam xe", icon: CarFront },
  { href: "/customer/loyalty", label: "Member", labelVi: "Th\u00e0nh vi\u00ean", icon: Gift },
];

const STAFF_NAV: WorkspaceNavItem[] = [
  { href: "/staff/my-sessions", label: "Today's Work", labelVi: "C\u00f4ng vi\u1ec7c h\u00f4m nay", icon: Droplets, exact: true },
  { href: "/staff/sessions/history", label: "History", labelVi: "L\u1ecbch s\u1eed", icon: History },
];

const MANAGER_NAV: WorkspaceNavItem[] = [
  { href: "/manager/operations", label: "Operations", labelVi: "\u0110i\u1ec1u ph\u1ed1i v\u1eadn h\u00e0nh", icon: ClipboardList },
  { href: "/manager/staff", label: "Staff", labelVi: "Qu\u1ea3n l\u00fd nh\u00e2n vi\u00ean", icon: Users },
  { href: "/manager/promotions", label: "Promotions", labelVi: "Khuy\u1ebfn m\u00e3i", icon: Gift },
  { href: "/manager/history", label: "History", labelVi: "L\u1ecbch s\u1eed", icon: History },
  { href: "/manager/reports", label: "Reports", labelVi: "B\u00e1o c\u00e1o v\u1eadn h\u00e0nh", icon: BarChart3 },
  { href: "/manager/settings", label: "Settings", labelVi: "C\u00e0i \u0111\u1eb7t", icon: Settings2 },
];

const ADMIN_NAV: WorkspaceNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", labelVi: "Trang ch\u1ee7", icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: "Bookings", labelVi: "Qu\u1ea3n l\u00fd \u0111\u1eb7t l\u1ecbch", icon: ClipboardList },
  { href: "/admin/accounts", label: "Accounts", labelVi: "T\u00e0i kho\u1ea3n", icon: Users },
  { href: "/admin/services", label: "Service Management", labelVi: "Qu\u1ea3n l\u00fd d\u1ecbch v\u1ee5", icon: Layers3 },
  { href: "/admin/promotions", label: "Promotions", labelVi: "Khuy\u1ebfn m\u00e3i", icon: Gift },
  { href: "/admin/blog", label: "Content & Feedback", labelVi: "N\u1ed9i dung v\u00e0 ph\u1ea3n h\u1ed3i", icon: BookOpen },
  { href: "/admin/operations", label: "Operations", labelVi: "V\u1eadn h\u00e0nh", icon: Wrench },
  { href: "/admin/reports", label: "Reports", labelVi: "B\u00e1o c\u00e1o", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", labelVi: "C\u00e0i \u0111\u1eb7t", icon: Settings2 },
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
