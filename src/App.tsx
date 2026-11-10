import { useEffect } from 'react';
import { App as AntApp, ConfigProvider } from 'antd';
import { ChevronDown } from 'lucide-react';
import pkg from '../package.json';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { createFolioTheme } from './theme/antdTheme';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/common/toast/ToastProvider';
import { BusyIndicatorProvider } from './components/common/BusyIndicator';
import { UnsavedChangesProvider } from './components/common/UnsavedChangesGuard';
import AuthGate from './components/auth/AuthGate';
import TitleBar from './components/layout/TitleBar';

const isDevChannel = (pkg as { versionChannel?: string }).versionChannel === 'dev';

function ThemedApplication() {
  const { theme } = useTheme();
  const dropdownArrow = <ChevronDown size={16} className="text-folio-ink/45 dark:text-white/40" />;

  useEffect(() => {
    if (isDevChannel) return;

    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        event.preventDefault();
        return;
      }
      const editable = target.closest(
        'input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"], .ant-input, .ant-input-number-input, .ant-select-selection-search-input',
      );
      if (editable) return;
      event.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  return (
    <ConfigProvider
      theme={createFolioTheme(theme)}
      componentSize="middle"
      select={{ suffixIcon: dropdownArrow }}
      cascader={{ suffixIcon: dropdownArrow }}
      modal={{ styles: { body: { maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: 8 } } }}
    >
      <AntApp>
        <BusyIndicatorProvider>
          <ToastProvider>
            <UnsavedChangesProvider>
              <AuthProvider>
                <TitleBar />
                <AuthGate />
              </AuthProvider>
            </UnsavedChangesProvider>
          </ToastProvider>
        </BusyIndicatorProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ThemedApplication />
    </ThemeProvider>
  );
}
