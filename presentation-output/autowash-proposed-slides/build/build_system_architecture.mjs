import fs from "node:fs/promises";

const { Presentation, PresentationFile } = await import("@oai/artifact-tool");

const OUT = "E:/SU26/SWP391/presentation-output/system-architecture/output.pptx";
const PREVIEW = "E:/SU26/SWP391/presentation-output/system-architecture/tmp/preview";
const INSPECT = "E:/SU26/SWP391/presentation-output/system-architecture/tmp/inspect.ndjson";
const W = 1280, H = 720;
const C = {
  bg: "#F3F6FA", white: "#FFFFFF", ink: "#0B1220", muted: "#536276", border: "#CBD5E1",
  cyan: "#08BFD3", cyanLight: "#E9FBFD", purple: "#8613B8", purpleLight: "#F7EDFB",
  green: "#16A34A", greenLight: "#ECFDF3", orange: "#FF5A1F", orangeLight: "#FFF2EC",
  blue: "#2563EB", blueLight: "#EFF6FF", slate: "#334155", line: "#607086"
};

const deck = Presentation.create({ slideSize: { width: W, height: H } });
deck.theme.colorScheme = { name: "Aura Architecture", themeColors: { accent1: C.purple, accent2: C.cyan, bg1: C.white, bg2: C.bg, tx1: C.ink, tx2: C.muted } };
const records = [];
let slideNo = 0;

function shape(slide, geometry, position, fill, line = { width: 0, fill }) {
  return slide.shapes.add({ geometry, position, fill, line });
}
function text(slide, value, position, opts = {}, role = "body") {
  const s = shape(slide, "rect", position, { color: C.white, transparency: 100000 }, { width: 0, fill: C.white });
  s.text = value;
  s.text.typeface = opts.typeface ?? "Poppins";
  s.text.fontSize = opts.fontSize ?? 12;
  s.text.bold = Boolean(opts.bold);
  s.text.color = opts.color ?? C.ink;
  s.text.alignment = opts.alignment ?? "left";
  s.text.verticalAlignment = opts.verticalAlignment ?? "middle";
  s.text.insets = opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 };
  s.text.autoFit = "shrinkText";
  records.push({ kind: "textbox", slide: slideNo, role, text: value, textChars: value.length, textLines: value.split("\n").length, bbox: position });
  return s;
}
function card(slide, x, y, w, h, fill = C.white, stroke = C.border, radius = 7000, width = 1.2) {
  return slide.shapes.add({ geometry: "roundRect", position: { left: x, top: y, width: w, height: h }, fill, line: { style: "solid", fill: stroke, width }, adjustmentList: [{ name: "adj", formula: `val ${radius}` }] });
}
function header(slide, title, subtitle, accent) {
  slideNo += 1;
  slide.background.fill = C.bg;
  shape(slide, "rect", { left: 40, top: 28, width: 1200, height: 664 }, C.white, { style: "solid", fill: C.border, width: 1 });
  shape(slide, "rect", { left: 40, top: 28, width: 8, height: 664 }, accent, { width: 0, fill: accent });
  text(slide, title, { left: 78, top: 54, width: 930, height: 42 }, { fontSize: 30, bold: true }, "title");
  text(slide, subtitle, { left: 80, top: 99, width: 1010, height: 24 }, { fontSize: 12.5, color: C.muted }, "subtitle");
  card(slide, 1073, 57, 126, 28, C.ink, C.ink, 30000);
  text(slide, "REPOSITORY-ALIGNED", { left: 1080, top: 62, width: 112, height: 17 }, { fontSize: 8.5, bold: true, color: C.white, alignment: "center" }, "badge");
}
function section(slide, label, x, y, w, color, fill) {
  card(slide, x, y, w, 30, color, color, 5000);
  text(slide, label, { left: x + 8, top: y + 5, width: w - 16, height: 20 }, { fontSize: 10.5, bold: true, color: C.white, alignment: "center" }, "section-title");
  shape(slide, "rect", { left: x, top: y + 38, width: w, height: 450 }, fill, { style: "solid", fill: color, width: 1.4 });
}
function moduleCard(slide, title, sub, x, y, w, h, color, fill) {
  card(slide, x, y, w, h, fill, color, 5000, 1.15);
  text(slide, title, { left: x + 10, top: y + 7, width: w - 20, height: 19 }, { fontSize: 10.5, bold: true, color: C.ink }, "module");
  text(slide, sub, { left: x + 10, top: y + 27, width: w - 20, height: h - 32 }, { fontSize: 8.2, color: C.muted, verticalAlignment: "top" }, "module-detail");
}
function solidRight(slide, x1, x2, y, color = C.ink, label = "") {
  shape(slide, "rightArrow", { left: x1, top: y, width: x2 - x1, height: 8 }, color, { width: 0, fill: color });
  if (label) text(slide, label, { left: x1, top: y - 20, width: x2 - x1, height: 18 }, { fontSize: 8.8, bold: true, color, alignment: "center" }, "request-label");
}
function dashedLeft(slide, x1, x2, y, color = C.line, label = "") {
  for (let x = x1 + 14; x < x2; x += 12) shape(slide, "rect", { left: x, top: y, width: Math.min(7, x2 - x), height: 2 }, color, { width: 0, fill: color });
  shape(slide, "leftArrow", { left: x1, top: y - 5, width: 17, height: 12 }, color, { width: 0, fill: color });
  if (label) text(slide, label, { left: x1, top: y + 4, width: x2 - x1, height: 17 }, { fontSize: 8.2, color, alignment: "center" }, "response-label");
}
function pair(slide, x1, x2, y, req, res, color = C.ink) {
  solidRight(slide, x1, x2, y, color, req);
  dashedLeft(slide, x1, x2, y + 20, C.line, res);
}
function legend(slide) {
  solidRight(slide, 82, 122, 660, C.ink);
  text(slide, "Request / command", { left: 132, top: 651, width: 144, height: 20 }, { fontSize: 9, color: C.muted }, "legend");
  dashedLeft(slide, 294, 334, 664, C.line);
  text(slide, "Response / callback / event", { left: 345, top: 651, width: 215, height: 20 }, { fontSize: 9, color: C.muted }, "legend");
  text(slide, "Next.js 14 | Spring Boot 3 / Java 21 | PostgreSQL", { left: 760, top: 651, width: 430, height: 20 }, { fontSize: 9, color: C.muted, alignment: "right" }, "footer");
}

