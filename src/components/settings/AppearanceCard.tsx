import { Segmented } from 'antd';
import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../common/toast/ToastProvider';
import type { ColorMode } from '../../theme/ThemeProvider';

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

  const handleTicker = async (value: 'enabled' | 'disabled') => {
    try {
      await updateSettings({ showHeaderTicker: value === 'enabled' });
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
        <div>
          <label className="folio-label mb-2 block">{t('settings.appearance.colorMode')}</label>
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
        <div>
          <label className="folio-label mb-2 block">{t('settings.appearance.headerTicker')}</label>
          <Segmented<'enabled' | 'disabled'>
            block
            value={settings.showHeaderTicker ? 'enabled' : 'disabled'}
            onChange={(val) => void handleTicker(val)}
            options={[
              { value: 'enabled', label: t('settings.appearance.enabled') },
              { value: 'disabled', label: t('settings.appearance.disabled') },
            ]}
          />
          <p className="mt-2 text-[11px] leading-4 text-folio-ink/45 dark:text-white/40">
            {t('settings.appearance.headerTickerHint')}
          </p>
        </div>
      </div>
    </section>
  );
}
