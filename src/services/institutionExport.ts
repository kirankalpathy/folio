import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { FinancialInstitution } from '../types';
import { translate } from '../i18n';
import {
  drawSimpleFilters,
  exportDateTimeLabel,
  loadLogoDataUrl,
  registerInterFont,
  type PdfFilter,
} from './pdfExportUtils';
import { folioFileName } from '../utils/fileNaming';

export type InstitutionExportFormat = 'xlsx' | 'csv' | 'pdf';

export interface InstitutionExportOptions {
  filters?: PdfFilter[];
}

function categoryLabel(value: FinancialInstitution['category']): string {
  return translate(`institutions.category.${value}` as never);
}

function operationModeLabel(value: FinancialInstitution['operationMode']): string {
  return value === 'offline'
    ? translate('institutions.operation.offline')
    : translate('institutions.operation.online');
}

function displayId(r: FinancialInstitution): string {
  return r.accountNumber || r.cardNumber || r.dematAccountNumber || r.linkedMobile || r.walletId || r.upiId || '';
}

const HEADERS = [
  'Name',
  'Nickname',
  'Category',
  'Operation Mode',
  'Account / ID',
  'IFSC',
  'Branch',
  'Linked Mobile',
  'UPI ID',
  'Contact Person',
  'Contact Email',
  'Contact Phone',
] as const;

function buildRows(institutions: FinancialInstitution[]) {
  return institutions.map((r) => ({
    name: r.name,
    nickname: r.nickname ?? '',
    category: categoryLabel(r.category),
    operationMode: operationModeLabel(r.operationMode),
    idValue: displayId(r),
    ifsc: r.ifscCode ?? '',
    branch: r.branchName ?? '',
    linkedMobile: r.linkedMobile ?? '',
    upiId: r.upiId ?? '',
    contactPerson: r.contactPerson ?? '',
    contactEmail: r.contactEmail ?? '',
    contactPhone: r.contactPhone ?? '',
  }));
}

function csvEscape(value: string | number): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function exportXlsx(rows: ReturnType<typeof buildRows>): Promise<boolean> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Folio';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Financial Institutions', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: HEADERS[0], key: 'name', width: 26 },
    { header: HEADERS[1], key: 'nickname', width: 18 },
    { header: HEADERS[2], key: 'category', width: 24 },
    { header: HEADERS[3], key: 'operationMode', width: 14 },
    { header: HEADERS[4], key: 'idValue', width: 22 },
    { header: HEADERS[5], key: 'ifsc', width: 14 },
    { header: HEADERS[6], key: 'branch', width: 20 },
    { header: HEADERS[7], key: 'linkedMobile', width: 16 },
    { header: HEADERS[8], key: 'upiId', width: 22 },
    { header: HEADERS[9], key: 'contactPerson', width: 20 },
    { header: HEADERS[10], key: 'contactEmail', width: 24 },
    { header: HEADERS[11], key: 'contactPhone', width: 16 },
  ];
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 11 };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8502D' } };
  header.alignment = { vertical: 'middle' };
  header.height = 22;
  rows.forEach((r) => {
    const row = sheet.addRow(r);
    row.alignment = { vertical: 'middle' };
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
  const path = await save({
    title: 'Export financial institutions',
    defaultPath: folioFileName('financialInstitutions', 'xlsx'),
    filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
  });
  if (!path) return false;
  const buffer = await workbook.xlsx.writeBuffer();
  await writeFile(path, buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as ArrayBuffer));
  return true;
}

async function exportCsv(rows: ReturnType<typeof buildRows>): Promise<boolean> {
  const lines = [HEADERS.map(csvEscape).join(',')];
  for (const r of rows) {
    lines.push([
      r.name, r.nickname, r.category, r.operationMode, r.idValue, r.ifsc, r.branch,
      r.linkedMobile, r.upiId, r.contactPerson, r.contactEmail, r.contactPhone,
    ].map(csvEscape).join(','));
  }
  const path = await save({
    title: 'Export financial institutions',
    defaultPath: folioFileName('financialInstitutions', 'csv'),
    filters: [{ name: 'Comma Separated Values', extensions: ['csv'] }],
  });
  if (!path) return false;
  await writeTextFile(path, lines.join('\n'));
  return true;
}

async function exportPdf(
  institutions: FinancialInstitution[],
  options?: InstitutionExportOptions,
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
  doc.text('Financial Institutions', centerX, y, { align: 'center' });
  y += 16;

  y = drawSimpleFilters(doc, font, options?.filters ?? [], marginX, tableW, y);

  const drawPageChrome = (data?: { pageNumber: number }) => {
    const page = data?.pageNumber ?? (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }).internal.getCurrentPageInfo().pageNumber;
    doc.setFont(font, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 110, 105);
    doc.text(dateTime, pageWidth - marginX, 18, { align: 'right' });
    doc.text(`Page ${page} of ${totalPagesExp}`, pageWidth / 2, pageHeight - 16, { align: 'center' });
  };

  const body = institutions.map((r) => [
    r.name,
    r.nickname ?? '',
    categoryLabel(r.category),
    operationModeLabel(r.operationMode ?? 'online'),
    displayId(r),
    r.ifscCode ?? '',
    r.linkedMobile ?? '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [[
      'Name',
      'Nickname',
      'Category',
      'Operation Mode',
      'Account / ID',
      'IFSC',
      'Linked Mobile',
    ]],
    body,
    theme: 'grid',
    styles: { font, fontSize: 7.5, cellPadding: { top: 4, right: 3, bottom: 4, left: 3 }, overflow: 'linebreak', textColor: [42, 26, 20], lineColor: [232, 224, 218], lineWidth: 0.5, valign: 'middle' },
    headStyles: { fillColor: [200, 80, 45], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, overflow: 'linebreak', halign: 'center' },
    alternateRowStyles: { fillColor: [250, 246, 243] },
    columnStyles: {
      0: { cellWidth: 130, overflow: 'linebreak' },
      1: { cellWidth: 90, overflow: 'linebreak' },
      2: { cellWidth: 130, overflow: 'linebreak' },
      3: { cellWidth: 80, halign: 'center' },
      4: { cellWidth: 130, overflow: 'linebreak' },
      5: { cellWidth: 90 },
      6: { cellWidth: 90 },
    },
    margin: { left: marginX, right: marginX, top: 28, bottom: 28 },
    tableWidth: tableW,
    didDrawPage: (data) => drawPageChrome({ pageNumber: data.pageNumber }),
  });

  if (typeof (doc as unknown as { putTotalPages?: (s: string) => void }).putTotalPages === 'function') {
    (doc as unknown as { putTotalPages: (s: string) => void }).putTotalPages(totalPagesExp);
  }

  const path = await save({
    title: 'Export financial institutions',
    defaultPath: folioFileName('financialInstitutions', 'pdf'),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (!path) return false;
  const buffer = doc.output('arraybuffer');
  await writeFile(path, new Uint8Array(buffer));
  return true;
}

export async function exportInstitutions(
  institutions: FinancialInstitution[],
  format: InstitutionExportFormat,
  options?: InstitutionExportOptions,
): Promise<boolean> {
  if (format === 'pdf') return exportPdf(institutions, options);
  const rows = buildRows(institutions);
  return format === 'csv' ? exportCsv(rows) : exportXlsx(rows);
}
