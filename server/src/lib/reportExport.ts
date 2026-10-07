import PDFDocument from "pdfkit";
import type { Workbook, Cell, Row } from "exceljs";

// =============================================================================
//  reportExport.ts  (Step 19, Phase 11)
//
//  Turns report data into downloadable files: CSV, Excel (.xlsx) and PDF.
//
//  ONE CALCULATION PATH. Nothing in here works out a metric. The builders take the numbers
//  that reportingService.ts already produced for the Reports page and lay them out as an
//  "ExportDocument" (titled sections of rows). The three renderers then turn that one document
//  into a file, so a CSV, a workbook and a PDF of the same report can never disagree.
//
//  HONESTY RULES
//    - A rate with nothing to measure is null and is written as "No data", never as 0.
//    - Every file says its scope, its period and the moment it was made.
//    - A records export is capped; when it is cut short the file says so.
//
//  SAFETY
//    - CSV: any text cell that starts with = + - @ (or a tab / carriage return) gets a leading
//      apostrophe, so a spreadsheet can never run it as a formula ("CSV injection").
//    - Excel: text is stored as text (never as a formula).
//    - PDF: text is reduced to what the built-in PDF fonts can draw, so odd characters become
//      "?" instead of garbage.
//
//  Authorization is NOT handled here - the controller verifies the scope before any data is read.
// =============================================================================

export type CellValue = string | number | null;
export type ColumnKind = "text" | "money" | "count" | "percent" | "byUnit";

export interface ExportColumn {
  header: string;
  kind: ColumnKind;
  // Relative width weight in the PDF (and a hint for Excel). Defaults: text 3, numbers 1.3.
  width?: number;
}

export interface ExportSection {
  title: string;
  sheetName?: string;
  note?: string;
  columns: ExportColumn[];
  rows: CellValue[][];
}

export interface ExportDocument {
  title: string;
  scopeLabel: string;
  // "" when no date range applies to the report
  rangeLabel: string;
  generatedAt: string;
  // stacked: every section on one sheet / page flow.  sheets: one Excel sheet per section.
  layout: "stacked" | "sheets";
  // PDF page direction; wide tables use landscape. Defaults to portrait.
  orientation?: "portrait" | "landscape";
  sections: ExportSection[];
  notes: string[];
}

export interface ExportMeta {
  scopeLabel: string;
  rangeLabel: string;
  generatedAt: string;
}

export type ExportFormat = "csv" | "xlsx" | "pdf";

// Records exports read everything behind a number in ONE query; this is the most rows a file may hold.
export const EXPORT_MAX_ROWS = 2000;

export const EXPORT_CONTENT_TYPES: { [format: string]: string } = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

// -----------------------------------------------------------------------------
//  small helpers
// -----------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function two(n: number): string {
  return (n < 10 ? "0" : "") + n;
}

function dayLabel(d: Date): string {
  return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear();
}

