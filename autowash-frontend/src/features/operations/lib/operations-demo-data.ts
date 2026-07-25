import type {
  CancelWashSessionResponse,
  CheckInWashSessionResponse,
  CompleteWashSessionResponse,
  CreateWashSessionResponse,
  EligibleSessionBooking,
  OperationsQueue,
  OperationsQueueSession,
  StaffOption,
  StartWashSessionResponse,
  WashSessionStatus,
} from "@/entities/operations";

const STAFF: StaffOption[] = [
  { staffId: "demo-staff-minh", staffName: "Minh Tran" },
  { staffId: "demo-staff-linh", staffName: "Linh Pham" },
  { staffId: "demo-staff-khoa", staffName: "Khoa Nguyen" },
];

let eligibleBookings: EligibleSessionBooking[] = [
  {
    bookingId: "demo-booking-001",
    status: "CONFIRMED",
    customerName: "Anh Quang",
    customerPhone: "0901001001",
    vehiclePlate: "51H-888.68",
    packageId: "premium-wash",
    comboId: null,
    bookingDate: "2026-07-18",
    bookingTime: "09:10",
    finalAmount: 220000,
    estimatedDurationMinutes: 35,
    assignedStaffId: "demo-staff-minh",
    assignedStaffName: "Minh Tran",
    customerTier: "GOLD",
    customerPriorityScore: 92,
  },
  {
    bookingId: "demo-booking-002",
    status: "CONFIRMED",
    customerName: "Chi Mai",
    customerPhone: "0902002002",
    vehiclePlate: "30K-245.19",
    packageId: "interior-care",
    comboId: null,
    bookingDate: "2026-07-18",
    bookingTime: "09:25",
    finalAmount: 310000,
    estimatedDurationMinutes: 45,
    assignedStaffId: "demo-staff-khoa",
    assignedStaffName: "Khoa Nguyen",
    customerTier: "SILVER",
    customerPriorityScore: 78,
  },
  {
    bookingId: "demo-booking-003",
    status: "PENDING",
    customerName: "Anh Bao",
    customerPhone: "0903003003",
    vehiclePlate: "59A-707.77",
    packageId: "quick-wash",
    comboId: null,
    bookingDate: "2026-07-18",
    bookingTime: "09:40",
    finalAmount: 120000,
    estimatedDurationMinutes: 25,
    assignedStaffId: null,
    assignedStaffName: null,
    customerTier: null,
    customerPriorityScore: 55,
  },
  {
    bookingId: "demo-booking-019-001",
    status: "CONFIRMED",
    customerName: "Chi Hoa",
    customerPhone: "0904004004",
    vehiclePlate: "51K-111.22",
    packageId: "premium-wash",
    comboId: null,
    bookingDate: "2026-07-19",
    bookingTime: "08:30",
    finalAmount: 220000,
    estimatedDurationMinutes: 35,
    assignedStaffId: "demo-staff-linh",
    assignedStaffName: "Linh Pham",
    customerTier: "GOLD",
    customerPriorityScore: 86,
  },
  {
    bookingId: "demo-booking-020-001",
    status: "PENDING",
    customerName: "Anh Nam",
    customerPhone: "0905005005",
    vehiclePlate: "30F-808.09",
    packageId: "quick-wash",
    comboId: null,
    bookingDate: "2026-07-20",
    bookingTime: "10:15",
    finalAmount: 120000,
    estimatedDurationMinutes: 25,
    assignedStaffId: null,
    assignedStaffName: null,
    customerTier: null,
    customerPriorityScore: 50,
  },
];

