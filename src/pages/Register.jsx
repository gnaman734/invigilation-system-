import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sanitizeEmail, sanitizeText } from '../lib/utils/sanitize';
import { useToast } from '../components/shared/Toast';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';

const DEPARTMENTS = ['Computer Science', 'Mathematics', 'Physics', 'Electronics', 'Mechanical', 'Other'];

export default function Register() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const passwordStrength = (() => {
    const value = String(password ?? '');
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score;
  })();

  const strengthPercentage = (passwordStrength / 4) * 100;
  const strengthLabel = passwordStrength <= 1 ? 'Weak' : passwordStrength <= 3 ? 'Medium' : 'Strong';
  const strengthClass = passwordStrength <= 1 ? 'text-red-300' : passwordStrength <= 3 ? 'text-amber-300' : 'text-green-300';

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
          return;
        }

        throw signUpError;
      }

      const authId = signUpData?.user?.id;
      if (!authId) {
        throw new Error('Unable to create account right now. Please try again.');
      }
      await supabase.auth.signOut();
      setSubmitted(true);
    } catch (caughtError) {
      const message = typeof caughtError?.message === 'string' ? caughtError.message : '';

      if (/duplicate key|already exists|already registered/i.test(message)) {
        setErrorMessage('An account with this email already exists');
      } else if (message) {
        setErrorMessage(message);
      } else {
        addToast({ type: 'error', message: 'Unable to submit request right now. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-auth-bg min-h-screen px-4 py-10">
      <section className="mx-auto mt-[12vh] w-full max-w-md fade-up">
        <Card className="w-full border-white/8 bg-[#111118] shadow-none">
          {!submitted ? (
            <>
              <CardHeader>
                <span className="mx-auto mb-2 block h-1.5 w-1.5 rounded-full bg-amber-400" />
                <div className="hidden">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-center text-2xl text-white/90">Request Access</CardTitle>
                <CardDescription className="text-center text-white/40">Your account will be activated after admin approval</CardDescription>
              </CardHeader>
              <CardContent>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-name"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className={`h-10 pl-9 ${fieldErrors.name ? 'border-red-500 focus-visible:ring-red-500/40' : ''}`}
                      required
                    />
                  </div>
                  {fieldErrors.name ? <p className="text-xs text-red-300">{fieldErrors.name}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={`h-10 pl-9 ${fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500/40' : ''}`}
                      required
                    />
                  </div>
                  {fieldErrors.email ? <p className="text-xs text-red-300">{fieldErrors.email}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-dept">Department</Label>
                  <Select
                    value={department}
                    onValueChange={(value) => setDepartment(value)}
                  >
                    <SelectTrigger id="reg-dept" className="h-10 w-full">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.department ? <p className="text-xs text-red-300">{fieldErrors.department}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={`h-10 px-9 ${fieldErrors.password ? 'border-red-500 focus-visible:ring-red-500/40' : ''}`}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Strength</span>
                      <span className={strengthClass}>{strengthLabel}</span>
                    </div>
                    <Progress
                      value={strengthPercentage}
                      className="h-2 [&_[data-slot=progress-indicator]]:bg-primary"
                    />
                  </div>
                  {fieldErrors.password ? <p className="text-xs text-red-300">{fieldErrors.password}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className={`h-10 px-9 ${fieldErrors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500/40' : ''}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((previous) => !previous)}
                      className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword ? <p className="text-xs text-red-300">{fieldErrors.confirmPassword}</p> : null}
                </div>

                {errorMessage ? (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{errorMessage}</p>
                ) : null}

                <Button type="submit" disabled={submitting} className="h-10 w-full text-sm font-semibold">
                  {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" /> : null}
                  {submitting ? 'Submitting...' : 'Request Access'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </Button>
              </form>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-green-400" />
              <h2 className="mt-4 text-3xl">Request Submitted!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your account is pending admin approval. You will be able to login once approved.
              </p>
              <Button type="button" className="mt-6" onClick={() => navigate('/login')}>
                Back to Login
              </Button>
            </CardContent>
          )}
        </Card>
      </section>
    </div>
  );
}
