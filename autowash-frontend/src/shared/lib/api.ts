import axios, {
  AxiosError,
  AxiosResponse,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosAdapter
} from "axios";
import { clearAuthSession, getAccessToken, getRefreshToken, setAccessToken } from "@/features/auth/store/auth.store";
import { ApiErrorResponse, ApiSuccessResponse } from "@/shared/types/api.types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type RefreshResponse = ApiSuccessResponse<{
  accessToken: string;
  expiresIn: number;
}>;

let refreshPromise: Promise<string | null> | null = null;

const defaultAdapter = axios.defaults.adapter;

function paginatedMock(data: any[], config: any) {
  return {
    data: {
      success: true,
      message: "Mock request successful",
      data,
      pagination: { page: 1, limit: 20, total: data.length }
    },
    status: 200,
    statusText: "OK",
    headers: {},
    config
  } as any;
}

function successMock(data: any, config: any) {
  return {
    data: { success: true, message: "Mock request successful", data },
    status: 200,
    statusText: "OK",
    headers: {},
    config
  } as any;
}

// ─── MOCK DATA CONSTANTS ──────────────────────────────────────────────────────

const MOCK_BLOG_CATEGORIES = [
  { id: "cat1", name: "Chăm sóc xe", slug: "cham-soc-xe", description: null },
  { id: "cat2", name: "Kỹ thuật", slug: "ky-thuat", description: null },
  { id: "cat3", name: "Tin tức", slug: "tin-tuc", description: null }
];

const MOCK_BLOG_ARTICLES = [
  {
    id: "a1",
    category: MOCK_BLOG_CATEGORIES[0],
    authorId: "admin-id-demo",
    authorName: "Admin Demo",
    title: "Bí quyết giữ sơn xe luôn bóng đẹp như mới",
    slug: "bi-quyet-giu-son-xe",
    thumbnailUrl: null,
    excerpt: "Các bước chăm sóc sơn xe đơn giản tại nhà.",
    content: "<p>Sơn xe là lớp bảo vệ quan trọng nhất, giúp xe chống lại tác động của môi trường. Hãy học cách bảo vệ sơn xe đúng cách với các bước đơn giản sau...</p>",
    status: "PUBLISHED",
    viewCount: 1250,
    likeCount: 42,
    commentCount: 8,
    publishedAt: "2026-07-14T08:00:00Z",
    createdAt: "2026-07-14T07:00:00Z",
    updatedAt: "2026-07-14T08:00:00Z"
  },
  {
    id: "a2",
    category: MOCK_BLOG_CATEGORIES[1],
    authorId: "admin-id-demo",
    authorName: "Admin Demo",
    title: "Khi nào nên dọn khoang máy xe ô tô?",
    slug: "don-khoang-may-xe",
    thumbnailUrl: null,
    excerpt: "Thời điểm lý tưởng để vệ sinh động cơ an toàn.",
    content: "<p>Vệ sinh khoang máy định kỳ giúp tản nhiệt tốt hơn và phát hiện rò rỉ sớm. Nên thực hiện mỗi 6 tháng hoặc khi xe bị ngập nước...</p>",
    status: "PUBLISHED",
    viewCount: 890,
    likeCount: 28,
    commentCount: 5,
    publishedAt: "2026-07-13T09:30:00Z",
    createdAt: "2026-07-13T09:00:00Z",
    updatedAt: "2026-07-13T09:30:00Z"
  },
  {
    id: "a3",
    category: MOCK_BLOG_CATEGORIES[2],
    authorId: "admin-id-demo",
    authorName: "Admin Demo",
    title: "AutoWash Pro ra mắt gói VIP Kim Cương",
    slug: "ra-mat-goi-vip",
    thumbnailUrl: null,
    excerpt: "Gói dịch vụ cao cấp nhất từ trước đến nay.",
    content: "<p>Chúng tôi hân hạnh giới thiệu gói VIP Kim Cương mới, bao gồm toàn bộ dịch vụ cao cấp cùng chế độ chăm sóc ưu tiên 24/7...</p>",
    status: "DRAFT",
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    publishedAt: null,
    createdAt: "2026-07-15T06:00:00Z",
    updatedAt: "2026-07-15T06:00:00Z"
  }
];

const MOCK_SERVICES = [
  { serviceId: "s1", name: "Rửa xe tiêu chuẩn", description: "Rửa ngoài sạch sẽ trong 15 phút sử dụng bọt tuyết tiêu chuẩn.", price: 100000, duration: 15, status: "ACTIVE", imageUrls: [] },
  { serviceId: "s2", name: "Rửa xe cao cấp", description: "Rửa ngoài không chạm và hút bụi nội thất kỹ lưỡng.", price: 180000, duration: 30, status: "ACTIVE", imageUrls: [] },
  { serviceId: "s3", name: "Vệ sinh khoang máy", description: "Làm sạch khoang động cơ bằng hơi nước nóng an toàn.", price: 450000, duration: 45, status: "ACTIVE", imageUrls: [] },
  { serviceId: "s4", name: "Đánh bóng sơn xe", description: "Phục hồi sơn mờ, xóa vết xước nhỏ bằng máy đánh bóng chuyên dụng.", price: 350000, duration: 60, status: "ACTIVE", imageUrls: [] }
];

