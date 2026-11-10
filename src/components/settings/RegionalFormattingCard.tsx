import { Select } from 'antd';
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
    <div className="divide-y divide-folio-ink/10 dark:divide-white/[0.07]">
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <label className="min-w-0 text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.regional.numberFormat')}</label>
        <Select
          value={settings.numberFormatId}
          onChange={handleNumberFormat}
          options={NUMBER_FORMAT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          className="w-full max-w-[320px]"
        />
      </div>
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <label className="min-w-0 text-sm font-medium text-folio-ink/85 dark:text-white/85">{t('settings.regional.dateFormat')}</label>
        <Select
          value={settings.dateFormatId}
          onChange={handleDateFormat}
          options={DATE_FORMAT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          className="w-full max-w-[320px]"
        />
      </div>
    </div>
  );
}
