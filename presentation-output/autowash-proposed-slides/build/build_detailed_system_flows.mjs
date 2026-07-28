import fs from "node:fs/promises";

const { Presentation, PresentationFile } = await import("@oai/artifact-tool");

const OUT = "E:/SU26/SWP391/presentation-output/detailed-system-flows/output.pptx";
const PREVIEW_DIR = "E:/SU26/SWP391/presentation-output/detailed-system-flows/tmp/preview";
const INSPECT = "E:/SU26/SWP391/presentation-output/detailed-system-flows/tmp/inspect.ndjson";
const W = 1280;
const H = 720;
const C = {
  bg: "#F2F5F9", white: "#FFFFFF", ink: "#0B1220", muted: "#526174", border: "#CBD5E1",
  purple: "#8613B8", purpleLight: "#F7EDFB", cyan: "#08BFD3", cyanLight: "#E9FBFD",
  blue: "#2563EB", blueLight: "#EFF6FF", green: "#16A34A", greenLight: "#ECFDF3",
  orange: "#FF5A1F", orangeLight: "#FFF2EC", red: "#DC2626", amber: "#D97706",
};

const deck = Presentation.create({ slideSize: { width: W, height: H } });
deck.theme.colorScheme = { name: "Aura Car Care", themeColors: { accent1: C.purple, accent2: C.cyan, bg1: C.white, bg2: C.bg, tx1: C.ink, tx2: C.muted } };
const records = [];
let currentSlide = 0;

function shape(slide, geometry, position, fill, line = { width: 0, fill }) {
  return slide.shapes.add({ geometry, position, fill, line });
}

function text(slide, value, position, opts = {}, role = "body") {
  const s = shape(slide, "rect", position, { color: C.white, transparency: 100000 }, { width: 0, fill: C.white });
  s.text = value;
  s.text.typeface = opts.typeface ?? "Poppins";
  s.text.fontSize = opts.fontSize ?? 14;
  s.text.bold = Boolean(opts.bold);
  s.text.color = opts.color ?? C.ink;
  s.text.alignment = opts.alignment ?? "left";
  s.text.verticalAlignment = opts.verticalAlignment ?? "middle";
  s.text.insets = opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 };
  s.text.autoFit = "shrinkText";
  records.push({ kind: "textbox", slide: currentSlide, role, text: value, textChars: value.length, textLines: value.split("\n").length, bbox: position });
  return s;
}

function card(slide, x, y, w, h, fill = C.white, stroke = C.border, radius = 9000) {
  return slide.shapes.add({ geometry: "roundRect", position: { left: x, top: y, width: w, height: h }, fill, line: { style: "solid", fill: stroke, width: 1.4 }, adjustmentList: [{ name: "adj", formula: `val ${radius}` }] });
}

function base(title, subtitle, accent = C.purple) {
  currentSlide += 1;
  const slide = deck.slides.add();
  slide.background.fill = C.bg;
  shape(slide, "rect", { left: 48, top: 34, width: 1184, height: 650 }, C.white, { style: "solid", fill: C.border, width: 1 });
  shape(slide, "rect", { left: 48, top: 34, width: 8, height: 650 }, accent, { width: 0, fill: accent });
  text(slide, title, { left: 82, top: 58, width: 900, height: 46 }, { fontSize: 31, bold: true }, "title");
  text(slide, subtitle, { left: 84, top: 107, width: 900, height: 22 }, { fontSize: 12.5, color: C.muted }, "subtitle");
  card(slide, 1040, 63, 145, 28, C.ink, C.ink, 30000);
  text(slide, "ORIGIN/DEV  b5ad575", { left: 1050, top: 67, width: 125, height: 18 }, { fontSize: 9.5, bold: true, color: C.white, alignment: "center" }, "source-label");
  return slide;
}

function pill(slide, value, x, y, w, fill, color = C.white) {
  card(slide, x, y, w, 26, fill, fill, 30000);
  text(slide, value, { left: x + 7, top: y + 3, width: w - 14, height: 18 }, { fontSize: 10, bold: true, color, alignment: "center" }, "label");
}

