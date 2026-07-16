export type WashSessionStatus =
  | "PENDING"
  | "QUEUED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type OperationsQueueSummary = {
  total: number;
  pending: number;
  checkedIn: number;
  inProgress: number;
  completed: number;
};

export type OperationsQueueSession = {
  sessionId: string;
  bookingId: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  packageId?: string | null;
  servicePackage?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  status: WashSessionStatus;
  bookingDate: string;
  bookingTime: string;
  estimatedDurationMinutes?: number | null;
  feeAmount?: number | null;
  feeCurrency?: string | null;
  projectedLoyaltyPoints?: number | null;
  awardedLoyaltyPoints?: number | null;
  queuedAt?: string | null;
  checkedInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
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

export type EligibleSessionBooking = {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  packageId: string | null;
  comboId: string | null;
  bookingDate: string;
  bookingTime: string;
  finalAmount: number;
  estimatedDurationMinutes: number;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  customerTier: string | null;
  customerPriorityScore: number;
};

export type CreateWashSessionResponse = {
  sessionId: string;
  status: WashSessionStatus;
  bookingId: string;
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

export type TransferWashSessionResponse = {
  auditId: string;
  sessionId: string;
  bookingId: string;
  fromStaffId: string | null;
  fromStaffName: string | null;
  toStaffId: string;
  toStaffName: string;
  reason: string | null;
  transferredAt: string;
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