const MOCK_PACKAGES = [
  { packageId: "p1", name: "Gói Chăm Sóc Bạc", description: "Rửa tiêu chuẩn + Hút bụi nội thất", price: 150000, duration: 30, status: "ACTIVE", imageUrls: [] },
  { packageId: "p2", name: "Gói Chăm Sóc Vàng", description: "Rửa cao cấp + Wax bóng sơn + Thơm xe", price: 250000, duration: 60, status: "ACTIVE", imageUrls: [] },
  { packageId: "p3", name: "Gói VIP Kim Cương", description: "Toàn bộ dịch vụ cao cấp + Phủ nano bảo vệ sơn", price: 550000, duration: 90, status: "ACTIVE", imageUrls: [] }
];

const MOCK_COMBOS = [
  { comboId: "c1", name: "Combo Bạc Tháng", description: "8 lần rửa tiêu chuẩn trong tháng", comboPrice: 600000, originalPrice: 800000, status: "ACTIVE", serviceIds: ["s1"] },
  { comboId: "c2", name: "Combo Vàng Tháng", description: "4 lần rửa cao cấp + 2 lần vệ sinh khoang máy", comboPrice: 1200000, originalPrice: 1620000, status: "ACTIVE", serviceIds: ["s2", "s3"] }
];

const MOCK_PROMOTIONS = [
  { promotionId: "pr1", name: "Giảm giá mùa mưa", description: "Giảm 20% cho tất cả các dịch vụ vào ngày mưa", discountRate: 0.2, startDate: "2026-07-01", endDate: "2026-07-31", status: "ACTIVE", targetingMode: "ALL", applicableTiers: [], pointMultiplier: null },
  { promotionId: "pr2", name: "Ưu đãi thành viên Vàng", description: "Nhân đôi điểm thưởng cho hạng Gold", discountRate: 0, startDate: "2026-07-10", endDate: "2026-07-20", status: "ACTIVE", targetingMode: "TIER", applicableTiers: ["GOLD"], pointMultiplier: 2.0 }
];

const MOCK_TIERS = [
  { id: "t1", name: "Silver", minPoints: 0, pointsRequired: 0, discountRate: 0.0, description: "Hạng cơ bản" },
  { id: "t2", name: "Gold", minPoints: 500, pointsRequired: 500, discountRate: 0.1, description: "Giảm 10% tất cả dịch vụ" },
  { id: "t3", name: "Diamond", minPoints: 1000, pointsRequired: 1000, discountRate: 0.15, description: "Giảm 15% + ưu tiên đặt lịch" }
];

const MOCK_VOUCHERS = [
  { id: "v1", code: "WELCOME50", discountAmount: 50000, description: "Chào mừng thành viên mới", expiresAt: "2026-12-31", status: "ACTIVE", usageCount: 23, maxUsage: 100 },
  { id: "v2", code: "SUMMER100", discountAmount: 100000, description: "Khuyến mãi hè 2026", expiresAt: "2026-08-31", status: "ACTIVE", usageCount: 8, maxUsage: 50 }
];