function dashedLeft(slide, x1, x2, y, color = C.muted) {
  for (let x = x1 + 14; x < x2; x += 11) shape(slide, "rect", { left: x, top: y, width: Math.min(6, x2 - x), height: 2 }, color, { width: 0, fill: color });
  shape(slide, "leftArrow", { left: x1, top: y - 5, width: 17, height: 12 }, color, { width: 0, fill: color });
}

function pair(slide, x1, x2, y, request, response, color = C.ink) {
  shape(slide, "rightArrow", { left: x1, top: y, width: x2 - x1, height: 8 }, color, { width: 0, fill: color });
  text(slide, request, { left: x1 + 8, top: y - 20, width: x2 - x1 - 16, height: 18 }, { fontSize: 9.6, bold: true, color, alignment: "center" }, "request");
  dashedLeft(slide, x1, x2, y + 18, C.muted);
  text(slide, response, { left: x1 + 8, top: y + 22, width: x2 - x1 - 16, height: 18 }, { fontSize: 9.1, color: C.muted, alignment: "center" }, "response");
}

function reversePair(slide, x1, x2, y, request, response, color = C.orange) {
  shape(slide, "leftArrow", { left: x1, top: y, width: x2 - x1, height: 8 }, color, { width: 0, fill: color });
  text(slide, request, { left: x1 + 8, top: y - 20, width: x2 - x1 - 16, height: 18 }, { fontSize: 9.6, bold: true, color, alignment: "center" }, "callback");
  for (let x = x1 + 14; x < x2; x += 11) shape(slide, "rect", { left: x, top: y + 18, width: Math.min(6, x2 - x), height: 2 }, C.muted, { width: 0, fill: C.muted });
  shape(slide, "rightArrow", { left: x2 - 17, top: y + 13, width: 17, height: 12 }, C.muted, { width: 0, fill: C.muted });
  text(slide, response, { left: x1 + 8, top: y + 22, width: x2 - x1 - 16, height: 18 }, { fontSize: 9.1, color: C.muted, alignment: "center" }, "response");
}

function legend(slide) {
  shape(slide, "rightArrow", { left: 86, top: 650, width: 35, height: 8 }, C.ink, { width: 0, fill: C.ink });
  text(slide, "Request / command", { left: 130, top: 644, width: 140, height: 18 }, { fontSize: 9, color: C.muted }, "legend");
  dashedLeft(slide, 292, 327, 654, C.muted);
  text(slide, "Response / callback / event", { left: 338, top: 644, width: 205, height: 18 }, { fontSize: 9, color: C.muted }, "legend");
  text(slide, "All endpoints and statuses follow the repository implementation.", { left: 760, top: 644, width: 424, height: 18 }, { fontSize: 9, color: C.muted, alignment: "right" }, "legend");
}

function lane(slide, x, label, color, sublabel) {
  pill(slide, label, x, 146, 176, color);
  text(slide, sublabel, { left: x + 4, top: 177, width: 168, height: 26 }, { fontSize: 9.2, color: C.muted, alignment: "center" }, "lane-subtitle");
  for (let y = 210; y < 610; y += 14) shape(slide, "rect", { left: x + 87, top: y, width: 2, height: 8 }, "#D6DEE8", { width: 0, fill: "#D6DEE8" });
  return { x, center: x + 88, left: x, right: x + 176 };
}

function stepBadge(slide, n, y, color = C.purple) {
  shape(slide, "ellipse", { left: 62, top: y - 5, width: 28, height: 28 }, color, { width: 0, fill: color });
  text(slide, String(n), { left: 62, top: y, width: 28, height: 18 }, { fontSize: 10.5, bold: true, color: C.white, alignment: "center" }, "step");
}

