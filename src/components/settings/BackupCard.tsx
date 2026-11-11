import { useRef, useState } from 'react';
import { App as AntApp, Button } from 'antd';
import { Download, FileDown, RotateCcw } from 'lucide-react';
import ExcelJS from 'exceljs';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { palette } from '../../theme/palette';
import { useI18n } from '../../i18n';
import { useToast } from '../common/toast/ToastProvider';
import { createBackup, saveBackupToChosenLocation, buildExportReport, restoreBackup } from '../../services/backup';
import { validateBackupWithErrors } from '../../utils/backupSchema';
import { getDepositLifecycleStatus } from '../../utils/deposits';
import { folioFileName } from '../../utils/fileNaming';
import { ReportTable } from './BackupReportDialog';
import { showBackupErrorDialog, showBackupReportDialog } from './BackupReportDialog';
import type { BackupReport } from '../../types';

type PendingAction = 'export' | 'restore' | null;

const ENTITY_SHEET_NAMES: Record<string, string> = {
  financialInstitutions: 'Financial Institutions',
  deposits: 'Deposits',
  stocks: 'Stocks',
  bonds: 'Bonds',
  pfAccounts: 'PF Accounts',
  commodities: 'Commodities',
  debts: 'Debts',
  root: 'File',
};

function sheetNameForEntity(entity: string): string {
  const name = ENTITY_SHEET_NAMES[entity] ?? entity;
  // Excel sheet names: max 31 chars, cannot contain : \ / ? * [ ]
  return name.replace(/[:\\/?*\[\]]/g, ' ').slice(0, 31);
}

function toArgb(hex: string): string {
  return `FF${hex.replace('#', '').toUpperCase()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strVal(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v);
}

function depositStatusLabel(record: Record<string, unknown> | null): string {
  if (!record) return '';
  const status = getDepositLifecycleStatus({
    startDate: typeof record.startDate === 'string' ? record.startDate : '',
    maturityDate: typeof record.maturityDate === 'string' ? record.maturityDate : '',
    preClosedDate: typeof record.preClosedDate === 'string' ? record.preClosedDate : undefined,
    markedAsLien: typeof record.markedAsLien === 'boolean' ? record.markedAsLien : undefined,
  } as any);
  switch (status) {
    case 'planned': return 'Planned';
    case 'active': return 'Active';
    case 'matured': return 'Matured';
    case 'pre-closed': return 'Pre-closed';
    case 'in-lien': return 'In Lien';
    default: return '';
  }
}

function resolveFiName(record: Record<string, unknown> | null, fis: unknown[]): string {
  if (!record) return '';
  const fiId = typeof record.financialInstitutionId === 'string' ? record.financialInstitutionId : '';
  if (fiId) {
    const fi = fis.find((x) => isRecord(x) && x.id === fiId);
    if (fi && isRecord(fi) && typeof fi.name === 'string') return fi.name;
  }
  return typeof record.bankName === 'string' ? record.bankName : '';
}

function styleHeader(sheet: ExcelJS.Worksheet, colCount: number) {
  const headerFill = toArgb(palette.primary);
  const headerText = toArgb(palette.onPrimary);
  const headerBorder = toArgb(palette.primaryActive);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: headerText } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerFill } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 20;
  for (let c = 1; c <= colCount; c++) {
    headerRow.getCell(c).border = {
      bottom: { style: 'thin', color: { argb: headerBorder } },
    };
  }
  sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + colCount)}1` };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

