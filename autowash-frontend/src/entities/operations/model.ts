export type WashSessionStatus =
  | "PENDING"
  | "QUEUED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type ManagerReportsDashboardResponse = {
  summary: {
    revenue: number;
    sessions: number;
    avgRating: number;
  };
  charts: {
    revenueByDay: Array<{ date: string; value: number }>;
    sessionsByDay: Array<{ date: string; value: number }>;
  };
};

export type PaginatedResponse<T> = {
  data: T[];
  totalPages: number;
  totalElements: number;
};

export type InterventionResponse = {
  rowId: string;
  severity: "HIGH" | "MEDIUM" | "INFO";
  message: string;
  actionLabel: string;
};

export type OperationsQueueSummary = {
  total: number;
  pending: number;
  checkedIn: number;
  inProgress: number;
  completed: number;
};

export type OperationStaffAssignment = {
  staffId: string;
  staffName: string;
  sortOrder: number;
};

export type OperationsQueueSession = {
  sessionId: string;
  bookingId: string;
  customerName: string;
  customerPhone: string;
  customerTier?: string | null;
  vehiclePlate: string;
  packageId?: string | null;
  servicePackage?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  assignedStaff?: OperationStaffAssignment[];
  status: WashSessionStatus;
  bookingDate: string;
  bookingTime: string;
  estimatedDurationMinutes?: number | null;
  feeAmount?: number | null;
  feeCurrency?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  projectedLoyaltyPoints?: number | null;
  awardedLoyaltyPoints?: number | null;
  queuedAt?: string | null;
  checkedInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  customerNotes?: string | null;
  rating?: number | null;
};

export type OperationsQueueColumn = {
  status: WashSessionStatus;
  label: string;
  sessions: OperationsQueueSession[];
};

export type OperationsQueue = {
  summary: OperationsQueueSummary;
  columns: OperationsQueueColumn[];
  generatedAt: string;
};

export type StaffDashboardSummary = {
  staffId: string;
  staffName: string;
  assignedActiveBookings: number;
  pendingBookings: number;
  activeSessions: number;
  completedSessions: number;
  completedRevenue: number;
  kpiTargetRevenue: number;
  kpiProgressPercent: number;
};

export type StaffOption = {
  staffId: string;
  staffName: string;
};

export type StaffWorkloadItem = {
  staffId: string;
  staffName: string;
  activeCount: number;
  waitingCount: number;
  completedCount: number;
  delayedCount: number;
  openCount: number;
  status: "AVAILABLE" | "BUSY" | "OVERLOADED";
};

export type StaffWorkloadResponse = {
  data: StaffWorkloadItem[];
  totalPages: number;
  totalElements: number;
};

export type EligibleSessionBooking = {
  bookingId: string;
  status?: BookingStatus | null;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  packageId: string | null;
  comboId: string | null;
  bookingDate: string;
  bookingTime: string;
  finalAmount: number;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  estimatedDurationMinutes: number;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  assignedStaff?: OperationStaffAssignment[];
  customerTier: string | null;
  customerPriorityScore: number;
  customerNotes?: string | null;
};

export type ManagerCheckInRecommendationItem = {
  staffId: string;
  staffName: string;
  status: "AVAILABLE" | "BUSY" | "OVERLOADED" | string;
  activeCount: number;
  waitingCount: number;
  delayedCount: number;
  openCount: number;
  weeklyKpiRevenue: number;
  weeklyKpiTarget: number;
  available: boolean;
  reason: string;
  selectable: boolean;
};

export type ManagerCheckInRecommendation = {
  bookingId: string;
  currentStaffId?: string | null;
  currentStaffName?: string | null;
  currentStaffStatus: "AVAILABLE" | "BUSY" | "UNASSIGNED" | string;
  needsReassignment: boolean;
  message: string;
  candidates: ManagerCheckInRecommendationItem[];
};

export type CreateWashSessionResponse = {
  sessionId: string;
  status: WashSessionStatus;
  bookingId: string;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  assignedStaff?: OperationStaffAssignment[];
  createdAt: string;
};

export type QueueWashSessionResponse = {
  sessionId: string;
  status: WashSessionStatus;
  queuedAt: string;
};

export type CheckInWashSessionResponse = {
  sessionId: string;
  status: WashSessionStatus;
  checkedInAt: string;
  fee: {
    amount: number;
    currency: string;
  };
  projectedLoyaltyPoints: number;
};

