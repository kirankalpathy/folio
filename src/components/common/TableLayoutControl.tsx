import { useMemo, useState } from 'react';
import { Button, Checkbox, Input, Popover } from 'antd';
import { ArrowDown, ArrowUp, Search, Settings2 } from 'lucide-react';
import type { TableColumnLayout, TableLayoutPrefs } from '../../types';
import { useI18n } from '../../i18n';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from './toast/ToastProvider';

export interface TableLayoutColumnDef {
  key: string;
  label: string;
  /** Always visible and fixed in behavior (e.g. actions). Not shown in customize list. */
  locked?: boolean;
  /** Always visible; hide option not shown in customize list. Can still be reordered. */
  required?: boolean;
  /** Default visibility when no saved preference includes this field. Defaults to true. */
  defaultVisible?: boolean;
}

interface Props {
  tableId: string;
  columns: TableLayoutColumnDef[];
  /** Placement of the settings button popover. */
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
  className?: string;
  /** Called after layout is reset (e.g. to scroll the table and perform UI updates). */
  onReset?: () => void;
}

function isAlwaysVisible(def: TableLayoutColumnDef): boolean {
  return !!def.locked || !!def.required;
}

function isDefaultVisible(def: TableLayoutColumnDef): boolean {
  if (isAlwaysVisible(def)) return true;
  return def.defaultVisible ?? true;
}

function normalizeLayout(defs: TableLayoutColumnDef[], prefs?: TableLayoutPrefs): TableColumnLayout[] {
  const byKey = new Map(defs.map((d) => [d.key, d]));
  const seen = new Set<string>();
  const out: TableColumnLayout[] = [];
  if (!prefs?.columns?.length) {
    return defs.map((def) => ({ key: def.key, visible: isDefaultVisible(def) }));
  }
  for (const col of prefs.columns) {
    const def = byKey.get(col.key);
    if (!def || seen.has(col.key)) continue;
    seen.add(col.key);
    out.push({ key: col.key, visible: isAlwaysVisible(def) ? true : col.visible !== false });
  }
  // Fields not present in saved prefs use their default visibility.
  for (const def of defs) {
    if (seen.has(def.key)) continue;
    out.push({ key: def.key, visible: isDefaultVisible(def) });
  }
  return out;
}

export function useTableLayout(tableId: string, columns: TableLayoutColumnDef[]) {
  const { settings, updateSettings } = useSettings();
  const layout = useMemo(
    () => normalizeLayout(columns, settings.tableLayouts?.[tableId]),
    [columns, settings.tableLayouts, tableId],
  );

  const saveLayout = async (next: TableColumnLayout[]) => {
    const tableLayouts = { ...(settings.tableLayouts ?? {}), [tableId]: { columns: next } };
    await updateSettings({ tableLayouts });
  };

  const visibleKeys = useMemo(
    () => new Set(layout.filter((c) => c.visible).map((c) => c.key)),
    [layout],
  );

  const orderedKeys = useMemo(() => layout.map((c) => c.key), [layout]);

  return { layout, visibleKeys, orderedKeys, saveLayout };
}

