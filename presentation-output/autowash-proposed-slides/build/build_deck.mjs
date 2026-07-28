import fs from "node:fs/promises";

const { Presentation, PresentationFile } = await import("@oai/artifact-tool");

const OUT = "E:/SU26/SWP391/presentation-output/autowash-proposed-slides/autowash-github-dev-aligned.pptx";
const PREVIEW_DIR = "E:/SU26/SWP391/presentation-output/autowash-proposed-slides/tmp/preview-github-dev";

const W = 1280;
const H = 720;
const C = {
  black: "#050505",
  ink: "#0B1220",
  muted: "#475569",
  light: "#F3F6FA",
  board: "#FFFFFF",
  border: "#C8CDD3",
  purple: "#8613B8",
  cyan: "#08BFD3",
  orange: "#FF5A1F",
  blue: "#2563EB",
  yellow: "#FFE05A",
  green: "#16A34A",
};

const presentation = Presentation.create({ slideSize: { width: W, height: H } });
presentation.theme.colorScheme = {
  name: "Aura AutoWash",
  themeColors: {
    accent1: C.purple,
    accent2: C.cyan,
    bg1: C.board,
    bg2: C.light,
    tx1: C.black,
    tx2: C.muted,
  },
};

function shape(slide, geometry, position, fill = C.board, line = { width: 0, fill }) {
  return slide.shapes.add({ geometry, position, fill, line });
}

function text(slide, value, position, style = {}) {
  const s = shape(slide, "rect", position, { color: C.board, transparency: 100000 }, { width: 0, fill: C.board });
  s.text = value;
  s.text.typeface = style.typeface ?? "Poppins";
  s.text.fontSize = style.fontSize ?? 24;
  s.text.bold = Boolean(style.bold);
  s.text.italic = Boolean(style.italic);
  s.text.color = style.color ?? C.black;
  s.text.alignment = style.alignment ?? "left";
  s.text.verticalAlignment = style.verticalAlignment ?? "top";
  s.text.insets = style.insets ?? { left: 0, right: 0, top: 0, bottom: 0 };
  s.text.autoFit = "shrinkText";
  return s;
}

function line(slide, x1, y1, x2, y2, color = C.black, thick = 2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const rot = Math.atan2(dy, dx) * 180 / Math.PI;
  return shape(slide, "rect", { left: x1, top: y1 - thick / 2, width: len, height: thick, rotation: rot }, color, { width: 0, fill: color });
}

function arrow(slide, x1, y1, x2, y2, color = C.black) {
  line(slide, x1, y1, x2, y2, color, 2);
  shape(slide, "rect", { left: x2 - 6, top: y2 - 6, width: 12, height: 12, rotation: 45 }, color, { width: 0, fill: color });
}

function baseSlide(title, accent = C.purple) {
  const slide = presentation.slides.add();
  slide.background.fill = C.light;
  shape(slide, "rect", { left: 66, top: 54, width: 1148, height: 612 }, C.board, { style: "solid", fill: C.border, width: 1 });
  text(slide, title, { left: 96, top: 84, width: 970, height: 48 }, { fontSize: 35, bold: true, color: C.black });
  shape(slide, "rect", { left: 612, top: 690, width: 68, height: 4 }, "#777777", { width: 0, fill: "#777777" });
  return slide;
}

function icon(slide, label, x, y, size = 78, fill = C.cyan) {
  shape(slide, "ellipse", { left: x, top: y, width: size, height: size }, fill, { width: 0, fill });
  const t = text(slide, label, { left: x, top: y + size * 0.22, width: size, height: size * 0.55 }, {
    fontSize: Math.max(16, size * 0.28),
    bold: true,
    color: "#FFFFFF",
    alignment: "center",
    verticalAlignment: "middle",
  });
  return t;
}

function bulletList(slide, items, x, y, w, fontSize = 21, gap = 38) {
  items.forEach((item, i) => {
    text(slide, "• " + item, { left: x, top: y + i * gap, width: w, height: gap + 8 }, {
      fontSize,
      typeface: "Lato",
      color: C.black,
      insets: { left: 0, right: 0, top: 0, bottom: 0 },
    });
  });
}

