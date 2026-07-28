import fs from "node:fs/promises";
const { Presentation, PresentationFile } = await import("@oai/artifact-tool");

const OUT = "E:/SU26/SWP391/presentation-output/project-flow-scenarios/output.pptx";
const PREVIEW = "E:/SU26/SWP391/presentation-output/project-flow-scenarios/tmp/preview";
const INSPECT = "E:/SU26/SWP391/presentation-output/project-flow-scenarios/tmp/inspect.ndjson";
const W = 1280, H = 720;
const C = {
  bg: "#F3F6FA", white: "#FFFFFF", ink: "#0B1220", muted: "#58677A", border: "#D3DCE7",
  orange: "#F45B13", orangeLight: "#FFF3EC", cyan: "#08BFD3", cyanLight: "#EAFBFD",
  purple: "#8613B8", purpleLight: "#F7EDFB", green: "#16A34A", greenLight: "#ECFDF3",
  blue: "#2563EB", blueLight: "#EFF6FF", red: "#DC2626", slate: "#334155"
};

const deck = Presentation.create({ slideSize: { width: W, height: H } });
deck.theme.colorScheme = { name: "Aura Flows", themeColors: { accent1: C.orange, accent2: C.cyan, bg1: C.white, bg2: C.bg, tx1: C.ink, tx2: C.muted } };
const records = [];
let currentSlide = 0;
const CARD_W = 220;

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
  records.push({ kind: "textbox", slide: currentSlide, role, text: value, textChars: value.length, textLines: value.split("\n").length, bbox: position });
  return s;
}
function card(slide, x, y, w, h, fill = C.white, stroke = C.border, radius = 6000, width = 1.2) {
  return slide.shapes.add({ geometry: "roundRect", position: { left: x, top: y, width: w, height: h }, fill, line: { style: "solid", fill: stroke, width }, adjustmentList: [{ name: "adj", formula: `val ${radius}` }] });
}
function slideFrame(slide, scenario, subtitle) {
  currentSlide += 1;
  slide.background.fill = C.bg;
  shape(slide, "rect", { left: 0, top: 0, width: W, height: H }, C.bg, { width: 0, fill: C.bg });
  shape(slide, "rect", { left: 44, top: 30, width: 1192, height: 660 }, C.white, { style: "solid", fill: C.border, width: 1 });
  text(slide, "6. Flows", { left: 78, top: 55, width: 130, height: 38 }, { fontSize: 27, bold: true }, "section-title");
  shape(slide, "rect", { left: 214, top: 60, width: 3, height: 29 }, C.orange, { width: 0, fill: C.orange });
  text(slide, scenario, { left: 230, top: 53, width: 890, height: 42 }, { fontSize: 25, bold: true, color: C.orange }, "title");
  text(slide, subtitle, { left: 80, top: 101, width: 1050, height: 24 }, { fontSize: 11.5, color: C.muted }, "subtitle");
  card(slide, 1110, 58, 90, 27, C.ink, C.ink, 25000);
  text(slide, "AUTOWASH", { left: 1119, top: 63, width: 72, height: 17 }, { fontSize: 8.5, bold: true, color: C.white, alignment: "center" }, "brand");
}
function iconGlyph(slide, glyph, x, y, color, fill) {
  card(slide, x, y, 54, 68, fill, color, 7000, 1.2);
  shape(slide, "ellipse", { left: x + 10, top: y + 10, width: 34, height: 34 }, color, { width: 0, fill: color });
  text(slide, glyph, { left: x + 10, top: y + 17, width: 34, height: 20 }, { fontSize: 12, bold: true, color: C.white, alignment: "center" }, "glyph");
  shape(slide, "rect", { left: x + 12, top: y + 51, width: 30, height: 3 }, color, { width: 0, fill: color });
  shape(slide, "rect", { left: x + 12, top: y + 58, width: 20, height: 3 }, C.border, { width: 0, fill: C.border });
}
function stepCard(slide, step, x, y) {
  const palettes = {
    ui: [C.cyan, C.cyanLight], api: [C.purple, C.purpleLight], data: [C.green, C.greenLight],
    ext: [C.orange, C.orangeLight], success: [C.green, C.greenLight], user: [C.blue, C.blueLight]
  };
  const [color, fill] = palettes[step.kind] ?? palettes.api;
  const mainCard = card(slide, x, y, CARD_W, 116, C.white, color, 7000, 1.4);
  shape(slide, "ellipse", { left: x - 12, top: y - 12, width: 30, height: 30 }, color, { width: 0, fill: color });
  text(slide, String(step.n), { left: x - 12, top: y - 6, width: 30, height: 18 }, { fontSize: 10.5, bold: true, color: C.white, alignment: "center" }, "step-number");
  iconGlyph(slide, step.glyph, x + 14, y + 25, color, fill);
  text(slide, step.title, { left: x + 76, top: y + 13, width: 130, height: 34 }, { fontSize: 10.3, bold: true, verticalAlignment: "top" }, "step-title");
  text(slide, step.detail, { left: x + 76, top: y + 49, width: 130, height: 35 }, { fontSize: 8, color: C.muted, verticalAlignment: "top" }, "step-detail");
  if (step.meta) {
    card(slide, x + 76, y + 88, 130, 19, fill, color, 25000, 0.8);
    text(slide, step.meta, { left: x + 82, top: y + 91, width: 118, height: 13 }, { fontSize: 7, bold: true, color, alignment: "center" }, "step-meta");
  }
  return mainCard;
}
function solidRight(slide, x1, x2, y, color = C.slate) {
  shape(slide, "rightArrow", { left: x1, top: y - 4, width: x2 - x1, height: 8 }, color, { width: 0, fill: color });
}
function solidLeft(slide, x1, x2, y, color = C.slate) {
  shape(slide, "leftArrow", { left: x1, top: y - 4, width: x2 - x1, height: 8 }, color, { width: 0, fill: color });
}
function solidDown(slide, x, y1, y2, color = C.slate) {
  shape(slide, "downArrow", { left: x - 5, top: y1, width: 10, height: y2 - y1 }, color, { width: 0, fill: color });
}
function dashedRight(slide, x1, x2, y, color) {
  for (let x = x1; x < x2 - 17; x += 11) shape(slide, "rect", { left: x, top: y - 1, width: Math.min(6, x2 - 17 - x), height: 2 }, color, { width: 0, fill: color });
  shape(slide, "rightArrow", { left: x2 - 17, top: y - 6, width: 17, height: 12 }, color, { width: 0, fill: color });
}
function dashedLeft(slide, x1, x2, y, color) {
  for (let x = x1 + 17; x < x2; x += 11) shape(slide, "rect", { left: x, top: y - 1, width: Math.min(6, x2 - x), height: 2 }, color, { width: 0, fill: color });
  shape(slide, "leftArrow", { left: x1, top: y - 6, width: 17, height: 12 }, color, { width: 0, fill: color });
}
function connectorLabel(slide, value, x, y, w, color = C.slate) {
  card(slide, x, y, w, 31, C.white, C.white, 2000, 0);
  text(slide, value, { left: x + 2, top: y + 2, width: w - 4, height: 27 }, { fontSize: 7.3, bold: true, color, alignment: "center" }, "connector-label");
}
function footer(slide, rule, accent = C.orange) {
  card(slide, 80, 625, 1120, 31, C.bg, accent, 4000, 1.1);
  text(slide, rule, { left: 96, top: 631, width: 1088, height: 19 }, { fontSize: 9, bold: true, color: C.slate, alignment: "center" }, "business-rule");
  text(slide, "Solid arrow: next command/action", { left: 82, top: 665, width: 230, height: 16 }, { fontSize: 8.3, color: C.muted }, "legend");
  text(slide, "Dashed arrow: callback/realtime update", { left: 325, top: 665, width: 270, height: 16 }, { fontSize: 8.3, color: C.muted }, "legend");
  text(slide, "Repository-aligned: origin/dev b5ad575", { left: 870, top: 665, width: 325, height: 16 }, { fontSize: 8.3, color: C.muted, alignment: "right" }, "source");
}
function flowSlide(data) {
  const slide = deck.slides.add();
  slideFrame(slide, data.title, data.subtitle);
  const topX = [80, 380, 680, 980], topY = 162;
  const bottomX = [980, 680, 380, 80], bottomY = 444;
  data.steps.slice(0,4).forEach((s,i) => stepCard(slide, s, topX[i], topY));
  data.steps.slice(4,8).forEach((s,i) => stepCard(slide, s, bottomX[i], bottomY));
  const dashed = new Set(data.dashedLinks ?? []);
  for (let i = 0; i < 3; i++) {
    const start = topX[i] + CARD_W, end = topX[i + 1];
    if (dashed.has(i)) dashedRight(slide, start, end, topY + 58, data.eventColor ?? C.purple);
    else solidRight(slide, start, end, topY + 58);
    connectorLabel(slide, `${i + 2}. ${data.steps[i + 1].title}`, start + 2, topY + 17, end - start - 4, dashed.has(i) ? (data.eventColor ?? C.purple) : C.slate);
  }
  solidDown(slide, topX[3] + CARD_W / 2, topY + 116, bottomY);
  connectorLabel(slide, `5. ${data.steps[4].title}`, topX[3] + 116, 334, 92, C.slate);
  for (let i = 0; i < 3; i++) {
    const linkIndex = 4 + i;
    const leftEdge = bottomX[i + 1] + CARD_W;
    const rightEdge = bottomX[i];
    if (dashed.has(linkIndex)) dashedLeft(slide, leftEdge, rightEdge, bottomY + 58, data.eventColor ?? C.purple);
    else solidLeft(slide, leftEdge, rightEdge, bottomY + 58);
    connectorLabel(slide, `${i + 6}. ${data.steps[i + 5].title}`, leftEdge + 2, bottomY + 16, rightEdge - leftEdge - 4, dashed.has(linkIndex) ? (data.eventColor ?? C.purple) : C.slate);
  }
  if (data.eventLabel) {
    card(slide, 382, 397, 686, 24, data.eventFill ?? C.purpleLight, data.eventColor ?? C.purple, 25000, 0.9);
    text(slide, data.eventLabel, { left: 396, top: 401, width: 658, height: 16 }, { fontSize: 8, bold: true, color: data.eventColor ?? C.purple, alignment: "center" }, "event-label");
  }
  footer(slide, data.rule, data.accent);
  slide.speakerNotes.setText(data.notes);
}