const MOCK_ACCOUNTS = [
  { userId: "customer-id-demo", fullName: "Nguyen Thi Lan", phone: "0123456787", email: "customer@demo.com", role: "CUSTOMER", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z" },
  { userId: "customer-id-002", fullName: "Tran Van Binh", phone: "0987654321", email: "vanan@example.com", role: "CUSTOMER", status: "ACTIVE", createdAt: "2026-02-15T00:00:00Z" },
  { userId: "customer-id-003", fullName: "Le Thi Hoa", phone: "0901234555", email: "lethihoa@example.com", role: "CUSTOMER", status: "ACTIVE", createdAt: "2026-03-10T00:00:00Z" },
  { userId: "staff-id-demo", fullName: "Nguyen Van Hung", phone: "0123456788", email: "staff@demo.com", role: "STAFF", status: "ACTIVE", createdAt: "2026-01-15T00:00:00Z" },
  { userId: "staff-id-002", fullName: "Tran Thi Mai", phone: "0123456786", email: "staff2@demo.com", role: "STAFF", status: "ACTIVE", createdAt: "2026-02-01T00:00:00Z" }
];

const MOCK_BOOKINGS_ADMIN = [
  { bookingId: "b1", customerName: "Nguyen Thi Lan", vehiclePlate: "51G-123.45", packageName: "Rửa xe cao cấp", price: 180000, bookingTime: "2026-07-15T09:00:00Z", status: "CONFIRMED" },
  { bookingId: "b2", customerName: "Tran Van Binh", vehiclePlate: "51B-999.88", packageName: "Vệ sinh khoang máy", price: 450000, bookingTime: "2026-07-15T11:00:00Z", status: "COMPLETED" },
  { bookingId: "b3", customerName: "Nguyen Thi Lan", vehiclePlate: "51K-678.90", packageName: "Rửa xe tiêu chuẩn", price: 100000, bookingTime: "2026-07-16T08:00:00Z", status: "PENDING" },
  { bookingId: "b4", customerName: "Le Thi Hoa", vehiclePlate: "51A-555.66", packageName: "Gói VIP Kim Cương", price: 550000, bookingTime: "2026-07-16T14:00:00Z", status: "CONFIRMED" }
];

// ─── MOCK ADAPTER ─────────────────────────────────────────────────────────────

const mockAdapter: AxiosAdapter = async (config) => {
  const url = config.url || "";
  const method = (config.method || "GET").toUpperCase();

  // Only active in development; set NEXT_PUBLIC_USE_MOCK=false to disable
  if (process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_USE_MOCK === "false") {
    if (defaultAdapter) return defaultAdapter(config);
    throw new Error("No default adapter available");
  }

  await new Promise((r) => setTimeout(r, 150));

  // ── AUTH ──────────────────────────────────────────────────────────────────
  if (url.includes("/auth/logout")) {
    return successMock(null, config);
  }
  if (url.includes("/auth/otp/send")) {
    return successMock({ sessionId: "otp-session-mock" }, config);
  }
  if (url.includes("/auth/otp/verify")) {
    return successMock({ accessToken: "mock-token-verified", expiresIn: 86400 }, config);
  }
  if (url.includes("/auth/forgot-password/request")) {
    return successMock({ sessionId: "fp-session-mock" }, config);
  }
  if (url.includes("/auth/forgot-password/verify") || url.includes("/auth/forgot-password/reset")) {
    return successMock(null, config);
  }

  // ── USER PROFILE ─────────────────────────────────────────────────────────
  if (url.includes("/users/profile/avatar/upload-url")) {
    return successMock({ uploadUrl: "http://localhost:8080/api/v1/uploads/mock-avatar", publicUrl: "https://ui-avatars.com/api/?name=Customer+Demo&background=0ea5e9&color=fff" }, config);
  }
  if (url.includes("/users/profile/avatar")) {
    return successMock({ avatarUrl: "https://ui-avatars.com/api/?name=Customer+Demo&background=0ea5e9&color=fff" }, config);
  }
  if (url.includes("/users/profile")) {
    if (method === "PUT") return successMock({ fullName: "Nguyen Thi Lan", phone: "0123456787" }, config);
    return successMock({ userId: "customer-id-demo", fullName: "Nguyen Thi Lan", phone: "0123456787", email: "customer@demo.com", avatarUrl: null, role: "CUSTOMER", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z" }, config);
  }
  if (url.includes("/users/preferences")) {
    return successMock({ language: "vi", notifications: true, theme: "dark" }, config);
  }

  // ── LOYALTY ───────────────────────────────────────────────────────────────
  if (url.includes("/loyalty/account")) {
    return successMock({ customerId: "customer-id-demo", tier: "GOLD", currentPoints: 850, totalEarnedPoints: 1200, completedWashCount: 15 }, config);
  }
  if (url.includes("/loyalty/transactions")) {
    return paginatedMock([
      { transactionId: "lh1", type: "EARN", points: 150, description: "Rửa xe Ceramic cao cấp", createdAt: "2026-07-10T10:00:00Z" },
      { transactionId: "lh2", type: "REDEEM", points: -100, description: "Đổi Voucher giảm giá 50k", createdAt: "2026-07-12T14:30:00Z" },
      { transactionId: "lh3", type: "EARN", points: 80, description: "Rửa xe tiêu chuẩn", createdAt: "2026-07-08T14:00:00Z" }
    ], config);
  }
  if (url.includes("/loyalty/redeem")) {
    return successMock({ voucherCode: "REDEEM-MOCK-001", discountAmount: 50000, expiresAt: "2026-08-14T00:00:00Z" }, config);
  }
  if (url.includes("/public/loyalty/offers")) {
    return successMock([
      { id: "o1", title: "Voucher Giảm 50k", minTier: "SILVER", pointsCost: 100, voucherValue: 50000, accent: "sky", badge: "Hot" },
      { id: "o2", title: "Voucher Giảm 100k", minTier: "GOLD", pointsCost: 180, voucherValue: 100000, accent: "amber", badge: "Best Value" },
      { id: "o3", title: "Rửa Miễn Phí 1 Lần", minTier: "DIAMOND", pointsCost: 300, voucherValue: 180000, accent: "emerald", badge: "VIP" }
    ], config);
  }

  // ── TIERS ─────────────────────────────────────────────────────────────────
  if (url.includes("/admin/tiers")) {
    if (method === "PUT" || method === "POST") return successMock(MOCK_TIERS[1], config);
    return successMock(MOCK_TIERS, config);
  }
  if (url.includes("/tiers")) {
    return successMock(MOCK_TIERS, config);
  }

  // ── VEHICLES ─────────────────────────────────────────────────────────────
  if (url.match(/\/customers\/vehicles\/[\w-]+\/set-primary/)) {
    return successMock({ vehicleId: "v1", isPrimary: true }, config);
  }
  if (url.match(/\/customers\/vehicles\/[\w-]+/)) {
    if (method === "DELETE") return successMock(null, config);
    if (method === "PUT") return successMock({ id: "v1", brandModel: "Toyota Vios", plate: "51G-123.45", type: "Sedan" }, config);
    return successMock({ id: "v1", brandModel: "Toyota Vios", plate: "51G-123.45", type: "Sedan" }, config);
  }
  if (url.includes("/customers/vehicles")) {
    if (method === "POST") return successMock({ id: "v3", brandModel: "Mazda 3", plate: "51B-111.22", type: "Sedan" }, config);
    return paginatedMock([
      { id: "v1", brandModel: "Toyota Vios", plate: "51G-123.45", type: "Sedan", isPrimary: true },
      { id: "v2", brandModel: "Honda CR-V", plate: "51K-678.90", type: "SUV", isPrimary: false }
    ], config);
  }

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  if (url.includes("/customers/notifications")) {
    return successMock([
      { id: "n1", title: "Đặt lịch thành công", content: "Lịch rửa xe của bạn đã được xác nhận vào 10:30 ngày mai.", createdAt: "2026-07-14T12:00:00Z", isRead: false },
      { id: "n2", title: "Ưu đãi đặc biệt", content: "Giảm 20% cho tất cả dịch vụ cuối tuần này!", createdAt: "2026-07-13T09:00:00Z", isRead: true },
      { id: "n3", title: "Xe đã hoàn thành rửa", content: "Xe Honda CR-V 51K-678.90 đã sẵn sàng để nhận.", createdAt: "2026-07-12T15:30:00Z", isRead: true }
    ], config);
  }

  // ── WASH HISTORY ─────────────────────────────────────────────────────────
  if (url.includes("/customers/wash-history")) {
    return paginatedMock([
      { sessionId: "sess1", bookingId: "b1", vehiclePlate: "51G-123.45", packageName: "Rửa xe cao cấp", bookingDate: "2026-07-10", bookingTime: "10:00", finalAmount: 180000, awardedPoints: 150, status: "COMPLETED", completedAt: "2026-07-10T10:30:00Z" },
      { sessionId: "sess2", bookingId: "b0", vehiclePlate: "51K-678.90", packageName: "Rửa xe tiêu chuẩn", bookingDate: "2026-07-08", bookingTime: "14:00", finalAmount: 100000, awardedPoints: 80, status: "COMPLETED", completedAt: "2026-07-08T14:25:00Z" }
    ], config);
  }

  // ── WASH TRACKING ─────────────────────────────────────────────────────────
  if (url.includes("/customers/wash-tracking/active")) {
    return successMock({
      sessionId: "ws1", bookingId: "b2", vehiclePlate: "51K-678.90", vehicleModel: "Honda CR-V",
      packageName: "Vệ sinh khoang máy", status: "WASHING",
      stepName: "Phun bọt hoạt tính không chạm", progressPercent: 55,
      estimatedMinutesLeft: 10, startedAt: "2026-07-14T19:00:00Z"
    }, config);
  }
  if (url.match(/\/customers\/wash-tracking\/[\w-]+/)) {
    return successMock({ sessionId: "ws1", bookingId: "b2", vehiclePlate: "51K-678.90", status: "COMPLETED", progressPercent: 100, completedAt: "2026-07-14T19:30:00Z" }, config);
  }

  // ── BOOKINGS (CUSTOMER) ───────────────────────────────────────────────────
  if (url.includes("/customers/bookings/validate-voucher")) {
    return successMock({ voucherCode: "WELCOME50", discountAmount: 50000, isValid: true }, config);
  }
  if (url.match(/\/customers\/bookings\/[\w-]+\/cancel/)) {
    return successMock({ bookingId: "b1", status: "CANCELLED" }, config);
  }
  if (url.match(/\/customers\/bookings\/[\w-]+/)) {
    return successMock({ id: "b1", vehicle: { id: "v1", brandModel: "Toyota Vios", plate: "51G-123.45" }, packageName: "Rửa xe cao cấp", price: 180000, bookingTime: "2026-07-15T09:00:00Z", status: "CONFIRMED", notes: "" }, config);
  }
  if (url.includes("/customers/bookings")) {
    if (method === "POST") return successMock({ bookingId: "b-new-001", status: "CONFIRMED", bookingTime: "2026-07-20T09:00:00Z" }, config);
    return paginatedMock([
      { id: "b1", vehicle: { brandModel: "Toyota Vios", plate: "51G-123.45" }, packageName: "Rửa xe cao cấp", comboName: null, price: 180000, bookingTime: "2026-07-15T09:00:00Z", status: "CONFIRMED" },
      { id: "b2", vehicle: { brandModel: "Honda CR-V", plate: "51K-678.90" }, packageName: "Vệ sinh khoang máy", comboName: null, price: 450000, bookingTime: "2026-07-16T10:30:00Z", status: "PENDING" },
      { id: "b3", vehicle: { brandModel: "Toyota Vios", plate: "51G-123.45" }, packageName: "Gói Chăm Sóc Bạc", comboName: null, price: 150000, bookingTime: "2026-07-10T08:00:00Z", status: "COMPLETED" }
    ], config);
  }

  // ── COMBOS (CUSTOMER) ─────────────────────────────────────────────────────
  if (url.includes("/customers/combos/active")) {
    return successMock([
      { customerComboId: "cc1", comboId: "c1", comboName: "Combo Bạc Tháng", remainingUses: 3, expiresAt: "2026-07-31T23:59:59Z" }
    ], config);
  }
  if (url.match(/\/customers\/combos\/[\w-]+\/(activate|purchase)/)) {
    return successMock({ customerComboId: "cc-new-001", comboName: "Combo Vàng Tháng", remainingUses: 4, expiresAt: "2026-08-31T23:59:59Z" }, config);
  }

  // ── VOUCHERS (CUSTOMER CLAIM) ─────────────────────────────────────────────
  if (url.match(/\/vouchers\/[\w-]+\/claim/)) {
    return successMock({ voucherCode: "VC-" + Math.random().toString(36).slice(2, 8).toUpperCase(), discountAmount: 50000, expiresAt: "2026-08-14T00:00:00Z" }, config);
  }

  // ── SLOTS ─────────────────────────────────────────────────────────────────
  if (url.includes("/slots/hold")) {
    if (method === "DELETE") return successMock(null, config);
    return { data: { slotId: "slot-mock-001", heldUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString() }, status: 200, statusText: "OK", headers: {}, config } as any;
  }

  // ── POINTS APPLY ─────────────────────────────────────────────────────────
  if (url.match(/\/bookings\/[\w-]+\/apply-points/)) {
    return successMock({ discountAmount: 50000, pointsUsed: 100 }, config);
  }

  // ── PROMOTIONS (PUBLIC) ───────────────────────────────────────────────────
  if (url.includes("/promotions") && !url.includes("/admin/")) {
    return paginatedMock(MOCK_PROMOTIONS, config);
  }

  // ── SERVICES (PUBLIC) ─────────────────────────────────────────────────────
  if (url.includes("/services") && !url.includes("/admin/")) {
    return successMock(MOCK_SERVICES.filter(s => s.status === "ACTIVE"), config);
  }

  // ── PACKAGES (PUBLIC) ─────────────────────────────────────────────────────
  if (url.includes("/packages") && !url.includes("/admin/")) {
    return paginatedMock(MOCK_PACKAGES, config);
  }

  // ── COMBOS (PUBLIC) ───────────────────────────────────────────────────────
  if (url.includes("/combos/available")) {
    return successMock(MOCK_COMBOS, config);
  }
  if (url.includes("/combos") && !url.includes("/admin/") && !url.includes("/customers/")) {
    return successMock(MOCK_COMBOS, config);
  }

  // ── BLOG (PUBLIC) ─────────────────────────────────────────────────────────
  if (url.includes("/blog/categories") && !url.includes("/admin/")) {
    return successMock(MOCK_BLOG_CATEGORIES, config);
  }
  if (url.includes("/blog/articles") && url.includes("/comments") && method === "GET") {
    return successMock({ content: [{ commentId: "c1", articleId: "a1", authorName: "Khách hàng A", authorAvatarUrl: null, content: "Bài viết rất hữu ích!", createdAt: "2026-07-13T10:00:00Z" }], totalElements: 1, totalPages: 1, number: 0 }, config);
  }
  if (url.includes("/blog/articles") && url.includes("/comments") && method === "POST") {
    return successMock({ commentId: "c-new-001", content: "Bình luận mới", createdAt: new Date().toISOString() }, config);
  }
  if (url.includes("/blog/articles") && url.includes("/likes")) {
    return successMock({ articleId: "a1", totalLikes: 42, hasLiked: false }, config);
  }
  if (url.includes("/blog/articles") && url.includes("/like")) {
    return successMock({ articleId: "a1", totalLikes: 43, hasLiked: true }, config);
  }
  const articleSlugMatch = url.match(/\/blog\/articles\/([^/?]+)/) ;
  if (articleSlugMatch && !url.includes("/admin/") && !url.includes("/comments") && !url.includes("/like")) {
    const found = MOCK_BLOG_ARTICLES.find(a => a.slug === articleSlugMatch[1] || a.id === articleSlugMatch[1]);
    return successMock(found ?? MOCK_BLOG_ARTICLES[0], config);
  }
  if (url.includes("/blog/articles") && !url.includes("/admin/")) {
    return successMock(MOCK_BLOG_ARTICLES.filter(a => a.status === "PUBLISHED"), config);
  }

  // ── ANNOUNCEMENTS (PUBLIC) ────────────────────────────────────────────────
  if (url.includes("/admin/announcements")) {
    return successMock([], config);
  }

  // ── REVIEWS ───────────────────────────────────────────────────────────────
  if (url.includes("/reviews")) {
    if (method === "POST") return successMock({ reviewId: "rev-001", rating: 5 }, config);
    return successMock([], config);
  }
  if (url.includes("/uploads/review-images")) {
    return successMock({ imageUrl: "https://via.placeholder.com/400x300" }, config);
  }

  // ─── OPERATIONS (STAFF) ───────────────────────────────────────────────────
  if (url.includes("/operations/queue")) {
    return successMock({
      pendingCount: 3, inProgressCount: 2,
      items: [
        { sessionId: "op1", bookingId: "b1", vehiclePlate: "51G-123.45", customerName: "Nguyen Thi Lan", packageName: "Rửa xe tiêu chuẩn", status: "PENDING", assignedStaffName: null, checkedInAt: "2026-07-14T19:00:00Z" },
        { sessionId: "op2", bookingId: "b2", vehiclePlate: "51K-678.90", customerName: "Tran Van Binh", packageName: "Rửa xe cao cấp", status: "WASHING", assignedStaffName: "Nguyen Van Hung", checkedInAt: "2026-07-14T18:30:00Z" },
        { sessionId: "op3", bookingId: "b4", vehiclePlate: "51A-555.66", customerName: "Le Thi Hoa", packageName: "Gói VIP Kim Cương", status: "QUEUED", assignedStaffName: null, checkedInAt: "2026-07-14T19:15:00Z" }
      ]
    }, config);
  }
  if (url.includes("/operations/staff/summary")) {
    return successMock({ completedCount: 8, pendingCount: 3, workingHours: 6.5, earnedToday: 1440000 }, config);
  }
  if (url.includes("/operations/staff/active")) {
    return successMock([
      { staffId: "staff-id-demo", fullName: "Nguyen Van Hung", currentSessionId: "op2" },
      { staffId: "staff-id-002", fullName: "Tran Thi Mai", currentSessionId: null }
    ], config);
  }
  if (url.includes("/operations/bookings/eligible-sessions")) {
    return successMock([
      { bookingId: "b1", vehiclePlate: "51G-123.45", customerName: "Nguyen Thi Lan", packageName: "Rửa xe tiêu chuẩn", bookingTime: "2026-07-14T19:30:00Z" },
      { bookingId: "b3", vehiclePlate: "51K-678.90", customerName: "Le Thi Hoa", packageName: "Vệ sinh khoang máy", bookingTime: "2026-07-14T20:00:00Z" }
    ], config);
  }
  if (url.match(/\/operations\/sessions\/[\w-]+\/(queue|check-in|start|complete|transfer)/)) {
    const action = url.split("/").pop();
    const statusMap: Record<string, string> = { queue: "QUEUED", "check-in": "CHECKED_IN", start: "WASHING", complete: "COMPLETED", transfer: "TRANSFERRED" };
    return successMock({ sessionId: "op1", status: statusMap[action ?? ""] ?? "UPDATED", updatedAt: new Date().toISOString() }, config);
  }
  if (url.includes("/operations/sessions")) {
    if (method === "POST") return successMock({ sessionId: "op-new-001", bookingId: "b1", status: "CREATED", createdAt: new Date().toISOString() }, config);
  }

  // ── ADMIN: BLOG ──────────────────────────────────────────────────────────
  if (url.includes("/admin/blog/categories")) {
    if (method === "POST") return successMock({ id: "cat-new-001", name: "Danh mục mới", slug: "danh-muc-moi", description: null }, config);
    if (method === "PUT") return successMock(MOCK_BLOG_CATEGORIES[0], config);
    if (method === "DELETE") return successMock(null, config);
    return successMock(MOCK_BLOG_CATEGORIES, config);
  }
  if (url.match(/\/admin\/blog\/articles\/[\w-]+/)) {
    if (method === "PUT") return successMock({ ...MOCK_BLOG_ARTICLES[0], updatedAt: new Date().toISOString() }, config);
    if (method === "DELETE") return successMock(null, config);
    return successMock(MOCK_BLOG_ARTICLES[0], config);
  }
  if (url.includes("/admin/blog/articles")) {
    if (method === "POST") return successMock({ ...MOCK_BLOG_ARTICLES[0], id: "a-new-001", status: "DRAFT" }, config);
    return successMock(MOCK_BLOG_ARTICLES, config);
  }
  if (url.includes("/admin/blog/comments")) {
    if (method === "DELETE") return successMock(null, config);
  }

  // ── ADMIN: SERVICES / PACKAGES / COMBOS ──────────────────────────────────
  if (url.includes("/admin/services")) {
    if (method === "POST") return successMock({ ...MOCK_SERVICES[0], serviceId: "s-new-001" }, config);
    if (method === "PUT" || method === "DELETE") return successMock(MOCK_SERVICES[0], config);
    return successMock(MOCK_SERVICES, config);
  }
  if (url.includes("/admin/packages")) {
    if (method === "POST") return successMock({ ...MOCK_PACKAGES[0], packageId: "p-new-001" }, config);
    if (method === "PUT" || method === "DELETE") return successMock(MOCK_PACKAGES[0], config);
    return successMock(MOCK_PACKAGES, config);
  }
  if (url.includes("/admin/combos")) {
    if (method === "POST") return successMock({ ...MOCK_COMBOS[0], comboId: "c-new-001" }, config);
    if (method === "PUT" || method === "DELETE") return successMock(MOCK_COMBOS[0], config);
    return successMock(MOCK_COMBOS, config);
  }

  // ── ADMIN: UPLOADS ────────────────────────────────────────────────────────
  if (url.includes("/admin/uploads/images") || url.includes("/uploads")) {
    return successMock({ imageUrl: "https://ui-avatars.com/api/?name=Image&background=0ea5e9&color=fff&size=400" }, config);
  }

  // ── ADMIN: VOUCHERS ───────────────────────────────────────────────────────
  if (url.includes("/admin/vouchers")) {
    if (method === "POST") return successMock({ id: "v-new-001", code: "NEWVOUCHER", discountAmount: 100000 }, config);
    if (method === "PUT" || method === "DELETE") return successMock(MOCK_VOUCHERS[0], config);
    return successMock(MOCK_VOUCHERS, config);
  }

  // ── ADMIN: PROMOTIONS ─────────────────────────────────────────────────────
  if (url.includes("/admin/promotions")) {
    if (method === "POST") return successMock({ promotionId: "pr-new-001", name: "Khuyến mãi mới", status: "ACTIVE" }, config);
    if (method === "PUT" || method === "DELETE") return successMock(MOCK_PROMOTIONS[0], config);
    return successMock(MOCK_PROMOTIONS, config);
  }

  // ── ADMIN: SETTINGS ───────────────────────────────────────────────────────
  if (url.includes("/admin/settings")) {
    return successMock({ appName: "AURA Car Wash", contactPhone: "0901234567", serviceFee: 10000, address: "123 Đường ABC, Quận 1, TP.HCM", openTime: "07:00", closeTime: "21:00" }, config);
  }

  // ── ADMIN: STAFF ──────────────────────────────────────────────────────────
  if (url.includes("/admin/staff")) {
    if (method === "POST") return successMock({ userId: "staff-new-001", fullName: "Nhân viên mới", email: "newstaff@demo.com", role: "STAFF", status: "ACTIVE" }, config);
    return successMock(MOCK_ACCOUNTS.filter(a => a.role === "STAFF"), config);
  }

  // ── ADMIN: REPORTS ────────────────────────────────────────────────────────
  if (url.includes("/admin/reports/business-health")) {
    return successMock({
      totalRevenue: 45000000, totalBookings: 125, completedBookings: 118, cancelledBookings: 7,
      newCustomers: 24, activeCustomers: 85,
      revenueByDay: [
        { date: "2026-07-08", revenue: 6500000 }, { date: "2026-07-09", revenue: 7200000 },
        { date: "2026-07-10", revenue: 5800000 }, { date: "2026-07-11", revenue: 8100000 },
        { date: "2026-07-12", revenue: 9300000 }, { date: "2026-07-13", revenue: 4200000 },
        { date: "2026-07-14", revenue: 3900000 }
      ],
      topServices: [
        { serviceName: "Rửa xe cao cấp", count: 52, revenue: 9360000 },
        { serviceName: "Vệ sinh khoang máy", count: 28, revenue: 12600000 },
        { serviceName: "Rửa xe tiêu chuẩn", count: 45, revenue: 4500000 }
      ]
    }, config);
  }
  if (url.includes("/admin/reports")) {
    return successMock({ dailyRevenue: 15000000, monthlyRevenue: 450000000, completedBookings: 125, activeCustomers: 85 }, config);
  }

  // ── ADMIN: ACCOUNTS ───────────────────────────────────────────────────────
  if (url.match(/\/admin\/accounts\/[\w-]+/)) {
    const id = url.split("/").pop();
    return successMock(MOCK_ACCOUNTS.find(a => a.userId === id) ?? MOCK_ACCOUNTS[0], config);
  }
  if (url.includes("/admin/accounts")) {
    return paginatedMock(MOCK_ACCOUNTS, config);
  }

  // ── ADMIN: CUSTOMERS ──────────────────────────────────────────────────────
  if (url.match(/\/admin\/customers\/[\w-]+\/vehicles/)) {
    return paginatedMock([
      { vehicleId: "v1", brandModel: "Toyota Vios", plate: "51G-123.45", type: "Sedan" },
      { vehicleId: "v2", brandModel: "Honda CR-V", plate: "51K-678.90", type: "SUV" }
    ], config);
  }
  if (url.match(/\/admin\/customers\/[\w-]+\/tier-history/)) {
    return paginatedMock([{ id: "th1", fromTier: "SILVER", toTier: "GOLD", changedAt: "2026-06-01T00:00:00Z", reason: "Points threshold reached" }], config);
  }
  if (url.match(/\/admin\/customers\/[\w-]+\/(wash-sessions|wash-history)/)) {
    return paginatedMock([{ sessionId: "sess1", vehiclePlate: "51G-123.45", packageName: "Rửa xe cao cấp", finalAmount: 180000, awardedPoints: 150, status: "COMPLETED", completedAt: "2026-07-10T10:30:00Z" }], config);
  }
  if (url.match(/\/admin\/customers\/[\w-]+\/point-transactions/)) {
    return paginatedMock([{ transactionId: "pt1", type: "EARN", points: 150, description: "Rửa xe cao cấp", createdAt: "2026-07-10T10:00:00Z" }], config);
  }
  if (url.match(/\/admin\/customers\/[\w-]+\/(status|role|tier|points)/)) {
    return successMock({ customerId: "customer-id-demo", updatedAt: new Date().toISOString() }, config);
  }
  if (url.match(/\/admin\/customers\/[\w-]+/)) {
    return successMock({ userId: "customer-id-demo", fullName: "Nguyen Thi Lan", phone: "0123456787", email: "customer@demo.com", role: "CUSTOMER", status: "ACTIVE", loyaltyTier: "GOLD", totalPoints: 850, createdAt: "2026-01-01T00:00:00Z" }, config);
  }

  // ── ADMIN: BOOKINGS ───────────────────────────────────────────────────────
  if (url.match(/\/admin\/bookings\/[\w-]+/)) {
    return successMock(MOCK_BOOKINGS_ADMIN[0], config);
  }
  if (url.includes("/admin/bookings")) {
    return paginatedMock(MOCK_BOOKINGS_ADMIN, config);
  }

  // ── ADMIN: OFFERS / REVIEWS / ADD-ONS ────────────────────────────────────
  if (url.includes("/admin/offers") || url.includes("/admin/reviews") || url.includes("/admin/add-ons")) {
    return successMock([], config);
  }

  // ── FALLBACK ──────────────────────────────────────────────────────────────
  if (defaultAdapter) return defaultAdapter(config);
  throw new Error("No default adapter available");
};

// ─── AXIOS CLIENT ─────────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: true,
  adapter: mockAdapter
});

apiClient.interceptors.request.use((config) => attachAccessToken(config));
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const request = error.config as RetriableRequestConfig | undefined;

    if (!request) {
      return Promise.reject(normalizeAxiosError(error));
    }

    const is401 = error.response?.status === 401;
    const shouldTryRefresh = is401 && !request._retry;

    if (!shouldTryRefresh) {
      if (is401) {
        clearAuthSession();
      }
      return Promise.reject(normalizeAxiosError(error));
    }

    request._retry = true;

    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) {
      clearAuthSession();
      return Promise.reject(normalizeAxiosError(error));
    }

    request.headers.set("Authorization", `Bearer ${newAccessToken}`);
    return apiClient(request);
  }
);

