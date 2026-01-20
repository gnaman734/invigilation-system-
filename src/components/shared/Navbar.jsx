import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import ConnectionStatus from './ConnectionStatus';
import { sanitizeText } from '../../lib/utils/sanitize';

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
  const [errorMessage, setErrorMessage] = useState('');
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);
  const name = sanitizeText(user?.user_metadata?.name ?? user?.email ?? 'User');
  const initials = getInitials(name);

  const handleLogout = async () => {
    setErrorMessage('');
    const result = await logout();

    if (result?.error) {
      setErrorMessage(result.error);
      return;
    }

    navigate('/login', { replace: true });
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E3A5F] text-white">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <h1 className="text-lg font-semibold text-[#1A1A2E]">Intelligent Invigilation</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ConnectionStatus />
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1E3A5F] text-sm font-semibold text-white">
            {initials}
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-[#1A1A2E]">{name}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">{sanitizeText(user?.email)}</p>
              <span className="rounded-full bg-[#2E86AB]/15 px-2 py-0.5 text-xs font-semibold capitalize text-[#1E3A5F]">
                {role ?? 'user'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="app-btn-ghost inline-flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 sm:px-6">{errorMessage}</div>
      ) : null}
    </header>
  );
}
