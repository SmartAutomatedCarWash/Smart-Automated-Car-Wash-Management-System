import fs from "node:fs/promises";

const { Presentation, PresentationFile } = await import("@oai/artifact-tool");

const OUT = "E:/SU26/SWP391/presentation-output/autowash-context-slide/output.pptx";
const PREVIEW = "E:/SU26/SWP391/presentation-output/autowash-context-slide/tmp/preview/context.png";

const presentation = Presentation.create({
  slideSize: { width: 1280, height: 720 },
});

presentation.theme.colorScheme = {
  name: "Aura Car Care",
  themeColors: {
    accent1: "#08BFD3",
    accent2: "#0F172A",
    bg1: "#FFFFFF",
    bg2: "#EEF9FA",
    tx1: "#0B1220",
    tx2: "#475569",
  },
};

const slide = presentation.slides.add();
slide.background.fill = "#FFFFFF";

function addShape(slide, geometry, position, fill, line) {
  return slide.shapes.add({ geometry, position, fill, line });
}

function addText(slide, text, position, style = {}) {
  const shape = slide.shapes.add({
    geometry: "rect",
    position,
    fill: { color: "#FFFFFF", transparency: 100000 },
    line: { width: 0, fill: "#FFFFFF" },
  });
  shape.text = text;
  shape.text.typeface = style.typeface ?? "Poppins";
  shape.text.fontSize = style.fontSize ?? 20;
  shape.text.color = style.color ?? "#0B1220";
  shape.text.bold = Boolean(style.bold);
  shape.text.alignment = style.alignment ?? "left";
  shape.text.verticalAlignment = style.verticalAlignment ?? "top";
  shape.text.insets = style.insets ?? { left: 0, right: 0, top: 0, bottom: 0 };
  shape.text.autoFit = "shrinkText";
  return shape;
}

function addLine(slide, x1, y1, x2, y2, color = "#0B1220", width = 3) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return slide.shapes.add({
    geometry: "rect",
    position: {
      left: x1,
      top: y1 - width / 2,
      width: length,
      height: width,
      rotation: angle,
    },
    fill: color,
    line: { width: 0, fill: color },
  });
}

function addIcon(slide, kind, cx, cy) {
  const stroke = { style: "solid", fill: "#0B1220", width: 2.2 };
  const cyanStroke = { style: "solid", fill: "#08BFD3", width: 2.4 };
  addShape(slide, "ellipse", { left: cx - 34, top: cy - 34, width: 68, height: 68 }, "#0B1220", { width: 0, fill: "#0B1220" });

  if (kind === "booking") {
    addShape(slide, "roundRect", { left: cx - 20, top: cy - 13, width: 40, height: 34 }, "#FFFFFF", stroke);
    addLine(slide, cx - 20, cy - 4, cx + 20, cy - 4, "#0B1220", 2);
    addLine(slide, cx - 10, cy - 20, cx - 10, cy - 8, "#08BFD3", 3);
    addLine(slide, cx + 10, cy - 20, cx + 10, cy - 8, "#08BFD3", 3);
    addShape(slide, "ellipse", { left: cx - 11, top: cy + 5, width: 6, height: 6 }, "#08BFD3", { width: 0, fill: "#08BFD3" });
    addShape(slide, "ellipse", { left: cx + 5, top: cy + 5, width: 6, height: 6 }, "#08BFD3", { width: 0, fill: "#08BFD3" });
  } else if (kind === "slot") {
    addShape(slide, "ellipse", { left: cx - 21, top: cy - 21, width: 42, height: 42 }, "#FFFFFF", stroke);
    addLine(slide, cx, cy, cx, cy - 14, "#08BFD3", 3);
    addLine(slide, cx, cy, cx + 13, cy + 8, "#08BFD3", 3);
    addShape(slide, "roundRect", { left: cx - 31, top: cy + 22, width: 62, height: 13 }, "#FFFFFF", cyanStroke);
  } else if (kind === "ops") {
    addShape(slide, "roundRect", { left: cx - 24, top: cy - 22, width: 48, height: 44 }, "#FFFFFF", stroke);
    addLine(slide, cx - 12, cy - 7, cx - 3, cy + 3, "#08BFD3", 3);
    addLine(slide, cx - 3, cy + 3, cx + 15, cy - 15, "#08BFD3", 3);
    addLine(slide, cx - 15, cy + 14, cx + 16, cy + 14, "#0B1220", 2);
  } else if (kind === "retention") {
    addShape(slide, "ellipse", { left: cx - 20, top: cy - 20, width: 40, height: 40 }, "#FFFFFF", stroke);
    addShape(slide, "star5", { left: cx - 11, top: cy - 11, width: 22, height: 22 }, "#08BFD3", { width: 0, fill: "#08BFD3" });
    addShape(slide, "roundRect", { left: cx - 28, top: cy + 20, width: 56, height: 15 }, "#FFFFFF", cyanStroke);
  } else {
    addShape(slide, "roundRect", { left: cx - 24, top: cy - 24, width: 48, height: 48 }, "#FFFFFF", stroke);
    addLine(slide, cx - 13, cy + 12, cx - 13, cy - 4, "#08BFD3", 5);
    addLine(slide, cx, cy + 12, cx, cy - 14, "#08BFD3", 5);
    addLine(slide, cx + 13, cy + 12, cx + 13, cy - 9, "#08BFD3", 5);
  }
}

