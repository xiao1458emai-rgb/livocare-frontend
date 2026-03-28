// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n.js' // ✅ استيراد من المسار الصحيح
import './index.css'
import App from './App.jsx'

// تحقق قبل تحميل التطبيق
console.log('🚀 Starting Livocare App...');

// التحقق من عنصر الجذر
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('❌ Failed to find root element');
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>
);