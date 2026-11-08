import { Select } from 'antd';
import { Globe } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../common/toast/ToastProvider';
import { NUMBER_FORMAT_OPTIONS, type NumberFormatId } from '../../utils/finance';
import { DATE_FORMAT_OPTIONS, type DateFormatId } from '../../utils/date';

export default function RegionalFormattingCard() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();

  const handleNumberFormat = async (value: NumberFormatId) => {
    try {
      await updateSettings({ numberFormatId: value });
      toast.success(t('settings.regional.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.regional.error'));
    }
  };

  const handleDateFormat = async (value: DateFormatId) => {
    try {
      await updateSettings({ dateFormatId: value });
      toast.success(t('settings.regional.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.regional.error'));
    }
  };

  return (
    <section className="folio-card overflow-hidden">
      <div className="flex items-start gap-3 border-b border-folio-ink/10 px-4 py-4 dark:border-white/[0.07]">
        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-folio-primary/[0.08] text-folio-primary dark:bg-folio-primary/15 dark:text-folio-accent">
          <Globe size={17} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t('settings.regional.title')}</h2>
          <p className="mt-1 text-[12px] leading-5 text-folio-ink/55 dark:text-white/50">{t('settings.regional.description')}</p>
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <div>
          <label className="folio-label mb-1.5 block">{t('settings.regional.numberFormat')}</label>
          <Select
            value={settings.numberFormatId}
            onChange={handleNumberFormat}
            options={NUMBER_FORMAT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
            className="w-full"
          />
        </div>
        <div>
          <label className="folio-label mb-1.5 block">{t('settings.regional.dateFormat')}</label>
          <Select
            value={settings.dateFormatId}
            onChange={handleDateFormat}
            options={DATE_FORMAT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}
