import React, { lazy, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, Outlet, Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';
import App from './App';
import ProtectedRoute from './components/shared/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import { ToastProvider, useToast } from './components/shared/Toast';
import { supabaseConfigError } from './lib/supabase';
import './index.css';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const InstructorDashboard = lazy(() => import('./pages/instructor/Dashboard'));
const InstructorProfile = lazy(() => import('./pages/instructor/Profile'));

function StartupGate() {
  const initialize = useAuthStore((state) => state.initialize);
  const destroy = useAuthStore((state) => state.destroy);
  const { addToast } = useToast();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [configError] = useState(supabaseConfigError);

  useEffect(() => {
    let active = true;

    const runInitialize = async () => {
      if (configError) {
        setBootstrapping(false);
        return;
      }

      await initialize();

      if (active) {
        setBootstrapping(false);
      }
    };

    runInitialize();

    return () => {
      active = false;
    };
  }, [initialize, configError]);

  useEffect(() => {
    const handleAuthExpired = () => {
      destroy();
      addToast({ type: 'warning', message: 'Session expired. Please log in again' });

      if (window.location.pathname !== '/login') {
        window.history.replaceState({}, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    };

    window.addEventListener('app:auth-expired', handleAuthExpired);

    return () => {
      window.removeEventListener('app:auth-expired', handleAuthExpired);
    };
  }, [addToast, destroy]);

  if (configError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F6F9] px-6 text-center text-[#1A1A2E]">
        <div className="mb-4 h-12 w-12 rounded-full bg-red-100 text-red-600">
          <div className="flex h-full w-full items-center justify-center text-xl">!</div>
        </div>
        <h1 className="text-2xl font-semibold">Configuration required</h1>
        <p className="mt-2 max-w-xl text-sm text-gray-600">Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file (anon public API key).</p>
        <ol className="mt-4 list-decimal space-y-1 text-left text-sm text-gray-700">
          <li>Create .env.local at the project root.</li>
          <li>Set VITE_SUPABASE_URL=https://your-project.supabase.co</li>
          <li>Set VITE_SUPABASE_ANON_KEY=your-anon-public-key</li>
          <li>Restart the dev server or redeploy.</li>
        </ol>
      </div>
    );
  }

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6F9]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-[#1E3A5F]" />
      </div>
    );
  }

  return <Outlet />;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<StartupGate />}>
      <Route path="/" element={<App />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        <Route
          path="admin/dashboard"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="instructor/dashboard"
          element={
            <ProtectedRoute allowedRole="instructor">
              <InstructorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="instructor/profile"
          element={
            <ProtectedRoute allowedRole="instructor">
              <InstructorProfile />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Route>
    </Route>
  ),
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </React.StrictMode>
);
