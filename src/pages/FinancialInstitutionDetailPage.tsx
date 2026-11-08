import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Button, Descriptions, Popover, Spin, Tag } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import { FOLIO_TAG_CLASS } from '../components/deposits/DepositStatusTag';
import type { DescriptionsProps } from 'antd';
import { ArrowLeft, Pencil, QrCode } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import type { FinancialInstitution } from '../types';
import { useI18n } from '../i18n';
import PageHeader from '../components/common/PageHeader';
import { getFinancialInstitution } from '../services/financialInstitutions';

function val(v?: string | number | null): ReactNode {
  if (v === undefined || v === null || v === '') return <span className="text-folio-ink/35 dark:text-white/30">—</span>;
  return String(v);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="folio-card overflow-hidden">
      <div className="border-b border-folio-ink/10 px-4 py-3 dark:border-white/[0.07]">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-folio-ink/45 dark:text-white/40">{title}</h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function FinancialInstitutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<FinancialInstitution | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);
    getFinancialInstitution(id)
      .then((r) => {
        if (!active) return;
        if (!r) setError(t('institutions.saveError'));
        else setRecord(r);
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : t('institutions.saveError')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, t]);

  const goBack = () => navigate('/institutions');
  const title = record?.name || t('nav.institutions');

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow={t('nav.group.accounts')} title={t('nav.institutions')} actions={<Button icon={<ArrowLeft size={15} />} onClick={goBack}>{t('common.back')}</Button>} />
        <div className="folio-card grid place-items-center p-10"><Spin /></div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow={t('nav.group.accounts')} title={t('nav.institutions')} actions={<Button icon={<ArrowLeft size={15} />} onClick={goBack}>{t('common.back')}</Button>} />
        <Alert type="error" showIcon title={error || t('institutions.saveError')} />
      </div>
    );
  }

  const category = record.category;
  const descProps: Partial<DescriptionsProps> = {
    layout: 'vertical',
    column: { xs: 1, sm: 2 },
    size: 'small',
    colon: false,
    className: 'folio-desc-tight',
    labelStyle: { color: 'var(--ant-color-text-secondary)', fontSize: 12, marginBottom: 1, paddingBottom: 0, lineHeight: 1 },
    contentStyle: { fontSize: 13, fontWeight: 500, marginTop: 0, paddingTop: 0, paddingBottom: 0, lineHeight: 1.15 },
  };

  const overviewItems: DescriptionsProps['items'] = [
    { key: 'name', label: t('institutions.fields.name'), children: val(record.name) },
    { key: 'category', label: t('institutions.fields.category'), children: val(t(`institutions.category.${category}` as 'institutions.category.savings-account')) },
    { key: 'nickname', label: t('institutions.fields.nickname'), children: val(record.nickname) },
  ];

  const renderUpiId = (upiIdRaw?: string | null): ReactNode => {
    const upiId = upiIdRaw?.trim();
    if (!upiId) return val(undefined);
    const upiQrValue = `upi://pay?pa=${encodeURIComponent(upiId)}`;
    return (
      <span className="inline-flex items-center gap-2">
        <span className="font-mono text-[13px]">{upiId}</span>
        <Popover
          trigger="click"
          placement="bottomLeft"
          overlayInnerStyle={{ padding: 12, maxWidth: 280 }}
          content={
            <div className="space-y-3">
              <Alert
                type="warning"
                showIcon
                className="folio-message-strip folio-message-strip-warning !text-[11px]"
                title={t('institutions.upi.qrWarning')}
              />
              <div className="flex justify-center rounded-lg bg-white p-2">
                <QRCodeSVG value={upiQrValue} size={160} includeMargin={false} />
              </div>
              <p className="text-center font-mono text-[12px] font-medium text-folio-ink dark:text-[#F3F4F6] break-all">{upiId}</p>
            </div>
          }
        >
          <Button
            type="text"
            size="small"
            aria-label={t('institutions.upi.qrAction')}
            icon={<QrCode size={15} className="text-folio-primary dark:text-folio-accent" />}
            className="!inline-flex !h-7 !w-7 !min-w-0 items-center justify-center !p-0"
          />
        </Popover>
      </span>
    );
  };

  let accountItems: DescriptionsProps['items'] = [];
  if (category === 'savings-account' || category === 'current-account') {
    accountItems = [
      { key: 'accountNumber', label: t('institutions.fields.accountNumber'), children: val(record.accountNumber) },
      { key: 'ifsc', label: t('institutions.fields.ifsc'), children: val(record.ifscCode) },
      { key: 'cif', label: t('institutions.fields.cif'), children: val(record.cifNumber) },
      { key: 'branch', label: t('institutions.fields.branch'), children: val(record.branchName) },
      { key: 'swift', label: t('institutions.fields.swift'), children: val(record.swiftCode) },
      { key: 'upiId', label: t('institutions.fields.upiId'), children: renderUpiId(record.upiId) },
    ];
  } else if (category === 'credit-card-issuer') {
    accountItems = [
      { key: 'cardNumber', label: t('institutions.fields.cardNumber'), children: val(record.cardNumber) },
      { key: 'cardNetwork', label: t('institutions.fields.cardNetwork'), children: val(record.cardNetwork) },
      { key: 'creditLimit', label: t('institutions.fields.creditLimit'), children: val(record.creditLimit != null ? `₹ ${record.creditLimit.toLocaleString('en-IN')}` : undefined) },
      { key: 'billingCycle', label: t('institutions.fields.billingCycle'), children: val(record.billingCycleDay != null ? `${t('institutions.billingCycle.prefix')} ${record.billingCycleDay} ${t('institutions.billingCycle.suffix')}` : undefined) },
    ];
  } else if (category === 'investment-brokerage') {
    accountItems = [
      { key: 'demat', label: t('institutions.fields.demat'), children: val(record.dematAccountNumber) },
      { key: 'ucc', label: t('institutions.fields.ucc'), children: val(record.uniqueClientCode) },
      { key: 'dpId', label: t('institutions.fields.dpId'), children: val(record.dpId) },
      {
        key: 'segments',
        label: t('institutions.fields.segments'),
        span: 2,
        children: record.segments && record.segments.length > 0
          ? <span className="inline-flex flex-wrap gap-1.5">{record.segments.map((s) => <Tag key={s} className={FOLIO_TAG_CLASS}>{t(`institutions.segment.${s}` as const)}</Tag>)}</span>
          : val(undefined),
      },
    ];
  } else if (category === 'digital-wallet') {
    accountItems = [
      { key: 'linkedMobile', label: t('institutions.fields.linkedMobile'), children: val(record.linkedMobile) },
      { key: 'upiId', label: t('institutions.fields.upiId'), children: renderUpiId(record.upiId) },
    ];
  }

  const legacyAddress = [record.addressLine1, record.addressLine2, record.city, record.state, record.pinCode].filter(Boolean).join(', ') || undefined;
  const additionalItems: DescriptionsProps['items'] = [
    { key: 'operationMode', label: t('institutions.fields.operationMode'), children: val(record.operationMode ? t(`institutions.operation.${record.operationMode}` as const) : undefined) },
    { key: 'contactPerson', label: t('institutions.fields.contactPerson'), children: val(record.contactPerson) },
    { key: 'contactEmail', label: t('institutions.fields.contactEmail'), children: val(record.contactEmail ?? record.emailAddress) },
    { key: 'contactPhone', label: t('institutions.fields.contactPhone'), children: val(record.contactPhone ?? record.phoneNumber) },
    { key: 'address', label: t('institutions.fields.address'), children: val(record.address ?? legacyAddress), span: 2 },
  ];

  return (
    <div className="space-y-5 select-none">
      <PageHeader
        eyebrow={t('nav.group.accounts')}
        title={title}
        description={t(`institutions.category.${category}` as 'institutions.category.savings-account')}
        actions={
          <div className="flex items-center gap-2">
            <Button icon={<ArrowLeft size={15} />} onClick={goBack}>{t('common.back')}</Button>
            <Button type="primary" icon={<Pencil size={15} />} onClick={() => navigate(`/institutions/${record.id}/edit`)}>{t('common.edit')}</Button>
          </div>
        }
      />

      <Section title={t('institutions.step.overview')}>
        <Descriptions {...descProps} items={overviewItems} />
      </Section>

      <Section title={t('institutions.step.accountDetails')}>
        <Descriptions {...descProps} items={accountItems} />
      </Section>

      <Section title={t('institutions.step.additionalDetails')}>
        <Descriptions {...descProps} items={additionalItems} />
      </Section>
    </div>
  );
}
