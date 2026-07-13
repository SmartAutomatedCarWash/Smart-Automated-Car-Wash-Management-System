type WorkspaceRole = "CUSTOMER" | "STAFF" | "ADMIN";

export type WorkspaceHeaderMeta = {
  title: string;
  subtitle: string;
  workspace: WorkspaceRole;
};

const DEFAULT_SUBTITLE: Record<WorkspaceRole, string> = {
  CUSTOMER: "Manage bookings, vehicles, rewards, and account activity",
  STAFF: "Manage check-ins, wash sessions, and daily operations",
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
      title: "Vehicles",
      subtitle: "Manage registered vehicles and primary vehicle status",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/bookings") || pathname === "/customer/booking",
    meta: {
      title: "History",
      subtitle: "Active bookings, completed sessions and combo purchase history",
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
      title: "Wash History",
      subtitle: "Review past sessions and wash progress",
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
    match: (pathname) => pathname.startsWith("/customer/promotions"),
    meta: {
      title: "Promotions",
      subtitle: "Browse active campaigns and reward offers",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) =>
      pathname.startsWith("/customer/notifications") ||
      pathname.startsWith("/customer/settings") ||
      pathname.startsWith("/customer/combos") ||
      pathname.startsWith("/customer/vouchers"),
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
    match: (pathname) => pathname.startsWith("/staff/operations"),
    meta: {
      title: "Operations Board",
      subtitle: "Move wash sessions through the service lifecycle",
      workspace: "STAFF",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/staff/check-in"),
    meta: {
      title: "Vehicle Check-in",
      subtitle: "Confirm bookings and start the wash flow",
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
      pathname.startsWith("/admin/vouchers"),
    meta: {
      title: "Offers Management",
      subtitle: "Review promotions, vouchers, and redemption oversight",
      workspace: "ADMIN",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/admin/settings"),
    meta: {
      title: "Admin Workspace",
      subtitle: "Configure services, promotions, staff, and workspace settings",
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
  if (pathname.startsWith("/admin")) return "ADMIN";
  return "CUSTOMER";
}
