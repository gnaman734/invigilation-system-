import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0F]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-amber-400" />
    </div>
  );
}

export default function ProtectedRoute({ allowedRole, children }) {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const status = useAuthStore((state) => state.status);
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user || !role) {
    return <Navigate to="/login" replace />;
  }

  if (role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole === 'instructor' && status !== 'approved') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
