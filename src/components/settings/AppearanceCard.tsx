import { Segmented, Switch, Tag } from 'antd';
import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../common/toast/ToastProvider';
import type { ColorMode } from '../../theme/ThemeProvider';
import { HeaderBarPosition } from '../../types';
import InfoIcon from '../common/InfoIcon';

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

  return (
    <section className="folio-card overflow-hidden">
      <div className="flex items-start gap-3 border-b border-folio-ink/10 px-4 py-4 dark:border-white/[0.07]">
        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-folio-primary/[0.08] text-folio-primary dark:bg-folio-primary/15 dark:text-folio-accent">
          <Palette size={17} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t('settings.appearance.title')}</h2>
          <p className="mt-1 text-[12px] leading-5 text-folio-ink/55 dark:text-white/50">
            {t('settings.appearance.description')}
          </p>
        </div>
      </div>
      <div className="grid gap-5 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.appearance.colorMode')}</label>
          <Segmented<ColorMode>
            block
            value={settings.colorMode}
            onChange={(val) => void handleColorMode(val)}
            options={[
              { value: 'system', label: <span className="inline-flex items-center gap-1.5"><Monitor size={14} />{t('settings.appearance.system')}</span> },
              { value: 'light', label: <span className="inline-flex items-center gap-1.5"><Sun size={14} />{t('settings.appearance.light')}</span> },
              { value: 'dark', label: <span className="inline-flex items-center gap-1.5"><Moon size={14} />{t('settings.appearance.dark')}</span> },
            ]}
          />
        </div>
        <div className="sm:col-span-2 grid gap-5 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <label className="mb-0 block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.appearance.headerTicker')}</label>
              <InfoIcon>{t('settings.appearance.headerTickerHint')}</InfoIcon>
            </div>
            <Switch
              checked={settings.showHeaderTicker}
              onChange={(checked) => void handleTicker(checked)}
              aria-label={t('settings.appearance.headerTicker')}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <label className="mb-0 block text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.appearance.headerBarPosition')}</label>
              <InfoIcon>{t('settings.appearance.headerBarPositionHint')}</InfoIcon>
              <Tag color="orange" className="!m-0 !rounded-full !px-2 !py-0 !text-[9px] !font-medium uppercase tracking-[0.04em]">
                {t('settings.appearance.experimental')}
              </Tag>
            </div>
            <Switch
              checked={(settings.headerBarPosition ?? HeaderBarPosition.Integrated) === HeaderBarPosition.Integrated}
              onChange={(checked) => void handleHeaderBarPosition(checked)}
              aria-label={t('settings.appearance.headerBarPosition')}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
