import Header from '../components/layout/Header';
import MetadataManager from '../seo/MetadataManager';
import AppErrorBoundary from './AppErrorBoundary';
import { AppRoutes } from './router';
import { ThemeProvider } from './ThemeProvider';
import type { Theme } from './theme';

interface AppProps {
  initialTheme?: Theme;
}

export default function App({ initialTheme = 'light' }: AppProps) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <div className="min-h-screen bg-base-200 text-base-content">
        <MetadataManager />
        <Header />
        <AppErrorBoundary>
          <main>
            <AppRoutes />
          </main>
        </AppErrorBoundary>
      </div>
    </ThemeProvider>
  );
}
