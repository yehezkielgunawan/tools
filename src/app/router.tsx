import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';

const ChangelogPage = lazy(() => import('../pages/ChangelogPage'));
const WhatsAppLinkGenerator = lazy(() => import('../tools/whatsapp-link'));
const JsonFormatter = lazy(() => import('../tools/json-formatter'));
const ImageCompressor = lazy(() => import('../tools/image-compressor'));
const PdfEditor = lazy(() => import('../tools/pdf-editor'));

function ToolLoading() {
  return (
    <div
      className="mx-auto flex min-h-80 max-w-5xl items-center justify-center px-4 sm:px-8"
      role="status"
    >
      <span className="loading loading-spinner loading-sm" />
      <span className="sr-only">Loading tool</span>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<ToolLoading />}>
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route
          element={<WhatsAppLinkGenerator />}
          path="/generator/whatsapp-link"
        />
        <Route element={<JsonFormatter />} path="/developer/json-formatter" />
        <Route element={<ImageCompressor />} path="/image/image-compressor" />
        <Route element={<PdfEditor />} path="/pdf/pdf-editor" />
        <Route element={<ChangelogPage />} path="/changelog" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </Suspense>
  );
}
