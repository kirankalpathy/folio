import { Segmented, Switch, Tag } from 'antd';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../common/toast/ToastProvider';
import type { ColorMode } from '../../theme/ThemeProvider';
import { HeaderBarPosition } from '../../types';

export default function AppearanceCard() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();

  const handleColorMode = async (value: ColorMode) => {
    try {
      await updateSettings({ colorMode: value });
      toast.success(t('settings.appearance.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.appearance.error'));
    }
  };

  const handleTicker = async (checked: boolean) => {
    try {
      await updateSettings({ showHeaderTicker: checked });
      toast.success(t('settings.appearance.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.appearance.error'));
    }
  };

  const handleHeaderBarPosition = async (checked: boolean) => {
    try {
      await updateSettings({ headerBarPosition: checked ? HeaderBarPosition.Integrated : HeaderBarPosition.Standalone });
      toast.success(t('settings.appearance.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.appearance.error'));
    }
  };

  const handleSmartTables = async (checked: boolean) => {
    try {
      await updateSettings({
        smartTablesEnabled: checked,
        ...(checked ? {} : { tableLayouts: undefined }),
      });
      toast.success(t('settings.appearance.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.appearance.error'));
    }
  };

  return (
    <div className="divide-y divide-folio-ink/10 dark:divide-white/[0.07]">
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <label className="min-w-0 text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.appearance.colorMode')}</label>
        <Segmented<ColorMode>
          value={settings.colorMode}
          onChange={(val) => void handleColorMode(val)}
          options={[
            { value: 'system', label: <span className="inline-flex items-center gap-1.5"><Monitor size={14} />{t('settings.appearance.system')}</span> },
            { value: 'light', label: <span className="inline-flex items-center gap-1.5"><Sun size={14} />{t('settings.appearance.light')}</span> },
            { value: 'dark', label: <span className="inline-flex items-center gap-1.5"><Moon size={14} />{t('settings.appearance.dark')}</span> },
          ]}
        />
      </div>
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <label className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.appearance.headerTicker')}</label>
          <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">
            {t('settings.appearance.headerTickerHint')}
          </p>
        </div>
        <Switch
          checked={settings.showHeaderTicker}
          onChange={(checked) => void handleTicker(checked)}
          aria-label={t('settings.appearance.headerTicker')}
        />
      </div>
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.appearance.headerBarPosition')}</label>
            <Tag color="orange" className="!m-0 !rounded-full !px-2 !py-0 !text-[9px] !font-medium uppercase tracking-[0.04em]">
              {t('settings.appearance.experimental')}
            </Tag>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">
            {t('settings.appearance.headerBarPositionHint')}
          </p>
        </div>
        <Switch
          checked={(settings.headerBarPosition ?? HeaderBarPosition.Integrated) === HeaderBarPosition.Integrated}
          onChange={(checked) => void handleHeaderBarPosition(checked)}
          aria-label={t('settings.appearance.headerBarPosition')}
        />
      </div>
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.appearance.smartTables')}</label>
            <Tag color="orange" className="!m-0 !rounded-full !px-2 !py-0 !text-[9px] !font-medium uppercase tracking-[0.04em]">
              {t('settings.appearance.experimental')}
            </Tag>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">
            {t('settings.appearance.smartTablesHint')}
          </p>
        </div>
        <Switch
          checked={settings.smartTablesEnabled ?? true}
          onChange={(checked) => void handleSmartTables(checked)}
          aria-label={t('settings.appearance.smartTables')}
        />
      </div>
    </div>
  );
}
