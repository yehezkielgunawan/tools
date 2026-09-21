import AppShell from '../components/layout/AppShell';
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
      <AppShell>
        <MetadataManager />
        <AppErrorBoundary>
          <AppRoutes />
        </AppErrorBoundary>
      </AppShell>
    </ThemeProvider>
  );
}
