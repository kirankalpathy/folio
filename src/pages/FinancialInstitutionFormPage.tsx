import { useEffect, useState } from 'react';
import { Alert, Button, Spin } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import type { FinancialInstitution, FinancialInstitutionInput } from '../types';
import { useI18n } from '../i18n';
import { useToast } from '../components/common/toast/ToastProvider';
import PageHeader from '../components/common/PageHeader';
import InstitutionWizard from '../components/institutions/InstitutionWizard';
import { createFinancialInstitution, getFinancialInstitution, updateFinancialInstitution } from '../services/financialInstitutions';

export default function FinancialInstitutionFormPage() {
  const { id } = useParams<{ id: string }>();
  const editMatch = useMatch('/institutions/:id/edit');
  const isEdit = Boolean(editMatch);
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [record, setRecord] = useState<FinancialInstitution | null>(null);

  useEffect(() => {
    if (!id) {
      setRecord(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError(null);
    getFinancialInstitution(id)
      .then((loaded) => {
        if (!active) return;
        if (!loaded) setLoadError(t('institutions.saveError'));
        else setRecord(loaded);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : t('institutions.saveError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, t]);

  const goBack = () => navigate('/institutions');

  const handleSubmit = async (values: FinancialInstitutionInput) => {
    try {
      if (isEdit && id) {
        await updateFinancialInstitution(id, values);
        toast.success(t('institutions.updated'));
      } else {
        await createFinancialInstitution(values);
        toast.success(t('institutions.added'));
      }
      goBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('institutions.saveError'));
      throw err;
    }
  };

  const title = isEdit ? t('institutions.edit') : t('institutions.add');

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow={t('nav.group.accounts')} title={title} actions={<Button icon={<ArrowLeft size={15} />} onClick={goBack}>{t('common.back')}</Button>} />
        <div className="folio-card grid place-items-center p-10"><Spin /></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow={t('nav.group.accounts')} title={title} actions={<Button icon={<ArrowLeft size={15} />} onClick={goBack}>{t('common.back')}</Button>} />
        <Alert type="error" showIcon title={loadError} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('nav.group.accounts')}
        title={title}
        description={record?.name}
        actions={<Button icon={<ArrowLeft size={15} />} onClick={goBack}>{t('common.back')}</Button>}
      />
      <section className="folio-card p-4 sm:p-5">
        <InstitutionWizard institution={record} onCancel={goBack} onSubmit={handleSubmit} />
      </section>
    </div>
  );
}