function ymd(d: Date): string {
  return d.getUTCFullYear() + "-" + two(d.getUTCMonth() + 1) + "-" + two(d.getUTCDate());
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function describeRange(range: { from: Date; to: Date }): string {
  return dayLabel(range.from) + " to " + dayLabel(range.to);
}

export function describeMoment(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return dayLabel(d) + ", " + two(d.getUTCHours()) + ":" + two(d.getUTCMinutes()) + " UTC";
}

function prettyStatus(s: string): string {
  const t = String(s).toLowerCase().replace(/_/g, " ").trim();
  return t.length > 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

export function exportFileName(
  report: string,
  format: ExportFormat,
  range: { from: Date; to: Date },
  extra?: string
): string {
  const clean = (s: string) => String(s).replace(/[^a-zA-Z0-9_-]/g, "");
  const middle = extra ? "-" + clean(extra) : "";
  return "askderek-" + clean(report) + middle + "-" + ymd(range.from) + "-to-" + ymd(range.to) + "." + format;
}

type PlainKind = "text" | "money" | "count" | "percent";

function unitKind(unit: CellValue): PlainKind {
  if (unit === "GHS") return "money";
  if (unit === "%") return "percent";
  return "count";
}

// What a cell really is: "byUnit" columns take their kind from the unit text in the next column.
function kindOf(col: ExportColumn, row: CellValue[], index: number): PlainKind {
  if (col.kind !== "byUnit") return col.kind;
  return unitKind(row[index + 1]);
}

const NO_DATA = "No data";

// ---- CSV -------------------------------------------------------------------

function csvText(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function csvField(s: string): string {
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function csvCell(v: CellValue, kind: PlainKind): string {
  if (v === null || v === undefined) return csvField(NO_DATA);
  if (typeof v === "string") return csvField(csvText(v));
  if (!isFinite(v)) return csvField(NO_DATA);
  if (kind === "money") return v.toFixed(2);
  if (kind === "percent") return (Math.round(v * 1000) / 10).toFixed(1);
  return String(v);
}

function csvRow(cells: string[]): string {
  return cells.join(",");
}

function sameHeaders(a: ExportSection, b: ExportSection): boolean {
  if (a.columns.length !== b.columns.length) return false;
  for (let i = 0; i < a.columns.length; i++) {
    if (a.columns[i].header !== b.columns[i].header || a.columns[i].kind !== b.columns[i].kind) return false;
  }
  return true;
}

export function renderCsv(doc: ExportDocument): Buffer {
  const lines: string[] = [];
  lines.push(csvRow([csvField("Report"), csvField(csvText(doc.title))]));
  lines.push(csvRow([csvField("Scope"), csvField(csvText(doc.scopeLabel))]));
  if (doc.rangeLabel) lines.push(csvRow([csvField("Period"), csvField(csvText(doc.rangeLabel))]));
  lines.push(csvRow([csvField("Generated"), csvField(describeMoment(doc.generatedAt))]));
  lines.push("");

  const flat =
    doc.layout === "stacked" &&
    doc.sections.length > 1 &&
    doc.sections.every((s) => sameHeaders(s, doc.sections[0]));

  if (flat) {
    const head = doc.sections[0];
    lines.push(csvRow([csvField("Section")].concat(head.columns.map((c) => csvField(csvText(c.header))))));
    doc.sections.forEach((s) => {
      s.rows.forEach((row) => {
        lines.push(
          csvRow([csvField(csvText(s.title))].concat(row.map((v, i) => csvCell(v, kindOf(s.columns[i], row, i)))))
        );
      });
    });
    const notes = doc.sections.filter((s) => s.note);
    notes.forEach((s) => lines.push(csvRow([csvField("Note"), csvField(csvText(s.title + ": " + s.note))])));
  } else {
    doc.sections.forEach((s) => {
      lines.push(csvRow([csvField(csvText(s.title))]));
      if (s.note) lines.push(csvRow([csvField("Note"), csvField(csvText(s.note))]));
      lines.push(csvRow(s.columns.map((c) => csvField(csvText(c.header)))));
      s.rows.forEach((row) => {
        lines.push(csvRow(row.map((v, i) => csvCell(v, kindOf(s.columns[i], row, i)))));
      });
      lines.push("");
    });
  }

  doc.notes.forEach((n) => lines.push(csvRow([csvField("Note"), csvField(csvText(n))])));
  // A byte-order mark makes Excel read the file as UTF-8 (names with accents stay correct).
  return Buffer.from("\uFEFF" + lines.join("\r\n") + "\r\n", "utf8");
}

// ---- Excel -----------------------------------------------------------------

const XLSX_FORMATS: { [kind: string]: string } = {
  money: "#,##0.00",
  percent: "0.0%",
  count: "#,##0",
};

// Excel sheet names: at most 31 characters, none of  \\ / ? * [ ] :  , no control characters, no leading or
// trailing apostrophe, not empty, not "History", and unique inside the workbook.
function cleanSheetName(raw: string): string {
  let t = String(raw).replace(/[\u0000-\u001f\u007f\u2028\u2029\ufeff\\/?*\[\]:]/g, " ").replace(/\s+/g, " ").trim();
  t = t.slice(0, 31).replace(/^['\s]+|['\s]+$/g, "");
  if (!t || t.toLowerCase() === "history") t = "Sheet";
  return t;
}

function sheetName(wb: Workbook, wanted: string): string {
  const base = cleanSheetName(wanted);
  let name = base;
  let n = 2;
  while (wb.getWorksheet(name)) {
    const suffix = " " + n;
    name = cleanSheetName(base.slice(0, 31 - suffix.length)) + suffix;
    n++;
  }
  return name;
}

function writeCell(cell: Cell, v: CellValue, kind: PlainKind) {
  if (v === null || v === undefined || (typeof v === "number" && !isFinite(v))) {
    cell.value = NO_DATA;
    cell.alignment = { horizontal: "right" };
    return;
  }
  if (typeof v === "string") {
    // plain text: Excel stores it as a string, never as a formula
    cell.value = v;
    return;
  }
  cell.value = v;
  if (XLSX_FORMATS[kind]) cell.numFmt = XLSX_FORMATS[kind];
}

function styleHeaderRow(row: Row, count: number) {
  for (let i = 1; i <= count; i++) {
    const cell = row.getCell(i);
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
    cell.border = { bottom: { style: "thin", color: { argb: "FFD1D5DB" } } };
    cell.alignment = { vertical: "middle", wrapText: true };
  }
}

export async function renderXlsx(doc: ExportDocument): Promise<Buffer> {
  // Loaded only when an Excel file is asked for, so the server's memory stays small the rest of the time.
  const mod: any = await import("exceljs");
  const ExcelJS: any = mod.default || mod;
  const wb: Workbook = new ExcelJS.Workbook();
  wb.creator = "AskDerek";
  wb.title = doc.title;
  wb.created = new Date(doc.generatedAt);

  if (doc.layout === "sheets") {
    const about = wb.addWorksheet(sheetName(wb, "About"));
    about.getCell("A1").value = doc.title;
    about.getCell("A1").font = { bold: true, size: 14 };
    let r = 3;
    const put = (label: string, value: string) => {
      about.getCell("A" + r).value = label;
      about.getCell("A" + r).font = { bold: true };
      about.getCell("B" + r).value = value;
      r++;
    };
    put("Scope", doc.scopeLabel);
    if (doc.rangeLabel) put("Period", doc.rangeLabel);
    put("Generated", describeMoment(doc.generatedAt));
    r++;
    about.getCell("A" + r).value = "Sheets in this file";
    about.getCell("A" + r).font = { bold: true };
    r++;

    doc.sections.forEach((s) => {
      const ws = wb.addWorksheet(sheetName(wb, s.sheetName || s.title));
      const head = ws.addRow(s.columns.map((c) => c.header));
      styleHeaderRow(head, s.columns.length);
      s.rows.forEach((row) => {
        const wr = ws.addRow([]);
        row.forEach((v, i) => writeCell(wr.getCell(i + 1), v, kindOf(s.columns[i], row, i)));
      });
      ws.views = [{ state: "frozen", ySplit: 1 }];
      s.columns.forEach((c, i) => {
        let longest = c.header.length;
        s.rows.forEach((row) => {
          const v = row[i];
          const len = typeof v === "string" ? v.length : 12;
          if (len > longest) longest = len;
        });
        ws.getColumn(i + 1).width = Math.min(50, Math.max(10, longest + 2));
      });
      about.getCell("A" + r).value = ws.name;
      about.getCell("B" + r).value = s.note ? s.title + " - " + s.note : s.title;
      r++;
    });

    if (doc.notes.length > 0) {
      r++;
      about.getCell("A" + r).value = "Notes";
      about.getCell("A" + r).font = { bold: true };
      r++;
      doc.notes.forEach((n) => {
        about.getCell("A" + r).value = n;
        r++;
      });
    }
    about.getColumn(1).width = 24;
    about.getColumn(2).width = 90;
  } else {
    const ws = wb.addWorksheet(sheetName(wb, doc.title));
    const title = ws.addRow([doc.title]);
    title.getCell(1).font = { bold: true, size: 14 };
    const meta = (label: string, value: string) => {
      const row = ws.addRow([label, value]);
      row.getCell(1).font = { bold: true };
    };
    meta("Scope", doc.scopeLabel);
    if (doc.rangeLabel) meta("Period", doc.rangeLabel);
    meta("Generated", describeMoment(doc.generatedAt));
    ws.addRow([]);

    let widest = 1;
    doc.sections.forEach((s) => {
      if (s.columns.length > widest) widest = s.columns.length;
      const t = ws.addRow([s.title]);
      t.getCell(1).font = { bold: true, size: 12 };
      if (s.note) {
        const n = ws.addRow([s.note]);
        n.getCell(1).font = { italic: true, color: { argb: "FF6B7280" } };
      }
      styleHeaderRow(ws.addRow(s.columns.map((c) => c.header)), s.columns.length);
      s.rows.forEach((row) => {
        const wr = ws.addRow([]);
        row.forEach((v, i) => writeCell(wr.getCell(i + 1), v, kindOf(s.columns[i], row, i)));
      });
      ws.addRow([]);
    });

    if (doc.notes.length > 0) {
      const t = ws.addRow(["Notes"]);
      t.getCell(1).font = { bold: true };
      doc.notes.forEach((n) => ws.addRow([n]));
    }
    ws.getColumn(1).width = 54;
    for (let i = 2; i <= widest; i++) ws.getColumn(i).width = i === 3 ? 12 : 18;
  }

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as any);
}

// ---- PDF -------------------------------------------------------------------

function pdfSafe(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input.charAt(i);
    const code = input.charCodeAt(i);
    if (ch === "\u2013" || ch === "\u2014") out += "-";
    else if (ch === "\u2018" || ch === "\u2019") out += "'";
    else if (ch === "\u201C" || ch === "\u201D") out += '"';
    else if (ch === "\u20B5") out += "GHS ";
    else if (ch === "\u2026") out += "...";
    else if (ch === "\n" || ch === "\r" || ch === "\t") out += " ";
    else if (code < 32) out += "";
    else if (code <= 255) out += ch;
    else out += "?";
  }
  return out;
}

function groupDigits(v: number, decimals: number): string {
  const text = Math.abs(v).toFixed(decimals);
  const parts = text.split(".");
  const whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = v < 0 && Number(text) !== 0 ? "-" : "";
  return sign + whole + (parts.length > 1 ? "." + parts[1] : "");
}

// bare = the unit sits in its own column, so the number is written without GHS / %.
function pdfNumber(v: number, kind: PlainKind, bare: boolean): string {
  if (kind === "money") return (bare ? "" : "GHS ") + groupDigits(v, 2);
  if (kind === "percent") return (Math.round(v * 1000) / 10).toFixed(1) + (bare ? "" : "%");
  return groupDigits(v, Number.isInteger(v) ? 0 : 2);
}

function pdfCell(v: CellValue, kind: PlainKind, bare: boolean): string {
  if (v === null || v === undefined || (typeof v === "number" && !isFinite(v))) return NO_DATA;
  if (typeof v === "string") return pdfSafe(v);
  return pdfNumber(v, kind, bare);
}

function columnWeights(columns: ExportColumn[]): number[] {
  return columns.map((c) => {
    if (c.width !== undefined) return c.width;
    return c.kind === "text" ? 3 : 1.3;
  });
}

export function renderPdf(doc: ExportDocument, options?: { compress?: boolean }): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const pdf = new PDFDocument({
        size: "A4",
        layout: doc.orientation === "landscape" ? "landscape" : "portrait",
        margin: 40,
        bufferPages: true,
        compress: !(options && options.compress === false),
        info: { Title: pdfSafe(doc.title), Author: "AskDerek", Creator: "AskDerek" },
      });
      const chunks: Buffer[] = [];
      pdf.on("data", (c: Buffer) => chunks.push(c));
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", (e: Error) => reject(e));

      const left = 40;
      const usable = pdf.page.width - 80;
      const top = 40;
      const bottomLimit = pdf.page.height - 64;
      const rowH = 16;
      const ink = "#111827";
      const quiet = "#6B7280";

      const fit = (text: string, maxWidth: number): string => {
        if (pdf.widthOfString(text) <= maxWidth) return text;
        let t = text;
        while (t.length > 1 && pdf.widthOfString(t + "...") > maxWidth) t = t.slice(0, -1);
        return t + "...";
      };

      let y = top;
      pdf.font("Helvetica-Bold").fontSize(9).fillColor(quiet).text("AskDerek", left, y, { lineBreak: false });
      y += 14;
      pdf.font("Helvetica-Bold").fontSize(18).fillColor(ink).text(pdfSafe(doc.title), left, y, { width: usable });
      y = pdf.y + 4;
      pdf.font("Helvetica").fontSize(9).fillColor(quiet);
      pdf.text("Scope: " + pdfSafe(doc.scopeLabel), left, y, { width: usable });
      y = pdf.y + 1;
      if (doc.rangeLabel) {
        pdf.text("Period: " + pdfSafe(doc.rangeLabel), left, y, { width: usable });
        y = pdf.y + 1;
      }
      pdf.text("Generated: " + describeMoment(doc.generatedAt), left, y, { width: usable });
      y = pdf.y + 14;

      const drawHeader = (s: ExportSection, widths: number[]) => {
        pdf.font("Helvetica-Bold").fontSize(8.5);
        let h = rowH;
        s.columns.forEach((c, i) => {
          const need = pdf.heightOfString(pdfSafe(c.header), { width: widths[i] - 8 }) + 8;
          if (need > h) h = need;
        });
        pdf.rect(left, y, usable, h).fill("#F3F4F6");
        pdf.fillColor(ink).font("Helvetica-Bold").fontSize(8.5);
        let x = left;
        s.columns.forEach((c, i) => {
          const numeric = c.kind !== "text";
          pdf.text(pdfSafe(c.header), x + 4, y + 4, {
            width: widths[i] - 8,
            align: numeric ? "right" : "left",
          });
          x += widths[i];
        });
        y += h;
      };

      doc.sections.forEach((s) => {
        const weights = columnWeights(s.columns);
        const total = weights.reduce((a, b) => a + b, 0);
        const widths = weights.map((w) => (usable * w) / total);

        // keep a title, its header and a couple of rows together
        if (y + 40 + rowH * 3 > bottomLimit) {
          pdf.addPage();
          y = top;
        }
        pdf.font("Helvetica-Bold").fontSize(12).fillColor(ink).text(pdfSafe(s.title), left, y, { width: usable });
        y = pdf.y + 2;
        if (s.note) {
          pdf.font("Helvetica-Oblique").fontSize(8.5).fillColor(quiet).text(pdfSafe(s.note), left, y, { width: usable });
          y = pdf.y + 4;
        }
        drawHeader(s, widths);

        s.rows.forEach((row, rIndex) => {
          if (y + rowH > bottomLimit) {
            pdf.addPage();
            y = top;
            drawHeader(s, widths);
          }
          if (rIndex % 2 === 1) pdf.rect(left, y, usable, rowH).fill("#F9FAFB");
          pdf.fillColor(ink).font("Helvetica").fontSize(8.5);
          let x = left;
          s.columns.forEach((c, i) => {
            const kind = kindOf(c, row, i);
            const numeric = kind !== "text";
            const text = fit(pdfCell(row[i], kind, c.kind === "byUnit"), widths[i] - 8);
            pdf.text(text, x + 4, y + 4, { width: widths[i] - 8, align: numeric ? "right" : "left", lineBreak: false });
            x += widths[i];
          });
          y += rowH;
        });
        y += 14;
      });

      if (doc.notes.length > 0) {
        if (y + 30 > bottomLimit) {
          pdf.addPage();
          y = top;
        }
        pdf.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("Notes", left, y, { width: usable });
        y = pdf.y + 2;
        doc.notes.forEach((n) => {
          if (y + 24 > bottomLimit) {
            pdf.addPage();
            y = top;
          }
          pdf.font("Helvetica").fontSize(8.5).fillColor(quiet).text(pdfSafe(n), left, y, { width: usable });
          y = pdf.y + 2;
        });
      }

      // footer with page numbers (the bottom margin is lifted so writing there never adds a blank page)
      const pages = pdf.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        pdf.switchToPage(pages.start + i);
        const saved = pdf.page.margins.bottom;
        pdf.page.margins.bottom = 0;
        pdf
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#9CA3AF")
          .text("AskDerek | " + describeMoment(doc.generatedAt) + " | Page " + (i + 1) + " of " + pages.count, left, pdf.page.height - 36, {
            width: usable,
            align: "center",
            lineBreak: false,
          });
        pdf.page.margins.bottom = saved;
      }
      pdf.end();
    } catch (e) {
      reject(e);
    }
  });
}