addShape(slide, "rect", { left: 0, top: 0, width: 1280, height: 720 }, "#FFFFFF", { width: 0, fill: "#FFFFFF" });
addShape(slide, "rect", { left: 0, top: 0, width: 14, height: 720 }, "#151515", { width: 0, fill: "#151515" });
addShape(slide, "ellipse", { left: -32, top: 558, width: 92, height: 92 }, "#4F7BD9", { style: "solid", fill: "#FFFFFF", width: 3 });
addText(slide, "P", { left: -5, top: 574, width: 45, height: 50 }, { fontSize: 38, bold: true, color: "#FFFFFF", alignment: "center", verticalAlignment: "middle" });
addShape(slide, "rect", { left: 1188, top: 108, width: 18, height: 164, rotation: 0 }, "#7C3AED", { width: 0, fill: "#7C3AED" });
addShape(slide, "rect", { left: 1212, top: 108, width: 18, height: 164, rotation: 0 }, "#08BFD3", { width: 0, fill: "#08BFD3" });

addText(slide, "Context", { left: 0, top: 44, width: 1280, height: 60 }, {
  fontSize: 42,
  bold: true,
  alignment: "center",
  verticalAlignment: "middle",
});

const cards = [
  {
    kind: "booking",
    title: "Manual & Fragmented Booking",
    body: "Customers still depend on multiple steps or direct contact, causing delays, duplicated information, and booking mistakes.",
  },
  {
    kind: "slot",
    title: "Limited Slot & Staff Visibility",
    body: "Customers cannot clearly see available time slots, while managers struggle to track staff availability and workload.",
  },
  {
    kind: "ops",
    title: "Inefficient Operation Monitoring",
    body: "Check-in, staff assignment, washing progress, payment status, and booking completion are not centrally tracked in real time.",
  },
  {
    kind: "retention",
    title: "Weak Customer Retention",
    body: "Service history, ratings, membership tiers, reward points, vouchers, and promotions are not strongly connected.",
  },
  {
    kind: "report",
    title: "Lack of Centralized Insights",
    body: "Admins and managers need clearer dashboards to monitor revenue, staff performance, booking volume, and service quality.",
  },
];

const cardW = 210;
const cardH = 314;
const gap = 28;
const startX = (1280 - cards.length * cardW - (cards.length - 1) * gap) / 2;
const top = 164;

cards.forEach((card, index) => {
  const left = startX + index * (cardW + gap);
  addShape(slide, "roundRect", { left: left + 7, top: top + 8, width: cardW, height: cardH }, "#11111120", { width: 0, fill: "#11111120" });
  addShape(slide, "roundRect", { left, top, width: cardW, height: cardH }, "#FFFFFF", { style: "solid", fill: "#0B1220", width: 4 });
  addShape(slide, "roundRect", { left: left + 10, top: top + 10, width: cardW - 20, height: cardH - 20 }, "#FFFFFF", { style: "solid", fill: "#08BFD3", width: 1.2 });
  addIcon(slide, card.kind, left + cardW / 2, top + 64);
  addText(slide, card.title, { left: left + 18, top: top + 118, width: cardW - 36, height: 66 }, {
    fontSize: 17,
    bold: true,
    alignment: "center",
    verticalAlignment: "middle",
    insets: { left: 4, right: 4, top: 0, bottom: 0 },
  });
  addShape(slide, "rect", { left: left + 50, top: top + 190, width: cardW - 100, height: 3 }, "#08BFD3", { width: 0, fill: "#08BFD3" });
  addText(slide, card.body, { left: left + 18, top: top + 210, width: cardW - 36, height: 82 }, {
    typeface: "Lato",
    fontSize: 13.5,
    color: "#475569",
    alignment: "center",
    verticalAlignment: "top",
    insets: { left: 2, right: 2, top: 0, bottom: 0 },
  });
});

addText(slide, "Smart Automated Car Wash Management System", { left: 56, top: 654, width: 520, height: 26 }, {
  typeface: "Lato",
  fontSize: 15,
  color: "#64748B",
});
addShape(slide, "rect", { left: 1032, top: 662, width: 144, height: 4 }, "#08BFD3", { width: 0, fill: "#08BFD3" });
addShape(slide, "rect", { left: 1184, top: 662, width: 44, height: 4 }, "#0B1220", { width: 0, fill: "#0B1220" });

const preview = await presentation.export({ slide, format: "png", scale: 1 });
if (typeof preview.save === "function") {
  await preview.save(PREVIEW);
} else if (typeof preview.arrayBuffer === "function") {
  await fs.writeFile(PREVIEW, Buffer.from(await preview.arrayBuffer()));
} else {
  await fs.writeFile(PREVIEW, Buffer.from(preview));
}

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(OUT);

console.log(OUT);