function smallFooter(slide) {
  text(slide, "Smart Automated Car Wash Management System", { left: 96, top: 632, width: 420, height: 20 }, {
    fontSize: 12,
    typeface: "Lato",
    color: C.muted,
  });
}

function solutionSlide() {
  const slide = baseSlide("3. Proposed Solutions", C.purple);
  shape(slide, "rect", { left: 730, top: 35, width: 500, height: 40 }, { color: C.board, transparency: 100000 }, { style: "solid", fill: C.orange, width: 3 });
  shape(slide, "rect", { left: 80, top: 575, width: 70, height: 120 }, { color: C.board, transparency: 100000 }, { style: "solid", fill: C.blue, width: 3 });
  shape(slide, "rect", { left: 110, top: 635, width: 240, height: 68 }, { color: C.board, transparency: 100000 }, { style: "solid", fill: C.orange, width: 3 });
  const xs = [95, 315, 535, 755, 975];
  line(slide, xs[0] + 70, 185, xs[4] + 70, 185, C.purple, 3);
  const cols = [
    { n: "1", h: "Service Catalog\n& Booking", b: ["Browse services, packages, combos", "Choose vehicle and time slot", "Create booking with clear status"] },
    { n: "2", h: "Customer Vehicle\n& History", b: ["Manage vehicles and primary plate", "Track wash progress live", "View booking and service history"] },
    { n: "3", h: "Staff Wash\nOperations", b: ["Search booking or vehicle plate", "Check in and update wash sessions", "Assign staff by availability and load"] },
    { n: "4", h: "Loyalty, Voucher\n& Payment", b: ["Earn points after completed washes", "Redeem tier-based vouchers", "Pay by SePay QR or VNPay"] },
    { n: "5", h: "Admin & Manager\nControl", b: ["Manage services and promotions", "Monitor dashboard and reports", "Review ratings and operations"] },
  ];
  cols.forEach((c, i) => {
    const x = xs[i];
    shape(slide, "diamond", { left: x + 58, top: 150, width: 64, height: 64 }, C.purple, { width: 0, fill: C.purple });
    text(slide, c.n, { left: x + 58, top: 160, width: 64, height: 34 }, { fontSize: 24, bold: true, color: "#FFFFFF", alignment: "center", verticalAlignment: "middle" });
    shape(slide, "rect", { left: x, top: 224, width: 180, height: 76 }, C.board, { style: "solid", fill: C.purple, width: 3 });
    text(slide, c.h, { left: x + 8, top: 236, width: 164, height: 48 }, { fontSize: 16.5, bold: true, alignment: "center", verticalAlignment: "middle" });
    text(slide, c.b.map((item) => "- " + item).join("\n"), { left: x + 6, top: 335, width: 174, height: 150 }, {
      fontSize: 12.8,
      typeface: "Lato",
      color: C.black,
      insets: { left: 0, right: 0, top: 0, bottom: 0 },
    });
  });
  text(slide, "End-to-end flow: catalog -> booking -> payment -> check-in -> wash session -> rating -> loyalty/reporting", { left: 250, top: 550, width: 780, height: 30 }, {
    fontSize: 16,
    bold: true,
    alignment: "center",
    color: C.muted,
  });
  shape(slide, "ellipse", { left: 1035, top: 548, width: 82, height: 82 }, { color: C.board, transparency: 100000 }, { style: "solid", fill: C.purple, width: 3 });
}