// Slide 1: architecture overview.
{
  const slide = base("3. Proposed Solutions | Detailed System Architecture", "Bidirectional traffic between the role-based web app, Spring Boot modules, PostgreSQL, and external services.");
  pill(slide, "ACTORS", 82, 148, 145, C.blue);
  pill(slide, "NEXT.JS 14", 267, 148, 190, C.cyan);
  pill(slide, "SPRING BOOT 3 / JAVA 21", 503, 148, 390, C.purple);
  pill(slide, "DATA & INTEGRATIONS", 947, 148, 238, C.green);

  [
    ["Guest / Customer", 195, C.cyan], ["Staff", 255, C.blue], ["Manager", 315, C.purple], ["Admin", 375, C.orange],
  ].forEach(([label, y, color]) => { card(slide, 88, y, 132, 44, C.white, C.border); shape(slide, "ellipse", { left: 99, top: y + 8, width: 28, height: 28 }, color, { width: 0, fill: color }); text(slide, label, { left: 134, top: y + 8, width: 78, height: 28 }, { fontSize: 10.5, bold: true }, "actor"); });

  card(slide, 267, 188, 190, 332, C.cyanLight, C.cyan);
  text(slide, "React 18 + TypeScript", { left: 283, top: 205, width: 158, height: 24 }, { fontSize: 15, bold: true, color: C.blue, alignment: "center" }, "technology");
  ["Customer Workspace", "Staff Workspace", "Manager Workspace", "Admin Workspace"].forEach((label, i) => { card(slide, 286, 248 + i * 48, 152, 34, C.white, "#A9E8EF"); text(slide, label, { left: 295, top: 254 + i * 48, width: 134, height: 20 }, { fontSize: 10.5, bold: true, alignment: "center" }, "workspace"); });
  text(slide, "Axios + React Query\nZustand\nSTOMP + SockJS", { left: 286, top: 455, width: 152, height: 52 }, { fontSize: 10, color: C.muted, alignment: "center" }, "technology");

  card(slide, 503, 188, 390, 386, C.purpleLight, C.purple);
  text(slide, "Spring Security + JWT | REST API | WebSocket /topic/bookings", { left: 525, top: 204, width: 346, height: 22 }, { fontSize: 10.5, color: C.muted, alignment: "center" }, "technology");
  const modules = [
    ["Auth & User", "login, OTP, profile"], ["Catalog", "service, package, combo"],
    ["Vehicle", "CRUD and primary plate"], ["Booking & Slot", "hold, capacity, voucher"],
    ["Payment", "SePay and VNPay"], ["Operations", "session lifecycle"],
    ["Staff Assignment", "availability and load"], ["Loyalty & Review", "points, tier, rating"],
    ["Notification", "customer messages"], ["Reports", "admin and manager KPI"],
  ];
  modules.forEach(([title, sub], i) => { const col = i % 2; const row = Math.floor(i / 2); const x = 525 + col * 175; const y = 244 + row * 60; card(slide, x, y, 160, 48, C.white, "#D6C5DF"); text(slide, title, { left: x + 10, top: y + 6, width: 140, height: 17 }, { fontSize: 10.5, bold: true }, "module"); text(slide, sub, { left: x + 10, top: y + 26, width: 140, height: 15 }, { fontSize: 8.3, color: C.muted }, "module-detail"); });

  card(slide, 947, 188, 238, 78, C.greenLight, C.green); text(slide, "PostgreSQL", { left: 963, top: 202, width: 206, height: 22 }, { fontSize: 16, bold: true, alignment: "center" }, "data"); text(slide, "Spring Data JPA + Flyway", { left: 963, top: 230, width: 206, height: 18 }, { fontSize: 9.5, color: C.muted, alignment: "center" }, "data-detail");
  [["SePay + VietQR", "QR + signed webhook", 286, C.orangeLight, C.orange], ["VNPay", "checkout + return/IPN/query", 350, C.orangeLight, C.orange], ["Resend", "verification and reset OTP", 414, C.blueLight, C.blue], ["AWS S3", "avatar and image storage", 478, C.greenLight, C.green]].forEach(([title, sub, y, fill, stroke]) => { card(slide, 947, y, 238, 52, fill, stroke); text(slide, title, { left: 959, top: y + 7, width: 96, height: 18 }, { fontSize: 10.5, bold: true }, "integration"); text(slide, sub, { left: 1052, top: y + 7, width: 120, height: 32 }, { fontSize: 8.5, color: C.muted, alignment: "center" }, "integration-detail"); });

  pair(slide, 222, 265, 320, "HTTP action", "HTML/UI result", C.blue);
  pair(slide, 459, 501, 320, "REST / STOMP", "DTO / WS event", C.purple);
  pair(slide, 895, 945, 216, "JPA query/write", "entity/result", C.green);
  pair(slide, 895, 945, 304, "QR/payment", "signed webhook", C.orange);
  pair(slide, 895, 945, 368, "checkout/query", "return/IPN", C.orange);
  pair(slide, 895, 945, 432, "email request", "API response", C.blue);
  pair(slide, 895, 945, 496, "upload/read", "object result", C.green);
  card(slide, 84, 596, 1100, 38, "#F8FAFC", C.border); text(slide, "Catalog -> Booking -> Payment -> Staff Check-in -> Wash Session -> Completion -> Rating -> Loyalty & Reporting", { left: 105, top: 605, width: 1058, height: 20 }, { fontSize: 12.5, bold: true, color: C.muted, alignment: "center" }, "business-flow");
  legend(slide);
  slide.speakerNotes.setText("Overview aligned to origin/dev b5ad575. This is a modular monolith: one Next.js application, one Spring Boot application, one PostgreSQL database, and external integrations.");
}