export async function renderExport(doc: ExportDocument, format: ExportFormat): Promise<Buffer> {
  if (format === "csv") return renderCsv(doc);
  if (format === "xlsx") return renderXlsx(doc);
  return renderPdf(doc);
}

// -----------------------------------------------------------------------------
//  Document builders - one per report. They only arrange numbers they are given.
// -----------------------------------------------------------------------------

const METRIC_COLUMNS: ExportColumn[] = [
  { header: "Metric", kind: "text", width: 5 },
  { header: "Value", kind: "byUnit", width: 2 },
  { header: "Unit", kind: "text", width: 1.2 },
];

export interface SummaryInput {
  occupancy: {
    totalRooms: number;
    totalBeds: number;
    retiredBeds: number;
    available: number;
    reserved: number;
    occupied: number;
    maintenance: number;
    occupancyRate: number | null;
    utilizationRate: number | null;
  };
  revenue: {
    bookingValue: number;
    received: number;
    receivedByProduct: { hostel: number; rent: number; other: number };
    failed: number;
    refunded: number;
    outstanding: number;
    outstandingBreakdown: { ledger: number; hostelAwaitingPayment: number };
  };
  collectionRate: number | null;
  bookings: {
    total: number;
    lease: { [status: string]: number };
    shortStay: { [status: string]: number };
    hostel: { [status: string]: number };
  };
  cancellation: {
    hostel: { total: number; cancelled: number; rate: number | null };
    shortStay: { total: number; cancelled: number; rate: number | null };
  };
  approval: {
    hostel: { decided: number; approved: number; rejected: number; rate: number | null };
    leaseApplication: { decided: number; approved: number; denied: number; rate: number | null };
  };
  roomUtilization: {
    totalRooms: number;
    atCapacity: number;
    partiallyOccupied: number;
    underutilized: number;
    unoccupied: number;
  };
}

