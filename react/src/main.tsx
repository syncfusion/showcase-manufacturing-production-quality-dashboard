import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerLicense } from '@syncfusion/ej2-base';
import { App } from './App';
import { SessionProvider } from './domain/session';
import { ThemeProvider, useTheme } from './theme';
import './tokens.css';
import './app-shell.css';
import './app.css';

const licenseKey = import.meta.env.VITE_SYNCFUSION_LICENSE_KEY;
if (licenseKey) registerLicense(licenseKey);

function Boot() {
  const { ready } = useTheme();
  useEffect(() => {
    if (ready) document.getElementById('app-boot')?.remove();
  }, [ready]);
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SessionProvider>
        <Boot />
      </SessionProvider>
    </ThemeProvider>
  </StrictMode>
);