let sessions: OperationsQueueSession[] = [
  {
    sessionId: "demo-session-checked-in",
    bookingId: "demo-booking-010",
    customerName: "Anh Huy",
    customerPhone: "0910000010",
    vehiclePlate: "51G-123.45",
    packageId: "premium-wash",
    servicePackage: "Premium Wash",
    assignedStaffId: "demo-staff-minh",
    assignedStaffName: "Minh Tran",
    status: "CHECKED_IN",
    bookingDate: "2026-07-18",
    bookingTime: "08:40",
    estimatedDurationMinutes: 35,
    feeAmount: 220000,
    feeCurrency: "VND",
    projectedLoyaltyPoints: 22,
    queuedAt: "2026-07-18T08:35:00+07:00",
    checkedInAt: "2026-07-18T08:42:00+07:00",
    notes: "Khach yeu cau rua ky mam xe.",
  },
  {
    sessionId: "demo-session-in-progress",
    bookingId: "demo-booking-011",
    customerName: "Chi Ngan",
    customerPhone: "0910000011",
    vehiclePlate: "50E-456.78",
    packageId: "interior-care",
    servicePackage: "Interior Care",
    assignedStaffId: "demo-staff-linh",
    assignedStaffName: "Linh Pham",
    status: "IN_PROGRESS",
    bookingDate: "2026-07-18",
    bookingTime: "08:15",
    estimatedDurationMinutes: 30,
    feeAmount: 310000,
    feeCurrency: "VND",
    projectedLoyaltyPoints: 31,
    checkedInAt: "2026-07-18T08:20:00+07:00",
    startedAt: "2026-07-18T08:24:00+07:00",
    notes: "Co vet ban trong khoang lai.",
  },
  {
    sessionId: "demo-session-delayed",
    bookingId: "demo-booking-012",
    customerName: "Anh Son",
    customerPhone: "0910000012",
    vehiclePlate: "29A-999.12",
    packageId: "quick-wash",
    servicePackage: "Quick Wash",
    assignedStaffId: "demo-staff-khoa",
    assignedStaffName: "Khoa Nguyen",
    status: "IN_PROGRESS",
    bookingDate: "2026-07-18",
    bookingTime: "07:50",
    estimatedDurationMinutes: 20,
    feeAmount: 120000,
    feeCurrency: "VND",
    projectedLoyaltyPoints: 12,
    checkedInAt: "2026-07-18T07:55:00+07:00",
    startedAt: new Date(Date.now() - 42 * 60_000).toISOString(),
    notes: "Xe SUV lon, can uu tien ket thuc som.",
  },
  {
    sessionId: "demo-session-completed-1",
    bookingId: "demo-booking-013",
    customerName: "Chi Thao",
    customerPhone: "0910000013",
    vehiclePlate: "60C-222.33",
    packageId: "premium-wash",
    servicePackage: "Premium Wash",
    assignedStaffId: "demo-staff-minh",
    assignedStaffName: "Minh Tran",
    status: "COMPLETED",
    bookingDate: "2026-07-18",
    bookingTime: "07:20",
    estimatedDurationMinutes: 35,
    feeAmount: 220000,
    feeCurrency: "VND",
    projectedLoyaltyPoints: 22,
    awardedLoyaltyPoints: 22,
    checkedInAt: "2026-07-18T07:22:00+07:00",
    startedAt: "2026-07-18T07:25:00+07:00",
    completedAt: "2026-07-18T07:58:00+07:00",
  },
  {
    sessionId: "demo-session-completed-2",
    bookingId: "demo-booking-014",
    customerName: "Anh Duc",
    customerPhone: "0910000014",
    vehiclePlate: "51F-345.67",
    packageId: "quick-wash",
    servicePackage: "Quick Wash",
    assignedStaffId: "demo-staff-linh",
    assignedStaffName: "Linh Pham",
    status: "COMPLETED",
    bookingDate: "2026-07-18",
    bookingTime: "07:05",
    estimatedDurationMinutes: 25,
    feeAmount: 120000,
    feeCurrency: "VND",
    projectedLoyaltyPoints: 12,
    awardedLoyaltyPoints: 12,
    checkedInAt: "2026-07-18T07:06:00+07:00",
    startedAt: "2026-07-18T07:10:00+07:00",
    completedAt: "2026-07-18T07:32:00+07:00",
  },
  {
    sessionId: "demo-session-0717-completed",
    bookingId: "demo-booking-0717-001",
    customerName: "Chi Lan",
    customerPhone: "0917000001",
    vehiclePlate: "51B-717.17",
    packageId: "premium-wash",
    servicePackage: "Premium Wash",
    assignedStaffId: "demo-staff-minh",
    assignedStaffName: "Minh Tran",
    status: "COMPLETED",
    bookingDate: "2026-07-17",
    bookingTime: "08:00",
    estimatedDurationMinutes: 35,
    feeAmount: 220000,
    feeCurrency: "VND",
    projectedLoyaltyPoints: 22,
    awardedLoyaltyPoints: 22,
    checkedInAt: "2026-07-17T08:02:00+07:00",
    startedAt: "2026-07-17T08:05:00+07:00",
    completedAt: "2026-07-17T08:36:00+07:00",
  },
  {
    sessionId: "demo-session-0717-cancelled",
    bookingId: "demo-booking-0717-002",
    customerName: "Anh Phuc",
    customerPhone: "0917000002",
    vehiclePlate: "29C-171.72",
    packageId: "interior-care",
    servicePackage: "Interior Care",
    assignedStaffId: "demo-staff-khoa",
    assignedStaffName: "Khoa Nguyen",
    status: "CANCELLED",
    bookingDate: "2026-07-17",
    bookingTime: "09:20",
    estimatedDurationMinutes: 45,
    feeAmount: 310000,
    feeCurrency: "VND",
    projectedLoyaltyPoints: 31,
    notes: "Khach doi lich sang ngay khac.",
  },
  {
    sessionId: "demo-session-0719-queued",
    bookingId: "demo-booking-0719-002",
    customerName: "Anh Tuan",
    customerPhone: "0919000002",
    vehiclePlate: "59H-190.02",
    packageId: "quick-wash",
    servicePackage: "Quick Wash",
    assignedStaffId: "demo-staff-khoa",
    assignedStaffName: "Khoa Nguyen",
    status: "QUEUED",
    bookingDate: "2026-07-19",
    bookingTime: "09:15",
    estimatedDurationMinutes: 25,
    feeAmount: 120000,
    feeCurrency: "VND",
    projectedLoyaltyPoints: 12,
    queuedAt: "2026-07-19T09:05:00+07:00",
  },
  {
    sessionId: "demo-session-0719-checked-in",
    bookingId: "demo-booking-0719-003",
    customerName: "Chi Yen",
    customerPhone: "0919000003",
    vehiclePlate: "60A-919.03",
    packageId: "interior-care",
    servicePackage: "Interior Care",
    assignedStaffId: "demo-staff-linh",
    assignedStaffName: "Linh Pham",
    status: "CHECKED_IN",
    bookingDate: "2026-07-19",
    bookingTime: "09:45",
    estimatedDurationMinutes: 45,
    feeAmount: 310000,
    feeCurrency: "VND",
    projectedLoyaltyPoints: 31,
    queuedAt: "2026-07-19T09:30:00+07:00",
    checkedInAt: "2026-07-19T09:40:00+07:00",
    notes: "Kiem tra noi that truoc khi rua.",
  },
  {
    sessionId: "demo-session-0719-progress",
    bookingId: "demo-booking-0719-004",
    customerName: "Anh Kiet",
    customerPhone: "0919000004",
    vehiclePlate: "51L-919.04",
    packageId: "premium-wash",
    servicePackage: "Premium Wash",
    assignedStaffId: "demo-staff-minh",
    assignedStaffName: "Minh Tran",
    status: "IN_PROGRESS",
    bookingDate: "2026-07-19",
    bookingTime: "10:30",
    estimatedDurationMinutes: 35,
    feeAmount: 220000,
    feeCurrency: "VND",
    projectedLoyaltyPoints: 22,
    checkedInAt: "2026-07-19T10:20:00+07:00",
    startedAt: "2026-07-19T10:25:00+07:00",
  },
  {
    sessionId: "demo-session-0720-completed",
    bookingId: "demo-booking-0720-002",
    customerName: "Chi Hanh",
    customerPhone: "0920000002",
    vehiclePlate: "51M-200.02",
    packageId: "quick-wash",
    servicePackage: "Quick Wash",
    assignedStaffId: "demo-staff-linh",
    assignedStaffName: "Linh Pham",
    status: "COMPLETED",
    bookingDate: "2026-07-20",
    bookingTime: "08:10",
    estimatedDurationMinutes: 25,
    feeAmount: 120000,
    feeCurrency: "VND",
    projectedLoyaltyPoints: 12,
    awardedLoyaltyPoints: 12,
    checkedInAt: "2026-07-20T08:12:00+07:00",
    startedAt: "2026-07-20T08:15:00+07:00",
    completedAt: "2026-07-20T08:38:00+07:00",
  },
];