export default function TableLayoutControl({ tableId, columns, placement = 'bottomRight', className, onReset }: Props) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { settings } = useSettings();
  const { layout, saveLayout } = useTableLayout(tableId, columns);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const defs = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns]);
  const enabled = settings.smartTablesEnabled ?? true;

  const setVisible = (key: string, visible: boolean) => {
    const def = defs.get(key);
    if (!def || def.locked || def.required) return;
    void saveLayout(layout.map((c) => (c.key === key ? { ...c, visible } : c))).catch((e) => {
      toast.error(e instanceof Error ? e.message : String(e));
    });
  };

  const move = (key: string, dir: -1 | 1) => {
    const def = defs.get(key);
    if (def?.locked) return;
    const idx = layout.findIndex((c) => c.key === key);
    if (idx < 0) return;
    let j = idx + dir;
    while (j >= 0 && j < layout.length && defs.get(layout[j]!.key)?.locked) j += dir;
    if (j < 0 || j >= layout.length) return;
    const next = [...layout];
    const [item] = next.splice(idx, 1);
    if (!item) return;
    next.splice(j, 0, item);
    void saveLayout(next).catch((e) => {
      toast.error(e instanceof Error ? e.message : String(e));
    });
  };

  const reset = () => {
    void saveLayout(columns.map((c) => ({ key: c.key, visible: isDefaultVisible(c) })))
      .then(() => {
        setOpen(false);
        onReset?.();
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : String(e));
      });
  };

  const customizable = layout.filter((c) => !defs.get(c.key)?.locked);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCustomizable = normalizedQuery
    ? customizable.filter((c) => (defs.get(c.key)?.label ?? '').toLowerCase().includes(normalizedQuery))
    : customizable;

  if (!enabled) return null;

  return (
    <Popover
      trigger="click"
      placement={placement}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
      autoAdjustOverflow
      getPopupContainer={() => document.body}
      overlayInnerStyle={{ padding: 12, width: 320, maxWidth: 'min(92vw, 320px)' }}
      content={
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[13px] font-semibold text-folio-ink dark:text-folio-dark-text">{t('common.customizeLayoutFields')}</p>
              <p className="mt-0.5 text-[11px] text-folio-ink/55 dark:text-white/50">{t('common.customizeLayoutHint')}</p>
            </div>
            <Button type="link" size="small" className="!h-auto !px-0 !text-[11px]" onClick={reset}>{t('common.reset')}</Button>
          </div>
          <Input
            allowClear
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.searchFields')}
            prefix={<Search size={13} className="text-folio-ink/35 dark:text-white/35" />}
          />
          <div className="max-h-[min(50vh,320px)] space-y-1 overflow-auto pr-0.5">
            {visibleCustomizable.length === 0 ? (
              <p className="px-1 py-3 text-center text-[12px] text-folio-ink/45 dark:text-white/40">{t('common.noFieldsFound')}</p>
            ) : null}
            {visibleCustomizable.map((col) => {
              const def = defs.get(col.key);
              if (!def) return null;
              const actualIndex = customizable.findIndex((c) => c.key === col.key);
              const atTop = actualIndex <= 0;
              const atBottom = actualIndex >= customizable.length - 1;
              const alwaysVisible = !!def.required;
              return (
                <div key={col.key} className="flex items-center gap-1.5 rounded-md px-1 py-1 hover:bg-folio-ink/[0.03] dark:hover:bg-white/[0.04]">
                  {alwaysVisible ? (
                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true" />
                  ) : (
                    <Checkbox
                      checked={col.visible}
                      onChange={(e) => setVisible(col.key, e.target.checked)}
                      aria-label={`${t('common.showField')}: ${def.label}`}
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[12px] text-folio-ink/85 dark:text-white/80">{def.label}</span>
                  <span className="inline-flex shrink-0 items-center">
                    <Button
                      type="text"
                      size="small"
                      className="!h-6 !w-6 !min-w-0 !p-0"
                      disabled={atTop}
                      aria-label={t('common.moveUp')}
                      icon={<ArrowUp size={13} />}
                      onClick={() => move(col.key, -1)}
                    />
                    <Button
                      type="text"
                      size="small"
                      className="!h-6 !w-6 !min-w-0 !p-0"
                      disabled={atBottom}
                      aria-label={t('common.moveDown')}
                      icon={<ArrowDown size={13} />}
                      onClick={() => move(col.key, 1)}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      }
    >
      <Button
        type="text"
        size="small"
        className={`!inline-flex !h-6 !w-6 !min-w-0 items-center justify-center !p-0 ${className ?? ''}`}
        aria-label={t('common.customizeLayout')}
        title={t('common.customizeLayout')}
        icon={<Settings2 size={14} className="text-folio-ink/55 dark:text-white/55" />}
        onClick={(e) => e.stopPropagation()}
      />
    </Popover>
  );
}