// Slide 1: logical architecture
{
  const slide = deck.slides.add();
  header(slide, "AutoWash Platform | Logical System Architecture", "Role-based web application built as a Spring Boot modular monolith with transactional persistence and managed external integrations.", C.purple);

  section(slide, "CHANNELS & PRESENTATION", 76, 145, 300, C.cyan, C.cyanLight);
  section(slide, "APPLICATION SERVICES", 405, 145, 488, C.purple, C.purpleLight);
  section(slide, "DATA & INTEGRATIONS", 922, 145, 280, C.green, C.greenLight);

  text(slide, "Actors", { left: 92, top: 194, width: 78, height: 20 }, { fontSize: 10, bold: true, color: C.muted }, "group-label");
  const roles = [["Customer", C.blue], ["Staff", C.cyan], ["Manager", C.purple], ["Admin", C.orange]];
  roles.forEach(([name, color], i) => {
    card(slide, 92, 220 + i * 58, 92, 42, C.white, C.border, 25000);
    shape(slide, "ellipse", { left: 103, top: 231 + i * 58, width: 20, height: 20 }, color, { width: 0, fill: color });
    text(slide, name, { left: 130, top: 229 + i * 58, width: 45, height: 24 }, { fontSize: 9.4, bold: true }, "actor");
  });

  card(slide, 208, 195, 148, 322, C.white, C.cyan, 7000, 1.5);
  text(slide, "NEXT.JS 14", { left: 222, top: 211, width: 120, height: 24 }, { fontSize: 13, bold: true, color: C.cyan, alignment: "center" }, "technology");
  text(slide, "React 18 + TypeScript", { left: 222, top: 238, width: 120, height: 18 }, { fontSize: 9.2, color: C.muted, alignment: "center" }, "technology-detail");
  ["Customer Workspace", "Staff Workspace", "Manager Workspace", "Admin Workspace"].forEach((name, i) => {
    card(slide, 224, 276 + i * 48, 116, 34, C.cyanLight, C.cyan, 4000);
    text(slide, name, { left: 230, top: 284 + i * 48, width: 104, height: 18 }, { fontSize: 8.7, bold: true, alignment: "center" }, "workspace");
  });
  text(slide, "Axios + React Query\nZustand | STOMP + SockJS", { left: 222, top: 476, width: 120, height: 31 }, { fontSize: 8.2, color: C.muted, alignment: "center" }, "frontend-stack");

  text(slide, "SPRING BOOT 3 / JAVA 21", { left: 430, top: 194, width: 438, height: 20 }, { fontSize: 12.5, bold: true, color: C.purple, alignment: "center" }, "technology");
  text(slide, "Spring Security + JWT  |  REST API  |  WebSocket /ws", { left: 430, top: 217, width: 438, height: 18 }, { fontSize: 8.8, color: C.muted, alignment: "center" }, "backend-stack");
  const modules = [
    ["Auth & User", "Login, OTP, profile"], ["Catalog", "Service, package, combo"],
    ["Vehicle", "CRUD and primary vehicle"], ["Booking & Slot", "Hold, capacity, voucher"],
    ["Payment", "SePay and VNPay"], ["Staff Assignment", "Availability and workload"],
    ["Operations", "Wash-session lifecycle"], ["Loyalty & Review", "Points, tier, rating"],
    ["Notification", "Customer messages"], ["Reports", "Admin and manager KPI"]
  ];
  modules.forEach(([a,b], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    moduleCard(slide, a, b, 430 + col * 220, 247 + row * 60, 204, 48, C.purple, C.white);
  });
  card(slide, 442, 557, 414, 42, C.white, C.purple, 5000);
  text(slide, "Domain events + WebSocket publisher", { left: 456, top: 564, width: 386, height: 18 }, { fontSize: 9.5, bold: true, color: C.purple, alignment: "center" }, "event-bus");
  text(slide, "BOOKING_UPDATE and WASH_SESSION_UPDATE -> /topic/bookings", { left: 456, top: 581, width: 386, height: 14 }, { fontSize: 7.8, color: C.muted, alignment: "center" }, "event-detail");

  moduleCard(slide, "PostgreSQL", "Spring Data JPA + Flyway\nTransactional system of record", 946, 198, 232, 62, C.green, C.white);
  moduleCard(slide, "SePay + VietQR", "QR payment + signed webhook", 946, 277, 232, 50, C.orange, C.white);
  moduleCard(slide, "VNPay", "Checkout + return/IPN/query", 946, 340, 232, 50, C.orange, C.white);
  moduleCard(slide, "Resend", "OTP and password-reset email", 946, 403, 232, 50, C.blue, C.white);
  moduleCard(slide, "AWS S3", "Avatar and review-image storage", 946, 466, 232, 50, C.green, C.white);
  moduleCard(slide, "WebSocket Clients", "Role dashboards subscribe to events", 946, 529, 232, 50, C.purple, C.white);

  pair(slide, 178, 212, 425, "UI action", "UI state", C.cyan);
  pair(slide, 356, 420, 349, "REST/JSON + JWT", "DTO / HTTP status", C.purple);
  pair(slide, 875, 936, 226, "JPA transaction", "Entities / result", C.green);
  pair(slide, 875, 936, 302, "Payment request", "Webhook / result", C.orange);
  pair(slide, 875, 936, 427, "Email request", "Delivery result", C.blue);
  pair(slide, 875, 936, 491, "Object upload", "Object URL", C.green);
  dashedLeft(slide, 356, 936, 603, C.purple, "Realtime event: /topic/bookings -> invalidate React Query caches; polling remains fallback");

  legend(slide);
}