function statusRows(label: string, counts: { [status: string]: number }): CellValue[][] {
  const keys = Object.keys(counts || {}).sort();
  let sum = 0;
  keys.forEach((k) => {
    sum += counts[k];
  });
  const rows: CellValue[][] = [[label + " (all statuses)", sum, "bookings"]];
  keys.forEach((k) => rows.push([label + " - " + prettyStatus(k), counts[k], "bookings"]));
  return rows;
}

export function buildSummaryDocument(d: SummaryInput, meta: ExportMeta): ExportDocument {
  const o = d.occupancy;
  const m = d.revenue;
  const sections: ExportSection[] = [
    {
      title: "Beds right now",
      note: "A live count taken when the file was made. It does not change with the date range.",
      columns: METRIC_COLUMNS,
      rows: [
        ["Rooms (active)", o.totalRooms, "rooms"],
        ["Beds in service (not retired)", o.totalBeds, "beds"],
        ["Retired beds (not counted above)", o.retiredBeds, "beds"],
        ["Available", o.available, "beds"],
        ["Reserved", o.reserved, "beds"],
        ["Occupied", o.occupied, "beds"],
        ["In maintenance", o.maintenance, "beds"],
        ["Occupancy rate (occupied / beds in service)", o.occupancyRate, "%"],
        ["Utilization rate ((occupied + reserved) / beds in service)", o.utilizationRate, "%"],
      ],
    },
    {
      title: "Money",
      note: "Billed, received and failed cover the date range. Still owed is a balance as of the end of the range. Refunded is always 0 today because no refund flow exists yet - that is a real zero, not missing data.",
      columns: METRIC_COLUMNS,
      rows: [
        ["Booking value (billed in the period)", m.bookingValue, "GHS"],
        ["Money received", m.received, "GHS"],
        ["Received - hostel", m.receivedByProduct.hostel, "GHS"],
        ["Received - rent", m.receivedByProduct.rent, "GHS"],
        ["Received - other", m.receivedByProduct.other, "GHS"],
        ["Failed payments", m.failed, "GHS"],
        ["Refunded", m.refunded, "GHS"],
        ["Still owed (total)", m.outstanding, "GHS"],
        ["Still owed - rent ledger", m.outstandingBreakdown.ledger, "GHS"],
        ["Still owed - hostel bookings awaiting payment", m.outstandingBreakdown.hostelAwaitingPayment, "GHS"],
        ["Collection rate (received / due)", d.collectionRate, "%"],
      ],
    },
    {
      title: "Bookings created in the period",
      columns: METRIC_COLUMNS,
      rows: ([["All bookings", d.bookings.total, "bookings"]] as CellValue[][])
        .concat(statusRows("Rental leases", d.bookings.lease))
        .concat(statusRows("Short stays", d.bookings.shortStay))
        .concat(statusRows("Hostel bookings", d.bookings.hostel)),
    },
    {
      title: "Cancellations",
      note: "Of everything started in the period, how much was cancelled.",
      columns: METRIC_COLUMNS,
      rows: [
        ["Hostel bookings started", d.cancellation.hostel.total, "bookings"],
        ["Hostel bookings cancelled", d.cancellation.hostel.cancelled, "bookings"],
        ["Hostel cancellation rate", d.cancellation.hostel.rate, "%"],
        ["Short stays started", d.cancellation.shortStay.total, "bookings"],
        ["Short stays cancelled", d.cancellation.shortStay.cancelled, "bookings"],
        ["Short-stay cancellation rate", d.cancellation.shortStay.rate, "%"],
      ],
    },
    {
      title: "Approvals",
      note: "Only requests that have been decided count. Hostel requests and rental applications are separate decisions and are never blended.",
      columns: METRIC_COLUMNS,
      rows: [
        ["Hostel requests decided", d.approval.hostel.decided, "requests"],
        ["Hostel requests approved", d.approval.hostel.approved, "requests"],
        ["Hostel requests rejected", d.approval.hostel.rejected, "requests"],
        ["Hostel approval rate", d.approval.hostel.rate, "%"],
        ["Rental applications decided", d.approval.leaseApplication.decided, "requests"],
        ["Rental applications approved", d.approval.leaseApplication.approved, "requests"],
        ["Rental applications denied", d.approval.leaseApplication.denied, "requests"],
        ["Rental approval rate", d.approval.leaseApplication.rate, "%"],
      ],
    },
    {
      title: "Room use right now",
      note: "A live count. Each room is in exactly one of full, partly occupied or empty; under half full is part of partly occupied.",
      columns: METRIC_COLUMNS,
      rows: [
        ["Rooms", d.roomUtilization.totalRooms, "rooms"],
        ["Full (at capacity)", d.roomUtilization.atCapacity, "rooms"],
        ["Partly occupied", d.roomUtilization.partiallyOccupied, "rooms"],
        ["Under half full (part of partly occupied)", d.roomUtilization.underutilized, "rooms"],
        ["Empty", d.roomUtilization.unoccupied, "rooms"],
      ],
    },
  ];

  return {
    title: "Summary report",
    scopeLabel: meta.scopeLabel,
    rangeLabel: meta.rangeLabel,
    generatedAt: meta.generatedAt,
    layout: "stacked",
    sections,
    notes: [
      "Every figure comes from the same calculations as the Reports page, so the numbers match what you see there.",
      "A rate shows 'No data' when there was nothing to measure. That is not the same as 0%.",
    ],
  };
}

