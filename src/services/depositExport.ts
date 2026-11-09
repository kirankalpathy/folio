import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { DepositHolding, FinancialInstitution } from '../types';
import { formatDate } from '../utils/date';
import { calculateDepositValues, formatDepositTenure, getDepositLifecycleStatus } from '../utils/deposits';
import { formatNumber, formatPercent, getNumberFormat } from '../utils/finance';
import { listFinancialInstitutions } from './financialInstitutions';
import {
  drawRoundedRect,
  drawTagPill,
  exportDateTimeLabel,
  loadLogoDataUrl,
  registerInterFont,
  stampName,
  type PdfSemanticColor,
} from './pdfExportUtils';

export type DepositExportFormat = 'xlsx' | 'csv' | 'pdf';

export type { PdfSemanticColor };

export interface DepositPdfFilterTag {
  label: string;
  color?: PdfSemanticColor;
}

export interface DepositPdfFilter {
  type: 'text' | 'tags' | 'date-op';
  label: string;
  value?: string;
  tags?: DepositPdfFilterTag[];
  op?: '==' | '<>' | '<' | '>' | '<=' | '>=';
  date?: string;
}

export interface DepositExportOptions {
  /** Applied filters for PDF rendering. Omit or pass empty to hide the Filters section. */
  filters?: DepositPdfFilter[];
}

const OP_RGB: Record<NonNullable<DepositPdfFilter['op']>, [number, number, number]> = {
  '==': [2, 132, 199],
  '<>': [217, 119, 6],
  '<': [124, 58, 237],
  '>': [5, 150, 105],
  '<=': [124, 58, 237],
  '>=': [5, 150, 105],
};

function lifecycleLabel(status: ReturnType<typeof getDepositLifecycleStatus>): string {
  switch (status) {
    case 'planned': return 'Planned';
    case 'active': return 'Active';
    case 'in-lien': return 'In Lien';
    case 'matured': return 'Matured';
    case 'pre-closed': return 'Pre-closed';
    default: return '';
  }
}

function frequencyLabel(value: string | undefined): string {
  switch (value) {
    case 'annual': return 'Annual';
    case 'semi-annual': return 'Semi-annual';
    case 'quarterly': return 'Quarterly';
    case 'monthly': return 'Monthly';
    default: return '';
  }
}

function rolloverLabel(value: string | undefined): string {
  switch (value) {
    case 'none': return 'None';
    case 'principal': return 'Principal';
    case 'principal-interest': return 'Principal + Interest';
    default: return '';
  }
}

function accountTypeLabel(value: string): string {
  switch (value) {
    case 'fd': return 'Fixed deposit';
    case 'rd': return 'Recurring deposit';
    case 'savings': return 'Savings';
    case 'nsc': return 'National Savings Certificate';
    default: return 'Other';
  }
}

function institutionFullName(d: DepositHolding, byId: Map<string, FinancialInstitution>): string {
  if (d.financialInstitutionId) {
    const fi = byId.get(d.financialInstitutionId);
    if (fi?.name?.trim()) return fi.name.trim();
  }
  return d.bankName || '';
}

const HEADERS = [
  'Deposit Number',
  'Deposit Name',
  'Financial Institution',
  'Account Type',
  'Lifecycle',
  'Principal / Total Deposited (INR)',
  'Recurring Amount (INR)',
  'Rate of Interest (% p.a.)',
  'Start Date',
  'Maturity Date',
  'Tenure',
  'Cumulative / Compound',
  'Compounding / Payout Frequency',
  'Rollover',
  'Interest (INR)',
  'Maturity Value (INR)',
  'Notes',
] as const;

function buildRows(deposits: DepositHolding[], byId: Map<string, FinancialInstitution>) {
  return deposits.map((d) => {
    const isRd = d.accountType === 'rd';
    const computed = calculateDepositValues({
      accountType: d.accountType,
      principal: d.principal,
      recurringAmount: d.recurringAmount,
      interestRate: d.interestRate,
      startDate: d.startDate,
      maturityDate: d.maturityDate,
      cumulativeInterest: isRd ? true : (d.cumulativeInterest ?? false),
      compoundingFrequency: d.compoundingFrequency,
    });
    const lifecycle = getDepositLifecycleStatus(d);
    return {
      depositNumber: d.depositNumber ?? '',
      name: d.name,
      financialInstitution: institutionFullName(d, byId),
      accountType: accountTypeLabel(d.accountType),
      lifecycle: lifecycleLabel(lifecycle),
      principal: d.principal,
      recurringAmount: d.recurringAmount ?? '',
      interestRate: d.interestRate,
      startDate: d.startDate ? formatDate(d.startDate) : '',
      maturityDate: d.maturityDate ? formatDate(d.maturityDate) : '',
      tenure: formatDepositTenure(d.startDate, d.maturityDate) ?? '',
      cumulativeInterest: (isRd || d.cumulativeInterest) ? 'Yes' : 'No',
      frequency: frequencyLabel(d.cumulativeInterest === false && !isRd ? d.payoutFrequency : d.compoundingFrequency),
      rollover: rolloverLabel(d.rollover),
      interest: computed.interest,
      realizedValue: d.currentValue || computed.realizedValue,
      notes: d.notes ?? '',
    };
  });
}

