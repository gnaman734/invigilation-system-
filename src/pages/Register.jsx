import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sanitizeEmail, sanitizeText } from '../lib/utils/sanitize';
import { useToast } from '../components/shared/Toast';

const DEPARTMENTS = ['Computer Science', 'Mathematics', 'Physics', 'Electronics', 'Mechanical', 'Other'];

export default function Register() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    department: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setFieldErrors({
      name: '',
      email: '',
      department: '',
      password: '',
      confirmPassword: '',
    });

    const next = {
      name: sanitizeText(name),
      email: sanitizeEmail(email),
      department: sanitizeText(department),
      password: typeof password === 'string' ? password.trim() : '',
      confirmPassword: typeof confirmPassword === 'string' ? confirmPassword.trim() : '',
    };

    const nextErrors = {
      name: next.name ? '' : 'Full Name is required',
      email: next.email ? '' : 'Valid email is required',
      department: next.department ? '' : 'Department is required',
      password: next.password.length >= 8 ? '' : 'Password must be at least 8 characters',
      confirmPassword: next.confirmPassword ? '' : 'Confirm your password',
    };

    if (!nextErrors.confirmPassword && next.password !== next.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors);
      if (nextErrors.confirmPassword === 'Passwords do not match') {
        setErrorMessage('Passwords do not match');
      }
      return;
    }

    setSubmitting(true);

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Please contact admin.');
      }

      const { data: existingInstructor } = await supabase
        .from('instructors')
        .select('id')
        .eq('email', next.email)
        .maybeSingle();

      if (existingInstructor?.id) {
        setErrorMessage('An account with this email already exists');
        setSubmitting(false);
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: next.email,
        password: next.password,
        options: {
          data: {
            role: 'instructor',
            name: next.name,
            department: next.department,
            status: 'pending',
          },
        },
      });

      if (signUpError) {
        if (/already registered|already exists|already been registered/i.test(signUpError.message ?? '')) {
          setErrorMessage('An account with this email already exists');
          setSubmitting(false);
          return;
        }

        throw signUpError;
      }

      const authId = signUpData?.user?.id;
      if (!authId) {
        throw new Error('Unable to create account right now. Please try again.');
      }

      let hasSession = Boolean(signUpData?.session);

      if (!hasSession) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: next.email,
          password: next.password,
        });

        if (signInError) {
          throw new Error('Account created, but profile setup is pending. Please wait for confirmation and try again.');
        }

        hasSession = Boolean(signInData?.session);
      }

      if (!hasSession) {
        throw new Error('Unable to establish session for profile setup. Please try again.');
      }

      const { error: insertError } = await supabase.from('instructors').insert({
        name: next.name,
        email: next.email,
        department: next.department,
        status: 'pending',
        auth_id: authId,
      });

      if (insertError) {
        throw insertError;
      }

      await supabase.auth.signOut();
      setSubmitted(true);
    } catch (caughtError) {
      const message = typeof caughtError?.message === 'string' ? caughtError.message : '';

      if (/duplicate key|already exists|already registered/i.test(message)) {
        setErrorMessage('An account with this email already exists');
      } else {
        addToast({ type: 'error', message: 'Unable to submit request right now. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden bg-gradient-to-br from-[#1E3A5F] via-[#204b7a] to-[#2E86AB] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
            <ShieldCheck className="h-5 w-5" />
            <p className="text-sm font-semibold">Intelligent Invigilation</p>
          </div>
          <h1 className="mt-10 max-w-md text-4xl font-semibold leading-tight tracking-tight">Request instructor access</h1>
          <p className="mt-4 max-w-md text-sm text-blue-100">Submit your profile and get admin approval before your first login.</p>
        </div>
      </aside>

      <section className="flex items-center justify-center bg-[#F4F6F9] px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          {!submitted ? (
            <>
              <div className="mb-8">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#1E3A5F] text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-[#1A1A2E]">Create request</h1>
                <p className="mt-2 text-sm text-gray-500">Your account will be activated after admin approval</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reg-name" className="mb-1 block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      id="reg-name"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className={`app-input pl-9 ${fieldErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                      required
                    />
                  </div>
                  {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
                </div>

                <div>
                  <label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={`app-input pl-9 ${fieldErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                      required
                    />
                  </div>
                  {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
                </div>

                <div>
                  <label htmlFor="reg-dept" className="mb-1 block text-sm font-medium text-gray-700">
                    Department
                  </label>
                  <select
                    id="reg-dept"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className={`app-input ${fieldErrors.department ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                    required
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.department ? <p className="mt-1 text-xs text-red-600">{fieldErrors.department}</p> : null}
                </div>

                <div>
                  <label htmlFor="reg-password" className="mb-1 block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      id="reg-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={`app-input pl-9 ${fieldErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                      required
                      minLength={8}
                    />
                  </div>
                  {fieldErrors.password ? <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p> : null}
                </div>

                <div>
                  <label htmlFor="reg-confirm-password" className="mb-1 block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      id="reg-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className={`app-input pl-9 ${fieldErrors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                      required
                    />
                  </div>
                  {fieldErrors.confirmPassword ? <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p> : null}
                </div>

                {errorMessage ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
                ) : null}

                <button type="submit" disabled={submitting} className="app-btn-primary flex w-full items-center justify-center gap-2">
                  {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" /> : null}
                  {submitting ? 'Submitting...' : 'Request Access'}
                </button>

                <button
                  type="button"
                  className="w-full text-sm text-[#2E86AB] transition hover:underline"
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </button>
              </form>
            </>
          ) : (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
              <h2 className="mt-4 text-2xl font-semibold text-[#1A1A2E]">Request Submitted!</h2>
              <p className="mt-2 text-sm text-gray-600">
                Your account is pending admin approval. You will be able to login once approved.
              </p>
              <button type="button" className="app-btn-primary mt-6" onClick={() => navigate('/login')}>
                Back to Login
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