function techStackSlide() {
  const slide = baseSlide("3. Proposed Solutions | Tech Stack", C.purple);
  shape(slide, "ellipse", { left: 915, top: 46, width: 150, height: 150 }, { color: C.board, transparency: 100000 }, { style: "solid", fill: C.black, width: 3 });
  shape(slide, "ellipse", { left: 946, top: 63, width: 96, height: 96 }, C.board, { style: "solid", fill: C.black, width: 3 });
  shape(slide, "rect", { left: 910, top: 46, width: 160, height: 50 }, C.yellow, { width: 0, fill: C.yellow });
  const blocks = [
    { x: 180, y: 205, icon: "BE", title: "Backend", body: "Java 21\nSpring Boot 3\nREST API + WebSocket\nJWT Security" },
    { x: 665, y: 205, icon: "DB", title: "Database", body: "PostgreSQL\nSpring Data JPA\nFlyway migrations\nH2 for test profile" },
    { x: 180, y: 410, icon: "FE", title: "Frontend", body: "Next.js 14\nReact + TypeScript\nTailwind CSS\nReact Query + Axios" },
    { x: 665, y: 410, icon: "INT", title: "Integrations", body: "SePay QR + VNPay\nResend email/OTP\nAWS S3 storage\nSwagger OpenAPI" },
  ];
  blocks.forEach((b) => {
    icon(slide, b.icon, b.x, b.y, 78, b.icon === "DB" ? C.green : C.cyan);
    text(slide, b.title, { left: b.x + 120, top: b.y - 4, width: 260, height: 36 }, { fontSize: 25, bold: true });
    text(slide, b.body, { left: b.x + 120, top: b.y + 52, width: 330, height: 110 }, { fontSize: 18, typeface: "Lato" });
  });
  smallFooter(slide);
}

function architectureSlide() {
  const slide = baseSlide("3. Proposed Solutions | System Architecture", C.purple);
  shape(slide, "ellipse", { left: 85, top: 570, width: 150, height: 150 }, { color: C.board, transparency: 100000 }, { style: "solid", fill: C.purple, width: 3 });
  shape(slide, "rect", { left: 1115, top: 212, width: 72, height: 190 }, C.purple, { width: 0, fill: C.purple });
  const left = 150;
  const top = 160;
  const clients = [
    ["Customer Web", "Customer"],
    ["Staff Console", "Staff"],
    ["Manager/Admin", "Admin"],
  ];
  clients.forEach((c, i) => {
    icon(slide, c[1].slice(0, 2).toUpperCase(), left, top + i * 95, 58, C.cyan);
    text(slide, c[0], { left: left - 25, top: top + 62 + i * 95, width: 110, height: 24 }, { fontSize: 12, alignment: "center" });
  });
  shape(slide, "rect", { left: 360, top: 142, width: 630, height: 390 }, { color: C.board, transparency: 100000 }, { style: "solid", fill: C.black, width: 1.5 });
  text(slide, "Application Architecture", { left: 384, top: 154, width: 300, height: 22 }, { fontSize: 16, bold: true, color: C.muted });
  shape(slide, "roundRect", { left: 395, top: 215, width: 120, height: 68 }, C.board, { style: "solid", fill: C.black, width: 1.5 });
  text(slide, "Next.js\nFrontend", { left: 410, top: 228, width: 90, height: 45 }, { fontSize: 15, bold: true, alignment: "center" });
  shape(slide, "roundRect", { left: 580, top: 215, width: 145, height: 68 }, C.board, { style: "solid", fill: C.black, width: 1.5 });
  text(slide, "Spring Boot\nREST API", { left: 596, top: 228, width: 110, height: 45 }, { fontSize: 15, bold: true, alignment: "center" });
  shape(slide, "rect", { left: 560, top: 315, width: 190, height: 150 }, { color: C.board, transparency: 100000 }, { style: "solid", fill: C.black, width: 1.5 });
  ["Auth", "Booking", "Catalog", "Operations", "Loyalty", "Reports"].forEach((m, i) => {
    shape(slide, "roundRect", { left: 585, top: 330 + i * 20, width: 140, height: 16 }, C.board, { style: "solid", fill: C.green, width: 1 });
    text(slide, m + " Service", { left: 598, top: 331 + i * 20, width: 115, height: 13 }, { fontSize: 9.5, alignment: "center" });
  });
  shape(slide, "roundRect", { left: 805, top: 220, width: 125, height: 58 }, C.board, { style: "solid", fill: C.black, width: 1.5 });
  text(slide, "PostgreSQL", { left: 817, top: 240, width: 100, height: 18 }, { fontSize: 15, bold: true, alignment: "center" });
  shape(slide, "roundRect", { left: 805, top: 305, width: 125, height: 58 }, C.board, { style: "solid", fill: C.black, width: 1.5 });
  text(slide, "WebSocket\nTopics", { left: 815, top: 317, width: 105, height: 34 }, { fontSize: 14, bold: true, alignment: "center" });
  shape(slide, "roundRect", { left: 805, top: 390, width: 125, height: 58 }, C.board, { style: "solid", fill: C.black, width: 1.5 });
  text(slide, "Resend / S3 /\nSePay + VNPay", { left: 810, top: 402, width: 115, height: 34 }, { fontSize: 13, bold: true, alignment: "center" });
  arrow(slide, 235, 188, 390, 248, C.black);
  arrow(slide, 235, 283, 390, 248, C.black);
  arrow(slide, 235, 378, 390, 248, C.black);
  arrow(slide, 515, 248, 580, 248, C.black);
  arrow(slide, 725, 248, 805, 248, C.black);
  arrow(slide, 725, 360, 805, 335, C.black);
  arrow(slide, 725, 430, 805, 420, C.black);
  text(slide, "Legend", { left: 860, top: 492, width: 90, height: 18 }, { fontSize: 12, bold: true });
  line(slide, 862, 522, 900, 522, C.black, 2);
  text(slide, "REST traffic", { left: 908, top: 513, width: 80, height: 16 }, { fontSize: 10 });
  line(slide, 862, 546, 900, 546, C.cyan, 3);
  text(slide, "Real-time events", { left: 908, top: 537, width: 95, height: 16 }, { fontSize: 10 });
  smallFooter(slide);
}