// Slide 2: authentication, catalog, vehicles.
{
  const slide = base("Authentication, Catalog & Vehicle Flow", "The browser uses Next.js routes; protected API calls carry JWT and backend state is persisted in PostgreSQL.", C.blue);
  const a = lane(slide, 82, "USER", C.blue, "Guest or customer");
  const f = lane(slide, 300, "NEXT.JS", C.cyan, "Auth/catalog/vehicle pages");
  const b = lane(slide, 518, "SPRING BOOT", C.purple, "Auth, catalog, vehicle APIs");
  const d = lane(slide, 736, "POSTGRESQL", C.green, "Users, tokens, vehicles, catalog");
  const e = lane(slide, 954, "RESEND", C.orange, "Verification and reset email");
  const ys = [224, 290, 356, 422, 488, 554];
  stepBadge(slide, 1, ys[0]); pair(slide, a.center, f.center, ys[0], "Register / login / Google auth", "Form, redirect, validation message", C.blue);
  stepBadge(slide, 2, ys[1]); pair(slide, f.center, b.center, ys[1], "POST /auth/register or /auth/login", "LoginResponse or field error", C.purple);
  stepBadge(slide, 3, ys[2]); pair(slide, b.center, d.center, ys[2], "Read/write user, refresh token, OTP", "Account and token records", C.green);
  stepBadge(slide, 4, ys[3]); pair(slide, b.center, e.center, ys[3], "POST /auth/otp/send -> email API", "Delivery result; user receives OTP", C.orange);
  stepBadge(slide, 5, ys[4]); pair(slide, f.center, b.center, ys[4], "GET /services, /packages, /combos/available", "Service/package/combo DTOs", C.cyan);
  stepBadge(slide, 6, ys[5]); pair(slide, f.center, b.center, ys[5], "GET/POST/PUT/DELETE /customers/vehicles", "Vehicle data or duplicate/validation error", C.blue);
  card(slide, 78, 604, 1108, 30, C.blueLight, C.blue); text(slide, "Registration path: register -> send OTP -> verify OTP -> account ACTIVE + JWT. Login path: credentials or Google ticket -> JWT access/refresh tokens.", { left: 94, top: 610, width: 1076, height: 17 }, { fontSize: 9.5, bold: true, color: C.blue, alignment: "center" }, "rule");
  legend(slide);
  slide.speakerNotes.setText("Endpoints: /api/v1/auth/*, /api/v1/services, /api/v1/packages, /api/v1/combos/available, /api/v1/customers/vehicles. Resend is used for OTP email delivery.");
}