// Uses shared stampName('folio-deposits', ext) from pdfExportUtils.

async function exportXlsx(rows: ReturnType<typeof buildRows>): Promise<boolean> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Folio';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Deposits', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: HEADERS[0], key: 'depositNumber', width: 16 },
    { header: HEADERS[1], key: 'name', width: 24 },
    { header: HEADERS[2], key: 'financialInstitution', width: 24 },
    { header: HEADERS[3], key: 'accountType', width: 18 },
    { header: HEADERS[4], key: 'lifecycle', width: 12 },
    { header: HEADERS[5], key: 'principal', width: 20 },
    { header: HEADERS[6], key: 'recurringAmount', width: 18 },
    { header: HEADERS[7], key: 'interestRate', width: 18 },
    { header: HEADERS[8], key: 'startDate', width: 14 },
    { header: HEADERS[9], key: 'maturityDate', width: 14 },
    { header: HEADERS[10], key: 'tenure', width: 22 },
    { header: HEADERS[11], key: 'cumulativeInterest', width: 16 },
    { header: HEADERS[12], key: 'frequency', width: 22 },
    { header: HEADERS[13], key: 'rollover', width: 18 },
    { header: HEADERS[14], key: 'interest', width: 16 },
    { header: HEADERS[15], key: 'realizedValue', width: 18 },
    { header: HEADERS[16], key: 'notes', width: 28 },
  ];
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 11 };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8502D' } };
  header.alignment = { vertical: 'middle' };
  header.height = 22;

  rows.forEach((r) => {
    const row = sheet.addRow(r);
    const nf = getNumberFormat();
    const numFmt = nf.decimal === ',' ? '#.##0,00' : '#,##0.00';
    const rateFmt = nf.decimal === ',' ? '0,00' : '0.00';
    row.getCell('principal').numFmt = numFmt;
    if (typeof r.recurringAmount === 'number') row.getCell('recurringAmount').numFmt = numFmt;
    row.getCell('interestRate').numFmt = rateFmt;
    row.getCell('interest').numFmt = numFmt;
    row.getCell('realizedValue').numFmt = numFmt;
    row.alignment = { vertical: 'middle' };
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };

  const path = await save({ title: 'Export deposits', defaultPath: stampName('folio-deposits', 'xlsx'), filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }] });
  if (!path) return false;
  const buffer = await workbook.xlsx.writeBuffer();
  await writeFile(path, buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as ArrayBuffer));
  return true;
}

function csvEscape(value: string | number): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function exportCsv(rows: ReturnType<typeof buildRows>): Promise<boolean> {
  const lines = [HEADERS.map(csvEscape).join(',')];
  for (const r of rows) {
    lines.push([
      r.depositNumber, r.name, r.financialInstitution, r.accountType, r.lifecycle,
      formatNumber(r.principal, 2),
      typeof r.recurringAmount === 'number' ? formatNumber(r.recurringAmount, 2) : '',
      formatNumber(r.interestRate, 2),
      r.startDate, r.maturityDate, r.tenure,
      r.cumulativeInterest, r.frequency, r.rollover,
      formatNumber(r.interest, 2), formatNumber(r.realizedValue, 2), r.notes,
    ].map(csvEscape).join(','));
  }
  const path = await save({ title: 'Export deposits', defaultPath: stampName('folio-deposits', 'csv'), filters: [{ name: 'Comma Separated Values', extensions: ['csv'] }] });
  if (!path) return false;
  await writeTextFile(path, lines.join('\n'));
  return true;
}

const STATUS_RGB: Record<string, [number, number, number]> = {
  Planned: [59, 130, 246],
  Active: [34, 197, 94],
  'In Lien': [239, 68, 68],
  Matured: [234, 179, 8],
  'Pre-closed': [239, 68, 68],
};