function mechanismSlide() {
  const slide = baseSlide("3. Proposed Solutions | Check-in & Wash Operation Mechanism", C.purple);
  shape(slide, "rect", { left: 589, top: 170, width: 2, height: 390 }, C.black, { width: 0, fill: C.black });
  const nodes = [
    { label: "Booking ID\nor Plate", x: 180, y: 170, c: C.cyan },
    { label: "Staff\nConsole", x: 180, y: 330, c: C.blue },
    { label: "Backend\nValidation", x: 360, y: 250, c: C.green },
    { label: "Wash\nSession", x: 360, y: 445, c: C.orange },
  ];
  nodes.forEach((n) => {
    icon(slide, n.label.split("\n")[0].slice(0, 2).toUpperCase(), n.x, n.y, 74, n.c);
    text(slide, n.label, { left: n.x - 18, top: n.y + 80, width: 110, height: 40 }, { fontSize: 14, bold: true, alignment: "center" });
  });
  arrow(slide, 217, 245, 217, 330, C.black);
  arrow(slide, 254, 365, 360, 295, C.black);
  arrow(slide, 397, 328, 397, 445, C.black);
  arrow(slide, 397, 445, 250, 372, C.black);
  const steps = [
    ["Booking / Plate Search", "Customer arrives and staff finds the eligible booking by booking data or vehicle plate."],
    ["Staff Check-in", "Staff validates the booking and creates or checks in the wash session."],
    ["Backend Validation", "Server checks booking status, vehicle, slot, payment and assigned staff."],
    ["Operation Updates", "Wash session status changes from CHECKED_IN to IN_PROGRESS to COMPLETED."],
    ["Real-time Sync", "WebSocket events update admin, manager and staff dashboards."],
    ["Customer Follow-up", "Customer views history, receives points, and rates the service after completion."],
  ];
  steps.forEach((s, i) => {
    icon(slide, String(i + 1), 640, 176 + i * 62, 36, i % 2 ? C.purple : C.cyan);
    text(slide, s[0], { left: 690, top: 170 + i * 62, width: 220, height: 22 }, { fontSize: 14, bold: true });
    text(slide, s[1], { left: 690, top: 192 + i * 62, width: 390, height: 34 }, { fontSize: 12.5, typeface: "Lato" });
  });
  smallFooter(slide);
}

