type WorkspaceRole = "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN";

export type WorkspaceHeaderMeta = {
  title: string;
  subtitle: string;
  titleVi?: string;
  subtitleVi?: string;
  workspace: WorkspaceRole;
};

const DEFAULT_SUBTITLE: Record<WorkspaceRole, string> = {
  CUSTOMER: "Manage bookings, vehicles, rewards, and account activity",
  STAFF: "Manage check-ins, wash sessions, and daily operations",
  MANAGER: "Coordinate check-in, staff management, and wash progress",
  ADMIN: "Monitor system health, customers, services, and operations",
};

const ROUTE_META: Array<{
  match: (pathname: string) => boolean;
  meta: WorkspaceHeaderMeta;
}> = [
  {
    match: (pathname) => pathname === "/customer/home" || pathname === "/customer",
    meta: {
      title: "Customer Home",
      subtitle: "Points, bookings, vehicles, and quick actions",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/profile"),
    meta: {
      title: "Personal Profile",
      subtitle: "Account information and profile preferences",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/vehicles"),
    meta: {
      title: "All vehicles",
      subtitle: "View every saved vehicle and open each full vehicle profile",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/bookings/new"),
    meta: {
      title: "New Booking",
      subtitle: "Create a new booking for your current primary or selected vehicle",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/bookings") || pathname === "/customer/booking",
    meta: {
      title: "Booking Management",
      subtitle: "Review and manage active bookings, combos, and upcoming wash visits",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/wash-tracking"),
    meta: {
      title: "Wash Tracking",
      subtitle: "Track live wash progress and current session status",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/history"),
    meta: {
      title: "History",
      subtitle: "Review booking history, completed washes, and loyalty point activity",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/loyalty"),
    meta: {
      title: "Loyalty & Rewards",
      subtitle: "Track points, tier progress, and redemption options",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/discounts"),
    meta: {
      title: "Discounts",
      subtitle: "Browse available discounts and your discount wallet",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) =>
      pathname.startsWith("/customer/notifications") ||
      pathname.startsWith("/customer/settings") ||
      pathname.startsWith("/customer/combos"),
    meta: {
      title: "Customer Workspace",
      subtitle: "Review customer tools, notifications, and preferences",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname === "/staff/dashboard" || pathname === "/staff",
    meta: {
      title: "Staff Dashboard",
      subtitle: "Arrivals, queue health, and assigned actions",
      workspace: "STAFF",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/staff/my-sessions") || pathname.startsWith("/staff/operations"),
    meta: {
      title: "Today's Work",
      subtitle: "Track and manage your assigned wash sessions for the day",
      workspace: "STAFF",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/staff/sessions/history"),
    meta: {
      title: "Wash Session History",
      subtitle: "Review completed sessions by day, month, or year",
      workspace: "STAFF",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/staff/sessions"),
    meta: {
      title: "Wash Session",
      subtitle: "Inspect session detail, timing, and next action",
      workspace: "STAFF",
    },
  },
  {
    match: (pathname) => pathname === "/manager/dashboard" || pathname === "/manager",
    meta: {
      title: "Operations Queue",
      subtitle: "Check in vehicles and keep every wash session moving",
      titleVi: "Điều phối vận hành",
      subtitleVi: "Theo dõi và điều phối các session theo thời gian thực.",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/manager/profile"),
    meta: {
      title: "Manager Profile",
      subtitle: "Manage account details and review shift responsibilities",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/manager/operations"),
    meta: {
      title: "Operations Queue",
      subtitle: "Check in vehicles and keep every wash session moving",
      titleVi: "Điều phối vận hành",
      subtitleVi: "Theo dõi và điều phối các session theo thời gian thực.",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/manager/staff"),
    meta: {
      title: "Staff Management",
      subtitle: "Manage shifts, KPI, staff availability, and workload",
      titleVi: "Quản lý nhân viên",
      subtitleVi: "Quản lý tài khoản, hiệu suất, booking và trải nghiệm khách hàng.",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/manager/history"),
    meta: {
      title: "Wash Session History",
      subtitle: "Review completed wash sessions across staff and service quality",
      titleVi: "Lịch sử phiên rửa",
      subtitleVi: "Theo dõi các phiên đã hoàn thành theo staff, biển số, thời gian và đánh giá.",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/manager/promotions"),
    meta: {
      title: "Promotion Management",
      subtitle: "Review promotions, vouchers, and active customer offers",
      titleVi: "Quản lý khuyến mãi",
      subtitleVi: "Theo dõi promotions, voucher và ưu đãi đang áp dụng cho khách hàng.",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/manager/reports"),
    meta: {
      title: "Reports",
      subtitle: "Track revenue, booking volume, and staff KPI performance",
      titleVi: "Báo cáo vận hành",
      subtitleVi: "Theo dõi doanh thu, hiệu suất staff, chất lượng dịch vụ và điểm nghẽn vận hành.",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/manager/settings"),
    meta: {
      title: "Settings",
      subtitle: "Configure shifts, staff notifications, and priority vehicle alerts",
      titleVi: "Cài đặt",
      subtitleVi: "Cấu hình ca làm, thông báo staff và quy tắc ưu tiên booking.",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname === "/admin/dashboard" || pathname === "/admin",
    meta: {
      title: "Admin Control Panel",
      subtitle: "KPIs, bookings, customer activity, and operational health",
      workspace: "ADMIN",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/admin/bookings"),
    meta: {
      title: "Booking Management",
      subtitle: "Review booking volume, status, and assignment flow",
      workspace: "ADMIN",
    },
  },
  {
    match: (pathname) =>
      pathname.startsWith("/admin/accounts") ||
      pathname.startsWith("/admin/customers") ||
      pathname.startsWith("/admin/staff"),
    meta: {
      title: "Accounts",
      subtitle: "Customer, staff, and admin account directory",
      workspace: "ADMIN",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/admin/operations"),
    meta: {
      title: "Operations Health",
      subtitle: "Monitor active sessions and service capacity",
      workspace: "ADMIN",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/admin/reports"),
    meta: {
      title: "Reports & Analytics",
      subtitle: "Revenue, service performance, and customer trends",
      workspace: "ADMIN",
    },
  },
  {
    match: (pathname) =>
      pathname.startsWith("/admin/services") ||
      pathname.startsWith("/admin/packages") ||
      pathname.startsWith("/admin/add-ons") ||
      pathname.startsWith("/admin/combos"),
    meta: {
      title: "Service Management",
      subtitle: "Organize packages, add-ons, and combos by service offering",
      workspace: "ADMIN",
    },
  },
  {
    match: (pathname) =>
      pathname.startsWith("/admin/offers") ||
      pathname.startsWith("/admin/promotions") ||
      pathname.startsWith("/admin/discounts") ||
      pathname.startsWith("/admin/tier-voucher-offers"),
    meta: {
      title: "Promotion Management",
      subtitle: "Review promotions, discounts, tier voucher offers, and redemption oversight",
      workspace: "ADMIN",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/admin/blog"),
    meta: {
      title: "Content & Feedback",
      subtitle: "Manage articles, announcements, and customer reviews",
      workspace: "ADMIN",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/admin/settings"),
    meta: {
      title: "Admin Workspace",
      subtitle: "Configure services, discounts, staff, and workspace settings",
      workspace: "ADMIN",
    },
  },
];

export function getWorkspaceHeaderMeta(pathname: string): WorkspaceHeaderMeta {
  const routeMeta = ROUTE_META.find((entry) => entry.match(pathname));
  if (routeMeta) return routeMeta.meta;

  const workspace = resolveWorkspaceFromPath(pathname);
  return {
    title: "Overview",
    subtitle: DEFAULT_SUBTITLE[workspace],
    workspace,
  };
}

function resolveWorkspaceFromPath(pathname: string): WorkspaceRole {
  if (pathname.startsWith("/staff")) return "STAFF";
  if (pathname.startsWith("/manager")) return "MANAGER";
  if (pathname.startsWith("/admin")) return "ADMIN";
  return "CUSTOMER";
}
