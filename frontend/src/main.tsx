import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

declare global {
  interface Window {
    __plannerUpdateServiceWorker?: (reloadPage?: boolean) => Promise<void>;
  }
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('planner-update-available'));
    },
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('planner-offline-ready'));
    },
  });

  window.__plannerUpdateServiceWorker = updateServiceWorker;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