export type StartWashSessionResponse = {
  sessionId: string;
  status: WashSessionStatus;
  startedAt: string;
};

export type CompleteWashSessionResponse = {
  sessionId: string;
  status: WashSessionStatus;
  completedAt: string;
  awardedLoyaltyPoints: number;
};

export type CancelFaultType = "CUSTOMER_FAULT" | "CARWASH_FAULT";

export type CancelWashSessionResponse = {
  sessionId: string;
  status: WashSessionStatus;
  bookingId: string;
  bookingStatus: string;
  reason: string;
  faultType: CancelFaultType | null;
  cancelledAt: string;
};

export type TransferWashSessionResponse = {
  auditId?: string;
  sessionId: string;
  bookingId: string;
  fromStaffId?: string | null;
  fromStaffName?: string | null;
  toStaffId: string;
  toStaffName?: string | null;
  reason?: string | null;
  transferredAt?: string;
};

// ─── Staff Today (My Sessions) ────────────────────────────────────────────────

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type StaffTodayMetrics = {
  checkedInCount: number;
  inProgressCount: number;
  completedTodayCount: number;
  totalTodayCount: number;
};

export type StaffTodaySessionItem = {
  sessionId: string | null;
  bookingId: string;
  bookingStatus: BookingStatus;
  sessionStatus: WashSessionStatus | null;
  vehiclePlate: string;
  customerName: string;
  customerPhone?: string | null;
  serviceName?: string | null;
  bayCode?: string | null;
  bookingTime: string;
  checkedInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  estimatedDurationMinutes?: number | null;
  elapsedMinutes?: number | null;
  customerNote?: string | null;
  managerNote?: string | null;
  includedServices?: string[];
};

export type StaffTodayResponse = {
  staff: { staffId: string; staffName: string };
  date: string;
  autoRefreshSeconds: number;
  metrics: StaffTodayMetrics;
  waitingToStart: StaffTodaySessionItem[];
  inProgress: StaffTodaySessionItem[];
  todaySchedule: StaffTodaySessionItem[];
};

// ─── Staff Session History (paginated) ───────────────────────────────────────

export type StaffSessionHistoryReview = {
  hasReview: boolean;
  id?: string | null;
  rating?: number | null;
  comment?: string | null;
  beforeImageUrl?: string | null;
  afterImageUrl?: string | null;
  createdAt?: string | null;
};

export type StaffSessionHistoryServiceItem = {
  snapshotName: string;
  quantity: number;
  subtotal: number;
};

export type StaffSessionHistoryItem = {
  sessionId: string;
  bookingId: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  packageId?: string | null;
  servicePackage?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  assignedStaff?: OperationStaffAssignment[];
  status: string;
  bookingDate: string;
  bookingTime: string;
  checkedInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMinutes?: number | null;
  managerNotes?: string | null;
  customerNotes?: string | null;
  review: StaffSessionHistoryReview;
  totalPrice?: number | null;
  services?: StaffSessionHistoryServiceItem[] | null;
};

export type StaffSessionHistorySummary = {
  completedTotal: number;
  completedToday: number;
  averageDurationMinutes?: number | null;
  averageRating?: number | null;
  reviewedCount: number;
  unreviewedCount: number;
};

export type StaffSessionHistoryPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type StaffSessionHistoryResponse = {
  summary: StaffSessionHistorySummary;
  items: StaffSessionHistoryItem[];
  pagination: StaffSessionHistoryPagination;
};

export type StaffSessionHistoryParams = {
  page?: number;
  limit?: number;
  period?: "ALL" | "TODAY" | "7DAYS" | "MONTH";
  date?: string;
  servicePackage?: string;
  rating?: "ALL" | "5" | "4" | "LOW" | "NONE";
  search?: string;
  sort?: "COMPLETED_DESC" | "COMPLETED_ASC" | "DURATION_DESC" | "RATING_ASC";
  staffId?: string;
};

export type AdminSessionHistoryParams = StaffSessionHistoryParams;

export type StartSessionRequest = {
  startedAt: string;
};

export type StartSessionResponse = {
  sessionId: string;
  previousStatus: WashSessionStatus;
  status: WashSessionStatus;
  startedAt: string;
  message: string;
};

export type CompleteSessionRequest = {
  completedAt: string;
  staffNote?: string;
};

export type CompleteSessionResponse = {
  sessionId: string;
  previousStatus: WashSessionStatus;
  status: WashSessionStatus;
  startedAt: string;
  completedAt: string;
  durationMinutes: number;
  message: string;
};

