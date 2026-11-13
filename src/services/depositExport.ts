import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { DepositHolding, FinancialInstitution } from '../types';
import { translate } from '../i18n';
import { formatDate } from '../utils/date';
import { calculateDepositValues, DepositLifecycleStatus, formatDepositTenure, getDepositLifecycleStatus } from '../utils/deposits';
import { formatINR, formatNumber, formatPercent, getNumberFormat } from '../utils/finance';
import { institutionLabel, listFinancialInstitutions } from './financialInstitutions';
import {
  drawRoundedRect,
  drawTagPill,
  exportDateTimeLabel,
  loadLogoDataUrl,
  registerInterFont,
  type PdfSemanticColor,
} from './pdfExportUtils';
import { folioFileName, sanitizeFileNamePart } from '../utils/fileNaming';

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
    case DepositLifecycleStatus.Planned: return 'Planned';
    case DepositLifecycleStatus.Active: return 'Active';
    case DepositLifecycleStatus.InLien: return 'In Lien';
    case DepositLifecycleStatus.Matured: return 'Matured';
    case DepositLifecycleStatus.PreClosed: return 'Pre-closed';
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
  'Pre-closure Date',
  'Planned / Matured Date',
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
      payoutFrequency: d.payoutFrequency,
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
      preClosedDate: d.preClosedDate ? formatDate(d.preClosedDate) : '',
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
    { header: HEADERS[9], key: 'preClosedDate', width: 16 },
    { header: HEADERS[10], key: 'maturityDate', width: 18 },
    { header: HEADERS[11], key: 'tenure', width: 22 },
    { header: HEADERS[12], key: 'cumulativeInterest', width: 16 },
    { header: HEADERS[13], key: 'frequency', width: 22 },
    { header: HEADERS[14], key: 'rollover', width: 18 },
    { header: HEADERS[15], key: 'interest', width: 16 },
    { header: HEADERS[16], key: 'realizedValue', width: 18 },
    { header: HEADERS[17], key: 'notes', width: 28 },
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

  const path = await save({ title: 'Export deposits', defaultPath: folioFileName('depositSummary', 'xlsx'), filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }] });
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
      r.startDate, r.preClosedDate, r.maturityDate, r.tenure,
      r.cumulativeInterest, r.frequency, r.rollover,
      formatNumber(r.interest, 2), formatNumber(r.realizedValue, 2), r.notes,
    ].map(csvEscape).join(','));
  }
  const path = await save({ title: 'Export deposits', defaultPath: folioFileName('depositSummary', 'csv'), filters: [{ name: 'Comma Separated Values', extensions: ['csv'] }] });
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

  doc.setFillColor(250, 246, 243);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Header
  doc.setFont(font, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 110, 105);
  doc.text(dateTime, pageWidth - marginX, 18, { align: 'right' });

  const logo = await loadLogoDataUrl('/folio-horizontal-color.svg');
  if (logo) {
    const targetH = 30;
    const ratio = logo.width > 0 && logo.height > 0 ? logo.width / logo.height : 3.2;
    const w = targetH * ratio;
    doc.addImage(logo.dataUrl, 'PNG', centerX - w / 2, y, w, targetH);
    y += targetH + 14;
  } else {
    doc.setFont(font, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(42, 26, 20);
    doc.text('Folio', centerX, y + 14, { align: 'center' });
    y += 26;
  }

  doc.setFont(font, 'bold');
  doc.setFontSize(13);
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

  const drawPageChrome = (pageNumber: number) => {
    // Page 1 background is painted before content. For subsequent pages, paint only margins
    // (header/footer bands) so autoTable body content is not overwritten.
    if (pageNumber > 1) {
      doc.setFillColor(250, 246, 243);
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.rect(0, pageHeight - 28, pageWidth, 28, 'F');
    }
    doc.setFont(font, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 110, 105);
    // Date & time in header (right-aligned, all pages)
    doc.text(dateTime, pageWidth - marginX, 18, { align: 'right' });
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
      payoutFrequency: d.payoutFrequency,
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
      d.preClosedDate ? formatDate(d.preClosedDate) : '',
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
      'Pre-closure Date',
      'Planned / Matured Date',
      'Maturity Value',
    ]],
    body,
    theme: 'grid',
    styles: { font, fontSize: 7.5, cellPadding: { top: 4, right: 3, bottom: 4, left: 3 }, overflow: 'linebreak', textColor: [42, 26, 20], lineColor: [232, 224, 218], lineWidth: 0.5, valign: 'middle' },
    headStyles: { fillColor: [200, 80, 45], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, overflow: 'linebreak', halign: 'center' },
    alternateRowStyles: { fillColor: [250, 246, 243] },
    columnStyles: {
      0: { cellWidth: 52, overflow: 'linebreak' },  // Deposit Number
      1: { cellWidth: 90, overflow: 'linebreak' },  // Purpose/Name
      2: { cellWidth: 66, overflow: 'linebreak' },  // Account Type
      3: { cellWidth: 86, overflow: 'linebreak' },  // Bank
      4: { cellWidth: 50, halign: 'center' },       // Status
      5: { cellWidth: 80, halign: 'right' },        // Principal (accounting: currency left, value right)
      6: { cellWidth: 54, halign: 'right' },        // Rate of Interest
      7: { cellWidth: 58, halign: 'center' },       // Start Date
      8: { cellWidth: 58, halign: 'center' },       // Pre-closure Date
      9: { cellWidth: 66, halign: 'center' },       // Planned / Matured Date
      10: { cellWidth: 80, halign: 'right' },       // Maturity Value (accounting)
    },
    margin: { left: marginX, right: marginX, top: 28, bottom: 28 },
    tableWidth: tableW,
    didDrawPage: (data) => drawPageChrome(data.pageNumber),
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
      if (data.section === 'body' && (data.column.index === 5 || data.column.index === 10)) {
        // Accounting style drawn in didDrawCell (currency left, value right)
        data.cell.text = [''];
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && (data.column.index === 5 || data.column.index === 10)) {
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

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(250, 246, 243);
    doc.rect(marginX, pageHeight - 24, pageWidth - marginX * 2, 18, 'F');
    doc.setFont(font, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 110, 105);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 16, { align: 'center' });
  }

  const path = await save({ title: 'Export deposits', defaultPath: folioFileName('depositSummary', 'pdf'), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
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


import { ACCOUNT_OPTIONS, COMPOUNDING_OPTIONS, NOMINEE_RELATIONSHIP_OPTIONS, OPERATION_TYPE_OPTIONS, PAYOUT_OPTIONS, ROLLOVER_OPTIONS } from '../components/deposits/depositFormModel';

type Rgb = [number, number, number];

const STATUS_SEMANTIC: Record<DepositLifecycleStatus, PdfSemanticColor> = {
  [DepositLifecycleStatus.Planned]: 'info',
  [DepositLifecycleStatus.Active]: 'success',
  [DepositLifecycleStatus.Matured]: 'warning',
  [DepositLifecycleStatus.PreClosed]: 'error',
  [DepositLifecycleStatus.InLien]: 'error',
};

const STATUS_LABEL_KEYS: Record<DepositLifecycleStatus, string> = {
  [DepositLifecycleStatus.Planned]: 'deposit.lifecycle.planned',
  [DepositLifecycleStatus.Active]: 'deposit.lifecycle.active',
  [DepositLifecycleStatus.Matured]: 'deposit.lifecycle.matured',
  [DepositLifecycleStatus.PreClosed]: 'deposit.lifecycle.preClosed',
  [DepositLifecycleStatus.InLien]: 'deposit.lifecycle.inLien',
};

const ACCOUNT_TYPE_RGB: Record<string, { bg: Rgb; border: Rgb; text: Rgb }> = {
  fd: { bg: [240, 253, 244], border: [134, 239, 172], text: [21, 128, 61] },
  rd: { bg: [239, 246, 255], border: [147, 197, 253], text: [29, 78, 216] },
  'tax-saving': { bg: [254, 252, 232], border: [253, 224, 71], text: [161, 98, 7] },
  savings: { bg: [236, 253, 250], border: [94, 234, 212], text: [15, 118, 110] },
  nsc: { bg: [245, 243, 255], border: [196, 181, 253], text: [109, 40, 217] },
  other: { bg: [248, 250, 252], border: [203, 213, 225], text: [71, 85, 105] },
};

function tr(key: string): string {
  return translate(key as never);
}

function labelFromOptions<T extends string>(options: Array<{ value: T; label: string }>, value: T | undefined): string {
  if (!value) return '—';
  const opt = options.find((o) => o.value === value);
  return opt ? tr(opt.label) : String(value);
}

function pdfTextValue(v: string | number | null | undefined): string {
  if (v === undefined || v === null || v === '') return '—';
  return String(v);
}

function boolText(v: boolean | undefined): string {
  return v ? tr('common.yes') : tr('common.no');
}

export async function exportDepositDetailPdf(
  record: DepositHolding,
  options?: { title?: string; filePrefix?: string },
): Promise<boolean> {
  const title = options?.title ?? tr('deposit.export.detailTitle');
  const institutions = await listFinancialInstitutions();
  const byId = new Map(institutions.map((fi) => [fi.id, fi]));
  const institution = record.financialInstitutionId ? byId.get(record.financialInstitutionId) : undefined;
  const institutionName = institution ? institutionLabel(institution) : (record.bankName || '');
  const lifecycle = getDepositLifecycleStatus(record);
  const isRd = record.accountType === 'rd';
  const computed = calculateDepositValues({
    accountType: record.accountType,
    principal: record.principal,
    recurringAmount: record.recurringAmount,
    interestRate: record.interestRate,
    startDate: record.startDate,
    maturityDate: record.maturityDate,
    cumulativeInterest: isRd ? true : (record.cumulativeInterest ?? false),
    compoundingFrequency: record.compoundingFrequency,
    payoutFrequency: record.payoutFrequency,
  });
  const tenure = formatDepositTenure(record.startDate, record.maturityDate);
  const operationType = record.operationType ?? 'single';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const font = await registerInterFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 28;
  const marginBottom = 30;
  const contentW = pageWidth - marginX * 2;
  const dateTime = exportDateTimeLabel();
  const logo = await loadLogoDataUrl('/folio-horizontal-color.svg');

  let page = 1;
  let y = 0;

  const drawPageBackground = () => {
    doc.setFillColor(250, 246, 243);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  const drawHeader = () => {
    drawPageBackground();
    let hy = 16;
    doc.setFont(font, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 110, 105);
    doc.text(dateTime, pageWidth - marginX, hy, { align: 'right' });
    hy = 24;
    if (logo) {
      const targetH = 30;
      const ratio = logo.width > 0 && logo.height > 0 ? logo.width / logo.height : 3.2;
      const w = targetH * ratio;
      doc.addImage(logo.dataUrl, 'PNG', (pageWidth - w) / 2, hy, w, targetH);
      hy += targetH + 14;
    } else {
      doc.setFont(font, 'bold');
      doc.setFontSize(16);
      doc.setTextColor(42, 26, 20);
      doc.text('Folio', pageWidth / 2, hy + 14, { align: 'center' });
      hy += 26;
    }
    doc.setFont(font, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(42, 26, 20);
    doc.text(title, pageWidth / 2, hy, { align: 'center' });
    y = hy + 16;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - marginBottom) {
      page += 1;
      doc.addPage();
      drawHeader();
    }
  };

  const wrapLines = (text: string, width: number, size: number, bold = false): string[] => {
    doc.setFont(font, bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    return doc.splitTextToSize(pdfTextValue(text), Math.max(10, width)) as string[];
  };

  type TagInfo = { text: string; colors: { bg: Rgb; border: Rgb; text: Rgb } };
  type Field = { label: string; value?: string; tag?: TagInfo; subtext?: string };

  const fieldHeight = (f: Field, colW: number): number => {
    const labelH = 9;
    if (f.tag) return labelH + 18 + (f.subtext ? 14 : 0);
    const lines = wrapLines(f.value ?? '—', colW, 9.5);
    const subH = f.subtext ? wrapLines(f.subtext, colW, 7.5).length * 10 + 4 : 0;
    return labelH + 3 + Math.max(12, lines.length * 12) + subH;
  };

  const drawTag = (text: string, x: number, yTop: number, colors: { bg: Rgb; border: Rgb; text: Rgb }) => {
    doc.setFont(font, 'bold');
    doc.setFontSize(6.8);
    const padX = 6;
    const h = 14;
    const tw = doc.getTextWidth(text) + padX * 2;
    drawRoundedRect(doc, x, yTop, tw, h, 7, colors.bg, colors.border);
    doc.setTextColor(...colors.text);
    doc.text(text, x + padX, yTop + 9.5);
  };

  const drawFields = (x: number, top: number, w: number, fields: Field[], cols = 2): number => {
    const gapX = 12;
    const colW = (w - gapX * (cols - 1)) / cols;
    let rowY = top;
    let i = 0;
    while (i < fields.length) {
      const row = fields.slice(i, i + cols);
      const rh = Math.max(...row.map((f) => fieldHeight(f, colW)));
      ensureSpace(rh + 14);
      row.forEach((f, c) => {
        const fx = x + c * (colW + gapX);
        doc.setFont(font, 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(110, 100, 95);
        doc.text(f.label.toUpperCase(), fx, rowY);
        if (f.tag) {
          drawTag(f.tag.text, fx, rowY + 3, f.tag.colors);
          if (f.subtext) {
            doc.setFont(font, 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(80, 110, 140);
            const sl = wrapLines(f.subtext, colW, 7.5);
            doc.text(sl, fx, rowY + 22);
          }
        } else {
          doc.setFont(font, 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(42, 26, 20);
          const lines = wrapLines(f.value ?? '—', colW, 9.5);
          doc.text(lines, fx, rowY + 12);
          if (f.subtext) {
            doc.setFont(font, 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(80, 110, 140);
            const sl = wrapLines(f.subtext, colW, 7.5);
            doc.text(sl, fx, rowY + 12 + Math.max(12, lines.length * 12) + 2);
          }
        }
      });
      rowY += rh + 10;
      i += cols;
    }
    return rowY;
  };


  // Re-implement with proper measure/draw
  const measureFields = (fields: Field[], w: number, cols = 2): number => {
    const gapX = 12;
    const colW = (w - gapX * (cols - 1)) / cols;
    let my = 0; let j = 0;
    while (j < fields.length) {
      const row = fields.slice(j, j + cols);
      my += Math.max(...row.map((f) => fieldHeight(f, colW))) + 10;
      j += cols;
    }
    return my;
  };

  const renderSection = (sectionTitle: string, fields: Field[], cols = 2) => {
    if (fields.length === 0) return;
    const pad = 12;
    const headerH = 22;
    const x = marginX;
    const w = contentW;
    const innerW = w - pad * 2;
    const bodyH = measureFields(fields, innerW, cols);
    const cardH = headerH + pad + bodyH + 4;
    ensureSpace(cardH + 8);
    const startY = y;
    drawRoundedRect(doc, x, startY, w, cardH, 10, [255, 255, 255], [232, 224, 218]);
    doc.setDrawColor(232, 224, 218);
    doc.setLineWidth(0.5);
    doc.line(x, startY + headerH, x + w, startY + headerH);
    doc.setFont(font, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 100, 95);
    doc.text(sectionTitle.toUpperCase(), x + pad, startY + 14);
    drawFields(x + pad, startY + headerH + pad, innerW, fields, cols);
    y = startY + cardH + 10;
  };

  const renderNestedSection = (parentX: number, parentW: number, sectionTitle: string | null, fields: Field[], cols = 2): number => {
    // renders inside an existing card area starting at current y; returns new y
    const pad = 10;
    const innerW = parentW - pad * 2;
    const hasTitle = Boolean(sectionTitle?.trim());
    const bodyH = measureFields(fields, innerW, cols);
    const boxH = (hasTitle ? 18 : 10) + bodyH + 6;
    ensureSpace(boxH + 8);
    drawRoundedRect(doc, parentX, y, parentW, boxH, 8, [250, 247, 244], [232, 224, 218]);
    if (hasTitle && sectionTitle) {
      doc.setFont(font, 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(110, 100, 95);
      doc.text(sectionTitle.toUpperCase(), parentX + pad, y + 12);
    }
    drawFields(parentX + pad, y + (hasTitle ? 18 : 10), innerW, fields, cols);
    y += boxH + 8;
    return y;
  };

  drawHeader();

  // Pre-closure alert
  if (record.preClosedDate) {
    const loss = Math.max(0, computed.realizedValue - (record.preClosureCreditedValue ?? 0));
    const msg = `${tr('deposit.fields.loss')}: ${formatINR(loss, { decimals: 2 })}`;
    ensureSpace(34);
    drawRoundedRect(doc, marginX, y, contentW, 26, 8, [254, 252, 232], [253, 224, 71]);
    doc.setFont(font, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(161, 98, 7);
    doc.text(msg, marginX + 10, y + 16);
    y += 34;
  }

  const statusText = lifecycle ? tr(STATUS_LABEL_KEYS[lifecycle] || lifecycle) : '—';
  const statusColors: { bg: Rgb; border: Rgb; text: Rgb } | undefined = (() => {
    if (!lifecycle) return undefined;
    const sem = STATUS_SEMANTIC[lifecycle];
    if (!sem) return undefined;
    const map: Record<PdfSemanticColor, { bg: Rgb; border: Rgb; text: Rgb }> = {
      info: { bg: [239, 246, 255], border: [147, 197, 253], text: [29, 78, 216] },
      success: { bg: [240, 253, 244], border: [134, 239, 172], text: [21, 128, 61] },
      warning: { bg: [254, 252, 232], border: [253, 224, 71], text: [161, 98, 7] },
      error: { bg: [254, 242, 242], border: [252, 165, 165], text: [185, 28, 28] },
      neutral: { bg: [248, 245, 242], border: [220, 210, 202], text: [72, 58, 52] },
    };
    return map[sem];
  })();
  const accountText = labelFromOptions(ACCOUNT_OPTIONS as Array<{ value: string; label: string }>, record.accountType)
    || ({ savings: tr('deposit.account.savings'), nsc: tr('deposit.account.nsc'), 'tax-saving': tr('deposit.account.taxSaving') } as Record<string, string>)[record.accountType]
    || record.accountType;
  const accountTag: TagInfo = { text: accountText, colors: ACCOUNT_TYPE_RGB[record.accountType] ?? ACCOUNT_TYPE_RGB.other ?? { bg: [248, 250, 252], border: [203, 213, 225], text: [71, 85, 105] } };
  const opText = labelFromOptions(OPERATION_TYPE_OPTIONS as Array<{ value: string; label: string }>, operationType);

  // Overview (order: deposit number/name, status/institution, account type/operation type)
  const overviewFields: Field[] = [
    { label: tr('deposit.fields.depositNumber'), value: record.depositNumber },
    { label: tr('deposit.fields.name'), value: record.name },
    lifecycle && statusColors ? { label: tr('deposit.fields.lifecycle'), tag: { text: statusText, colors: statusColors } } : { label: tr('deposit.fields.lifecycle'), value: '—' },
    { label: tr('deposit.fields.institution'), value: institutionName },
    { label: tr('deposit.fields.accountType'), tag: accountTag },
    { label: tr('deposit.fields.operationType'), value: opText },
  ];
  renderSection(tr('deposit.section.overview'), overviewFields);

  // Joint holders (inside overview in UI - render as its own card/context; simplest: section-like block)
  if (operationType !== 'single' && record.jointHolders?.length) {
    // Render each holder as nested info; do it in a section container
    const pad = 12; const headerH = 22; const x = marginX; const w = contentW; const innerW = w - pad * 2;
    let holdersH = 0;
    for (const h of record.jointHolders) {
      const hf: Field[] = [
        { label: tr('deposit.fields.jointHolderName'), value: h.name },
        { label: tr('deposit.fields.jointHolderDob'), value: h.dateOfBirth ? formatDate(h.dateOfBirth) : undefined },
        { label: tr('deposit.fields.jointHolderShare'), value: `${h.share}%` },
      ];
      holdersH += 18 + measureFields(hf, innerW - 20, 2) + 10;
    }
    const cardH = headerH + pad + holdersH + 4;
    ensureSpace(Math.min(cardH, 120) + 8);
    const startY = y;
    // if very tall, draw simply without perfect card split handling
    drawRoundedRect(doc, x, startY, w, Math.max(cardH, headerH + 30), 10, [255, 255, 255], [232, 224, 218]);
    doc.setDrawColor(232, 224, 218); doc.setLineWidth(0.5);
    doc.line(x, startY + headerH, x + w, startY + headerH);
    doc.setFont(font, 'bold'); doc.setFontSize(7.5); doc.setTextColor(110, 100, 95);
    doc.text(tr('deposit.section.jointHolders').toUpperCase(), x + pad, startY + 14);
    y = startY + headerH + pad;
    for (const h of record.jointHolders) {
      renderNestedSection(x + pad, innerW, null, [
        { label: tr('deposit.fields.jointHolderName'), value: h.name },
        { label: tr('deposit.fields.jointHolderDob'), value: h.dateOfBirth ? formatDate(h.dateOfBirth) : undefined },
        { label: tr('deposit.fields.jointHolderShare'), value: `${h.share}%` },
      ], 2);
    }
    y = Math.max(y, startY + cardH) + 10;
  }

  // Investment
  const investmentFields: Field[] = [];
  if (isRd) investmentFields.push({ label: tr('deposit.fields.recurringAmount'), value: record.recurringAmount != null ? formatINR(record.recurringAmount) : '—' });
  else investmentFields.push({ label: tr('deposit.fields.principal'), value: formatINR(record.principal) });
  investmentFields.push(
    { label: tr('deposit.fields.interestRate'), value: formatPercent(record.interestRate) },
    { label: tr('deposit.fields.startDate'), value: record.startDate ? formatDate(record.startDate) : '—' },
    { label: tr('deposit.fields.maturityDate'), value: record.maturityDate ? formatDate(record.maturityDate) : '—' },
    { label: tr('deposit.fields.tenure'), value: tenure ?? '—' },
    { label: tr('deposit.fields.operationMode'), value: record.operationMode === 'offline' ? tr('institutions.operation.offline') : tr('institutions.operation.online') },
    { label: tr('deposit.fields.isPanLinked'), value: boolText(record.isPanLinked) },
    { label: tr('deposit.fields.isTaxExempt'), value: boolText(record.isTaxExempt) },
  );
  if (!isRd) investmentFields.push({ label: tr('deposit.fields.markedAsLien'), value: boolText(record.markedAsLien) });
  if (!isRd && record.markedAsLien && record.lienReason) investmentFields.push({ label: tr('deposit.fields.lienReason'), value: record.lienReason });
  if (record.preClosedDate) {
    investmentFields.push(
      { label: tr('deposit.fields.preClosedDate'), value: formatDate(record.preClosedDate) },
      { label: tr('deposit.fields.creditedValue'), value: record.preClosureCreditedValue != null ? formatINR(record.preClosureCreditedValue) : '—' },
      { label: tr('deposit.fields.loss'), value: record.preClosureCreditedValue != null ? formatINR(Math.max(0, computed.realizedValue - record.preClosureCreditedValue)) : '—' },
    );
  }
  renderSection(tr('deposit.section.investment'), investmentFields);

  // Maturity
  const freqValue = record.cumulativeInterest === false && !isRd ? record.payoutFrequency : record.compoundingFrequency;
  const freqText = record.cumulativeInterest === false && !isRd
    ? labelFromOptions(PAYOUT_OPTIONS as Array<{ value: string; label: string }>, freqValue)
    : labelFromOptions(COMPOUNDING_OPTIONS as Array<{ value: string; label: string }>, freqValue);
  const payoutsPerYear = record.payoutFrequency
    ? ({ monthly: 12, quarterly: 4, 'semi-annual': 2, annual: 1 } as const)[record.payoutFrequency]
    : undefined;
  const payoutAmount = computed.interestPayoutAmount ?? (
    !isRd && record.cumulativeInterest === false && payoutsPerYear
      ? (record.principal * record.interestRate) / 100 / payoutsPerYear
      : undefined
  );
  const payoutFreqShort = record.payoutFrequency === 'monthly' ? tr('deposit.frequency.short.monthly')
    : record.payoutFrequency === 'quarterly' ? tr('deposit.frequency.short.quarterly')
    : record.payoutFrequency === 'semi-annual' ? tr('deposit.frequency.short.semiAnnual')
    : record.payoutFrequency === 'annual' ? tr('deposit.frequency.short.annual')
    : '';
  const showPayoutCredit = !isRd && record.cumulativeInterest === false && payoutAmount != null && Number.isFinite(payoutAmount) && !!record.payoutFrequency;
  const interestValue = showPayoutCredit
    ? tr('deposit.interestCredit').replace('{frequency}', payoutFreqShort).replace('{amount}', formatINR(payoutAmount, { decimals: 2 }))
    : formatINR(computed.interest);
  const interestSubtext = showPayoutCredit
    ? `${tr('deposit.fields.totalInterestAccrued')}: ${formatINR(computed.interest, { decimals: 2 })}`
    : undefined;
  const maturityFields: Field[] = [];
  if (!isRd) maturityFields.push({ label: tr('deposit.fields.cumulativeInterest'), value: boolText(record.cumulativeInterest) });
  maturityFields.push(
    { label: (isRd || record.cumulativeInterest !== false) ? tr('deposit.fields.compounding') : tr('deposit.fields.payoutFrequency'), value: freqText },
    { label: tr('deposit.fields.rollover'), value: labelFromOptions(ROLLOVER_OPTIONS as Array<{ value: string; label: string }>, record.rollover) },
    { label: tr(isRd ? 'deposit.fields.compoundInterest' : 'deposit.fields.interest'), value: interestValue, subtext: interestSubtext },
    { label: tr('deposit.fields.realizedValue'), value: formatINR(!isRd && record.cumulativeInterest === false ? computed.realizedValue : (record.currentValue ?? computed.realizedValue)) },
  );
  renderSection(tr('deposit.section.maturity'), maturityFields);

  // Additional
  if (record.nominees?.length || record.notes) {
    const pad = 12; const headerH = 22; const x = marginX; const w = contentW; const innerW = w - pad * 2;
    let addH = 0;
    if (record.nominees?.length) {
      for (const n of record.nominees) {
        const rel = labelFromOptions(NOMINEE_RELATIONSHIP_OPTIONS as Array<{ value: string; label: string }>, n.relationship);
        const nf: Field[] = [
          { label: tr('deposit.fields.nomineeName'), value: n.name },
          { label: tr('deposit.fields.nomineeRelationship'), value: rel },
          { label: tr('deposit.fields.nomineeDob'), value: n.dateOfBirth ? formatDate(n.dateOfBirth) : undefined },
          { label: tr('deposit.fields.nomineeShare'), value: `${n.share}%` },
        ];
        addH += 18 + measureFields(nf, innerW - 20, 2) + 10;
      }
      addH += 10;
    }
    if (record.notes) addH += measureFields([{ label: tr('deposit.fields.notes'), value: record.notes }], innerW, 1) + 6;
    const cardH = headerH + pad + addH + 4;
    ensureSpace(Math.min(cardH, 120) + 8);
    const startY = y;
    drawRoundedRect(doc, x, startY, w, Math.max(cardH, headerH + 30), 10, [255, 255, 255], [232, 224, 218]);
    doc.setDrawColor(232, 224, 218); doc.setLineWidth(0.5);
    doc.line(x, startY + headerH, x + w, startY + headerH);
    doc.setFont(font, 'bold'); doc.setFontSize(7.5); doc.setTextColor(110, 100, 95);
    doc.text(tr('deposit.section.additional').toUpperCase(), x + pad, startY + 14);
    y = startY + headerH + pad;
    if (record.nominees?.length) {
      doc.setFont(font, 'bold'); doc.setFontSize(6.8); doc.setTextColor(110, 100, 95);
      doc.text(tr('deposit.section.nominees').toUpperCase(), x + pad, y);
      y += 10;
      for (const n of record.nominees) {
        const rel = labelFromOptions(NOMINEE_RELATIONSHIP_OPTIONS as Array<{ value: string; label: string }>, n.relationship);
        renderNestedSection(x + pad, innerW, null, [
          { label: tr('deposit.fields.nomineeName'), value: n.name },
          { label: tr('deposit.fields.nomineeRelationship'), value: rel },
          { label: tr('deposit.fields.nomineeDob'), value: n.dateOfBirth ? formatDate(n.dateOfBirth) : undefined },
          { label: tr('deposit.fields.nomineeShare'), value: `${n.share}%` },
        ], 2);
      }
    }
    if (record.notes) {
      drawFields(x + pad, y, innerW, [{ label: tr('deposit.fields.notes'), value: record.notes }], 1);
      y += measureFields([{ label: tr('deposit.fields.notes'), value: record.notes }], innerW, 1) + 4;
    }
    y = Math.max(y, startY + cardH) + 10;
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(250, 246, 243);
    doc.rect(marginX, pageHeight - 22, pageWidth - marginX * 2, 16, 'F');
    doc.setFont(font, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 110, 105);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 14, { align: 'center' });
  }

  const depositNumber = record.depositNumber ? sanitizeFileNamePart(record.depositNumber) : undefined;
  const path = await save({
    title: 'Export deposit',
    defaultPath: folioFileName('depositDetail', 'pdf', { suffix: depositNumber }),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (!path) return false;
  const buffer = doc.output('arraybuffer');
  await writeFile(path, new Uint8Array(buffer));
  return true;
}
