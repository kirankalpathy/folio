import { useMemo, useState } from 'react';
import { Alert, Form, Input, InputNumber, Tabs } from 'antd';
import { QRCode } from 'react-qrcode-logo';
import { useI18n } from '../i18n';
import PageHeader from '../components/common/PageHeader';
import { formatNumber, getNumberFormat } from '../utils/finance';
import { UPI_ID_REGEX, buildUpiPayUri } from '../utils/upi';
import { useTheme } from '../theme/ThemeProvider';
import { palette } from '../theme/palette';
import MobileInput, { mobileInputRules, normalizeMobileDigits } from '../components/common/MobileInput';

type PaymentMode = 'upi' | 'mobile';

interface UpiFormValues {
  upiAddress?: string;
  mobileNumber?: string;
  payeeName?: string;
  amount?: number;
  note?: string;
}

function parseFormattedNumber(input: string): number {
  const raw = (input ?? '').trim();
  if (!raw) return NaN;
  const cfg = getNumberFormat();
  const group = cfg.group === '\u00A0' ? /\s|\u00A0/g : new RegExp(`\\${cfg.group}`, 'g');
  const normalized = raw.replace(group, '').replace(cfg.decimal, '.').replace(/[^0-9.-]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function toMobileDigits(value?: string): string {
  return normalizeMobileDigits(value);
}

export default function UpiTransactionPage() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [form] = Form.useForm<UpiFormValues>();
  const [mode, setMode] = useState<PaymentMode>('upi');
  const upiAddress = Form.useWatch('upiAddress', form);
  const mobileNumber = Form.useWatch('mobileNumber', form);
  const payeeName = Form.useWatch('payeeName', form);
  const amount = Form.useWatch('amount', form);
  const note = Form.useWatch('note', form);

  const mobileDigits = toMobileDigits(mobileNumber);
  const validUpi = mode === 'upi' && typeof upiAddress === 'string' && UPI_ID_REGEX.test(upiAddress.trim());
  const validMobile = mode === 'mobile' && mobileDigits.length === 10;
  const effectivePa = mode === 'mobile' ? (validMobile ? `${mobileDigits}@upi` : '') : (upiAddress?.trim() ?? '');
  const validAmount = typeof amount === 'number' && Number.isFinite(amount) && amount > 0;
  const canGenerateQr = (mode === 'upi' ? validUpi : validMobile) && validAmount;

  const qrValue = useMemo(() => {
    if (!canGenerateQr || !effectivePa) return '';
    return buildUpiPayUri({
      pa: effectivePa,
      pn: payeeName?.trim(),
      am: amount,
      tn: note?.trim(),
      cu: 'INR',
    });
  }, [canGenerateQr, effectivePa, payeeName, amount, note]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('transactions.upi.eyebrow')}
        title={t('transactions.upi.title')}
        description={t('transactions.upi.description')}
      />

      <div className={`grid gap-5 ${canGenerateQr ? 'lg:grid-cols-2' : ''}`}>
        <section className="folio-card p-4 sm:p-5">
          <Form<UpiFormValues> form={form} layout="vertical" requiredMark={false} autoComplete="off">
            <Tabs
              activeKey={mode}
              onChange={(key) => setMode(key as PaymentMode)}
              className="mb-2"
              items={[
                { key: 'upi', label: t('transactions.upi.tab.upiAddress') },
                { key: 'mobile', label: t('transactions.upi.tab.mobileNumber') },
              ]}
            />

            {mode === 'upi' ? (
              <Form.Item
                label={t('transactions.upi.fields.upiAddress')}
                name="upiAddress"
                rules={[
                  { required: true, whitespace: true, message: t('transactions.upi.validation.upiRequired') },
                  { pattern: UPI_ID_REGEX, message: t('transactions.upi.validation.upiInvalid') },
                ]}
              >
                <Input placeholder={t('transactions.upi.placeholder.upiAddress')} maxLength={322} />
              </Form.Item>
            ) : (
              <Form.Item
                label={t('transactions.upi.fields.mobileNumber')}
                name="mobileNumber"
                rules={mobileInputRules(t as never, {
                  required: true,
                  requiredMessageKey: 'transactions.upi.validation.mobileRequired',
                  digitsMessageKey: 'transactions.upi.validation.mobileDigits',
                })}
              >
                <MobileInput placeholder={t('transactions.upi.placeholder.mobileNumber')} />
              </Form.Item>
            )}

            <Form.Item
              label={t('transactions.upi.fields.amount')}
              name="amount"
              rules={[
                { required: true, message: t('transactions.upi.validation.amountRequired') },
                {
                  validator: async (_, value: number | undefined) => {
                    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return;
                    throw new Error(t('transactions.upi.validation.amountMin'));
                  },
                },
              ]}
            >
              <InputNumber
                className="w-full"
                min={0}
                precision={2}
                controls={false}
                inputMode="decimal"
                prefix="₹"
                placeholder={t('transactions.upi.placeholder.amount')}
                formatter={(value) => {
                  if (value === undefined || value === null) return '';
                  const n = Number(value);
                  return Number.isFinite(n) ? formatNumber(n, 2) : '';
                }}
                parser={((value?: string) => {
                  const n = parseFormattedNumber(value ?? '');
                  return Number.isFinite(n) ? n : Number.NaN;
                }) as unknown as (displayValue: string | undefined) => 0}
              />
            </Form.Item>

            <Form.Item label={t('transactions.upi.fields.payeeName')} name="payeeName">
              <Input placeholder={t('transactions.upi.placeholder.payeeName')} maxLength={120} />
            </Form.Item>

            <Form.Item
              label={t('transactions.upi.fields.note')}
              name="note"
              className="mb-0"
              normalize={(value: string) => (value ?? '').replace(/[^a-zA-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trimStart()}
            >
              <Input
                placeholder={t('transactions.upi.placeholder.note')}
                maxLength={80}
              />
            </Form.Item>
          </Form>
        </section>

        {canGenerateQr ? (
          <section className="folio-card p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold text-folio-ink dark:text-folio-dark-text">
              {t('transactions.upi.qr.title')}
            </h2>
            <div className="space-y-3">
              <Alert
                type="warning"
                showIcon
                className="folio-message-strip folio-message-strip-warning !text-[0.6875rem]"
                title={t('transactions.upi.qr.warning')}
              />
              <div className="flex justify-center rounded-xl border border-folio-ink/[0.08] bg-white p-3 dark:border-white/[0.08] dark:bg-folio-night">
                <QRCode
                  value={qrValue}
                  size={240}
                  quietZone={4}
                  ecLevel="H"
                  qrStyle="dots"
                  eyeRadius={6}
                  logoImage={theme === 'dark' ? '/folio-icon-inverse.svg' : '/folio-icon-color.svg'}
                  logoWidth={52}
                  logoHeight={52}
                  logoPadding={4}
                  removeQrCodeBehindLogo
                  logoPaddingStyle="circle"
                  bgColor={theme === 'dark' ? palette.night : palette.paper}
                  fgColor={theme === 'dark' ? palette.accent : palette.primary}
                />
              </div>
              <div className="rounded-lg bg-folio-paper/60 p-3 text-center dark:bg-white/[0.03]">
                {payeeName?.trim() ? (
                  <p className="text-[0.8125rem] font-semibold text-folio-ink dark:text-folio-dark-text">
                    {payeeName.trim()}
                  </p>
                ) : null}
                {validAmount && (
                  <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-folio-primary dark:text-folio-accent">
                    ₹{formatNumber(amount as number, 2)}
                  </p>
                )}
                <p className="mt-1 font-mono text-[0.75rem] text-folio-ink/60 break-all dark:text-white/55">
                  {mode === 'mobile' ? `+91 ${mobileDigits}` : upiAddress?.trim()}
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
