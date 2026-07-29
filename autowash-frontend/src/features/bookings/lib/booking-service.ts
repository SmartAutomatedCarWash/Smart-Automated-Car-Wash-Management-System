import { apiClient, apiRequest } from "@/shared/lib/api";
import type { ApiPaginatedResponse } from "@/shared/types/api.types";
import type {
  BookingAddon,
  BookingCombo,
  BookingStaffOption,
  BookingStaffOptionsRequest,
  BookingDetail,
  BookingDraft,
  BookingListFilters,
  BookingListItem,
  BookingListPage,
  BookingPackage,
  CustomerCombo,
  CustomerComboDetail,
  CustomerComboPaymentStatus,
  ApplyBookingPointsRequest,
  ApplyBookingPointsResponse,
  CreateBookingResponse,
  VnpayCheckoutResponse,
  VnpayPaymentResultResponse,
  PayBookingResponse,
  PaymentMethod,
  CancelBookingResponse,
  PurchaseCustomerComboRequest,
  PurchaseCustomerComboResponse,
  DiscountValidationRequest,
  DiscountValidationResult,
  WashTrackingSession,
  HoldSlotRequest,
  HoldSlotResponse,
  SlotAvailability,
  ExtraServiceRecommendation,
  UpdateBookingStaffRequest,
} from "@/entities/bookings";
import { buildCreateBookingPayload } from "@/features/bookings/lib/booking-format";
import type { ApiSuccessResponse } from "@/shared/types/api.types";
import type { AdminCatalogService } from "@/entities/management";

export async function listBookingPackages(page = 1, limit = 20): Promise<BookingPackage[]> {
  const response = await apiClient.get<ApiPaginatedResponse<BookingPackage>>("/packages", {
    params: { page, limit },
  });

  return response.data.data;
}

export async function listBookingAddons(): Promise<BookingAddon[]> {
  const response = await apiClient.get<ApiSuccessResponse<AdminCatalogService[]>>("/services");
  return response.data.data
    .filter((service) => service.status === "ACTIVE")
    .map((service) => ({
      addonId: service.serviceId,
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration,
      category: "SERVICE",
      image: null,
      applicableToPackages: [],
      status: service.status,
    }));
}

export async function listCatalogServices(): Promise<AdminCatalogService[]> {
  const response = await apiClient.get<ApiSuccessResponse<AdminCatalogService[]>>("/services");
  return response.data.data.filter((service) => service.status === "ACTIVE");
}

export async function getCatalogService(serviceId: string): Promise<AdminCatalogService> {
  const response = await apiClient.get<ApiSuccessResponse<AdminCatalogService>>(`/services/${serviceId}`);
  return response.data.data;
}

export async function listBookingCombos(): Promise<BookingCombo[]> {
  const response = await apiClient.get("/combos/available");
  return response.data.data as BookingCombo[];
}

export async function listActiveCustomerCombos(): Promise<CustomerCombo[]> {
  const response = await apiClient.get("/customers/combos/active");
  return response.data.data as CustomerCombo[];
}