// Slide 3: booking, capacity and payments.
{
  const slide = base("Booking, Capacity & Payment Flow", "Booking is held against configured capacity, created as PENDING, then confirmed only after verified payment.", C.orange);
  const a = lane(slide, 82, "CUSTOMER", C.blue, "Selects service, vehicle, slot");
  const f = lane(slide, 300, "NEXT.JS", C.cyan, "Booking and payment pages");
  const b = lane(slide, 518, "BOOKING API", C.purple, "Slot, voucher, booking, payment");
  const d = lane(slide, 736, "POSTGRESQL", C.green, "Hold, booking, payment, assignment");
  const e = lane(slide, 954, "PAYMENT", C.orange, "SePay/VietQR or VNPay");
  const ys = [214, 274, 334, 394, 454, 514, 574];
  stepBadge(slide, 1, ys[0]); pair(slide, f.center, b.center, ys[0], "GET /slots/availability?date&times", "capacity, holds, remaining, available", C.cyan);
  stepBadge(slide, 2, ys[1]); pair(slide, f.center, b.center, ys[1], "POST /slots/hold", "expiresAt = now + 15 minutes", C.cyan);
  stepBadge(slide, 3, ys[2]); pair(slide, f.center, b.center, ys[2], "POST /bookings/validate-voucher + /staff-options", "discount result + ranked available staff", C.purple);
  stepBadge(slide, 4, ys[3]); pair(slide, f.center, b.center, ys[3], "POST /customers/bookings", "CreateBookingResponse: PENDING + payment data", C.purple);
  stepBadge(slide, 5, ys[4]); pair(slide, b.center, d.center, ys[4], "Save details/payment; consume voucher; delete hold", "Booking/payment persisted; BOOKING_UPDATE", C.green);
  stepBadge(slide, 6, ys[5]); pair(slide, b.center, e.center, ys[5], "SePay: QR + AU code | VNPay: checkout URL", "Customer transfer or VNPay result", C.orange);
  stepBadge(slide, 7, ys[6]); reversePair(slide, b.center, e.center, ys[6], "SePay signed webhook | VNPay IPN/query", "PAID -> booking CONFIRMED -> assign staff", C.orange);
  card(slide, 78, 612, 1108, 25, C.orangeLight, C.orange); text(slide, "Capacity rule: existing non-cancelled bookings + active holds must stay below maxBookingsPerTimeSlot; otherwise BOOKING_SLOT_FULL.", { left: 92, top: 616, width: 1080, height: 15 }, { fontSize: 8.8, bold: true, color: C.amber, alignment: "center" }, "rule");
  legend(slide);
  slide.speakerNotes.setText("SePay webhook verifies HMAC signature and timestamp, locates the AU payment code, then marks the booking paid. VNPay uses checkout, browser return, IPN, and query synchronization. Payment confirmation changes PENDING to CONFIRMED and assigns staff.");
}

// Slide 4: staff operations and realtime.
{
  const slide = base("Wash Operations & Realtime Flow", "Only a CONFIRMED booking can create a wash session; each lifecycle mutation broadcasts a wash-session event.", C.purple);
  const a = lane(slide, 82, "STAFF", C.blue, "Check-in and wash actions");
  const f = lane(slide, 300, "NEXT.JS", C.cyan, "Queue, session detail, dashboard");
  const b = lane(slide, 518, "OPERATIONS API", C.purple, "Session lifecycle and assignment");
  const d = lane(slide, 736, "POSTGRESQL", C.green, "Booking, session, staff, notification");
  const e = lane(slide, 954, "WS CLIENTS", C.orange, "Staff, manager, admin caches");
  const ys = [214, 274, 334, 394, 454, 514, 574];
  stepBadge(slide, 1, ys[0]); pair(slide, f.center, b.center, ys[0], "GET /operations/bookings/eligible-sessions", "CONFIRMED bookings eligible for session", C.cyan);
  stepBadge(slide, 2, ys[1]); pair(slide, f.center, b.center, ys[1], "POST /operations/sessions", "WashSession PENDING + assigned staff", C.purple);
  stepBadge(slide, 3, ys[2]); pair(slide, f.center, b.center, ys[2], "POST /sessions/{id}/queue", "Session QUEUED + event", C.purple);
  stepBadge(slide, 4, ys[3]); pair(slide, f.center, b.center, ys[3], "POST /sessions/{id}/check-in", "CHECKED_IN + projected loyalty points", C.blue);
  stepBadge(slide, 5, ys[4]); pair(slide, f.center, b.center, ys[4], "POST /sessions/{id}/start", "Session + booking IN_PROGRESS", C.orange);
  stepBadge(slide, 6, ys[5]); pair(slide, f.center, b.center, ys[5], "POST /sessions/{id}/complete", "Session + booking COMPLETED; payment PAID", C.green);
  stepBadge(slide, 7, ys[6]); pair(slide, b.center, e.center, ys[6], "Publish WASH_SESSION_UPDATE to /topic/bookings", "Invalidate React Query caches; polling fallback", C.orange);
  card(slide, 78, 612, 1108, 25, C.purpleLight, C.purple); text(slide, "WashSession: PENDING -> QUEUED -> CHECKED_IN -> IN_PROGRESS -> COMPLETED. Cancelled is a terminal alternative validated by lifecycle rules.", { left: 92, top: 616, width: 1080, height: 15 }, { fontSize: 8.8, bold: true, color: C.purple, alignment: "center" }, "state-flow");
  legend(slide);
  slide.speakerNotes.setText("The backend publishes WASH_SESSION_UPDATE through STOMP/SockJS topic /topic/bookings. Frontend invalidates staff, manager, and dashboard React Query caches. If WebSocket fails, polling remains active.");
}

