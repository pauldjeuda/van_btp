import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { isVanRhDataSource, loadIntegrationConfig } from './lib/integrationConfig';

async function bootstrap() {
  await loadIntegrationConfig();
  if (isVanRhDataSource()) {
    console.log('🔌 Mode données : VAN RH (URL depuis backend/.env → VAN_RH_URL)');
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
