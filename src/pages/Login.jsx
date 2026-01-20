import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { clearLoginAttemptWindow, getLoginRateLimitState, registerFailedLoginAttempt } from '../lib/utils/rateLimit';
import { sanitizeEmail } from '../lib/utils/sanitize';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [shake, setShake] = useState(false);
  const [lockState, setLockState] = useState(getLoginRateLimitState());
  const supabaseHost = (() => {
    const rawUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!rawUrl) {
      return null;
    }

    try {
      return new URL(rawUrl).host;
    } catch (_error) {
      return rawUrl;
    }
  })();

  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const authError = useAuthStore((state) => state.authError);
  const loading = useAuthStore((state) => state.loading);
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    if (authError) {
      setErrorMessage(authError);
    }
  }, [authError]);

  useEffect(() => {
    if (!user || !role) {
      return;
    }

    if (role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }

    if (role === 'instructor') {
      navigate('/instructor/dashboard', { replace: true });
    }
  }, [user, role, navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLockState(getLoginRateLimitState());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setFieldErrors({ email: '', password: '' });

    const nextRateLimit = getLoginRateLimitState();
    if (nextRateLimit.isLocked) {
      setLockState(nextRateLimit);
      setErrorMessage(`Too many attempts. Try again in ${Math.ceil(nextRateLimit.remainingMs / 1000)}s.`);
      return;
    }

    const nextEmail = sanitizeEmail(email);
    const nextPassword = typeof password === 'string' ? password.trim() : '';
    const nextErrors = { email: '', password: '' };

    if (!nextEmail) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!nextPassword) {
      nextErrors.password = 'Password is required.';
    }

    if (nextErrors.email || nextErrors.password) {
      setFieldErrors(nextErrors);
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
      return;
    }

    const result = await login(nextEmail, nextPassword);

    if (result?.error) {
      const updated = registerFailedLoginAttempt();
      setLockState(updated);
      setErrorMessage(result.error);
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
      return;
    }

    clearLoginAttemptWindow();
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden bg-gradient-to-br from-[#1E3A5F] via-[#204b7a] to-[#2E86AB] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
            <ShieldCheck className="h-5 w-5" />
            <p className="text-sm font-semibold">Intelligent Invigilation</p>
          </div>
          <h1 className="mt-10 max-w-md text-4xl font-semibold leading-tight tracking-tight">
            Professional invigilation operations with real-time intelligence
          </h1>
          <p className="mt-4 max-w-md text-sm text-blue-100">Plan duties, monitor punctuality, and improve compliance in one dashboard.</p>
        </div>

        <ul className="space-y-3 text-sm text-blue-50">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Role-based admin and instructor access
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Smart duty balancing and workload insights
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Punctuality trends and performance analytics
          </li>
        </ul>
      </aside>

      <section className="flex items-center justify-center bg-[#F4F6F9] px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="mb-8">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#1E3A5F] text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-[#1A1A2E]">Welcome back</h1>
            <p className="mt-2 text-sm text-gray-500">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className={`space-y-4 ${shake ? 'animate-shake' : ''}`}>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className={`app-input pl-9 ${fieldErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                  placeholder="you@univ.edu"
                />
              </div>
              {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  className={`app-input pl-9 ${fieldErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                  placeholder="Enter your password"
                />
              </div>
              {fieldErrors.password ? <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p> : null}
            </div>

            {errorMessage ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
            ) : null}

            <button type="submit" disabled={loading || lockState.isLocked} className="app-btn-primary flex w-full items-center justify-center gap-2">
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" /> : null}
              {loading ? 'Signing in...' : lockState.isLocked ? `Locked (${Math.ceil(lockState.remainingMs / 1000)}s)` : 'Sign in'}
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              type="button"
              className="w-full text-sm text-[#2E86AB] transition hover:underline"
              onClick={() => navigate('/register')}
            >
              Request Access
            </button>

            {import.meta.env.DEV ? (
              <p className="pt-2 text-xs text-gray-500">
                Dev info: Supabase {supabaseHost ? `→ ${supabaseHost}` : 'is not configured (missing VITE_SUPABASE_URL)'}.
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </div>
  );
}
