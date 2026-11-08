import { useEffect, useState } from 'react';
import { Alert, Button, Modal, Spin } from 'antd';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SettingsProvider } from '../../context/SettingsContext';
import { useI18n } from '../../i18n';
import { resetLocalLedgerData } from '../../services/sqlite';
import Layout from '../layout/Layout';
import AuthShell from './AuthShell';
import LoginScreen from './LoginScreen';
import RecoveryScreen from './RecoveryScreen';
import SetupScreen from './SetupScreen';
import DashboardPage from '../../pages/DashboardPage';
import DepositsPage from '../../pages/DepositsPage';
import DepositFormPage from '../../pages/DepositFormPage';
import FinancialInstitutionsPage from '../../pages/FinancialInstitutionsPage';
import FinancialInstitutionFormPage from '../../pages/FinancialInstitutionFormPage';
import FinancialInstitutionDetailPage from '../../pages/FinancialInstitutionDetailPage';
import ProfilePage from '../../pages/ProfilePage';
import SettingsPage from '../../pages/SettingsPage';
import LedgerPage from '../ledger/LedgerPage';
import FolioLogo from '../common/FolioLogo';

function BootScreen() {
  const { t } = useI18n();
  return (
    <div className="grid min-h-screen place-items-center bg-folio-paper dark:bg-[#141414]">
      <div className="flex flex-col items-center gap-5">
        <FolioLogo />
        <Spin size="small" />
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-folio-ink/35 dark:text-white/30">
          {t('auth.opening')}
        </p>
      </div>
    </div>
  );
}

export default function AuthGate() {
  const { status, initError, retry } = useAuth();
  const { t } = useI18n();
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (status === 'locked' || status === 'setup' || status === 'recovery') {
      if (window.location.hash && window.location.hash !== '#/' && window.location.hash !== '#') {
        window.location.hash = '/';
      }
    }
  }, [status]);

  if (status === 'loading') return <BootScreen />;

  if (status === 'error') {
    return (
      <AuthShell
        eyebrow={t('auth.storage.eyebrow')}
        title={t('auth.storage.title')}
        description={t('auth.storage.description')}
      >
        <Alert type="error" showIcon title={initError ?? t('auth.storage.unknown')} className="mb-4" />
        <div className="space-y-2">
          <Button type="primary" onClick={retry} block>
            {t('common.tryAgain')}
          </Button>
          <Button
            danger
            block
            loading={resetting}
            onClick={() => {
              Modal.confirm({
                title: t('auth.storage.resetConfirmTitle'),
                content: t('auth.storage.resetConfirmBody'),
                okText: t('auth.storage.resetConfirmOk'),
                okButtonProps: { danger: true },
                cancelText: t('common.cancel'),
                centered: true,
                onOk: async () => {
                  setResetting(true);
                  await resetLocalLedgerData();
                  window.location.reload();
                },
              });
            }}
          >
            {t('auth.storage.reset')}
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (status === 'setup') return <SetupScreen />;
  if (status === 'recovery') return <RecoveryScreen />;
  if (status === 'locked') return <LoginScreen />;

  return (
    <SettingsProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="stocks" element={<LedgerPage assetClass="stocks" />} />
            <Route path="bonds" element={<LedgerPage assetClass="bonds" />} />
            <Route path="pf" element={<LedgerPage assetClass="pf" />} />
            <Route path="deposits" element={<DepositsPage />} />
            <Route path="deposits/new" element={<DepositFormPage />} />
            <Route path="deposits/:id/edit" element={<DepositFormPage />} />
            <Route path="deposits/:id" element={<DepositFormPage />} />
            <Route path="assets" element={<LedgerPage assetClass="commodities" />} />
            <Route path="debts" element={<LedgerPage assetClass="debts" />} />
            <Route path="institutions" element={<FinancialInstitutionsPage />} />
            <Route path="institutions/new" element={<FinancialInstitutionFormPage />} />
            <Route path="institutions/:id/edit" element={<FinancialInstitutionFormPage />} />
            <Route path="institutions/:id" element={<FinancialInstitutionDetailPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </SettingsProvider>
  );
}