function attachAccessToken(config: InternalAxiosRequestConfig) {
  const token = getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function performTokenRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post<RefreshResponse>(
      `${API_URL}/auth/refresh`,
      { refreshToken },
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true
      }
    );

    const nextToken = response.data.data.accessToken;
    setAccessToken(nextToken, response.data.data.expiresIn);
    return nextToken;
  } catch {
    return null;
  }
}

function normalizeAxiosError(error: AxiosError<ApiErrorResponse>) {
  const payload = error.response?.data;

  if (payload && typeof payload === "object" && "success" in payload) {
    return payload;
  }

  const status = error.response?.status ?? 500;
  const defaultMessages: Record<number, string> = {
    401: "Session expired. Please sign in again.",
    403: "You don't have permission to perform this action.",
    404: "Resource not found.",
    422: "Invalid request data.",
    500: "Server error. Please try again.",
  };

  return {
    success: false,
    statusCode: status,
    message: defaultMessages[status] ?? (error.message || "Request failed"),
    errorCode: "INTERNAL_SERVER_ERROR",
  } satisfies ApiErrorResponse;
}

export async function apiRequest<TResponse, TData = unknown>(
  config: AxiosRequestConfig<TData>
) {
  const response = await apiClient.request<
    ApiSuccessResponse<TResponse>,
    AxiosResponse<ApiSuccessResponse<TResponse>>,
    TData
  >(config);

  if (!response.data.success) {
    throw response.data;
  }

  return response.data.data;
}
