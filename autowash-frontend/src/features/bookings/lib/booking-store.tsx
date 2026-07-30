import {
  useCarwashStore,
  BookingStatus,
  VehicleType,
  WashStatus,
  formatMoney,
} from "@/shared/store/carwash-store";

export type { BookingStatus, WashStatus };

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  plate: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  icon: string;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerTier?: string;
  customerPriorityScore?: number;
  vehiclePlate: string;
  vehicleName: string;
  vehicleType: string;
  services: string[];
  totalPrice: number;
  scheduledAt: string;
  dateISO: string;
  timeSlot: string;
  status: BookingStatus;
  notes?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  reminderMinutesBefore?: number;
  isWalkIn?: boolean;
  checkInAt?: string;
  washStatus?: WashStatus;
  completedAt?: string;
  checkoutTransactionId?: string;
  checkoutAmount?: number;
  checkoutPaymentMethod?: string;
  checkoutPointsEarned?: number;
  checkoutPointsRedeemed?: number;
  checkoutPromoCode?: string;
}

export function useBookings() {
  const store = useCarwashStore();
  const scopedBookings =
    store.role === "Customer"
      ? store.bookings.filter((booking) => booking.customerId === store.currentCustomerId)
      : store.bookings;
  const scopedTransactions =
    store.role === "Customer"
      ? store.transactions.filter(
          (transaction) => transaction.customer.id === store.currentCustomerId,
        )
      : store.transactions;
  return {
    bookings: scopedBookings.map((booking) => ({
      id: booking.id,
      customerId: booking.customerId,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerTier: booking.customerTier,
      customerPriorityScore: booking.customerPriorityScore,
      vehiclePlate: booking.vehiclePlate,
      vehicleName: booking.vehicleName,
      vehicleType: booking.vehicleType,
      services: booking.services,
      totalPrice: booking.totalPrice,
      scheduledAt: booking.scheduledAt,
      dateISO: booking.dateISO,
      timeSlot: booking.timeSlot,
      status: booking.status,
      notes: booking.notes,
      assignedStaffId: booking.assignedStaffId,
      assignedStaffName: booking.assignedStaffName,
      reminderMinutesBefore: booking.reminderMinutesBefore,
      isWalkIn: booking.isWalkIn,
      checkInAt: booking.checkInAt,
      washStatus: booking.washStatus,
      completedAt: booking.completedAt,
      checkoutTransactionId: booking.checkoutTransactionId,
      checkoutAmount: booking.checkoutAmount,
      checkoutPaymentMethod: booking.checkoutPaymentMethod,
      checkoutPointsEarned: booking.checkoutPointsEarned,
      checkoutPointsRedeemed: booking.checkoutPointsRedeemed,
      checkoutPromoCode: booking.checkoutPromoCode,
    })),
    addBooking: store.createBookingFromLegacy,
    updateStatus: store.updateBookingStatus,
    setReminder: store.setBookingReminder,
    selectedBookingId: store.selectedBookingId,
    setSelectedBookingId: store.setSelectedBookingId,
    transactions: scopedTransactions,
  };
}

export function useCurrentVehicles(): Vehicle[] {
  const store = useCarwashStore();
  return (store.vehiclesByCustomer[store.currentCustomerId] ?? []).map((vehicle) => ({
    id: vehicle.id,
    name: vehicle.brandModel,
    type: vehicle.type,
    plate: vehicle.plate,
  }));
}

export function useAvailableServices(): Service[] {
  const store = useCarwashStore();
  return store.services.filter((service) => service.status === "ACTIVE");
}

export const STATUS_STYLES: Record<BookingStatus, string> = {
  Pending: "bg-slate-100 text-slate-700 border-slate-200",
  Confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  "Checked-in": "bg-emerald-100 text-emerald-700 border-emerald-200",
  Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  "No-show": "bg-amber-100 text-amber-700 border-amber-200",
};

export function fmtBookingMoney(value: number) {
  return formatMoney(value);
}
