import { App as AntApp, Button, Empty, Table } from 'antd';
import { useToast } from '../components/common/toast/ToastProvider';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { useFinancialInstitutions } from '../hooks/useFinancialInstitutions';
import { useI18n } from '../i18n';
import type { FinancialInstitution } from '../types';
import { institutionLabel, isFinancialInstitutionLinked } from '../services/financialInstitutions';

function displayId(r: FinancialInstitution): string {
  return r.accountNumber || r.cardNumber || r.dematAccountNumber || r.linkedMobile || r.walletId || r.upiId || '—';
}

export default function FinancialInstitutionsPage() {
  const { institutions, isLoading, remove } = useFinancialInstitutions();
  const { modal } = AntApp.useApp();
  const { toast } = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('nav.group.accounts')}
        title={t('nav.institutions')}
        description={t('institutions.description')}
        actions={<Button type="primary" icon={<Plus size={15} />} onClick={() => navigate('/institutions/new')}>{t('institutions.add')}</Button>}
      />
      <section className="folio-card p-0">
        <Table<FinancialInstitution>
          rowKey="id"
          loading={isLoading}
          dataSource={institutions}
          pagination={false}
          onRow={(record) => ({ onClick: () => navigate(`/institutions/${record.id}`), style: { cursor: 'pointer' } })}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<div className="py-2"><p className="text-sm font-medium">{t('institutions.emptyTitle')}</p><p className="mt-1 text-xs text-folio-ink/45 dark:text-white/40">{t('institutions.emptyBody')}</p><Button type="primary" size="small" className="mt-3" onClick={() => navigate('/institutions/new')}>{t('institutions.add')}</Button></div>} /> }}
          columns={[
            { title: t('institutions.table.name'), dataIndex: 'name', render: (name: string) => <span className="font-medium">{name}</span> },
            { title: t('institutions.table.category'), dataIndex: 'category', render: (c: string) => t(`institutions.category.${c}` as 'institutions.category.savings-account') },
            { title: t('institutions.table.accountNumber'), key: 'idValue', render: (_, r) => <span className="font-mono text-[11px]">{displayId(r)}</span> },
            {
              title: '', width: 90, render: (_, r) => (
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button type="text" size="small" icon={<Pencil size={14} />} onClick={() => navigate(`/institutions/${r.id}/edit`)} />
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<Trash2 size={14} />}
                    onClick={async () => {
                      try {
                        if (await isFinancialInstitutionLinked(r.id)) {
                          modal.info({
                            title: t('institutions.deleteLinkedTitle'),
                            content: t('institutions.deleteLinkedError', { name: institutionLabel(r) }),
                            okText: t('common.ok'),
                            centered: true,
                          });
                          return;
                        }
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : t('institutions.deleteError'));
                        return;
                      }
                      modal.confirm({
                        title: t('institutions.deleteConfirmTitle'),
                        content: t('institutions.deleteConfirmBody', { name: institutionLabel(r) }),
                        okText: t('common.delete'),
                        okButtonProps: { danger: true },
                        cancelText: t('common.keep'),
                        centered: true,
                        onOk: async () => {
                          try {
                            await remove(r.id);
                            toast.success(t('institutions.deleted'));
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : t('institutions.deleteError'));
                          }
                        },
                      });
                    }}
                  />
                </div>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