// Slide 5: completion, tracking, loyalty, review, reports.
{
  const slide = base("Completion, Loyalty & Reporting Flow", "Completion is the trigger for final payment state, loyalty points, customer notification, review eligibility, and reporting data.", C.green);
  const a = lane(slide, 82, "CUSTOMER", C.blue, "Tracking, history, rating");
  const f = lane(slide, 300, "NEXT.JS", C.cyan, "Wash tracker, loyalty, review");
  const b = lane(slide, 518, "SPRING BOOT", C.purple, "Tracking, loyalty, review, reports");
  const d = lane(slide, 736, "POSTGRESQL", C.green, "Session, points, tier, review, KPI");
  const e = lane(slide, 954, "ADMIN/MANAGER", C.orange, "Dashboards and staff insights");
  const ys = [214, 274, 334, 394, 454, 514, 574];
  stepBadge(slide, 1, ys[0]); pair(slide, f.center, b.center, ys[0], "GET /customers/wash-tracking/active or /{id}", "Active status, staff, progress and timestamps", C.cyan);
  stepBadge(slide, 2, ys[1]); pair(slide, b.center, d.center, ys[1], "On complete: mark paid + postEarnTransaction", "Award points; recalculate tier; save notification", C.green);
  stepBadge(slide, 3, ys[2]); pair(slide, f.center, b.center, ys[2], "GET /wash-tracking/{id}/completion-summary", "Amount, service, awarded points, completion time", C.cyan);
  stepBadge(slide, 4, ys[3]); pair(slide, f.center, b.center, ys[3], "GET /reviews/bookings/{bookingId}", "Review exists? review detail or empty", C.purple);
  stepBadge(slide, 5, ys[4]); pair(slide, f.center, b.center, ys[4], "POST /reviews: rating, comment, images", "Only COMPLETED and one review per booking", C.orange);
  stepBadge(slide, 6, ys[5]); pair(slide, b.center, d.center, ys[5], "Save review + loyalty bonus transaction", "Review persisted; +10 review bonus points", C.green);
  stepBadge(slide, 7, ys[6]); reversePair(slide, b.center, e.center, ys[6], "Admin/Manager GET reviews, reports, staff KPI", "Aggregated bookings, sessions, ratings, revenue", C.orange);
  card(slide, 78, 612, 1108, 25, C.greenLight, C.green); text(slide, "Customer APIs also expose loyalty account, point transactions, redeemed vouchers, wash history, and completion summaries.", { left: 92, top: 616, width: 1080, height: 15 }, { fontSize: 8.8, bold: true, color: C.green, alignment: "center" }, "rule");
  legend(slide);
  slide.speakerNotes.setText("ReviewService permits reviews only for COMPLETED bookings, enforces one review per booking, stores before/after image URLs, and awards a 10-point review bonus. Manager/Admin reporting derives staff and service performance from persisted bookings, sessions, assignments, and reviews.");
}

await fs.mkdir(PREVIEW_DIR, { recursive: true });
for (let i = 0; i < deck.slides.count; i += 1) {
  const rendered = await deck.export({ slide: deck.slides.getItem(i), format: "png", scale: 1 });
  const path = `${PREVIEW_DIR}/slide-${String(i + 1).padStart(2, "0")}.png`;
  if (typeof rendered.save === "function") await rendered.save(path);
  else if (typeof rendered.arrayBuffer === "function") await fs.writeFile(path, Buffer.from(await rendered.arrayBuffer()));
  else await fs.writeFile(path, Buffer.from(rendered));
}
await fs.writeFile(INSPECT, records.map((item) => JSON.stringify(item)).join("\n") + "\n");
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(OUT);
console.log(OUT);
