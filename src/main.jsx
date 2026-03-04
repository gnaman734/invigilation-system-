import React, { lazy, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, Outlet, Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';
import App from './App';
import ProtectedRoute from './components/shared/ProtectedRoute';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { useAuthStore } from './store/authStore';
import { ToastProvider, useToast } from './components/shared/Toast';
import { supabaseConfigError } from './lib/supabase';
import './index.css';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AdminDashboard = lazy(() => import('./pages/admin/CleanDashboard'));
const ExamManagement = lazy(() => import('./pages/admin/ExamManagement'));
const CreateExamPage = lazy(() => import('./pages/admin/CreateExamPage'));
const ExamDetail = lazy(() => import('./pages/admin/ExamDetail'));
const InstructorDashboard = lazy(() => import('./pages/instructor/Dashboard'));
const InstructorProfile = lazy(() => import('./pages/instructor/Profile'));
const InstructorExamDetail = lazy(() => import('./pages/instructor/ExamDetail'));

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
      <div className="app-auth-bg flex min-h-screen flex-col items-center justify-center px-6 text-center text-foreground">
        <div className="mb-4 h-12 w-12 rounded-full bg-red-500/20 text-red-300">
          <div className="flex h-full w-full items-center justify-center text-xl">!</div>
        </div>
        <h1 className="text-2xl font-semibold">Configuration required</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file (anon public API key).</p>
        <ol className="mt-4 list-decimal space-y-1 text-left text-sm text-muted-foreground">
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
      <div className="app-auth-bg flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
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
          path="admin/exams"
          element={
            <ProtectedRoute allowedRole="admin">
              <ExamManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin/exams/create"
          element={
            <ProtectedRoute allowedRole="admin">
              <CreateExamPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin/exams/:examId"
          element={
            <ProtectedRoute allowedRole="admin">
              <ExamDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="instructor/dashboard"
          element={
            <ProtectedRoute allowedRole="instructor">
              <ErrorBoundary>
                <InstructorDashboard />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        <Route
          path="instructor/profile"
          element={
            <ProtectedRoute allowedRole="instructor">
              <ErrorBoundary>
                <InstructorProfile />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        <Route
          path="instructor/exams/:dutyId"
          element={
            <ProtectedRoute allowedRole="instructor">
              <ErrorBoundary>
                <InstructorExamDetail />
              </ErrorBoundary>
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

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container not found');
}

const root = window.__invigilationAppRoot ?? ReactDOM.createRoot(container);
window.__invigilationAppRoot = root;

root.render(
  <React.StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </React.StrictMode>
);
