// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { GoogleOAuthProvider } from '@react-oauth/google' // ✅ أضف هذا
import i18n from './i18n.js'
import './index.css'
import App from './App.jsx'

console.log('🚀 Starting Livocare App...');

// ✅ أضف Client ID الخاص بك هنا
const GOOGLE_CLIENT_ID = '1078379162660-79iiq3dsp2hr8sss8n2o5n9j6q3m9h7b.apps.googleusercontent.com';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('❌ Failed to find root element');
}

const root = createRoot(rootElement);

root.render(
  // <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>  {/* ✅ لف التطبيق بـ GoogleOAuthProvider */}
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </GoogleOAuthProvider>
  // </StrictMode>
);