export interface TrendsInput {
  granularity: "day" | "week" | "month";
  buckets: {
    date: string;
    moneyHostel: number;
    moneyRent: number;
    moneyTotal: number;
    bookingsHostel: number;
    bookingsShortStay: number;
    bookingsLease: number;
    bookingsTotal: number;
  }[];
  occupancy: {
    date: string;
    totalBeds: number;
    occupied: number;
    reserved: number;
    available: number;
    maintenance: number;
    occupancyRate: number | null;
  }[];
}

export function buildTrendsDocument(d: TrendsInput, meta: ExportMeta): ExportDocument {
  const per = d.granularity;
  const tot = { hostel: 0, rent: 0, total: 0, bh: 0, bs: 0, bl: 0, bt: 0 };
  const moneyRows: CellValue[][] = d.buckets.map((b) => {
    tot.hostel += b.moneyHostel;
    tot.rent += b.moneyRent;
    tot.total += b.moneyTotal;
    tot.bh += b.bookingsHostel;
    tot.bs += b.bookingsShortStay;
    tot.bl += b.bookingsLease;
    tot.bt += b.bookingsTotal;
    return [b.date, b.moneyHostel, b.moneyRent, b.moneyTotal, b.bookingsHostel, b.bookingsShortStay, b.bookingsLease, b.bookingsTotal];
  });
  moneyRows.push(["Total", round2(tot.hostel), round2(tot.rent), round2(tot.total), tot.bh, tot.bs, tot.bl, tot.bt]);

  const occRows: CellValue[][] = d.occupancy.map((p) => [p.date, p.totalBeds, p.occupied, p.reserved, p.available, p.maintenance, p.occupancyRate]);

  return {
    title: "Money and bookings over time",
    scopeLabel: meta.scopeLabel,
    rangeLabel: meta.rangeLabel,
    generatedAt: meta.generatedAt,
    layout: "sheets",
    orientation: "landscape",
    sections: [
      {
        title: "Money and bookings per " + per,
        sheetName: "Money and bookings",
        note:
          "Each row is one " + per + ", named by its first day. Money is received money; bookings are counted on the day they were created." +
          (per === "day" ? "" : " The first and last rows can cover only part of a " + per + "."),
        columns: [
          { header: "Period starting", kind: "text", width: 2 },
          { header: "Hostel money (GHS)", kind: "money" },
          { header: "Rent money (GHS)", kind: "money" },
          { header: "Total money (GHS)", kind: "money" },
          { header: "Hostel bookings", kind: "count" },
          { header: "Short-stay bookings", kind: "count" },
          { header: "Lease bookings", kind: "count" },
          { header: "Total bookings", kind: "count" },
        ],
        rows: moneyRows,
      },
      {
        title: "Occupancy per night",
        sheetName: "Occupancy",
        note:
          d.occupancy.length === 0
            ? "No nightly records fall inside this period yet."
            : "One row for each night that has a nightly record. A night with no record is left out - it is not shown as empty.",
        columns: [
          { header: "Night", kind: "text", width: 2 },
          { header: "Beds in service", kind: "count" },
          { header: "Occupied", kind: "count" },
          { header: "Reserved", kind: "count" },
          { header: "Available", kind: "count" },
          { header: "In maintenance", kind: "count" },
          { header: "Occupancy rate (%)", kind: "percent" },
        ],
        rows: occRows,
      },
    ],
    notes: ["Every figure comes from the same calculations as the Reports page."],
  };
}

