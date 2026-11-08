import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { DepositHolding, FinancialInstitution } from '../types';
import { daysUntil, formatDate } from '../utils/date';
import { calculateDepositValues, formatDepositTenure, getDepositLifecycleStatus } from '../utils/deposits';
import { formatNumber, formatPercent, getNumberFormat } from '../utils/finance';
import { listFinancialInstitutions } from './financialInstitutions';

export type DepositExportFormat = 'xlsx' | 'csv' | 'pdf';

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
  'Principal (INR)',
  'Rate of Interest (% p.a.)',
  'Start Date',
  'Maturity Date',
  'Tenure',
  'Cumulative Interest',
  'Compounding / Payout Frequency',
  'Rollover',
  'Interest (INR)',
  'Realized Value (INR)',
  'Notes',
] as const;

function buildRows(deposits: DepositHolding[], byId: Map<string, FinancialInstitution>) {
  return deposits.map((d) => {
    const computed = calculateDepositValues({
      principal: d.principal,
      interestRate: d.interestRate,
      startDate: d.startDate,
      maturityDate: d.maturityDate,
      cumulativeInterest: d.cumulativeInterest ?? false,
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
      interestRate: d.interestRate,
      startDate: d.startDate ? formatDate(d.startDate) : '',
      maturityDate: d.maturityDate ? formatDate(d.maturityDate) : '',
      tenure: formatDepositTenure(d.startDate, d.maturityDate) ?? '',
      cumulativeInterest: d.cumulativeInterest ? 'Yes' : 'No',
      frequency: frequencyLabel(d.cumulativeInterest === false ? d.payoutFrequency : d.compoundingFrequency),
      rollover: rolloverLabel(d.rollover),
      interest: computed.interest,
      realizedValue: d.currentValue || computed.realizedValue,
      notes: d.notes ?? '',
    };
  });
}

function stampName(ext: string): string {
  const stamp = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `folio-deposits-${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}.${ext}`;
}

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
    { header: HEADERS[5], key: 'principal', width: 16 },
    { header: HEADERS[6], key: 'interestRate', width: 18 },
    { header: HEADERS[7], key: 'startDate', width: 14 },
    { header: HEADERS[8], key: 'maturityDate', width: 14 },
    { header: HEADERS[9], key: 'tenure', width: 22 },
    { header: HEADERS[10], key: 'cumulativeInterest', width: 16 },
    { header: HEADERS[11], key: 'frequency', width: 22 },
    { header: HEADERS[12], key: 'rollover', width: 18 },
    { header: HEADERS[13], key: 'interest', width: 16 },
    { header: HEADERS[14], key: 'realizedValue', width: 18 },
    { header: HEADERS[15], key: 'notes', width: 28 },
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
    row.getCell('interestRate').numFmt = rateFmt;
    row.getCell('interest').numFmt = numFmt;
    row.getCell('realizedValue').numFmt = numFmt;
    row.alignment = { vertical: 'middle' };
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };

  const path = await save({ title: 'Export deposits', defaultPath: stampName('xlsx'), filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }] });
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
      formatNumber(r.principal, 2), formatNumber(r.interestRate, 2), r.startDate, r.maturityDate, r.tenure,
      r.cumulativeInterest, r.frequency, r.rollover, formatNumber(r.interest, 2), formatNumber(r.realizedValue, 2), r.notes,
    ].map(csvEscape).join(','));
  }
  const path = await save({ title: 'Export deposits', defaultPath: stampName('csv'), filters: [{ name: 'Comma Separated Values', extensions: ['csv'] }] });
  if (!path) return false;
  await writeTextFile(path, lines.join('\n'));
  return true;
}

const STATUS_RGB: Record<string, [number, number, number]> = {
  Planned: [59, 130, 246],
  Active: [34, 197, 94],
  Matured: [234, 179, 8],
  'Pre-closed': [239, 68, 68],
};

async function exportPdf(deposits: DepositHolding[], byId: Map<string, FinancialInstitution>): Promise<boolean> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(42, 26, 20);
  doc.text('Folio — Deposit Summary', 40, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 110, 105);
  doc.text(`Exported ${new Date().toLocaleString('en-IN')} · ${deposits.length} record${deposits.length === 1 ? '' : 's'}`, 40, 54);

  const body = deposits.map((d) => {
    const lifecycle = lifecycleLabel(getDepositLifecycleStatus(d));
    const days = daysUntil(d.maturityDate);
    const maturityText = `${formatDate(d.maturityDate)}${Number.isFinite(days) ? (days < 0 ? ` (${Math.abs(days)}d past)` : days === 0 ? ' (Today)' : ` (${days}d left)`) : ''}`;
    const inst = institutionFullName(d, byId);
    const freq = frequencyLabel(d.cumulativeInterest === false ? d.payoutFrequency : d.compoundingFrequency);
    return [
      `${d.name}\n${accountTypeLabel(d.accountType)} · ${inst}`,
      lifecycle,
      `Rs. ${formatNumber(d.principal, 0)}`,
      `Rs. ${formatNumber(d.currentValue, 0)}`,
      `${formatPercent(d.interestRate, 2)}${freq ? `\n${freq}` : ''}`,
      maturityText,
    ];
  });

  autoTable(doc, {
    startY: 68,
    head: [['Deposit', 'Status', 'Principal', 'Current Value', 'Rate', 'Maturity']],
    body,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: { top: 4, right: 4, bottom: 4, left: 4 }, overflow: 'linebreak', textColor: [42, 26, 20], lineColor: [232, 224, 218], lineWidth: 0.5, valign: 'middle' },
    headStyles: { fillColor: [200, 80, 45], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [250, 246, 243] },
    columnStyles: {
      0: { cellWidth: 155, overflow: 'linebreak' },
      1: { cellWidth: 56, halign: 'center' },
      2: { cellWidth: 132, halign: 'right', cellPadding: { top: 4, right: 4, bottom: 4, left: 2 }, fontSize: 7.5 },
      3: { cellWidth: 136, halign: 'right', cellPadding: { top: 4, right: 4, bottom: 4, left: 2 }, fontSize: 7.5 },
      4: { cellWidth: 76, halign: 'right' },
      5: { cellWidth: 96, overflow: 'linebreak' },
    },
    margin: { left: 20, right: 20 },
    tableWidth: 'wrap',
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const status = String(data.cell.raw || '');
        const rgb = STATUS_RGB[status];
        if (rgb) {
          data.cell.styles.fillColor = rgb;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 7.5;
        }
      }
    },
  });

  const path = await save({ title: 'Export deposits', defaultPath: stampName('pdf'), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (!path) return false;
  const buffer = doc.output('arraybuffer');
  await writeFile(path, new Uint8Array(buffer));
  return true;
}

export async function exportDeposits(deposits: DepositHolding[], format: DepositExportFormat): Promise<boolean> {
  const institutions = await listFinancialInstitutions();
  const byId = new Map(institutions.map((fi) => [fi.id, fi]));
  if (format === 'pdf') return exportPdf(deposits, byId);
  const rows = buildRows(deposits, byId);
  return format === 'csv' ? exportCsv(rows) : exportXlsx(rows);
}

export async function exportDepositsToExcel(deposits: DepositHolding[]): Promise<boolean> {
  return exportDeposits(deposits, 'xlsx');
}

