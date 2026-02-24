import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './components/shared/Navbar';
import ErrorBoundary from './components/shared/ErrorBoundary';

export default function App() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!hideNavbar ? <Navbar /> : null}

      <ErrorBoundary>
        <Suspense fallback={<div className="mx-auto mt-8 h-40 w-full max-w-6xl animate-pulse rounded-2xl bg-muted" />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
