import { App as AntApp, ConfigProvider } from 'antd';
import { ChevronDown } from 'lucide-react';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { createFolioTheme } from './theme/antdTheme';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/common/toast/ToastProvider';
import AuthGate from './components/auth/AuthGate';

function ThemedApplication() {
  const { theme } = useTheme();
  const dropdownArrow = <ChevronDown size={16} strokeWidth={1.8} className="text-folio-ink/45 dark:text-white/40" />;

  return (
    <ConfigProvider
      theme={createFolioTheme(theme)}
      componentSize="middle"
      select={{ suffixIcon: dropdownArrow }}
      cascader={{ suffixIcon: dropdownArrow }}
      modal={{ styles: { body: { maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: 8 } } }}
    >
      <AntApp>
        <ToastProvider>
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </ToastProvider>
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
