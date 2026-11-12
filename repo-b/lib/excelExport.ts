import type { Workbook, Worksheet, Row, Borders } from "exceljs";

const XL_GREEN = "FF2D7A3A";
const XL_LIGHT = "FFF0FAF2";
const XL_ZEBRA = "FFF9FAFB";

export const XL_PESO = '"₱"#,##0.00';

const thinBorder: Partial<Borders> = {
  top:    { style: "thin", color: { argb: "FFE5E7EB" } },
  left:   { style: "thin", color: { argb: "FFE5E7EB" } },
  bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
  right:  { style: "thin", color: { argb: "FFE5E7EB" } },
};

export type XlCol = {
  header: string;
  width: number;
  format?: string;
  align?: "left" | "center" | "right";
};

export type XlCell = string | number | Date | null | undefined;

function styleHeaderRow(row: Row) {
  row.height = 22;
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: XL_GREEN } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border    = thinBorder;
  });
}

function addSheetTitle(ws: Worksheet, title: string, subtitle: string, colCount: number) {
  ws.mergeCells(1, 1, 1, colCount);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { size: 16, bold: true, color: { argb: XL_GREEN } };
  t.alignment = { vertical: "middle" };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, colCount);
  const s = ws.getCell(2, 1);
  s.value = subtitle;
  s.font = { size: 11, italic: true, color: { argb: "FF6B7280" } };
}

export function buildTableSheet(
  wb: Workbook,
  opts: {
    name: string;
    title: string;
    subtitle: string;
    cols: XlCol[];
    rows: XlCell[][];
    totals?: XlCell[];
  },
) {
  const { name, title, subtitle, cols, rows, totals } = opts;
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 4, showGridLines: false }] });
  ws.columns = cols.map((c) => ({ width: c.width }));
  addSheetTitle(ws, title, subtitle, cols.length);

  const header = ws.getRow(4);
  header.values = cols.map((c) => c.header);
  styleHeaderRow(header);

  rows.forEach((r, i) => {
    const row = ws.addRow(r);
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell, n) => {
      const c = cols[n - 1];
      if (!c) return;
      if (c.format) cell.numFmt = c.format;
      cell.alignment = { vertical: "middle", horizontal: c.align ?? "left" };
      cell.border = thinBorder;
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XL_ZEBRA } };
    });
  });

  if (rows.length === 0) {
    ws.mergeCells(5, 1, 5, cols.length);
    const empty = ws.getCell(5, 1);
    empty.value = "No data to export.";
    empty.font = { italic: true, color: { argb: "FF9CA3AF" } };
    empty.alignment = { horizontal: "center" };
  } else {
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: cols.length } };
  }

  if (totals && rows.length > 0) {
    const row = ws.addRow(totals);
    row.height = 22;
    row.eachCell({ includeEmpty: true }, (cell, n) => {
      const c = cols[n - 1];
      if (!c) return;
      if (c.format) cell.numFmt = c.format;
      cell.font = { bold: true, color: { argb: "FF1A3C2E" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XL_LIGHT } };
      cell.alignment = { vertical: "middle", horizontal: c.align ?? "left" };
      cell.border = {
        top:    { style: "medium", color: { argb: XL_GREEN } },
        bottom: { style: "thin",   color: { argb: XL_GREEN } },
        left:   thinBorder.left,
        right:  thinBorder.right,
      };
    });
  }
  return ws;
}

export function generatedOnLabel() {
  return `Generated On: ${new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" })}`;
}

export async function exportStyledExcel(opts: {
  fileName: string;
  sheetName: string;
  title: string;
  cols: XlCol[];
  rows: XlCell[][];
  totals?: XlCell[];
  subtitle?: string;
}) {
  const mod = await import("exceljs");
  const ExcelJS = (mod as any).default ?? mod;
  const wb: Workbook = new ExcelJS.Workbook();
  wb.creator = "Julieta Soft Drinks Store";
  wb.created = new Date();

  buildTableSheet(wb, {
    name: opts.sheetName,
    title: opts.title,
    subtitle: opts.subtitle ?? generatedOnLabel(),
    cols: opts.cols,
    rows: opts.rows,
    totals: opts.totals,
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = opts.fileName.endsWith(".xlsx") ? opts.fileName : `${opts.fileName}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}