export async function listCustomerComboHistory(page = 1, limit = 20): Promise<{
  items: CustomerCombo[];
  pagination: ApiPaginatedResponse<never>["pagination"];
}> {
  const response = await apiClient.get<ApiPaginatedResponse<CustomerCombo>>("/customers/combos/history", {
    params: { page, limit },
  });

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getCustomerComboDetail(customerComboId: string): Promise<CustomerComboDetail> {
  const response = await apiClient.get<ApiSuccessResponse<CustomerComboDetail>>(
    `/customers/combos/${encodeURIComponent(customerComboId)}`,
  );
  return response.data.data;
}

export async function getCustomerComboPaymentStatus(transactionRef: string): Promise<CustomerComboPaymentStatus> {
  const response = await apiClient.get(`/customers/combos/payments/${encodeURIComponent(transactionRef)}/status`);
  return response.data.data as CustomerComboPaymentStatus;
}

export function validateBookingDiscount(payload: DiscountValidationRequest) {
  return apiRequest<DiscountValidationResult, DiscountValidationRequest>({
    method: "POST",
    url: "/customers/bookings/validate-voucher",
    data: payload,
  });
}

export function createCustomerBooking(draft: BookingDraft) {
  return apiRequest<CreateBookingResponse, ReturnType<typeof buildCreateBookingPayload>>({
    method: "POST",
    url: "/customers/bookings",
    data: buildCreateBookingPayload(draft),
  });
}

export async function holdBookingSlot(payload: HoldSlotRequest): Promise<HoldSlotResponse> {
  // Backend returns the response directly (not wrapped in ApiSuccessResponse)
  const res = await apiClient.post<HoldSlotResponse>("/slots/hold", payload);
  return res.data;
}

export function releaseBookingSlot(payload: HoldSlotRequest) {
  return apiClient.delete("/slots/hold", { data: payload });
}

export function createVnpayCheckout(bookingId: string) {
  return apiRequest<VnpayCheckoutResponse>({
    method: "POST",
    url: `/payments/bookings/${bookingId}/vnpay/checkout`,
  });
}

export function createComboVnpayCheckout(payload: { transactionRef: string; amount: number }) {
  return apiRequest<VnpayCheckoutResponse, { transactionRef: string; amount: number }>({
    method: "POST",
    url: "/payments/combos/vnpay/checkout",
    data: payload,
  });
}

export function changeBookingPaymentMethod(bookingId: string, paymentMethod: PaymentMethod) {
  return apiRequest<PayBookingResponse, { paymentMethod: PaymentMethod }>({
    method: "POST",
    url: `/customers/bookings/${bookingId}/payment-method`,
    data: { paymentMethod },
  });
}

export function verifyVnpayReturn(params: Record<string, string>) {
  return apiRequest<VnpayPaymentResultResponse>({
    method: "GET",
    url: "/payments/vnpay/return",
    params,
  });
}

export function queryVnpayTransaction(bookingId: string) {
  return apiRequest<VnpayPaymentResultResponse>({
    method: "POST",
    url: `/payments/bookings/${bookingId}/vnpay/query`,
  });
}

export function queryComboVnpayTransaction(txnRef: string) {
  return apiRequest<VnpayPaymentResultResponse, { txnRef: string }>({
    method: "POST",
    url: "/payments/combos/vnpay/query",
    data: { txnRef },
  });
}

export async function listSlotAvailability(bookingDate: string, times: string[]): Promise<SlotAvailability[]> {
  if (!bookingDate || times.length === 0) {
    return [];
  }

  const params = new URLSearchParams({ date: bookingDate });
  times.forEach((time) => params.append("times", time));

  const response = await apiClient.get<ApiSuccessResponse<SlotAvailability[]>>("/slots/availability", {
    params,
  });

  return response.data.data;
}

export async function listExtraServiceRecommendations(comboId: string): Promise<ExtraServiceRecommendation[]> {
  if (!comboId) {
    return [];
  }

  const response = await apiClient.get<ApiSuccessResponse<ExtraServiceRecommendation[]>>(
    "/recommendations/extra-services",
    { params: { comboId } },
  );

  return response.data.data;
}

export function listBookingStaffOptions(payload: BookingStaffOptionsRequest) {
  return apiRequest<BookingStaffOption[], BookingStaffOptionsRequest>({
    method: "POST",
    url: "/customers/bookings/staff-options",
    data: payload,
  });
}

export function updateCustomerBookingStaff(bookingId: string, payload: UpdateBookingStaffRequest) {
  return apiRequest<BookingDetail, UpdateBookingStaffRequest>({
    method: "POST",
    url: `/customers/bookings/${bookingId}/staff`,
    data: payload,
  });
}

export async function purchaseCustomerCombo(payload: PurchaseCustomerComboRequest) {
  return apiRequest<PurchaseCustomerComboResponse, PurchaseCustomerComboRequest>({
    method: "POST",
    url: "/customers/combos/purchase",
    data: payload,
  });
}

export async function listCustomerBookings(filters: BookingListFilters = {}): Promise<BookingListPage> {
  const response = await apiClient.get<ApiPaginatedResponse<BookingListItem>>("/customers/bookings", {
    params: {
      status: filters.status,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    },
  });

  return {
    items: response.data.data,
    pagination: response.data.pagination,
  };
}

export function getCustomerBookingDetail(bookingId: string) {
  return apiRequest<BookingDetail>({
    method: "GET",
    url: `/customers/bookings/${bookingId}`,
  });
}

export function applyBookingPoints(bookingId: string, payload: ApplyBookingPointsRequest) {
  return apiRequest<ApplyBookingPointsResponse, ApplyBookingPointsRequest>({
    method: "POST",
    url: `/bookings/${bookingId}/apply-points`,
    data: payload,
  });
}

export function cancelCustomerBooking(bookingId: string, reason?: string) {
  return apiRequest<CancelBookingResponse, { reason?: string }>({
    method: "POST",
    url: `/customers/bookings/${bookingId}/cancel`,
    data: reason ? { reason } : undefined,
  });
}

export function getActiveWashTracking() {
  return apiRequest<WashTrackingSession | null>({
    method: "GET",
    url: "/customers/wash-tracking/active",
  });
}

export function getWashTrackingDetail(washSessionId: string) {
  return apiRequest<WashTrackingSession>({
    method: "GET",
    url: `/customers/wash-tracking/${washSessionId}`,
  });
}