export function isManagerDemoToken(token: string | null) {
  return token === "mock-token-manager" || token === "mock-token-staff" || token === "mock-token-admin";
}

export async function getDemoOperationsQueue(): Promise<OperationsQueue> {
  return buildQueue();
}

export async function getDemoEligibleSessionBookings(): Promise<EligibleSessionBooking[]> {
  return [...eligibleBookings];
}

export async function getDemoActiveStaffOptions(): Promise<StaffOption[]> {
  return [...STAFF];
}

export async function createDemoWashSession(bookingId: string): Promise<CreateWashSessionResponse> {
  const booking = eligibleBookings.find((item) => item.bookingId === bookingId);
  if (!booking) {
    throw new Error("Demo booking not found.");
  }

  eligibleBookings = eligibleBookings.filter((item) => item.bookingId !== bookingId);
  const staff = pickLeastBusyStaff();
  const now = new Date().toISOString();
  const session: OperationsQueueSession = {
    sessionId: `demo-session-${bookingId}`,
    bookingId: booking.bookingId,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    vehiclePlate: booking.vehiclePlate,
    packageId: booking.packageId,
    servicePackage: getServiceName(booking.packageId),
    assignedStaffId: booking.assignedStaffId ?? staff.staffId,
    assignedStaffName: booking.assignedStaffName ?? staff.staffName,
    status: "QUEUED",
    bookingDate: booking.bookingDate,
    bookingTime: booking.bookingTime,
    estimatedDurationMinutes: booking.estimatedDurationMinutes,
    feeAmount: booking.finalAmount,
    feeCurrency: "VND",
    projectedLoyaltyPoints: Math.round(booking.finalAmount / 10000),
    queuedAt: now,
    notes: booking.customerTier ? `Khach ${booking.customerTier}, uu tien tiep nhan.` : null,
  };

  sessions = [session, ...sessions];
  return { sessionId: session.sessionId, status: session.status, bookingId: session.bookingId, createdAt: now };
}

