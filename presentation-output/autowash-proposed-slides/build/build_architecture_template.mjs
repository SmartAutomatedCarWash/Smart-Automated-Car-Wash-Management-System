import fs from "node:fs/promises";

const { Presentation, PresentationFile } = await import("@oai/artifact-tool");

const OUT = "E:/SU26/SWP391/presentation-output/system-architecture-template/output-bidirectional-flows.pptx";
const PREVIEW = "E:/SU26/SWP391/presentation-output/system-architecture-template/tmp/preview/slide-01.png";
const INSPECT = "E:/SU26/SWP391/presentation-output/system-architecture-template/tmp/inspect.ndjson";
const W = 1280;
const H = 720;
const C = {
  canvas: "#F2F5F9",
  white: "#FFFFFF",
  ink: "#0B1220",
  muted: "#526174",
  border: "#CBD5E1",
  purple: "#8613B8",
  purpleLight: "#F7EDFB",
  cyan: "#08BFD3",
  cyanLight: "#E9FBFD",
  green: "#16A34A",
  greenLight: "#ECFDF3",
  orange: "#FF5A1F",
  orangeLight: "#FFF2EC",
  blue: "#2563EB",
  blueLight: "#EFF6FF",
};

const deck = Presentation.create({ slideSize: { width: W, height: H } });
deck.theme.colorScheme = {
  name: "Aura Car Care",
  themeColors: { accent1: C.purple, accent2: C.cyan, bg1: C.white, bg2: C.canvas, tx1: C.ink, tx2: C.muted },
};

const records = [];
function addShape(slide, geometry, position, fill, line = { width: 0, fill }) {
  return slide.shapes.add({ geometry, position, fill, line });
}

function addText(slide, value, position, options = {}, role = "body") {
  const shape = addShape(slide, "rect", position, { color: C.white, transparency: 100000 }, { width: 0, fill: C.white });
  shape.text = value;
  shape.text.typeface = options.typeface ?? "Poppins";
  shape.text.fontSize = options.fontSize ?? 16;
  shape.text.bold = Boolean(options.bold);
  shape.text.color = options.color ?? C.ink;
  shape.text.alignment = options.alignment ?? "left";
  shape.text.verticalAlignment = options.verticalAlignment ?? "middle";
  shape.text.insets = options.insets ?? { left: 0, right: 0, top: 0, bottom: 0 };
  shape.text.autoFit = "shrinkText";
  records.push({ kind: "textbox", slide: 1, role, text: value, textChars: value.length, textLines: value.split("\n").length, bbox: position });
  return shape;
}

function card(slide, x, y, w, h, fill, stroke = C.border, radius = 10000) {
  return slide.shapes.add({
    geometry: "roundRect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: stroke, width: 1.5 },
    adjustmentList: [{ name: "adj", formula: `val ${radius}` }],
  });
}

function pill(slide, label, x, y, w, fill, color = C.white) {
  card(slide, x, y, w, 28, fill, fill, 30000);
  addText(slide, label, { left: x + 8, top: y + 3, width: w - 16, height: 20 }, { fontSize: 11, bold: true, color, alignment: "center" }, "label");
}

function moduleCard(slide, title, subtitle, x, y, w, accent) {
  card(slide, x, y, w, 58, C.white, "#D6C5DF", 9000);
  addShape(slide, "rect", { left: x, top: y, width: 5, height: 58 }, accent, { width: 0, fill: accent });
  addText(slide, title, { left: x + 13, top: y + 8, width: w - 22, height: 20 }, { fontSize: 12.5, bold: true }, "module-title");
  addText(slide, subtitle, { left: x + 13, top: y + 31, width: w - 22, height: 16 }, { fontSize: 9.5, color: C.muted }, "module-subtitle");
}

function userCard(slide, initials, label, x, y, fill) {
  card(slide, x, y, 132, 54, C.white, C.border, 9000);
  addShape(slide, "ellipse", { left: x + 10, top: y + 9, width: 36, height: 36 }, fill, { width: 0, fill });
  addText(slide, initials, { left: x + 10, top: y + 14, width: 36, height: 23 }, { fontSize: 12, bold: true, color: C.white, alignment: "center" }, "icon");
  addText(slide, label, { left: x + 54, top: y + 13, width: 70, height: 26 }, { fontSize: 12.5, bold: true }, "actor");
}

function arrow(slide, x, y, w, color, label) {
  addShape(slide, "rightArrow", { left: x, top: y, width: w, height: 20 }, color, { width: 0, fill: color });
  if (label) addText(slide, label, { left: x - 20, top: y - 24, width: w + 40, height: 18 }, { fontSize: 9, bold: true, color, alignment: "center" }, "connector-label");
}

