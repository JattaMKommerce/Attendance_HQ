import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/variables.css';
import './styles/components.css';
import { initMobileApp } from './services/mobileInit';

// Initialize native mobile app wrapper if running inside Capacitor
initMobileApp();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register PWA service worker in production web browser (bypass in native mobile container)
const isNative = typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('JMK HRMS ServiceWorker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.warn('JMK HRMS ServiceWorker registration failed:', error);
      });
  });
}