function lane(slide, x, label, color, sub) {
  card(slide, x, 156, 170, 30, color, color, 5000);
  text(slide, label, { left: x + 8, top: 161, width: 154, height: 20 }, { fontSize: 10, bold: true, color: C.white, alignment: "center" }, "lane");
  text(slide, sub, { left: x, top: 190, width: 170, height: 25 }, { fontSize: 8.5, color: C.muted, alignment: "center" }, "lane-detail");
  for (let y = 220; y < 620; y += 14) shape(slide, "rect", { left: x + 84, top: y, width: 2, height: 8 }, "#D8E0EA", { width: 0, fill: "#D8E0EA" });
  return x + 85;
}
function badge(slide, n, y, color) {
  shape(slide, "ellipse", { left: 62, top: y - 7, width: 28, height: 28 }, color, { width: 0, fill: color });
  text(slide, String(n), { left: 62, top: y - 2, width: 28, height: 18 }, { fontSize: 10, bold: true, color: C.white, alignment: "center" }, "step");
}

// Slide 2: runtime routes
{
  const slide = deck.slides.add();
  header(slide, "Runtime Communication & Event Flow", "Synchronous REST/JWT traffic, transactional data access, verified payment callbacks, and asynchronous dashboard updates.", C.cyan);
  const u = lane(slide, 92, "USER / STAFF", C.blue, "Browser interaction");
  const f = lane(slide, 302, "NEXT.JS", C.cyan, "Role workspace + API client");
  const b = lane(slide, 512, "SPRING BOOT", C.purple, "Security + domain modules");
  const d = lane(slide, 722, "POSTGRESQL", C.green, "Transactional state");
  const e = lane(slide, 932, "EXTERNAL / WS", C.orange, "Payment, email, storage, events");

  const rows = [228, 308, 388, 468, 565];
  badge(slide, 1, rows[0], C.blue);
  pair(slide, u, f, rows[0], "Login / catalog / vehicle action", "Rendered state or validation", C.blue);
  pair(slide, f, b, rows[0], "REST /api/v1/* + JWT", "DTO + HTTP status", C.purple);
  pair(slide, b, d, rows[0], "Read/write account and domain data", "Committed entities", C.green);

  badge(slide, 2, rows[1], C.purple);
  pair(slide, f, b, rows[1], "Availability -> hold -> validate -> create", "PENDING booking + payment data", C.purple);
  pair(slide, b, d, rows[1], "Capacity check + 15-minute hold", "Remaining capacity or BOOKING_SLOT_FULL", C.green);

  badge(slide, 3, rows[2], C.orange);
  pair(slide, b, e, rows[2], "SePay QR or VNPay checkout", "Verified callback -> PAID -> CONFIRMED -> assign staff", C.orange);

  badge(slide, 4, rows[3], C.purple);
  pair(slide, f, b, rows[3], "Create / queue / check-in / start / complete", "WashSession state + lifecycle validation", C.purple);
  pair(slide, b, d, rows[3], "Persist session, booking, assignment", "Committed lifecycle state", C.green);
  dashedLeft(slide, f, e, rows[3] + 58, C.purple);
  text(slide, "BOOKING_UPDATE / WASH_SESSION_UPDATE -> /topic/bookings", { left: 640, top: rows[3] + 41, width: 365, height: 15 }, { fontSize: 7.8, bold: true, color: C.purple, alignment: "center" }, "event-label");

  badge(slide, 5, rows[4], C.green);
  pair(slide, f, b, rows[4], "Tracking / review / reports query", "Progress, rating, staff KPI, revenue", C.cyan);
  pair(slide, b, d, rows[4], "Complete: paid + points; aggregate KPI", "Tier, loyalty history, review eligibility", C.green);

  card(slide, 80, 616, 1115, 28, C.bg, C.border, 4000);
  text(slide, "Key rule: only CONFIRMED bookings enter operations; reviews require COMPLETED status and are limited to one review per booking.", { left: 95, top: 621, width: 1085, height: 18 }, { fontSize: 9.4, bold: true, color: C.slate, alignment: "center" }, "rule");
  legend(slide);
}

await fs.mkdir(PREVIEW, { recursive: true });
for (let i = 0; i < deck.slides.count; i++) {
  const slide = deck.slides.getItem(i);
  const png = await deck.export({ slide, format: "png", scale: 1 });
  const path = `${PREVIEW}/slide-${String(i + 1).padStart(2, "0")}.png`;
  if (typeof png.save === "function") await png.save(path);
  else if (typeof png.arrayBuffer === "function") await fs.writeFile(path, Buffer.from(await png.arrayBuffer()));
  else await fs.writeFile(path, Buffer.from(png));
}
await fs.writeFile(INSPECT, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(OUT);
console.log(OUT);