function dashedLeftArrow(slide, x1, x2, y, color = C.muted) {
  const start = x1 + 13;
  const end = x2;
  for (let x = start; x < end; x += 10) {
    addShape(slide, "rect", { left: x, top: y, width: Math.min(6, end - x), height: 2 }, color, { width: 0, fill: color });
  }
  addShape(slide, "leftArrow", { left: x1, top: y - 5, width: 16, height: 12 }, color, { width: 0, fill: color });
}

function trafficPair(slide, x1, x2, y, label = "") {
  addShape(slide, "rightArrow", { left: x1, top: y, width: x2 - x1, height: 9 }, C.ink, { width: 0, fill: C.ink });
  dashedLeftArrow(slide, x1, x2, y + 16, C.muted);
  if (label) {
    addText(slide, label, { left: x1 - 20, top: y - 17, width: x2 - x1 + 40, height: 14 }, { fontSize: 8.5, bold: true, color: C.blue, alignment: "center" }, "connector-label");
  }
}

const slide = deck.slides.add();
slide.background.fill = C.canvas;
addShape(slide, "rect", { left: 48, top: 34, width: 1184, height: 650 }, C.white, { style: "solid", fill: C.border, width: 1 });
addShape(slide, "rect", { left: 1210, top: 150, width: 70, height: 190 }, C.purple, { width: 0, fill: C.purple });

addText(slide, "3. Proposed Solutions | System Architecture", { left: 82, top: 58, width: 820, height: 52 }, { fontSize: 34, bold: true }, "title");
pill(slide, "GITHUB ORIGIN/DEV", 1018, 66, 160, C.ink);
addText(slide, "Role-based web application with a modular Spring Boot backend", { left: 84, top: 108, width: 650, height: 22 }, { fontSize: 13, color: C.muted }, "subtitle");

const headers = [
  ["ACTORS", 88, 146, 132, C.blue],
  ["PRESENTATION", 260, 146, 220, C.cyan],
  ["APPLICATION MODULES", 518, 146, 390, C.purple],
  ["DATA & SERVICES", 946, 146, 230, C.green],
];
headers.forEach(([label, x, y, w, color]) => pill(slide, label, x, y, w, color));

userCard(slide, "CU", "Guest /\nCustomer", 88, 194, C.cyan);
userCard(slide, "ST", "Staff", 88, 260, C.blue);
userCard(slide, "MG", "Manager", 88, 326, C.purple);
userCard(slide, "AD", "Admin", 88, 392, C.orange);

card(slide, 260, 184, 220, 330, C.cyanLight, C.cyan, 9000);
addText(slide, "Next.js 14 Web Application", { left: 278, top: 202, width: 184, height: 40 }, { fontSize: 18, bold: true, alignment: "center" }, "layer-title");
addText(slide, "React 18 + TypeScript", { left: 294, top: 250, width: 152, height: 22 }, { fontSize: 12.5, bold: true, color: C.blue, alignment: "center" }, "technology");
[
  ["Customer Workspace", 286],
  ["Staff Workspace", 330],
  ["Manager Workspace", 374],
  ["Admin Workspace", 418],
].forEach(([label, y]) => {
  card(slide, 282, y, 176, 34, C.white, "#A9E8EF", 8000);
  addText(slide, label, { left: 294, top: y + 6, width: 152, height: 20 }, { fontSize: 11.5, bold: true, alignment: "center" }, "workspace");
});
addText(slide, "React Query + Axios  |  Zustand\nSTOMP + SockJS", { left: 278, top: 466, width: 184, height: 36 }, { fontSize: 10.5, color: C.muted, alignment: "center" }, "technology");

card(slide, 518, 184, 390, 382, C.purpleLight, C.purple, 9000);
addText(slide, "Spring Boot 3 REST API", { left: 540, top: 200, width: 220, height: 28 }, { fontSize: 19, bold: true }, "layer-title");
pill(slide, "JAVA 21", 770, 200, 68, C.purple);
pill(slide, "JWT", 844, 200, 46, C.ink);
addText(slide, "Spring Security  |  Validation  |  Spring Data JPA", { left: 540, top: 235, width: 340, height: 20 }, { fontSize: 10.5, color: C.muted }, "technology");