export async function checkInDemoWashSession(sessionId: string): Promise<CheckInWashSessionResponse> {
  const now = new Date().toISOString();
  const session = sessions.find((item) => item.sessionId === sessionId);
  if (!session) {
    throw new Error("Demo session not found.");
  }

  sessions = sessions.map((item) =>
    item.sessionId === sessionId
      ? {
          ...item,
          status: "CHECKED_IN",
          checkedInAt: now,
        }
      : item,
  );

  return {
    sessionId,
    status: "CHECKED_IN",
    checkedInAt: now,
    fee: {
      amount: session.feeAmount ?? 0,
      currency: session.feeCurrency ?? "VND",
    },
    projectedLoyaltyPoints: session.projectedLoyaltyPoints ?? 0,
  };
}

export async function startDemoWashSession(sessionId: string): Promise<StartWashSessionResponse> {
  const now = new Date().toISOString();
  assertDemoSessionExists(sessionId);

  sessions = sessions.map((item) =>
    item.sessionId === sessionId
      ? {
          ...item,
          status: "IN_PROGRESS",
          startedAt: now,
        }
      : item,
  );

  return { sessionId, status: "IN_PROGRESS", startedAt: now };
}

export async function completeDemoWashSession(sessionId: string): Promise<CompleteWashSessionResponse> {
  const now = new Date().toISOString();
  const session = assertDemoSessionExists(sessionId);
  const awardedLoyaltyPoints = session.projectedLoyaltyPoints ?? Math.round((session.feeAmount ?? 0) / 10000);

  sessions = sessions.map((item) =>
    item.sessionId === sessionId
      ? {
          ...item,
          status: "COMPLETED",
          completedAt: now,
          awardedLoyaltyPoints,
        }
      : item,
  );

  return { sessionId, status: "COMPLETED", completedAt: now, awardedLoyaltyPoints };
}

export async function cancelDemoWashSession(sessionId: string, reason: string): Promise<CancelWashSessionResponse> {
  const now = new Date().toISOString();
  const session = assertDemoSessionExists(sessionId);

  sessions = sessions.map((item) =>
    item.sessionId === sessionId
      ? {
          ...item,
          status: "CANCELLED",
          notes: reason,
        }
      : item,
  );

  return {
    sessionId,
    status: "CANCELLED",
    bookingId: session.bookingId,
    bookingStatus: "CANCELLED",
    reason,
    faultType: "CUSTOMER_FAULT",
    cancelledAt: now,
  };
}

function buildQueue(): OperationsQueue {
  const orderedStatuses: WashSessionStatus[] = ["PENDING", "QUEUED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  const columns = orderedStatuses.map((status) => ({
    status,
    label: getStatusLabel(status),
    sessions: sessions.filter((session) => session.status === status),
  }));

  return {
    summary: {
      total: sessions.length,
      pending: sessions.filter((session) => session.status === "PENDING" || session.status === "QUEUED").length,
      checkedIn: sessions.filter((session) => session.status === "CHECKED_IN").length,
      inProgress: sessions.filter((session) => session.status === "IN_PROGRESS").length,
      completed: sessions.filter((session) => session.status === "COMPLETED").length,
    },
    columns,
    generatedAt: new Date().toISOString(),
  };
}

function pickLeastBusyStaff() {
  const activeSessions = sessions.filter((session) => ["CHECKED_IN", "IN_PROGRESS"].includes(session.status));
  return [...STAFF].sort(
    (left, right) =>
      activeSessions.filter((session) => session.assignedStaffId === left.staffId).length -
      activeSessions.filter((session) => session.assignedStaffId === right.staffId).length,
  )[0];
}

function assertDemoSessionExists(sessionId: string) {
  const session = sessions.find((item) => item.sessionId === sessionId);
  if (!session) {
    throw new Error("Demo session not found.");
  }
  return session;
}

function getServiceName(packageId: string | null) {
  const names: Record<string, string> = {
    "premium-wash": "Premium Wash",
    "interior-care": "Interior Care",
    "quick-wash": "Quick Wash",
  };
  return packageId ? names[packageId] ?? "Goi rua xe" : "Goi rua xe";
}

function getStatusLabel(status: WashSessionStatus) {
  const labels: Record<WashSessionStatus, string> = {
    PENDING: "Pending",
    QUEUED: "Queued",
    CHECKED_IN: "Checked in",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return labels[status];
}

export async function transferDemoWashSession(sessionId: string, toStaffId: string, reason?: string): Promise<any> { return { message: 'Session transferred' }; }
