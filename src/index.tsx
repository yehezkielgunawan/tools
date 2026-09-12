import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './app/App';
import { initializeTheme } from './app/theme';
import './styles/index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  const initialTheme = initializeTheme();
  const root = createRoot(rootEl);
  root.render(
    <StrictMode>
      <BrowserRouter>
        <App initialTheme={initialTheme} />
      </BrowserRouter>
    </StrictMode>,
  );
}
