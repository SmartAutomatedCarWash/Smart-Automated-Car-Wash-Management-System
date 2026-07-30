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
      titleVi: "Trang ch\u1ee7 kh\u00e1ch h\u00e0ng",
      subtitleVi: "\u0110i\u1ec3m th\u01b0\u1edfng, \u0111\u1eb7t l\u1ecbch, xe v\u00e0 thao t\u00e1c nhanh",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/profile"),
    meta: {
      title: "Personal Profile",
      subtitle: "Account information and profile preferences",
      titleVi: "H\u1ed3 s\u01a1 c\u00e1 nh\u00e2n",
      subtitleVi: "Th\u00f4ng tin t\u00e0i kho\u1ea3n v\u00e0 tu\u1ef3 ch\u1ecdn h\u1ed3 s\u01a1",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/vehicles"),
    meta: {
      title: "All vehicles",
      subtitle: "View every saved vehicle and open each full vehicle profile",
      titleVi: "T\u1ea5t c\u1ea3 xe",
      subtitleVi: "Xem to\u00e0n b\u1ed9 xe \u0111\u00e3 l\u01b0u v\u00e0 m\u1edf chi ti\u1ebft t\u1eebng xe",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/bookings/new"),
    meta: {
      title: "New Booking",
      subtitle: "Create a new booking for your current primary or selected vehicle",
      titleVi: "\u0110\u1eb7t l\u1ecbch m\u1edbi",
      subtitleVi: "T\u1ea1o l\u1ecbch m\u1edbi cho xe ch\u00ednh ho\u1eb7c xe \u0111ang ch\u1ecdn",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/bookings") || pathname === "/customer/booking",
    meta: {
      title: "Booking Management",
      subtitle: "Review and manage active bookings, combos, and upcoming wash visits",
      titleVi: "Qu\u1ea3n l\u00fd \u0111\u1eb7t l\u1ecbch",
      subtitleVi: "Theo d\u00f5i v\u00e0 qu\u1ea3n l\u00fd l\u1ecbch \u0111ang ho\u1ea1t \u0111\u1ed9ng, combo v\u00e0 l\u1ecbch h\u1eb9n s\u1eafp t\u1edbi",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/wash-tracking"),
    meta: {
      title: "Wash Tracking",
      subtitle: "Track live wash progress and current session status",
      titleVi: "Theo d\u00f5i r\u1eeda xe",
      subtitleVi: "Theo d\u00f5i ti\u1ebfn \u0111\u1ed9 r\u1eeda xe v\u00e0 tr\u1ea1ng th\u00e1i phi\u00ean hi\u1ec7n t\u1ea1i",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/history"),
    meta: {
      title: "History",
      subtitle: "",
      titleVi: "L\u1ecbch s\u1eed",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/loyalty"),
    meta: {
      title: "Loyalty & Rewards",
      subtitle: "Track points, tier progress, and redemption options",
      titleVi: "T\u00edch \u0111i\u1ec3m & Ph\u1ea7n th\u01b0\u1edfng",
      subtitleVi: "Theo d\u00f5i \u0111i\u1ec3m, ti\u1ebfn \u0111\u1ed9 h\u1ea1ng v\u00e0 c\u00e1c l\u1ef1a ch\u1ecdn \u0111\u1ed5i th\u01b0\u1edfng",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/support"),
    meta: {
      title: "Customer Support",
      subtitle: "Contact support for bookings, rewards, and account help",
      titleVi: "Ch\u0103m s\u00f3c kh\u00e1ch h\u00e0ng",
      subtitleVi: "Li\u00ean h\u1ec7 h\u1ed7 tr\u1ee3 v\u1ec1 \u0111\u1eb7t l\u1ecbch, ph\u1ea7n th\u01b0\u1edfng v\u00e0 t\u00e0i kho\u1ea3n",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/discounts"),
    meta: {
      title: "Discounts",
      subtitle: "Browse available discounts and your discount wallet",
      titleVi: "Khuy\u1ebfn m\u00e3i",
      subtitleVi: "Xem \u01b0u \u0111\u00e3i kh\u1ea3 d\u1ee5ng v\u00e0 v\u00ed khuy\u1ebfn m\u00e3i c\u1ee7a b\u1ea1n",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/notifications"),
    meta: {
      title: "Notifications",
      subtitle: "Review customer alerts and unread updates",
      titleVi: "Th\u00f4ng b\u00e1o",
      subtitleVi: "Xem c\u1ea3nh b\u00e1o kh\u00e1ch h\u00e0ng v\u00e0 c\u1eadp nh\u1eadt ch\u01b0a \u0111\u1ecdc",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/settings"),
    meta: {
      title: "Settings",
      subtitle: "Manage account preferences and workspace options",
      titleVi: "C\u00e0i \u0111\u1eb7t",
      subtitleVi: "Qu\u1ea3n l\u00fd tu\u1ef3 ch\u1ecdn t\u00e0i kho\u1ea3n v\u00e0 kh\u00f4ng gian l\u00e0m vi\u1ec7c",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/customer/combos"),
    meta: {
      title: "Combos",
      subtitle: "Browse and manage combo offers",
      titleVi: "Combo",
      subtitleVi: "Xem v\u00e0 qu\u1ea3n l\u00fd c\u00e1c g\u00f3i combo \u01b0u \u0111\u00e3i",
      workspace: "CUSTOMER",
    },
  },
  {
    match: (pathname) => pathname === "/staff/dashboard" || pathname === "/staff",
    meta: {
      title: "Staff Dashboard",
      subtitle: "Arrivals, queue health, and assigned actions",
      titleVi: "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n nh\u00e2n vi\u00ean",
      subtitleVi: "L\u01b0\u1ee3t \u0111\u1ebfn, h\u00e0ng \u0111\u1ee3i v\u00e0 c\u00e1c t\u00e1c v\u1ee5 \u0111\u01b0\u1ee3c ph\u00e2n c\u00f4ng",
      workspace: "STAFF",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/staff/my-sessions") || pathname.startsWith("/staff/operations"),
    meta: {
      title: "Today's Work",
      subtitle: "Track and manage your assigned wash sessions for the day",
      titleVi: "C\u00f4ng vi\u1ec7c h\u00f4m nay",
      subtitleVi: "Theo d\u00f5i v\u00e0 qu\u1ea3n l\u00fd c\u00e1c phi\u00ean r\u1eeda \u0111\u01b0\u1ee3c giao trong ng\u00e0y",
      workspace: "STAFF",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/staff/sessions/history"),
    meta: {
      title: "Wash Session History",
      subtitle: "Review completed sessions by day, month, or year",
      titleVi: "L\u1ecbch s\u1eed phi\u00ean r\u1eeda",
      subtitleVi: "Xem l\u1ea1i c\u00e1c phi\u00ean \u0111\u00e3 ho\u00e0n th\u00e0nh theo ng\u00e0y, th\u00e1ng ho\u1eb7c n\u0103m",
      workspace: "STAFF",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/staff/sessions"),
    meta: {
      title: "Wash Session",
      subtitle: "Inspect session detail, timing, and next action",
      titleVi: "Phi\u00ean r\u1eeda xe",
      subtitleVi: "Ki\u1ec3m tra chi ti\u1ebft phi\u00ean, th\u1eddi \u0111i\u1ec3m v\u00e0 h\u00e0nh \u0111\u1ed9ng ti\u1ebfp theo",
      workspace: "STAFF",
    },
  },
  {
    match: (pathname) => pathname === "/manager/dashboard" || pathname === "/manager",
    meta: {
      title: "Operations Queue",
      subtitle: "Check in vehicles and keep every wash session moving",
      titleVi: "\u0110i\u1ec1u ph\u1ed1i v\u1eadn h\u00e0nh",
      subtitleVi: "Theo d\u00f5i v\u00e0 \u0111i\u1ec1u ph\u1ed1i c\u00e1c session theo th\u1eddi gian th\u1ef1c.",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/manager/profile"),
    meta: {
      title: "Manager Profile",
      subtitle: "Manage account details and review shift responsibilities",
      titleVi: "H\u1ed3 s\u01a1 qu\u1ea3n l\u00fd",
      subtitleVi: "Qu\u1ea3n l\u00fd th\u00f4ng tin t\u00e0i kho\u1ea3n v\u00e0 tr\u00e1ch nhi\u1ec7m ca l\u00e0m",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/manager/operations"),
    meta: {
      title: "Operations Queue",
      subtitle: "Check in vehicles and keep every wash session moving",
      titleVi: "\u0110i\u1ec1u ph\u1ed1i v\u1eadn h\u00e0nh",
      subtitleVi: "Theo d\u00f5i v\u00e0 \u0111i\u1ec1u ph\u1ed1i c\u00e1c session theo th\u1eddi gian th\u1ef1c.",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/manager/staff"),
    meta: {
      title: "Staff Management",
      subtitle: "Manage shifts, KPI, staff availability, and workload",
      titleVi: "Qu\u1ea3n l\u00fd nh\u00e2n vi\u00ean",
      subtitleVi: "Qu\u1ea3n l\u00fd t\u00e0i kho\u1ea3n, hi\u1ec7u su\u1ea5t, booking v\u00e0 tr\u1ea3i nghi\u1ec7m kh\u00e1ch h\u00e0ng.",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/manager/history"),
    meta: {
      title: "Wash Session History",
      subtitle: "Review completed wash sessions across staff and service quality",
      titleVi: "L\u1ecbch s\u1eed phi\u00ean r\u1eeda",
      subtitleVi: "Theo d\u00f5i c\u00e1c phi\u00ean \u0111\u00e3 ho\u00e0n th\u00e0nh theo staff, bi\u1ec3n s\u1ed1, th\u1eddi gian v\u00e0 \u0111\u00e1nh gi\u00e1.",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/manager/promotions"),
    meta: {
      title: "Promotion Management",
      subtitle: "Review promotions, vouchers, and active customer offers",
      titleVi: "Qu\u1ea3n l\u00fd khuy\u1ebfn m\u00e3i",
      subtitleVi: "Theo d\u00f5i promotions, voucher v\u00e0 \u01b0u \u0111\u00e3i \u0111ang \u00e1p d\u1ee5ng cho kh\u00e1ch h\u00e0ng.",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/manager/reports"),
    meta: {
      title: "Reports",
      subtitle: "Track revenue, booking volume, and staff KPI performance",
      titleVi: "B\u00e1o c\u00e1o v\u1eadn h\u00e0nh",
      subtitleVi: "Theo d\u00f5i doanh thu, hi\u1ec7u su\u1ea5t staff, ch\u1ea5t l\u01b0\u1ee3ng d\u1ecbch v\u1ee5 v\u00e0 \u0111i\u1ec3m ngh\u1ebdn v\u1eadn h\u00e0nh.",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/manager/settings"),
    meta: {
      title: "Settings",
      subtitle: "Configure shifts, staff notifications, and priority vehicle alerts",
      titleVi: "C\u00e0i \u0111\u1eb7t",
      subtitleVi: "C\u1ea5u h\u00ecnh ca l\u00e0m, th\u00f4ng b\u00e1o staff v\u00e0 quy t\u1eafc \u01b0u ti\u00ean booking.",
      workspace: "MANAGER",
    },
  },
  {
    match: (pathname) => pathname === "/admin/dashboard" || pathname === "/admin",
    meta: {
      title: "Admin Control Panel",
      subtitle: "KPIs, bookings, customer activity, and operational health",
      titleVi: "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n admin",
      subtitleVi: "KPIs, \u0111\u1eb7t l\u1ecbch, ho\u1ea1t \u0111\u1ed9ng kh\u00e1ch h\u00e0ng v\u00e0 s\u1ee9c kho\u1ebb v\u1eadn h\u00e0nh",
      workspace: "ADMIN",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/admin/bookings"),
    meta: {
      title: "Booking Management",
      subtitle: "Review booking volume, status, and assignment flow",
      titleVi: "Qu\u1ea3n l\u00fd \u0111\u1eb7t l\u1ecbch",
      subtitleVi: "Xem kh\u1ed1i l\u01b0\u1ee3ng booking, tr\u1ea1ng th\u00e1i v\u00e0 lu\u1ed3ng ph\u00e2n c\u00f4ng",
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
      titleVi: "T\u00e0i kho\u1ea3n",
      subtitleVi: "Danh b\u1ea1 t\u00e0i kho\u1ea3n kh\u00e1ch h\u00e0ng, nh\u00e2n vi\u00ean v\u00e0 qu\u1ea3n tr\u1ecb",
      workspace: "ADMIN",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/admin/operations"),
    meta: {
      title: "Operations Health",
      subtitle: "Monitor active sessions and service capacity",
      titleVi: "S\u1ee9c kho\u1ebb v\u1eadn h\u00e0nh",
      subtitleVi: "Theo d\u00f5i c\u00e1c session \u0111ang ho\u1ea1t \u0111\u1ed9ng v\u00e0 n\u0103ng l\u1ef1c ph\u1ee5c v\u1ee5",
      workspace: "ADMIN",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/admin/reports"),
    meta: {
      title: "Reports & Analytics",
      subtitle: "Revenue, service performance, and customer trends",
      titleVi: "B\u00e1o c\u00e1o & Ph\u00e2n t\u00edch",
      subtitleVi: "Doanh thu, hi\u1ec7u qu\u1ea3 d\u1ecbch v\u1ee5 v\u00e0 xu h\u01b0\u1edbng kh\u00e1ch h\u00e0ng",
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
      titleVi: "Qu\u1ea3n l\u00fd d\u1ecbch v\u1ee5",
      subtitleVi: "T\u1ed5 ch\u1ee9c packages, add-ons v\u00e0 combos theo nh\u00f3m d\u1ecbch v\u1ee5",
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
      titleVi: "Qu\u1ea3n l\u00fd khuy\u1ebfn m\u00e3i",
      subtitleVi: "Theo d\u00f5i promotions, discounts, \u01b0u \u0111\u00e3i voucher theo h\u1ea1ng v\u00e0 quy tr\u00ecnh \u0111\u1ed5i th\u01b0\u1edfng",
      workspace: "ADMIN",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/admin/blog"),
    meta: {
      title: "Content & Feedback",
      subtitle: "Manage articles, announcements, and customer reviews",
      titleVi: "N\u1ed9i dung & Ph\u1ea3n h\u1ed3i",
      subtitleVi: "Qu\u1ea3n l\u00fd b\u00e0i vi\u1ebft, th\u00f4ng b\u00e1o v\u00e0 \u0111\u00e1nh gi\u00e1 kh\u00e1ch h\u00e0ng",
      workspace: "ADMIN",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/admin/settings"),
    meta: {
      title: "Admin Workspace",
      subtitle: "Configure services, discounts, staff, and workspace settings",
      titleVi: "Kh\u00f4ng gian qu\u1ea3n tr\u1ecb",
      subtitleVi: "C\u1ea5u h\u00ecnh d\u1ecbch v\u1ee5, khuy\u1ebfn m\u00e3i, nh\u00e2n s\u1ef1 v\u00e0 thi\u1ebft l\u1eadp qu\u1ea3n tr\u1ecb",
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
    titleVi: "T\u1ed5ng quan",
    workspace,
  };
}

function resolveWorkspaceFromPath(pathname: string): WorkspaceRole {
  if (pathname.startsWith("/staff")) return "STAFF";
  if (pathname.startsWith("/manager")) return "MANAGER";
  if (pathname.startsWith("/admin")) return "ADMIN";
  return "CUSTOMER";
}
