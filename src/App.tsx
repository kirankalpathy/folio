import { App as AntApp, ConfigProvider } from 'antd';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { createFolioTheme } from './theme/antdTheme';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/common/toast/ToastProvider';
import AuthGate from './components/auth/AuthGate';

function ThemedApplication() {
  const { theme } = useTheme();

  return (
    <ConfigProvider
      theme={createFolioTheme(theme)}
      componentSize="middle"
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
