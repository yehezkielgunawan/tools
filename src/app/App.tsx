import Header from '../components/layout/Header';
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
