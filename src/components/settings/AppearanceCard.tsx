import { Button, Segmented, Slider, Switch, Tag } from 'antd';
import { Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../common/toast/ToastProvider';
import type { ColorMode } from '../../theme/ThemeProvider';
import { HeaderBarPosition } from '../../types';

function ExperimentalTag() {
  const { t } = useI18n();
  return (
    <Tag className="!m-0 !rounded-full !border !border-folio-warning-border !bg-folio-warning-bg !px-2 !py-0 !text-[0.5625rem] !font-medium !text-folio-warning-text uppercase tracking-[0.04em]">
      {t('settings.appearance.experimental')}
    </Tag>
  );
}

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

  const handleBoldText = async (checked: boolean) => {
    try {
      await updateSettings({ boldText: checked });
      toast.success(t('settings.appearance.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.appearance.error'));
    }
  };

  const handleFontSize = async (value: 'small' | 'medium' | 'large') => {
    try {
      await updateSettings({ fontSize: value });
      toast.success(t('settings.appearance.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.appearance.error'));
    }
  };

  const handleWidget = async (checked: boolean) => {
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

  const handleCustomTitleBar = async (checked: boolean) => {
    try {
      await updateSettings({ customTitleBarEnabled: checked });
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

  const handleResetOverviewColors = async () => {
    try {
      await updateSettings({ allocationColors: undefined });
      toast.success(t('settings.appearance.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.appearance.error'));
    }
  };

  const customTitleBarEnabled = settings.customTitleBarEnabled ?? true;

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
          <label className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.appearance.boldText')}</label>
          <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">
            {t('settings.appearance.boldTextHint')}
          </p>
        </div>
        <Switch
          checked={settings.boldText ?? true}
          onChange={(checked) => void handleBoldText(checked)}
          aria-label={t('settings.appearance.boldText')}
        />
      </div>
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <label className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.appearance.fontSize')}</label>
          <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">
            {t('settings.appearance.fontSizeHint')}
          </p>
        </div>
        <div className="w-44 shrink-0 px-1">
          <Slider
            min={0}
            max={2}
            step={1}
            value={settings.fontSize === 'small' ? 0 : settings.fontSize === 'large' ? 2 : 1}
            marks={{
              0: t('settings.appearance.fontSizeSmall'),
              1: t('settings.appearance.fontSizeMedium'),
              2: t('settings.appearance.fontSizeLarge'),
            }}
            tooltip={{ open: false }}
            onChange={(val) => {
              const size = val === 0 ? 'small' : val === 2 ? 'large' : 'medium';
              void handleFontSize(size);
            }}
            aria-label={t('settings.appearance.fontSize')}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <label className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.appearance.headerWidget')}</label>
          <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">
            {t('settings.appearance.headerWidgetHint')}
          </p>
        </div>
        <Switch
          checked={settings.showHeaderTicker}
          onChange={(checked) => void handleWidget(checked)}
          aria-label={t('settings.appearance.headerWidget')}
        />
      </div>
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <ExperimentalTag />
            <label className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.appearance.customTitleBar')}</label>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">
            {t('settings.appearance.customTitleBarHint')}
          </p>
        </div>
        <Switch
          checked={customTitleBarEnabled}
          onChange={(checked) => void handleCustomTitleBar(checked)}
          aria-label={t('settings.appearance.customTitleBar')}
        />
      </div>
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <ExperimentalTag />
            <label className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.appearance.headerBarPosition')}</label>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">
            {t('settings.appearance.headerBarPositionHint')}
          </p>
        </div>
        <Switch
          checked={customTitleBarEnabled && (settings.headerBarPosition ?? HeaderBarPosition.Integrated) === HeaderBarPosition.Integrated}
          onChange={(checked) => void handleHeaderBarPosition(checked)}
          disabled={!customTitleBarEnabled}
          aria-label={t('settings.appearance.headerBarPosition')}
        />
      </div>
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <ExperimentalTag />
            <label className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.appearance.smartTables')}</label>
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
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <label className="block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.appearance.overviewGraph')}</label>
          <p className="mt-0.5 text-xs leading-5 text-folio-ink/55 dark:text-white/50">
            {t('settings.appearance.overviewGraphHint')}
          </p>
        </div>
        <Button
          icon={<RotateCcw size={14} />}
          onClick={() => void handleResetOverviewColors()}
          disabled={!settings.allocationColors || Object.keys(settings.allocationColors).length === 0}
        >
          {t('settings.appearance.resetColors')}
        </Button>
      </div>
    </div>
  );
}
