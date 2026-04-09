import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, ShieldCheck, User2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import NotificationPanel from '../instructor/NotificationPanel';
import ConnectionStatus from './ConnectionStatus';
import ErrorBoundary from './ErrorBoundary';
import { sanitizeText } from '../../lib/utils/sanitize';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

function getInitials(nameOrEmail) {
  if (!nameOrEmail) {
    return 'U';
  }

  const parts = String(nameOrEmail)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState('');
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const instructorId = useAuthStore((state) => state.instructorId);
  const logout = useAuthStore((state) => state.logout);
  const destroy = useAuthStore((state) => state.destroy);
  const name = sanitizeText(user?.user_metadata?.name ?? user?.email ?? 'User');
  const initials = getInitials(name);
  const pageName = location.pathname.includes('/admin')
    ? 'Admin Dashboard'
    : location.pathname.includes('/profile')
      ? 'Profile'
      : location.pathname.includes('/instructor')
        ? 'Instructor Dashboard'
        : 'Overview';

  const handleGoHome = () => {
    if (role === 'admin' || location.pathname.startsWith('/admin')) {
      navigate('/admin/dashboard?tab=overview');
      return;
    }

    if (role === 'instructor' || location.pathname.startsWith('/instructor')) {
      navigate('/instructor/dashboard');
      return;
    }

    navigate('/login');
  };

  const handleBack = () => {
    const isInitialEntry = location.key === 'default' || window.history.length <= 1;

    if (!isInitialEntry) {
      navigate(-1);
      return;
    }

    if (role === 'admin' || location.pathname.startsWith('/admin')) {
      navigate('/admin/dashboard?tab=overview');
      return;
    }

    if (role === 'instructor' || location.pathname.startsWith('/instructor')) {
      navigate('/instructor/profile');
      return;
    }

    navigate('/login');
  };

  const handleLogout = async () => {
    setErrorMessage('');
    const result = await logout();

    if (result?.error) {
      setErrorMessage(result.error);
    }

    destroy();
    navigate('/login', { replace: true });
  };

  const handleJumpToDuty = (dutyId) => {
    if (!dutyId) {
      return;
    }

    if (!location.pathname.includes('/instructor/dashboard')) {
      navigate('/instructor/dashboard');
    }

    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('instructor:jump-to-duty', { detail: { dutyId } }));
    }, 120);
  };

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-white/6 bg-[#0A0A0F] px-6">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 px-2 text-xs text-white/60 transition-colors hover:border-white/20 hover:text-white/85"
            aria-label="Go back"
            title="Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <span className="mx-3 h-4 w-px bg-white/10" />
          <ShieldCheck className="h-5 w-5 text-amber-400" />
          <button
            type="button"
            onClick={handleGoHome}
            className="ml-2 hidden text-sm font-semibold text-white/80 transition-colors hover:text-white sm:inline"
            aria-label="Go to overview"
            title="Go to overview"
          >
            InvigilationMS
          </button>
          <button
            type="button"
            onClick={handleGoHome}
            className="ml-2 text-sm font-semibold text-white/80 transition-colors hover:text-white sm:hidden"
            aria-label="Go to overview"
            title="Go to overview"
          >
            IMS
          </button>
          <span className="mx-4 h-4 w-px bg-white/10" />
          <span className="hidden text-sm text-white/35 sm:inline">{pageName}</span>
        </div>

        <div className="flex items-center gap-2">
          {role === 'instructor' ? (
            <ErrorBoundary>
              <NotificationPanel instructorId={instructorId} onJumpToDuty={handleJumpToDuty} />
            </ErrorBoundary>
          ) : null}
          <ConnectionStatus />
          <span className="h-4 w-px bg-white/10" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="h-8 w-8 rounded-xl border border-amber-500/20 bg-amber-500/15 text-xs font-semibold text-amber-400 transition-all hover:bg-amber-500/25">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border border-white/8 bg-[#16161F] p-1 shadow-2xl">
              <DropdownMenuLabel className="space-y-1 border-b border-white/6 px-3 py-2.5">
                <p className="text-sm font-medium text-white/80">{name}</p>
                <div className="flex items-center gap-2 text-xs text-white/35">
                  <User2 className="h-3.5 w-3.5" />
                  <Badge className="capitalize border-none bg-transparent p-0 text-white/35" variant="secondary">
                    {role ?? 'user'}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-transparent" />
              <DropdownMenuItem onSelect={() => { void handleLogout(); }} className="rounded-lg px-2 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/8 hover:text-red-300 focus:bg-red-500/8 focus:text-red-300">
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {errorMessage ? (
        <div className="border-t border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 sm:px-6">{errorMessage}</div>
      ) : null}
    </header>
  );
}
