import { jsPDF } from "jspdf";
import type { RoiDocument } from "./types";

/** The document is set at 1.15 line spacing throughout. */
const LINE_SPACING = 1.15;

const PAGE = { width: 612, height: 792 };
const MARGIN = { top: 62, right: 64, bottom: 58, left: 64 };
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;

const INK: [number, number, number] = [31, 36, 33];
const MUTED: [number, number, number] = [124, 133, 127];
const FOREST: [number, number, number] = [34, 64, 47];
const FORMULA_BG: [number, number, number] = [253, 246, 231];
const FORMULA_RULE: [number, number, number] = [235, 189, 91];
const SAY_BG: [number, number, number] = [230, 240, 233];
const HAIRLINE: [number, number, number] = [228, 223, 214];

type Ctx = { doc: jsPDF; y: number; page: number };

export function buildPdf(document: RoiDocument): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });
  doc.setLineHeightFactor(LINE_SPACING);
  const ctx: Ctx = { doc, y: MARGIN.top, page: 1 };

  drawMasthead(ctx, document);
  drawHeadline(ctx, document);
  paragraph(ctx, document.opening, { size: 10.5, font: ["helvetica", "normal"] });
  space(ctx, 6);

  document.sections.forEach((section, index) => {
    ensure(ctx, 150);
    space(ctx, index === 0 ? 10 : 16);
    drawSectionHeader(ctx, section.rank, section.pillarName, section.subtitle);
    drawSectionNumber(ctx, section.headline, section.kind);
    space(ctx, 2);
    if (section.formulaText) {
      drawFormulaBox(ctx, section.formulaText, section.workedFormula);
    }
    if (section.figures.length) drawFigures(ctx, section.figures);
    drawBusinessCase(ctx, section.businessCase);
  });

  space(ctx, 16);
  ensure(ctx, 90);
  rule(ctx);
  space(ctx, 12);

  if (document.gaps.length) {
    space(ctx, 14);
    drawList(ctx, "Add these to unlock more pillars", document.gaps);
  }
  if (document.assumptions.length) {
    space(ctx, 12);
    drawList(ctx, "Numbers we estimated", document.assumptions);
  }
  if (document.setAside.length) {
    space(ctx, 12);
    drawList(
      ctx,
      "Pillars we could not match",
      document.setAside.map((entry) => `${entry.pillarName}: ${entry.reason}`),
    );
  }
  if (document.metricsUsed.length) {
    space(ctx, 12);
    drawList(
      ctx,
      "Numbers you gave us",
      document.metricsUsed.map((metric) => `${metric.label}: ${metric.value}`),
    );
  }

  stampFooters(doc, document);
  return doc;
}

export function downloadPdf(document: RoiDocument): void {
  const slug = (document.accountName ?? "abode-roi")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  buildPdf(document).save(`${slug || "abode-roi"}-roi-review.pdf`);
}

/* ------------------------------------------------------------------ layout */

function ensure(ctx: Ctx, needed: number): void {
  if (ctx.y + needed <= PAGE.height - MARGIN.bottom) return;
  ctx.doc.addPage();
  ctx.page += 1;
  ctx.y = MARGIN.top;
}

function space(ctx: Ctx, amount: number): void {
  ctx.y += amount;
}

function rule(ctx: Ctx, color: [number, number, number] = HAIRLINE): void {
  ctx.doc.setDrawColor(...color);
  ctx.doc.setLineWidth(0.6);
  ctx.doc.line(MARGIN.left, ctx.y, MARGIN.left + CONTENT_WIDTH, ctx.y);
}

type TextOpts = {
  size: number;
  font: [string, string];
  color?: [number, number, number];
  width?: number;
  x?: number;
  spacingAfter?: number;
};

function paragraph(ctx: Ctx, text: string, opts: TextOpts): void {
  if (!text) return;
  const width = opts.width ?? CONTENT_WIDTH;
  const x = opts.x ?? MARGIN.left;
  const lineHeight = opts.size * LINE_SPACING;
  ctx.doc.setFont(opts.font[0], opts.font[1]);
  ctx.doc.setFontSize(opts.size);
  ctx.doc.setTextColor(...(opts.color ?? INK));
  const lines = ctx.doc.splitTextToSize(text, width) as string[];
  for (const line of lines) {
    ensure(ctx, lineHeight);
    ctx.doc.text(line, x, ctx.y + opts.size * 0.86);
    ctx.y += lineHeight;
  }
  ctx.y += opts.spacingAfter ?? 0;
}

