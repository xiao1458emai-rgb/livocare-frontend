// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
// ❌ إزالة هذا السطر: import { HashRouter } from 'react-router-dom'
import i18n from './i18n.js'
import './index.css'
import App from './App.jsx'

console.log('🚀 Starting Livocare App...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('❌ Failed to find root element');
}

const root = createRoot(rootElement);

root.render(
  // <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />  {/* ✅ بدون Router هنا */}
    </I18nextProvider>
  // </StrictMode>
);