function actorSlide({ title, quote, avatar, bullets, accent = C.purple }) {
  const slide = baseSlide(title, accent);
  shape(slide, "ellipse", { left: 1090, top: 240, width: 300, height: 300 }, accent, { width: 0, fill: accent });
  line(slide, 134, 188, 134, 322, C.black, 2);
  line(slide, 134, 430, 134, 590, C.black, 2);
  icon(slide, avatar, 160, 150, 92, C.cyan);
  icon(slide, "CAR", 86, 365, 55, C.orange);
  text(slide, quote, { left: 305, top: 158, width: 460, height: 36 }, { fontSize: 22, italic: true, bold: true });
  bulletList(slide, bullets, 330, 220, 700, 24, 46);
  smallFooter(slide);
}

function actorsSlides() {
  actorSlide({
    title: "5. Main Actors & Features",
    quote: "As a guest, I can...",
    avatar: "?",
    bullets: [
      "View public homepage, guides, service catalog, and promotions",
      "Register a customer account",
      "Browse wash packages, combo sessions, and individual services",
      "Start a booking flow after authentication",
      "Read car-care content and customer-facing announcements",
      "Switch language between English and Vietnamese",
    ],
  });
  actorSlide({
    title: "5. Main Actors & Features",
    quote: "As a registered customer, I can...",
    avatar: "CUS",
    bullets: [
      "Log in and manage my profile",
      "Add, update, set primary, and remove vehicles",
      "Book wash services by package, combo, or custom service",
      "Track booking status and wash progress",
      "View notifications, booking history, and service history",
      "Redeem points for vouchers and use tier benefits",
    ],
  });
  actorSlide({
    title: "5. Main Actors & Features",
    quote: "As a registered customer, I can...",
    avatar: "CUS",
    bullets: [
      "View all vehicles and booking details",
      "Cancel or follow up eligible bookings",
      "Rate completed bookings and service quality",
      "Review earned points and membership tier",
      "Redeem tier voucher offers when eligible",
      "Receive reminders and support information",
    ],
  });
  actorSlide({
    title: "5. Main Actors & Features",
    quote: "As a staff member, I can...",
    avatar: "ST",
    bullets: [
      "Log in to the staff workspace",
      "Search eligible bookings for check-in",
      "Create and update wash sessions",
      "Follow assigned work and service queue",
      "Update progress from check-in to completion",
      "View daily performance and assigned tasks",
    ],
  });
  actorSlide({
    title: "5. Main Actors & Features",
    quote: "As a manager, I can...",
    avatar: "MGR",
    bullets: [
      "Monitor operation dashboard and attention popups",
      "Assign staff to wash sessions",
      "Track staff workload and availability",
      "Review bookings, sessions, revenue, and service quality",
      "Handle delayed, unassigned, or unfinished sessions",
      "Use reports to balance workload and improve operations",
    ],
  });
  actorSlide({
    title: "5. Main Actors & Features",
    quote: "As an administrator, I can...",
    avatar: "ADM",
    bullets: [
      "Manage users, staff accounts, and customer status",
      "Manage services, packages, combos, add-ons, and promotions",
      "Configure loyalty tiers, points, and voucher offers",
      "Review bookings, payments, reports, and feedback",
      "Monitor dashboard KPIs and staff performance",
      "Manage content, settings, notifications, and system data",
    ],
  });
}