function measure(doc: jsPDF, text: string, size: number, font: [string, string], width: number) {
  doc.setFont(font[0], font[1]);
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, width) as string[];
  return { lines, height: lines.length * size * LINE_SPACING };
}

/* ----------------------------------------------------------------- blocks */

function drawMasthead(ctx: Ctx, document: RoiDocument): void {
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(7.5);
  ctx.doc.setTextColor(...FOREST);
  ctx.doc.text("ABODE  ·  ROI STORY", MARGIN.left, ctx.y);
  ctx.y += 18;

  paragraph(ctx, document.title, { size: 21, font: ["helvetica", "bold"] });
  space(ctx, 2);
  paragraph(ctx, document.subtitle, { size: 9.5, font: ["helvetica", "normal"], color: MUTED });
  space(ctx, 8);
  rule(ctx);
  space(ctx, 16);
}

function drawHeadline(ctx: Ctx, document: RoiDocument): void {
  const size = 13.5;
  const { lines, height } = measure(ctx.doc, document.headline, size, ["helvetica", "bold"], CONTENT_WIDTH - 14);
  ensure(ctx, height + 8);
  ctx.doc.setDrawColor(...FOREST);
  ctx.doc.setLineWidth(2);
  ctx.doc.line(MARGIN.left, ctx.y - 2, MARGIN.left, ctx.y + height);
  ctx.doc.setTextColor(...FOREST);
  lines.forEach((line, index) => {
    ctx.doc.text(line, MARGIN.left + 14, ctx.y + size * 0.86 + index * size * LINE_SPACING);
  });
  ctx.y += height + 14;
}

function drawSectionHeader(ctx: Ctx, rank: number, name: string, subtitle: string): void {
  ensure(ctx, 40);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(...FOREST);
  ctx.doc.text(`${rank}.  ${name.toUpperCase()}`, MARGIN.left, ctx.y);
  ctx.y += 13;
  paragraph(ctx, subtitle, { size: 9.5, font: ["helvetica", "italic"], color: MUTED });
  space(ctx, 4);
}

function drawSectionNumber(ctx: Ctx, headline: string, kind: "hard" | "narrative"): void {
  const size = kind === "hard" ? 19 : 15;
  paragraph(ctx, headline, { size, font: ["helvetica", "bold"], color: FOREST });
  space(ctx, 5);
}

function drawFormulaBox(ctx: Ctx, formulaText: string, worked: string): void {
  const padding = 10;
  const innerWidth = CONTENT_WIDTH - padding * 2;
  const label = measure(ctx.doc, formulaText, 8, ["helvetica", "normal"], innerWidth);
  const body = measure(ctx.doc, worked, 9, ["courier", "bold"], innerWidth);
  const boxHeight = padding * 2 + 11 + label.height + 4 + body.height;

  ensure(ctx, boxHeight + 10);
  ctx.doc.setFillColor(...FORMULA_BG);
  ctx.doc.rect(MARGIN.left, ctx.y, CONTENT_WIDTH, boxHeight, "F");
  ctx.doc.setFillColor(...FORMULA_RULE);
  ctx.doc.rect(MARGIN.left, ctx.y, 2.5, boxHeight, "F");

  let inner = ctx.y + padding;
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(7);
  ctx.doc.setTextColor(138, 106, 26);
  ctx.doc.text("HOW WE GOT THERE", MARGIN.left + padding, inner + 6);
  inner += 13;

  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(...MUTED);
  label.lines.forEach((line, i) => {
    ctx.doc.text(line, MARGIN.left + padding, inner + 6.9 + i * 8 * LINE_SPACING);
  });
  inner += label.height + 4;

  ctx.doc.setFont("courier", "bold");
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...INK);
  body.lines.forEach((line, i) => {
    ctx.doc.text(line, MARGIN.left + padding, inner + 7.7 + i * 9 * LINE_SPACING);
  });

  ctx.y += boxHeight + 10;
}