const scenarios = [
  {
    title: "Scenario 1: Account Onboarding & Vehicle Setup",
    subtitle: "A customer activates an account, receives JWT credentials, completes a profile, and prepares a primary vehicle for booking.",
    accent: C.blue,
    steps: [
      {n:1, kind:"user", glyph:"GO", title:"Open Register or Login", detail:"Choose email/password or Google authentication.", meta:"Customer entry"},
      {n:2, kind:"ui", glyph:"FM", title:"Submit Account Data", detail:"Frontend validates required registration fields.", meta:"POST /auth/register"},
      {n:3, kind:"ext", glyph:"OTP", title:"Send Verification OTP", detail:"Backend creates OTP and requests delivery through Resend.", meta:"POST /auth/otp/send"},
      {n:4, kind:"api", glyph:"OK", title:"Verify and Activate", detail:"Correct OTP activates the customer account.", meta:"POST /auth/otp/verify"},
      {n:5, kind:"success", glyph:"JWT", title:"Issue Access Tokens", detail:"Login or Google flow returns access and refresh tokens.", meta:"JWT secured APIs"},
      {n:6, kind:"ui", glyph:"PF", title:"Complete Customer Profile", detail:"Load and update personal information for bookings.", meta:"Profile API"},
      {n:7, kind:"api", glyph:"CAR", title:"Add a Vehicle", detail:"Create plate, brand/model and primary preference.", meta:"/customers/vehicles"},
      {n:8, kind:"success", glyph:"P", title:"Set Primary Vehicle", detail:"Primary selection becomes the booking default.", meta:"Duplicate plate errors"}
    ],
    rule:"Authentication protects customer routes with JWT; vehicle creation returns explicit validation errors such as duplicate license plates.",
    notes:"Registration uses the /api/v1/auth endpoints. OTP delivery is delegated to Resend. Vehicle CRUD and primary selection are exposed by customer vehicle APIs."
  },
  {
    title: "Scenario 2: Service-to-Slot Booking",
    subtitle: "The customer compares available offerings, selects a vehicle and date, then reserves capacity before entering booking details.",
    accent: C.cyan,
    steps: [
      {n:1, kind:"ui", glyph:"SV", title:"Browse Services", detail:"Load active car-care services and their details.", meta:"GET /services"},
      {n:2, kind:"ui", glyph:"PK", title:"Compare Packages", detail:"Review packages and included service items.", meta:"GET /packages"},
      {n:3, kind:"ui", glyph:"CB", title:"Check Available Combos", detail:"Display eligible combo offerings and benefits.", meta:"GET /combos/available"},
      {n:4, kind:"user", glyph:"CAR", title:"Select a Vehicle", detail:"Choose an owned vehicle, usually the primary vehicle.", meta:"Vehicle ID"},
      {n:5, kind:"user", glyph:"DAY", title:"Choose Booking Date", detail:"Customer selects the intended wash date.", meta:"Local date"},
      {n:6, kind:"api", glyph:"SL", title:"Load Slot Availability", detail:"Backend calculates capacity, holds and remaining slots.", meta:"GET /slots/availability"},
      {n:7, kind:"success", glyph:"H", title:"Hold the Selected Slot", detail:"Create a temporary reservation before booking submit.", meta:"POST /slots/hold"},
      {n:8, kind:"ui", glyph:"SUM", title:"Review Booking Setup", detail:"Show service, vehicle, date, slot and estimated price.", meta:"Continue checkout"}
    ],
    rule:"Available capacity equals configured slot capacity minus existing non-cancelled bookings and active holds; a hold expires after 15 minutes.",
    notes:"SlotService evaluates maxBookingsPerTimeSlot rather than relying on a frontend-only limit. Active holds are included in capacity calculations."
  },
  {
    title: "Scenario 3: Voucher, Staff Preference & Booking Creation",
    subtitle: "Optional discounts and staff preferences are validated before a transactional booking is created from the active slot hold.",
    accent: C.purple,
    steps: [
      {n:1, kind:"user", glyph:"VC", title:"Enter Voucher", detail:"Customer provides an optional promotion or voucher code.", meta:"Booking context"},
      {n:2, kind:"api", glyph:"%", title:"Validate Discount", detail:"Backend checks eligibility, validity and discount result.", meta:"/validate-voucher"},
      {n:3, kind:"api", glyph:"ST", title:"Request Staff Options", detail:"Load staff candidates available for the selected time.", meta:"/staff-options"},
      {n:4, kind:"user", glyph:"SEL", title:"Choose Staff Preference", detail:"Customer selects preferred staff or automatic assignment.", meta:"Optional preference"},
      {n:5, kind:"ui", glyph:"CHK", title:"Confirm Booking Data", detail:"Frontend submits vehicle, offering, slot and payment choice.", meta:"Create request"},
      {n:6, kind:"api", glyph:"API", title:"Create Booking", detail:"Backend validates hold, capacity, voucher and ownership.", meta:"POST /customers/bookings"},
      {n:7, kind:"data", glyph:"DB", title:"Commit Transaction", detail:"Persist booking/payment, consume voucher and delete hold.", meta:"PostgreSQL"},
      {n:8, kind:"success", glyph:"P", title:"Return Pending Booking", detail:"Response includes booking status and payment information.", meta:"PENDING"}
    ],
    rule:"Booking creation is server-authoritative: the active hold is removed only after the booking transaction succeeds, preventing duplicate capacity usage.",
    notes:"The create flow persists booking and payment data, consumes an eligible voucher, removes the slot hold, and publishes BOOKING_UPDATE."
  },
  {
    title: "Scenario 4: Payment Confirmation",
    subtitle: "Online payment is verified by the backend before the booking becomes confirmed and eligible for wash operations.",
    accent: C.orange,
    dashedLinks:[2],
    eventColor:C.orange,
    eventFill:C.orangeLight,
    eventLabel:"Dashed connection: SePay webhook or VNPay IPN/query callback is verified by Spring Boot before confirmation",
    steps: [
      {n:1, kind:"user", glyph:"PAY", title:"Select Payment Method", detail:"Choose supported payment option during booking creation.", meta:"Payment method"},
      {n:2, kind:"api", glyph:"SP", title:"Prepare SePay Transfer", detail:"Generate payment code and VietQR information.", meta:"BANK_TRANSFER"},
      {n:3, kind:"ext", glyph:"QR", title:"Customer Transfers Funds", detail:"Customer pays using the generated bank-transfer content.", meta:"SePay / VietQR"},
      {n:4, kind:"ext", glyph:"WH", title:"Receive Signed Webhook", detail:"Verify HMAC signature, timestamp and payment code.", meta:"/payments/sepay/webhook"},
      {n:5, kind:"api", glyph:"VP", title:"VNPay Alternative", detail:"Create checkout URL and handle return, IPN or query.", meta:"VNPay endpoints"},
      {n:6, kind:"data", glyph:"DB", title:"Mark Payment Paid", detail:"Persist the verified successful payment transaction.", meta:"PAID"},
      {n:7, kind:"success", glyph:"CF", title:"Confirm Booking", detail:"Booking changes from pending payment to confirmed.", meta:"CONFIRMED"},
      {n:8, kind:"success", glyph:"ST", title:"Assign Staff and Notify", detail:"Select available staff and publish booking update.", meta:"BOOKING_UPDATE"}
    ],
    rule:"The frontend never confirms an online payment by itself; only a verified SePay webhook or VNPay IPN/query result can mark the booking CONFIRMED.",
    notes:"SePay validates signed webhooks. VNPay supports checkout, return, IPN and query. Successful verification marks payment paid and booking confirmed."
  },
  {
    title: "Scenario 5: Staff Assignment, Queue & Check-in",
    subtitle: "Operational users turn a confirmed booking into a wash session and advance it through controlled lifecycle transitions.",
    accent: C.purple,
    steps: [
      {n:1, kind:"ui", glyph:"OPS", title:"Open Operations Queue", detail:"Staff or manager views operational booking data.", meta:"Operations workspace"},
      {n:2, kind:"api", glyph:"EL", title:"Load Eligible Bookings", detail:"Only confirmed bookings can start a wash session.", meta:"/eligible-sessions"},
      {n:3, kind:"api", glyph:"AS", title:"Resolve Staff Assignment", detail:"Use assignment, availability and workload information.", meta:"Staff options"},
      {n:4, kind:"api", glyph:"NEW", title:"Create Wash Session", detail:"Create session linked to booking and assigned staff.", meta:"PENDING"},
      {n:5, kind:"api", glyph:"Q", title:"Move Session to Queue", detail:"Operational queue accepts the prepared wash session.", meta:"QUEUED"},
      {n:6, kind:"user", glyph:"IN", title:"Check In Vehicle", detail:"Staff confirms the vehicle has arrived for service.", meta:"CHECKED_IN"},
      {n:7, kind:"api", glyph:"GO", title:"Start Washing", detail:"Session and booking move to active execution.", meta:"IN_PROGRESS"},
      {n:8, kind:"data", glyph:"EV", title:"Persist and Broadcast", detail:"Save lifecycle state and publish realtime update.", meta:"WASH_SESSION_UPDATE"}
    ],
    rule:"Lifecycle transitions are validated by the backend: PENDING -> QUEUED -> CHECKED_IN -> IN_PROGRESS -> COMPLETED, with CANCELLED as a terminal alternative.",
    notes:"Operations endpoints create and transition WashSession entities. Confirmed booking eligibility is enforced before session creation."
  },
  {
    title: "Scenario 6: Wash Progress & Realtime Customer Tracking",
    subtitle: "The customer follows the active wash session while staff actions update persisted state and notify subscribed dashboards.",
    accent: C.cyan,
    dashedLinks:[5],
    eventColor:C.purple,
    eventFill:C.purpleLight,
    eventLabel:"Dashed connection: STOMP /topic/bookings event causes subscribed clients to invalidate and reload React Query data",
    steps: [
      {n:1, kind:"user", glyph:"TR", title:"Open Wash Tracking", detail:"Customer opens the active booking or tracking page.", meta:"Customer workspace"},
      {n:2, kind:"ui", glyph:"GET", title:"Request Active Session", detail:"Load active tracking or a selected session by ID.", meta:"/wash-tracking/active"},
      {n:3, kind:"api", glyph:"API", title:"Load Session Context", detail:"Resolve booking, status, staff and timestamps.", meta:"Tracking service"},
      {n:4, kind:"data", glyph:"DB", title:"Read Current State", detail:"PostgreSQL remains the authoritative session state.", meta:"Session + booking"},
      {n:5, kind:"user", glyph:"UP", title:"Staff Updates Progress", detail:"Queue, check-in, start or completion command is submitted.", meta:"Operations API"},
      {n:6, kind:"api", glyph:"WS", title:"Publish Realtime Event", detail:"Backend emits booking or wash-session update.", meta:"/topic/bookings"},
      {n:7, kind:"ui", glyph:"RQ", title:"Refresh Client Cache", detail:"React Query caches are invalidated and reloaded.", meta:"Polling fallback"},
      {n:8, kind:"success", glyph:"LIVE", title:"Display Current Progress", detail:"Customer sees latest status, staff and timing data.", meta:"Near realtime"}
    ],
    rule:"WebSocket improves freshness but does not replace persisted state; reconnecting clients reload data and polling remains the fallback mechanism.",
    notes:"The frontend uses STOMP/SockJS. Backend publishes BOOKING_UPDATE and WASH_SESSION_UPDATE events on /topic/bookings."
  },
  {
    title: "Scenario 7: Completion, Loyalty, Tier & Review",
    subtitle: "Completing the wash finalizes operational and payment state, awards points, updates tier progress, and unlocks a booking review.",
    accent: C.green,
    steps: [
      {n:1, kind:"user", glyph:"DONE", title:"Complete Wash Session", detail:"Authorized operations user submits completion.", meta:"COMPLETED"},
      {n:2, kind:"data", glyph:"BK", title:"Complete the Booking", detail:"Booking status is synchronized with the wash session.", meta:"Booking COMPLETED"},
      {n:3, kind:"data", glyph:"PAY", title:"Finalize Payment State", detail:"Completion marks the associated payment paid where required.", meta:"PAID"},
      {n:4, kind:"success", glyph:"PTS", title:"Award Loyalty Points", detail:"Create an earn transaction based on completed service.", meta:"Point history"},
      {n:5, kind:"success", glyph:"T", title:"Recalculate Tier", detail:"Updated points determine the customer loyalty tier.", meta:"Tier progress"},
      {n:6, kind:"ui", glyph:"SUM", title:"Show Completion Summary", detail:"Display service, amount, completion time and awarded points.", meta:"/completion-summary"},
      {n:7, kind:"user", glyph:"5", title:"Submit Booking Review", detail:"Customer rates the completed booking and adds comments/images.", meta:"One review / booking"},
      {n:8, kind:"success", glyph:"+10", title:"Award Review Bonus", detail:"Persist review and add the configured review-point bonus.", meta:"+10 points"}
    ],
    rule:"Reviews are accepted only for COMPLETED bookings, are limited to one per booking, and can store before/after image URLs in AWS S3.",
    notes:"Completion triggers payment state, loyalty earn transaction and notification. Review creation grants a ten-point review bonus."
  },
  {
    title: "Scenario 8: Admin Insights & History",
    subtitle: "Customers revisit their service records while managers and administrators monitor bookings, vehicles, staff performance, reviews and revenue.",
    accent: C.orange,
    steps: [
      {n:1, kind:"user", glyph:"HIS", title:"Open Booking History", detail:"Customer views past and active bookings separately.", meta:"History workspace"},
      {n:2, kind:"ui", glyph:"DT", title:"View Booking Detail", detail:"Load booking, selected service, payment and staff data.", meta:"Booking ID"},
      {n:3, kind:"ui", glyph:"CAR", title:"View Booking Vehicle", detail:"Display plate, model, owner metadata and service history.", meta:"Vehicle detail"},
      {n:4, kind:"api", glyph:"X", title:"Cancel Eligible Booking", detail:"Backend validates whether cancellation is still allowed.", meta:"Cancel endpoint"},
      {n:5, kind:"ui", glyph:"FLT", title:"Filter Admin Bookings", detail:"Search by customer, plate, phone, status, package and date.", meta:"Booking management"},
      {n:6, kind:"ui", glyph:"ST", title:"Monitor Staff Workload", detail:"Review availability, assignments and completed daily orders.", meta:"Staff KPI"},
      {n:7, kind:"data", glyph:"REP", title:"Aggregate Reports", detail:"Combine bookings, sessions, ratings and revenue.", meta:"Reporting APIs"},
      {n:8, kind:"success", glyph:"KPI", title:"Display Management KPI", detail:"Admin and manager dashboards present operational insights.", meta:"Dashboard"}
    ],
    rule:"Administrative views consume server data through dedicated APIs; booking, vehicle and KPI values must not depend on frontend mock or fallback datasets.",
    notes:"The project exposes booking management, vehicle detail, staff metrics, review and report APIs for role-specific dashboards."
  }
];

scenarios.forEach(flowSlide);

await fs.mkdir(PREVIEW, { recursive: true });
for (let i = 0; i < deck.slides.count; i++) {
  const rendered = await deck.export({ slide: deck.slides.getItem(i), format: "png", scale: 1 });
  const path = `${PREVIEW}/slide-${String(i + 1).padStart(2, "0")}.png`;
  if (typeof rendered.save === "function") await rendered.save(path);
  else if (typeof rendered.arrayBuffer === "function") await fs.writeFile(path, Buffer.from(await rendered.arrayBuffer()));
  else await fs.writeFile(path, Buffer.from(rendered));
}
await fs.writeFile(INSPECT, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(OUT);
console.log(OUT);