function flowSlide() {
  const slide = baseSlide("6. Flows | Scenario 1: Booking & Service Experience", C.orange);
  shape(slide, "ellipse", { left: 1110, top: 220, width: 245, height: 245 }, C.orange, { width: 0, fill: C.orange });
  const steps = [
    { n: "1", title: "Browse services", x: 165, y: 160 },
    { n: "2", title: "Select package\nor combo", x: 385, y: 160 },
    { n: "3", title: "Choose vehicle\nand time slot", x: 605, y: 160 },
    { n: "4", title: "Apply eligible\nvoucher", x: 825, y: 160 },
    { n: "5", title: "Create booking\nand choose payment", x: 825, y: 355 },
    { n: "6", title: "Pay by SePay QR\nor VNPay", x: 605, y: 355 },
    { n: "7", title: "Booking confirms;\nstaff checks in", x: 385, y: 355 },
    { n: "8", title: "Wash session\nprogress updates", x: 165, y: 355 },
    { n: "9", title: "Complete, earn points\nand submit rating", x: 495, y: 535 },
  ];
  steps.forEach((s) => {
    shape(slide, "roundRect", { left: s.x, top: s.y, width: 150, height: 100 }, C.board, { style: "solid", fill: C.black, width: 2 });
    icon(slide, s.n, s.x + 55, s.y + 12, 40, C.cyan);
    text(slide, s.title, { left: s.x + 10, top: s.y + 56, width: 130, height: 38 }, { fontSize: 14, bold: true, alignment: "center", verticalAlignment: "middle" });
  });
  arrow(slide, 315, 210, 385, 210, C.black);
  arrow(slide, 535, 210, 605, 210, C.black);
  arrow(slide, 755, 210, 825, 210, C.black);
  arrow(slide, 900, 260, 900, 355, C.black);
  arrow(slide, 825, 405, 755, 405, C.black);
  arrow(slide, 605, 405, 535, 405, C.black);
  arrow(slide, 385, 405, 315, 405, C.black);
  arrow(slide, 240, 455, 495, 580, C.black);
  text(slide, "Real-time status is synchronized across Customer, Staff, Manager, and Admin workspaces.", { left: 260, top: 640, width: 760, height: 28 }, {
    fontSize: 18,
    bold: true,
    alignment: "center",
    color: C.muted,
  });
}

function flowBox(slide, n, title, x, y, color = C.cyan, w = 148) {
  shape(slide, "roundRect", { left: x, top: y, width: w, height: 92 }, C.board, { style: "solid", fill: C.black, width: 2 });
  icon(slide, n, x + w / 2 - 19, y + 12, 38, color);
  text(slide, title, { left: x + 9, top: y + 54, width: w - 18, height: 34 }, {
    fontSize: 13.2,
    bold: true,
    alignment: "center",
    verticalAlignment: "middle",
  });
}

function scenario2Slide() {
  const slide = baseSlide("6. Flows | Scenario 2: Customer Feedback Flow", C.orange);
  shape(slide, "rect", { left: 108, top: 630, width: 210, height: 58 }, { color: C.board, transparency: 100000 }, { style: "solid", fill: C.orange, width: 3 });
  shape(slide, "ellipse", { left: 1030, top: 92, width: 125, height: 125 }, { color: C.board, transparency: 100000 }, { style: "solid", fill: C.purple, width: 3 });

  flowBox(slide, "1", "Customer opens\ncompleted booking", 175, 150, C.cyan);
  flowBox(slide, "2", "Review service\nand staff details", 390, 150, C.purple);
  flowBox(slide, "3", "Submit rating\nand feedback", 605, 150, C.orange);
  flowBox(slide, "4", "Backend links\nfeedback to booking", 820, 150, C.green, 170);
  arrow(slide, 323, 196, 390, 196);
  arrow(slide, 538, 196, 605, 196);
  arrow(slide, 753, 196, 820, 196);

  flowBox(slide, "5", "Admin reviews\ncustomer feedback", 280, 390, C.blue, 168);
  flowBox(slide, "6", "Manager sees\nservice quality", 525, 390, C.purple, 168);
  flowBox(slide, "7", "Ratings update staff\nand service insights", 770, 390, C.green, 168);
  shape(slide, "rect", { left: 904, top: 242, width: 2, height: 88 }, C.black, { width: 0, fill: C.black });
  shape(slide, "rect", { left: 364, top: 329, width: 542, height: 2 }, C.black, { width: 0, fill: C.black });
  shape(slide, "rect", { left: 363, top: 330, width: 2, height: 60 }, C.black, { width: 0, fill: C.black });
  shape(slide, "rect", { left: 358, top: 384, width: 12, height: 12, rotation: 45 }, C.black, { width: 0, fill: C.black });
  arrow(slide, 448, 436, 525, 436);
  arrow(slide, 693, 436, 770, 436);

  text(slide, "Output: ratings become operational data, not just comments.", { left: 270, top: 560, width: 740, height: 34 }, {
    fontSize: 22,
    bold: true,
    alignment: "center",
    color: C.muted,
  });
}

