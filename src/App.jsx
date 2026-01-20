import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './components/shared/Navbar';
import ErrorBoundary from './components/shared/ErrorBoundary';

export default function App() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/';

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {!hideNavbar ? <Navbar /> : null}

      <ErrorBoundary>
        <Suspense fallback={<div className="mx-auto mt-8 h-40 w-full max-w-6xl animate-pulse rounded-2xl bg-gray-200" />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