moduleCard(slide, "Authentication & User", "accounts, roles, profile", 540, 270, 165, C.blue);
moduleCard(slide, "Catalog & Promotion", "services, packages, combos", 721, 270, 165, C.orange);
moduleCard(slide, "Booking & Slot Hold", "availability and capacity", 540, 340, 165, C.cyan);
moduleCard(slide, "Vehicle Management", "vehicles and primary plate", 721, 340, 165, C.green);
moduleCard(slide, "Wash Operations", "check-in and wash session", 540, 410, 165, C.purple);
moduleCard(slide, "Staff Assignment", "availability and workload", 721, 410, 165, C.blue);
moduleCard(slide, "Payment & Loyalty", "voucher, points, tier", 540, 480, 165, C.orange);
moduleCard(slide, "Review & Reporting", "ratings, KPI, analytics", 721, 480, 165, C.green);

trafficPair(slide, 222, 258, 318, "HTTP");
trafficPair(slide, 482, 516, 318, "REST / WS");

card(slide, 946, 184, 230, 96, C.greenLight, C.green, 9000);
addShape(slide, "ellipse", { left: 966, top: 208, width: 46, height: 46 }, C.green, { width: 0, fill: C.green });
addText(slide, "DB", { left: 966, top: 218, width: 46, height: 24 }, { fontSize: 13, bold: true, color: C.white, alignment: "center" }, "icon");
addText(slide, "PostgreSQL", { left: 1026, top: 202, width: 128, height: 26 }, { fontSize: 17, bold: true }, "data-title");
addText(slide, "JPA + Flyway migrations", { left: 1026, top: 235, width: 128, height: 22 }, { fontSize: 10.5, color: C.muted }, "data-subtitle");

const integrations = [
  ["SePay + VietQR", "QR transfer request / payment webhook", 302, C.orangeLight, C.orange],
  ["VNPay", "checkout request / return and IPN", 366, C.orangeLight, C.orange],
  ["Resend", "email request / API response", 430, C.blueLight, C.blue],
  ["AWS S3", "upload or read / object response", 494, C.greenLight, C.green],
];
integrations.forEach(([title, subtitle, y, fill, accent]) => {
  card(slide, 946, y, 230, 52, fill, accent, 8000);
  addText(slide, title, { left: 958, top: y + 7, width: 96, height: 18 }, { fontSize: 11.5, bold: true }, "integration-title");
  addText(slide, subtitle, { left: 1050, top: y + 7, width: 114, height: 34 }, { fontSize: 8.5, color: C.muted, alignment: "center" }, "integration-subtitle");
});

trafficPair(slide, 910, 944, 220, "JPA");
trafficPair(slide, 910, 944, 318);
trafficPair(slide, 910, 944, 382);
trafficPair(slide, 910, 944, 446);
trafficPair(slide, 910, 944, 510);

card(slide, 84, 588, 1092, 48, "#F8FAFC", C.border, 8000);
addText(slide, "Catalog  →  Booking  →  SePay/VNPay Payment  →  Staff Check-in  →  Wash Session  →  Rating  →  Loyalty & Reporting", { left: 106, top: 601, width: 1048, height: 22 }, { fontSize: 13.5, bold: true, color: C.muted, alignment: "center" }, "business-flow");

addShape(slide, "rightArrow", { left: 86, top: 651, width: 34, height: 8 }, C.ink, { width: 0, fill: C.ink });
addText(slide, "Request / command", { left: 128, top: 645, width: 145, height: 18 }, { fontSize: 9.5, color: C.muted }, "legend");
dashedLeftArrow(slide, 292, 326, 655, C.muted);
addText(slide, "Response / callback / realtime event", { left: 334, top: 645, width: 255, height: 18 }, { fontSize: 9.5, color: C.muted }, "legend");
addText(slide, "Every connection is bidirectional where the repository has a response, callback, or event.", { left: 690, top: 645, width: 486, height: 18 }, { fontSize: 9, color: C.muted, alignment: "right" }, "legend");

slide.speakerNotes.setText("Architecture aligned to GitHub origin/dev at b5ad575. The repository implements one Next.js web application and one modular Spring Boot backend, not a microservice or IoT architecture.");

await fs.mkdir("E:/SU26/SWP391/presentation-output/system-architecture-template/tmp/preview", { recursive: true });
const rendered = await deck.export({ slide, format: "png", scale: 1 });
if (typeof rendered.save === "function") await rendered.save(PREVIEW);
else if (typeof rendered.arrayBuffer === "function") await fs.writeFile(PREVIEW, Buffer.from(await rendered.arrayBuffer()));
else await fs.writeFile(PREVIEW, Buffer.from(rendered));
await fs.writeFile(INSPECT, records.map((item) => JSON.stringify(item)).join("\n") + "\n");
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(OUT);
console.log(OUT);