function scenario3Slide() {
  const slide = baseSlide("6. Flows | Scenario 3: Booking Quality Validation Flow", C.orange);
  shape(slide, "ellipse", { left: 1010, top: 456, width: 132, height: 132 }, C.purple, { width: 0, fill: C.purple });

  flowBox(slide, "1", "Customer arrives\nat wash center", 190, 160, C.cyan);
  flowBox(slide, "2", "Staff searches\nbooking or plate", 420, 160, C.blue);
  flowBox(slide, "3", "System validates\nbooking status", 650, 160, C.green);
  flowBox(slide, "4", "Wash session\nis created", 880, 160, C.orange);
  arrow(slide, 338, 206, 420, 206);
  arrow(slide, 568, 206, 650, 206);
  arrow(slide, 798, 206, 880, 206);

  flowBox(slide, "5", "Progress checked\nstep by step", 285, 420, C.purple, 170);
  flowBox(slide, "6", "Completion unlocks\nrating request", 555, 420, C.green, 176);
  flowBox(slide, "7", "Reports update\nstaff performance", 835, 420, C.blue, 180);
  shape(slide, "rect", { left: 953, top: 252, width: 2, height: 118 }, C.black, { width: 0, fill: C.black });
  shape(slide, "rect", { left: 370, top: 369, width: 585, height: 2 }, C.black, { width: 0, fill: C.black });
  shape(slide, "rect", { left: 369, top: 370, width: 2, height: 50 }, C.black, { width: 0, fill: C.black });
  shape(slide, "rect", { left: 364, top: 414, width: 12, height: 12, rotation: 45 }, C.black, { width: 0, fill: C.black });
  arrow(slide, 455, 466, 555, 466);
  arrow(slide, 731, 466, 835, 466);

  text(slide, "Validation uses existing booking, vehicle, session and staff assignment data.", { left: 225, top: 590, width: 830, height: 28 }, {
    fontSize: 18,
    bold: true,
    alignment: "center",
    color: C.muted,
  });
}

function scenario4Slide() {
  const slide = baseSlide("6. Flows | Scenario 4: Reservation & Payment Flow", C.orange);
  shape(slide, "ellipse", { left: 1010, top: 98, width: 115, height: 115 }, C.orange, { width: 0, fill: C.orange });

  const top = 165;
  flowBox(slide, "1", "Choose service\npackage", 160, top, C.cyan);
  flowBox(slide, "2", "Pick date\nand time slot", 375, top, C.purple);
  flowBox(slide, "3", "Select vehicle\nor add new one", 590, top, C.green);
  flowBox(slide, "4", "Apply a redeemed\nvoucher", 805, top, C.orange);
  arrow(slide, 308, top + 46, 375, top + 46);
  arrow(slide, 523, top + 46, 590, top + 46);
  arrow(slide, 738, top + 46, 805, top + 46);

  flowBox(slide, "5", "System checks\nslot capacity", 805, 370, C.blue);
  flowBox(slide, "6", "Create booking\nand invoice", 590, 370, C.purple);
  flowBox(slide, "7", "Pay by SePay QR\nor VNPay", 375, 370, C.green);
  flowBox(slide, "8", "Confirm booking\nand notify user", 160, 370, C.cyan);
  arrow(slide, 879, top + 92, 879, 370);
  arrow(slide, 805, 416, 738, 416);
  arrow(slide, 590, 416, 523, 416);
  arrow(slide, 375, 416, 308, 416);

  text(slide, "Slot capacity rule: close a time slot when the configured vehicle limit is reached.", { left: 215, top: 585, width: 850, height: 30 }, {
    fontSize: 18,
    bold: true,
    alignment: "center",
    color: C.muted,
  });
}

