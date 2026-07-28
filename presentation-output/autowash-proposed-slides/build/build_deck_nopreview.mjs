import fs from "node:fs/promises";

const { Presentation, PresentationFile } = await import("@oai/artifact-tool");

const OUT = "E:/SU26/SWP391/presentation-output/autowash-proposed-slides/output.pptx";
const PREVIEW_DIR = "E:/SU26/SWP391/presentation-output/autowash-proposed-slides/tmp/preview";

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
  shape(slide, "ellipse", { left: 1118, top: 230, width: 290, height: 290 }, accent, { width: 0, fill: accent });
  shape(slide, "ellipse", { left: 820, top: 545, width: 90, height: 90 }, { color: accent, transparency: 100000 }, { style: "solid", fill: accent, width: 3 });
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
  const xs = [140, 500, 860];
  line(slide, xs[0] + 90, 185, xs[2] + 90, 185, C.purple, 3);
  const cols = [
    { n: "1", h: "Smart Booking\n& Service Discovery", b: ["Browse packages, combos, and individual services", "Check available time slots before booking", "Register and manage vehicles", "Apply vouchers or loyalty points"] },
    { n: "2", h: "Seamless Customer\nExperience", b: ["Create bookings and receive notifications", "Track wash progress and booking status", "View service history and invoices", "Rate completed bookings and staff"] },
    { n: "3", h: "Centralized Operations\n& Management", b: ["Staff check-in and wash-session workflow", "Manager staff assignment and workload balancing", "Admin dashboards, reports, promotions, and tiers", "Real-time updates via WebSocket events"] },
  ];
  cols.forEach((c, i) => {
    const x = xs[i];
    shape(slide, "diamond", { left: x + 55, top: 148, width: 70, height: 70 }, C.purple, { width: 0, fill: C.purple });
    text(slide, c.n, { left: x + 55, top: 161, width: 70, height: 36 }, { fontSize: 26, bold: true, color: "#FFFFFF", alignment: "center", verticalAlignment: "middle" });
    shape(slide, "rect", { left: x, top: 224, width: 280, height: 90 }, C.board, { style: "solid", fill: C.purple, width: 3 });
    text(slide, c.h, { left: x + 12, top: 239, width: 256, height: 55 }, { fontSize: 21, bold: true, alignment: "center", verticalAlignment: "middle" });
    bulletList(slide, c.b, x + 20, 350, 300, 18, 35);
  });
  smallFooter(slide);
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
    { x: 665, y: 410, icon: "INT", title: "Integrations", body: "VNPay payments\nResend email/OTP\nAWS S3 storage\nSwagger OpenAPI" },
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
  text(slide, "Cloud / Deployment Environment", { left: 384, top: 154, width: 300, height: 22 }, { fontSize: 16, bold: true, color: C.muted });
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
  text(slide, "Email / S3 /\nVNPay", { left: 815, top: 402, width: 105, height: 34 }, { fontSize: 14, bold: true, alignment: "center" });
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
  line(slide, 590, 170, 590, 560, C.black, 2);
  const nodes = [
    { label: "Booking QR\nor Plate", x: 180, y: 170, c: C.cyan },
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
    ["Customer QR / Plate", "Customer arrives with booking QR code or registered vehicle plate."],
    ["Staff Check-in", "Staff searches eligible booking, validates customer and creates wash session."],
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
  line(slide, 134, 170, 134, 330, C.black, 2);
  line(slide, 134, 430, 134, 590, C.black, 2);
  icon(slide, avatar, 160, 142, 92, C.cyan);
  icon(slide, "CAR", 86, 365, 55, C.orange);
  text(slide, quote, { left: 305, top: 154, width: 460, height: 36 }, { fontSize: 22, italic: true, bold: true });
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
      "Use vouchers, loyalty points, and tier benefits",
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
    { n: "4", title: "Apply voucher\nor points", x: 825, y: 160 },
    { n: "5", title: "Create booking\nand confirm", x: 825, y: 355 },
    { n: "6", title: "Staff check-in\nat arrival", x: 605, y: 355 },
    { n: "7", title: "Wash progress\nis updated", x: 385, y: 355 },
    { n: "8", title: "Complete service\nand payment", x: 165, y: 355 },
    { n: "9", title: "Rate service\nand earn points", x: 495, y: 535 },
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
  arrow(slide, 645, 580, 900, 455, C.black);
  text(slide, "Real-time status is synchronized across Customer, Staff, Manager, and Admin workspaces.", { left: 260, top: 640, width: 760, height: 28 }, {
    fontSize: 18,
    bold: true,
    alignment: "center",
    color: C.muted,
  });
}

solutionSlide();
techStackSlide();
architectureSlide();
mechanismSlide();
actorsSlides();
flowSlide();

await fs.mkdir(PREVIEW_DIR, { recursive: true });
const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(OUT);
console.log(OUT);

