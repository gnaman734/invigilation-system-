import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { clearLoginAttemptWindow, getLoginRateLimitState, registerFailedLoginAttempt } from '../lib/utils/rateLimit';
import { sanitizeEmail } from '../lib/utils/sanitize';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    if (authError) {
      setErrorMessage(authError);
    }
  }, [authError]);

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
    <div className="app-auth-bg min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/20 hover:text-white/85"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      </div>
      <div
        className="pointer-events-none fixed left-1/2 top-[-200px] h-[400px] w-[600px] -translate-x-1/2"
        style={{
          background: 'radial-gradient(ellipse, rgba(245,158,11,0.06), transparent)',
        }}
      />

      <section className="mx-auto mt-[15vh] w-full max-w-sm fade-up rounded-2xl border border-white/8 bg-[#111118] p-8">
        <span className="mx-auto mb-6 block h-1.5 w-1.5 rounded-full bg-amber-400" />
        <h1 className="text-center text-2xl text-white/90">Welcome back</h1>
        <p className="mt-1 text-center text-sm text-white/40">Sign in to continue</p>

        <form onSubmit={handleSubmit} className={`mt-6 space-y-4 ${shake ? 'animate-shake' : ''}`}>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs tracking-wide text-white/40">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className={`input-glow w-full rounded-xl border border-white/8 bg-[#16161F] px-4 py-3 text-sm text-white/90 outline-none transition-all duration-200 placeholder:text-white/20 hover:border-white/12 focus:border-amber-500/40 ${fieldErrors.email ? 'border-red-500/40' : ''}`}
              placeholder="you@univ.edu"
            />
            {fieldErrors.email ? <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p> : null}
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs tracking-wide text-white/40">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className={`input-glow w-full rounded-xl border border-white/8 bg-[#16161F] px-4 py-3 pr-10 text-sm text-white/90 outline-none transition-all duration-200 placeholder:text-white/20 hover:border-white/12 focus:border-amber-500/40 ${fieldErrors.password ? 'border-red-500/40' : ''}`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password ? <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p> : null}
          </div>

          {errorMessage ? <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{errorMessage}</p> : null}

          <button type="submit" disabled={loading || lockState.isLocked} className="btn-press mt-6 h-11 w-full rounded-xl bg-amber-500 text-sm font-semibold text-[#0A0A0F] transition-all duration-150 hover:bg-amber-400 disabled:opacity-50">
            {loading ? 'Signing in...' : lockState.isLocked ? `Locked (${Math.ceil(lockState.remainingMs / 1000)}s)` : 'Sign in'}
          </button>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/6" />
            <span className="text-xs text-white/20">or</span>
            <div className="h-px flex-1 bg-white/6" />
          </div>

          <button
            type="button"
            className="btn-press mt-2 h-11 w-full rounded-xl border border-white/8 text-sm text-white/50 transition-all duration-150 hover:border-white/15 hover:text-white/70"
            onClick={() => navigate('/register')}
          >
            Request Access
          </button>

          {import.meta.env.DEV ? (
            <p className="pt-1 text-xs text-white/30">
              Dev info: Supabase {supabaseHost ? `→ ${supabaseHost}` : 'is not configured (missing VITE_SUPABASE_URL)'}.
            </p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