function drawOpBadge(doc: jsPDF, font: string, op: NonNullable<DepositPdfFilter['op']>, x: number, yTop: number): number {
  const rgb = OP_RGB[op];
  doc.setFont(font, 'bold');
  doc.setFontSize(8);
  const padX = 4;
  const h = 14;
  const textW = doc.getTextWidth(op);
  const w = Math.max(18, textW + padX * 2);
  drawRoundedRect(doc, x, yTop, w, h, 4, [255, 255, 255], rgb);
  doc.setTextColor(...rgb);
  doc.text(op, x + w / 2, yTop + 9.8, { align: 'center' });
  return w;
}

async function exportPdf(
  deposits: DepositHolding[],
  byId: Map<string, FinancialInstitution>,
  options?: DepositExportOptions,
): Promise<boolean> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const font = await registerInterFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;
  let y = 24;

  const tableW = 760;
  const marginX = Math.max(16, (pageWidth - tableW) / 2);
  const dateTime = exportDateTimeLabel();
  const totalPagesExp = '{total_pages_count_string}';

  // Header
  const logo = await loadLogoDataUrl('/folio-horizontal-color.svg');
  if (logo) {
    const targetH = 38;
    const ratio = logo.width > 0 && logo.height > 0 ? logo.width / logo.height : 3.2;
    const w = targetH * ratio;
    doc.addImage(logo.dataUrl, 'PNG', centerX - w / 2, y, w, targetH);
    y += targetH + 10;
  } else {
    doc.setFont(font, 'bold');
    doc.setFontSize(20);
    doc.setTextColor(42, 26, 20);
    doc.text('Folio', centerX, y + 16, { align: 'center' });
    y += 28;
  }

  doc.setFont(font, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(42, 26, 20);
  doc.text('Deposit Summary', centerX, y, { align: 'center' });
  y += 16;

  // Filters (colorful tags + icons), only when applied
  const filters = (options?.filters ?? []).filter((f) => {
    if (f.type === 'text') return !!f.value?.trim();
    if (f.type === 'tags') return (f.tags?.length ?? 0) > 0;
    return !!f.date && !!f.op;
  });
  if (filters.length > 0) {
    doc.setFont(font, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(42, 26, 20);
    doc.text('Filters:', marginX, y);
    y += 4;

    const rowH = 18;
    let fx = marginX;
    let fy = y;
    const maxX = marginX + tableW;
    const gap = 6;
    const groupGap = 12;

    const newFilterRow = () => {
      fx = marginX;
      fy += rowH;
    };

    for (const f of filters) {
      doc.setFont(font, 'bold');
      doc.setFontSize(7.5);
      const labelText = `${f.label}:`;
      const labelW = doc.getTextWidth(labelText) + 4;
      if (fx !== marginX && fx + labelW > maxX) newFilterRow();
      doc.setTextColor(90, 80, 75);
      doc.text(labelText, fx, fy + 10);
      fx += labelW;

      if (f.type === 'text' && f.value) {
        const w = drawTagPill(doc, font, f.value, fx, fy, 'neutral');
        fx += w + groupGap;
      } else if (f.type === 'tags' && f.tags) {
        for (const tag of f.tags) {
          doc.setFont(font, 'normal');
          doc.setFontSize(7);
          const estW = doc.getTextWidth(tag.label) + 14;
          if (fx !== marginX && fx + estW > maxX) newFilterRow();
          const w = drawTagPill(doc, font, tag.label, fx, fy, tag.color ?? 'neutral');
          fx += w + gap;
        }
        fx += groupGap - gap;
      } else if (f.type === 'date-op' && f.op && f.date) {
        const opW = drawOpBadge(doc, font, f.op, fx, fy);
        fx += opW + gap;
        const dW = drawTagPill(doc, font, f.date, fx, fy, 'neutral');
        fx += dW + groupGap;
      }
    }
    y = fy + rowH + 6;
  }

  const drawPageChrome = (data?: { pageNumber: number }) => {
    const page = data?.pageNumber ?? (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }).internal.getCurrentPageInfo().pageNumber;
    doc.setFont(font, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 110, 105);
    // Date & time in header (right-aligned, all pages)
    doc.text(dateTime, pageWidth - marginX, 18, { align: 'right' });
    // Page number in footer (centered, all pages)
    doc.text(`Page ${page} of ${totalPagesExp}`, pageWidth / 2, pageHeight - 16, { align: 'center' });
  };

  const body = deposits.map((d) => {
    const isRd = d.accountType === 'rd';
    const computed = calculateDepositValues({
      accountType: d.accountType,
      principal: d.principal,
      recurringAmount: d.recurringAmount,
      interestRate: d.interestRate,
      startDate: d.startDate,
      maturityDate: d.maturityDate,
      cumulativeInterest: isRd ? true : (d.cumulativeInterest ?? false),
      compoundingFrequency: d.compoundingFrequency,
    });
    const lifecycle = lifecycleLabel(getDepositLifecycleStatus(d));
    const inst = institutionFullName(d, byId);
    return [
      d.depositNumber ?? '',
      d.name,
      accountTypeLabel(d.accountType),
      inst,
      lifecycle,
      formatNumber(d.principal, 0),
      formatPercent(d.interestRate, 2),
      d.startDate ? formatDate(d.startDate) : '',
      d.maturityDate ? formatDate(d.maturityDate) : '',
      formatNumber(d.currentValue || computed.realizedValue, 0),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [[
      'Deposit Number',
      'Purpose/Name',
      'Account Type',
      'Bank',
      'Status',
      'Principal',
      'Rate of Interest',
      'Start Date',
      'Maturity Date',
      'Maturity Value',
    ]],
    body,
    theme: 'grid',
    styles: { font, fontSize: 7.5, cellPadding: { top: 4, right: 3, bottom: 4, left: 3 }, overflow: 'linebreak', textColor: [42, 26, 20], lineColor: [232, 224, 218], lineWidth: 0.5, valign: 'middle' },
    headStyles: { fillColor: [200, 80, 45], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, overflow: 'linebreak', halign: 'center' },
    alternateRowStyles: { fillColor: [250, 246, 243] },
    columnStyles: {
      0: { cellWidth: 58, overflow: 'linebreak' },  // Deposit Number
      1: { cellWidth: 105, overflow: 'linebreak' }, // Purpose/Name
      2: { cellWidth: 72, overflow: 'linebreak' },  // Account Type
      3: { cellWidth: 96, overflow: 'linebreak' },  // Bank
      4: { cellWidth: 54, halign: 'center' },       // Status
      5: { cellWidth: 84, halign: 'right' },        // Principal (accounting: currency left, value right)
      6: { cellWidth: 58, halign: 'right' },        // Rate of Interest
      7: { cellWidth: 62, halign: 'center' },       // Start Date
      8: { cellWidth: 62, halign: 'center' },       // Maturity Date
      9: { cellWidth: 84, halign: 'right' },        // Maturity Value (accounting)
    },
    margin: { left: marginX, right: marginX, top: 28, bottom: 28 },
    tableWidth: tableW,
    didDrawPage: (data) => drawPageChrome({ pageNumber: data.pageNumber }),
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const status = String(data.cell.raw || '');
        const rgb = STATUS_RGB[status];
        if (rgb) {
          data.cell.styles.fillColor = rgb;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 7;
        }
      }
      if (data.section === 'body' && (data.column.index === 5 || data.column.index === 9)) {
        // Accounting style drawn in didDrawCell (currency left, value right)
        data.cell.text = [''];
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && (data.column.index === 5 || data.column.index === 9)) {
        const raw = String((data.row.raw as unknown[] | undefined)?.[data.column.index] ?? data.cell.raw ?? '');
        if (!raw) return;
        const { x, y: cy, width, height } = data.cell;
        const padL = 3;
        const padR = 3;
        doc.setFont(font, 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(42, 26, 20);
        const textY = cy + height / 2 + 2.5;
        doc.text('Rs.', x + padL, textY, { align: 'left' });
        doc.text(raw, x + width - padR, textY, { align: 'right' });
      }
    },
  });

  if (typeof (doc as unknown as { putTotalPages?: (s: string) => void }).putTotalPages === 'function') {
    (doc as unknown as { putTotalPages: (s: string) => void }).putTotalPages(totalPagesExp);
  }

  const path = await save({ title: 'Export deposits', defaultPath: stampName('folio-deposits', 'pdf'), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (!path) return false;
  const buffer = doc.output('arraybuffer');
  await writeFile(path, new Uint8Array(buffer));
  return true;
}

export async function exportDeposits(
  deposits: DepositHolding[],
  format: DepositExportFormat,
  options?: DepositExportOptions,
): Promise<boolean> {
  const institutions = await listFinancialInstitutions();
  const byId = new Map(institutions.map((fi) => [fi.id, fi]));
  if (format === 'pdf') return exportPdf(deposits, byId, options);
  const rows = buildRows(deposits, byId);
  return format === 'csv' ? exportCsv(rows) : exportXlsx(rows);
}

export async function exportDepositsToExcel(deposits: DepositHolding[]): Promise<boolean> {
  return exportDeposits(deposits, 'xlsx');
}