async function saveRestoreErrorReport(
  errors: Array<{ entity: string; recordIndex?: number; recordId: string; recordName: string; field: string; reason: string; category: string; rawValue: string }>,
  backupData?: unknown,
): Promise<boolean> {
  const path = await save({
    defaultPath: folioFileName('restoreErrorLog', 'xlsx'),
    filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
    title: 'Save restore error report',
  });
  if (!path) return false;

  const root = isRecord(backupData) ? backupData : {};
  const data = isRecord((root as any).data) ? (root as any).data : root;
  const fiList = Array.isArray((data as any).financialInstitutions) ? (data as any).financialInstitutions : [];

  const getRecord = (entity: string, recordIndex: number | undefined): Record<string, unknown> | null => {
    if (recordIndex === undefined || recordIndex < 0) return null;
    const arr = (data as any)[entity];
    if (!Array.isArray(arr)) return null;
    const r = arr[recordIndex];
    return isRecord(r) ? r : null;
  };

  const grouped = new Map<string, typeof errors>();
  for (const e of errors) {
    const key = e.entity || 'root';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  const workbook = new ExcelJS.Workbook();
  const entityOrder = ['financialInstitutions', 'deposits', 'stocks', 'bonds', 'pfAccounts', 'commodities', 'debts', 'root'];
  const orderedKeys = [...entityOrder.filter((k) => grouped.has(k)), ...[...grouped.keys()].filter((k) => !entityOrder.includes(k))];

  for (const key of orderedKeys) {
    const rows = grouped.get(key)!;
    const sheet = workbook.addWorksheet(sheetNameForEntity(key));

    if (key === 'financialInstitutions') {
      sheet.columns = [
        { header: 'Name', key: 'name', width: 26 },
        { header: 'Category', key: 'category', width: 22 },
        { header: 'Operation Mode', key: 'operationMode', width: 16 },
        { header: 'UUID', key: 'uuid', width: 28 },
        { header: 'Error Field', key: 'errorField', width: 22 },
        { header: 'Error Category', key: 'errorCategory', width: 26 },
        { header: 'Error Reason', key: 'errorReason', width: 44 },
        { header: 'Error Field Value', key: 'errorValue', width: 24 },
      ];
      styleHeader(sheet, 8);
      for (const e of rows) {
        const r = getRecord(key, e.recordIndex);
        sheet.addRow({
          name: strVal(r?.name),
          category: strVal(r?.category),
          operationMode: strVal(r?.operationMode),
          uuid: strVal(r?.id) || e.recordId,
          errorField: e.field,
          errorCategory: e.category,
          errorReason: e.reason,
          errorValue: e.rawValue,
        });
      }
    } else if (key === 'deposits') {
      sheet.columns = [
        { header: 'Deposit Number', key: 'depositNumber', width: 18 },
        { header: 'Deposit Name', key: 'depositName', width: 28 },
        { header: 'Financial Institution (name)', key: 'fiName', width: 28 },
        { header: 'Account Type', key: 'accountType', width: 16 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Principal', key: 'principal', width: 16 },
        { header: 'Operation Type', key: 'operationType', width: 18 },
        { header: 'Error Field', key: 'errorField', width: 22 },
        { header: 'Error Category', key: 'errorCategory', width: 26 },
        { header: 'Error Reason', key: 'errorReason', width: 44 },
        { header: 'Error Field Value', key: 'errorValue', width: 24 },
      ];
      styleHeader(sheet, 11);
      for (const e of rows) {
        const r = getRecord(key, e.recordIndex);
        sheet.addRow({
          depositNumber: strVal(r?.depositNumber),
          depositName: strVal(r?.name),
          fiName: resolveFiName(r, fiList),
          accountType: strVal(r?.accountType),
          status: depositStatusLabel(r),
          principal: r?.principal ?? '',
          operationType: strVal(r?.operationType),
          errorField: e.field,
          errorCategory: e.category,
          errorReason: e.reason,
          errorValue: e.rawValue,
        });
      }
    } else {
      sheet.columns = [
        { header: 'Record ID', key: 'recordId', width: 24 },
        { header: 'Record Name', key: 'recordName', width: 28 },
        { header: 'Field', key: 'field', width: 22 },
        { header: 'Category', key: 'category', width: 28 },
        { header: 'Reason', key: 'reason', width: 44 },
        { header: 'Invalid Value', key: 'rawValue', width: 24 },
      ];
      styleHeader(sheet, 6);
      for (const e of rows) {
        sheet.addRow({
          recordId: e.recordId,
          recordName: e.recordName,
          field: e.field,
          category: e.category,
          reason: e.reason,
          rawValue: e.rawValue,
        });
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  await writeFile(path, buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as ArrayBuffer));
  return true;
}

export default function BackupCard() {
  const { t } = useI18n();
  const { modal } = AntApp.useApp();
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingAction>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setPending('export');
    try {
      const backup = await createBackup();
      const report = buildExportReport(backup);

      const confirmed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: t('backup.report.exportPreviewTitle'),
          content: (
            <div className="space-y-3">
              <p className="text-[13px] text-folio-ink/70 dark:text-white/60">{t('backup.report.exportPreviewBody')}</p>
              <ReportTable report={report} t={t} mode="preview" />
            </div>
          ),
          okText: t('backup.report.confirm'),
          cancelText: t('common.cancel'),
          centered: true,
          width: 520,
          icon: null,
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      if (!confirmed) return;

      const saved = await saveBackupToChosenLocation(backup);
      if (!saved) return;

      showBackupReportDialog(modal, t, report);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('backup.createError');
      showBackupErrorDialog(modal, t, message);
    } finally {
      setPending(null);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setPending('restore');
    try {
      if (file.size > 25 * 1024 * 1024) {
        showBackupErrorDialog(modal, t, t('backup.tooLarge'));
        return;
      }

      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        showBackupErrorDialog(modal, t, t('backup.invalidFile'));
        return;
      }

      // Step 1: Validate with structured errors
      const validation = validateBackupWithErrors(parsed);

      if (!validation.valid && validation.errorSummary) {
        const summary = validation.errorSummary;

        // Show entity summary with clickable error details
        await new Promise<void>((resolve) => {
          const csvErrors = summary.errors.map((e) => ({
            entity: e.entity,
            recordIndex: e.recordIndex,
            recordId: e.recordId,
            recordName: e.recordName,
            field: e.field,
            reason: e.reason,
            category: e.category,
            rawValue: e.rawValue,
          }));

          const entityReport: BackupReport = {
            kind: 'restore',
            rows: summary.entities.map((entity) => ({
              itemLabelKey: entity.labelKey,
              success: entity.success,
              errors: entity.errors,
              errorCategories: entity.errorCategories,
            })),
          };

          function RestoreErrorSummaryView() {
            return (
              <div className="space-y-3">
                <p className="text-[13px] text-folio-ink/70 dark:text-white/60">
                  {t('backup.error.summaryBody')}
                </p>
                {summary.entities.length > 0 ? (
                  <ReportTable report={entityReport} t={t} mode="result" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="border-b border-folio-ink/10 text-left text-folio-ink/60 dark:border-white/10 dark:text-white/55">
                          <th className="py-2 pr-3 font-medium">{t('backup.error.errorType')}</th>
                          <th className="py-2 text-right font-medium">{t('backup.error.count')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(summary.errorsByType).map(([type, count]) => (
                          <tr key={type} className="border-b border-folio-ink/[0.06] last:border-b-0 dark:border-white/[0.06]">
                            <td className="py-2 pr-3 text-folio-ink dark:text-white/90">{type}</td>
                            <td className="py-2 text-right tabular-nums text-red-600 dark:text-red-400">{count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          }

          let modalRef: { destroy: () => void } | null = null;
          const closeWithToast = () => {
            modalRef?.destroy();
            resolve();
            toast.error(t('backup.restoreNotSuccessful'));
          };
          modalRef = modal.error({
            title: t('backup.error.summaryTitle'),
            content: <RestoreErrorSummaryView />,
            centered: true,
            width: 560,
            footer: (
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  danger
                  icon={<FileDown size={14} />}
                  onClick={() => { void saveRestoreErrorReport(csvErrors, parsed); }}
                >
                  {t('backup.error.downloadReport')}
                </Button>
                <Button type="primary" onClick={closeWithToast}>
                  {t('backup.report.ok')}
                </Button>
              </div>
            ),
            onCancel: closeWithToast,
          }) as any;
        });
        return;
      }

      // Step 2: Build preview report
      const report = buildExportReport(validation.backup!);

      // Step 3: Show preview dialog before restoring
      const confirmed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: t('backup.report.restorePreviewTitle'),
          content: (
            <div className="space-y-3">
              <p className="text-[13px] text-folio-ink/70 dark:text-white/60">{t('backup.report.restorePreviewBody')}</p>
              <ReportTable report={report} t={t} mode="preview" />
            </div>
          ),
          okText: t('backup.report.confirm'),
          cancelText: t('common.cancel'),
          centered: true,
          width: 520,
          icon: null,
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      if (!confirmed) return;

      // Step 4: Restore
      const result = await restoreBackup(validation.backup!);
      console.info('[folio/backup] restore result', result);

      // Step 5: Show final result
      showBackupReportDialog(modal, t, result.report);
    } catch (error) {
      console.error('[folio/backup] restore failed', error);
      const message =
        error instanceof Error ? (error.message || t('backup.restoreError')) :
        typeof error === 'string' ? error :
        t('backup.restoreError');
      showBackupErrorDialog(modal, t, message);
      toast.error(t('backup.restoreNotSuccessful'));
    } finally {
      setPending(null);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <div className="divide-y divide-folio-ink/10 dark:divide-white/[0.07]">
        <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
          <div className="min-w-0">
            <span className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.backup.download')}</span>
            <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">{t('settings.backup.downloadSubtext')}</p>
          </div>
          <Button
            type="primary"
            icon={<Download size={14} />}
            loading={pending === 'export'}
            disabled={pending === 'restore'}
            onClick={() => void handleExport()}
          >
            {t('settings.backup.downloadButton')}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
          <div className="min-w-0">
            <span className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.backup.restore')}</span>
            <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">
              {t('settings.backup.restoreSubtextBefore')}
              <strong>{t('settings.backup.restoreSubtextReplace')}</strong>
              {t('settings.backup.restoreSubtextAfter')}
            </p>
          </div>
          <Button
            icon={<RotateCcw size={14} />}
            loading={pending === 'restore'}
            disabled={pending === 'export'}
            onClick={() => inputRef.current?.click()}
          >
            {t('settings.backup.restoreButton')}
          </Button>
        </div>
      </div>
    </div>
  );
}