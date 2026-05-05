import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, LockKeyhole, UserRound } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  getPlannerAuthProfile,
  loginPlannerUser,
  registerPlannerUser,
  type PlannerAuthProfile,
} from '../lib/plannerApi';

type AuthScreen = 'register' | 'login';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialScreen?: AuthScreen;
  intentLabel?: string;
  onAuthenticated: (profile: PlannerAuthProfile) => void | Promise<void>;
}

const registerDescription =
  'Create a free VunaBooks account to save your business plans forever and track your real daily sales.';

export default function PlannerAuthDialog({
  open,
  onOpenChange,
  initialScreen = 'register',
  intentLabel = 'continue',
  onAuthenticated,
}: Props) {
  const [screen, setScreen] = useState<AuthScreen>(initialScreen);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setScreen(initialScreen);
    setErrorMessage(null);
    setIsSubmitting(false);
  }, [initialScreen, open]);

  const screenCopy = useMemo(() => {
    if (screen === 'login') {
      return {
        badge: 'Welcome back',
        title: 'Sign in to continue',
        description: `Use your VunaBooks account to ${intentLabel}.`,
        submitLabel: 'Sign In',
        toggleLabel: 'Need an account?',
        toggleAction: 'Create one free',
      };
    }

    return {
      badge: 'Free account',
      title: 'Save your planner progress',
      description: registerDescription,
      submitLabel: 'Create Free Account',
      toggleLabel: 'Already have an account?',
      toggleAction: 'Sign in',
    };
  }, [intentLabel, screen]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await loginPlannerUser(loginForm.email, loginForm.password);
      const profile = await getPlannerAuthProfile();
      if (!profile) {
        throw new Error('We signed you in, but could not load your planner profile yet.');
      }
      await onAuthenticated(profile);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'We could not sign you in right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await registerPlannerUser(registerForm);
      const profile = await getPlannerAuthProfile();
      if (!profile) {
        throw new Error('Your account was created, but we could not load your planner profile yet.');
      }
      await onAuthenticated(profile);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'We could not create your account right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-[28px] border-0 bg-white p-0 shadow-[0_24px_80px_rgba(13,27,42,0.2)] sm:max-w-lg">
        <div className="bg-[linear-gradient(135deg,#0D1B2A_0%,#14532d_54%,#1A7A3C_100%)] px-6 py-6 text-white">
          <img src="/vuna-logo-white.png" alt="VunaBooks Mentor" className="mb-5 h-10 w-auto object-contain" />
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-green-200">
            <LockKeyhole className="h-3.5 w-3.5" />
            {screenCopy.badge}
          </div>
          <DialogHeader className="mt-4">
            <DialogTitle className="text-3xl font-black tracking-tight text-white">
              {screenCopy.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-white/78">
              {screenCopy.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-6">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-neutral-100 p-1">
            <Button
              type="button"
              variant={screen === 'register' ? 'default' : 'ghost'}
              className={screen === 'register' ? 'bg-vuna-primary text-white hover:bg-vuna-primary/90' : 'text-vuna-slate'}
              onClick={() => {
                setScreen('register');
                setErrorMessage(null);
              }}
            >
              Create Account
            </Button>
            <Button
              type="button"
              variant={screen === 'login' ? 'default' : 'ghost'}
              className={screen === 'login' ? 'bg-vuna-dark text-white hover:bg-vuna-dark/90' : 'text-vuna-slate'}
              onClick={() => {
                setScreen('login');
                setErrorMessage(null);
              }}
            >
              Sign In
            </Button>
          </div>

          {screen === 'register' ? (
            <form className="mt-6 space-y-4" onSubmit={handleRegister}>
              <div className="grid gap-2">
                <Label htmlFor="planner-register-name">Your name</Label>
                <Input
                  id="planner-register-name"
                  type="text"
                  required
                  value={registerForm.name}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Jane Doe"
                  className="h-11 rounded-xl border-neutral-200"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="planner-register-email">Email address</Label>
                <Input
                  id="planner-register-email"
                  type="email"
                  required
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="you@example.com"
                  className="h-11 rounded-xl border-neutral-200"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="planner-register-phone">Phone number (optional)</Label>
                <Input
                  id="planner-register-phone"
                  type="tel"
                  value={registerForm.phone}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="+256 700 000000"
                  className="h-11 rounded-xl border-neutral-200"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="planner-register-password">Password</Label>
                <Input
                  id="planner-register-password"
                  type="password"
                  required
                  minLength={8}
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="At least 8 characters"
                  className="h-11 rounded-xl border-neutral-200"
                />
              </div>
              <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm leading-6 text-vuna-dark">
                One login gives people the planner today and VunaBooks sales tracking later, without registering again.
              </div>
              {errorMessage && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900">
                  {errorMessage}
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="h-12 w-full rounded-xl bg-vuna-primary text-base font-semibold text-white hover:bg-vuna-primary/90"
              >
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
                {screenCopy.submitLabel}
              </Button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <div className="grid gap-2">
                <Label htmlFor="planner-login-email">Email address</Label>
                <Input
                  id="planner-login-email"
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="you@example.com"
                  className="h-11 rounded-xl border-neutral-200"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="planner-login-password">Password</Label>
                <Input
                  id="planner-login-password"
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Your password"
                  className="h-11 rounded-xl border-neutral-200"
                />
              </div>
              {errorMessage && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900">
                  {errorMessage}
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="h-12 w-full rounded-xl bg-vuna-dark text-base font-semibold text-white hover:bg-vuna-dark/90"
              >
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                {screenCopy.submitLabel}
              </Button>
            </form>
          )}

          <div className="mt-5 text-center text-sm text-vuna-slate">
            {screenCopy.toggleLabel}{' '}
            <button
              type="button"
              onClick={() => {
                setScreen((prev) => (prev === 'register' ? 'login' : 'register'));
                setErrorMessage(null);
              }}
              className="font-semibold text-vuna-primary hover:text-vuna-primary/80"
            >
              {screenCopy.toggleAction}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