export interface RecordsInput {
  metric: string;
  title: string;
  total: number;
  summary: { label: string; value: number; money: boolean };
  rows: {
    title: string;
    subtitle: string;
    status: string;
    amount: number | null;
    date: string | null;
    property: string;
  }[];
}

const NOT_DATE_LIMITED: { [metric: string]: string } = {
  beds: "This is a live list of beds. It is not limited by the date range.",
  hostel_semester: "This list is not limited by the date range.",
};

export function buildRecordsDocument(d: RecordsInput, meta: ExportMeta): ExportDocument {
  const rows: CellValue[][] = d.rows.map((r) => [
    r.title,
    r.subtitle,
    prettyStatus(r.status),
    r.amount,
    r.date ? String(r.date).slice(0, 10) : "",
    r.property,
  ]);
  const notes: string[] = [];
  notes.push(d.summary.label + ": " + (d.summary.money ? "GHS " + d.summary.value.toFixed(2) : String(d.summary.value)));
  if (d.total > d.rows.length) {
    notes.push(
      "This file holds the first " + d.rows.length + " of " + d.total + " records. Choose a shorter date range or a status to get the rest."
    );
  }
  if (NOT_DATE_LIMITED[d.metric]) notes.push(NOT_DATE_LIMITED[d.metric]);
  notes.push("Every record comes from the same lists as the Reports page.");

  return {
    title: d.title,
    scopeLabel: meta.scopeLabel,
    rangeLabel: meta.rangeLabel,
    generatedAt: meta.generatedAt,
    layout: "sheets",
    orientation: "landscape",
    sections: [
      {
        title: d.title,
        sheetName: "Records",
        note: d.total + " records in total",
        columns: [
          { header: "Record", kind: "text", width: 3 },
          { header: "Details", kind: "text", width: 4 },
          { header: "Status", kind: "text", width: 2 },
          { header: "Amount (GHS)", kind: "money", width: 2 },
          { header: "Date", kind: "text", width: 2 },
          { header: "Property", kind: "text", width: 3 },
        ],
        rows,
      },
    ],
    notes,
  };
}