function drawFigures(ctx: Ctx, figures: { label: string; value: string }[]): void {
  const labelWidth = CONTENT_WIDTH * 0.46;
  const valueWidth = CONTENT_WIDTH - labelWidth - 12;
  for (const figure of figures) {
    const label = measure(ctx.doc, figure.label, 9, ["helvetica", "normal"], labelWidth);
    const value = measure(ctx.doc, figure.value, 9, ["helvetica", "bold"], valueWidth);
    const height = Math.max(label.height, value.height) + 5;
    ensure(ctx, height);
    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(9);
    ctx.doc.setTextColor(...MUTED);
    label.lines.forEach((line, i) => {
      ctx.doc.text(line, MARGIN.left, ctx.y + 7.7 + i * 9 * LINE_SPACING);
    });
    ctx.doc.setFont("helvetica", "bold");
    ctx.doc.setTextColor(...INK);
    value.lines.forEach((line, i) => {
      ctx.doc.text(line, MARGIN.left + labelWidth + 12, ctx.y + 7.7 + i * 9 * LINE_SPACING);
    });
    ctx.y += height;
  }
  space(ctx, 8);
}

function drawBusinessCase(ctx: Ctx, points: string[]): void {
  if (points.length === 0) return;
  const padding = 10;
  const bulletIndent = 11;
  const innerWidth = CONTENT_WIDTH - padding * 2 - bulletIndent;
  const size = 9.5;
  const gap = 5;

  const measured = points.map((point) =>
    measure(ctx.doc, point, size, ["helvetica", "normal"], innerWidth),
  );
  const bodyHeight =
    measured.reduce((total, item) => total + item.height, 0) + gap * (points.length - 1);
  const boxHeight = padding * 2 + 13 + bodyHeight;

  ensure(ctx, boxHeight + 10);
  ctx.doc.setFillColor(...SAY_BG);
  ctx.doc.rect(MARGIN.left, ctx.y, CONTENT_WIDTH, boxHeight, "F");
  ctx.doc.setFillColor(...FOREST);
  ctx.doc.rect(MARGIN.left, ctx.y, 2.5, boxHeight, "F");

  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(7);
  ctx.doc.setTextColor(...FOREST);
  ctx.doc.text("HOW THIS CREATES VALUE", MARGIN.left + padding, ctx.y + padding + 6);

  let cursor = ctx.y + padding + 13;
  measured.forEach((item) => {
    ctx.doc.setFont("helvetica", "bold");
    ctx.doc.setFontSize(size);
    ctx.doc.setTextColor(...FOREST);
    ctx.doc.text("·", MARGIN.left + padding, cursor + size * 0.86);

    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setTextColor(...INK);
    item.lines.forEach((line, i) => {
      ctx.doc.text(
        line,
        MARGIN.left + padding + bulletIndent,
        cursor + size * 0.86 + i * size * LINE_SPACING,
      );
    });
    cursor += item.height + gap;
  });

  ctx.y += boxHeight + 10;
}

function drawList(ctx: Ctx, title: string, items: string[]): void {
  ensure(ctx, 40);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(7.5);
  ctx.doc.setTextColor(...FOREST);
  ctx.doc.text(title.toUpperCase(), MARGIN.left, ctx.y);
  ctx.y += 12;
  for (const item of items) {
    const body = measure(ctx.doc, item, 9, ["helvetica", "normal"], CONTENT_WIDTH - 12);
    ensure(ctx, body.height + 3);
    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(9);
    ctx.doc.setTextColor(...INK);
    ctx.doc.text("·", MARGIN.left, ctx.y + 7.7);
    body.lines.forEach((line, i) => {
      ctx.doc.text(line, MARGIN.left + 12, ctx.y + 7.7 + i * 9 * LINE_SPACING);
    });
    ctx.y += body.height + 3;
  }
}

function stampFooters(doc: jsPDF, document: RoiDocument): void {
  const total = doc.getNumberOfPages();
  const stamp = new Date(document.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...HAIRLINE);
    doc.setLineWidth(0.5);
    doc.line(
      MARGIN.left,
      PAGE.height - MARGIN.bottom + 18,
      PAGE.width - MARGIN.right,
      PAGE.height - MARGIN.bottom + 18,
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `Abode ROI story · ${document.accountName ?? "Your program"} · ${stamp}`,
      MARGIN.left,
      PAGE.height - MARGIN.bottom + 30,
    );
    doc.text(
      `${page} / ${total}`,
      PAGE.width - MARGIN.right,
      PAGE.height - MARGIN.bottom + 30,
      { align: "right" },
    );
  }
}