function scenario5Slide() {
  const slide = baseSlide("6. Flows | Staff Wash Session & Live Updates", C.orange);
  shape(slide, "rect", { left: 1056, top: 102, width: 58, height: 190 }, { color: C.board, transparency: 100000 }, { style: "solid", fill: C.orange, width: 3 });

  flowBox(slide, "1", "Customer arrives\nwith booking", 160, 140, C.cyan);
  flowBox(slide, "2", "Staff searches booking\nor vehicle plate", 395, 140, C.blue, 170);
  flowBox(slide, "3", "Backend validates\nbooking & vehicle", 665, 140, C.green, 178);
  flowBox(slide, "4", "Check-in creates\nwash session", 920, 140, C.orange, 170);
  arrow(slide, 308, 186, 395, 186);
  arrow(slide, 565, 186, 665, 186);
  arrow(slide, 843, 186, 920, 186);

  flowBox(slide, "5", "Staff updates\nwash progress", 920, 390, C.purple, 170);
  flowBox(slide, "6", "WebSocket pushes\nstatus update", 665, 390, C.blue, 178);
  flowBox(slide, "7", "Customer/admin\nsee live status", 395, 390, C.cyan, 170);
  flowBox(slide, "8", "Completion closes session\nand awards points", 160, 390, C.green);
  arrow(slide, 1005, 232, 1005, 390);
  arrow(slide, 920, 436, 843, 436);
  arrow(slide, 665, 436, 565, 436);
  arrow(slide, 395, 436, 308, 436);

  text(slide, "Works with the current system model: booking, vehicle, staff assignment, wash session and notifications.", { left: 190, top: 585, width: 900, height: 30 }, {
    fontSize: 17.5,
    bold: true,
    alignment: "center",
    color: C.muted,
  });
}

function limitationsSlide() {
  const slide = baseSlide("Limitations", "#8A8A8A");
  shape(slide, "ellipse", { left: 520, top: -115, width: 190, height: 190 }, { color: C.board, transparency: 100000 }, { style: "solid", fill: "#808080", width: 2 });
  shape(slide, "ellipse", { left: 1030, top: -45, width: 190, height: 190 }, "#8A8A8A", { width: 0, fill: "#8A8A8A" });
  shape(slide, "rect", { left: 0, top: 590, width: 120, height: 95 }, "#D4D4D4", { width: 0, fill: "#D4D4D4" });
  icon(slide, "!", 105, 530, 74, "#6B7280");
  icon(slide, "!", 1010, 520, 74, "#6B7280");

  text(slide, "Technical Limitations", { left: 285, top: 180, width: 340, height: 34 }, { fontSize: 24, bold: true });
  bulletList(slide, [
    "Production behavior depends on stable backend, database, and network availability",
    "Live updates require a stable WebSocket connection and reconnect handling",
    "Slot holds, booking capacity, and server time must remain synchronized",
    "Payment confirmation depends on SePay webhooks and VNPay callbacks",
  ], 350, 222, 660, 18, 34);

  text(slide, "Operational Limitations", { left: 285, top: 390, width: 360, height: 34 }, { fontSize: 24, bold: true });
  bulletList(slide, [
    "Staff recommendations depend on accurate assignments and session status data",
    "Reports and ratings depend on complete booking and staff assignment records",
    "The repo has payment QR, but no hardware QR gate/scanner check-in workflow",
  ], 350, 432, 690, 18, 34);
}

solutionSlide();
techStackSlide();
architectureSlide();
mechanismSlide();
actorsSlides();
flowSlide();
scenario2Slide();
scenario3Slide();
scenario4Slide();
scenario5Slide();
limitationsSlide();

await fs.mkdir(PREVIEW_DIR, { recursive: true });
for (let i = 0; i < presentation.slides.count; i += 1) {
  const sl = presentation.slides.getItem(i);
  const preview = await presentation.export({ slide: sl, format: "png", scale: 1 });
  const out = `${PREVIEW_DIR}/slide-${String(i + 1).padStart(2, "0")}.png`;
  if (typeof preview.save === "function") {
    await preview.save(out);
  } else if (typeof preview.arrayBuffer === "function") {
    await fs.writeFile(out, Buffer.from(await preview.arrayBuffer()));
  } else {
    await fs.writeFile(out, Buffer.from(preview));
  }
}

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(OUT);
console.log(OUT);
