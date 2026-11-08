import '@fontsource-variable/inter';
import 'antd/dist/reset.css';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Folio could not find its root element.');
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
